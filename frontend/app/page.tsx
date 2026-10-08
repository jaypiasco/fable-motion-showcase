'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar, AssetCategory } from '../components/Sidebar';
import { Header } from '../components/Header';
import { LandingView } from '../components/LandingView';
import { DashboardView } from '../components/DashboardView';
import { LightboxModal } from '../components/LightboxModal';
import { AuthModal } from '../components/AuthModal';
import {
  fetchStories,
  fetchStoryDetails,
  fetchSystemStatus,
  fetchModelsConfig,
  trashStory,
  restoreStory,
} from '../lib/api';
import {
  StorySummary,
  StoryDetail,
  SystemStatus,
  ModelsConfig,
} from '../lib/types';

export default function Page() {
  const router = useRouter();
  // Only two primary views: 'landing' (public showcase) and 'home' (the single unified asset studio)
  const [activeView, setActiveView] = useState<'landing' | 'home'>('landing');
  const [collapsed, setCollapsed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('key_scenes');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');

  // Story & Pipeline Data State
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [archivedExtraIds, setArchivedExtraIds] = useState<string[]>([]);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [activeStoryDetail, setActiveStoryDetail] = useState<StoryDetail | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [modelsConfig, setModelsConfig] = useState<ModelsConfig | null>(null);

  // Read URL search params on mount to support ?view=studio/home or ?category=trash
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam === 'studio' || viewParam === 'home') {
        router.replace('/library');
        return;
      }
      const cat = params.get('category') as AssetCategory | null;
      if (cat) {
        setSelectedCategory(cat);
      }
    }
  }, [router]);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ isOpen: boolean; url: string | null; caption?: string }>({
    isOpen: false,
    url: null,
    caption: '',
  });

  const loadData = useCallback(async (selectFirst = false) => {
    try {
      const [storiesList, status, models] = await Promise.all([
        fetchStories(),
        fetchSystemStatus(),
        fetchModelsConfig(),
      ]);

      // Overlay locally archived IDs so rapid polling doesn't resurrect stories prematurely
      const normalizedStories = storiesList.map((s) =>
        archivedExtraIds.includes(s.story_id) ? { ...s, is_trashed: true } : s
      );

      setStories(normalizedStories);
      setSystemStatus(status);
      setModelsConfig(models);

      const activeList = normalizedStories.filter((s) => !s.is_trashed);
      if (activeList.length > 0) {
        const isCurrentActive = activeStoryId && activeList.some((s) => s.story_id === activeStoryId);
        if (selectFirst || !activeStoryId || !isCurrentActive) {
          const nextId = activeList[0].story_id;
          setActiveStoryId(nextId);
          const detail = await fetchStoryDetails(nextId);
          setActiveStoryDetail(detail);
        }
      } else {
        if (activeStoryId && !activeList.some((s) => s.story_id === activeStoryId)) {
          setActiveStoryId(null);
          setActiveStoryDetail(null);
        }
      }
    } catch (err) {
      console.error('Error fetching studio data:', err);
    }
  }, [activeStoryId, archivedExtraIds]);

  // Initial load & periodic status poller
  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => {
      if (activeView !== 'landing') {
        loadData(false);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [activeView, loadData]);

  // Handle story selection
  const handleSelectStory = async (storyId: string) => {
    setActiveStoryId(storyId);
    try {
      const detail = await fetchStoryDetails(storyId);
      setActiveStoryDetail(detail);
    } catch (err) {
      console.error('Failed to load story details:', err);
    }
  };

  const handleInspectStory = async (storyId: string) => {
    await handleSelectStory(storyId);
  };

  const handleTrashStory = async (storyId: string) => {
    setArchivedExtraIds((prev) => Array.from(new Set([...prev, storyId])));
    const updatedStories = stories.map((s) => (s.story_id === storyId ? { ...s, is_trashed: true } : s));
    setStories(updatedStories);

    // If the active story is being archived, immediately advance activeStoryId to the next available active story
    if (activeStoryId === storyId) {
      const remainingActive = updatedStories.filter((s) => !s.is_trashed && s.story_id !== storyId);
      if (remainingActive.length > 0) {
        const nextId = remainingActive[0].story_id;
        setActiveStoryId(nextId);
        fetchStoryDetails(nextId)
          .then((detail) => setActiveStoryDetail(detail))
          .catch((err) => console.error('Failed to load next story details:', err));
      } else {
        setActiveStoryId(null);
        setActiveStoryDetail(null);
      }
    } else if (activeStoryDetail && activeStoryDetail.story_id === storyId) {
      setActiveStoryDetail({ ...activeStoryDetail, is_trashed: true });
    }

    try {
      await trashStory(storyId);
      await loadData(false);
    } catch (err) {
      console.error('Failed to trash story:', err);
    }
  };

  const handleRestoreStory = async (storyId: string) => {
    setArchivedExtraIds((prev) => prev.filter((id) => id !== storyId));
    setStories((prev) =>
      prev.map((s) => (s.story_id === storyId ? { ...s, is_trashed: false } : s))
    );
    if (!activeStoryId) {
      setActiveStoryId(storyId);
      fetchStoryDetails(storyId)
        .then((detail) => setActiveStoryDetail(detail))
        .catch((err) => console.error('Failed to load restored story details:', err));
    } else if (activeStoryDetail && activeStoryDetail.story_id === storyId) {
      setActiveStoryDetail({ ...activeStoryDetail, is_trashed: false });
    }
    try {
      await restoreStory(storyId);
      await loadData(false);
    } catch (err) {
      console.error('Failed to restore story:', err);
    }
  };

  const handleStoryCreated = async (storyId?: string) => {
    await loadData(false);
    if (storyId) {
      setActiveStoryId(storyId);
      try {
        const detail = await fetchStoryDetails(storyId);
        setActiveStoryDetail(detail);
      } catch (err) {
        console.error('Failed to fetch new story details:', err);
      }
      router.push(`/create?storyId=${storyId}`);
    }
  };

  const handleOpenLightbox = (imageUrl: string, caption?: string) => {
    setLightbox({
      isOpen: true,
      url: imageUrl,
      caption,
    });
  };

  const handleEnterHome = useCallback(() => {
    router.push('/library');
  }, [router]);
  const handleOpenAuthModal = useCallback(() => setAuthModalOpen(true), []);
  const handleCloseAuthModal = useCallback(() => setAuthModalOpen(false), []);

  // Category labels helper
  const categoryLabels: Record<AssetCategory, string> = {
    all: 'All Generations',
    episodes: 'Episodes',
    key_scenes: 'Key Scenes',
    keyframes: 'Keyframe Art',
    characters: 'Characters & Cast',
    motion: 'Motion FX & Videos',
    audio: 'Audio & Voiceover',
    final_renders: 'Final Renders',
    drafts: 'Draft Scripts',
    trash: 'Trash & Discarded',
  };

  // If user explicitly navigated to the Landing Page view
  if (activeView === 'landing') {
    return (
      <main className="min-h-screen bg-[#0b0d17] text-white">
        <LandingView
          onEnterStudio={handleEnterHome}
          onOpenAuth={handleOpenAuthModal}
        />
        <AuthModal
          isOpen={authModalOpen}
          onClose={handleCloseAuthModal}
          onSuccess={() => {
            handleCloseAuthModal();
            router.push('/library');
          }}
        />
      </main>
    );
  }

  const activeStories = stories.filter((s) => !s.is_trashed && !archivedExtraIds.includes(s.story_id));
  const trashedStories = stories.filter((s) => !!s.is_trashed || archivedExtraIds.includes(s.story_id));
  const extraArchivedCount = archivedExtraIds.filter((id) => !stories.some((s) => s.story_id === id)).length;
  const totalArchivedCount = trashedStories.length + extraArchivedCount;

  const isSelectedStoryActive = !!(activeStoryId && activeStories.some((s) => s.story_id === activeStoryId));

  const currentStoryTitle = isSelectedStoryActive
    ? activeStoryDetail?.phases?.phase_1_script?.idea?.title ||
      activeStories.find((s) => s.story_id === activeStoryId)?.title ||
      'Teaser'
    : activeStories[0]?.title || 'Studio Stories';

  const activeStorySequences =
    isSelectedStoryActive && activeStoryDetail?.phases?.phase_1_script?.scenes
      ? activeStoryDetail.phases.phase_1_script.scenes.map((sc) => ({
          scene_id: sc.scene_id,
          title: `Seq 0${sc.scene_id}: ${sc.setting || sc.shot_type || `Scene ${sc.scene_id}`}`,
        }))
      : [];

  return (
    <div className="min-h-screen w-screen bg-surface text-on-surface font-body-md antialiased select-none overflow-x-hidden">
      {/* 1. Fixed Left Sidebar (w-72 or w-16 collapsed) */}
      <Sidebar
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
        }}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onOpenNewStory={() => router.push('/create')}
        onOpenAuth={() => setAuthModalOpen(true)}
        onGoToLanding={() => setActiveView('landing')}
        onGoToCreate={() => router.push('/create')}
        activePage="home"
        onFocusSearch={() => {
          const input = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (input) input.focus();
        }}
        systemStatus={systemStatus}
        storiesCount={activeStories.length}
        trashedCount={totalArchivedCount}
        activeStorySequences={activeStorySequences}
        onSelectSequence={() => {}}
      />

      {/* 2. Main Content Viewport with Sidebar Offset */}
      <div className={`flex flex-col min-h-screen transition-all duration-200 ${collapsed ? 'pl-16' : 'pl-72'}`}>
        {/* Top Header */}
        <Header
          storyTitle={currentStoryTitle}
          categoryLabel={categoryLabels[selectedCategory]}
          viewMode={viewMode}
          onSetViewMode={setViewMode}
          onOpenNewStory={() => router.push('/create')}
          onRefresh={() => loadData(false)}
          onOpenAuth={() => setAuthModalOpen(true)}
          onGoToLanding={() => setActiveView('landing')}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          modelsConfig={modelsConfig}
          systemStatus={systemStatus}
          storiesList={activeStories.map((s) => ({ story_id: s.story_id, title: s.title }))}
          onSelectStory={handleSelectStory}
        />

        {/* Viewport: Studio Stories Deck (Full Width) */}
        <main className="flex-1 flex min-h-[calc(100vh-4rem)] relative overflow-hidden bg-surface">
          <div className="flex-1 min-w-0 overflow-y-auto">
            <DashboardView
              stories={stories}
              activeStoryId={activeStoryId}
              activeStoryDetail={activeStoryDetail}
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
              sortBy={sortBy}
              viewMode={viewMode}
              onSelectStory={handleSelectStory}
              onInspectStory={handleInspectStory}
              onOpenNewStoryModal={() => router.push('/create')}
              onOpenLightbox={handleOpenLightbox}
              onTrashStory={handleTrashStory}
              onRestoreStory={handleRestoreStory}
              modelsConfig={modelsConfig}
              systemStatus={systemStatus}
              onRefresh={() => loadData(false)}
            />
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <LightboxModal
        isOpen={lightbox.isOpen}
        imageUrl={lightbox.url}
        caption={lightbox.caption}
        onClose={() => setLightbox({ isOpen: false, url: null, caption: '' })}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}


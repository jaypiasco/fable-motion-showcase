'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Plus,
  Wand2,
  Film,
  Sliders,
  UsersRound,
  Bookmark,
  ChevronDown,
  Search,
  GitBranch,
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Clapperboard,
  PenTool,
  Archive,
  Play,
  Clock,
  Edit3,
  Layers,
  Download,
  X,
  RotateCcw,
  Check,
  ExternalLink,
} from 'lucide-react';
import { fetchStories, fetchStoryDetails, fetchSystemStatus, trashStory, restoreStory, resolveMediaUrl } from '../../lib/api';
import { SceneScript, StorySummary, StoryDetail, SystemStatus } from '../../lib/types';
import { StudioSidebar } from '../../components/StudioSidebar';
import { TopbarProfileMenu } from '../../components/TopbarProfileMenu';
import { supabase } from '../../lib/supabase';
import { isAdminEmail } from '../../lib/admin';
import type { User } from '@supabase/supabase-js';

interface ShowcaseProject {
  id: string;
  projectNumber: string;
  title: string;
  genre: string;
  dateStr: string;
  synopsis: string;
  duration: string;
  sequencesCount: number;
  isSingleArc?: boolean;
  aspectRatio: '9:16' | '16:9';
  statusTag: 'Selected' | 'Mastered' | 'Motion Pass' | 'Synced' | 'Draft';
  progress?: number;
  phaseLabel?: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  radialGradient: string;
  cast?: string[];
  isBusy?: boolean;
  videoUrl?: string;
  thumbnailUrl?: string | null;
  isBackend?: boolean;
  isTrashed?: boolean;
}

export default function StudioStoriesLibraryPage() {
  const router = useRouter();

  // Selected story & projects
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [backendStories, setBackendStories] = useState<StorySummary[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarSequences, setSidebarSequences] = useState<SceneScript[]>([]);
  const [takesSequences, setTakesSequences] = useState<Array<SceneScript & { video_url?: string; status?: string; motion_type?: string }>>([]);


  // Filters & State Tabs
  const [activeTab, setActiveTab] = useState<'active' | 'drafts' | 'archive'>('active');
  const [aspectFilter, setAspectFilter] = useState<'all' | '9:16' | '16:9'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'duration'>('recent');
  const [sortDropdownOpen, setSortDropdownOpen] = useState<boolean>(false);
  const [carouselIndex, setCarouselIndex] = useState<number>(0);

  // Modals & Drawers
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [takesModalStory, setTakesModalStory] = useState<ShowcaseProject | null>(null);
  const [scriptModalOpen, setScriptModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const userName = useMemo(() => {
    if (!currentUser) return 'Studio Creator';
    return (
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      currentUser.email?.split('@')[0] ||
      'Studio Creator'
    );
  }, [currentUser]);

  const userTier = useMemo(() => {
    if (isAdmin) return 'Admin Tier';
    if (currentUser) return 'Pro Tier';
    return 'Guest Tier';
  }, [isAdmin, currentUser]);

  const userInitials = useMemo(() => {
    if (!currentUser) return 'SC';
    const name = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name;
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (currentUser.email) {
      const prefix = currentUser.email.split('@')[0];
      const parts = prefix.split(/[._-]/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return prefix.slice(0, 2).toUpperCase();
    }
    return 'SC';
  }, [currentUser]);

  // Fetch backend stories (admin only)
  const loadData = useCallback(async () => {
    try {
      const status = await fetchSystemStatus();
      setSystemStatus(status);
      if (isAdmin) {
        const storiesList = await fetchStories();
        setBackendStories(storiesList || []);
      } else {
        setBackendStories([]);
      }
    } catch (err) {
      console.warn('Backend connection notice (running in offline/mock mode if server is down):', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    let mounted = true;
    const updateAdminAccess = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (mounted) {
          setCurrentUser(data.user);
          setIsAdmin(isAdminEmail(data.user?.email));
        }
      } catch {
        if (mounted) {
          setCurrentUser(null);
          setIsAdmin(false);
        }
      }
    };

    updateAdminAccess();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setCurrentUser(session?.user || null);
        setIsAdmin(isAdminEmail(session?.user?.email));
      }
    });
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const storyId = selectedProjectId || backendStories[0]?.story_id;
    if (!isAdmin || !storyId) {
      setSidebarSequences([]);
      return;
    }

    fetchStoryDetails(storyId)
      .then((detail) => setSidebarSequences(detail.phases?.phase_1_script?.scenes || []))
      .catch(() => setSidebarSequences([]));
  }, [backendStories, selectedProjectId, isAdmin]);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // The library is populated exclusively from generated backend stories (admin only).
  const allProjects = useMemo<ShowcaseProject[]>(() => {
    if (!isAdmin) {
      return [];
    }
    const backendItems: ShowcaseProject[] = backendStories.map((s, idx) => {
      const dateFormatted = new Date(s.created_at || Date.now()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const num = String(idx + 5).padStart(2, '0');
      return {
        id: s.story_id,
        projectNumber: `Project #${num}`,
        title: s.title || `Production Story #${num}`,
        genre: 'Cinematic',
        dateStr: dateFormatted,
        synopsis: s.logline || 'A high-definition directorial production arc generated with AI Stories Studio OS.',
        duration: '01:15',
        sequencesCount: s.scenes_count || 3,
        aspectRatio: '9:16',
        statusTag: (s.status as string) === 'draft' ? 'Draft' : s.status === 'completed' || s.has_final_video ? 'Mastered' : 'Motion Pass',
        gradientFrom: '#111827',
        gradientVia: '#1E1B4B',
        gradientTo: '#311042',
        radialGradient: 'from-violet-500 to-transparent',
        videoUrl: s.final_video_url || (s.has_final_video ? `/api/stories/${s.story_id}/final-video` : undefined),
        thumbnailUrl: s.thumbnail_url || null,
        isBackend: true,
        isTrashed: !!s.is_trashed,
      };
    });

    return backendItems;
  }, [backendStories, isAdmin]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return allProjects.filter((project) => {
      // Tab filter
      if (activeTab === 'archive') {
        return !!project.isTrashed;
      } else if (activeTab === 'drafts') {
        if (project.statusTag !== 'Draft') return false;
      } else {
        // active productions
        if (project.isTrashed) return false;
      }

      // Aspect filter
      if (aspectFilter !== 'all' && project.aspectRatio !== aspectFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = project.title.toLowerCase().includes(q);
        const matchSynopsis = project.synopsis.toLowerCase().includes(q);
        const matchGenre = project.genre.toLowerCase().includes(q);
        const matchCast = project.cast?.some((c) => c.toLowerCase().includes(q));
        if (!matchTitle && !matchSynopsis && !matchGenre && !matchCast) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'duration') return a.duration.localeCompare(b.duration);
      return 0; // Default recent
    });
  }, [allProjects, activeTab, aspectFilter, searchQuery, sortBy]);

  const activeSelectedProject = useMemo(() => {
    return allProjects.find((p) => p.id === selectedProjectId) || allProjects[0];
  }, [allProjects, selectedProjectId]);

  const activeProjectsCount = allProjects.filter((project) => !project.isTrashed).length;
  const draftsCount = allProjects.filter((project) => !project.isTrashed && project.statusTag === 'Draft').length;
  const archiveCount = allProjects.filter((project) => !!project.isTrashed).length;

  const handleArchive = async (project: ShowcaseProject) => {
    try {
      setBackendStories((prev) =>
        prev.map((s) => (s.story_id === project.id ? { ...s, is_trashed: true } : s))
      );
      setToastMessage(`"${project.title}" moved to Archive.`);
      await trashStory(project.id);
    } catch (err) {
      console.error('Failed to archive story:', err);
      setToastMessage(`Failed to archive "${project.title}".`);
      loadData();
    }
  };

  const handleRestore = async (project: ShowcaseProject) => {
    try {
      setBackendStories((prev) =>
        prev.map((s) => (s.story_id === project.id ? { ...s, is_trashed: false } : s))
      );
      setToastMessage(`"${project.title}" restored from Archive.`);
      await restoreStory(project.id);
    } catch (err) {
      console.error('Failed to restore story:', err);
      setToastMessage(`Failed to restore "${project.title}".`);
      loadData();
    }
  };

  // Carousel pagination
  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const displayedProjects = useMemo(() => {
    const start = carouselIndex * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, carouselIndex, pageSize]);

  const handlePrevPage = () => {
    setCarouselIndex((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
  };

  const handleNextPage = () => {
    setCarouselIndex((prev) => (prev + 1 < totalPages ? prev + 1 : 0));
  };

  const handleExport = (project: ShowcaseProject) => {
    if (project.videoUrl) {
      const link = document.createElement('a');
      link.href = project.videoUrl;
      link.download = `${project.title.replace(/\s+/g, '_')}_master.mp4`;
      link.click();
      setToastMessage(`Exporting "${project.title}" master sequence...`);
    } else {
      setToastMessage(`Export initiated: "${project.title}" packaging complete.`);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#08090E] text-[#94A3B8] font-sans antialiased overflow-hidden selection:bg-[#7C3AED]/30 selection:text-white flex">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-12 right-6 z-50 bg-[#161928] border border-violet-500/40 text-violet-200 px-4 py-2.5 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Studio Navigation Sidebar */}
      <StudioSidebar
        activePage="library"
        hideBrandHeader
        isAdmin={isAdmin}
        user={currentUser}
        userInitials={userInitials}
        userName={userName}
        userTier={userTier}
        onAssetsClick={() => setToastMessage('Assets & Characters repository is synchronized.')}
      />

      {/* BEGIN: MainContentShell */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-visible bg-[#08090E]">
        {/* BEGIN: TopBarHeader */}
        <header
          className="relative -left-64 w-[calc(100%+16rem)] h-14 flex-shrink-0 bg-[#0B0D14]/80 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)] px-6 flex items-center justify-between z-50"
          data-purpose="top-header"
        >
          {/* Breadcrumb & Workspace Context */}
          <div className="flex items-center space-y-0 space-x-3 text-xs">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex items-center gap-2.5 cursor-pointer group mr-2"
              title="Return to Studio Home"
            >
              <span className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
                <img src="/fablemotion-icon.png" alt="FableMotion" className="w-full h-full object-cover" />
              </span>
              <span className="text-white font-semibold tracking-tight text-sm group-hover:text-accent-violet transition-colors">
                FableMotion
              </span>
            </button>
            <span className="text-slate-600 font-mono">/</span>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-slate-400 hover:text-slate-200 cursor-pointer transition text-xs font-normal"
            >
              Studio
            </button>
            <span className="text-slate-600 font-mono">/</span>
            <span className="text-slate-200 font-medium text-xs">Studio Stories</span>
          </div>

          {/* Center Global Search Input (Cmd+K) */}
          <div className="w-[420px] max-w-full hidden md:block">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-slate-500 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-9 pr-14 text-xs bg-[#11131E] border border-[rgba(255,255,255,0.08)] rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                placeholder="Search scenes, prompt embeddings, seeds, tags... (Cmd+K)"
                type="text"
              />
              <span className="absolute right-2.5 text-[10px] text-slate-500 bg-[#191D2B] border border-white/5 px-1.5 py-0.5 rounded font-mono">
                ⌘K
              </span>
            </div>
          </div>

          {/* Right Action Toolbar */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setScriptModalOpen(true)}
              className="h-8 px-3 rounded-md bg-[#121520] hover:bg-[#181C2B] text-slate-300 text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Import Script
            </button>
            {/* New Story Project Button */}
            <button
              onClick={() => router.push('/create')}
              className="h-8 px-3.5 rounded-md bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:from-[#6D28D9] hover:to-[#4F46E5] text-white text-xs font-medium flex items-center gap-1.5 shadow-[0_0_15px_rgba(124,58,237,0.25)] transition-all active:scale-98 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              Create Story Project
            </button>

            <div className="h-4 w-[1px] bg-white/[0.1] mx-0.5" />

            {/* Notification Bell */}
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.05] transition relative cursor-pointer"
              title="Notifications"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-violet-400 ring-2 ring-obsidian-900" />
            </button>

            {/* Topbar Profile Menu */}
            <TopbarProfileMenu user={currentUser} isAdmin={isAdmin} />
          </div>
        </header>
        {/* END: TopBarHeader */}

        {/* BEGIN: ScrollableWorkspace */}
        <main className="flex-1 overflow-y-auto px-8 py-6 space-y-6 custom-scrollbar">
          {/* Section Title & Meta Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-semibold tracking-wider text-violet-400 uppercase">
                  Directorial Suite
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {systemStatus?.is_running
                    ? 'Cluster #04 • Master Session (Active)'
                    : 'Cluster #04 • Master Session'}
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">Studio Stories</h1>
              <p className="text-xs text-slate-400 mt-1">
                Curate multi-shot sequence passes, cinematic story arcs, and prompt latent embeddings.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Navigation Slider Track Controls */}
              <div className="flex items-center gap-2 bg-[#0D0F17] border border-white/[0.06] px-2 py-1 rounded-lg">
                <span className="text-[11px] text-slate-400 font-mono pl-1 mr-1">
                  {String(carouselIndex + 1).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
                </span>
                <button
                  onClick={handlePrevPage}
                  className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                  title="Previous Project"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNextPage}
                  className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                  title="Next Project"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  className="h-8 px-3 rounded-lg bg-[#0D0F17] border border-white/[0.06] text-xs font-medium text-slate-300 flex items-center gap-2 hover:bg-[#121520] transition-colors cursor-pointer"
                >
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  {sortBy === 'recent'
                    ? 'Recently Modified'
                    : sortBy === 'title'
                    ? 'Title Alphabetical'
                    : 'Duration Shortest'}
                  <ChevronDown className="w-3 h-3 text-slate-500 ml-0.5" />
                </button>

                {sortDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 py-1 rounded-lg bg-[#11131E] border border-white/10 shadow-2xl z-50 text-xs">
                    <button
                      onClick={() => {
                        setSortBy('recent');
                        setSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/[0.06]"
                    >
                      Recently Modified
                    </button>
                    <button
                      onClick={() => {
                        setSortBy('title');
                        setSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/[0.06]"
                    >
                      Title Alphabetical
                    </button>
                    <button
                      onClick={() => {
                        setSortBy('duration');
                        setSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/[0.06]"
                    >
                      Duration
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters & Category Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-b border-white/[0.06] pb-3">
            {/* Status Tabs */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setActiveTab('active');
                  setCarouselIndex(0);
                }}
                className={`h-7 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer ${
                  activeTab === 'active'
                    ? 'bg-violet-950/40 border border-violet-500/30 text-violet-200'
                    : 'bg-[#0D0F17] hover:bg-[#121520] border border-white/[0.06] text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clapperboard className="w-3.5 h-3.5 text-violet-400" />
                Active Productions
                <span className="w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center ml-0.5">
                  {activeProjectsCount}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('drafts');
                  setCarouselIndex(0);
                }}
                className={`h-7 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'drafts'
                    ? 'bg-violet-950/40 border border-violet-500/30 text-violet-200'
                    : 'bg-[#0D0F17] hover:bg-[#121520] border border-white/[0.06] text-slate-400 hover:text-slate-200'
                }`}
              >
                <PenTool className="w-3 h-3 text-slate-500" />
                Drafts
                <span className="text-slate-500 text-[10px] ml-0.5">{draftsCount}</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('archive');
                  setCarouselIndex(0);
                }}
                className={`h-7 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'archive'
                    ? 'bg-violet-950/40 border border-violet-500/30 text-violet-200'
                    : 'bg-[#0D0F17] hover:bg-[#121520] border border-white/[0.06] text-slate-400 hover:text-slate-200'
                }`}
              >
                <Archive className="w-3 h-3 text-slate-500" />
                Archive
                <span className="text-slate-500 text-[10px] ml-0.5">{archiveCount}</span>
              </button>
            </div>

            {/* Subdued Filter Tags */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 text-[11px]">Filter:</span>
              <button
                onClick={() => setAspectFilter(aspectFilter === '9:16' ? 'all' : '9:16')}
                className={`px-2 py-1 rounded border text-[11px] transition-colors cursor-pointer ${
                  aspectFilter === '9:16'
                    ? 'bg-violet-950/60 border-violet-500/40 text-violet-200'
                    : 'bg-[#0D0F17] border-white/[0.06] hover:border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                9:16
              </button>
              <button
                onClick={() => setAspectFilter(aspectFilter === '16:9' ? 'all' : '16:9')}
                className={`px-2 py-1 rounded border text-[11px] transition-colors cursor-pointer ${
                  aspectFilter === '16:9'
                    ? 'bg-violet-950/60 border-violet-500/40 text-violet-200'
                    : 'bg-[#0D0F17] border-white/[0.06] hover:border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                16:9
              </button>
            </div>
          </div>

          {/* Navigation Pane Slider / Filmstrip Carousel */}
          <div className="relative">
            {!isAdmin ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-white/[0.06] rounded-xl bg-[#0D0F17]">
                <div className="w-14 h-14 rounded-full border border-violet-500/25 bg-violet-500/10 flex items-center justify-center mb-4 text-violet-400">
                  <Clapperboard className="w-6 h-6" />
                </div>
                <p className="text-slate-200 font-medium text-sm mb-1">Admin Access Required</p>
                <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
                  The story library is currently restricted to administrators during testing. Please sign in with an authorized administrator account to view stories.
                </p>
              </div>
            ) : displayedProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-white/[0.06] rounded-xl bg-[#0D0F17]">
                <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center mb-4 text-slate-500">
                  <Clapperboard className="w-6 h-6" />
                </div>
                <p className="text-slate-300 font-medium text-sm mb-1">No stories yet</p>
                <p className="text-slate-500 text-xs max-w-xs leading-relaxed">
                  {activeTab === 'archive' ? 'No archived stories found.' : activeTab === 'drafts' ? 'No drafts found.' : 'Create your first AI story to see it here.'}
                </p>
                {activeTab === 'active' && (
                  <button
                    onClick={() => router.push('/create')}
                    className="mt-5 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer hover:from-violet-500 hover:to-indigo-500 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Story Project
                  </button>
                )}
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayedProjects.map((project) => {
                const isSelected = selectedProjectId === project.id;

                return (
                  <article
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`flex flex-col bg-[#0D0F17] rounded-xl overflow-hidden transition-all group cursor-pointer ${
                      isSelected
                        ? 'border border-violet-500/30 shadow-[0_0_15px_rgba(124,58,237,0.2)]'
                        : 'border border-white/[0.06] hover:border-white/10'
                    }`}
                  >
                    {/* Thumbnail & Aspect Canvas */}
                    <div className="relative aspect-[16/10] bg-[#121520] overflow-hidden">
                      {/* Real thumbnail image (if available from backend) */}
                      {project.thumbnailUrl && (
                        <img
                          src={resolveMediaUrl(project.thumbnailUrl)}
                          alt={project.title}
                          className="absolute inset-0 w-full h-full object-cover opacity-70"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                      {/* Gradient overlay background layer */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: project.thumbnailUrl
                            ? 'linear-gradient(to top, rgba(8,9,14,0.85) 0%, rgba(8,9,14,0.2) 60%, transparent 100%)'
                            : `linear-gradient(to top right, ${project.gradientFrom}, ${project.gradientVia}, ${project.gradientTo})`,
                        }}
                      >
                        {!project.thumbnailUrl && (
                          <div
                            className={`absolute inset-0 opacity-35 mix-blend-overlay bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] ${project.radialGradient}`}
                          />
                        )}
                      </div>

                      {/* Centered Play Button or Spinner Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        {project.isBusy ? (
                          <div className="flex flex-col items-center pointer-events-auto">
                            <div className="w-10 h-10 rounded-full border-2 border-violet-400/30 border-t-violet-400 animate-spin flex items-center justify-center mb-1"></div>
                            {project.phaseLabel && (
                              <span className="text-[10px] font-mono text-violet-300 bg-black/60 px-2 py-0.5 rounded border border-violet-500/20">
                                {project.phaseLabel}
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewVideoUrl(project.videoUrl || '');
                              setPreviewTitle(project.title);
                            }}
                            className={`w-12 h-12 rounded-full bg-violet-600/20 border border-violet-400/30 flex items-center justify-center text-violet-300 backdrop-blur-sm group-hover:scale-105 transition-transform cursor-pointer pointer-events-auto ${!project.videoUrl ? 'opacity-40 pointer-events-none' : ''}`}
                            title={project.videoUrl ? 'Preview Story Render' : 'No video yet'}
                            disabled={!project.videoUrl}
                          >
                            <Play className="w-5 h-5 fill-violet-300 ml-0.5" />
                          </button>
                        )}
                      </div>

                      {/* Top Overlay Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 text-[10px]">
                        <span className="font-mono bg-black/70 backdrop-blur-sm text-slate-300 px-2 py-0.5 rounded border border-white/[0.06]">
                          {project.projectNumber}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {project.statusTag === 'Selected' || isSelected ? (
                            <span className="bg-violet-950/40 text-violet-200 border border-violet-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span> Selected
                            </span>
                          ) : project.statusTag === 'Mastered' ? (
                            <span className="bg-black/70 backdrop-blur-sm text-slate-300 border border-white/[0.06] px-2 py-0.5 rounded flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Mastered
                            </span>
                          ) : null}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (project.isTrashed) {
                                handleRestore(project);
                              } else {
                                handleArchive(project);
                              }
                            }}
                            className="p-1 rounded bg-black/70 hover:bg-black/90 backdrop-blur-sm text-slate-400 hover:text-white border border-white/[0.06] transition cursor-pointer"
                            title={project.isTrashed ? 'Restore from Archive' : 'Archive story'}
                          >
                            {project.isTrashed ? (
                              <RotateCcw className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Archive className="w-3 h-3 hover:text-rose-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Bottom Duration & Sequences Badges */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 text-[10px] text-slate-300 font-mono">
                        <span className="bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/[0.06]">
                          {project.duration}
                        </span>
                        <span className="bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/[0.06]">
                          {project.isSingleArc ? 'Single Arc' : `${project.sequencesCount} Sequences`}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3 h-3" /> {project.dateStr}
                          </span>
                          <span className="px-1.5 py-0.2 text-[10px] font-medium text-slate-300 bg-white/[0.04] border border-white/[0.06] rounded">
                            {project.genre}
                          </span>
                        </div>
                        <h2 className="text-sm font-semibold text-white tracking-tight leading-snug group-hover:text-violet-300 transition-colors">
                          {project.title}
                        </h2>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {project.synopsis}
                        </p>
                      </div>

                      {/* Cast Pill Line */}
                      {project.cast && project.cast.length > 0 && (
                        <div className="pt-2 border-t border-white/[0.06]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 text-[10px] uppercase tracking-wider">Cast:</span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                              {project.cast.map((actor, aIdx) => (
                                <span
                                  key={aIdx}
                                  className="bg-[#121520] px-2 py-0.5 rounded border border-white/[0.06]"
                                >
                                  {actor}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Card Action Buttons: Studio / Takes / Export / Archive */}
                      <div className="pt-2 border-t border-white/[0.06] grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(project.isBackend ? `/create?storyId=${project.id}` : '/create');
                          }}
                          className="h-7 rounded bg-[#121520] hover:bg-[#1A1E2E] border border-white/[0.06] text-[10.5px] text-slate-200 font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer px-1"
                          title="Inspect in Studio OS"
                        >
                          <Edit3 className="w-3 h-3 text-violet-400 shrink-0" />
                          <span className="truncate">Inspect</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTakesModalStory(project);
                            setTakesSequences([]);
                            fetchStoryDetails(project.id)
                              .then((detail) => {
                                const scenes: SceneScript[] = detail.phases?.phase_1_script?.scenes || [];
                                const rawClips = (detail.phases?.phase_5_video_generation as any)?.items ||
                                                 detail.phases?.phase_5_video_generation?.clips ||
                                                 detail.phases?.phase_4_animation_prompts?.items || [];
                                const enriched = scenes.map((sc, idx) => {
                                  const sid = sc.scene_id || idx + 1;
                                  const clip = rawClips.find((c: any) => c.scene_id === sid || c.clip_id === sid);
                                  let vidUrl = clip?.video_url;
                                  if (!vidUrl) {
                                    const p = clip?.video_path;
                                    if (p && typeof p === "string") {
                                      const match = p.match(/archive[\\/](.+)$/);
                                      if (match && match[1]) {
                                        vidUrl = `/media/${match[1].replace(/\\/g, '/')}`;
                                      }
                                    }
                                  }
                                  return {
                                    ...sc,
                                    video_url: vidUrl,
                                    status: clip?.status || (vidUrl ? 'completed' : 'pending'),
                                    motion_type: clip?.camera_dynamics || clip?.motion_type || 'Veo Motion',
                                  };
                                });
                                setTakesSequences(enriched);
                              })
                              .catch(() => setTakesSequences([]));
                          }}
                          className="h-7 rounded bg-[#121520] hover:bg-[#1A1E2E] border border-white/[0.06] text-[10.5px] text-slate-300 font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer px-1"
                          title="View Sequences & Takes"
                        >

                          <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">Takes</span>
                        </button>

                        {project.isBusy ? (
                          <button
                            type="button"
                            disabled
                            className="h-7 rounded bg-[#121520] border border-white/[0.06] text-[10.5px] text-slate-500 font-medium flex items-center justify-center gap-1 opacity-50 cursor-not-allowed px-1"
                          >
                            <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">Busy</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExport(project);
                            }}
                            className="h-7 rounded bg-[#121520] hover:bg-[#1A1E2E] border border-white/[0.06] text-[10.5px] text-slate-300 font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer px-1"
                            title="Export Video Package"
                          >
                            <Download className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">Export</span>
                          </button>
                        )}

                        {project.isTrashed ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(project);
                            }}
                            className="h-7 rounded bg-emerald-950/25 hover:bg-emerald-950/50 border border-emerald-500/30 text-[10.5px] text-emerald-400 font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer px-1"
                            title="Restore Story to Active Productions"
                          >
                            <RotateCcw className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">Restore</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(project);
                            }}
                            className="h-7 rounded bg-[#121520] hover:bg-rose-950/25 hover:border-rose-500/30 hover:text-rose-300 border border-white/[0.06] text-[10.5px] text-slate-400 font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer px-1"
                            title="Move Story to Archive"
                          >
                            <Archive className="w-3 h-3 text-slate-400 hover:text-rose-400 shrink-0" />
                            <span className="truncate">Archive</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            )}

            {/* Subtle Carousel Slide Indicator Bar */}
            {displayedProjects.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {Array.from({ length: totalPages }).map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  onClick={() => setCarouselIndex(dotIdx)}
                  className={`transition-all rounded-full cursor-pointer ${
                    carouselIndex === dotIdx
                      ? 'w-6 h-1 bg-violet-400'
                      : 'w-1.5 h-1 bg-white/10 hover:bg-white/20'
                  }`}
                  aria-label={`Go to slide ${dotIdx + 1}`}
                />
              ))}
            </div>
            )}
          </div>
        </main>
        {/* END: ScrollableWorkspace */}

        {/* BEGIN: StudioStatusBar */}
        <footer
          className="h-8 flex-shrink-0 bg-[#08090D] border-t border-[rgba(255,255,255,0.06)] px-6 flex items-center justify-between text-[11px] text-slate-500 select-none"
          data-purpose="studio-footer-status"
        >
          <div className="flex items-center space-x-4">
            <span>
              Credit Storage: <strong className="text-slate-300 font-mono font-normal">18.2 / 24 GB</strong>
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span>
              Studio Workspace: <strong className="text-slate-400 font-normal">Production Tier</strong>
            </span>
            <span>•</span>
            <span className="font-mono text-[10px] text-slate-600">Build 2026.10-PRO</span>
          </div>
        </footer>
        {/* END: StudioStatusBar */}
      </div>
      {/* END: MainContentShell */}

      {/* Video Preview Lightbox Modal */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-4xl bg-[#0D0F17] rounded-2xl border border-violet-500/30 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#11131E]">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-semibold text-white tracking-wide">{previewTitle} — Render Master</span>
              </div>
              <button
                onClick={() => setPreviewVideoUrl(null)}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              <video
                src={previewVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Takes & Sequences Inspection Modal */}
      {takesModalStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-[#0D0F17] rounded-xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#11131E]">
              <div>
                <div className="text-[10px] uppercase font-semibold tracking-wider text-violet-400">
                  Sequences &amp; Takes
                </div>
                <h3 className="text-sm font-semibold text-white">{takesModalStory.title}</h3>
              </div>
              <button
                onClick={() => setTakesModalStory(null)}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3 custom-scrollbar flex-1">
              {takesSequences.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">No generated sequences available for this story.</p>
              ) : takesSequences.map((sequence) => (
                <div
                  key={sequence.scene_id}
                  className="p-3.5 rounded-lg bg-[#11131E] border border-white/[0.06] flex items-center justify-between gap-3 hover:border-violet-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Video thumbnail / indicator */}
                    {sequence.video_url ? (
                      <div
                        onClick={() => {
                          setPreviewTitle(`${takesModalStory?.title || 'Story'} — Scene ${String(sequence.scene_id).padStart(2, '0')}`);
                          setPreviewVideoUrl(sequence.video_url!);
                        }}
                        className="w-16 h-20 rounded-lg overflow-hidden bg-black/60 border border-violet-500/30 shrink-0 relative group cursor-pointer"
                        title="Click to play video clip"
                      >
                        <video
                          src={resolveMediaUrl(sequence.video_url)}
                          className="w-full h-full object-cover"
                          muted
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                          <Play className="w-4 h-4 text-white fill-white drop-shadow" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-16 h-20 rounded-lg overflow-hidden bg-white/[0.03] border border-white/[0.08] shrink-0 flex flex-col items-center justify-center text-slate-500 text-[10px] font-mono p-1 text-center">
                        <Clock className="w-3.5 h-3.5 mb-1 text-slate-400" />
                        <span>Take {sequence.scene_id}</span>
                      </div>
                    )}

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white font-mono">
                          Scene {String(sequence.scene_id).padStart(2, '0')}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-950/40 text-violet-300 border border-violet-500/30">
                          {sequence.shot_type || sequence.motion_type || 'Veo Motion'}
                        </span>
                        {sequence.video_url && (
                          <span className="text-[9.5px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                            Clip Ready
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {sequence.visual_description || sequence.setting || 'Generated sequence scene.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {sequence.video_url && (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewTitle(`${takesModalStory?.title || 'Story'} — Scene ${String(sequence.scene_id).padStart(2, '0')}`);
                          setPreviewVideoUrl(sequence.video_url!);
                        }}
                        className="px-2.5 py-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Watch clip"
                      >
                        <Play className="w-3 h-3 fill-emerald-300" />
                        <span className="hidden sm:inline">Play Clip</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const sid = takesModalStory?.id;
                        setTakesModalStory(null);
                        router.push(sid ? `/create?storyId=${sid}&phase=4&scene=${sequence.scene_id}` : '/create');
                      }}
                      className="px-3 py-1.5 rounded bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-400/30 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                      title="Navigate to this scene clip in studio"
                    >
                      <span>Scene {sequence.scene_id}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Script Import Modal */}
      {scriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg bg-[#0D0F17] rounded-xl border border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <FileText className="w-4 h-4 text-violet-400" />
                Import Cinematic Script
              </div>
              <button
                onClick={() => setScriptModalOpen(false)}
                className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Paste or drag-and-drop a Fountain or Final Draft (.fdx) screenplay file. FableMotion will parse scenes, sluglines, and characters automatically.
            </p>
            <textarea
              placeholder="INT. BALLROOM - NIGHT&#10;The grand hall is suffocated by candlelight..."
              className="w-full h-36 p-3 rounded-lg bg-[#11131E] border border-white/10 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 font-mono resize-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setScriptModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#121520] hover:bg-[#181C2B] text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setScriptModalOpen(false);
                  setToastMessage('Script parsed into 3 sequences and 8 shot cards.');
                  router.push('/create');
                }}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-medium cursor-pointer"
              >
                Parse &amp; Create Project
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

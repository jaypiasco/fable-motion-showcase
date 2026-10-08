'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  fetchStories,
  fetchStoryDetails,
  fetchSystemStatus,
  fetchModelsConfig,
  startStoryRun,
  generatePhase1,
  generateStoryConcepts,
  regenerateStoryConcepts,
  selectStoryConcept,
  generateCharacterImages,
  regeneratePhase2,
  regeneratePhase3,
  regeneratePhase4,
  cancelStoryGeneration,
  resumeStoryGeneration,
  trashStory,
  testTool,
  approvePlan,
  assembleStoryClips,
  FALLBACK_STORY_DETAIL,
} from '../../lib/api';

import {
  StorySummary,
  StoryDetail,
  SystemStatus,
  ModelsConfig,
} from '../../lib/types';
import { LightboxModal } from '../../components/LightboxModal';
import { VideoPreviewModal } from '../../components/VideoPreviewModal';
import { AuthModal } from '../../components/AuthModal';
import { TestingDashboard } from '../../components/studio/TestingDashboard';
import { StudioSidebar } from '../../components/StudioSidebar';
import { TopbarProfileMenu } from '../../components/TopbarProfileMenu';
import { PipelineRightRail } from '../../components/studio/PipelineRightRail';
import { WorkspacePipelineFlow } from '../../components/studio/WorkspacePipelineFlow';
import { supabase } from '../../lib/supabase';
import { isAdminEmail, isWhitelistedEmail } from '../../lib/admin';
import type { User } from '@supabase/supabase-js';

const LOCAL_STORAGE_TEST_THREADS_KEY = 'storycraft_local_test_threads';

interface StoredTestThread extends StorySummary {
  detail?: StoryDetail;
}

function getStoredTestThreads(): StoredTestThread[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TEST_THREADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredTestThread(thread: StoredTestThread) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredTestThreads();
    const filtered = existing.filter((item) => item.story_id !== thread.story_id);
    const updated = [thread, ...filtered].slice(0, 20);
    localStorage.setItem(LOCAL_STORAGE_TEST_THREADS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore write errors in private browsing/full storage
  }
}

function removeStoredTestThread(storyId: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredTestThreads().filter((t) => t.story_id !== storyId);
    localStorage.setItem(LOCAL_STORAGE_TEST_THREADS_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Failed to remove test thread from localStorage:', e);
  }
}

const PHASE_MASTER_PROMPT = `Create a hyper-viral short-form 3D anthropomorphic produce and fruit soap-opera drama (Pixar 3D style) for TikTok, YouTube Shorts, and Instagram Reels. Characters are stylized anthropomorphic fruit and vegetable humanoids spanning diverse produce varieties (e.g. Banana, Red Onion, Savoy Cabbage, Strawberry, Carrot, Lemon, Eggplant, Tomato, Garlic) with produce heads completely fused into shoulders with no human neck or gap, realistic organic skin/peel/leaf textures, faces carved directly into the produce surface, large glossy expressive eyes, smooth stylized bodies matching each produce species with no human skin, wearing hyper-realistic tailored attire (bespoke suits, fitted blazers, evening gowns, coats, ties, and fine jewelry). Give every character an authentic, realistic human first and last name (e.g. Arthur Bananier, Elena Vance, Julian Corvus, Marcus Sterling, Beatrice Chen; never name characters simply Banana or Onion). Structure the idea as a 10 to 14 scene vertical 9:16 script (Scene 1 to Scene N, dynamically selecting 10 to 14 scenes based on narrative pacing) with a shocking 3-second hook, escalating melodrama, character actions, voiceover, dialogue, camera movement, lighting, and sound cues. Phase 2 synthesizes character reference portraits (Pixar-style 3D anthropomorphic produce portraits centered on a clean white background) rendered with Google Imagen 3 and stored in /assets/characters for all clips. The pipeline then iterates clip-by-clip: Phase 3 generates the scene keyframe from the script and /assets character references strictly via Google Imagen 3 (no third-party fallbacks), Phase 4 waits for the keyframe to render the video clip via Google Veo 3.1 Fast with native dialogue and room tone, and Phase 5 applies dynamic karaoke captions per clip, merging all scene clips together on the final scene iteration into the master story video.`;

const ASPECT_RATIO_OPTIONS: Array<{ id: '9:16' | '16:9' | '1:1'; label: string; icon: string }> = [
  { id: '9:16', label: '9:16 Vertical', icon: 'vertical' },
  { id: '16:9', label: '16:9 Landscape', icon: 'landscape' },
];

const PROMPT_SUGGESTIONS = [
  'Create a viral fruit story',
  'Give me story ideas',
  'Turn my story idea into a 14-scene video',
];

function isIdeationPrompt(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!lower) return false;
  return (
    /^(give me|suggest|provide|show me|brainstorm|create|pitch|generate)?\s*(some\s+|3\s+)?(story\s+)?(ideas?|concepts?|premises?|pitches)/i.test(lower) ||
    lower === 'give me story ideas' ||
    lower === 'story ideas' ||
    lower === 'give me ideas' ||
    lower.includes('story ideas') ||
    lower.includes('concept ideas') ||
    lower.includes('brainstorm ideas')
  );
}

function WorkflowPipelineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStoryId = searchParams.get('storyId');
  const initialPhaseParam = searchParams.get('phase');
  const initialSceneParam = searchParams.get('scene');

  // Story & Data State
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(initialStoryId);

  const [activeStoryDetail, setActiveStoryDetail] = useState<StoryDetail | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [modelsConfig, setModelsConfig] = useState<ModelsConfig | null>(null);

  // Prompt Composer State
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [aspectRatioOpen, setAspectRatioOpen] = useState(false);
  const [referenceAsset, setReferenceAsset] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingPrompt, setGeneratingPrompt] = useState('');
  const [generationFailed, setGenerationFailed] = useState(false);

  // Search & Navigation State
  const [searchQuery, setSearchQuery] = useState('');
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [activePhase, setActivePhase] = useState<number | null>(null);
  const [pipelineRailOpen, setPipelineRailOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeThreadMenu, setActiveThreadMenu] = useState<string | null>(null);
  const [showAllThreads, setShowAllThreads] = useState(false);

  // Overlays & Secondary Features
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [isTestingDashboardOpen, setIsTestingDashboardOpen] = useState(false);
  const [testToolsVisible, setTestToolsVisible] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSynthesizingCharacters, setIsSynthesizingCharacters] = useState(false);
  const [isRegeneratingConcepts, setIsRegeneratingConcepts] = useState(false);
  const [isAdvancingPhase, setIsAdvancingPhase] = useState(false);
  const [isAssemblingPhase5, setIsAssemblingPhase5] = useState(false);
  const [isRunningOneScenePipeline, setIsRunningOneScenePipeline] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [aiAccessModalOpen, setAiAccessModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [lightbox, setLightbox] = useState<{ isOpen: boolean; url: string | null; caption?: string }>({
    isOpen: false,
    url: null,
    caption: '',
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const threadMenuRef = useRef<HTMLDivElement>(null);

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

  // Document title matching mock
  useEffect(() => {
    document.title = 'FableMotion Studio OS — Generative Cinema Engine';
  }, []);

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
    if (!isAdmin) setIsTestingDashboardOpen(false);
  }, [isAdmin]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setTestToolsVisible(window.localStorage.getItem('fablemotion_test_tools_visible') !== 'false');
  }, []);

  const handleTestToolsVisibilityChange = (visible: boolean) => {
    setTestToolsVisible(visible);
    window.localStorage.setItem('fablemotion_test_tools_visible', String(visible));
    setToastMessage(visible ? 'Admin test controls shown.' : 'Admin test controls hidden.');
  };

  // Auto-dismiss toast notification
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-container]')) {
        setAspectRatioOpen(false);
        setProjectDropdownOpen(false);
        setPresetsOpen(false);
        setActiveThreadMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load backend data merged with local threads (admin & whitelisted users)
  const loadData = useCallback(async () => {
    try {
      const isAuthorized = isAdmin || isWhitelistedEmail(currentUser?.email);
      const [backendStories, status, models] = await Promise.all([
        isAuthorized ? fetchStories().catch(() => []) : Promise.resolve([]),
        fetchSystemStatus().catch(() => null),
        fetchModelsConfig().catch(() => null),
      ]);

      const localThreads = isAuthorized ? getStoredTestThreads() : [];
      const cleanBackendStories = (backendStories || []).filter((s) => {
        const sid = (s.story_id || '').toLowerCase();
        const title = (s.title || '').toLowerCase();
        return !s.is_test_run && !sid.startsWith('test_') && !sid.includes('_test_') && !title.startsWith('test ');
      });
      const mergedStories: StorySummary[] = isAuthorized ? [...cleanBackendStories] : [];

      for (const local of localThreads) {
        const sid = (local.story_id || '').toLowerCase();
        const title = (local.title || '').toLowerCase();
        if (local.is_test_run || sid.startsWith('test_') || sid.includes('_test_') || title.startsWith('test ')) {
          continue;
        }
        const idx = mergedStories.findIndex((s) => s.story_id === local.story_id);
        if (idx < 0) {
          mergedStories.unshift({
            story_id: local.story_id,
            story_slug: local.story_slug || local.story_id,
            title: local.title,
            prompt: local.prompt,
            logline: local.logline,
            status: local.status,
            current_phase: local.current_phase,
            created_at: local.created_at,
            updated_at: local.updated_at,
            scenes_count: local.scenes_count,
            thumbnail_url: local.thumbnail_url,
            has_final_video: local.has_final_video,
            is_trashed: local.is_trashed,
            is_test_run: false,
          });
        }
      }

      setStories(mergedStories);
      if (status) setSystemStatus(status);
      if (models) setModelsConfig(models);

      const targetId = activeStoryId || initialStoryId;
      if (targetId) {
        try {
          const detail = await fetchStoryDetails(targetId);
          setActiveStoryDetail(detail);
          if (detail?.story_id && activeStoryId !== detail.story_id && (detail.story_id.includes(targetId) || targetId.includes(detail.story_id))) {
            setActiveStoryId(detail.story_id);
          }
          if (initialPhaseParam) {
            const pNum = parseInt(initialPhaseParam, 10);
            if (!isNaN(pNum) && pNum >= 1 && pNum <= 5) {
              setActivePhase(pNum);
            }
          }
        } catch {
          const matchedLocal = localThreads.find((t) => t.story_id === targetId);
          if (matchedLocal?.detail) {
            setActiveStoryDetail(matchedLocal.detail);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load studio workflow data:', err);
    }
  }, [activeStoryId, initialStoryId, initialPhaseParam, isAdmin]);

  // If initialSceneParam is passed in URL, auto-scroll to the scene card
  useEffect(() => {
    if (initialSceneParam && activeStoryDetail) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`scene-card-${initialSceneParam}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [initialSceneParam, activeStoryDetail]);


  useEffect(() => {
    loadData();
    const pollInterval = (activeStoryDetail?.status === 'in_progress' || isAdvancingPhase || isSynthesizingCharacters) ? 2000 : 5000;
    const interval = setInterval(loadData, pollInterval);
    return () => clearInterval(interval);
  }, [loadData, activeStoryDetail?.status, isAdvancingPhase, isSynthesizingCharacters]);

  // Format relative time helper
  const formatTimeAgo = (isoString?: string | null): string => {
    if (!isoString) return 'Updated 2h ago';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      if (isNaN(diffMs) || diffMs < 0) return 'Just now';
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Updated ${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Updated yesterday';
      if (diffDays < 7) return `Updated ${diffDays}d ago`;
      return `Updated ${new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    } catch {
      return 'Updated recently';
    }
  };

  const isAllPipelineFinished = Boolean(
    (activeStoryDetail?.phases?.phase_5_video_generation?.status === 'completed' ||
     Boolean(activeStoryDetail?.phases?.phase_5_video_generation?.assembly?.final_video_url) ||
     Boolean(activeStoryDetail?.has_final_video)) &&
    activeStoryDetail?.phases?.phase_3_images?.status === 'completed' &&
    activeStoryDetail?.phases?.phase_4_animation_prompts?.status === 'completed'
  );

  const isPipelineActive = Boolean(
    isGenerating ||
    (activeStoryId &&
      activeStoryId !== 'new-studio-project' &&
      activeStoryDetail &&
      !activeStoryDetail.is_trashed)
  );

  // Generate new story
  const handleGenerateStory = async (customPrompt?: string) => {
    if (isGenerating || isAdvancingPhase || isSynthesizingCharacters || isRunningOneScenePipeline) {
      setToastMessage('A process pipeline is already actively running. Cancel or wait for it before generating a new story.');
      return;
    }

    if (!currentUser) {
      setAuthModalOpen(true);
      setToastMessage('Please sign in or create an account to start generating stories.');
      return;
    }

    if (!isWhitelistedEmail(currentUser.email)) {
      setToastMessage(`Access restricted: ${currentUser.email || 'your account'} is not on the studio access whitelist.`);
      return;
    }

    const raw = typeof customPrompt === 'string' ? customPrompt : prompt;
    const trimmed = raw.trim();
    if (!trimmed) {
      setToastMessage('Please describe your scene beats or enter a prompt.');
      promptTextareaRef.current?.focus();
      return;
    }

    setGeneratingPrompt(trimmed);
    setPipelineRailOpen(true);
    setIsGenerating(true);
    setGenerationFailed(false);
    setActivePhase(1);

    if (isIdeationPrompt(trimmed)) {
      try {
        setToastMessage("Generating 3 viral story concepts with AI...");
        const conceptRes = await generateStoryConcepts(trimmed);
        if (conceptRes && conceptRes.story_id) {
          setActiveStoryId(conceptRes.story_id);
          setActivePhase(1);
          let detail = await fetchStoryDetails(conceptRes.story_id).catch(() => null);
          if (!detail) {
            detail = {
              ...FALLBACK_STORY_DETAIL,
              story_id: conceptRes.story_id,
              prompt: trimmed,
              concepts: conceptRes.concepts,
              call_to_action: conceptRes.call_to_action || "Choose a concept (1, 2, or 3) or provide custom modifications to proceed to Phase 2.",
              selected_concept: null,
            };
          } else {
            detail.concepts = conceptRes.concepts;
            detail.call_to_action = conceptRes.call_to_action || "Choose a concept (1, 2, or 3) or provide custom modifications to proceed to Phase 2.";
          }
          setActiveStoryDetail(detail);
          setToastMessage("3 story concepts ready. Choose a concept to proceed!");
        }
        await loadData();
      } catch (err) {
        console.error("Failed to generate concepts:", err);
        setGenerationFailed(true);
        setToastMessage("Failed to generate concepts. Please try again.");
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    try {
      const fullPrompt = `[Format: ${aspectRatio}] ${trimmed}`;
      const res = await startStoryRun(fullPrompt);

      if (res && res.story_id) {
        setActiveStoryId(res.story_id);
        setActivePhase(1);
        setToastMessage('Story track saved. Generating Phase 1 ideas for your review...');
        await generatePhase1(res.story_id);
        let detail: StoryDetail | null = null;
        for (let attempt = 0; attempt < 30; attempt += 1) {
          detail = await fetchStoryDetails(res.story_id).catch(() => null);
          if (detail?.phases?.phase_1_script?.status === 'completed') break;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        if (detail) setActiveStoryDetail(detail);
        setToastMessage(
          detail?.phases?.phase_1_script?.status === 'completed'
            ? 'Phase 1 ideas are ready. Choose a direction and approve it before Phase 2.'
            : 'Phase 1 is still generating. Your progress is saved in Recent Studio Threads.'
        );
      } else {
        // Fallback test thread creation
        const testStoryId = `story_${Date.now().toString(36)}`;
        const fallbackDetail: StoryDetail = {
          ...FALLBACK_STORY_DETAIL,
          story_id: testStoryId,
          story_slug: testStoryId,
          prompt: trimmed,
          phases: {
            ...FALLBACK_STORY_DETAIL.phases,
            phase_1_script: {
              status: 'completed',
              completed_at: new Date().toISOString(),
              agent_model_used: 'google/gemini-2.5-flash',
              agent_model_display: 'Gemini Script Agent',
              idea: {
                title: trimmed.slice(0, 32),
                logline: trimmed.slice(0, 80),
                hook_3s: 'The silence shattered as the first crystal frequency resonated.',
                genre: 'Viral 3D Faceted-Crystal Drama',
                aspect_ratio: aspectRatio,
              },
              scenes: FALLBACK_STORY_DETAIL.phases?.phase_1_script?.scenes || [],
            },
          },
        };
        const newThread: StoredTestThread = {
          story_id: testStoryId,
          story_slug: testStoryId,
          title: trimmed.slice(0, 32),
          prompt: trimmed,
          logline: trimmed.slice(0, 80),
          status: 'in_progress',
          current_phase: 'phase_1_script',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          scenes_count: 4,
          thumbnail_url: null,
          has_final_video: false,
          is_trashed: false,
          is_test_run: true,
          detail: fallbackDetail,
        };
        saveStoredTestThread(newThread);
        setActiveStoryId(testStoryId);
        setActiveStoryDetail(fallbackDetail);
        setActivePhase(1);
        setToastMessage('Story track saved to Recent Threads. Review the Phase 1 plan before continuing.');
      }
      await loadData();
    } catch (err) {
      console.error('Failed to generate story track:', err);
      setGenerationFailed(true);
      setToastMessage('Generated local story track draft.');
    } finally {
      setIsGenerating(false);
    }
  };

  const [isSelectingConcept, setIsSelectingConcept] = useState(false);

  const handleSelectConcept = async (concept: any) => {
    if (!currentUser) {
      setAuthModalOpen(true);
      setToastMessage('Please sign in or create an account to select concepts.');
      return;
    }

    if (!isWhitelistedEmail(currentUser.email)) {
      setToastMessage(`Access restricted: ${currentUser.email || 'your account'} is not on the studio access whitelist.`);
      return;
    }
    if (!activeStoryId && !activeStoryDetail) return;
    setIsSelectingConcept(true);
    setToastMessage(`Selecting Concept "${concept.title || 'Untitled'}" and generating Phase 1 script...`);

    if (!currentUser || activeStoryDetail?.is_test_run) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (activeStoryDetail) {
        const updatedDetail: StoryDetail = {
          ...activeStoryDetail,
          selected_concept: concept,
          phases: {
            ...activeStoryDetail.phases,
            phase_1_script: {
              status: 'completed',
              completed_at: new Date().toISOString(),
              agent_model_used: 'google/gemini-2.5-flash',
              agent_model_display: 'Gemini Script Agent',
              idea: {
                title: concept.title || "Untitled Story",
                logline: concept.logline || "A high-stakes dramatic arc.",
                hook_3s: concept.hook_3s || "A shocking 3-second opening hook.",
                genre: concept.genre || "Viral 3D Produce Drama",
                aspect_ratio: aspectRatio,
              },
              scenes: FALLBACK_STORY_DETAIL.phases?.phase_1_script?.scenes || [],
            },
          },
        };
        setActiveStoryDetail(updatedDetail);
        setToastMessage(`Concept "${concept.title}" selected! Review your Phase 1 scene beats.`);
      }
      setIsSelectingConcept(false);
      return;
    }

    try {
      await selectStoryConcept(activeStoryId!, concept);
      let detail: StoryDetail | null = null;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        detail = await fetchStoryDetails(activeStoryId!).catch(() => null);
        if (detail?.phases?.phase_1_script?.status === 'completed') break;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (detail) {
        detail.selected_concept = concept;
        setActiveStoryDetail(detail);
      }
      setToastMessage(`Concept "${concept.title}" selected! Phase 1 scene beats are ready.`);
      await loadData();
    } catch (err) {
      console.error('Failed to select concept:', err);
      setToastMessage('Error selecting concept. Please try again.');
    } finally {
      setIsSelectingConcept(false);
    }
  };

  const handleSwitchConcept = () => {
    if (activeStoryDetail) {
      setActiveStoryDetail({
        ...activeStoryDetail,
        selected_concept: null,
      });
      setToastMessage("Choose a concept (1, 2, or 3) to continue.");
    }
  };

  // Regenerate concept ideas
  const handleRegenerateConcepts = async () => {
    if (!activeStoryId && !activeStoryDetail) return;
    setIsRegeneratingConcepts(true);
    setToastMessage('Regenerating 3 fresh story concepts with Gemini...');

    const currentPrompt = activeStoryDetail?.prompt || prompt || 'Create a viral fruit story';

    if (!currentUser || activeStoryDetail?.is_test_run) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const res = await generateStoryConcepts(currentPrompt);
        if (activeStoryDetail) {
          setActiveStoryDetail({
            ...activeStoryDetail,
            concepts: res.concepts,
            call_to_action: res.call_to_action || 'Choose a concept (1, 2, or 3) to proceed to Phase 2.',
            selected_concept: null,
          });
        }
      } catch {
        if (activeStoryDetail) {
          setActiveStoryDetail({
            ...activeStoryDetail,
            concepts: [
              {
                id: '1',
                title: 'The Citrus Succession',
                logline: 'When the lemon dynasty patriarch falls ill, rival citrus siblings fight for control of the grove empire.',
                hook_3s: 'A golden lemon ring hits the boardroom table as the inheritance clause is revealed.',
                big_twist: 'The grove is situated atop a rare geothermal mineral spring.',
                visual_style: 'Hyper-vibrant citrus hues, luxury marble boardroom, 9:16 vertical.'
              },
              {
                id: '2',
                title: 'The Banana Betrayal',
                logline: 'Arthur Bananier discovers a hostile takeover orchestrated by his closest confidant in the produce guild.',
                hook_3s: 'A torn parchment contract reveals the secret buyout of the organic plantation.',
                big_twist: 'The confidant was acting under orders from the founder himself.',
                visual_style: 'Warm ripe banana tones, bespoke tailored blazers, Octane Render 8k.'
              },
              {
                id: '3',
                title: 'The Crimson Solstice',
                logline: 'A rare strawberry heirloom is stolen during the grand solstice masquerade ball.',
                hook_3s: 'The shatter-proof glass case stands empty, leaving ruby-colored syrup droplets.',
                big_twist: 'The detective tasked with solving the case planned the heist.',
                visual_style: 'Deep crimson ruby palette, dramatic chiaroscuro rim lighting, 9:16 vertical.'
              }
            ],
            selected_concept: null,
          });
        }
      }
      setIsRegeneratingConcepts(false);
      setToastMessage('Regenerated 3 fresh story concepts!');
      return;
    }

    try {
      const res = await regenerateStoryConcepts(activeStoryId!, currentPrompt);
      if (res && res.concepts) {
        if (activeStoryDetail) {
          setActiveStoryDetail({
            ...activeStoryDetail,
            concepts: res.concepts,
            call_to_action: res.call_to_action || 'Choose a concept (1, 2, or 3) to proceed to Phase 2.',
            selected_concept: null,
          });
        }
        setToastMessage('Regenerated 3 fresh story concepts!');
      }
      await loadData();
    } catch (err) {
      console.error('Failed to regenerate concepts:', err);
      setToastMessage('Failed to regenerate concepts. Please try again.');
    } finally {
      setIsRegeneratingConcepts(false);
    }
  };

  // Switch active project
  const handleSelectStory = async (storyId: string, customTitle?: string) => {
    setActiveStoryId(storyId);
    setProjectDropdownOpen(false);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('storyId', storyId);
      window.history.replaceState(null, '', url.toString());
    }

    try {
      const detail = await fetchStoryDetails(storyId).catch(() => null);
      if (detail) {
        setActiveStoryDetail(detail);
        if (detail.prompt) setPrompt(detail.prompt);
        const phaseMap: Record<string, number> = {
          phase_1_script: 1,
          phase_2_characters: 2,
          phase_3_images: 3,
          phase_4_animation_prompts: 4,
          phase_5_video_generation: 5,
          completed: 5,
        };
        const currentPhaseNum = detail.current_phase ? phaseMap[detail.current_phase] : 1;
        setActivePhase(currentPhaseNum || 1);
      }
      setToastMessage(`Project loaded: ${customTitle || storyId}`);
    } catch (e) {
      console.error(e);
    }
  };

  // Generate character images (replaces old glitchy mock synthesis)
  const handleSynthesizeCharacters = async () => {
    if (!currentUser) {
      setAuthModalOpen(true);
      setToastMessage('Please sign in or create an account to generate character portraits.');
      return;
    }

    setIsSynthesizingCharacters(true);
    setToastMessage('Generating character reference portraits with Imagen 3...');

    if (activeStoryDetail?.is_test_run || !activeStoryId) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      if (activeStoryDetail) {
        const currentChars = activeStoryDetail.phases?.phase_2_characters?.characters || [];
        const baseChars = currentChars.length > 0 ? currentChars : [
          {
            name: 'Arthur Bananier',
            role: 'Protagonist',
            visual_anchor: 'Ripe banana peel texture with tiny speckles, head fused into shoulders with no neck, bespoke navy suit.',
            style_prompt: 'Full body cinematic 3D character portrait of Arthur Bananier, ripe yellow banana peel texture, navy blazer, 9:16 vertical.',
          },
          {
            name: 'Elena Vance',
            role: 'Antagonist',
            visual_anchor: 'Red onion layered skin with violet luster, emerald-threaded formal waistcoat.',
            style_prompt: 'Full body cinematic 3D character portrait of Elena Vance, violet red-onion skin texture, formal attire, 9:16 vertical.',
          },
        ];
        const updatedChars = baseChars.map((c: any, i: number) => ({
          ...c,
          image_url: `/api/media/archive/demo_portrait_${i + 1}.png`,
        }));

        setActiveStoryDetail({
          ...activeStoryDetail,
          phases: {
            ...activeStoryDetail.phases,
            phase_2_characters: {
              status: 'completed',
              completed_at: new Date().toISOString(),
              agent_model_used: 'Google Imagen 3 Studio Portrait',
              characters: updatedChars,
            },
          },
        });
        setToastMessage('Character reference portraits generated!');
      }
      setIsSynthesizingCharacters(false);
      return;
    }

    try {
      await generateCharacterImages(activeStoryId!);
      // Poll for completion of character reference portraits with incremental updates
      let detail: StoryDetail | null = null;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        detail = await fetchStoryDetails(activeStoryId!).catch(() => null);
        if (detail) {
          setActiveStoryDetail(detail);
        }
        const chars = detail?.phases?.phase_2_characters?.characters || [];
        const allHaveImages = chars.length > 0 && chars.every((c: any) => Boolean(c.image_url));
        const p2Status = detail?.phases?.phase_2_characters?.status;
        if (allHaveImages || p2Status === 'completed' || p2Status === 'error') {
          break;
        }
      }
      if (detail) {
        setActiveStoryDetail(detail);
      }
      setToastMessage('Character reference portraits generated!');
      await loadData();
    } catch (err) {
      console.error('Error generating character images:', err);
      setToastMessage('Character portrait generation started in the background.');
    } finally {
      setIsSynthesizingCharacters(false);
    }
  };

  const [isRegeneratingKeyframes, setIsRegeneratingKeyframes] = useState(false);
  const [isRegeneratingVideoClips, setIsRegeneratingVideoClips] = useState(false);

  // Re-generate character images (forces new generation in Phase 2 with optional instructions)
  const handleRegenerateCharacters = async (instructions?: string) => {
    if (!currentUser) {
      setAuthModalOpen(true);
      setToastMessage('Please sign in or create an account to regenerate character portraits.');
      return;
    }

    setIsSynthesizingCharacters(true);
    setToastMessage(instructions ? 'Re-generating character portraits with custom modifications...' : 'Re-generating character reference portraits with Imagen 3...');

    // Immediately clear local portrait previews so user gets instant visual feedback that regeneration is running
    if (activeStoryDetail?.phases?.phase_2_characters?.characters) {
      const resetChars = activeStoryDetail.phases.phase_2_characters.characters.map((c: any) => ({
        ...c,
        image_url: undefined,
      }));
      setActiveStoryDetail({
        ...activeStoryDetail,
        phases: {
          ...activeStoryDetail.phases,
          phase_2_characters: {
            ...activeStoryDetail.phases.phase_2_characters,
            characters: resetChars,
          },
        },
      });
    }

    if (activeStoryDetail?.is_test_run || !activeStoryId) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      if (activeStoryDetail) {
        const currentChars = activeStoryDetail.phases?.phase_2_characters?.characters || [];
        const updatedChars = currentChars.map((c: any, i: number) => ({
          ...c,
          image_url: `/api/media/archive/demo_portrait_${i + 1}.png?t=${Date.now()}`,
        }));
        setActiveStoryDetail({
          ...activeStoryDetail,
          phases: {
            ...activeStoryDetail.phases,
            phase_2_characters: {
              status: 'completed',
              completed_at: new Date().toISOString(),
              agent_model_used: 'Google Imagen 3 Studio Portrait',
              characters: updatedChars,
            },
          },
        });
      }
      setIsSynthesizingCharacters(false);
      setToastMessage('Character reference portraits re-generated!');
      return;
    }

    try {
      await regeneratePhase2(activeStoryId!, instructions);
      let detail: StoryDetail | null = null;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        detail = await fetchStoryDetails(activeStoryId!).catch(() => null);
        if (detail) {
          setActiveStoryDetail(detail);
        }
        const chars = detail?.phases?.phase_2_characters?.characters || [];
        const allHaveImages = chars.length > 0 && chars.every((c: any) => Boolean(c.image_url));
        const p2Status = detail?.phases?.phase_2_characters?.status;
        if (allHaveImages || p2Status === 'completed' || p2Status === 'error') {
          break;
        }
      }
      if (detail) {
        setActiveStoryDetail(detail);
      }
      setToastMessage('Character reference portraits re-generated!');
      await loadData();
    } catch (err) {
      console.error('Error re-generating character images:', err);
      setToastMessage('Character portrait re-generation started in background.');
    } finally {
      setIsSynthesizingCharacters(false);
    }
  };

  // Re-generate Phase 3 keyframes with optional instructions
  const handleRegenerateKeyframes = async (instructions?: string) => {
    if (!currentUser && !activeStoryDetail?.is_test_run && !isAdmin) {
      setAuthModalOpen(true);
      setToastMessage('Please sign in or create an account to regenerate keyframes.');
      return;
    }
    if (!activeStoryId) return;

    setIsRegeneratingKeyframes(true);
    setToastMessage(instructions ? 'Re-generating scene keyframes with custom instructions...' : 'Re-generating scene keyframes in 9:16...');

    if (activeStoryDetail?.phases?.phase_3_images?.items) {
      const resetItems = activeStoryDetail.phases.phase_3_images.items.map((it: any) => ({
        ...it,
        image_url: undefined,
        status: 'generating',
      }));
      setActiveStoryDetail({
        ...activeStoryDetail,
        phases: {
          ...activeStoryDetail.phases,
          phase_3_images: {
            ...activeStoryDetail.phases.phase_3_images,
            status: 'in_progress',
            items: resetItems,
          },
        },
      });
    }

    try {
      if (activeStoryDetail?.is_test_run) {
        const testRes = await testTool('phase_3', {
          story_id: activeStoryId,
          prompt: instructions || undefined,
        });
        if (testRes.success) {
          const detail = await fetchStoryDetails(activeStoryId).catch(() => null);
          if (detail) setActiveStoryDetail(detail);
          setToastMessage('Keyframe images re-generated successfully!');
        } else {
          setToastMessage(`Keyframe regeneration notice: ${testRes.error || testRes.message}`);
        }
      } else {
        await regeneratePhase3(activeStoryId, instructions);
        let detail: StoryDetail | null = null;
        for (let attempt = 0; attempt < 60; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          detail = await fetchStoryDetails(activeStoryId).catch(() => null);
          if (detail) {
            setActiveStoryDetail(detail);
          }
          const items = detail?.phases?.phase_3_images?.items || [];
          const allDone = items.length > 0 && items.every((it: any) => Boolean(it.image_url) && it.status === 'completed');
          const p3Status = detail?.phases?.phase_3_images?.status;
          if (attempt > 0 && (allDone || (p3Status === 'completed' && items.every((it: any) => Boolean(it.image_url))) || p3Status === 'error')) {
            break;
          }
        }
        if (detail) {
          setActiveStoryDetail(detail);
        }
        setToastMessage('Keyframe images re-generated!');
      }
      await loadData();
    } catch (err: any) {
      console.error('Error regenerating keyframes:', err);
      setToastMessage(`Failed to regenerate keyframes: ${err?.message || 'Error'}`);
    } finally {
      setIsRegeneratingKeyframes(false);
    }
  };

  // Re-generate Phase 4 video clips with optional instructions
  const handleRegenerateVideoClips = async (instructions?: string) => {
    if (!currentUser && !activeStoryDetail?.is_test_run && !isAdmin) {
      setAuthModalOpen(true);
      setToastMessage('Please sign in or create an account to regenerate video clips.');
      return;
    }
    if (!activeStoryId) return;

    setIsRegeneratingVideoClips(true);
    setToastMessage(instructions ? 'Re-generating video clips with motion instructions...' : 'Re-generating video clips with Veo...');

    if (activeStoryDetail?.phases?.phase_4_animation_prompts?.items) {
      const resetPrompts = activeStoryDetail.phases.phase_4_animation_prompts.items.map((it: any) => ({
        ...it,
        video_url: undefined,
        status: 'generating',
      }));
      setActiveStoryDetail({
        ...activeStoryDetail,
        phases: {
          ...activeStoryDetail.phases,
          phase_4_animation_prompts: {
            ...activeStoryDetail.phases.phase_4_animation_prompts,
            status: 'in_progress',
            items: resetPrompts,
          },
        },
      });
    }

    try {
      if (activeStoryDetail?.is_test_run) {
        const testRes = await testTool('phase_4', {
          story_id: activeStoryId,
          prompt: instructions || undefined,
        });
        if (testRes.success) {
          const detail = await fetchStoryDetails(activeStoryId).catch(() => null);
          if (detail) setActiveStoryDetail(detail);
          setToastMessage('Video clips re-generated successfully!');
        } else {
          setToastMessage(`Video clip regeneration notice: ${testRes.error || testRes.message}`);
        }
      } else {
        await regeneratePhase4(activeStoryId, instructions);
        let detail: StoryDetail | null = null;
        for (let attempt = 0; attempt < 60; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          detail = await fetchStoryDetails(activeStoryId).catch(() => null);
          if (detail) {
            setActiveStoryDetail(detail);
          }
          const rawClips = (detail?.phases?.phase_5_video_generation as any)?.items ||
                           detail?.phases?.phase_5_video_generation?.clips ||
                           detail?.phases?.phase_4_animation_prompts?.items || [];
          const allDone = rawClips.length > 0 && rawClips.every((c: any) => Boolean(c.video_url) || c.status === 'completed');
          const p4Status = detail?.phases?.phase_4_animation_prompts?.status;
          if (attempt > 0 && (allDone || p4Status === 'completed' || p4Status === 'error')) {
            break;
          }
        }
        if (detail) {
          setActiveStoryDetail(detail);
        }
        setToastMessage('Video clips re-generated!');
      }
      await loadData();
    } catch (err: any) {
      console.error('Error regenerating video clips:', err);
      setToastMessage(`Failed to regenerate video clips: ${err?.message || 'Error'}`);
    } finally {
      setIsRegeneratingVideoClips(false);
    }
  };


  // Advance pipeline phase
  const handleApproveAndProceed = async (targetPhase?: number) => {
    const currentPhase = typeof targetPhase === 'number' ? targetPhase : activePhase;
    if (currentPhase === null) {
      setToastMessage('Select a pipeline phase before approving it.');
      return;
    }

    if (currentPhase >= 1 && activeStoryDetail?.phases?.phase_1_script?.status !== 'completed') {
      setActivePhase(1);
      setToastMessage('Phase 1 must finish the conversation and generate a plan before Phase 2 can begin.');
      return;
    }

    if (currentPhase === 4) {
      const rawClips = (activeStoryDetail?.phases?.phase_5_video_generation as any)?.items ||
                       activeStoryDetail?.phases?.phase_5_video_generation?.clips || [];
      const hasFailedClip = rawClips.some((c: any) => c.status === 'error' || Boolean(c.error));
      const allClipsReady = rawClips.length > 0 && rawClips.every((c: any) => c.status === 'completed' && Boolean(c.video_url));
      if (hasFailedClip || !allClipsReady) {
        setToastMessage('Cannot proceed to Phase 5: One or more video clips failed or are incomplete in Phase 4. Please retry them first.');
        return;
      }
    }

    setIsAdvancingPhase(true);
    try {
      if (activeStoryId && activeStoryId !== 'new-studio-project') {
        setToastMessage(`Approving Phase ${currentPhase}...`);
        await approvePlan(activeStoryId || activeStoryDetail?.story_id!).catch(() => {});
      }
      const next = Math.min(currentPhase + 1, 5);

      if (activeStoryDetail) {
        const phaseOrder = [
          'phase_1_script',
          'phase_2_characters',
          'phase_3_images',
          'phase_4_animation_prompts',
          'phase_5_video_generation',
        ];
        const nextPhaseKey = phaseOrder[next - 1];
        const currentPhaseKey = phaseOrder[currentPhase - 1];

        const updatedDetail: StoryDetail = {
          ...activeStoryDetail,
          current_phase: nextPhaseKey || activeStoryDetail.current_phase,
          phases: {
            ...activeStoryDetail.phases,
            [currentPhaseKey]: {
              ...(activeStoryDetail.phases as any)?.[currentPhaseKey],
              status: 'completed',
            },
          },
        };

        if (nextPhaseKey && !(updatedDetail.phases as any)?.[nextPhaseKey]) {
          (updatedDetail.phases as any)[nextPhaseKey] = {
            status: 'in_progress',
            items: [],
          };
        }
        setActiveStoryDetail(updatedDetail);

        if (activeStoryId) {
          const stored = getStoredTestThreads();
          const target = stored.find((t) => t.story_id === activeStoryId);
          if (target) {
            target.current_phase = updatedDetail.current_phase;
            target.detail = updatedDetail;
            saveStoredTestThread(target);
          }
        }
      }

      setActivePhase(next);
      setToastMessage(`Phase ${currentPhase} approved! Advanced to Phase ${next}.`);
      await loadData();

      // Note: approvePlan() already triggers background StoryPipeline to execute Phase 5 assembly.
      // If not using a backend story (e.g. local test thread), trigger manual assembly.
      if (currentPhase === 4 && (!activeStoryId || activeStoryId === 'new-studio-project')) {
        handleRunPhase5Assembly();
      }
    } catch (err) {
      console.error(err);
      if (currentPhase !== 4) {
        setActivePhase(Math.min(currentPhase + 1, 5));
      }
    } finally {
      setIsAdvancingPhase(false);
    }
  };

  // Manual Phase 5 assembly across all generated clips
  const handleRunPhase5Assembly = async () => {
    if (!activeStoryId && !activeStoryDetail?.story_id) {
      setToastMessage('No active story found to assemble.');
      return;
    }
    const targetStoryId = activeStoryId || activeStoryDetail?.story_id!;
    const rawClips = (activeStoryDetail?.phases?.phase_5_video_generation as any)?.items ||
                     activeStoryDetail?.phases?.phase_5_video_generation?.clips ||
                     activeStoryDetail?.phases?.phase_4_animation_prompts?.items || [];
    const hasFailedClip = rawClips.some((c: any) => c.status === 'error' || Boolean(c.error));
    if (hasFailedClip || rawClips.length === 0) {
      setToastMessage('Cannot run Phase 5 assembly: One or more Phase 4 video clips failed or are missing. Please retry them first.');
      return;
    }
    setIsAssemblingPhase5(true);
    setToastMessage('Triggering Phase 5 Video Assembly across clips with dynamic captions...');
    try {
      const res = await assembleStoryClips(targetStoryId);
      if (res.success) {
        setToastMessage('Phase 5 assembly started! Concat stitching, audio mastering & captions in progress.');
        setActivePhase(5);
        await loadData();
      } else {
        setToastMessage(`Assembly notice: ${res.message || 'Could not start Phase 5'}`);
      }
    } catch (err: any) {
      console.error('Failed to run Phase 5 assembly:', err);
      setToastMessage(`Failed to run Phase 5 assembly: ${err?.message || 'Error'}`);
    } finally {
      setIsAssemblingPhase5(false);
    }
  };

  // Run 1-Scene end-to-end active story session inside WorkspacePipelineFlow
  const handleRunOneScenePipeline = async () => {
    if (isRunningOneScenePipeline) return;
    setIsRunningOneScenePipeline(true);
    setToastMessage('Starting 1-Scene active story session in Studio...');

    try {
      let currentStoryId = (activeStoryId && !activeStoryId.startsWith('demo_') && !activeStoryId.startsWith('test_')) ? activeStoryId : null;
      let detail: StoryDetail | null = null;

      // 1. Ensure we have 1 active story session with Phase 1 dynamic concept generation
      if (!currentStoryId) {
        const seedPrompt = prompt?.trim() || 'A delightful 3D animated adventure about an underdog strawberry aspiring to win the Grand Patisserie Cup.';
        setToastMessage('Phase 1: Generating dynamic story concepts...');
        const conceptRes = await generateStoryConcepts(seedPrompt);
        if (!conceptRes || !conceptRes.story_id) {
          throw new Error('Failed to generate story concepts.');
        }
        currentStoryId = conceptRes.story_id;
        setActiveStoryId(currentStoryId);
        if (typeof window !== 'undefined') {
          router.replace(`/create?storyId=${currentStoryId}`);
        }

        // Auto-select the first generated concept with max_scenes = 1
        const chosenConcept = conceptRes.concepts?.[0] || {
          title: 'The Berry Baker',
          logline: seedPrompt,
          hook_3s: 'One tiny strawberry against the giant ovens.',
          genre: '3D Animated Adventure',
          aspect_ratio: aspectRatio || '9:16'
        };

        setToastMessage(`Selected Concept: "${chosenConcept.title || 'Concept 1'}". Generating 1-scene script...`);
        await selectStoryConcept(currentStoryId, chosenConcept, 1);
      } else {
        // If current story exists, check if concept selection or script generation is needed
        detail = await fetchStoryDetails(currentStoryId).catch(() => null);
        if (detail && !detail.phases?.phase_1_script?.idea && (!detail.selected_concept || !detail.phases?.phase_1_script?.scenes?.length)) {
          if (detail.concepts && detail.concepts.length > 0) {
            await selectStoryConcept(currentStoryId, detail.concepts[0], 1);
          } else {
            const seedPrompt = detail.prompt || prompt?.trim() || 'A delightful 3D animated adventure about an underdog strawberry aspiring to win the Grand Patisserie Cup.';
            const conceptRes = await generateStoryConcepts(seedPrompt);
            if (conceptRes && conceptRes.concepts?.[0]) {
              await selectStoryConcept(currentStoryId, conceptRes.concepts[0], 1);
            }
          }
        }
      }

      // Ensure WorkspacePipelineFlow is active and showing Phase 1
      setActivePhase(1);
      await loadData();

      // Poll until Phase 1 script is completed (timeout ~45s)
      setToastMessage('Synthesizing Phase 1 script for 1 scene...');
      for (let attempt = 0; attempt < 30; attempt++) {
        detail = await fetchStoryDetails(currentStoryId).catch(() => null);
        if (detail?.phases?.phase_1_script?.status === 'completed') break;
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (detail) {
        setActiveStoryDetail(detail);
      }

      // Advance to Phase 2: Character Bibles & Portraits
      setToastMessage('Phase 2: Generating character bibles & portraits...');
      setActivePhase(2);
      setIsSynthesizingCharacters(true);
      await approvePlan(currentStoryId);
      for (let attempt = 0; attempt < 45; attempt++) {
        detail = await fetchStoryDetails(currentStoryId).catch(() => null);
        if (detail?.phases?.phase_2_characters?.status === 'completed') break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      setIsSynthesizingCharacters(false);
      if (detail) {
        setActiveStoryDetail(detail);
      }

      // Advance to Phase 3: Keyframe Image Generation (1 scene)
      setToastMessage('Phase 3: Synthesizing 9:16 scene keyframe...');
      setActivePhase(3);
      await approvePlan(currentStoryId);
      for (let attempt = 0; attempt < 45; attempt++) {
        detail = await fetchStoryDetails(currentStoryId).catch(() => null);
        if (detail?.phases?.phase_3_images?.status === 'completed') break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (detail) {
        setActiveStoryDetail(detail);
      }

      // Advance to Phase 4: Motion Dynamics & Veo 3.1 Fast Video Clip (1 scene)
      setToastMessage('Phase 4: Generating Veo 3.1 video clip...');
      setActivePhase(4);
      await approvePlan(currentStoryId);
      for (let attempt = 0; attempt < 60; attempt++) {
        detail = await fetchStoryDetails(currentStoryId).catch(() => null);
        const clips = (detail?.phases?.phase_5_video_generation as any)?.items ||
                      detail?.phases?.phase_5_video_generation?.clips ||
                      detail?.phases?.phase_4_animation_prompts?.items || [];
        const hasError =
          detail?.phases?.phase_4_animation_prompts?.status === 'error' ||
          detail?.phases?.phase_5_video_generation?.status === 'error' ||
          clips.some((c: any) => c.status === 'error' || Boolean(c.error));
        if (hasError) {
          const errClip = clips.find((c: any) => c.status === 'error' || Boolean(c.error));
          const errMsg = errClip?.error || detail?.phases?.phase_4_animation_prompts?.error || detail?.phases?.phase_5_video_generation?.error || detail?.error || 'Phase 4 video generation failed.';
          throw new Error(errMsg);
        }
        const hasCompletedClips = clips.length > 0 && clips.every((c: any) => c.status === 'completed' && Boolean(c.video_url));
        if (detail?.phases?.phase_4_animation_prompts?.status === 'completed' || hasCompletedClips) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (detail) {
        setActiveStoryDetail(detail);
      }

      setToastMessage('Phase 4 video clip generated! Preview your video below. Approve to proceed to Phase 5 assembly.');
    } catch (err: any) {
      console.error('1-Scene pipeline session notice:', err);
      setToastMessage(`1-Scene session notice: ${err?.message || 'Execution error'}`);
    } finally {
      setIsRunningOneScenePipeline(false);
      await loadData();
    }
  };

  // Deploy master video

  const handleDeploy = () => {
    setIsDeploying(true);
    setToastMessage('Deploying master video to production CDN & streaming channels...');
    setTimeout(() => {
      setIsDeploying(false);
      setToastMessage('Master video successfully deployed to production! Ready for distribution.');
    }, 1800);
  };

  // Resolved video url for master preview
  const previewVideoUrl = useMemo(() => {
    return (
      activeStoryDetail?.phases?.phase_5_video_generation?.assembly?.final_video_url ||
      activeStoryDetail?.phases?.phase_5_video_generation?.assembly?.captioned_video_url ||
      activeStoryDetail?.phases?.phase_5_video_generation?.assembly?.merged_video_url ||
      null
    );
  }, [activeStoryDetail]);

  // Cancel active pipeline process without destroying progress
  const handleCancelProcess = async () => {
    setIsGenerating(false);
    setIsSynthesizingCharacters(false);
    setIsAdvancingPhase(false);
    setIsSelectingConcept(false);
    setIsRegeneratingConcepts(false);
    setIsResuming(false);
    setGeneratingPrompt('');
    setGenerationFailed(false);

    if (activeStoryId && activeStoryId !== 'new-studio-project') {
      try {
        await cancelStoryGeneration(activeStoryId);
      } catch (e) {
        console.error('Error sending cancel request:', e);
      }
      setActiveStoryDetail((prev) =>
        prev
          ? {
              ...prev,
              status: 'cancelled',
              paused: true,
            }
          : null
      );
      const freshDetail = await fetchStoryDetails(activeStoryId).catch(() => null);
      if (freshDetail) {
        setActiveStoryDetail(freshDetail);
      }
      setToastMessage('Generation cancelled. Progress saved; resume anytime.');
    } else {
      setToastMessage('Process cancelled.');
    }
  };

  // Resume active pipeline process from where it was cancelled / paused
  const handleResumeProcess = async () => {
    if (!activeStoryId || activeStoryId === 'new-studio-project') return;
    setIsResuming(true);
    setToastMessage('Resuming generation from where it left off...');

    try {
      const res = await resumeStoryGeneration(activeStoryId);
      if (res && res.success) {
        const curPhase = activeStoryDetail?.current_phase || 'phase_1_script';
        if (curPhase === 'phase_1_script') {
          setIsGenerating(true);
        } else if (curPhase === 'phase_2_characters') {
          setIsSynthesizingCharacters(true);
        } else {
          setIsAdvancingPhase(true);
        }

        // Poll for updates until the active phase completes or changes
        let detail: StoryDetail | null = null;
        for (let attempt = 0; attempt < 60; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          detail = await fetchStoryDetails(activeStoryId).catch(() => null);
          if (!detail) continue;
          setActiveStoryDetail(detail);

          if (detail.status === 'cancelled' || detail.status === 'paused' || detail.paused) {
            break;
          }
          if ((detail.status as string) === 'error' || detail.status === 'failed' || (curPhase in (detail.phases || {}) && (detail.phases as any)[curPhase]?.status === 'error')) {
            break;
          }
          if (curPhase === 'phase_1_script' && detail.phases?.phase_1_script?.status === 'completed') {
            break;
          }
          if (curPhase === 'phase_2_characters' && detail.phases?.phase_2_characters?.status === 'completed') {
            break;
          }
          if (curPhase === 'phase_3_images' && detail.phases?.phase_3_images?.status === 'completed') {
            break;
          }
          if (curPhase === 'phase_4_animation_prompts' && detail.phases?.phase_4_animation_prompts?.status === 'completed') {
            break;
          }
          if (detail.status === 'completed' || detail.has_final_video) {
            break;
          }
        }

        if (detail) {
          setActiveStoryDetail(detail);
        }
        if ((detail?.status as string) === 'error' || detail?.status === 'failed' || (curPhase in (detail?.phases || {}) && (detail?.phases as any)[curPhase]?.status === 'error')) {
          const errMsg = (detail?.phases as any)?.[curPhase]?.error || detail?.error || 'Generation error. Quota limit or backoff active.';
          setToastMessage(`Notice: ${errMsg}`);
        } else {
          setToastMessage('Generation updated.');
        }
        await loadData();
      } else {
        setToastMessage(res?.message || 'Failed to resume generation.');
      }
    } catch (err: any) {
      console.error('Failed to resume generation:', err);
      setToastMessage(err?.message || 'Failed to resume generation.');
    } finally {
      setIsResuming(false);
      setIsGenerating(false);
      setIsSynthesizingCharacters(false);
      setIsAdvancingPhase(false);
    }
  };

  // Discard draft
  const handleDiscardDraft = async () => {
    setIsGenerating(false);
    setGeneratingPrompt('');
    setGenerationFailed(false);
    if (activeStoryId && activeStoryId !== 'new-studio-project') {
      removeStoredTestThread(activeStoryId);
      await trashStory(activeStoryId).catch(() => {});
    }
    setActiveStoryId('new-studio-project');
    setActiveStoryDetail(null);
    setPrompt('');
    setReferenceAsset(null);
    setActivePhase(null);
    setToastMessage('Draft discarded. Initialized clean canvas.');
  };

  // Request alternate take
  const handleRequestAlternateTake = () => {
    if (activePhase === null) {
      setToastMessage('Select a pipeline phase before requesting an alternate take.');
      return;
    }

    setToastMessage(`Requesting alternate take for Phase ${activePhase}...`);
    setTimeout(() => {
      setToastMessage(`Alternate take generated for Phase ${activePhase}!`);
    }, 1200);
  };

  // Delete thread
  const handleDeleteThread = async (storyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveThreadMenu(null);
    removeStoredTestThread(storyId);
    await trashStory(storyId).catch(() => {});
    setStories((prev) => prev.filter((s) => s.story_id !== storyId));
    setToastMessage('Thread removed from studio workspace.');
  };

  // Reset new project
  const handleNewProject = () => {
    setIsGenerating(false);
    setGeneratingPrompt('');
    setGenerationFailed(false);
    setActiveStoryId('new-studio-project');
    setActiveStoryDetail(null);
    setPrompt('');
    setReferenceAsset(null);
    setActivePhase(null);
    setToastMessage('New Studio Project initialized.');
    promptTextareaRef.current?.focus();
  };

  // Reference file attachment
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceAsset(file.name);
      setToastMessage(`Attached visual reference: ${file.name}`);
    }
  };

  // Build threads from backend stories and locally persisted test runs (admin & whitelisted users).
  const combinedThreads = (() => {
    if (!isAdmin && !isWhitelistedEmail(currentUser?.email)) return [];
    const realNonTrashed = stories.filter((s) => !s.is_trashed);

    const mappedReal = realNonTrashed.map((s) => ({
      story_id: s.story_id,
      title: s.title || 'Untitled Studio Vision',
      logline: s.logline || s.prompt || 'Cinematic sequence with dynamic scene breakdown.',
      scene: s.scenes_count ? `Scene 1 (${s.scenes_count} scenes)` : 'Scene 1',
      timeAgo: formatTimeAgo(s.updated_at || s.created_at),
      prompt: s.prompt || '',
    }));

    return mappedReal;
  })();

  // Filter threads by search query
  const filteredThreads = combinedThreads.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.logline.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedThreads = showAllThreads ? filteredThreads : filteredThreads.slice(0, 3);

  // Active Story Title & Scene
  const activeThread = combinedThreads.find((t) => t.story_id === activeStoryId);
  const currentTitle = activeStoryDetail?.phases?.phase_1_script?.idea?.title || activeThread?.title || 'New Studio Project';
  const currentSceneName =
    activeStoryDetail?.phases?.phase_1_script?.scenes?.[0]?.setting ||
    'Act 1: Opening Scene';

  // Character profiles (from active story detail or synthesized)
  const characters = activeStoryDetail?.phases?.phase_2_characters?.characters || [];
  const phase1Plan = activeStoryDetail?.phases?.phase_1_script;

  return (
    <div className="h-screen w-screen bg-[#08090E] text-slate-200 font-sans antialiased overflow-hidden flex select-none">
      {/* Hidden Bible Reference File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Studio Navigation Sidebar */}
      <StudioSidebar
        activePage="create"
        hideBrandHeader
        isAdmin={isAdmin}
        user={currentUser}
        userInitials={userInitials}
        userName={userName}
        userTier={userTier}
        testToolsVisible={testToolsVisible}
        onTestToolsVisibilityChange={handleTestToolsVisibilityChange}
        onNewStoryProject={handleNewProject}
        onAssetsClick={() => {
          setActivePhase(2);
          setPipelineRailOpen(true);
        }}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      {/* BEGIN: Right Main Shell (Header + Workspace) */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-visible bg-gradient-to-b from-[#0B0C14] via-[#090A10] to-[#07080D]">
        {/* BEGIN: MainTopNavigation */}
        <header
          className={`relative ${
            sidebarCollapsed ? '-left-16 w-[calc(100%+4rem)]' : '-left-64 w-[calc(100%+16rem)]'
          } h-14 border-b border-white/[0.08] bg-obsidian-900/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 z-50 shrink-0 transition-[left,width] duration-200`}
        >
          {/* Left: Breadcrumbs & Project Switcher */}
          <div className="flex items-center space-x-3 text-xs min-w-max">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex items-center gap-2.5 cursor-pointer group mr-2"
              title="Return to Studio Home"
            >
              <span className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
                <img
                  src="/fablemotion-icon.png"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuD-dm5dHUNYqcaoUz9luEfkBqi9qWVgTnsj1yv2A7xxBHLmbTNnzNjeEc2Dzyvw3_tLZ0hNNW-bboaz5mlQPCy4P2AHw-mAAP9cIVv2Qtry27gv0duw2A3gp2yhbB653vZpOgQB7klNwLQUR5Zdl_eefjo_Vnus_h4AlHYPrethZ8kvxYtKQ1oChl_pqpDrTLkBympPTLbVAZDLJCnGqSqeVr95xCzx-GTQoLYNOh22-ad6T4K0a7jNFQcMBsetU9sHGAE';
                  }}
                  alt="FableMotion"
                  className="w-full h-full object-cover"
                />
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

            {/* Interactive Breadcrumbs */}
            <nav className="flex items-center space-x-2 text-xs relative" data-dropdown-container>
            <button
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition font-medium cursor-pointer"
            >
              <span>{currentTitle}</span>
              <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>

            {/* Project Switcher Dropdown */}
            {projectDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 p-2 rounded-xl bg-obsidian-850 border border-white/[0.1] shadow-2xl z-50 animate-in fade-in zoom-in-95">
                <div className="px-2.5 py-1 text-[10px] uppercase font-mono font-medium text-slate-400">
                  Switch Active Project
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1 my-1">
                  {combinedThreads.map((t) => (
                    <button
                      key={t.story_id}
                      onClick={() => handleSelectStory(t.story_id, t.title)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                        t.story_id === activeStoryId
                          ? 'bg-violet-600/20 text-violet-200 border border-violet-500/30 font-medium'
                          : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      <span className="truncate pr-2">{t.title}</span>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">{t.scene}</span>
                    </button>
                  ))}
                </div>
                <div className="pt-1 border-t border-white/[0.06]">
                  <button
                    onClick={() => {
                      setProjectDropdownOpen(false);
                      handleNewProject();
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs text-violet-400 hover:bg-violet-600/10 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>New Studio Project</span>
                  </button>
                </div>
              </div>
            )}

            <span className="text-slate-600 font-mono">/</span>
            <span className="text-slate-400 font-normal truncate max-w-[200px]">{currentSceneName}</span>
          </nav>
        </div>

        {/* Center: Global Omni-Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="w-full relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-violet-400 transition">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-obsidian-850/80 hover:bg-obsidian-850 focus:bg-obsidian-800 text-xs text-slate-200 placeholder-slate-500 pl-9 pr-14 py-1.5 rounded-lg border border-white/[0.08] focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all font-sans"
              placeholder="Search scenes, characters, or prompts..."
              type="text"
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
              <kbd className="text-[10px] font-mono text-slate-400 bg-white/[0.06] border border-white/[0.1] px-1.5 py-0.5 rounded shadow-sm">⌘K</kbd>
            </div>
          </div>
        </div>

        {/* Right: Studio Controls, Revision & Profile */}
        <div className="flex items-center space-x-2.5">
          {/* Test Pipeline Button */}
          {isAdmin && testToolsVisible && (<button onClick={() => setIsTestingDashboardOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.09] bg-white/[0.03] hover:bg-white/[0.07] text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer"
            title="Open Neural Testing Dashboard"
          >
            <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Test Pipeline</span>
          </button>)}


          {/* Export Button */}
          <button
            onClick={() => router.push(`/upload?storyId=${encodeURIComponent(activeStoryId || '')}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.09] bg-white/[0.03] hover:bg-white/[0.07] text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer"
            title="Deploy & Export Story"
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Export</span>
          </button>

          <div className="h-4 w-[1px] bg-white/[0.1] mx-0.5" />

          {/* Notification Indicator */}
          <button
            onClick={() => setToastMessage('All pipeline render engines operational. 0 queue delays.')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.05] transition relative cursor-pointer"
            title="Notifications"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-violet-400 ring-2 ring-obsidian-900" />
          </button>

          {/* Topbar Profile Container */}
          {/* Topbar Profile Menu */}
          <TopbarProfileMenu
            user={currentUser}
            isAdmin={isAdmin}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        </div>
      </header>
      {/* END: MainTopNavigation */}

      {/* BEGIN: WorkspaceShell */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">


        {/* BEGIN: CenterMainContent */}
        <main className="flex-1 min-w-0 overflow-hidden px-4 py-6 sm:px-6 lg:px-10 flex flex-col gap-8 w-full">
          <div className="space-y-6 max-w-[760px] w-full mx-auto flex-1 min-h-0 overflow-y-auto">
            {/* Engine Meta Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase font-medium">Story Studio</span>
                  <span className="text-slate-600 font-mono text-xs">·</span>
                  <span className="text-[11px] font-mono text-slate-500">v0.1</span>
                </div>
                <h1 className="text-2xl lg:text-3xl font-display font-semibold text-white tracking-tight">Craft Next Vision</h1>
                <p className="text-slate-400 text-xs lg:text-sm mt-1 max-w-xl font-normal leading-relaxed">
                  Context-aware cinematic scripting, frame timing, and atmospheric direction synchronized in real time.
                </p>
              </div>
            </div>

            {/* PIPELINE STAGE OUTPUTS (Rendered in Main Workspace when Pipeline is Active) */}
            {isPipelineActive && (
              <div className="space-y-6 animate-fade-in">
                <WorkspacePipelineFlow
                  activeStoryDetail={activeStoryDetail}
                  activeStoryId={activeStoryId}
                  activePhase={activePhase}
                  isGenerating={isGenerating}
                  generatingPrompt={generatingPrompt || prompt}
                  generationFailed={generationFailed}
                  onRetryGeneration={() => handleGenerateStory()}
                  onCancelGeneration={handleCancelProcess}
                  onResumeGeneration={handleResumeProcess}
                  isResuming={isResuming}
                  characters={characters}
                  isSynthesizingCharacters={isSynthesizingCharacters}
                  onSynthesizeCharacters={handleSynthesizeCharacters}
                  onRegenerateCharacters={handleRegenerateCharacters}
                  isRegeneratingCharacters={isSynthesizingCharacters}
                  onRegenerateKeyframes={handleRegenerateKeyframes}
                  isRegeneratingKeyframes={isRegeneratingKeyframes}
                  onRegenerateVideoClips={handleRegenerateVideoClips}
                  isRegeneratingVideoClips={isRegeneratingVideoClips}
                  isAdvancingPhase={isAdvancingPhase}
                  onApproveAndProceed={handleApproveAndProceed}
                  onSelectPhase={(phase) => setActivePhase(phase)}
                  onOpenVideoPreview={() => setVideoModalOpen(true)}
                  onDeploy={handleDeploy}
                  isDeploying={isDeploying}
                  setToastMessage={setToastMessage}
                  onSelectConcept={handleSelectConcept}
                  isSelectingConcept={isSelectingConcept}
                  onSwitchConcept={handleSwitchConcept}
                  onRegenerateConcepts={handleRegenerateConcepts}
                  isRegeneratingConcepts={isRegeneratingConcepts}
                  onRunPhase5Assembly={handleRunPhase5Assembly}
                  isAssemblingPhase5={isAssemblingPhase5}
                  onRunOneScenePipeline={handleRunOneScenePipeline}
                  isRunningOneScenePipeline={isRunningOneScenePipeline}
                />

              </div>
            )}

            {/* BEGIN: PromptInputConsole (Centered full console when pipeline is NOT active) */}
            {!isPipelineActive && (
              <section aria-label="Generative Script &amp; Scene Console" className="rounded-xl bg-obsidian-850/90 border border-white/[0.09] shadow-2xl p-4 transition duration-200 border-glow-focus relative">
                {/* Textarea for Prompting */}
                <div className="relative">
                  <textarea
                    ref={promptTextareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleGenerateStory();
                      }
                    }}
                    className="w-full bg-transparent border-0 resize-none text-slate-100 placeholder-slate-500 focus:ring-0 text-sm leading-relaxed p-1 font-sans focus:outline-none"
                    placeholder="Paste your script breakdown, character actions, or plot twists... (Press ⌘+Enter to generate)"
                    rows={4}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  {PROMPT_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setPrompt(suggestion);
                        handleGenerateStory(suggestion);
                      }}
                      className="px-2.5 py-0.5 rounded-full border text-[10px] transition-all duration-150 flex items-center gap-1 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-violet-500/30 text-slate-300 hover:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                      title={`Run "${suggestion}" in studio pipeline`}
                    >
                      <span className="text-violet-400 font-mono">✦</span>
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </div>

                {/* Reference asset tag if attached */}
                {referenceAsset && (
                  <div className="flex items-center gap-2 mb-2 px-2 py-1 rounded bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs w-fit">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.373L8.552 18.32a1.5 1.5 0 01-2.122-2.122l8.835-8.836" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="font-mono text-[11px] truncate max-w-xs">{referenceAsset}</span>
                    <button
                      onClick={() => setReferenceAsset(null)}
                      className="hover:text-white ml-1 text-slate-400 cursor-pointer"
                      title="Remove reference"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Console Bottom Controls Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-2 border-t border-white/[0.06]">
                  {/* Left Parameter Pills */}
                  <div className="flex items-center flex-wrap gap-2">
                    {/* Aspect Ratio Selector Dropdown */}
                    <div className="relative inline-flex" data-dropdown-container>
                      <button
                        onClick={() => setAspectRatioOpen(!aspectRatioOpen)}
                        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-obsidian-800 border border-white/[0.08] hover:border-violet-500/40 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          {aspectRatio === '9:16' ? (
                            <rect height="20" rx="2" width="14" x="5" y="2" />
                          ) : aspectRatio === '16:9' ? (
                            <rect height="14" rx="2" width="20" x="2" y="5" />
                          ) : (
                            <rect height="16" rx="2" width="16" x="4" y="4" />
                          )}
                        </svg>
                        <span className="font-mono">{aspectRatio === '9:16' ? '9:16 Vertical' : aspectRatio === '16:9' ? '16:9 Landscape' : '1:1 Square'}</span>
                        <svg className={`w-3 h-3 text-slate-500 transition-transform ${aspectRatioOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                      </button>

                      {aspectRatioOpen && (
                        <div className="absolute left-0 bottom-full mb-1.5 w-48 p-1 rounded-xl bg-obsidian-850 border border-white/[0.1] shadow-2xl z-50">
                          {ASPECT_RATIO_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => {
                                setAspectRatio(opt.id);
                                setAspectRatioOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition cursor-pointer ${
                                aspectRatio === opt.id
                                  ? 'bg-violet-600/20 text-violet-200 font-medium'
                                  : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                              }`}
                            >
                              <span>{opt.label}</span>
                              {aspectRatio === opt.id && <span className="text-violet-400 font-bold">✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Attach Reference Asset */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-obsidian-800 border border-white/[0.08] hover:border-white/[0.18] text-slate-400 hover:text-slate-200 text-xs transition cursor-pointer"
                      title="Attach visual bible image or tone guide"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.373L8.552 18.32a1.5 1.5 0 01-2.122-2.122l8.835-8.836" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Add Attachment</span>
                    </button>
                  </div>

                  {/* Right Primary Action */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleGenerateStory()}
                      disabled={isGenerating || (Boolean(currentUser) && !isWhitelistedEmail(currentUser?.email))}
                      className={`px-4 py-2 rounded-lg text-xs font-display font-semibold tracking-wide flex items-center gap-2 transition-all ${
                        Boolean(currentUser) && !isWhitelistedEmail(currentUser?.email)
                          ? 'bg-slate-800 text-slate-400 border border-white/[0.08] cursor-not-allowed opacity-75'
                          : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 hover:from-violet-500 hover:to-indigo-500 text-white cursor-pointer shadow-glow-md active:scale-[0.98]'
                      }`}
                      title={
                        currentUser
                          ? isWhitelistedEmail(currentUser.email)
                            ? 'Start autonomous AI story synthesis'
                            : 'Access Whitelist Required — Your account is not authorized to generate stories'
                          : 'Sign in to prompt and generate stories'
                      }
                    >
                      <svg className="w-4 h-4 text-violet-200" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>
                        {currentUser
                          ? isWhitelistedEmail(currentUser.email)
                            ? 'Generate Story'
                            : 'Whitelist Required'
                          : 'Sign in to Prompt'}
                      </span>
                    </button>
                  </div>
                </div>
              </section>
            )}
            {/* END: PromptInputConsole */}

            {/* BEGIN: RecentStudioThreads */}
            {(isAdmin || isWhitelistedEmail(currentUser?.email)) && (
              <section
                aria-label="Recent Studio Threads"
                className={`transition-all duration-500 ease-in-out ${
                  isPipelineActive
                    ? 'opacity-0 max-h-0 pointer-events-none overflow-hidden -translate-y-4 m-0 p-0'
                    : 'opacity-100 max-h-[2000px] translate-y-0 space-y-3.5 pt-2'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <h2 className="text-xs font-display font-semibold uppercase tracking-wider text-slate-300">Recent Studio Threads</h2>
                    <span className="text-[11px] font-mono text-slate-500">
                      {combinedThreads.length} {combinedThreads.length === 1 ? 'project' : 'projects'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs">
                    <button
                      onClick={() => setShowAllThreads(!showAllThreads)}
                      className="text-slate-400 hover:text-slate-200 flex items-center gap-1 transition text-xs cursor-pointer"
                    >
                      <span>{showAllThreads ? 'Show Less' : 'All Threads'}</span>
                      <svg className={`w-3 h-3 text-slate-500 transition-transform ${showAllThreads ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {combinedThreads.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center border border-dashed border-white/[0.08] rounded-xl">
                    No studio threads yet. Create a story track to get started.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {displayedThreads.map((thread) => (
                    <div
                      key={thread.story_id}
                      onClick={() => handleSelectStory(thread.story_id, thread.title)}
                      className={`rounded-xl bg-obsidian-850/90 border p-4 flex flex-col justify-between transition-all cursor-pointer ${
                        thread.story_id === activeStoryId
                          ? 'border-white/[0.16] shadow-glow-sm'
                          : 'border-white/[0.08] hover:border-white/[0.14]'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>{thread.timeAgo}</span>
                          <div className="flex items-center space-x-1 relative" data-dropdown-container>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveThreadMenu(activeThreadMenu === thread.story_id ? null : thread.story_id);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-slate-300 transition cursor-pointer"
                              title="Options"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>

                            {/* Thread Options Dropdown */}
                            {activeThreadMenu === thread.story_id && (
                              <div
                                ref={threadMenuRef}
                                className="absolute right-0 top-full mt-1 w-44 p-1 rounded-xl bg-obsidian-750 border border-white/[0.1] shadow-2xl z-50 text-left"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrompt(thread.prompt || thread.logline);
                                    setActiveThreadMenu(null);
                                    setToastMessage('Story prompt loaded into generator!');
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/[0.06] flex items-center gap-1.5 transition cursor-pointer"
                                >
                                  <span>Load Prompt</span>
                                </button>
                                <button
                                  onClick={(e) => handleDeleteThread(thread.story_id, e)}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-1.5 transition cursor-pointer"
                                >
                                  <span>Delete Project</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <h3 className="text-xs font-semibold text-slate-100 tracking-wide">{thread.title}</h3>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{thread.logline}</p>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-4 border-t border-white/[0.05] text-[11px]">
                        <span className="text-slate-500 font-mono">{thread.scene}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectStory(thread.story_id, thread.title);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-[11px] font-medium transition cursor-pointer"
                        >
                          <span>Open</span>
                          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </section>
            )}
            {/* END: RecentStudioThreads */}

            {/* Docked Floating Console (Active Pipeline) */}
            {isPipelineActive && (
              <div className="sticky bottom-0 z-30 pt-2 pb-2 bg-gradient-to-t from-obsidian-900 via-obsidian-900/95 to-transparent backdrop-blur-md">
                <div className="rounded-2xl bg-obsidian-850/95 backdrop-blur-xl border border-white/[0.12] shadow-2xl px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {activeStoryDetail?.status === 'cancelled' || activeStoryDetail?.status === 'paused' || activeStoryDetail?.paused ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 ring-4 ring-amber-500/20" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse shrink-0 ring-4 ring-violet-500/20" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                          activeStoryDetail?.status === 'cancelled' || activeStoryDetail?.status === 'paused' || activeStoryDetail?.paused
                            ? 'text-amber-300'
                            : 'text-violet-300'
                        }`}>
                          {activeStoryDetail?.status === 'cancelled' || activeStoryDetail?.status === 'paused' || activeStoryDetail?.paused
                            ? `Phase ${activePhase || 1} Paused`
                            : isGenerating
                            ? 'Active Synthesis'
                            : `Phase ${activePhase || 1} Pipeline`}
                        </span>
                        {(activeStoryDetail?.status === 'cancelled' || activeStoryDetail?.status === 'paused' || activeStoryDetail?.paused) && (
                          <span className="text-[9px] font-mono uppercase bg-amber-500/15 border border-amber-500/30 text-amber-300 px-1.5 py-0.2 rounded">
                            Progress Saved
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-200 truncate mt-0.5 font-medium">
                        {generatingPrompt || prompt || activeStoryDetail?.phases?.phase_1_script?.idea?.title || 'Story generation in progress...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {activeStoryDetail?.status === 'cancelled' || activeStoryDetail?.status === 'paused' || activeStoryDetail?.paused ? (
                      <>
                        <button
                          type="button"
                          onClick={handleResumeProcess}
                          disabled={isResuming}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-500 text-white font-display font-semibold text-xs tracking-wide flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                            <polygon points="5,3 19,12 5,21" />
                          </svg>
                          <span>Resume</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDiscardDraft}
                          className="px-2 py-1.5 rounded-lg bg-white/[0.05] hover:bg-rose-500/20 text-slate-400 hover:text-rose-200 border border-white/[0.08] hover:border-rose-500/30 text-xs font-mono transition cursor-pointer"
                          title="Discard draft completely"
                        >
                          Discard
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCancelProcess}
                        className="w-8 h-8 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-100 flex items-center justify-center transition cursor-pointer shadow-sm active:scale-95 group shrink-0"
                        title="Cancel process and preserve progress"
                      >
                        <svg className="w-3.5 h-3.5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="6" width="12" height="12" rx="1.5" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Studio Status Dock */}
          <div className="shrink-0 pt-6 border-t border-white/[0.05] mt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Pipeline Node Active
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-500 font-mono">Processing: 0.04s / frame</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              <span>Studio Workspace</span>
              <span>·</span>
              <span>Build 2026.1</span>
            </div>
          </div>
        </main>
        {/* END: CenterMainContent */}

        {/* BEGIN: ProductionPipelineRightRail */}
        <PipelineRightRail
          isOpen={pipelineRailOpen}
          onToggleOpen={() => setPipelineRailOpen((open) => !open)}
          activePhase={activePhase}
          onSelectPhase={(phase) => setActivePhase(phase)}
          activeStoryDetail={activeStoryDetail}
          activeStoryId={activeStoryId}
          characters={characters}
          isSynthesizingCharacters={isSynthesizingCharacters}
          onSynthesizeCharacters={handleSynthesizeCharacters}
          isAdvancingPhase={isAdvancingPhase}
          onApproveAndProceed={handleApproveAndProceed}
          onRequestAlternateTake={handleRequestAlternateTake}
          onDiscardDraft={handleDiscardDraft}
          setToastMessage={setToastMessage}
          isGenerating={isGenerating}
          generatingPrompt={generatingPrompt || prompt}
          generationFailed={generationFailed}
          onRetryGeneration={() => handleGenerateStory()}
          onOpenVideoPreview={() => setVideoModalOpen(true)}
          onDeploy={handleDeploy}
          isDeploying={isDeploying}
        />
        {/* END: ProductionPipelineRightRail */}
      </div>
      {/* END: WorkspaceShell */}
    </div>
    {/* END: Right Main Shell */}

      {/* Toast Notification Banner (Bottom Left) */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 px-4 py-2.5 rounded-xl bg-obsidian-850/95 border border-white/[0.15] shadow-2xl text-xs text-white flex items-center gap-2.5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 max-w-sm">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
          <span className="leading-snug">{toastMessage}</span>
        </div>
      )}

      {/* Neural Testing Dashboard Drawer / Modal */}
      {isAdmin && isTestingDashboardOpen && (
        <TestingDashboard
          isExpanded={isTestingDashboardOpen}
          onClose={() => setIsTestingDashboardOpen(false)}
          activeStoryId={activeStoryId}
          activePrompt={prompt}
          onRunOneScenePipeline={handleRunOneScenePipeline}
          isRunningOneScenePipeline={isRunningOneScenePipeline}
          onTestCompleted={async (phaseId, output, storyId) => {
            const sid = storyId || activeStoryId;
            if (sid && !sid.startsWith('demo_')) {
              setActiveStoryId(sid);
              const detail = await fetchStoryDetails(sid).catch(() => null);
              if (detail) {
                setActiveStoryDetail(detail);
                setIsGenerating(false);
              }
            }
            setToastMessage(`Phase verification completed: ${phaseId}`);
            await loadData();
          }}
        />
      )}


      {/* AI Access Restriction Modal for Outside/Unauthenticated Users */}
      {aiAccessModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setAiAccessModalOpen(false)}
        >
          <section
            className="relative w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#12101e]/95 p-6 sm:p-8 text-center shadow-2xl shadow-purple-950/60 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setAiAccessModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
              title="Close modal"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>

            {/* Tag / Category */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-[11px] font-mono font-medium text-violet-300 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Invite-Only AI Preview</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Sign in to Generate
            </h2>

            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-300">
              Autonomous AI story generation uses high-cost multi-model GPU compute pipelines (Google Gemini, FLUX visual synthesis, and Remotion rendering).
            </p>

            <div className="mt-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-left space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <span className="text-accent-violet">✦</span>
                <span>Why is generation restricted?</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                To prevent server overload and API quota exhaustion, live story synthesis is currently reserved for authorized studio creators and registered alpha testers.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setAiAccessModalOpen(false);
                  setAuthModalOpen(true);
                }}
                className="w-full rounded-lg bg-accent-violet hover:bg-accent-violet/90 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition shadow-lg shadow-violet-950/50 cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                <span>Sign in to access AI</span>
              </button>

              <button
                type="button"
                onClick={() => setAiAccessModalOpen(false)}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                Continue exploring studio workspace
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Lightbox, Video Preview & Auth Modals */}
      <LightboxModal
        isOpen={lightbox.isOpen}
        imageUrl={lightbox.url}
        caption={lightbox.caption}
        onClose={() => setLightbox({ isOpen: false, url: null, caption: '' })}
      />

      <VideoPreviewModal
        isOpen={videoModalOpen}
        videoUrl={previewVideoUrl}
        title={activeStoryDetail?.phases?.phase_1_script?.idea?.title || prompt}
        logline={activeStoryDetail?.phases?.phase_1_script?.idea?.logline}
        onClose={() => setVideoModalOpen(false)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />
    </div>
  );
}

export default function CreateWorkflowPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-[#08090E] flex items-center justify-center text-slate-400 text-sm font-mono">
          Loading FableMotion Studio OS...
        </div>
      }
    >
      <WorkflowPipelineContent />
    </Suspense>
  );
}

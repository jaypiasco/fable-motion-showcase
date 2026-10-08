'use client';

import React, { useState, useEffect } from 'react';
import { testTool } from '../../lib/api';

export interface PhaseTestItem {
  id: 'phase_1' | 'phase_2' | 'phase_3' | 'phase_4' | 'phase_5';
  phaseNumber: number;
  title: string;
  subtitle: string;
  model: string;
  objective: string;
}

export interface ProviderOption {
  id: string;
  name: string;
  badge: string;
  type: string;
}

export const IMAGE_TESTING_PROVIDERS: ProviderOption[] = [
  { id: 'imagen', name: 'Google Imagen 3', badge: 'Active / Primary', type: 'Nano Banana Pro / Imagen 3' },
  { id: 'pollinations', name: 'Pollinations FLUX', badge: 'Manual Testing', type: 'FLUX.1 Turbo (Zero API Key)' },
];

export const VIDEO_TESTING_PROVIDERS: ProviderOption[] = [
  { id: 'veo', name: 'Google Veo 3.1 Fast', badge: 'Cloud Veo (Prod)', type: 'Google Veo 3.1 Fast Diffusion' },
  { id: 'ltx', name: 'Fal LTX-Video', badge: 'Open Model (Dev)', type: 'Lightricks LTX-Video 0.9.1' },
];

const PHASES_CONFIG: PhaseTestItem[] = [
  {
    id: 'phase_1',
    phaseNumber: 1,
    title: 'Script & Scene Beats',
    subtitle: 'Gemini 2.5 Flash / Flash-Lite LLM API',
    model: 'Google Gemini 2.5 Flash',
    objective: 'Generates structured JSON narrative, logline, 3s hook, and scene beats with dialogue & audio cues.',
  },
  {
    id: 'phase_2',
    phaseNumber: 2,
    title: 'Character Bibles & Assets',
    subtitle: 'Gemini Character Synth + Reference Portraits',
    model: 'Gemini 2.5 Flash + Imagen 3',
    objective: 'Extracts multi-character profiles with visual anchors, vocal directions, and renders 9:16 reference portraits.',
  },
  {
    id: 'phase_3',
    phaseNumber: 3,
    title: 'Scene Keyframe Generation',
    subtitle: 'Diffusion Keyframes referencing Phase 2',
    model: 'Google Imagen 3 / Gemini 2.5 Flash Image',
    objective: 'Synthesizes photorealistic 9:16 keyframes, conditioning explicitly on Phase 2 character portraits.',
  },
  {
    id: 'phase_4',
    phaseNumber: 4,
    title: 'Motion Dynamics & Video Clips',
    subtitle: 'Veo 3.1 Fast Single-Pass Video Clips',
    model: 'Google Veo 3.1 Fast / LTX-Video',
    objective: 'Formulates motion dynamics prompts with camera/action choreography, and renders 9:16 video clips with native audio.',
  },
  {
    id: 'phase_5',
    phaseNumber: 5,
    title: 'Caption & Final Clip Merge',
    subtitle: 'Faster-Whisper Dynamic Captions & FFmpeg Merge',
    model: 'Faster-Whisper + FFmpeg',
    objective: 'Transcribes native clip audio to generate dynamic .ass captions, burns subtitles, and concatenates scenes into master video.',
  },
];

export interface TestingDashboardProps {
  isExpanded: boolean;
  onClose: () => void;
  activeStoryId?: string | null;
  activePrompt?: string;
  onTestCompleted?: (phaseId: string, output: any, storyId?: string) => void;
  onRunOneScenePipeline?: () => void;
  isRunningOneScenePipeline?: boolean;
}

export function TestingDashboard({
  isExpanded,
  onClose,
  activeStoryId,
  activePrompt,
  onTestCompleted,
  onRunOneScenePipeline,
  isRunningOneScenePipeline = false,
}: TestingDashboardProps) {
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    phase_1: true,
    phase_2: false,
    phase_3: false,
    phase_4: false,
    phase_5: false,
  });

  const [testingPhaseId, setTestingPhaseId] = useState<string | null>(null);
  const [isTestingAll, setIsTestingAll] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Active testing providers for Image & Video
  const [activeImageProvider, setActiveImageProvider] = useState<string>('imagen');
  const [activeVideoProvider, setActiveVideoProvider] = useState<string>('veo');
  const [activeVoiceProvider, setActiveVoiceProvider] = useState<string>('edge_tts');
  const [isMinimized, setIsMinimized] = useState<boolean>(true);

  // Default to minimized test dock whenever opened
  useEffect(() => {
    if (isExpanded) {
      setIsMinimized(true);
    }
  }, [isExpanded]);

  // Outputs and Errors (Empty by default - no mock data)
  const [phaseOutputs, setPhaseOutputs] = useState<Record<string, any>>({});
  const [phaseErrors, setPhaseErrors] = useState<Record<string, string | null>>({});

  if (!isExpanded) return null;

  const togglePhaseExpand = (phaseId: string) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }));
  };

  const areAllExpanded = Object.values(expandedPhases).every(Boolean);

  const handleToggleAllPhases = () => {
    const nextState = !areAllExpanded;
    setExpandedPhases({
      phase_1: nextState,
      phase_2: nextState,
      phase_3: nextState,
      phase_4: nextState,
      phase_5: nextState,
    });
  };

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 1500);
  };

  const handleSelectImageProvider = (providerId: string) => {
    setActiveImageProvider(providerId);
  };

  const handleSelectVideoProvider = (providerId: string) => {
    setActiveVideoProvider(providerId);
  };

  const handleSelectVoiceProvider = (providerId: string) => {
    setActiveVoiceProvider(providerId);
  };

  // Run test on an individual phase
  const handleRunPhaseTest = async (phaseId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTestingPhaseId(phaseId);
    setExpandedPhases((prev) => ({ ...prev, [phaseId]: true }));

    // Clear previous output and error for this phase
    setPhaseOutputs((prev) => ({ ...prev, [phaseId]: null }));
    setPhaseErrors((prev) => ({ ...prev, [phaseId]: null }));

    try {
      const provider =
        phaseId === 'phase_3'
          ? activeImageProvider
          : phaseId === 'phase_4'
          ? activeVideoProvider
          : undefined;

      const payload: any = { provider };
      if (activeStoryId && !activeStoryId.startsWith('demo_')) {
        payload.story_id = activeStoryId;
      }
      if (phaseId === 'phase_1') {
        if (activePrompt) payload.prompt = activePrompt;
        // Force 1 scene test mode per PIPELINE_SPEC v2.2
        payload.max_scenes = 1;
      }

      const res = await testTool(phaseId, payload);
      if (res.success && res.output) {
        setPhaseOutputs((prev) => ({ ...prev, [phaseId]: res.output }));
        setPhaseErrors((prev) => ({ ...prev, [phaseId]: null }));
        if (onTestCompleted) {
          const sid = res.story_id || res.output?.story_id || activeStoryId;
          onTestCompleted(phaseId, res.output, sid || undefined);
        }
      } else {
        const errorMsg = res.error || res.message || `Test failed for ${phaseId}.`;
        setPhaseErrors((prev) => ({ ...prev, [phaseId]: errorMsg }));
      }
    } catch (err: any) {
      setPhaseErrors((prev) => ({
        ...prev,
        [phaseId]: err?.message || `Failed to execute live test for ${phaseId}.`,
      }));
    } finally {
      setTestingPhaseId(null);
    }
  };

  // Run test across all phases sequentially (strictly 1 scene end-to-end)
  const handleRunAllPhases = async () => {
    if (isTestingAll) return;
    setIsTestingAll(true);

    let currentStoryId = (activeStoryId && !activeStoryId.startsWith('demo_')) ? activeStoryId : null;

    for (const p of PHASES_CONFIG) {
      setTestingPhaseId(p.id);
      setExpandedPhases((prev) => ({ ...prev, [p.id]: true }));
      setPhaseOutputs((prev) => ({ ...prev, [p.id]: null }));
      setPhaseErrors((prev) => ({ ...prev, [p.id]: null }));

      try {
        const provider =
          p.id === 'phase_3'
            ? activeImageProvider
            : p.id === 'phase_4'
            ? activeVideoProvider
            : undefined;

        const payload: any = { provider };
        if (currentStoryId) {
          payload.story_id = currentStoryId;
        }
        if (p.id === 'phase_1') {
          if (activePrompt) payload.prompt = activePrompt;
          // Force 1 scene pipeline test per PIPELINE_SPEC v2.2
          payload.max_scenes = 1;
        }

        const res = await testTool(p.id, payload);
        if (res.success && res.output) {
          const sid = res.story_id || res.output?.story_id;
          if (sid) {
            currentStoryId = sid;
          }
          setPhaseOutputs((prev) => ({ ...prev, [p.id]: res.output }));
          setPhaseErrors((prev) => ({ ...prev, [p.id]: null }));
          if (onTestCompleted) {
            onTestCompleted(p.id, res.output, currentStoryId || undefined);
          }
        } else {
          setPhaseErrors((prev) => ({
            ...prev,
            [p.id]: res.error || res.message || `Phase ${p.phaseNumber} failed.`,
          }));
        }
      } catch (err: any) {
        setPhaseErrors((prev) => ({
          ...prev,
          [p.id]: err?.message || `Phase ${p.phaseNumber} failed.`,
        }));
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    setTestingPhaseId(null);
    setIsTestingAll(false);
  };

  // Compact floating dock pill when minimized so it never covers content
  if (isMinimized) {
    return (
      <aside aria-label="Pipeline Test Dock" className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-[#100d18]/95 backdrop-blur-2xl border border-purple-500/30 text-slate-200 shadow-2xl shadow-purple-950/40 animate-in slide-in-from-bottom-3 duration-200">
        <div className="flex items-center gap-2 pl-1">
          <span className={`w-2 h-2 rounded-full ${isRunningOneScenePipeline || isTestingAll ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
          <span className="text-xs font-mono font-semibold text-purple-200">1-Scene Test Dock</span>
        </div>
        <div className="h-4 w-px bg-white/[0.12] mx-0.5" />
        <button
          type="button"
          onClick={onRunOneScenePipeline ? onRunOneScenePipeline : handleRunAllPhases}
          disabled={isRunningOneScenePipeline || isTestingAll}
          className="px-2.5 py-1 rounded-full bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          title="Run 1-Scene active story session in Studio Workspace for 1 scene only"
        >
          <span className="material-symbols-outlined text-[14px] text-purple-300">
            {isRunningOneScenePipeline || isTestingAll ? 'sync' : 'bolt'}
          </span>
          <span>{isRunningOneScenePipeline || isTestingAll ? 'Running...' : 'Run 1-Scene'}</span>
        </button>
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="size-7 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer border border-white/[0.06]"
          title="Expand Dashboard"
        >
          <span className="material-symbols-outlined text-[15px]">open_in_full</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="size-7 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer border border-white/[0.06]"
          title="Close"
        >
          <span className="material-symbols-outlined text-[15px]">close</span>
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="Pipeline Test Inspector" className="fixed bottom-5 right-5 z-50 w-[540px] max-w-[calc(100vw-32px)] max-h-[82vh] flex flex-col bg-[#100d18]/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl text-slate-200 shadow-2xl shadow-purple-950/50 overflow-hidden animate-in zoom-in-95 duration-200">
      {/* High-Legibility Executive Header */}
      <div className="px-5 py-3.5 flex items-center justify-between border-b border-white/[0.07] bg-[#141120] shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300">
            <span className="material-symbols-outlined text-[17px] text-purple-400">tune</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-semibold tracking-tight text-white">
                Test Pipeline
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] text-slate-300 border border-white/[0.07]">
                Phases 01 – 05
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Rapid output review for script, characters, images, and video synthesis
            </p>
          </div>
        </div>

        {/* View Controls & Actions */}
        <div className="flex items-center gap-2">
          {/* Test Scene / Prompt Mode Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs">
            <span className="material-symbols-outlined text-[14px] text-purple-400">bolt</span>
            <span className="text-[11px] font-mono text-purple-200">1 Scene / 1 Prompt Test</span>
          </div>

          {/* Toggle All Expand/Collapse */}
          <button
            type="button"
            onClick={handleToggleAllPhases}
            className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.07] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title={areAllExpanded ? 'Collapse all phase details' : 'Expand all phase details'}
          >
            <span className="material-symbols-outlined text-[15px]">
              {areAllExpanded ? 'unfold_less' : 'unfold_more'}
            </span>
            <span className="hidden sm:inline">{areAllExpanded ? 'Collapse All' : 'Expand All'}</span>
          </button>

          {/* Run All Tests */}
          <button
            type="button"
            onClick={onRunOneScenePipeline ? onRunOneScenePipeline : handleRunAllPhases}
            disabled={isRunningOneScenePipeline || isTestingAll}
            className="h-8 px-3 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Execute 1-Scene pipeline session sequentially in Studio Workspace"
          >
            <span className="material-symbols-outlined text-[15px] text-purple-300">
              {isRunningOneScenePipeline || isTestingAll ? 'sync' : 'play_circle'}
            </span>
            <span>{isRunningOneScenePipeline || isTestingAll ? 'Running 1-Scene...' : 'Run 1-Scene'}</span>
          </button>

          {/* Minimize Dashboard */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="size-8 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/[0.05]"
            title="Minimize to floating pill"
          >
            <span className="material-symbols-outlined text-[17px]">close_fullscreen</span>
          </button>

          {/* Close Studio */}
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/[0.05]"
            title="Close Testing Panel"
          >
            <span className="material-symbols-outlined text-[17px]">close</span>
          </button>
        </div>
      </div>

      {/* Primary Vertical List of Phases (Scrollable body) */}
      <div className="p-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3">
        {PHASES_CONFIG.map((phase) => {
          const isOpen = expandedPhases[phase.id] || false;
          const isTestingThis = testingPhaseId === phase.id;
          const output = phaseOutputs[phase.id];
          const error = phaseErrors[phase.id];

          return (
            <div
              key={phase.id}
              className={`rounded-xl border transition-all ${
                isOpen
                  ? 'bg-[#151221] border-white/[0.12] shadow-md'
                  : 'bg-[#13101d] hover:bg-[#161324] border-white/[0.06]'
              }`}
            >
              {/* Phase Header Row */}
              <div
                onClick={() => togglePhaseExpand(phase.id)}
                className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Number Badge */}
                  <div className="size-7 rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-200 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    0{phase.phaseNumber}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-semibold text-white tracking-wide">
                        {phase.title}
                      </h3>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/[0.06]">
                        {phase.model}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate font-normal">
                      {phase.objective}
                    </p>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Test Button */}
                  <button
                    onClick={(e) => handleRunPhaseTest(phase.id, e)}
                    disabled={isTestingThis}
                    className="h-7 px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 hover:text-white border border-white/[0.08] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[14px] text-purple-300">
                      {isTestingThis ? 'sync' : 'play_arrow'}
                    </span>
                    <span>{isTestingThis ? 'Testing...' : 'Test'}</span>
                  </button>

                  <span className="material-symbols-outlined text-slate-400 text-[18px]">
                    {isOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </div>
              </div>

              {/* Vertical Expanded Output Review Section */}
              {isOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-white/[0.06] space-y-3 bg-[#0d0a15]/90">
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-400 font-mono">
                      Phase Output Verification
                    </span>
                  </div>

                  {/* LOADING STATE */}
                  {isTestingThis && (
                    <div className="p-4 rounded-xl bg-purple-500/[0.04] border border-purple-500/20 flex items-center gap-3 text-xs text-purple-200 animate-pulse">
                      <span className="material-symbols-outlined text-[20px] text-purple-400 animate-spin">
                        sync
                      </span>
                      <div>
                        <div className="font-semibold text-white">Running live test for {phase.title}...</div>
                        <div className="text-[11px] text-purple-300/70">Connecting to: {phase.model}</div>
                      </div>
                    </div>
                  )}

                  {/* ERROR STATE */}
                  {error && (
                    <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-red-400 font-semibold">
                          <span className="material-symbols-outlined text-[18px]">error</span>
                          <span>Test Failed</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleRunPhaseTest(phase.id, e)}
                          className="px-2.5 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[13px]">refresh</span>
                          <span>Retry</span>
                        </button>
                      </div>
                      <p className="text-red-200/90 font-mono text-[11px] leading-relaxed break-words bg-black/40 p-2.5 rounded-lg border border-red-500/20">
                        {error}
                      </p>
                    </div>
                  )}

                  {/* EMPTY STATE */}
                  {!output && !error && !isTestingThis && (
                    <div className="p-6 rounded-xl bg-[#141120]/40 border border-dashed border-white/[0.08] text-center space-y-2">
                      <span className="material-symbols-outlined text-[26px] text-slate-500 block">
                        play_circle
                      </span>
                      <p className="text-xs text-slate-400">
                        No test output generated yet for <span className="text-slate-200 font-medium">{phase.title}</span>.
                      </p>
                      <button
                        type="button"
                        onClick={(e) => handleRunPhaseTest(phase.id, e)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 hover:text-white border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px] text-purple-400">play_arrow</span>
                        <span>Run Live Test</span>
                      </button>
                    </div>
                  )}

                  {/* PHASE 1 VERTICAL REVIEW */}
                  {phase.id === 'phase_1' && output?.idea && (
                    <div className="space-y-3">
                      {/* Concept Card */}
                      <div className="p-3.5 rounded-lg bg-[#141120] border border-white/[0.07] space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white text-sm">{output.idea.title}</span>
                          <span className="text-xs font-mono text-slate-400">
                            {output.idea.genre} • {output.idea.aspect_ratio}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-slate-300 leading-relaxed">
                            <span className="text-slate-400 font-medium">Logline: </span>
                            {output.idea.logline}
                          </p>
                          <p className="text-slate-200 leading-relaxed">
                            <span className="text-slate-400 font-medium">3-Second Hook: </span>
                            &quot;{output.idea.hook_3s}&quot;
                          </p>
                        </div>
                      </div>

                      {/* Scenes Stack */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                          <span>Scene Breakdown ({output.scenes?.length || 2} Beats)</span>
                          <button
                            onClick={() =>
                              handleCopyText(
                                'phase_1_script',
                                JSON.stringify(output.scenes, null, 2)
                              )
                            }
                            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {copiedKey === 'phase_1_script' ? 'check' : 'content_copy'}
                            </span>
                            <span>{copiedKey === 'phase_1_script' ? 'Copied' : 'Copy Script JSON'}</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {output.scenes?.map((sc: any) => (
                            <div
                              key={sc.scene_id}
                              className="p-3.5 rounded-lg bg-[#141120] border border-white/[0.07] space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-white">
                                  Scene {sc.scene_id}: {sc.shot_type}
                                </span>
                                <span className="text-xs font-mono text-slate-400">
                                  {sc.duration_seconds}s duration
                                </span>
                              </div>
                              <p className="text-slate-300 leading-relaxed">
                                <span className="text-slate-400 font-medium">Visual: </span>
                                {sc.visual_description}
                              </p>
                              <div className="pl-3.5 py-1 border-l-2 border-purple-400/50 bg-white/[0.02] text-slate-100 italic rounded-r-md">
                                &quot;{sc.dialogue}&quot;
                              </div>
                              {sc.sfx_cue && (
                                <p className="text-[11px] text-slate-400 font-mono">
                                  SFX: {sc.sfx_cue}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PHASE 2 VERTICAL REVIEW */}
                  {phase.id === 'phase_2' && output?.characters && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                        <span>Extracted Characters ({output.characters.length})</span>
                      </div>

                      <div className="space-y-2.5">
                        {output.characters.map((c: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg bg-[#141120] border border-white/[0.07] space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white text-sm">{c.name}</span>
                              <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/[0.05] text-slate-300">
                                {c.archetype}
                              </span>
                            </div>

                            <div className="text-xs text-slate-300 space-y-1">
                              <p>
                                <span className="text-slate-400 font-medium">Visual Anchor: </span>
                                {c.visual_anchor}
                              </p>
                              <p>
                                <span className="text-slate-400 font-medium">Vocal Tone: </span>
                                {c.vocal_tone}
                              </p>
                            </div>

                            <div className="p-2.5 rounded-lg bg-[#0b0816] border border-white/[0.06] font-mono text-xs text-slate-300 space-y-1.5 mt-2">
                              <div className="flex items-center justify-between text-slate-400">
                                <span className="font-semibold text-slate-300">Engineered Image Prompt:</span>
                                <button
                                  onClick={() => handleCopyText(`char_prompt_${idx}`, c.image_prompt)}
                                  className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                                >
                                  <span className="material-symbols-outlined text-[13px]">
                                    {copiedKey === `char_prompt_${idx}` ? 'check' : 'content_copy'}
                                  </span>
                                  <span>{copiedKey === `char_prompt_${idx}` ? 'Copied' : 'Copy'}</span>
                                </button>
                              </div>
                              <p className="text-slate-300 leading-relaxed font-sans">{c.image_prompt}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PHASE 3 VERTICAL REVIEW (With Provider Selector) */}
                  {phase.id === 'phase_3' && (
                    <div className="space-y-3">
                      {/* Image Model Switcher Pills */}
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs border-b border-white/[0.05] pb-2.5">
                        <div className="text-slate-400 text-xs">
                          <span>Testing Tool: </span>
                          <span className="text-slate-200 font-medium">
                            {IMAGE_TESTING_PROVIDERS.find((p) => p.id === activeImageProvider)?.name || activeImageProvider}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {IMAGE_TESTING_PROVIDERS.map((p) => {
                            const isSelected = activeImageProvider === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectImageProvider(p.id)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-purple-500/20 text-purple-200 border-purple-500/40'
                                    : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border-white/[0.06]'
                                }`}
                              >
                                <span>{p.name}</span>
                                <span className="text-[10px] opacity-70">({p.badge})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {output && (
                        <div className="p-3.5 rounded-lg bg-[#141120] border border-white/[0.07] flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs">
                          <div className="size-32 rounded-lg overflow-hidden shrink-0 border border-white/[0.1] bg-black">
                            <img
                              src={
                                output.image_url
                                  ? (output.image_url.startsWith('http') || output.image_url.startsWith('/') || output.image_url.startsWith('data:'))
                                    ? output.image_url
                                    : `/${output.image_url}`
                                  : undefined
                              }
                              alt={output.character_name || 'Keyframe'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white text-sm">{output.character_name}</span>
                              <span className="text-xs font-mono text-slate-400">{output.resolution}</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#0b0816] border border-white/[0.06] text-xs space-y-1 font-mono">
                              <div className="flex items-center justify-between text-slate-400">
                                <span className="font-semibold text-slate-300">Prompt Sent to Engine:</span>
                                <button
                                  onClick={() => handleCopyText('phase_3_prompt', output.prompt_sent)}
                                  className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                                >
                                  <span className="material-symbols-outlined text-[13px]">
                                    {copiedKey === 'phase_3_prompt' ? 'check' : 'content_copy'}
                                  </span>
                                  <span>{copiedKey === 'phase_3_prompt' ? 'Copied' : 'Copy'}</span>
                                </button>
                              </div>
                              <p className="text-slate-300 font-sans leading-relaxed">{output.prompt_sent}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PHASE 4 VERTICAL REVIEW (With Video Provider Selector & 9:16 Clip Player) */}
                  {phase.id === 'phase_4' && (
                    <div className="space-y-3">
                      {/* Video Model Switcher Pills */}
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs border-b border-white/[0.05] pb-2.5">
                        <div className="text-slate-400 text-xs">
                          <span>Testing Tool: </span>
                          <span className="text-slate-200 font-medium">
                            {VIDEO_TESTING_PROVIDERS.find((p) => p.id === activeVideoProvider)?.name || activeVideoProvider}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {VIDEO_TESTING_PROVIDERS.map((p) => {
                            const isSelected = activeVideoProvider === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectVideoProvider(p.id)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-purple-500/20 text-purple-200 border-purple-500/40'
                                    : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border-white/[0.06]'
                                }`}
                              >
                                <span>{p.name}</span>
                                <span className="text-[10px] opacity-70">({p.badge})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {output && (
                        <div className="p-3.5 rounded-lg bg-[#141120] border border-white/[0.07] flex flex-col sm:flex-row items-start gap-4 text-xs">
                          {output.video_url && (
                            <div className="w-36 h-60 rounded-lg overflow-hidden shrink-0 border border-white/[0.1] bg-black flex items-center justify-center">
                              <video
                                src={output.video_url}
                                controls
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="font-semibold text-white text-sm">
                                {output.model_tested || 'Veo 3.1 Fast Video Clip'}
                              </span>
                              <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                {output.resolution || '9:16 Vertical'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div className="p-2.5 rounded-lg bg-[#0b0816] border border-white/[0.06] space-y-1">
                                <span className="text-slate-400 font-mono text-[11px] font-semibold block">
                                  Camera Dynamics:
                                </span>
                                <p className="text-slate-200">{output.camera_dynamics}</p>
                              </div>
                              <div className="p-2.5 rounded-lg bg-[#0b0816] border border-white/[0.06] space-y-1">
                                <span className="text-slate-400 font-mono text-[11px] font-semibold block">
                                  Action Dynamics:
                                </span>
                                <p className="text-slate-200">{output.action_description}</p>
                              </div>
                            </div>

                            <div className="p-2.5 rounded-lg bg-[#0b0816] border border-white/[0.06] font-mono text-xs space-y-1.5">
                              <div className="flex items-center justify-between text-slate-400">
                                <span className="font-semibold text-slate-300">
                                  Animation Prompt ({output.duration_seconds || 5}s):
                                </span>
                                <button
                                  onClick={() => handleCopyText('phase_4_prompt', output.animation_prompt)}
                                  className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                                >
                                  <span className="material-symbols-outlined text-[13px]">
                                    {copiedKey === 'phase_4_prompt' ? 'check' : 'content_copy'}
                                  </span>
                                  <span>{copiedKey === 'phase_4_prompt' ? 'Copied' : 'Copy'}</span>
                                </button>
                              </div>
                              <p className="text-slate-200 font-sans leading-relaxed">{output.animation_prompt}</p>
                            </div>

                            <div className="flex items-center gap-3 text-xs font-mono text-slate-400 pt-0.5">
                              <span>Duration: {output.duration_seconds || 5}s</span>
                              <span>•</span>
                              <span>Format: {output.format || 'MP4 (9:16)'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PHASE 5 VERTICAL REVIEW (Dynamic Captions & Final Master Story Merge) */}
                  {phase.id === 'phase_5' && output && (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-lg bg-[#141120] border border-white/[0.07] flex flex-col sm:flex-row items-start gap-4 text-xs">
                        {(output.final_video_url || output.video_url) && (
                          <div className="w-36 h-60 rounded-lg overflow-hidden shrink-0 border border-white/[0.1] bg-black flex items-center justify-center">
                            <video
                              src={output.final_video_url || output.video_url}
                              controls
                              autoPlay
                              muted
                              loop
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-semibold text-white text-sm">
                              {output.model_tested || 'Caption & Final Merge'}
                            </span>
                            <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                              {output.subtitle_format || 'ASS Karaoke Captions'}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-[#0b0816] border border-white/[0.06] space-y-1 font-mono text-xs">
                            <div className="flex items-center justify-between text-slate-400">
                              <span className="font-semibold text-slate-300">Dynamic Captions Preview:</span>
                              {output.ass_preview && (
                                <button
                                  onClick={() => handleCopyText('phase_5_ass', output.ass_preview)}
                                  className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                                >
                                  <span className="material-symbols-outlined text-[13px]">
                                    {copiedKey === 'phase_5_ass' ? 'check' : 'content_copy'}
                                  </span>
                                  <span>{copiedKey === 'phase_5_ass' ? 'Copied' : 'Copy'}</span>
                                </button>
                              )}
                            </div>
                            <p className="text-cyan-200/90 leading-relaxed break-words font-sans">
                              {output.ass_preview || 'Word-level synchronized ASS subtitles burned into master video.'}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-mono text-slate-400 pt-0.5">
                            <span>Scenes Merged: {output.master_scenes_merged || 1}</span>
                            <span>•</span>
                            <span>Duration: {output.duration_seconds || 5}s</span>
                            <span>•</span>
                            <span>Format: {output.format || 'MP4 (H.264 / AAC)'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

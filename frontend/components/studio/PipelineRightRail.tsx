"use client";

import React from "react";
import { StoryDetail, CharacterData } from "../../lib/types";
import { AnimatedShinyText } from "../ui/animated-shiny-text";
import { BouncingDots } from "../ui/bouncing-dots";

export interface PipelineRightRailProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activePhase: number | null;
  onSelectPhase: (phase: number | null) => void;
  activeStoryDetail: StoryDetail | null;
  activeStoryId?: string | null;
  characters: CharacterData[];
  isSynthesizingCharacters: boolean;
  onSynthesizeCharacters: () => void;
  isAdvancingPhase: boolean;
  onApproveAndProceed: () => void;
  onRequestAlternateTake: () => void;
  onDiscardDraft: () => void;
  setToastMessage: (msg: string | null) => void;
  isGenerating?: boolean;
  generatingPrompt?: string;
  generationFailed?: boolean;
  onRetryGeneration?: () => void;
  onOpenVideoPreview?: () => void;
  onDeploy?: () => void;
  isDeploying?: boolean;
}

const PIPELINE_PHASES = [
  {
    phase: 1,
    tag: "Script",
    title: "Phase 1: Script & Scene Beats",
    subtitle: "Treatment, hook & dialogue (10-14 Scenes)",
    description:
      "Generates vertical 9:16 treatment, 3-second viral hook, 10-14 scene pacing structure, character voiceover, dialogue, and sound cues.",
    tools: "Gemini 2.5 Flash · Nano Script Engine",
  },
  {
    phase: 2,
    tag: "Cast",
    title: "Phase 2: Character Bibles & assets",
    subtitle: "Global cast anchors stored in assets",
    description:
      "Synthesizes character visual styling, shaders, acoustic audio profile, and renders 9:16 reference portraits stored in assets for all clips.",
    tools: "Google Imagen 3 · Character Assets",
  },
  {
    phase: 3,
    tag: "Frames",
    title: "Phase 3: Scene Keyframe Generation",
    subtitle: "Keyframes from assets reference",
    description:
      "Generates scene keyframe stills using scene scripts and character portraits from assets for video generation.",
    tools: "Nano Banana Pro · 9:16 Keyframes",
  },
  {
    phase: 4,
    tag: "Motion",
    title: "Phase 4: Motion Dynamics & Video Clips",
    subtitle: "Applies dialogue scripts & renders video clips",
    description:
      "Applies character dialogue scripts and renders single-pass cinematic video clips.",
    tools: "AI Video Generator · Single-Pass Video/Audio",
  },
  {
    phase: 5,
    tag: "Caption",
    title: "Phase 5: Caption & Final Clip Merge",
    subtitle: "Dynamic captions & final clip merge",
    description:
      "Applies dynamic word-level captions per clip; on the final clip, merges all scene clips into the complete story master.",
    tools: "Faster-Whisper · FFmpeg Concatenation",
  },
];

export function PipelineRightRail({
  isOpen,
  onToggleOpen,
  activePhase,
  onSelectPhase,
  activeStoryDetail,
  activeStoryId,
  characters,
  isSynthesizingCharacters,
  onSynthesizeCharacters,
  isAdvancingPhase,
  onApproveAndProceed,
  onRequestAlternateTake,
  onDiscardDraft,
  isGenerating = false,
  generatingPrompt = "",
  generationFailed = false,
  onRetryGeneration,
  onOpenVideoPreview,
  onDeploy,
  isDeploying = false,
}: PipelineRightRailProps) {

  const phase1Done = activeStoryDetail?.phases?.phase_1_script?.status === "completed";
  const phase2Chars = (activeStoryDetail?.phases?.phase_2_characters as any)?.characters || characters;
  const phase2Done =
    activeStoryDetail?.phases?.phase_2_characters?.status === "completed" ||
    (phase2Chars.length > 0 && phase2Chars.every((c: any) => Boolean(c.image_url)));
  const phase3Done = activeStoryDetail?.phases?.phase_3_images?.status === "completed";
  const phase4Done = activeStoryDetail?.phases?.phase_4_animation_prompts?.status === "completed";
  const phase5Done =
    activeStoryDetail?.phases?.phase_5_video_generation?.status === "completed" ||
    Boolean(activeStoryDetail?.phases?.phase_5_video_generation?.assembly?.final_video_url) ||
    Boolean(activeStoryDetail?.has_final_video);

  const isAllPipelineFinished = Boolean(
    phase5Done ||
    (phase1Done && phase2Done && phase3Done && phase4Done && phase5Done)
  );

  const isPhaseApproved = (phase: number) => {
    if (isAllPipelineFinished || activeStoryDetail?.current_phase === "completed") return true;
    const phaseOrder = [
      "phase_1_script",
      "phase_2_characters",
      "phase_3_images",
      "phase_4_animation_prompts",
      "phase_5_video_generation",
    ];
    const curPhase = activeStoryDetail?.current_phase || "phase_1_script";
    const curIdx = phaseOrder.indexOf(curPhase);
    if (curIdx === -1) return false;
    // A phase is approved once current_phase has advanced beyond it
    return curIdx >= phase;
  };

  const isPhaseDone = (phase: number) => {
    return isPhaseApproved(phase);
  };

  const isPhaseAwaitingApproval = (phase: number) => {
    switch (phase) {
      case 1:
        return phase1Done && !isPhaseApproved(1);
      case 2:
        return phase2Done && isPhaseApproved(1) && !isPhaseApproved(2);
      case 3:
        return phase3Done && isPhaseApproved(2) && !isPhaseApproved(3);
      case 4:
        return phase4Done && isPhaseApproved(3) && !isPhaseApproved(4);
      default:
        return false;
    }
  };

  const isPhase2InProcess = Boolean(
    isPhaseApproved(1) && !phase2Done && activeStoryDetail
  );

  const pipelineProcessPhase = (() => {
    if (isAllPipelineFinished || activeStoryDetail?.current_phase === "completed") return 5;
    if (activeStoryDetail?.current_phase === "phase_5_video_generation") return 5;
    if (activeStoryDetail?.current_phase === "phase_4_animation_prompts") return 4;
    if (activeStoryDetail?.current_phase === "phase_3_images") return 3;
    if (activeStoryDetail?.current_phase === "phase_2_characters") return 2;
    if (activeStoryDetail?.current_phase === "phase_1_script") return 1;
    if (isGenerating || (activeStoryDetail && !activeStoryDetail.is_trashed)) return 1;
    return 0;
  })();

  return (
    <aside
      aria-label="Production Pipeline Inspector"
      className={`${
        isOpen ? "w-80 lg:w-96 border-l border-white/[0.08]" : "w-0 border-l-0"
      } relative bg-obsidian-900 flex flex-col justify-between shrink-0 z-20 transition-[width] duration-200`}
    >
      {/* Anchored Side Toggle Tab */}
      <button
        type="button"
        onClick={onToggleOpen}
        className="absolute top-5 right-full z-30 w-6 h-9 rounded-l-md bg-obsidian-900 border-y border-l border-white/[0.12] text-slate-400 hover:text-white hover:bg-obsidian-850 flex items-center justify-center transition cursor-pointer shadow-md"
        title={isOpen ? "Minimize production pipeline" : "Expand production pipeline"}
        aria-label={isOpen ? "Minimize production pipeline" : "Expand production pipeline"}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          {isOpen ? (
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </button>

      <div
        className={`w-80 lg:w-96 h-full flex flex-col justify-between overflow-hidden transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="p-4 space-y-4 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {/* Inspector Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h2 className="text-xs font-display font-semibold uppercase tracking-wider text-slate-200">5-Phase Pipeline</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                {pipelineProcessPhase}/5
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {pipelineProcessPhase === 0 ? "Ready" : `Phase ${pipelineProcessPhase} of 5`}
              </span>
            </div>
          </div>

          {/* Pipeline Stage Arrows - Freely Navigable */}
          <div className="flex items-center justify-between gap-1 w-full pb-1">
            {PIPELINE_PHASES.map((item, idx) => {
              const isSelected = activePhase === item.phase;
              const isDone = isPhaseDone(item.phase);

              return (
                <React.Fragment key={item.phase}>
                  <button
                    type="button"
                    onClick={() => onSelectPhase(isSelected ? null : item.phase)}
                    className={`flex-auto min-w-0 py-1 px-2 rounded text-[10px] font-mono font-medium tracking-tight whitespace-nowrap transition cursor-pointer text-center ${
                      isSelected
                        ? "bg-violet-600/30 text-white border border-violet-500/50 shadow-sm"
                        : isDone
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20"
                        : "bg-white/[0.04] text-slate-400 border border-transparent hover:bg-white/[0.08] hover:text-white"
                    }`}
                    title={`View ${item.title}`}
                  >
                    {item.tag}
                  </button>
                  {idx < PIPELINE_PHASES.length - 1 && (
                    <span className="text-slate-600 text-[10px] shrink-0 select-none">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Pipeline Stage Cards - Freely Selectable with Descriptions */}
          <div className="space-y-2 pt-1">
            {PIPELINE_PHASES.map((item) => {
              const isSelected = activePhase === item.phase;
              const isDone = isPhaseDone(item.phase);
              const isProcessing =
                (item.phase === 1 && isGenerating) ||
                (item.phase === 2 && isSynthesizingCharacters) ||
                (item.phase === 3 && activePhase === 3 && isAdvancingPhase) ||
                (item.phase === 4 && activePhase === 4 && isAdvancingPhase) ||
                (item.phase === 5 && isDeploying);

              return (
                <div
                  key={item.phase}
                  onClick={() => onSelectPhase(isSelected ? null : item.phase)}
                  className={`rounded-xl bg-obsidian-850 border p-3 transition-all cursor-pointer ${
                    isSelected
                      ? "border-violet-500/40 ring-1 ring-violet-500/20 shadow-glow-sm"
                      : "border-white/[0.06] hover:border-white/[0.14] opacity-90 hover:opacity-100"
                  }`}
                >
                  {/* Card Header Row with BouncingDots at start when processing */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      {isProcessing && (
                        <BouncingDots className="w-4 h-2 text-violet-400 shrink-0" />
                      )}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-medium shrink-0 ${
                          isSelected
                            ? "bg-violet-600/30 text-violet-200 border border-violet-500/40"
                            : isDone
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-white/[0.08] text-slate-300"
                        }`}
                      >
                        {isDone ? "✓" : item.phase}
                      </div>
                      <div>
                        {isProcessing ? (
                          <AnimatedShinyText className="text-xs font-semibold">
                            {item.phase === 1
                              ? "Phase 1: Generating Beats..."
                              : item.phase === 2
                              ? "Phase 2: Synthesizing Characters..."
                              : item.phase === 3
                              ? "Phase 3: Generating Keyframes..."
                              : item.phase === 4
                              ? "Phase 4: Directing Motion..."
                              : "Phase 5: Assembling Video..."}
                          </AnimatedShinyText>
                        ) : (
                          <p
                            className={`text-xs font-semibold ${
                              isSelected ? "text-white" : "text-slate-300"
                            }`}
                          >
                            {item.title}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400">{item.subtitle}</p>
                      </div>
                    </div>
                  </div>

                  {/* Clean Expanded Details when Phase is Selected */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2.5">
                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5">
                        <span>{item.tools}</span>
                        {isDone && (
                          <span className="text-emerald-400 font-medium">✓ Ready</span>
                        )}
                      </div>

                      {/* Anchored Approve Button for Each Phase */}
                      {item.phase < 5 && isPhaseAwaitingApproval(item.phase) && (
                        <div className="pt-2 border-t border-white/[0.08]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApproveAndProceed();
                            }}
                            disabled={isAdvancingPhase}
                            className="w-full py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-display font-medium text-xs tracking-wide flex items-center justify-center gap-1.5 transition cursor-pointer shadow-glow-sm disabled:opacity-50"
                          >
                            {isAdvancingPhase ? (
                              <AnimatedShinyText className="text-xs font-medium text-white">
                                Advancing...
                              </AnimatedShinyText>
                            ) : (
                              <>
                                <span>Approve &amp; Continue</span>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Completed & Passed Phase Tag */}
                      {item.phase < 5 && isDone && !isPhaseAwaitingApproval(item.phase) && (
                        <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-emerald-400 border-t border-white/[0.04]">
                          <span className="flex items-center gap-1">
                            <span>✓</span>
                            <span>Phase {item.phase} Approved</span>
                          </span>
                          <span className="text-slate-500 text-[9px]">Pipeline Advanced</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Rail Bottom Controls */}
        {(() => {
          const hasActiveDraft = Boolean(
            activeStoryDetail ||
            (activeStoryId && activeStoryId !== "new-studio-project")
          );

          // Once finished all pipeline and generated a video:
          if (isAllPipelineFinished) {
            return (
              <div className="p-4 border-t border-white/[0.08] bg-obsidian-900 space-y-2 shrink-0">
                {/* Button on top of Deploy: Preview Generated Video */}
                <button
                  type="button"
                  onClick={onOpenVideoPreview}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.14] text-white font-medium text-xs tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-sm hover:border-violet-400/50"
                >
                  <svg className="w-4 h-4 text-violet-400" fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Preview Generated Video</span>
                </button>

                {/* Approve button replaced with Deploy */}
                <button
                  type="button"
                  onClick={onDeploy}
                  disabled={isDeploying}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 hover:from-violet-500 hover:to-indigo-500 text-white font-display font-medium text-xs tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-glow-sm disabled:opacity-50"
                >
                  {isDeploying ? (
                    <AnimatedShinyText className="text-xs font-medium text-white">
                      Deploying to Production...
                    </AnimatedShinyText>
                  ) : (
                    <>
                      <span>Deploy</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </button>

                {hasActiveDraft && (
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                    <button
                      type="button"
                      onClick={onRequestAlternateTake}
                      disabled={isGenerating || activePhase === null}
                      className="hover:text-slate-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Request Alternate Take
                    </button>
                    <button
                      type="button"
                      onClick={onDiscardDraft}
                      disabled={isGenerating}
                      className="hover:text-slate-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Discard Draft
                    </button>
                  </div>
                )}
              </div>
            );
          }

          // If pipeline is not yet finished, show draft actions if draft exists
          if (!hasActiveDraft) {
            return null;
          }

          return (
            <div className="p-3 border-t border-white/[0.08] bg-obsidian-900 shrink-0">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <button
                  type="button"
                  onClick={onRequestAlternateTake}
                  disabled={isGenerating || activePhase === null}
                  className="hover:text-slate-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Request Alternate Take
                </button>
                <button
                  type="button"
                  onClick={onDiscardDraft}
                  disabled={isGenerating}
                  className="hover:text-slate-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Discard Draft
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </aside>
  );
}

export default PipelineRightRail;

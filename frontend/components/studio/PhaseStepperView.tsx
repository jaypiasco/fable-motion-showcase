'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  FileText,
  Users,
  Image as ImageIcon,
  Sparkles,
  Film,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Copy,
  Check,
  Play,
  Volume2,
  Subtitles,
  Clapperboard,
  Sparkle,
  Compass,
  Eye,
  Trash2,
  Archive,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { StoryDetail } from '../../lib/types';

interface PhaseStepperViewProps {
  story: StoryDetail;
  activePhase: number;
  onSelectPhase: (phaseIndex: number) => void;
  onBackToPlan: () => void;
  onOpenLightbox?: (url: string, caption?: string) => void;
  onTrashStory?: (storyId: string) => void;
  onRestoreStory?: (storyId: string) => void;
}

export function PhaseStepperView({
  story,
  activePhase,
  onSelectPhase,
  onBackToPlan,
  onOpenLightbox,
  onTrashStory,
  onRestoreStory,
}: PhaseStepperViewProps) {
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const p1 = story.phases?.phase_1_script;
  const p2 = story.phases?.phase_2_characters;
  const p3 = story.phases?.phase_3_images;
  const p4 = story.phases?.phase_4_animation_prompts;
  const p5 = story.phases?.phase_5_video_generation;

  const phases = [
    { id: 1, name: '1. Script & Beats', shortName: 'Script', icon: FileText, completed: p1?.status === 'completed', hasError: p1?.status === 'error' },
    { id: 2, name: '2. Characters', shortName: 'Characters', icon: Users, completed: p2?.status === 'completed', hasError: p2?.status === 'error' },
    { id: 3, name: '3. Keyframes', shortName: 'Keyframes', icon: ImageIcon, completed: p3?.status === 'completed', hasError: p3?.status === 'error' || Boolean(p3?.error) },
    { id: 4, name: '4. Motion Dynamics', shortName: 'Motion', icon: Sparkles, completed: p4?.status === 'completed', hasError: p4?.status === 'error' || Boolean(p4?.error) },
    { id: 5, name: '5. Video Assembly', shortName: 'Video', icon: Film, completed: p5?.status === 'completed', hasError: p5?.status === 'error' || Boolean(p5?.error) },
  ];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto select-none">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#2b2736]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToPlan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2b2736] bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-outline hover:text-on-surface transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Plan Overview</span>
          </button>
          <div>
            <h1 className="text-base md:text-lg font-bold text-on-surface tracking-tight truncate max-w-md md:max-w-xl font-headline-sm">
              {p1?.idea?.title || story.prompt || 'Studio Phase Stepper'}
            </h1>
            <p className="text-xs text-outline font-label-sm">
              Inspecting Phase {activePhase} of 5 · <span className="text-secondary font-mono capitalize">{story.status}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {story.is_trashed ? (
            onRestoreStory && (
              <button
                onClick={() => onRestoreStory(story.story_id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary-container/20 hover:bg-secondary-container/30 border border-secondary/40 text-secondary text-xs font-semibold transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restore
              </button>
            )
          ) : (
            onTrashStory && (
              <button
                onClick={() => onTrashStory(story.story_id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-[#2b2736] text-outline hover:text-secondary text-xs font-medium transition-all cursor-pointer"
                title="Move story to Story Archive"
              >
                <Archive className="w-3.5 h-3.5" /> Archive
              </button>
            )
          )}
        </div>
      </div>

      {/* Horizontal Interactive Stepper Navigation Bar */}
      <div className="p-2 rounded-2xl bg-surface-container-low/80 border border-[#2b2736] shadow-lg">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {phases.map((phase) => {
            const Icon = phase.icon;
            const isActive = activePhase === phase.id;
            const isCompleted = phase.completed;

            return (
              <button
                key={phase.id}
                onClick={() => onSelectPhase(phase.id)}
                className={`relative flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary/15 border-primary text-on-surface shadow-[0_0_12px_rgba(208,188,255,0.25)]'
                    : phase.hasError
                    ? 'bg-rose-950/20 border-rose-500/40 text-rose-200 hover:bg-rose-950/30'
                    : isCompleted
                    ? 'bg-surface-container border-secondary/30 text-on-surface hover:bg-surface-container-high'
                    : 'bg-surface-container/50 border-[#2b2736] text-outline hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-sm'
                      : phase.hasError
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : isCompleted
                      ? 'bg-secondary/20 text-secondary border border-secondary/40'
                      : 'bg-surface-container text-outline'
                  }`}
                >
                  {isCompleted && !isActive && !phase.hasError ? (
                    <CheckCircle2 className="w-4 h-4 text-secondary" />
                  ) : phase.hasError && !isActive ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ) : (
                    phase.id
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate leading-none">
                    {phase.shortName}
                  </div>
                  <div className="text-[10px] text-outline mt-1 truncate">
                    Phase {phase.id}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Phase Detailed Content Container */}
      <div className="space-y-6">
        {/* PHASE 1: SCRIPT & BEATS */}
        {activePhase === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Story Idea Summary Card */}
            <div className="p-5 rounded-2xl border border-[#2b2736] bg-surface-container-low/70 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#2b2736]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider font-headline-sm">
                    Story Concept &amp; Script Blueprint
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold font-label-sm">
                    {p1?.idea?.genre || 'Viral 3D Drama'}
                  </span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-surface-container text-outline border border-[#2b2736] font-mono">
                    {p1?.idea?.aspect_ratio || '9:16'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-surface-container border border-[#2b2736]/60 space-y-1">
                  <span className="text-outline font-semibold uppercase text-[10px] tracking-wider font-label-sm">
                    Logline &amp; Premise
                  </span>
                  <p className="text-on-surface leading-relaxed font-body-sm">
                    {p1?.idea?.logline || story.prompt}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container border border-[#2b2736]/60 space-y-1">
                  <span className="text-outline font-semibold uppercase text-[10px] tracking-wider font-label-sm">
                    3-Second Viral Hook
                  </span>
                  <p className="text-primary font-medium leading-relaxed italic font-body-sm">
                    &quot;{p1?.idea?.hook_3s || 'They called her heart impenetrable... until he held the prism.'}&quot;
                  </p>
                </div>
              </div>
            </div>

            {/* Scene Beats List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider font-label-sm">
                  Generated Scene Breakdown ({p1?.scenes?.length || 0} Scenes)
                </h3>
                <span className="text-[11px] text-outline font-mono">
                  Agent: {p1?.agent_model_display || 'Gemini 3.7 Flash'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {(p1?.scenes || []).map((scene) => {
                  const dialogues = Array.isArray(scene.dialogue)
                    ? scene.dialogue
                    : scene.dialogue
                    ? [{ speaker: 'Character', exact_speech: String(scene.dialogue) }]
                    : [];

                  return (
                    <div
                      key={scene.scene_id}
                      className="p-4 rounded-xl border border-[#2b2736] bg-surface-container-low/70 hover:border-primary/40 transition-all space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#2b2736]/60">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
                            {scene.scene_id}
                          </span>
                          <span className="text-xs font-bold text-white">
                            Scene {scene.scene_id}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-white/[0.03]">
                            {scene.timestamp || `00:0${(scene.scene_id - 1) * 5} - 00:${scene.scene_id * 5}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {scene.shot_type && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                              {scene.shot_type}
                            </span>
                          )}
                          {scene.duration_seconds && (
                            <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-white/[0.03]">
                              {scene.duration_seconds}s
                            </span>
                          )}
                        </div>
                      </div>

                      {scene.setting && (
                        <p className="text-[11px] text-slate-400">
                          <strong className="text-slate-300">Setting:</strong> {scene.setting}
                        </p>
                      )}

                      {scene.visual_description && (
                        <p className="text-xs text-slate-200 leading-relaxed">
                          {scene.visual_description}
                        </p>
                      )}

                      {/* Dialogue lines */}
                      {dialogues.length > 0 && (
                        <div className="p-3 rounded-lg bg-slate-900/60 border border-white/5 space-y-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Dialogue
                          </span>
                          {dialogues.map((d, idx) => (
                            <div key={idx} className="text-xs text-slate-200">
                              <span className="font-semibold text-primary">{d.speaker || 'Speaker'}:</span>{' '}
                              <span className="italic">"{d.exact_speech}"</span>
                              {d.accent_and_tone && (
                                <span className="text-[10px] text-slate-400 ml-2">
                                  ({d.accent_and_tone})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {scene.narration && (
                        <div className="text-xs text-slate-400 italic">
                          <strong className="text-slate-300 not-italic">Narration:</strong> {scene.narration}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PHASE 2: CHARACTERS */}
        {activePhase === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider font-headline-sm">
                  Character Visual Bibles ({p2?.characters?.length || 0} Profiles)
                </h3>
                <p className="text-xs text-outline mt-0.5 font-label-sm">
                  Consistent 3D crystal humanoid shaders and style seeds
                </p>
              </div>
              <span className="text-[11px] text-outline font-mono">
                Agent: {p2?.agent_model_used || 'Google Nano Banana Pro'}
              </span>
            </div>

            {(!p2?.characters || p2.characters.length === 0) ? (
              <div className="p-10 rounded-2xl border border-dashed border-[#2b2736] text-center text-outline text-xs">
                No character profiles generated yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {p2.characters.map((char, idx) => (
                  <div
                    key={idx}
                    className="p-4.5 rounded-2xl border border-[#2b2736] bg-surface-container-low/70 hover:border-primary/40 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Character Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-base font-bold text-on-surface tracking-tight font-headline-sm">
                            {char.name}
                          </h4>
                          <span className="text-[11px] font-semibold text-primary font-label-sm">
                            {char.archetype || 'Lead Character'}
                          </span>
                        </div>

                        {char.vocal_tone && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-[#2b2736] max-w-[140px] truncate">
                            {char.vocal_tone}
                          </span>
                        )}
                      </div>

                      {/* Character Image Preview */}
                      {char.image_url ? (
                        <div
                          onClick={() => onOpenLightbox?.(char.image_url!, `${char.name} - ${char.archetype}`)}
                          className="relative aspect-[9/16] max-h-72 w-full rounded-xl overflow-hidden bg-surface-container border border-[#2b2736] group cursor-pointer"
                        >
                          <img
                            src={char.image_url}
                            alt={char.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                          <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded bg-black/70 text-[10px] text-white flex items-center gap-1">
                            <Maximize2 className="w-3 h-3" /> View High-Res
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[9/16] max-h-56 w-full rounded-xl bg-surface-container flex items-center justify-center text-outline text-xs border border-[#2b2736]">
                          Portrait rendering...
                        </div>
                      )}

                      {/* Details */}
                      <div className="space-y-2 text-xs pt-1">
                        {char.crystal_shader && (
                          <div className="p-2.5 rounded-lg bg-surface-container border border-[#2b2736]/60">
                            <span className="text-[10px] font-semibold uppercase text-outline block font-label-sm">
                              Crystal Shader &amp; Aesthetics
                            </span>
                            <p className="text-on-surface mt-0.5 font-body-sm">{char.crystal_shader}</p>
                          </div>
                        )}

                        {char.hidden_motivation && (
                          <div className="p-2.5 rounded-lg bg-surface-container border border-[#2b2736]/60">
                            <span className="text-[10px] font-semibold uppercase text-outline block font-label-sm">
                              Hidden Motivation
                            </span>
                            <p className="text-on-surface mt-0.5 font-body-sm">{char.hidden_motivation}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Seed Prompt Copy */}
                    {char.style_seed_prompt && (
                      <div className="pt-2 border-t border-[#2b2736]/60">
                        <button
                          onClick={() => handleCopy(char.style_seed_prompt!, `char-${idx}`)}
                          className="w-full text-left p-2 rounded bg-surface-container hover:bg-surface-container-high border border-[#2b2736]/60 text-[11px] font-mono text-outline hover:text-on-surface flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span className="truncate max-w-[280px]">
                            {char.style_seed_prompt}
                          </span>
                          {copiedIndex === `char-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 flex-shrink-0" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PHASE 3: KEYFRAMES */}
        {activePhase === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider font-headline-sm">
                  Scene Keyframes ({p3?.items?.length || 0} Frames)
                </h3>
                <p className="text-xs text-outline mt-0.5 font-label-sm">
                  Cinematic 9:16 vertical render compositions
                </p>
              </div>
              <span className="text-[11px] text-outline font-mono">
                Agent: {p3?.agent_model_used || 'Google Nano Banana Pro'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {(p3?.items || []).map((item) => (
                <div
                  key={item.scene_id}
                  className="rounded-2xl border border-[#2b2736] bg-surface-container-low/70 overflow-hidden group hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <div
                    onClick={() =>
                      item.image_url &&
                      onOpenLightbox?.(item.image_url, `Scene ${item.scene_id}: ${item.setting || 'Keyframe'}`)
                    }
                    className="relative aspect-[9/16] bg-surface-container-lowest overflow-hidden cursor-pointer"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={`Scene ${item.scene_id}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : item.status === 'error' || item.error || p3?.status === 'error' || p3?.error ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center gap-1.5 bg-rose-950/20 text-rose-300 text-xs">
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                        <span className="font-semibold text-[11px]">Keyframe Failed</span>
                        <span className="text-[10px] text-rose-300/80 line-clamp-3">
                          {item.error || p3?.error || 'Quota or render error'}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-outline text-xs">
                        Rendering Keyframe...
                      </div>
                    )}

                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-surface-container-lowest/80 backdrop-blur text-[10px] font-mono text-on-surface font-bold border border-[#2b2736]">
                      Scene {item.scene_id}
                    </div>

                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-surface-container-lowest/80 backdrop-blur text-[10px] text-primary border border-primary/20">
                      {item.shot_type || '9:16'}
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <span className="text-[11px] text-white font-semibold flex items-center gap-1">
                        <Maximize2 className="w-3.5 h-3.5" /> Lightbox
                      </span>
                    </div>
                  </div>

                  <div className="p-3 space-y-1.5 text-xs">
                    <p className="font-semibold text-on-surface truncate">
                      {item.setting || `Scene ${item.scene_id}`}
                    </p>
                    {item.image_prompt_sent && (
                      <button
                        onClick={() => handleCopy(item.image_prompt_sent!, `keyframe-${item.scene_id}`)}
                        className="w-full text-left p-1.5 rounded bg-surface-container hover:bg-surface-container-high border border-[#2b2736]/60 text-[10px] font-mono text-outline hover:text-on-surface flex items-center justify-between transition-colors cursor-pointer"
                        title="Copy Image Prompt"
                      >
                        <span className="truncate max-w-[150px]">{item.image_prompt_sent}</span>
                        {copiedIndex === `keyframe-${item.scene_id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PHASE 4: MOTION DYNAMICS */}
        {activePhase === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider font-headline-sm">
                  Motion Dynamics &amp; Camera Physics ({p4?.items?.length || 0} Directives)
                </h3>
                <p className="text-xs text-outline mt-0.5 font-label-sm">
                  Camera tracking vectors and action directives for Google Veo 3.1
                </p>
              </div>
              <span className="text-[11px] text-outline font-mono">
                Agent: {p4?.agent_model_used || 'Gemini 3.7 Flash'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(p4?.items || []).map((motion) => (
                <div
                  key={motion.scene_id}
                  className="p-4.5 rounded-2xl border border-[#2b2736] bg-surface-container-low/70 hover:border-primary/40 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#2b2736]/60">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
                        {motion.scene_id}
                      </span>
                      <span className="text-xs font-bold text-on-surface font-headline-sm">
                        Scene {motion.scene_id} Dynamics
                      </span>
                    </div>

                    {motion.duration && (
                      <span className="text-[10px] font-mono text-outline px-2 py-0.5 rounded bg-surface-container">
                        {motion.duration}s length
                      </span>
                    )}
                  </div>

                  {motion.camera_dynamics && (
                    <div className="flex items-center gap-2 text-xs">
                      <Compass className="w-3.5 h-3.5 text-primary" />
                      <span className="text-on-surface font-medium">{motion.camera_dynamics}</span>
                    </div>
                  )}

                  {motion.action_description && (
                    <p className="text-xs text-outline leading-relaxed font-body-sm">
                      {motion.action_description}
                    </p>
                  )}

                  {/* Veo 3.1 Prompt Box */}
                  {motion.animation_prompt_generated && (
                    <div className="p-3 rounded-xl bg-surface-container border border-[#2b2736]/60 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-outline uppercase tracking-wider font-label-sm">
                        <span className="flex items-center gap-1 text-primary">
                          <Sparkle className="w-3 h-3" /> Veo 3.1 Motion Directive
                        </span>
                        <button
                          onClick={() =>
                            handleCopy(motion.animation_prompt_generated!, `motion-${motion.scene_id}`)
                          }
                          className="flex items-center gap-1 text-outline hover:text-on-surface transition-colors cursor-pointer"
                        >
                          {copiedIndex === `motion-${motion.scene_id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs font-mono text-on-surface leading-relaxed">
                        {motion.animation_prompt_generated}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PHASE 5: VIDEO ASSEMBLY & CAPTIONS */}
        {activePhase === 5 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider font-headline-sm">
                  Video Assembly, Audio &amp; Dynamic Captions
                </h3>
                <p className="text-xs text-outline mt-0.5 font-label-sm">
                  1080p final render with Gemini TTS voiceover and word-level karaoke subtitles
                </p>
              </div>
              <span className="text-[11px] text-outline font-mono">
                Engine: {p5?.agent_model_used || 'Google Veo 3.1 Fast'}
              </span>
            </div>

            {/* Video Player Main Showcase */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Video Player */}
              <div className="lg:col-span-6 flex flex-col items-center">
                <div className="w-full max-w-[340px] aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-[#2b2736] shadow-2xl relative">
                  {p5?.assembly?.final_video_url ? (
                    <video
                      src={p5.assembly.final_video_url}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                      poster={p3?.items?.[0]?.image_url || undefined}
                    />
                  ) : p5?.status === 'error' || p5?.error ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-rose-300 space-y-3 bg-rose-950/20">
                      <AlertTriangle className="w-8 h-8 text-rose-400" />
                      <p className="text-xs font-semibold">Video Assembly Error</p>
                      <p className="text-[11px] text-rose-300/80 font-mono line-clamp-3">
                        {p5?.error || 'Failed to render or assemble video clips.'}
                      </p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-outline space-y-3">
                      <Film className="w-8 h-8 text-primary animate-pulse" />
                      <p className="text-xs font-body-sm">Assembling final episode video clips...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Audio & Subtitle Details */}
              <div className="lg:col-span-6 space-y-4">
                {/* Audio Track Player Card */}
                {p5?.assembly?.voiceover_url && (
                  <div className="p-4.5 rounded-2xl border border-[#2b2736] bg-surface-container-low/70 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                      <Volume2 className="w-4 h-4 text-primary" />
                      <span>Gemini TTS Voiceover Audio Track</span>
                    </div>
                    <audio
                      src={p5.assembly.voiceover_url}
                      controls
                      className="w-full h-9 rounded-lg"
                    />
                  </div>
                )}

                {/* Captions Preview Card */}
                <div className="p-4.5 rounded-2xl border border-[#2b2736] bg-surface-container-low/70 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                    <div className="flex items-center gap-2">
                      <Subtitles className="w-4 h-4 text-primary" />
                      <span>Synchronized Karaoke Captions</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">faster-whisper (.ass)</span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-container border border-[#2b2736]/60 max-h-48 overflow-y-auto space-y-1.5 text-xs font-mono text-on-surface custom-scrollbar">
                    {p5?.assembly?.subtitles_content ? (
                      <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-on-surface">
                        {p5.assembly.subtitles_content}
                      </pre>
                    ) : (
                      <p className="text-outline italic text-[11px]">
                        Dynamic word-level karaoke subtitles embedded directly onto master video stream.
                      </p>
                    )}
                  </div>
                </div>

                {/* Individual Scene Clips Grid */}
                <div className="p-4.5 rounded-2xl border border-[#2b2736] bg-surface-container-low/70 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                    <Clapperboard className="w-4 h-4 text-primary" />
                    <span>Individual Scene Video Clips ({p5?.clips?.length || 0})</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(p5?.clips || []).map((clip) => (
                      <div
                        key={clip.scene_id}
                        className="p-2 rounded-xl bg-surface-container border border-[#2b2736]/60 space-y-1"
                      >
                        <span className="text-[10px] font-bold text-primary block">
                          Scene {clip.scene_id} Clip
                        </span>
                        {clip.video_url ? (
                          <video
                            src={clip.video_url}
                            controls
                            className="w-full aspect-[9/16] rounded object-cover bg-black"
                          />
                        ) : (
                          <div className="w-full aspect-[9/16] rounded bg-black/60 flex items-center justify-center text-[10px] text-outline">
                            Synthesizing...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Stepper Footer Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-[#2b2736]">
        <button
          onClick={() => onSelectPhase(Math.max(1, activePhase - 1))}
          disabled={activePhase <= 1}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high disabled:opacity-40 disabled:pointer-events-none border border-[#2b2736] text-xs font-semibold text-on-surface transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous: Phase {Math.max(1, activePhase - 1)}</span>
        </button>

        <button
          onClick={onBackToPlan}
          className="text-xs text-outline hover:text-on-surface font-medium transition-colors cursor-pointer font-label-sm"
        >
          Return to Plan Overview
        </button>

        <button
          onClick={() => onSelectPhase(Math.min(5, activePhase + 1))}
          disabled={activePhase >= 5}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-[0_0_16px_rgba(168,85,247,0.3)] hover:shadow-[0_0_24px_rgba(6,182,212,0.45)] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
        >
          <span>Next: Phase {Math.min(5, activePhase + 1)}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  Image as ImageIcon,
  Sparkles,
  Film,
  X,
  Play,
  Layers,
  WandSparkles,
  Edit3,
  Check,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Sparkle,
} from 'lucide-react';

export interface PhasePlanDraft {
  title: string;
  genre: string;
  aspectRatio: string;
  hook3s: string;
  logline: string;
  scenesCount: number;
  characters: Array<{
    name: string;
    archetype: string;
    crystalShader: string;
    vocalTone: string;
  }>;
  keyframePromptTheme: string;
  motionDynamicsStyle: string;
  ttsVoice: string;
  subtitleFormat: string;
}

interface DeploymentChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApproveAndExecute: (finalPlan: PhasePlanDraft) => void;
  initialPlan?: Partial<PhasePlanDraft>;
  isExecuting?: boolean;
}

export function DeploymentChecklistModal({
  isOpen,
  onClose,
  onApproveAndExecute,
  initialPlan,
  isExecuting = false,
}: DeploymentChecklistModalProps) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1);
  const [verifiedPhases, setVerifiedPhases] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
  });

  // Editable phase plan state
  const [plan, setPlan] = useState<PhasePlanDraft>({
    title: initialPlan?.title || 'The Berry Baker',
    genre: initialPlan?.genre || '3D Animated Adventure',
    aspectRatio: initialPlan?.aspectRatio || '9:16 Vertical',
    hook3s: initialPlan?.hook3s || 'One tiny strawberry against the giant imperial ovens.',
    logline:
      initialPlan?.logline ||
      'An ambitious young strawberry must master the legendary flame whisk before the royal solstice grand feast.',
    scenesCount: initialPlan?.scenesCount || 4,
    characters: initialPlan?.characters || [
      {
        name: 'Pip Strawberry',
        archetype: 'The Underdog Baker',
        crystalShader: 'Velvety Red Strawberry Skin with Tiny Golden Seeds and Fresh Leaf Crest',
        vocalTone: 'Energetic, warm cadence with bright aspirational resonance',
      },
      {
        name: 'Chef Bramble',
        archetype: 'The Veteran Mentor',
        crystalShader: 'Deep Glossy Blackberry Drupelets with Silver-Tipped Sugar Frosting',
        vocalTone: 'Deep resonant baritone with fatherly warmth',
      },
    ],
    keyframePromptTheme:
      initialPlan?.keyframePromptTheme ||
      'Unreal Engine 5 stylized 3D animation, warm kitchen volumetric lighting, 9:16 vertical composition.',
    motionDynamicsStyle:
      initialPlan?.motionDynamicsStyle ||
      'Veo 3.1: Smooth camera drift, character facial animation, and dynamic action choreography.',
    ttsVoice: initialPlan?.ttsVoice || 'Gemini 2.5 Pro TTS (Studio Story Narrator)',
    subtitleFormat: initialPlan?.subtitleFormat || 'faster-whisper dynamic word-level karaoke .ass',
  });

  if (!isOpen) return null;

  const toggleVerify = (phaseId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setVerifiedPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }));
  };

  const verifiedCount = Object.values(verifiedPhases).filter(Boolean).length;

  const checklistItems = [
    {
      id: 1,
      name: 'Phase 1: Story Script & Narrative Beats',
      short: 'Script & Beats',
      icon: FileText,
      model: 'google/gemini-3.7-flash',
      summary: `${plan.scenesCount} scenes · Hook: "${plan.hook3s.slice(0, 40)}..."`,
      content: (
        <div className="space-y-3 pt-2 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-outline block mb-1">Story Title</label>
              <input
                type="text"
                value={plan.title}
                onChange={(e) => setPlan({ ...plan, title: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-[#2b2736] text-on-surface text-xs focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-outline block mb-1">Genre / Category</label>
              <input
                type="text"
                value={plan.genre}
                onChange={(e) => setPlan({ ...plan, genre: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-[#2b2736] text-on-surface text-xs focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-outline block mb-1">3-Second Viral Hook</label>
            <input
              type="text"
              value={plan.hook3s}
              onChange={(e) => setPlan({ ...plan, hook3s: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-[#2b2736] text-primary text-xs focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-outline block mb-1">Premise & Logline</label>
            <textarea
              rows={2}
              value={plan.logline}
              onChange={(e) => setPlan({ ...plan, logline: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-[#2b2736] text-on-surface-variant text-xs focus:outline-none focus:border-primary resize-none leading-relaxed"
            />
          </div>
        </div>
      ),
    },
    {
      id: 2,
      name: 'Phase 2: Character Visual Bibles & Shaders',
      short: 'Character Bibles',
      icon: Users,
      model: 'Google Nano Banana Pro',
      summary: `${plan.characters.length} characters: ${plan.characters.map((c) => c.name).join(', ')}`,
      content: (
        <div className="space-y-3 pt-2 text-xs">
          {plan.characters.map((char, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-surface-container border border-[#2b2736] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-on-surface text-xs">Character {idx + 1}</span>
                <span className="text-[10px] text-primary font-mono">{char.archetype}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-outline block">Name</label>
                  <input
                    type="text"
                    value={char.name}
                    onChange={(e) => {
                      const updated = [...plan.characters];
                      updated[idx].name = e.target.value;
                      setPlan({ ...plan, characters: updated });
                    }}
                    className="w-full px-2.5 py-1 rounded bg-surface-container-lowest border border-[#2b2736] text-on-surface text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-outline block">Archetype</label>
                  <input
                    type="text"
                    value={char.archetype}
                    onChange={(e) => {
                      const updated = [...plan.characters];
                      updated[idx].archetype = e.target.value;
                      setPlan({ ...plan, characters: updated });
                    }}
                    className="w-full px-2.5 py-1 rounded bg-surface-container-lowest border border-[#2b2736] text-on-surface text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-outline block">Crystal Shader & Appearance</label>
                <input
                  type="text"
                  value={char.crystalShader}
                  onChange={(e) => {
                    const updated = [...plan.characters];
                    updated[idx].crystalShader = e.target.value;
                    setPlan({ ...plan, characters: updated });
                  }}
                  className="w-full px-2.5 py-1 rounded bg-surface-container-lowest border border-[#2b2736] text-on-surface-variant text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 3,
      name: 'Phase 3: High-Res Scene Keyframes (9:16)',
      short: 'Keyframes',
      icon: ImageIcon,
      model: 'Google Nano Banana Pro',
      summary: 'Volumetric caustic lighting & 9:16 vertical render parameters',
      content: (
        <div className="space-y-3 pt-2 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-outline block mb-1">
              Global Keyframe Art Directive
            </label>
            <textarea
              rows={3}
              value={plan.keyframePromptTheme}
              onChange={(e) => setPlan({ ...plan, keyframePromptTheme: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-[#2b2736] text-on-surface-variant text-xs focus:outline-none focus:border-primary resize-none font-mono leading-relaxed"
            />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-outline">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span>Target Resolution: 1080x1920 (9:16 Vertical TikTok / Reels / Shorts)</span>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      name: 'Phase 4: Veo 3.1 Motion Dynamics & Kinematics',
      short: 'Motion Directives',
      icon: Sparkles,
      model: 'google/gemini-3.7-flash (Motion Agent)',
      summary: 'Camera physics, rotational orbit sweeps & micro rack focus',
      content: (
        <div className="space-y-3 pt-2 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-outline block mb-1">
              Veo 3.1 Generative Physics Directives
            </label>
            <textarea
              rows={3}
              value={plan.motionDynamicsStyle}
              onChange={(e) => setPlan({ ...plan, motionDynamicsStyle: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-[#2b2736] text-on-surface-variant text-xs focus:outline-none focus:border-primary resize-none font-mono leading-relaxed"
            />
          </div>
        </div>
      ),
    },
    {
      id: 5,
      name: 'Phase 5: Video Assembly, Audio & Captions',
      short: 'Final Assembly',
      icon: Film,
      model: 'Google Veo 3.1 + TTS + Whisper',
      summary: `${plan.ttsVoice.split(' ')[0]} voiceover + Word-level .ass subtitles`,
      content: (
        <div className="space-y-3 pt-2 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-outline block mb-1">Voiceover Model</label>
              <input
                type="text"
                value={plan.ttsVoice}
                onChange={(e) => setPlan({ ...plan, ttsVoice: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-[#2b2736] text-on-surface text-xs focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-outline block mb-1">Subtitle Burning Engine</label>
              <input
                type="text"
                value={plan.subtitleFormat}
                onChange={(e) => setPlan({ ...plan, subtitleFormat: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-[#2b2736] text-on-surface text-xs focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-[#2b2736] bg-surface-container-low shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-5 border-b border-[#2b2736] bg-gradient-to-r from-primary-container/20 via-surface-container to-surface-container-low flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                <ShieldCheck className="w-3 h-3" /> Pre-Flight Pipeline Checklist
              </span>
              <span className="text-[10px] font-mono text-outline px-2 py-0.5 rounded bg-surface-container border border-[#2b2736]">
                {verifiedCount}/5 Verified
              </span>
            </div>
            <h2 className="text-xl font-bold text-on-surface tracking-tight font-headline-sm">
              Verify & Approve 5-Phase Plan
            </h2>
            <p className="text-xs text-outline">
              Expand any phase below to fine-tune prompts and directives before full pipeline generation starts.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface bg-surface-container hover:bg-surface-container-high border border-[#2b2736] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Checklist Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
          {checklistItems.map((item) => {
            const Icon = item.icon;
            const isExpanded = expandedPhase === item.id;
            const isVerified = !!verifiedPhases[item.id];

            return (
              <div
                key={item.id}
                className={`rounded-xl border transition-all overflow-hidden ${
                  isExpanded
                    ? 'border-primary/50 bg-surface-container shadow-md'
                    : isVerified
                    ? 'border-[#2b2736] bg-surface-container-lowest hover:bg-surface-container'
                    : 'border-tertiary/40 bg-tertiary/5'
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedPhase(isExpanded ? null : item.id)}
                  className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => toggleVerify(item.id, e)}
                      className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                        isVerified
                          ? 'bg-secondary/20 text-secondary border border-secondary/40 hover:bg-secondary/30'
                          : 'bg-surface-container text-outline border border-[#2b2736] hover:border-outline'
                      }`}
                      title={isVerified ? 'Mark as Unverified' : 'Mark as Verified'}
                    >
                      {isVerified ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{item.id}</span>}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-on-surface truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-mono text-outline hidden sm:inline-block">
                          ({item.model})
                        </span>
                      </div>
                      <p className="text-[11px] text-outline truncate mt-0.5">
                        {item.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-primary flex items-center gap-1 font-medium hover:underline">
                      <Edit3 className="w-3 h-3" /> {isExpanded ? 'Collapse' : 'Edit'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-outline" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-outline" />
                    )}
                  </div>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="p-4 pt-1 border-t border-[#2b2736] bg-surface-container-lowest/70">
                    {item.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-[#2b2736] bg-surface-container-low flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 rounded-lg border border-[#2b2736] bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-outline hover:text-on-surface transition-colors cursor-pointer"
          >
            Cancel & Edit Later
          </button>

          <button
            type="button"
            onClick={() => onApproveAndExecute(plan)}
            disabled={isExecuting}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-primary to-primary-container text-surface font-semibold text-xs shadow-lg shadow-primary/25 hover:brightness-110 disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
          >
            {isExecuting ? (
              <>
                <WandSparkles className="w-4 h-4 animate-spin" />
                <span>Executing Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Approve All & Execute Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

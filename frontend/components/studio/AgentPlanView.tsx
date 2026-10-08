'use client';

import React, { useState } from 'react';
import {
  FileText,
  Users,
  Image as ImageIcon,
  Sparkles,
  Film,
  CheckCircle2,
  Clock,
  ArrowRight,
  Maximize2,
  Cpu,
  Layers,
  Send,
  Sparkle,
  MessageSquare,
  Bot,
  WandSparkles,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { StoryDetail } from '../../lib/types';
import { DeploymentChecklistModal, PhasePlanDraft } from './DeploymentChecklistModal';

interface AgentPlanViewProps {
  story: StoryDetail;
  onExpandPhase: (phaseIndex: number) => void;
  onOpenLightbox?: (url: string, caption?: string) => void;
  onExecutePlan?: (plan: PhasePlanDraft) => void;
  isExecuting?: boolean;
}

export function AgentPlanView({
  story,
  onExpandPhase,
  onOpenLightbox,
  onExecutePlan,
  isExecuting = false,
}: AgentPlanViewProps) {
  const [chatInput, setChatInput] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'agent'; text: string }>>([
    {
      role: 'agent',
      text: 'Welcome to the Story Studio Director. Tell me your story concept, or choose a prompt style below to generate and verify your 5-phase execution plan.',
    },
  ]);

  const [currentDraftPlan, setCurrentDraftPlan] = useState<Partial<PhasePlanDraft>>({
    title: story.phases?.phase_1_script?.idea?.title || 'The Berry Baker',
    genre: story.phases?.phase_1_script?.idea?.genre || '3D Animated Adventure',
    aspectRatio: story.phases?.phase_1_script?.idea?.aspect_ratio || '9:16 Vertical',
    hook3s: story.phases?.phase_1_script?.idea?.hook_3s || 'One tiny strawberry against the giant imperial ovens.',
    logline: story.phases?.phase_1_script?.idea?.logline || story.prompt,
    scenesCount: story.phases?.phase_1_script?.scenes?.length || 4,
    characters: story.phases?.phase_2_characters?.characters?.map((c) => ({
      name: c.name,
      archetype: c.archetype || 'Lead Character',
      crystalShader: c.crystal_shader || 'Stylized 3D Shader',
      vocalTone: c.vocal_tone || 'Cinematic Tone',
    })) || [
      {
        name: 'Pip Strawberry',
        archetype: 'The Underdog Baker',
        crystalShader: 'Velvety Red Strawberry Skin with Golden Seeds',
        vocalTone: 'Energetic, warm cadence with bright resonance',
      },
      {
        name: 'Chef Bramble',
        archetype: 'The Veteran Mentor',
        crystalShader: 'Glossy Blackberry Drupelets with Sugar Frosting',
        vocalTone: 'Deep resonant baritone with fatherly warmth',
      },
    ],
  });

  const p1 = story.phases?.phase_1_script;
  const p2 = story.phases?.phase_2_characters;
  const p3 = story.phases?.phase_3_images;
  const p4 = story.phases?.phase_4_animation_prompts;
  const p5 = story.phases?.phase_5_video_generation;

  const scenesCount = p1?.scenes?.length || story.phases?.phase_3_images?.items?.length || 4;
  const charactersCount = p2?.characters?.length || 0;
  const keyframesCount = p3?.items?.filter((i) => !!i.image_url)?.length || 0;
  const motionCount = p4?.items?.length || 0;
  const hasFinalVideo = !!p5?.assembly?.final_video_url;

  // Overall pipeline progress
  const phasesCompleted = [
    p1?.status === 'completed',
    p2?.status === 'completed',
    p3?.status === 'completed',
    p4?.status === 'completed',
    p5?.status === 'completed',
  ].filter(Boolean).length;

  const progressPercent = Math.round((phasesCompleted / 5) * 100);

  const planSteps = [
    {
      id: 1,
      title: 'Phase 1: Story Script & Scene Beats',
      shortTitle: 'Script & Beats',
      description: 'Generates narrative structure, dramatic pacing, character dialogues, and scene breakdown.',
      agentModel: p1?.agent_model_display || p1?.agent_model_used || 'Gemini 3.7 Flash',
      status: p1?.status === 'completed' ? 'completed' : p1?.status === 'in_progress' ? 'in_progress' : 'pending',
      icon: FileText,
      metrics: [
        { label: 'Scenes', value: `${scenesCount} scenes` },
        { label: 'Aspect Ratio', value: p1?.idea?.aspect_ratio || '9:16 Vertical' },
        { label: 'Genre', value: p1?.idea?.genre || 'Viral 3D Drama' },
      ],
      highlights: [
        p1?.idea?.hook_3s ? `Hook: "${p1.idea.hook_3s}"` : '3-second viral attention hook generated',
        `${scenesCount} scene beats with shot dynamics and dialogue cues`,
      ],
    },
    {
      id: 2,
      title: 'Phase 2: Character Visual Bibles',
      shortTitle: 'Character Bibles',
      description: 'Builds consistent character bibles, crystal shaders, wardrobe anchors, and portraits.',
      agentModel: p2?.agent_model_used || 'Google Nano Banana Pro',
      status: p2?.status === 'completed' ? 'completed' : p2?.status === 'in_progress' ? 'in_progress' : 'pending',
      icon: Users,
      metrics: [
        { label: 'Characters', value: `${charactersCount} profiles` },
        { label: 'Style Seed', value: 'Octane 8K 3D' },
      ],
      highlights: [
        charactersCount > 0
          ? `${charactersCount} character personas: ${p2?.characters?.map((c) => c.name).join(', ')}`
          : 'Character physical traits and shaders defined',
        'Consistency style seeds and vocal cadence anchors locked',
      ],
      avatars: p2?.characters?.filter((c) => !!c.image_url).map((c) => ({
        name: c.name,
        url: c.image_url!,
      })),
    },
    {
      id: 3,
      title: 'Phase 3: High-Res Scene Keyframes',
      shortTitle: 'Keyframes',
      description: 'Renders cinematic 9:16 vertical keyframe compositions with volumetric lighting.',
      agentModel: p3?.agent_model_used || 'Google Nano Banana Pro',
      status: p3?.status === 'completed' ? 'completed' : p3?.status === 'in_progress' ? 'in_progress' : 'pending',
      icon: ImageIcon,
      metrics: [
        { label: 'Rendered', value: `${keyframesCount}/${scenesCount} frames` },
        { label: 'Lighting', value: 'Caustic Raytracing' },
      ],
      highlights: [
        `${keyframesCount} keyframes rendered in 9:16 vertical framing`,
        'Camera angles and character positions mapped to script',
      ],
      thumbnails: p3?.items?.filter((i) => !!i.image_url).map((i) => i.image_url!),
    },
    {
      id: 4,
      title: 'Phase 4: Veo 3.1 Motion Dynamics',
      shortTitle: 'Motion Prompts',
      description: 'Generates specialized camera physics, rotational orbit cues, and prompt directives.',
      agentModel: p4?.agent_model_used || 'Gemini 3.7 Flash',
      status: p4?.status === 'completed' ? 'completed' : p4?.status === 'in_progress' ? 'in_progress' : 'pending',
      icon: Sparkles,
      metrics: [
        { label: 'Motion Specs', value: `${motionCount} directives` },
        { label: 'Target Engine', value: 'Veo 3.1 Fast' },
      ],
      highlights: [
        'Camera tracking, orbit dynamics, and macro rack focus configured',
        'Physical motion prompts formatted for Veo 3.1 generative engine',
      ],
    },
    {
      id: 5,
      title: 'Phase 5: Video Assembly & Captions',
      shortTitle: 'Video & Captions',
      description: 'Synthesizes video clips, joins audio narration with Gemini TTS, and burns word captions.',
      agentModel: p5?.agent_model_used || 'Google Veo 3.1 Fast',
      status: p5?.status === 'completed' ? 'completed' : p5?.status === 'in_progress' ? 'in_progress' : 'pending',
      icon: Film,
      metrics: [
        { label: 'Output', value: hasFinalVideo ? '1080p Final Video' : 'Processing' },
        { label: 'Subtitles', value: 'Word-Level .ass' },
      ],
      highlights: [
        hasFinalVideo ? 'Full captioned episode rendered & ready for export' : 'Assembling video clips and audio tracks',
        'Gemini 2.5 voiceover synchronized with dynamic karaoke subtitles',
      ],
      hasVideo: hasFinalVideo,
    },
  ];

  // Handle user chat message and draft 5-phase plan
  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || chatInput).trim();
    if (!query) return;

    setChatMessages((prev) => [...prev, { role: 'user', text: query }]);
    setChatInput('');
    setIsDrafting(true);

    // Simulate AI story architect drafting the 5-phase prompt
    setTimeout(() => {
      const generatedTitle = query.length < 30 ? query : 'The Sovereign Prism Frequency';
      const updatedDraft: Partial<PhasePlanDraft> = {
        title: generatedTitle,
        logline: query,
        hook3s: `They thought the secret was buried in stone... until the frequency ignited.`,
        genre: 'Viral 3D Faceted-Crystal Drama',
        aspectRatio: '9:16 Vertical',
        scenesCount: 4,
      };

      setCurrentDraftPlan(updatedDraft);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          text: `I've drafted the 5-phase pipeline for "${generatedTitle}". Opening the pre-flight verification checklist for your approval!`,
        },
      ]);
      setIsDrafting(false);
      setIsApprovalModalOpen(true);
    }, 1200);
  };

  const promptSuggestions = [
    '💎 Obsidian Heiress Gala confrontation',
    '👑 Sapphire & Ruby treaty in mirror cathedral',
    '⚡ Emerald hacker in neon crystal noir',
    '⏳ Clocktower mystery with frozen time shards',
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto select-none">
      {/* Plan Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-[#2b2736] bg-surface-container-low/80 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#2b2736]">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 font-label-sm">
                AI Story Plan Overview
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono text-outline bg-surface-container border border-[#2b2736]">
                <Cpu className="w-3 h-3 text-secondary" />
                {story.models_config?.script_model || 'Gemini 3.7 Flash'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-on-surface tracking-tight truncate font-headline-md">
              {p1?.idea?.title || currentDraftPlan.title || story.prompt || 'Untitled Story'}
            </h1>
            <p className="text-xs text-outline max-w-2xl line-clamp-2 leading-relaxed font-body-sm">
              {p1?.idea?.logline || currentDraftPlan.logline || story.prompt}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center">
            <button
              onClick={() => setIsApprovalModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary-container/20 hover:bg-secondary-container/30 border border-secondary/40 text-secondary font-semibold text-xs transition-all shadow-[0_0_12px_rgba(76,215,246,0.15)] cursor-pointer font-label-sm"
              title="Review and Edit 5-Phase Checklist"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify &amp; Approve</span>
            </button>

            <button
              onClick={() => onExpandPhase(1)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-primary-container to-inverse-primary text-on-primary font-semibold text-xs shadow-[0_0_16px_rgba(160,120,255,0.3)] hover:shadow-[0_0_24px_rgba(160,120,255,0.5)] transition-all cursor-pointer font-label-sm"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Expand Stepper</span>
            </button>
          </div>
        </div>

        {/* Pipeline Progress Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="p-3 rounded-xl bg-surface-container border border-[#2b2736] space-y-1">
            <span className="text-[11px] font-medium text-outline font-label-sm">Total Progress</span>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-on-surface">{progressPercent}%</span>
              <span className="text-[10px] text-secondary font-mono">({phasesCompleted}/5 phases)</span>
            </div>
            <div className="w-full bg-surface-container-lowest rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary-container via-secondary to-tertiary h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(76,215,246,0.3)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-container border border-[#2b2736] space-y-1">
            <span className="text-[11px] font-medium text-outline font-label-sm">Scenes Configured</span>
            <div className="text-base font-bold text-on-surface font-headline-sm">{scenesCount} Scene Beats</div>
            <span className="text-[10px] text-secondary font-mono">9:16 Vertical Video</span>
          </div>

          <div className="p-3 rounded-xl bg-surface-container border border-[#2b2736] space-y-1">
            <span className="text-[11px] font-medium text-outline font-label-sm">Characters Created</span>
            <div className="text-base font-bold text-on-surface font-headline-sm">{charactersCount} Personas</div>
            <span className="text-[10px] text-tertiary font-mono">Octane 3D Shaders</span>
          </div>

          <div className="p-3 rounded-xl bg-surface-container border border-[#2b2736] space-y-1">
            <span className="text-[11px] font-medium text-outline font-label-sm">Video Engine</span>
            <div className="text-base font-bold text-on-surface truncate font-headline-sm">Veo 3.1 Fast</div>
            <span className="text-[10px] text-amber-400 font-mono">1080p Mastered</span>
          </div>
        </div>
      </div>

      {/* Realtime Prompt Stream & Live Script Preview Box */}
      <div className="rounded-xl border border-[#2b2736] p-4 space-y-3 bg-surface-container-low/80 shadow-md">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium text-secondary">
            <Sparkles className="w-3.5 h-3.5 text-secondary animate-spin" />
            <span>Realtime Prompt Stream &amp; Script Breakdown</span>
          </div>
          <span className="text-[11px] text-outline font-label-sm">Pacing: 140 WPM • Scene 1-2 Hook</span>
        </div>

        {/* Script Code Box */}
        <div className="bg-surface-container rounded-lg p-3 text-[11px] font-mono leading-relaxed border border-[#2b2736] space-y-2 text-on-surface max-h-36 overflow-y-auto">
          <p>
            <span className="text-tertiary font-semibold">[SCENE 1 - 0:00-0:05]</span><br />
            <span className="text-secondary">Visual:</span> {p1?.scenes?.[0]?.visual_description || 'Close-up on Marcus holding velvet ring box. Rain against glass.'}<br />
            <span className="text-amber-400">Dialogue:</span> &quot;{p1?.scenes?.[0]?.narration || 'You thought I lost everything Elena... think again.'}&quot;
          </p>
          <p>
            <span className="text-tertiary font-semibold">[SCENE 2 - 0:06-0:15]</span><br />
            <span className="text-secondary">Visual:</span> {p1?.scenes?.[1]?.visual_description || 'Camera whip pan to Elena gasped expression in penthouse ballroom.'}<br />
            <span className="text-amber-400">Audio Cue:</span> Sharp dramatic violin hit + TikTok bass drop.
            <span className="blinking-cursor inline-block w-1.5 h-3 bg-secondary ml-1 align-middle" />
          </p>
        </div>

        <div className="flex items-center justify-between pt-0.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onExpandPhase(1)}
              className="px-2.5 py-1 rounded text-[10px] bg-surface-container hover:bg-surface-container-high border border-[#2b2736] text-outline hover:text-on-surface transition-colors cursor-pointer"
            >
              Re-roll Tone
            </button>
            <button
              onClick={() => onExpandPhase(1)}
              className="px-2.5 py-1 rounded text-[10px] bg-surface-container hover:bg-surface-container-high border border-[#2b2736] text-outline hover:text-on-surface transition-colors cursor-pointer"
            >
              Shorten
            </button>
          </div>
          <button
            onClick={() => onExpandPhase(1)}
            className="text-primary hover:text-secondary underline transition-colors cursor-pointer font-label-sm"
          >
            Edit Beats &rarr;
          </button>
        </div>
      </div>

      {/* AI Story Director Chatbox & Plan Drafter */}
      <div className="rounded-2xl border border-[#2b2736] bg-surface-container-low/80 p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center border border-primary/30">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-on-surface tracking-tight uppercase font-headline-sm">AI Story Director Chat</h3>
              <p className="text-[11px] text-outline font-label-sm">
                Brainstorm or refine story prompts. The AI will draft all 5 phase directives for your approval.
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container text-secondary border border-secondary/30">
            Veo 3.1 + Gemini 3.7
          </span>
        </div>

        {/* Chat message stream */}
        <div className="max-h-36 overflow-y-auto space-y-2 p-3 rounded-xl bg-brand-dark/70 border border-brand-border text-xs custom-scrollbar">
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'agent' && (
                <div className="w-5 h-5 rounded-full bg-brand-violet/20 text-brand-violet flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">
                  AI
                </div>
              )}
              <div
                className={`p-2.5 rounded-xl max-w-lg leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-brand-violet to-brand-pink text-white font-medium shadow-neon-violet'
                    : 'bg-brand-card border border-brand-border text-brand-text'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isDrafting && (
            <div className="flex items-center gap-2 text-xs text-brand-cyan font-medium p-2">
              <WandSparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Drafting 5-phase prompt blueprint & directives...</span>
            </div>
          )}
        </div>

        {/* Preset Prompt Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-medium text-outline mr-1">Suggestions:</span>
          {promptSuggestions.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(sug.slice(2))}
              className="text-[10px] px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-[#2b2736] transition-all cursor-pointer"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Input & Send Action */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 pt-1"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Tell the AI director your story concept (e.g. A sapphire empress confronts an emerald sorcerer at midnight)..."
              disabled={isDrafting}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-surface-container-lowest border border-[#2b2736] text-xs text-on-surface placeholder:text-outline/60 focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isDrafting || !chatInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-surface font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer flex-shrink-0"
          >
            {isDrafting ? (
              <WandSparkles className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Generate Plan</span>
          </button>
        </form>
      </div>

      {/* 5-Phase Agent Plan Step List */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider font-headline-sm">
              Execution Plan Steps
            </h2>
          </div>
          <span className="text-xs text-outline">
            Click any step to inspect generated artifacts
          </span>
        </div>

        <div className="space-y-3">
          {planSteps.map((step) => {
            const Icon = step.icon;
            const isCompleted = step.status === 'completed';
            const isInProgress = step.status === 'in_progress';

            return (
              <div
                key={step.id}
                onClick={() => onExpandPhase(step.id)}
                className="group relative rounded-xl border border-[#2b2736] bg-surface-container-low hover:border-primary/50 transition-all p-4 cursor-pointer shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Step Number, Icon, Titles */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        isCompleted
                          ? 'bg-secondary/15 text-secondary border border-secondary/30 shadow-sm'
                          : isInProgress
                          ? 'bg-tertiary/15 text-tertiary border border-tertiary/30 animate-pulse'
                          : 'bg-surface-container text-outline border border-[#2b2736]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                          {step.title}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isCompleted
                              ? 'bg-secondary/15 text-secondary border border-secondary/30'
                              : isInProgress
                              ? 'bg-tertiary/15 text-tertiary border border-tertiary/30'
                              : 'bg-surface-container text-outline border border-[#2b2736]'
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </>
                          ) : isInProgress ? (
                            <>
                              <Clock className="w-3 h-3 animate-spin" /> In Progress
                            </>
                          ) : (
                            'Pending'
                          )}
                        </span>
                        <span className="text-[10px] font-mono text-outline px-2 py-0.5 rounded bg-surface-container border border-[#2b2736]">
                          {step.agentModel}
                        </span>
                      </div>

                      <p className="text-xs text-on-surface-variant leading-relaxed max-w-2xl">
                        {step.description}
                      </p>

                      {/* Highlights */}
                      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-on-surface-variant">
                        {step.highlights.map((h, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-primary" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Right: Quick Previews & Expand CTA */}
                  <div className="flex items-center gap-3.5 self-end md:self-center flex-shrink-0 pt-2 md:pt-0">
                    {/* Avatars Preview for Phase 2 */}
                    {step.avatars && step.avatars.length > 0 && (
                      <div className="flex items-center -space-x-2">
                        {step.avatars.slice(0, 3).map((av, idx) => (
                          <img
                            key={idx}
                            src={av.url}
                            alt={av.name}
                            className="w-7 h-7 rounded-full object-cover border-2 border-surface shadow"
                            title={av.name}
                          />
                        ))}
                      </div>
                    )}

                    {/* Keyframes Preview for Phase 3 */}
                    {step.thumbnails && step.thumbnails.length > 0 && (
                      <div className="flex items-center gap-1">
                        {step.thumbnails.slice(0, 2).map((thumb, idx) => (
                          <img
                            key={idx}
                            src={thumb}
                            alt=""
                            className="w-6 h-8 rounded object-cover border border-[#2b2736]"
                          />
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExpandPhase(step.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-surface-container group-hover:bg-primary text-on-surface group-hover:text-surface border border-[#2b2736] group-hover:border-primary text-xs font-semibold flex items-center gap-1.5 transition-all shadow cursor-pointer"
                    >
                      <span>Phase Details</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pre-Flight Deployment Checklist Approval Modal */}
      <DeploymentChecklistModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        initialPlan={currentDraftPlan}
        isExecuting={isExecuting}
        onApproveAndExecute={(finalPlan) => {
          setIsApprovalModalOpen(false);
          if (onExecutePlan) {
            onExecutePlan(finalPlan);
          }
        }}
      />
    </div>
  );
}

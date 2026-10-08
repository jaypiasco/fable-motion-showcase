'use client';

import React, { useState } from 'react';
import { StoryDetail } from '../lib/types';
import { AgentPlanView } from './studio/AgentPlanView';
import { PhaseStepperView } from './studio/PhaseStepperView';
import { PhasePlanDraft } from './studio/DeploymentChecklistModal';
import { startStoryRun } from '../lib/api';

interface StudioWorkspaceProps {
  story: StoryDetail;
  onClose?: () => void;
  onGoBack?: () => void;
  onOpenLightbox?: (imageUrl: string, caption?: string) => void;
  onOpenNewStoryModal?: () => void;
  onStoryCreated?: (storyId?: string) => void;
  onTrashStory?: (storyId: string) => void;
  onRestoreStory?: (storyId: string) => void;
  isDrawer?: boolean;
}

export function StudioWorkspace({
  story,
  onClose,
  onGoBack,
  onOpenLightbox,
  onOpenNewStoryModal,
  onStoryCreated,
  onTrashStory,
  onRestoreStory,
  isDrawer = false,
}: StudioWorkspaceProps) {
  // Mode state: 'plan' (overview plan) or 'stepper' (detailed phase execution)
  const [viewMode, setViewMode] = useState<'plan' | 'stepper'>('plan');
  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [execMessage, setExecMessage] = useState<string | null>(null);

  const handleExpandPhase = (phaseIndex: number) => {
    setActivePhaseIndex(phaseIndex);
    setViewMode('stepper');
  };

  const handleBackToPlan = () => {
    setViewMode('plan');
  };

  const handleExecutePlan = async (plan: PhasePlanDraft) => {
    try {
      setIsExecuting(true);
      const promptToRun = `${plan.genre}: ${plan.title}. ${plan.logline} (Hook: ${plan.hook3s})`;
      const res = await startStoryRun(promptToRun, plan.scenesCount || undefined);
      setExecMessage(`Pipeline launched for "${plan.title}"! Navigating to Phase 1...`);
      setTimeout(() => {
        setExecMessage(null);
        if (onStoryCreated) {
          onStoryCreated(res.story_id);
        }
        setActivePhaseIndex(1);
        setViewMode('stepper');
      }, 1500);
    } catch (err: any) {
      alert(`Error starting pipeline: ${err.message || err}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Calculate overall pipeline progress
  const p1 = story.phases?.phase_1_script;
  const p2 = story.phases?.phase_2_characters;
  const p3 = story.phases?.phase_3_images;
  const p4 = story.phases?.phase_4_animation_prompts;
  const p5 = story.phases?.phase_5_video_generation;

  const completedCount = [
    p1?.status === 'completed',
    p2?.status === 'completed',
    p3?.status === 'completed',
    p4?.status === 'completed',
    p5?.status === 'completed',
  ].filter(Boolean).length;

  const progressPercent = Math.min(100, Math.round((completedCount / 5) * 100));

  return (
    <aside
      className={`flex flex-col h-full bg-surface-container-lowest/95 backdrop-blur-2xl text-on-surface ${
        isDrawer ? 'border-l border-[#2b2736]' : ''
      } select-none overflow-hidden`}
      data-purpose="production-pipeline-sidebar"
    >
      {/* 1. Pipeline Header & Real-time Progress Bar */}
      <div className="p-space-md border-b border-[#2b2736] bg-surface-container/60 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-primary">
                Workflow Pipeline
              </span>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-md text-outline hover:text-on-surface hover:bg-surface-container transition-colors md:hidden cursor-pointer"
                  title="Close Sidebar"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
            <p className="font-headline-sm text-sm font-semibold text-on-surface truncate max-w-[240px] mt-0.5">
              {p1?.idea?.title || story.prompt || 'Task Plan & Production'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-primary/15 border border-primary/30 text-primary">
              Phase {activePhaseIndex} of 5
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="hidden md:flex p-1 rounded-md text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                title="Close Inspector"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Animated Progress Indicator Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-label-sm font-label-sm text-outline mb-1.5">
            <span>Overall Pipeline Progress</span>
            <span className="text-secondary font-mono font-medium">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-container border border-[#2b2736] overflow-hidden p-0.5">
            {progressPercent > 0 && (
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            )}
          </div>
        </div>
      </div>

      {/* 2. Scrollable Body Content: Overview Plan or Phase Details */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-space-md space-y-space-md">
        {/* Execution toast notification */}
        {execMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in shadow-lg">
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
            <span>{execMessage}</span>
          </div>
        )}

        {/* Hidden / Trashed Notification banner */}
        {story.is_trashed && (
          <div className="p-3 rounded-xl bg-secondary-container/15 border border-secondary/30 text-secondary flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              <span>
                <strong>Archived:</strong> This story is in Story Archive.
              </span>
            </div>
            {onRestoreStory && (
              <button
                onClick={() => onRestoreStory(story.story_id)}
                className="px-2.5 py-1 rounded-lg bg-secondary-container/30 hover:bg-secondary-container/40 text-secondary font-semibold flex items-center gap-1 transition-all border border-secondary/40 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">restore_from_trash</span>
                <span>Restore</span>
              </button>
            )}
          </div>
        )}

        {/* Dual View: Plan Overview vs Stepper Details */}
        {viewMode === 'plan' ? (
          <AgentPlanView
            story={story}
            onExpandPhase={handleExpandPhase}
            onOpenLightbox={onOpenLightbox}
            onExecutePlan={handleExecutePlan}
            isExecuting={isExecuting}
          />
        ) : (
          <PhaseStepperView
            story={story}
            activePhase={activePhaseIndex}
            onSelectPhase={setActivePhaseIndex}
            onBackToPlan={handleBackToPlan}
            onOpenLightbox={onOpenLightbox}
            onTrashStory={onTrashStory}
            onRestoreStory={onRestoreStory}
          />
        )}
      </div>

      {/* 3. Task Sidebar Bottom Controls & Plan Approval Buttons */}
      <div className="p-4 border-t border-white/[0.06] bg-[#0d0a17] space-y-2 shrink-0" data-purpose="pipeline-action-footer">
        {/* Primary CTA Button with Gradient */}
        <button
          type="button"
          onClick={() => {
            if (viewMode === 'plan') {
              handleExpandPhase(Math.min(activePhaseIndex + 1, 5));
            } else {
              setActivePhaseIndex((prev) => Math.min(prev + 1, 5));
            }
          }}
          className="w-full h-10 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.25)] transition-all cursor-pointer active:scale-95"
        >
          <span>Approve Plan and Proceed</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>

        {/* Secondary Pipeline Actions */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => {
              if (onOpenNewStoryModal) onOpenNewStoryModal();
            }}
            className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            Request Alternate Script
          </button>
          <button
            type="button"
            onClick={() => {
              if (onTrashStory) onTrashStory(story.story_id);
            }}
            className="text-[11px] text-slate-400 hover:text-secondary transition-colors cursor-pointer flex items-center gap-1"
            title="Move story to Story Archive"
          >
            <span className="material-symbols-outlined text-[14px]">inventory_2</span>
            <span>Archive Story</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

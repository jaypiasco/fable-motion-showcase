'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SystemStatus } from '../lib/types';
import { supabase } from '../lib/supabase';

import { useRouter } from 'next/navigation';

export type AssetCategory =
  | 'all'
  | 'episodes'
  | 'key_scenes'
  | 'keyframes'
  | 'characters'
  | 'motion'
  | 'audio'
  | 'final_renders'
  | 'drafts'
  | 'trash';

interface SidebarProps {
  selectedCategory: AssetCategory;
  onSelectCategory: (cat: AssetCategory) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onOpenNewStory: () => void;
  onOpenAuth: () => void;
  onGoToLanding: () => void;
  onGoToCreate?: () => void;
  activePage?: 'home' | 'create' | 'upload' | 'library';
  onFocusSearch?: () => void;
  systemStatus: SystemStatus | null;
  storiesCount?: number;
  trashedCount?: number;
  activeStorySequences?: Array<{ scene_id: number; title: string }>;
  onSelectSequence?: (sceneId: number) => void;
}

export function Sidebar({
  selectedCategory,
  onSelectCategory,
  collapsed,
  setCollapsed,
  onOpenNewStory,
  onOpenAuth,
  onGoToLanding,
  onGoToCreate,
  activePage = 'home',
  onFocusSearch,
  systemStatus,
  storiesCount = 0,
  trashedCount = 0,
  activeStorySequences = [],
  onSelectSequence,
}: SidebarProps) {
  const router = useRouter();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountMenuOpen]);

  const isDaemonRunning = !!systemStatus?.is_running;
  const queueCount = systemStatus?.queue_count || 0;

  // Collapsed rail mode
  if (collapsed) {
    return (
      <aside className="fixed left-0 top-0 h-full w-16 bg-surface-container-lowest/95 backdrop-blur-2xl z-50 flex flex-col justify-between items-center py-4 px-2 border-r border-[#2b2736]/60 shadow-[0_4px_30px_rgba(0,0,0,0.5)] select-none">
        <div className="flex flex-col items-center gap-4 w-full">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="navbar-logo flex items-center justify-center cursor-pointer p-0 bg-transparent border-none"
            title="Expand Sidebar"
          >
            <img
              src="/fablemotion-icon.png"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-dm5dHUNYqcaoUz9luEfkBqi9qWVgTnsj1yv2A7xxBHLmbTNnzNjeEc2Dzyvw3_tLZ0hNNW-bboaz5mlQPCy4P2AHw-mAAP9cIVv2Qtry27gv0duw2A3gp2yhbB653vZpOgQB7klNwLQUR5Zdl_eefjo_Vnus_h4AlHYPrethZ8kvxYtKQ1oChl_pqpDrTLkBympPTLbVAZDLJCnGqSqeVr95xCzx-GTQoLYNOh22-ad6T4K0a7jNFQcMBsetU9sHGAE';
              }}
              alt="FableMotion"
              className="navbar-logo rounded-lg hover:scale-105 transition-transform"
            />
          </button>
          <button
            type="button"
            onClick={onOpenNewStory}
            className="w-10 h-10 rounded-xl bg-primary-container/20 border border-primary/40 text-primary flex items-center justify-center hover:bg-primary-container/30 transition-all shadow-[0_0_16px_rgba(160,120,255,0.25)]"
            title="+ New Story Project"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
          <div className="w-8 h-px bg-[#2b2736] my-1" />
          <button
            type="button"
            onClick={() => {
              router.push('/library');
            }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              activePage === 'library' || (activePage === 'home' && selectedCategory === 'all')
                ? 'bg-surface-container-high text-primary font-bold shadow-[inset_0_0_12px_rgba(208,188,255,0.12)]'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
            title="Studio Stories & Library"
          >
            <span className="material-symbols-outlined text-[18px]">movie</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (activePage !== 'home') {
                router.push('/?category=trash');
              } else {
                onSelectCategory('trash');
              }
            }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              selectedCategory === 'trash'
                ? 'bg-surface-container-high text-secondary font-bold'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
            title="Subscription"
          >
            <span className="material-symbols-outlined text-[18px]">loyalty</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectCategory('characters')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              selectedCategory === 'characters'
                ? 'bg-surface-container-high text-tertiary font-bold'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
            title="Assets & Characters"
          >
            <span className="material-symbols-outlined text-[18px]">group_work</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (onGoToCreate) onGoToCreate();
              else router.push('/create');
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors relative"
            title="Create & Generate (Workflow Pipeline)"
          >
            <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/upload')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors relative ${
              activePage === 'upload'
                ? 'bg-surface-container-high text-secondary font-bold shadow-[inset_0_0_12px_rgba(76,215,246,0.15)] border border-secondary/30'
                : 'text-on-surface-variant hover:text-secondary hover:bg-surface-container'
            }`}
            title="Upload Stories (Multi-Channel Deployment Hub)"
          >
            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors relative"
            title="Prompt Library"
          >
            <span className="material-symbols-outlined text-[18px]">collections_bookmark</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="w-8 h-8 rounded-lg text-outline hover:text-on-surface flex items-center justify-center hover:bg-surface-container transition-colors"
          title="Expand Sidebar"
        >
          <span className="material-symbols-outlined text-[20px]">dock_to_right</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-surface-container-lowest/90 backdrop-blur-2xl z-50 flex flex-col justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)] border-r border-[#2b2736]/40 select-none">
      <div className="flex flex-col flex-1 overflow-y-auto px-space-md py-space-md custom-scrollbar">
        {/* FableMotion Branding */}
        <div className="flex items-center justify-between px-space-xs mb-space-lg">
          <div
            onClick={onGoToLanding}
            className="flex items-center space-x-2.5 cursor-pointer group"
            title="Return to FableMotion Landing"
          >
            <img
              alt="FableMotion"
              className="navbar-logo rounded-lg transition-transform group-hover:scale-105 shrink-0"
              src="/fablemotion-icon.png"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-dm5dHUNYqcaoUz9luEfkBqi9qWVgTnsj1yv2A7xxBHLmbTNnzNjeEc2Dzyvw3_tLZ0hNNW-bboaz5mlQPCy4P2AHw-mAAP9cIVv2Qtry27gv0duw2A3gp2yhbB653vZpOgQB7klNwLQUR5Zdl_eefjo_Vnus_h4AlHYPrethZ8kvxYtKQ1oChl_pqpDrTLkBympPTLbVAZDLJCnGqSqeVr95xCzx-GTQoLYNOh22-ad6T4K0a7jNFQcMBsetU9sHGAE';
              }}
            />
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm tracking-tight text-white leading-none group-hover:text-primary transition-colors">
                FableMotion
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 mt-1">
                Studio OS
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Collapse Sidebar"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
        </div>

        {/* CTA Button: + New Story Project */}
        <div className="mb-space-lg">
          <button
            onClick={onOpenNewStory}
            className="w-full flex items-center justify-center gap-space-xs py-space-sm px-space-md rounded-xl bg-gradient-to-r from-primary-container to-inverse-primary text-on-primary font-headline-sm text-label-lg shadow-[0_0_24px_rgba(160,120,255,0.35)] hover:shadow-[0_0_32px_rgba(160,120,255,0.6)] hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ New Story Project</span>
          </button>
        </div>

        {/* Core Suite Navigation */}
        <div className="mb-space-lg">
          <div className="px-space-xs mb-space-xs font-label-sm text-label-sm uppercase tracking-wider text-outline">
            Core Suite
          </div>
          <nav className="space-y-space-3xs">
            <button
              type="button"
              onClick={() => {
                if (onGoToCreate) onGoToCreate();
                else router.push('/create');
              }}
              className={`w-full flex items-center justify-between gap-space-sm px-space-sm py-space-xs rounded-lg transition-all font-body-md text-body-md text-left ${
                activePage === 'create'
                  ? 'bg-purple-500/10 text-purple-200 border border-purple-500/20 font-medium'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[20px] text-purple-400">auto_fix_high</span>
                <span>Create &amp; Generate</span>
              </div>
              {activePage === 'create' && (
                <span className="size-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_#a855f7]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                router.push('/library');
              }}
              className={`w-full flex items-center justify-between px-space-sm py-space-xs rounded-lg transition-all font-body-md text-body-md text-left ${
                activePage === 'library' || (activePage === 'home' && (selectedCategory === 'all' || selectedCategory === 'episodes'))
                  ? 'bg-surface-container-high text-primary font-bold shadow-[inset_0_0_12px_rgba(208,188,255,0.08)]'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[20px] text-primary">movie</span>
                <span>Studio Stories &amp; Library</span>
              </div>
            </button>


            <button
              type="button"
              onClick={() => router.push('/upload')}
              className={`w-full flex items-center justify-between px-space-sm py-space-xs rounded-lg transition-all font-body-md text-body-md text-left cursor-pointer ${
                activePage === 'upload'
                  ? 'bg-surface-container-high text-secondary font-bold shadow-[inset_0_0_12px_rgba(76,215,246,0.12)] border border-secondary/30'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[20px] text-secondary">cloud_upload</span>
                <span>Upload Stories</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/15 border border-secondary/30 text-secondary font-mono uppercase font-semibold">
                Deploy
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (activePage !== 'home') {
                  router.push('/?category=characters');
                } else {
                  onSelectCategory('characters');
                }
              }}
              className={`w-full flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg transition-all font-body-md text-body-md text-left ${
                activePage === 'home' && selectedCategory === 'characters'
                  ? 'bg-surface-container-high text-tertiary font-bold shadow-[inset_0_0_12px_rgba(255,176,205,0.1)]'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] text-tertiary">group_work</span>
              <span>Assets &amp; Characters</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (activePage !== 'home') {
                  router.push('/?category=trash');
                } else {
                  onSelectCategory('trash');
                }
              }}
              className={`w-full flex items-center justify-between px-space-sm py-space-xs rounded-lg transition-all font-body-md text-body-md text-left ${
                activePage === 'home' && selectedCategory === 'trash'
                  ? 'bg-surface-container-high text-secondary font-bold shadow-[inset_0_0_12px_rgba(76,215,246,0.1)]'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[20px] text-secondary">loyalty</span>
                <span>Subscription</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onFocusSearch) onFocusSearch();
              }}
              className="w-full flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all font-body-md text-body-md text-left"
            >
              <span className="material-symbols-outlined text-[20px] text-outline">collections_bookmark</span>
              <span>Prompt Library</span>
            </button>
          </nav>
        </div>

        {/* Sequences Folder List */}
        <div className="mb-space-md">
          <div className="flex items-center justify-between px-space-xs mb-space-xs">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Sequences
            </span>
            <button
              type="button"
              onClick={onOpenNewStory}
              className="material-symbols-outlined text-[16px] text-outline cursor-pointer hover:text-on-surface p-0.5 rounded"
              title="Add Sequence / Story"
            >
              create_new_folder
            </button>
          </div>
          <div className="space-y-space-3xs font-body-sm text-body-sm">
            {activeStorySequences.length === 0 ? (
              <p className="px-space-sm py-space-3xs text-on-surface-variant">No sequences yet</p>
            ) : activeStorySequences.map((seq, idx) => (
              <div
                key={seq.scene_id}
                onClick={() => onSelectSequence?.(seq.scene_id)}
                className="flex items-center gap-space-xs px-space-sm py-space-3xs rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer hover:text-on-surface transition-colors truncate"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary flex-shrink-0">
                  {idx === 0 ? 'folder_open' : 'folder'}
                </span>
                <span className="truncate">{seq.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Status & User Account Box */}
      <div className="p-space-md bg-surface-container-lowest/95 border-t border-[#2b2736]/40 space-y-space-sm shrink-0">
        {/* H100 Node Status Pill */}
        <div className="flex items-center justify-between p-space-xs rounded-xl bg-surface-container-low/70 border border-[#2b2736]/40">
          <div className="flex items-center gap-space-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            <span className="font-label-sm text-label-sm text-on-surface font-medium">
              {isDaemonRunning ? 'H100 Node Active' : 'Cluster Node Standby'}
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-secondary font-mono">
            {queueCount > 0 ? `${queueCount} rendering` : '14ms latency'}
          </span>
        </div>

        {/* Sidebar Bottom: Floating Profile Dropup & Account Information */}
        <div className="relative pt-2" ref={accountMenuRef}>
          {/* Floating Glassmorphic Account Dropup Menu */}
          {accountMenuOpen && (
            <div
              className="absolute bottom-full left-0 right-0 glass-panel w-full rounded-xl p-2.5 mb-2 shadow-neon-violet/20 border border-brand-violet/30 flex flex-col gap-1 text-xs z-50 animate-in fade-in slide-in-from-bottom-2"
              data-purpose="account-dropup-menu"
            >
              <button
                type="button"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-brand-violet/20 text-brand-text hover:text-white transition-colors cursor-pointer w-full text-left"
                onClick={(e) => {
                  e.preventDefault();
                  setAccountMenuOpen(false);
                  onOpenAuth();
                }}
              >
                <svg className="w-4 h-4 text-brand-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  ></path>
                </svg>
                <span>Profile</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-brand-violet/20 text-brand-text hover:text-white transition-colors cursor-pointer w-full text-left"
                onClick={(e) => {
                  e.preventDefault();
                  setAccountMenuOpen(false);
                  onOpenAuth();
                }}
              >
                <svg className="w-4 h-4 text-brand-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  ></path>
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
                <span>Account Settings</span>
              </button>
              <div className="h-px bg-brand-border/60 my-0.5"></div>
              <button
                type="button"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-brand-pink/20 text-brand-pink transition-colors cursor-pointer w-full text-left"
                onClick={async (e) => {
                  e.preventDefault();
                  setAccountMenuOpen(false);
                  try {
                    await supabase.auth.signOut();
                  } catch (err) {
                    console.error('Logout error:', err);
                  }
                  onGoToLanding();
                }}
              >
                <svg className="w-4 h-4 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  ></path>
                </svg>
                <span>Log Out</span>
              </button>
            </div>
          )}

          <div
            onClick={() => setAccountMenuOpen(!accountMenuOpen)}
            className="flex items-center justify-between p-space-xs rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer border border-[#2b2736]/30"
          >
            <div className="flex items-center gap-space-xs min-w-0">
              <div className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md text-on-surface leading-tight truncate">
                  Althea Vance
                </span>
                <span className="font-label-sm text-label-sm text-outline truncate">
                  Enterprise Studio Tier
                </span>
              </div>
            </div>
            <span className={`material-symbols-outlined text-outline text-[18px] flex-shrink-0 transition-transform duration-200 ${accountMenuOpen ? 'rotate-180 text-primary' : ''}`}>
              expand_less
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

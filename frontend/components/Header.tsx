'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ModelsConfig, SystemStatus } from '../lib/types';
import { TopbarProfileMenu } from './TopbarProfileMenu';

interface HeaderProps {
  storyTitle?: string;
  categoryLabel?: string;
  viewMode: 'grid' | 'list';
  onSetViewMode: (mode: 'grid' | 'list') => void;
  inspectorOpen?: boolean;
  onToggleInspector?: () => void;
  onOpenNewStory: () => void;
  onRefresh: () => void;
  onOpenAuth: () => void;
  onGoToLanding: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: string;
  onSortChange: (s: string) => void;
  modelsConfig: ModelsConfig | null;
  systemStatus: SystemStatus | null;
  storiesList?: Array<{ story_id: string; title: string }>;
  onSelectStory?: (id: string) => void;
}

export function Header({
  storyTitle = 'Neo-Kyoto 2089',
  categoryLabel = 'Studio Stories',
  viewMode,
  onSetViewMode,
  inspectorOpen = false,
  onToggleInspector,
  onOpenNewStory,
  onRefresh,
  onOpenAuth,
  onGoToLanding,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  modelsConfig,
  systemStatus,
  storiesList = [],
  onSelectStory,
}: HeaderProps) {
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cmd+K shortcut to focus search input
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

  return (
    <header className="h-16 bg-surface/85 backdrop-blur-xl z-40 flex items-center justify-between px-space-lg border-b border-[#2b2736]/50 shadow-[0_1px_8px_rgba(0,0,0,0.25)] select-none shrink-0 sticky top-0">
      {/* Left: Branding icon & Breadcrumb Navigation */}
      <div className="flex items-center space-x-3 text-xs min-w-0">
        <div
          onClick={onGoToLanding}
          className="flex items-center space-x-2.5 font-medium tracking-wide cursor-pointer group"
          title="FableMotion Home"
        >
          <img
            src="/fablemotion-icon.png"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-dm5dHUNYqcaoUz9luEfkBqi9qWVgTnsj1yv2A7xxBHLmbTNnzNjeEc2Dzyvw3_tLZ0hNNW-bboaz5mlQPCy4P2AHw-mAAP9cIVv2Qtry27gv0duw2A3gp2yhbB653vZpOgQB7klNwLQUR5Zdl_eefjo_Vnus_h4AlHYPrethZ8kvxYtKQ1oChl_pqpDrTLkBympPTLbVAZDLJCnGqSqeVr95xCzx-GTQoLYNOh22-ad6T4K0a7jNFQcMBsetU9sHGAE';
            }}
            alt="FableMotion"
            className="navbar-logo rounded-lg transition-transform group-hover:scale-105"
          />
          <span className="text-white font-semibold tracking-tight text-sm">FableMotion</span>
        </div>
        <span className="text-slate-600 font-mono hidden md:inline">/</span>
        <span
          onClick={onGoToLanding}
          className="text-slate-400 hover:text-slate-200 cursor-pointer transition text-xs font-normal hidden md:inline truncate"
        >
          Studio
        </span>
        <span className="text-slate-600 font-mono hidden md:inline">/</span>

          {/* Active Story Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="text-secondary hover:underline cursor-pointer flex items-center gap-1 font-semibold max-w-[200px] truncate"
            >
              <span className="truncate">{storyTitle}</span>
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </button>

            {projectDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 p-2 rounded-xl bg-surface-container-high border border-[#2b2736] shadow-2xl z-50 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[11px] font-label-sm uppercase tracking-wider text-outline">
                  Switch Story Project
                </div>
                <div className="max-h-56 overflow-y-auto custom-scrollbar my-1 space-y-1">
                  {storiesList.length > 0 ? (
                    storiesList.map((s) => (
                      <button
                        key={s.story_id}
                        type="button"
                        onClick={() => {
                          onSelectStory?.(s.story_id);
                          setProjectDropdownOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors truncate"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />
                        <span className="truncate">{s.title}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-xs text-outline italic">No projects yet</div>
                  )}
                </div>
                <div className="pt-1.5 border-t border-[#2b2736]/60">
                  <button
                    type="button"
                    onClick={() => {
                      setProjectDropdownOpen(false);
                      onOpenNewStory();
                    }}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Create New Story Project</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="material-symbols-outlined text-[14px] text-outline/60">chevron_right</span>
          <span className="text-on-surface truncate">{categoryLabel}</span>
      </div>

      {/* Center: Search Scenes & Embeddings Input (Cmd+K) */}
      <div className="flex-1 max-w-md mx-space-md hidden md:block">
        <div className="relative flex items-center w-full">
          <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
            search
          </span>
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-surface-container-low text-on-surface placeholder:text-outline pl-9 pr-space-md py-space-2xs rounded-xl font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-inner border border-[#2b2736]/50 transition-all"
            placeholder="Search scenes, prompt embeddings, latents (Cmd+K)..."
            type="text"
          />
        </div>
      </div>

      {/* Right Action Cluster */}
      <div className="flex items-center gap-space-sm shrink-0">
        {/* Revisions Button */}
        <button
          className="flex items-center gap-space-3xs px-space-sm py-space-2xs rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all font-label-sm text-label-sm border border-[#2b2736]/40 cursor-pointer"
          type="button"
          title="Timeline Revisions"
        >
          <span className="material-symbols-outlined text-[16px]">history</span>
          <span className="hidden lg:inline">Revisions</span>
        </button>

        {/* Export Button */}
        <button
          className="flex items-center gap-space-3xs px-space-sm py-space-2xs rounded-lg bg-secondary-container/20 text-secondary hover:bg-secondary-container/30 transition-all font-label-sm text-label-sm shadow-[0_0_12px_rgba(76,215,246,0.2)] border border-secondary/30 cursor-pointer"
          type="button"
          title="Export Video / Fountain Script"
        >
          <span className="material-symbols-outlined text-[16px]">file_download</span>
          <span>Export</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer border border-[#2b2736]/40"
          type="button"
          title="Refresh Data"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
        </button>

        {/* Side Inspector Toggle Button */}
        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer border ${
              inspectorOpen
                ? 'bg-primary-container/25 text-primary border-primary/50 shadow-[0_0_12px_rgba(160,120,255,0.3)]'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface border-[#2b2736]/40'
            }`}
            type="button"
            title={inspectorOpen ? 'Collapse Pipeline Inspector' : 'Open Pipeline Inspector'}
          >
            <span className="material-symbols-outlined text-[18px]">dock_to_left</span>
          </button>
        )}

        {/* Notifications Icon with Ping Dot */}
        <div
          className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer border border-[#2b2736]/40 transition-colors"
          title="Notifications & System Activity"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
        </div>

        {/* User Profile Avatar & Dropdown */}
        <TopbarProfileMenu onOpenAuth={onOpenAuth} />
      </div>
    </header>
  );
}

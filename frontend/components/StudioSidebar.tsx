'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthModal } from './AuthModal';
import { WhitelistModal } from './WhitelistModal';

export interface StudioSidebarProps {
  activePage: 'create' | 'library' | 'upload' | 'editor' | 'assets';
  sequences?: Array<{ id: number | string; title: string; duration?: string }>;
  isAdmin?: boolean;
  testToolsVisible?: boolean;
  onTestToolsVisibilityChange?: (visible: boolean) => void;
  onNewStoryProject?: () => void;
  userInitials?: string;
  userName?: string;
  userTier?: string;
  user?: User | null;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  onAssetsClick?: () => void;
  extraContent?: React.ReactNode;
  hideBrandHeader?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  defaultCollapsed?: boolean;
}

export function StudioSidebar({
  activePage,
  sequences = [],
  isAdmin = false,
  testToolsVisible = true,
  onTestToolsVisibilityChange,
  onNewStoryProject,
  userInitials = 'AV',
  userName = 'Studio Creator',
  userTier = 'Enterprise Tier',
  user: initialUser,
  onOpenSettings,
  onOpenProfile,
  onLogout,
  onAssetsClick,
  extraContent,
  hideBrandHeader = false,
  isCollapsed: propIsCollapsed,
  onToggleCollapse,
  defaultCollapsed = false,
}: StudioSidebarProps) {
  const router = useRouter();
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : internalCollapsed;

  const [currentUser, setCurrentUser] = useState<User | null>(initialUser ?? null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [whitelistModalOpen, setWhitelistModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function syncAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (mounted) {
          setCurrentUser(user);
        }
      } catch {
        if (mounted) {
          setCurrentUser(null);
        }
      }
    }

    if (initialUser === undefined) {
      syncAuth();
    } else {
      setCurrentUser(initialUser);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setCurrentUser(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [initialUser]);

  const isGuest = !currentUser || userTier === 'Guest Tier';

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((c) => !c);
    }
  };

  const [dropupOpen, setDropupOpen] = useState(false);
  const dropupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!dropupOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropupRef.current && !dropupRef.current.contains(e.target as Node)) {
        setDropupOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropupOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropupOpen]);

  const handleProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    setDropupOpen(false);
  };

  const handleAccountSettings = (e: React.MouseEvent) => {
    e.preventDefault();
    setDropupOpen(false);
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    setDropupOpen(false);
    if (onLogout) {
      onLogout();
      return;
    }
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Failed to log out:', err);
    }
    router.push('/landing');
  };

  const handleNewProject = () => {
    if (onNewStoryProject) {
      onNewStoryProject();
    } else {
      router.push('/create');
    }
  };

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } shrink-0 bg-obsidian-950 relative ${
        hideBrandHeader ? '' : 'border-r border-white/[0.07]'
      } flex flex-col justify-between ${
        hideBrandHeader ? 'h-full pt-14' : 'h-screen sticky top-0'
      } z-40 font-sans select-none transition-[width] duration-200`}
      data-purpose="navigation-rail"
    >
      {/* Anchored Side Toggle Tab */}
      <button
        type="button"
        onClick={toggleCollapse}
        className="absolute top-5 left-full z-30 w-6 h-9 rounded-r-md bg-obsidian-950 border-y border-r border-white/[0.12] text-slate-400 hover:text-white hover:bg-obsidian-900 flex items-center justify-center transition cursor-pointer shadow-md"
        title={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          {isCollapsed ? (
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </button>

      {/* Brand Header */}
      {!hideBrandHeader && (
        <div className={`h-14 border-b border-white/[0.07] ${isCollapsed ? 'px-2 justify-center' : 'px-3 justify-between'} flex items-center shrink-0 bg-obsidian-950/90`}>
          <div
            onClick={() => router.push('/')}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2.5'} cursor-pointer group min-w-0`}
            title="Return to Studio Home"
          >
            <img
              src="/fablemotion-icon.png"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuD-dm5dHUNYqcaoUz9luEfkBqi9qWVgTnsj1yv2A7xxBHLmbTNnzNjeEc2Dzyvw3_tLZ0hNNW-bboaz5mlQPCy4P2AHw-mAAP9cIVv2Qtry27gv0duw2A3gp2yhbB653vZpOgQB7klNwLQUR5Zdl_eefjo_Vnus_h4AlHYPrethZ8kvxYtKQ1oChl_pqpDrTLkBympPTLbVAZDLJCnGqSqeVr95xCzx-GTQoLYNOh22-ad6T4K0a7jNFQcMBsetU9sHGAE';
              }}
              alt="FableMotion"
              className="navbar-logo rounded-lg transition-transform group-hover:scale-105 shrink-0"
            />
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-white font-semibold tracking-tight text-sm leading-tight group-hover:text-accent-violet transition-colors truncate">
                  FableMotion
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  Studio OS
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Nav Items */}
      <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
        <div className={isCollapsed ? 'p-2 flex justify-center' : 'p-3'}>
          <button
            type="button"
            onClick={handleNewProject}
            className={`${
              isCollapsed
                ? 'w-10 h-10 rounded-lg p-0'
                : 'w-full py-2 px-3 rounded-lg space-x-2'
            } bg-accent-violet/15 hover:bg-accent-violet/25 text-accent-violet border border-accent-violet/30 flex items-center justify-center transition font-medium text-xs shadow-sm cursor-pointer`}
            title="New Story Project"
            aria-label="New Story Project"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            {!isCollapsed && <span>New Story Project</span>}
          </button>
        </div>

        <div className={isCollapsed ? 'px-2 py-1 space-y-4' : 'px-3 py-1 space-y-5'}>
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
                Core Suite
              </div>
            )}
            <nav className="space-y-0.5">
              <button
                type="button"
                onClick={() => router.push('/create')}
                className={`${
                  isCollapsed
                    ? 'w-10 h-10 mx-auto justify-center'
                    : 'w-full space-x-2.5 px-2.5 py-1.5'
                } relative flex items-center rounded-lg text-xs transition cursor-pointer ${
                  activePage === 'create'
                    ? 'font-medium text-white bg-accent-violet/20 border border-accent-violet/30'
                    : 'text-slate-200 hover:text-white hover:bg-white/[0.06]'
                }`}
                title="Create & Generate"
                aria-label="Create & Generate"
              >
                <svg
                  className={`w-4 h-4 shrink-0 ${activePage === 'create' ? 'text-accent-violet' : 'text-slate-300'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  ></path>
                </svg>
                {!isCollapsed && (
                  <span className={`flex-1 text-left truncate ${activePage === 'create' ? 'text-accent-violet font-semibold' : ''}`}>
                    Create &amp; Generate
                  </span>
                )}
                {activePage === 'create' && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-accent-violet rounded-r"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => router.push('/library')}
                className={`${
                  isCollapsed
                    ? 'w-10 h-10 mx-auto justify-center'
                    : 'w-full space-x-2.5 px-2.5 py-1.5'
                } relative flex items-center rounded-lg text-xs transition cursor-pointer ${
                  activePage === 'library'
                    ? 'font-medium text-white bg-accent-violet/20 border border-accent-violet/30'
                    : 'text-slate-200 hover:text-white hover:bg-white/[0.06]'
                }`}
                title="Studio Stories"
                aria-label="Studio Stories"
              >
                <svg
                  className={`w-4 h-4 shrink-0 ${activePage === 'library' ? 'text-accent-violet' : 'text-slate-300'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  ></path>
                </svg>
                {!isCollapsed && (
                  <span className={`flex-1 text-left truncate ${activePage === 'library' ? 'text-accent-violet font-semibold' : ''}`}>
                    Studio Stories
                  </span>
                )}
                {activePage === 'library' && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-accent-violet rounded-r"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => router.push('/editor')}
                className={`${
                  isCollapsed
                    ? 'w-10 h-10 mx-auto justify-center'
                    : 'w-full space-x-2.5 px-2.5 py-1.5'
                } relative flex items-center rounded-lg text-xs transition cursor-pointer ${
                  activePage === 'editor'
                    ? 'font-medium text-white bg-accent-violet/20 border border-accent-violet/30'
                    : 'text-slate-200 hover:text-white hover:bg-white/[0.06]'
                }`}
                title="Studio Editor"
                aria-label="Studio Editor"
              >
                <svg
                  className={`w-4 h-4 shrink-0 ${activePage === 'editor' ? 'text-accent-violet' : 'text-slate-300'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  ></path>
                </svg>
                {!isCollapsed && (
                  <span className={`flex-1 text-left truncate ${activePage === 'editor' ? 'text-accent-violet font-semibold' : ''}`}>
                    Studio Editor
                  </span>
                )}
                {activePage === 'editor' && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-accent-violet rounded-r"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => router.push('/upload')}
                className={`${
                  isCollapsed
                    ? 'w-10 h-10 mx-auto justify-center'
                    : 'w-full space-x-2.5 px-2.5 py-1.5'
                } relative flex items-center rounded-lg text-xs transition cursor-pointer ${
                  activePage === 'upload'
                    ? 'font-medium text-white bg-accent-violet/20 border border-accent-violet/30'
                    : 'text-slate-200 hover:text-white hover:bg-white/[0.06]'
                }`}
                title="Deployment Hub"
                aria-label="Deployment Hub"
              >
                <svg
                  className={`w-4 h-4 shrink-0 ${activePage === 'upload' ? 'text-accent-violet' : 'text-slate-300'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  ></path>
                </svg>
                {!isCollapsed && (
                  <span className={`flex-1 text-left truncate ${activePage === 'upload' ? 'text-accent-violet font-semibold' : ''}`}>
                    Deployment Hub
                  </span>
                )}
                {activePage === 'upload' && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-accent-violet rounded-r"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => router.push('/assets')}
                className={`${
                  isCollapsed
                    ? 'w-10 h-10 mx-auto justify-center'
                    : 'w-full space-x-2.5 px-2.5 py-1.5'
                } relative flex items-center rounded-lg text-xs transition cursor-pointer ${
                  activePage === 'assets'
                    ? 'font-medium text-white bg-accent-violet/20 border border-accent-violet/30'
                    : 'text-slate-200 hover:text-white hover:bg-white/[0.06]'
                }`}
                title="Assets & Characters"
                aria-label="Assets & Characters"
              >
                <svg
                  className={`w-4 h-4 shrink-0 ${activePage === 'assets' ? 'text-accent-violet' : 'text-slate-300'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  ></path>
                </svg>
                {!isCollapsed && (
                  <span className={`flex-1 text-left truncate ${activePage === 'assets' ? 'text-accent-violet font-semibold' : ''}`}>
                    Assets &amp; Characters
                  </span>
                )}
                {activePage === 'assets' && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-accent-violet rounded-r"></span>
                )}
              </button>
            </nav>
          </div>

          {!isCollapsed && extraContent}

          {!isCollapsed && (
            <div className="space-y-1 pt-1">
              <div className="px-2.5 pb-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
                <span>Sequences</span>
                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
              </div>
              <div className="space-y-0.5">
                <p className="px-2.5 py-2 text-[11px] text-slate-500 italic">No sequences yet</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Area */}
      <div className={`${isCollapsed ? 'p-2' : 'p-3'} border-t border-white/[0.06] bg-obsidian-950/80 shrink-0`}>
        {/* Sidebar Bottom: Floating Profile Dropup & Account Information */}
        <div className="relative pt-1" ref={dropupRef}>
          {/* Floating Glassmorphic Account Dropup Menu */}
          {dropupOpen && (
            <div
              className={`absolute bottom-full mb-2 glass-panel ${
                isCollapsed ? 'left-2 w-64' : 'left-0 right-0 w-full'
              } rounded-xl p-2.5 shadow-2xl shadow-purple-950/60 border border-brand-violet/30 bg-[#12101e]/95 backdrop-blur-xl flex flex-col gap-1 text-xs z-50 animate-in fade-in slide-in-from-bottom-2`}
              data-purpose="account-dropup-menu"
            >
              {isGuest ? (
                /* Unsigned-in Guest Dropup Content */
                <div className="flex flex-col gap-2.5 p-1">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                          />
                        </svg>
                      </div>
                      <span className="font-semibold text-white text-xs">Guest Visitor</span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-amber-400/15 text-amber-300 border border-amber-400/30">
                      Not signed in
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Sign in to save your stories, sync media assets, and export video sequences.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setDropupOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-accent-violet hover:bg-accent-violet/90 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-violet-950/50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                    <span>Sign In / Register</span>
                  </button>
                </div>
              ) : (
                /* Authenticated User Dropup Content */
                <>
                  <button
                    type="button"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-brand-violet/20 text-brand-text hover:text-white transition-colors cursor-pointer w-full text-left"
                    onClick={handleProfile}
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
                    onClick={handleAccountSettings}
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
                  {isAdmin && (
                    <div className="px-3 py-2 rounded-lg bg-obsidian-900/80 border border-white/[0.06] my-0.5 space-y-2">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center justify-between">
                        <span>Admin controls</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20">
                          ROOT
                        </span>
                      </div>

                      {onTestToolsVisibilityChange && (
                        <label className="flex items-center justify-between gap-3 text-xs text-slate-300 cursor-pointer">
                          <span className="text-[11px] text-brand-muted">Show test buttons</span>
                          <input
                            type="checkbox"
                            checked={testToolsVisible}
                            onChange={(event) => onTestToolsVisibilityChange(event.target.checked)}
                            className="h-3.5 w-3.5 accent-violet-500 rounded cursor-pointer"
                          />
                        </label>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setDropupOpen(false);
                          setWhitelistModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white/[0.04] hover:bg-violet-600/20 text-slate-300 hover:text-white border border-white/[0.06] hover:border-violet-500/30 transition-colors text-xs cursor-pointer group"
                      >
                        <span className="flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-violet-400 group-hover:text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span className="text-[11px] font-medium">Access Whitelist</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 group-hover:text-violet-300">Users →</span>
                      </button>
                    </div>
                  )}
                  <div className="h-px bg-brand-border/60 my-0.5"></div>
                  <button
                    type="button"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-brand-pink/20 text-brand-pink transition-colors cursor-pointer w-full text-left"
                    onClick={handleLogout}
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
                </>
              )}
            </div>
          )}

          {isCollapsed ? (
            <div className="flex justify-center">
              {isGuest ? (
                <button
                  type="button"
                  onClick={() => setDropupOpen((prev) => !prev)}
                  className="relative w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.1] hover:border-accent-violet/60 hover:bg-accent-violet/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer group"
                  title="Guest Account — Click to Sign In"
                  aria-label="Guest Account Menu"
                  aria-expanded={dropupOpen}
                >
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-accent-violet transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                  <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-amber-400/90 ring-2 ring-obsidian-950" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setDropupOpen((prev) => !prev)}
                  className="w-10 h-10 rounded-full bg-accent-violet/20 border border-accent-violet/30 flex items-center justify-center text-[11px] font-bold text-accent-violet hover:scale-105 transition-transform cursor-pointer"
                  title={`${userName} (${userTier}) — Account Menu`}
                  aria-label="Account Menu"
                  aria-expanded={dropupOpen}
                >
                  {userInitials}
                </button>
              )}
            </div>
          ) : (
            isGuest ? (
              <div
                onClick={() => setDropupOpen((prev) => !prev)}
                className="flex items-center justify-between p-2 rounded-lg bg-[#0a0b10] border border-white/[0.06] hover:border-accent-violet/40 hover:bg-white/[0.02] transition-all cursor-pointer group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDropupOpen((prev) => !prev);
                  }
                }}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <div className="relative shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.1] group-hover:border-accent-violet/40 flex items-center justify-center text-slate-400 group-hover:text-accent-violet transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400/90 ring-2 ring-[#0a0b10]" />
                  </div>
                  <div className="truncate text-left">
                    <div className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors truncate">
                      Guest Account
                    </div>
                    <div className="text-[10px] font-mono text-amber-400/80 truncate">
                      Click to sign in
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropupOpen((prev) => !prev);
                  }}
                  className="text-slate-400 hover:text-white p-1 transition cursor-pointer"
                  title="Account Menu"
                  aria-expanded={dropupOpen}
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      dropupOpen ? 'rotate-180 text-accent-violet' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                onClick={() => setDropupOpen((prev) => !prev)}
                className="flex items-center justify-between p-2 rounded-lg bg-[#0a0b10] border border-white/[0.04] hover:border-brand-violet/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-2 truncate">
                  <div className="w-7 h-7 rounded-full bg-accent-violet/20 border border-accent-violet/30 flex items-center justify-center text-[10px] font-bold text-accent-violet shrink-0 group-hover:scale-105 transition-transform">
                    {userInitials}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors truncate">{userName}</div>
                    <div className="text-[10px] font-mono text-slate-500 truncate">{userTier}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropupOpen((prev) => !prev);
                  }}
                  className="text-slate-400 hover:text-white p-1 transition cursor-pointer"
                  title="Account Menu"
                  aria-expanded={dropupOpen}
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      dropupOpen ? 'rotate-180 text-accent-violet' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Internal Auth Modal for guests */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />

      {/* Internal Whitelist Modal for admin access control */}
      <WhitelistModal
        isOpen={whitelistModalOpen}
        onClose={() => setWhitelistModalOpen(false)}
        currentUserEmail={currentUser?.email}
      />
    </aside>
  );
}

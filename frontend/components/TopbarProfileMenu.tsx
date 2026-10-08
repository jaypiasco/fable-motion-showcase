'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isAdminEmail } from '../lib/admin';
import { AuthModal } from './AuthModal';

export interface TopbarProfileMenuProps {
  user?: User | null;
  isAdmin?: boolean;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  className?: string;
}

export function TopbarProfileMenu({
  user: initialUser,
  isAdmin: initialIsAdmin,
  onOpenSettings,
  onOpenProfile,
  onOpenAuth,
  onLogout,
  className = '',
}: TopbarProfileMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser ?? null);
  const [isAdmin, setIsAdmin] = useState<boolean>(initialIsAdmin ?? false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync Supabase Auth Session
  useEffect(() => {
    let mounted = true;

    async function syncAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (mounted) {
          setCurrentUser(user);
          setIsAdmin(isAdminEmail(user?.email));
        }
      } catch {
        if (mounted) {
          setCurrentUser(null);
          setIsAdmin(false);
        }
      }
    }

    if (initialUser === undefined) {
      syncAuth();
    } else {
      setCurrentUser(initialUser);
      setIsAdmin(initialIsAdmin ?? isAdminEmail(initialUser?.email));
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        const activeUser = session?.user ?? null;
        setCurrentUser(activeUser);
        setIsAdmin(isAdminEmail(activeUser?.email));
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [initialUser, initialIsAdmin]);

  // Click outside and Escape key to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Derived user details
  const displayName = useMemo(() => {
    if (!currentUser) return 'Guest Creator';
    return (
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      currentUser.email?.split('@')[0] ||
      'Creator'
    );
  }, [currentUser]);

  const userEmail = useMemo(() => {
    if (!currentUser) return 'guest@fablemotion.studio';
    return currentUser.email || 'guest@fablemotion.studio';
  }, [currentUser]);

  const userInitials = useMemo(() => {
    if (!currentUser) return 'AV';
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
    return 'AV';
  }, [currentUser]);

  const avatarUrl = useMemo(() => {
    return (
      currentUser?.user_metadata?.avatar_url ||
      currentUser?.user_metadata?.picture ||
      null
    );
  }, [currentUser]);

  const userTier = useMemo(() => {
    if (isAdmin) return 'Admin Tier';
    if (currentUser) return 'Pro Tier';
    return 'Guest Tier';
  }, [isAdmin, currentUser]);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(false);
    if (onLogout) {
      onLogout();
      return;
    }
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <>
      <div
        ref={menuRef}
        className={`relative flex items-center ml-1 z-50 ${className}`}
        data-purpose="topbar-profile-container"
      >
        {/* Topbar Profile Trigger Button (Icon Only) */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative flex items-center justify-center w-8 h-8 rounded-full transition cursor-pointer select-none group ${
            currentUser
              ? 'bg-gradient-to-tr from-violet-600 to-cyan-500 text-white font-mono text-xs font-semibold ring-2 ring-white/[0.12] hover:ring-violet-400 shadow-sm shadow-purple-950/40'
              : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/[0.12] hover:border-accent-violet/50 shadow-sm'
          }`}
          title={currentUser ? `${displayName} (${userTier})` : 'Guest Account — Click to Sign In'}
          aria-label="User Profile Menu"
          aria-expanded={isOpen}
        >
          {currentUser ? (
            avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span>{userInitials}</span>
            )
          ) : (
            <svg
              className="w-4 h-4 text-slate-300 group-hover:text-accent-violet transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          )}
          <span
            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-[#151221] ${
              currentUser ? 'bg-emerald-400' : 'bg-amber-400/90'
            }`}
          />
        </button>

        {/* Dropdown Card */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-[#161224]/95 backdrop-blur-xl border border-brand-border/80 shadow-2xl shadow-purple-950/50 p-2.5 z-50 flex flex-col gap-1 text-xs select-none animate-in fade-in zoom-in-95 duration-150">
            {!currentUser ? (
              /* Unsigned-in Guest View */
              <>
                <div className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.08] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-slate-300">
                          <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.8"
                            />
                          </svg>
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400/90 ring-2 ring-[#161224]" />
                      </div>
                      <div className="min-w-0 text-left">
                        <h4 className="text-xs font-semibold text-white truncate">Guest Visitor</h4>
                        <p className="text-[10px] font-mono text-amber-400/80">Not signed in</p>
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Guest Mode
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed text-left">
                    Sign in to save stories, sync assets across devices, and export high-definition videos.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      if (onOpenAuth) onOpenAuth();
                      else setAuthModalOpen(true);
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
                    <span>Sign In / Create Account</span>
                  </button>
                </div>

                <div className="h-px bg-white/[0.08] my-1" />

                {/* Quick Navigation Links for Guests */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      router.push('/create');
                    }}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors group cursor-pointer text-left w-full"
                  >
                    <div className="flex items-center gap-2.5">
                      <svg
                        className="w-4 h-4 text-slate-400 group-hover:text-accent-violet transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                      <span className="font-medium">Create New Story</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      router.push('/library');
                    }}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors group cursor-pointer text-left w-full"
                  >
                    <div className="flex items-center gap-2.5">
                      <svg
                        className="w-4 h-4 text-slate-400 group-hover:text-accent-violet transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                      <span className="font-medium">Story Library</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      router.push('/upload');
                    }}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors group cursor-pointer text-left w-full"
                  >
                    <div className="flex items-center gap-2.5">
                      <svg
                        className="w-4 h-4 text-slate-400 group-hover:text-accent-violet transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                      <span className="font-medium">Upload Media</span>
                    </div>
                  </button>
                </div>
              </>
            ) : (
              /* Authenticated User View */
              <>
                {/* User Profile Header Card */}
                <div className="p-2.5 bg-brand-card/70 rounded-lg border border-brand-border/50 flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-violet to-brand-cyan flex items-center justify-center font-bold text-sm text-white shadow-neon-violet/40 overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        userInitials
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#161224] ${
                        currentUser ? 'bg-emerald-400' : 'bg-slate-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-semibold text-white truncate" title={displayName}>
                        {displayName}
                      </h4>
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded ${
                          isAdmin
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : currentUser
                            ? 'bg-brand-violet/25 text-brand-violet border border-brand-violet/40'
                            : 'bg-slate-700/40 text-slate-300 border border-slate-600/40'
                        }`}
                      >
                        {userTier}
                      </span>
                    </div>
                    <p className="text-[11px] text-brand-muted truncate" title={userEmail}>
                      {userEmail}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-brand-border/50 my-1" />

                {/* Navigation & Preferences */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      router.push('/library');
                    }}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg text-brand-text hover:text-white hover:bg-brand-violet/15 transition-colors group cursor-pointer text-left w-full"
                  >
                    <div className="flex items-center gap-2.5">
                      <svg
                        className="w-4 h-4 text-brand-muted group-hover:text-brand-violet transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                      <span className="font-medium">Account &amp; Profile</span>
                    </div>
                    <span className="text-[10px] text-brand-muted/70">Manage</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      router.push('/create');
                    }}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg text-brand-text hover:text-white hover:bg-brand-violet/15 transition-colors group cursor-pointer text-left w-full"
                  >
                    <div className="flex items-center gap-2.5">
                      <svg
                        className="w-4 h-4 text-brand-muted group-hover:text-brand-violet transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                      <span className="font-medium">Workspace Preferences</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      router.push('/upload');
                    }}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg text-brand-text hover:text-white hover:bg-brand-violet/15 transition-colors group cursor-pointer text-left w-full"
                  >
                    <div className="flex items-center gap-2.5">
                      <svg
                        className="w-4 h-4 text-brand-muted group-hover:text-brand-cyan transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                      <span className="font-medium">API Keys &amp; Integrations</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      router.push('/upload');
                    }}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg text-brand-text hover:text-white hover:bg-brand-violet/15 transition-colors group cursor-pointer text-left w-full"
                  >
                    <div className="flex items-center gap-2.5">
                      <svg
                        className="w-4 h-4 text-brand-muted group-hover:text-brand-violet transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                      <span className="font-medium">Billing &amp; Credits</span>
                    </div>
                  </button>
                </div>

                <div className="h-px bg-brand-border/50 my-1" />

                {/* Log Out */}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-brand-pink/90 hover:text-brand-pink hover:bg-brand-pink/15 transition-colors group cursor-pointer w-full text-left"
                >
                  <svg
                    className="w-4 h-4 text-brand-pink group-hover:translate-x-0.5 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                  <span className="font-medium">Log Out</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Internal Auth Modal for unauthenticated visitors */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />
    </>
  );
}

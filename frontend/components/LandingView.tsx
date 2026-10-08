'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../app/landing/landing.css';
import { FluidBackgroundShader } from './FluidBackgroundShader';
import { Fluid } from './ui/fluid';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

const DEMO_YOUTUBE_ID = process.env.NEXT_PUBLIC_DEMO_YOUTUBE_ID || 'Cy-lVx4YlNw';
const DEMO_EMBED_URL = `https://www.youtube-nocookie.com/embed/${DEMO_YOUTUBE_ID}?rel=0&modestbranding=1`;
const DEMO_MODAL_EMBED_URL = `https://www.youtube-nocookie.com/embed/${DEMO_YOUTUBE_ID}?autoplay=1&rel=0&modestbranding=1`;

interface LandingViewProps {
  onEnterStudio: () => void;
  onOpenAuth: () => void;
}

export const LandingView = React.memo(function LandingView({ onEnterStudio, onOpenAuth }: LandingViewProps) {
  const router = useRouter();
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [pipelineTab, setPipelineTab] = useState<'vertical' | 'cinema'>('vertical');
  const [emailInput, setEmailInput] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!profileDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileDropdownOpen]);

  const handleLaunchStudio = () => {
    onEnterStudio();
  };

  const handleLogoClick = () => {
    onEnterStudio();
  };

  const handleSignOut = async () => {
    setProfileDropdownOpen(false);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.user_metadata?.first_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
      : null) ||
    (user?.email ? user.email.split('@')[0] : 'Creator');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setIsSubscribed(true);
      try {
        await supabase.from('waitlist').insert([
          { email: emailInput.trim().toLowerCase(), created_at: new Date().toISOString() },
        ]);
      } catch {
        // Silently catch if waitlist table is not configured
      }
    }
  };

  return (
    <div className="dark bg-background font-body-md text-body-md text-on-surface antialiased selection:bg-primary selection:text-on-primary min-h-screen">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,300..900;1,300..900&family=Sora:wght@100..800&display=swap"
      />

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
        <div className="h-20 w-full max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-lg">
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-space-sm group bg-transparent border-none p-0 cursor-pointer text-left"
              type="button"
            >
              <img
                alt="FableMotion Logo"
                className="navbar-logo rounded-lg transition-transform group-hover:scale-105"
                src="/fablemotion-icon.png"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-dm5dHUNYqcaoUz9luEfkBqi9qWVgTnsj1yv2A7xxBHLmbTNnzNjeEc2Dzyvw3_tLZ0hNNW-bboaz5mlQPCy4P2AHw-mAAP9cIVv2Qtry27gv0duw2A3gp2yhbB653vZpOgQB7klNwLQUR5Zdl_eefjo_Vnus_h4AlHYPrethZ8kvxYtKQ1oChl_pqpDrTLkBympPTLbVAZDLJCnGqSqeVr95xCzx-GTQoLYNOh22-ad6T4K0a7jNFQcMBsetU9sHGAE';
                }}
              />
              <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface group-hover:text-primary transition-colors">
                FableMotion
              </span>
            </button>
            <nav className="hidden lg:flex items-center gap-space-lg">
              <a aria-current="page" className="transition-colors text-primary font-bold" href="#features">
                Features
              </a>
              <a className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors" href="#showcase">
                Showcase
              </a>
              <a className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors" href="#pipeline">
                Pipeline
              </a>
              <a className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors" href="#pricing">
                Pricing
              </a>
              <a className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors" href="#features">
                Docs
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-space-md">
            {!user ? (
              <button
                onClick={onOpenAuth}
                className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors px-space-xs py-space-2xs bg-transparent border-none cursor-pointer"
              >
                Sign In
              </button>
            ) : null}
            <button
              onClick={handleLaunchStudio}
              className="relative inline-flex items-center justify-center px-space-md py-space-xs rounded-xl font-label-lg text-label-lg bg-primary text-on-primary shadow-[0_0_24px_rgba(139,92,246,0.45)] hover:bg-primary-fixed hover:text-on-primary-fixed hover:shadow-[0_0_32px_rgba(139,92,246,0.65)] transition-all cursor-pointer border-none"
            >
              <span className="relative z-10">Launch Studio</span>
            </button>
            {user ? (
              <div className="relative" ref={profileDropdownRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen((prev) => !prev)}
                  className={`w-9 h-9 rounded-full bg-surface-container border flex items-center justify-center cursor-pointer transition-all overflow-hidden ${
                    profileDropdownOpen
                      ? 'border-primary ring-2 ring-primary/40 shadow-[0_0_12px_rgba(208,188,255,0.35)]'
                      : 'border-outline-variant/40 hover:border-primary/60 hover:opacity-90'
                  }`}
                  aria-label="Account profile"
                  aria-expanded={profileDropdownOpen}
                  aria-haspopup="menu"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={displayName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                  )}
                </button>

                {profileDropdownOpen && (
                  <div
                    className="absolute right-0 top-full mt-2.5 w-64 rounded-2xl bg-surface-container-high/95 backdrop-blur-xl border border-outline-variant/30 shadow-[0_16px_40px_rgba(0,0,0,0.6)] z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150 divide-y divide-outline-variant/20"
                    role="menu"
                    aria-label="Account menu"
                  >
                    {/* User Profile Header */}
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-outline-variant/40 flex items-center justify-center shrink-0 overflow-hidden text-primary">
                          {user.user_metadata?.avatar_url ? (
                            <img
                              src={user.user_metadata.avatar_url}
                              alt=""
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-[20px]">person</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-sora font-semibold text-xs text-on-surface truncate leading-tight">
                            {displayName}
                          </p>
                          <p className="text-[11px] text-on-surface-variant/80 truncate font-mono mt-0.5" title={user.email}>
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="p-1.5 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onEnterStudio();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-on-surface hover:text-white hover:bg-surface-container-highest transition-colors cursor-pointer text-left border-none bg-transparent"
                        role="menuitem"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary">movie</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-on-surface">Story Studio</div>
                          <div className="text-[10px] text-outline truncate">Open Story Studio & Timeline</div>
                        </div>
                        <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          router.push('/create');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-on-surface hover:text-white hover:bg-surface-container-highest transition-colors cursor-pointer text-left border-none bg-transparent"
                        role="menuitem"
                      >
                        <span className="material-symbols-outlined text-[18px] text-secondary">add_circle</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-on-surface">New Story</div>
                          <div className="text-[10px] text-outline truncate">Start a new script or episode</div>
                        </div>
                        <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
                      </button>
                    </div>

                    {/* Sign Out Action */}
                    <div className="p-1.5">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-error hover:bg-error-container/20 transition-colors cursor-pointer text-left border-none bg-transparent"
                        role="menuitem"
                      >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="w-full pt-20 bg-background">
        <div className="flex flex-col w-full">
          {/* HERO SECTION WITH SLOW BACKGROUND SHADER & INTERACTIVE CURSOR FLUID */}
          <section ref={heroSectionRef} className="relative w-full overflow-hidden bg-surface-container-lowest -mt-20 pt-20 min-h-[920px] flex flex-col justify-between">
            {/* WebGL Fluid Background Shader (Ultra-Calm Slow Drift) */}
            <FluidBackgroundShader />

            {/* Deep Obsidian Radial Atmospheric Scrims */}
            <div className="absolute inset-0 z-[1] bg-gradient-to-b from-surface-container-lowest/70 via-surface-container-lowest/40 to-surface-container-lowest pointer-events-none"></div>
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-primary/10 rounded-full blur-[140px] pointer-events-none z-[2]"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] pointer-events-none z-[2]"></div>

            {/* Interactive Cursor Fluid Simulation Overlay (Pure Hover Waves) */}
            <div className="absolute inset-0 z-[3] pointer-events-none overflow-hidden">
              <Fluid hostRef={heroSectionRef} transparent={true} />
            </div>


            {/* Hero Content Core */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 py-space-xl flex flex-col items-center justify-center text-center pointer-events-none my-auto">
              {/* Announcement Badge */}
              <div
                onClick={handleLaunchStudio}
                className="pointer-events-auto group inline-flex items-center px-space-md py-space-2xs rounded-full bg-surface-container/90 backdrop-blur-xl shadow-[0_0_24px_rgba(208,188,255,0.25)] transition-all hover:scale-105 cursor-pointer mb-space-lg"
              >
                <span className="font-label-md text-label-md text-primary font-semibold tracking-wide">
                  Introducing FableMotion (Preview)
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="font-sora text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] max-w-5xl mx-auto mb-6">
                Transform Raw Prompts into <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-neon-cyan to-pink-300">
                  Viral Cinematic Dramas
                </span>
              </h1>

              {/* Subtitle */}
              <p className="font-body-xl text-body-xl text-on-surface-variant max-w-3xl mb-space-2xl leading-relaxed text-center mx-auto">
                The AI studio purpose-built for episodic micro-series, TikTok thrillers, and cinematic narratives. Scripting, keyframing, motion synthesis, and lip-sync in a single unified pipeline.
              </p>

              {/* Dual Call to Action Buttons */}
              <div className="pointer-events-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 mb-10 sm:mb-12">
                {/* Start Creating Button with Glowing Aura */}
                <a
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-sora font-semibold text-white bg-gradient-to-r from-neon-purple via-violet-600 to-indigo-600 shadow-neon-violet hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border border-violet-400/30 cursor-pointer no-underline"
                  href="#studio"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLaunchStudio();
                  }}
                >
                  <span className="material-symbols-outlined text-xl">video_call</span>
                  <span>Start Creating Free</span>
                </a>

                <a
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl font-sora font-medium text-slate-200 bg-obsidian-surface/60 hover:bg-obsidian-surface border border-white/10 hover:border-neon-cyan/40 hover:text-white transition-all duration-300 backdrop-blur-md cursor-pointer no-underline"
                  href="#demo"
                  onClick={(e) => {
                    e.preventDefault();
                    setTourOpen(true);
                  }}
                >
                  <span className="w-6 h-6 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan">
                    <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                  </span>
                  <span>Watch Studio Tour</span>
                </a>
              </div>
            </div>

            {/* Social Proof Metrics Bar */}
            <div className="relative z-10 w-full bg-surface-container-lowest/80 backdrop-blur-xl py-space-lg shadow-inner">
              <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-2 lg:grid-cols-4 gap-space-lg">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="font-headline-xl text-headline-xl font-bold text-on-surface flex items-baseline gap-space-3xs">
                    <span>1.2M</span><span className="text-primary text-headline-md font-bold">+</span>
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-wider">
                    Scenes Rendered
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="font-headline-xl text-headline-xl font-bold text-secondary flex items-baseline gap-space-3xs">
                    <span>60fps</span><span className="text-on-surface text-headline-md font-medium">4K</span>
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-wider">
                    Ultra-Res Diffusion
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="font-headline-xl text-headline-xl font-bold text-tertiary flex items-baseline gap-space-3xs">
                    <span>3.5x</span>
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-wider">
                    Faster Production Pipeline
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="font-headline-xl text-headline-xl font-bold text-primary flex items-baseline gap-space-3xs">
                    <span>99.4%</span>
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-wider">
                    Character Consistency
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* PROCESS DEMO VIDEO SECTION (COMING SOON) */}
          <section className="w-full py-space-3xl px-6 lg:px-12 bg-surface relative overflow-hidden" id="demo">
            <div className="max-w-7xl mx-auto space-y-space-xl">
              <div className="text-center max-w-3xl mx-auto space-y-space-xs">
                {/* <div className="inline-flex items-center gap-space-xs px-space-sm py-space-3xs rounded-full bg-primary/10 border border-primary/20 text-primary font-label-md text-label-md font-semibold">
                  <span className="material-symbols-outlined text-[16px]">play_circle</span>
                  <span>Process Demo</span>
                </div> */}
                <h2 className="font-headline-xl text-headline-xl text-on-surface">
                  Experience the Autonomous Production Flow
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Watch how FableMotion turns rough story ideas into scripted scenes, persistent character portraits, and sequenced vertical video.
                </p>
              </div>

              {/* Obsidian Studio Frame Mockup */}
              <div className="relative rounded-3xl bg-surface-container-high/50 border border-white/[0.08] shadow-2xl overflow-hidden backdrop-blur-xl">
                {/* Browser/App Window Header */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] bg-surface-container-lowest/70 text-xs font-mono text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                    <span className="ml-3 font-medium text-zinc-300">FableMotion Studio · Project Preview</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                      Phase 04 Active
                    </span>
                    <span>1920 × 1080 (16:9)</span>
                  </div>
                </div>

                {/* Video Stage Preview Area */}
                <div className="relative aspect-video max-h-[640px] w-full bg-[#0a080e] flex items-center justify-center overflow-hidden">
                  <iframe
                    className="w-full h-full border-none aspect-video"
                    src={DEMO_EMBED_URL}
                    title="FableMotion Studio Demo Walkthrough"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>

                {/* 5-Step Process Bar Under Demo */}
                <div className="p-4 lg:p-6 bg-surface-container-lowest/60 border-t border-white/[0.06] grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { step: '01', title: 'Premise & Hook', icon: 'auto_stories' },
                    { step: '02', title: 'Cast Portraits', icon: 'face' },
                    { step: '03', title: 'Keyframe Stills', icon: 'image' },
                    { step: '04', title: 'Veo Video Clips', icon: 'movie_filter' },
                    { step: '05', title: 'Timeline & Audio', icon: 'timeline' },
                  ].map((item, idx) => (
                    <div
                      key={item.step}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                        idx === 3
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-white/[0.02] border-white/[0.04] text-zinc-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      <div className="text-left">
                        <div className="text-[10px] uppercase font-mono tracking-wider opacity-60">Phase {item.step}</div>
                        <div className="text-xs font-semibold text-on-surface">{item.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* INTERACTIVE PLATFORM PIPELINE SHOWCASE */}
          <section className="w-full py-space-3xl px-6 lg:px-12 bg-surface-container-lowest" id="pipeline">
            <div className="max-w-7xl mx-auto space-y-space-2xl">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
                <div className="space-y-space-xs max-w-2xl">
                  <div className="inline-flex items-center gap-space-xs text-secondary font-label-md text-label-md tracking-wider uppercase">
                    <span className="material-symbols-outlined text-[16px]">account_tree</span>
                    <span>Studio Architecture</span>
                  </div>
                  <h2 className="font-headline-xl text-headline-xl text-on-surface">The Autonomous Generation Engine</h2>
                  <p className="font-body-lg text-body-lg text-on-surface-variant">
                    From single-phrase ideation to fully sequenced vertical episodes in minutes.
                  </p>
                </div>
                <div className="flex items-center gap-space-xs bg-surface-container-high p-1 rounded-xl shrink-0">
                  <button
                    onClick={() => setPipelineTab('vertical')}
                    className={`px-space-md py-space-2xs rounded-lg font-label-md text-label-md transition-all cursor-pointer border-none ${
                      pipelineTab === 'vertical'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface bg-transparent'
                    }`}
                  >
                    9:16 Short Drama
                  </button>
                  <button
                    onClick={() => setPipelineTab('cinema')}
                    className={`px-space-md py-space-2xs rounded-lg font-label-md text-label-md transition-all cursor-pointer border-none ${
                      pipelineTab === 'cinema'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface bg-transparent'
                    }`}
                  >
                    16:9 Widescreen Cinema
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
                {/* Stage 1 */}
                <div className="group relative rounded-2xl bg-surface-container p-space-lg transition-all duration-300 hover:bg-surface-container-high hover:scale-[1.02] shadow-lg flex flex-col justify-between min-h-[360px]">
                  <div>
                    <div className="flex items-center justify-between mb-space-md">
                      <span className="font-label-sm text-label-sm font-bold text-primary tracking-widest uppercase">
                        STAGE 01
                      </span>
                      <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-headline-sm text-headline-sm">
                        1
                      </span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-space-xs">
                      Premise &amp; Screenplay
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
                      Gemini multi-modal director transforms raw concepts into structured episodic beats, visual shot descriptions, and dialogue.
                    </p>
                  </div>
                  <div className="p-space-sm rounded-xl bg-surface-container-lowest/80 text-on-surface-variant font-body-sm text-body-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-primary font-medium">Screenplay Structure</span>
                      <span className="text-on-surface font-bold">3-Act Beats</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                      <div className="w-[96%] h-full bg-primary rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Stage 2 */}
                <div className="group relative rounded-2xl bg-surface-container p-space-lg transition-all duration-300 hover:bg-surface-container-high hover:scale-[1.02] shadow-lg flex flex-col justify-between min-h-[360px]">
                  <div>
                    <div className="flex items-center justify-between mb-space-md">
                      <span className="font-label-sm text-label-sm font-bold text-secondary tracking-widest uppercase">
                        STAGE 02
                      </span>
                      <span className="w-8 h-8 rounded-full bg-secondary/20 text-secondary flex items-center justify-center font-headline-sm text-headline-sm">
                        2
                      </span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-space-xs">
                      Character &amp; Keyframe Design
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
                      Diffusion image models generate persistent character reference portraits and framed keyframes for each scene.
                    </p>
                  </div>
                  <div className="p-space-sm rounded-xl bg-surface-container-lowest/80 flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-secondary">Visual Cohesion</span>
                    <span className="font-label-sm text-label-sm font-bold text-on-surface">Reference Locked</span>
                  </div>
                </div>

                {/* Stage 3 */}
                <div className="group relative rounded-2xl bg-surface-container p-space-lg transition-all duration-300 hover:bg-surface-container-high hover:scale-[1.02] shadow-lg flex flex-col justify-between min-h-[360px]">
                  <div>
                    <div className="flex items-center justify-between mb-space-md">
                      <span className="font-label-sm text-label-sm font-bold text-tertiary tracking-widest uppercase">
                        STAGE 03
                      </span>
                      <span className="w-8 h-8 rounded-full bg-tertiary/20 text-tertiary flex items-center justify-center font-headline-sm text-headline-sm">
                        3
                      </span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-space-xs">
                      Video Clip Diffusion
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
                      Veo video diffusion animates keyframe images with cinematic motion prompts, atmospheric pacing, and dynamic lighting.
                    </p>
                  </div>
                  <div className="p-space-sm rounded-xl bg-surface-container-lowest/80 flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-tertiary">Motion Engine</span>
                    <span className="font-label-sm text-label-sm font-bold text-on-surface">Veo 3.1 Fast</span>
                  </div>
                </div>

                {/* Stage 4 */}
                <div className="group relative rounded-2xl bg-surface-container p-space-lg transition-all duration-300 hover:bg-surface-container-high hover:scale-[1.02] shadow-lg flex flex-col justify-between min-h-[360px]">
                  <div>
                    <div className="flex items-center justify-between mb-space-md">
                      <span className="font-label-sm text-label-sm font-bold text-primary-fixed tracking-widest uppercase">
                        STAGE 04
                      </span>
                      <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-headline-sm text-headline-sm">
                        4
                      </span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-space-xs">Timeline &amp; Captions</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
                      Automated timeline assembly weaves clips together with background music, sound effects, and kinetic animated subtitles.
                    </p>
                  </div>
                  <div className="p-space-sm rounded-xl bg-primary-container/20 text-primary font-label-sm text-label-sm flex items-center justify-between">
                    <span>Export Ready</span>
                    <span className="material-symbols-outlined text-[18px]">movie_filter</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* VIRAL SERIES TEMPLATES GALLERY */}
          <section className="w-full py-space-3xl px-6 lg:px-12 bg-surface" id="showcase">
            <div className="max-w-7xl mx-auto space-y-space-2xl">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
                <div>
                  <div className="inline-flex items-center gap-space-xs text-tertiary font-label-md text-label-md tracking-wider uppercase mb-space-xs">
                    <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                    <span>Trending Formats</span>
                  </div>
                  <h2 className="font-headline-xl text-headline-xl text-on-surface">Pre-Tuned Viral Drama Templates</h2>
                  <p className="font-body-lg text-body-lg text-on-surface-variant">
                    Fork full aesthetic setups, character weights, and pacing recipes in one click.
                  </p>
                </div>
                <a
                  className="inline-flex items-center gap-space-2xs font-label-lg text-label-lg text-primary hover:text-primary-fixed transition-colors"
                  href="#pipeline"
                >
                  <span>Explore all 48+ Drama Presets</span>
                  <span className="material-symbols-outlined text-[18px]">east</span>
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
                {/* Template 1 */}
                <div className="group relative rounded-3xl bg-surface-container overflow-hidden shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                  <div className="relative w-full h-72 overflow-hidden">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      alt="Revenge Billionaire Drama Scene"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVSdwYCflJn39JNLbsq-lWIgYj18QhkB2Ryltqk-4C8S5L3-zYvqFIQTBnobmXjJy9d_bODytnbOYxrDQJszmY2yC5VCWrW8bFYVWKPsj11OpZjQ3OUy4_eYQX-g2pxY_fdDAlliJLMGhLZkGIqPR78ts27Rwu14cqMMcEGRtBBKnIhiugiOSdhD7Rm0OTxgjUGum9qiHwFiwH48aQh6tL7nB7T4yXxMFj4XUbPV79nklcVMrBbD-klA"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-black/40"></div>
                    <div className="absolute top-4 left-4 flex gap-space-xs">
                      <span className="px-space-sm py-space-3xs rounded-full bg-surface-container-lowest/80 backdrop-blur-md text-secondary font-label-sm text-label-sm font-semibold">
                        9.8M Views
                      </span>
                      <span className="px-space-sm py-space-3xs rounded-full bg-tertiary-container/30 text-tertiary font-label-sm text-label-sm font-semibold">
                        Binge Hook
                      </span>
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <span className="px-space-sm py-space-3xs rounded-md bg-surface-container-lowest/90 font-label-sm text-label-sm text-on-surface">
                        12 EPISODES
                      </span>
                    </div>
                  </div>
                  <div className="p-space-lg flex flex-col flex-1 justify-between space-y-space-md">
                    <div>
                      <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors">
                        Revenge Billionaire
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">
                        Sharp corporate backstabbing, luxury penthouse setups, intense cold stares, and high-tension cliffhanger pacing.
                      </p>
                    </div>
                    <div className="pt-space-sm flex items-center justify-between">
                      <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-[16px] text-primary">psychology</span>
                        <span>Includes 3 Character LoRAs</span>
                      </div>
                      <button
                        onClick={handleLaunchStudio}
                        className="px-space-md py-space-2xs rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary font-label-sm text-label-sm font-semibold text-on-surface transition-all border-none cursor-pointer"
                      >
                        Use Preset
                      </button>
                    </div>
                  </div>
                </div>

                {/* Template 2 */}
                <div className="group relative rounded-3xl bg-surface-container overflow-hidden shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                  <div className="relative w-full h-72 overflow-hidden">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      alt="Cyberpunk Noir Detective Scene"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhDAGH4bIsPAJxPyVkwf08Mh--yap1wM3H0iJrhDvS8tPiP6cn3CpQcpFZbwDkyYhQRbxM_J8qx7bUovEGKtiM093JilQ-HMnVHh0wjB47uTFK4VyJl0vxIy7hWUOnSM_bshba6z9imlAhMu9AgFmx-JoWF_GMhb4Vqu3q73uj3ndLtrUTMfMP5nRlCnwyTcwCBd-sN9f6w1Uz8pSYpvPlalyPghHXMEeuRqB81tRTtgsz3Nx1gat_Rw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-black/40"></div>
                    <div className="absolute top-4 left-4 flex gap-space-xs">
                      <span className="px-space-sm py-space-3xs rounded-full bg-surface-container-lowest/80 backdrop-blur-md text-secondary font-label-sm text-label-sm font-semibold">
                        14.2M Views
                      </span>
                      <span className="px-space-sm py-space-3xs rounded-full bg-secondary-container/30 text-secondary font-label-sm text-label-sm font-semibold">
                        Sci-Fi Noir
                      </span>
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <span className="px-space-sm py-space-3xs rounded-md bg-surface-container-lowest/90 font-label-sm text-label-sm text-on-surface">
                        8 EPISODES
                      </span>
                    </div>
                  </div>
                  <div className="p-space-lg flex flex-col flex-1 justify-between space-y-space-md">
                    <div>
                      <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-secondary transition-colors">
                        Cyberpunk Noir Detective
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">
                        Atmospheric neon rain, synth score timing markers, mysterious android antagonists, and gritty narrative voiceovers.
                      </p>
                    </div>
                    <div className="pt-space-sm flex items-center justify-between">
                      <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-[16px] text-secondary">tune</span>
                        <span>Anamorphic 2.39:1 LUT</span>
                      </div>
                      <button
                        onClick={handleLaunchStudio}
                        className="px-space-md py-space-2xs rounded-lg bg-surface-container-high hover:bg-secondary hover:text-on-secondary font-label-sm text-label-sm font-semibold text-on-surface transition-all border-none cursor-pointer"
                      >
                        Use Preset
                      </button>
                    </div>
                  </div>
                </div>

                {/* Template 3 */}
                <div className="group relative rounded-3xl bg-surface-container overflow-hidden shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                  <div className="relative w-full h-72 overflow-hidden">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      alt="Romance In Disguise Scene"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBP4cizOgaMzYM9NZJbE-gtJQk3xTviwQOWSGASyZU9-24_gAKm249j7BJuZKdvrftBB-Z1RT1woZXSYRJzfbujcdBU2GUK2B_3cLDQp3WV69zb6urVlXashTDBt7N95kJT7_yHEZMDMv5c-s1jcEeNyUEYV-4lBHgR7HgNvxIkw_ewnxBqWaQHkoXkgqC2-8n9SxYS85hvEyZjrPsUMBI3eptwkerk4s9biQxOssuAX4sZnqBZ2OTztw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-black/40"></div>
                    <div className="absolute top-4 left-4 flex gap-space-xs">
                      <span className="px-space-sm py-space-3xs rounded-full bg-surface-container-lowest/80 backdrop-blur-md text-tertiary font-label-sm text-label-sm font-semibold">
                        22.4M Views
                      </span>
                      <span className="px-space-sm py-space-3xs rounded-full bg-tertiary-container/30 text-tertiary font-label-sm text-label-sm font-semibold">
                        Viral Romance
                      </span>
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <span className="px-space-sm py-space-3xs rounded-md bg-surface-container-lowest/90 font-label-sm text-label-sm text-on-surface">
                        16 EPISODES
                      </span>
                    </div>
                  </div>
                  <div className="p-space-lg flex flex-col flex-1 justify-between space-y-space-md">
                    <div>
                      <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-tertiary transition-colors">
                        Romance In Disguise
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">
                        Secret royal identities, high-society gala reveals, emotional dialogue beats, and upbeat micro-drama editing rhythm.
                      </p>
                    </div>
                    <div className="pt-space-sm flex items-center justify-between">
                      <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-[16px] text-tertiary">favorite</span>
                        <span>Optimized for TikTok/Reels</span>
                      </div>
                      <button
                        onClick={handleLaunchStudio}
                        className="px-space-md py-space-2xs rounded-lg bg-surface-container-high hover:bg-tertiary hover:text-on-tertiary font-label-sm text-label-sm font-semibold text-on-surface transition-all border-none cursor-pointer"
                      >
                        Use Preset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* HIGH IMPACT FEATURE BENTO GRID */}
          <section className="w-full py-space-3xl px-6 lg:px-12 bg-surface-container-lowest" id="features">
            <div className="max-w-7xl mx-auto space-y-space-2xl">
              <div className="text-center max-w-3xl mx-auto space-y-space-xs">
                <span className="font-label-md text-label-md text-primary tracking-widest uppercase">
                  Engineered for Modern Video Storytellers
                </span>
                <h2 className="font-headline-xl text-headline-xl text-on-surface">
                  Cinematic Capabilities Without the Complexity
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Streamline every stage of short-form episodic production from initial script to rendered vertical reels.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-space-lg">
                {/* Feature 1 (Large 2-col) - Automated 5-Phase Pipeline with looping flow animation */}
                <div className="md:col-span-2 lg:col-span-2 p-space-xl rounded-3xl bg-surface-container flex flex-col justify-between shadow-xl relative overflow-hidden group">
                  <div className="space-y-space-md">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[28px]">timeline</span>
                    </div>
                    <h3 className="font-headline-lg text-headline-lg text-on-surface">Automated 5-Phase Pipeline</h3>
                    <p className="font-body-lg text-body-lg text-on-surface-variant">
                      Transforms raw loglines into structured screenplay beats, character reference portraits, video diffusion clips, and sequenced timeline tracks automatically.
                    </p>
                  </div>
                  <div className="mt-space-lg p-space-sm rounded-2xl bg-surface-container-lowest/80 space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
                      <span>Timeline Assembly · Scene 01</span>
                      <span className="text-secondary font-mono text-xs">00:18.40</span>
                    </div>
                    <div className="relative w-full h-8 bg-surface-container-highest rounded-lg flex overflow-hidden p-1 gap-1">
                      {/* Animated Flow Light Runner */}
                      <div className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none animate-pipeline-flow"></div>
                      <div className="w-1/4 h-full bg-primary/30 rounded flex items-center justify-center font-label-sm text-xs text-on-surface">
                        Script
                      </div>
                      <div className="w-1/4 h-full bg-secondary/30 rounded flex items-center justify-center font-label-sm text-xs text-on-surface">
                        Cast
                      </div>
                      <div className="w-1/4 h-full bg-tertiary/30 rounded flex items-center justify-center font-label-sm text-xs text-on-surface">
                        Keyframes
                      </div>
                      <div className="w-1/4 h-full bg-primary/30 rounded flex items-center justify-center font-label-sm text-xs text-on-surface">
                        Veo Diffusion
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature 2: Character & Style Continuity with Marquee Drift Loop */}
                <div className="md:col-span-1 lg:col-span-2 p-space-xl rounded-3xl bg-surface-container flex flex-col justify-between shadow-xl overflow-hidden group">
                  <div className="space-y-space-md">
                    <div className="w-12 h-12 rounded-2xl bg-secondary/20 text-secondary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[28px]">group</span>
                    </div>
                    <h3 className="font-headline-lg text-headline-lg text-on-surface">Consistent Character Cast</h3>
                    <p className="font-body-lg text-body-lg text-on-surface-variant">
                      Persistent reference portraits ensure character appearance, hairstyle, and wardrobe stay locked across consecutive episodes and scenes.
                    </p>
                  </div>
                  {/* Marquee drift loop of characters */}
                  <div className="mt-space-lg relative overflow-hidden py-1">
                    <div className="animate-marquee-drift flex items-center gap-3">
                      {[
                        { name: 'Elena', role: 'Protagonist', color: 'bg-primary-container text-on-primary' },
                        { name: 'Marcus', role: 'Antagonist', color: 'bg-secondary-container text-on-secondary' },
                        { name: 'Sophia', role: 'Lead Detective', color: 'bg-tertiary-container text-on-tertiary' },
                        { name: 'Damian', role: 'Shadow Broker', color: 'bg-surface-container-highest text-primary' },
                        { name: 'Elena', role: 'Protagonist', color: 'bg-primary-container text-on-primary' },
                        { name: 'Marcus', role: 'Antagonist', color: 'bg-secondary-container text-on-secondary' },
                        { name: 'Sophia', role: 'Lead Detective', color: 'bg-tertiary-container text-on-tertiary' },
                        { name: 'Damian', role: 'Shadow Broker', color: 'bg-surface-container-highest text-primary' },
                      ].map((char, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest/90 border border-white/5 shrink-0"
                        >
                          <div className={`w-6 h-6 rounded-full ${char.color} flex items-center justify-center font-bold text-[10px]`}>
                            {char.name.charAt(0)}
                          </div>
                          <span className="text-xs font-medium text-on-surface">{char.name}</span>
                          <span className="text-[10px] text-zinc-400">· {char.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Feature 3: Social-First 9:16 Optimization */}
                <div className="md:col-span-1 lg:col-span-2 p-space-xl rounded-3xl bg-surface-container flex flex-col justify-between shadow-xl">
                  <div className="space-y-space-md">
                    <div className="w-12 h-12 rounded-2xl bg-tertiary/20 text-tertiary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[28px]">stay_current_portrait</span>
                    </div>
                    <h3 className="font-headline-lg text-headline-lg text-on-surface">Social-First 9:16 Framing</h3>
                    <p className="font-body-lg text-body-lg text-on-surface-variant">
                      Engineered from the ground up for mobile vertical viewers. Dynamic framing keeps action, facial emotion, and dramatic tension centered on the screen.
                    </p>
                  </div>
                  <div className="mt-space-lg flex items-center gap-space-sm flex-wrap">
                    <span className="px-space-sm py-space-2xs rounded-lg bg-surface-container-high font-label-sm text-label-sm text-on-surface">
                      TikTok Drama
                    </span>
                    <span className="px-space-sm py-space-2xs rounded-lg bg-surface-container-high font-label-sm text-label-sm text-on-surface">
                      YouTube Shorts
                    </span>
                    <span className="px-space-sm py-space-2xs rounded-lg bg-surface-container-high font-label-sm text-label-sm text-on-surface">
                      Instagram Reels
                    </span>
                  </div>
                </div>

                {/* Feature 4: Audio & Dynamic Captions (Retained with animated highlight pulse) */}
                <div className="md:col-span-2 lg:col-span-2 p-space-xl rounded-3xl bg-surface-container flex flex-col justify-between shadow-xl">
                  <div className="space-y-space-md">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[28px]">graphic_eq</span>
                    </div>
                    <h3 className="font-headline-lg text-headline-lg text-on-surface">Real-Time Dynamic Audio &amp; Captions</h3>
                    <p className="font-body-lg text-body-lg text-on-surface-variant">
                      Zero tedious subtitle editing. Dynamic kinetic word-by-word captions render directly with neon emphasis colors, matched with neural atmospheric foley sound effects and dialogue stems.
                    </p>
                  </div>
                  <div className="mt-space-lg flex items-center justify-between p-space-sm rounded-xl bg-surface-container-lowest/80">
                    <div className="flex items-center gap-space-xs font-label-md text-label-md">
                      <span className="material-symbols-outlined text-[18px] text-primary">subtitles</span>
                      <span className="text-zinc-300">
                        &ldquo;I never forgot <span className="animate-pulse-highlight text-cyan-300 font-bold">what you did</span>...&rdquo;
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-secondary font-medium">Kinetic Sync</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CREATOR TESTIMONIALS / PROOF */}
          <section className="w-full py-space-2xl px-6 lg:px-12 bg-surface">
            <div className="max-w-7xl mx-auto">
              <div className="p-space-xl rounded-3xl bg-surface-container-high/40 backdrop-blur-xl grid grid-cols-1 md:grid-cols-3 gap-space-lg">
                <div className="space-y-space-xs">
                  <div className="flex text-primary">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="material-symbols-outlined material-symbols-fill text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        star
                      </span>
                    ))}
                  </div>
                  <p className="font-body-md text-body-md text-on-surface italic">
                    &ldquo;We launched an entire 10-part mystery mini-series in 48 hours. The character lock across shots blew away our TikTok audience.&rdquo;
                  </p>
                  <div className="font-label-sm text-label-sm text-on-surface-variant">
                    <strong className="text-on-surface">Elena Vance</strong> · Executive Producer, Kroma Studios
                  </div>
                </div>

                <div className="space-y-space-xs">
                  <div className="flex text-secondary">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="material-symbols-outlined material-symbols-fill text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        star
                      </span>
                    ))}
                  </div>
                  <p className="font-body-md text-body-md text-on-surface italic">
                    &ldquo;Bluey directing the camera angles saved us weeks of manual storyboard tweaking. The lip sync in Japanese and English was flawless.&rdquo;
                  </p>
                  <div className="font-label-sm text-label-sm text-on-surface-variant">
                    <strong className="text-on-surface">Kenji Sato</strong> · Generative VFX Lead
                  </div>
                </div>

                <div className="space-y-space-xs">
                  <div className="flex text-tertiary">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="material-symbols-outlined material-symbols-fill text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        star
                      </span>
                    ))}
                  </div>
                  <p className="font-body-md text-body-md text-on-surface italic">
                    &ldquo;Generated 32 million views across 3 serialized accounts in our first month using the Revenge Billionaire preset.&rdquo;
                  </p>
                  <div className="font-label-sm text-label-sm text-on-surface-variant">
                    <strong className="text-on-surface">Maya Sterling</strong> · Viral Narrative Creator
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* BOTTOM CONVERSION CTA BANNER */}
          <section className="w-full py-space-3xl px-6 lg:px-12 bg-surface-container-lowest relative overflow-hidden" id="pricing">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-secondary/10 to-tertiary/10 pointer-events-none"></div>
            {/* Big Bold Glowing Card Container */}
            <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-b from-obsidian-surface via-obsidian-card to-obsidian-base border border-white/10 p-8 sm:p-16 lg:p-20 text-center shadow-2xl relative overflow-hidden group">
              {/* Subtle Animated Shimmer & Rim Lights */}
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-neon-purple/20 blur-3xl rounded-full pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>

              <div className="relative z-10 space-y-space-lg">
                <div className="inline-flex items-center gap-space-xs px-space-sm py-space-3xs rounded-full bg-primary/20 text-primary font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[16px]">notifications</span>
                  <span>Studio Preview · Get Notified</span>
                </div>
                {/* Big Headline */}
                <h2 className="font-sora text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
                  Join{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple via-neon-cyan to-pink-300">
                    40,000+ Creators
                  </span>{' '}
                  Today
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
                  FableMotion is currently in preview. Enter your email below and we&apos;ll let you know as soon as it&apos;s available to the public.
                </p>

                {/* Instant Registration Input Module */}
                <form
                  className="max-w-xl mx-auto flex flex-col sm:flex-row items-center gap-space-xs bg-surface-container-lowest p-space-2xs rounded-2xl shadow-xl"
                  onSubmit={handleEmailSubmit}
                >
                  <div className="flex items-center gap-space-xs w-full px-space-sm">
                    <span className="material-symbols-outlined text-outline text-[20px]">mail</span>
                    <input
                      className="w-full bg-transparent border-none text-on-surface placeholder-outline font-body-md text-body-md focus:outline-none"
                      placeholder="Enter your email address..."
                      required
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                    />
                  </div>
                  <button
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-primary text-white font-sora font-semibold text-xs sm:text-sm shadow-neon-violet hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap flex items-center justify-center gap-1.5 border-none cursor-pointer disabled:opacity-75"
                    type="submit"
                    disabled={isSubscribed}
                  >
                    <span>{isSubscribed ? "You're on the list!" : 'Notify Me'}</span>
                  </button>
                </form>

                {isSubscribed && (
                  <p className="text-xs text-secondary font-medium flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Thank you! We&apos;ll notify you as soon as public access opens.</span>
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center gap-space-lg text-body-sm font-body-sm text-on-surface-variant pt-space-sm">
                  <div className="flex items-center gap-space-3xs">
                    <span className="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
                    <span>Commercial Rights Included</span>
                  </div>
                  <div className="flex items-center gap-space-3xs">
                    <span className="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
                    <span>Fast Cloud Inference</span>
                  </div>
                  <div className="flex items-center gap-space-3xs">
                    <span className="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
                    <span>Export Unwatermarked HD</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-surface-container-lowest">
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-space-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-space-2xl mb-space-2xl">
            <div className="lg:col-span-2 space-y-space-md">
              <div className="flex items-center gap-space-sm">
                <img
                  alt="FableMotion"
                  className="navbar-logo rounded-lg"
                  src="/fablemotion-icon.png"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-dm5dHUNYqcaoUz9luEfkBqi9qWVgTnsj1yv2A7xxBHLmbTNnzNjeEc2Dzyvw3_tLZ0hNNW-bboaz5mlQPCy4P2AHw-mAAP9cIVv2Qtry27gv0duw2A3gp2yhbB653vZpOgQB7klNwLQUR5Zdl_eefjo_Vnus_h4AlHYPrethZ8kvxYtKQ1oChl_pqpDrTLkBympPTLbVAZDLJCnGqSqeVr95xCzx-GTQoLYNOh22-ad6T4K0a7jNFQcMBsetU9sHGAE';
                  }}
                />
                <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface">FableMotion</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
                Next-generation cinematic AI video production platform. Studio-grade control, procedural timeline generation, and real-time latent choreography.
              </p>
            </div>

            <div className="space-y-space-sm">
              <div className="font-headline-sm text-headline-sm text-on-surface">Product</div>
              <ul className="space-y-space-xs font-body-md text-body-md list-none p-0 m-0">
                <li className="py-space-3xs">
                  <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#features">
                    Features
                  </a>
                </li>
                <li className="py-space-3xs">
                  <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#pipeline">
                    Pipeline Canvas
                  </a>
                </li>
                <li className="py-space-3xs">
                  <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#showcase">
                    Showcase Reel
                  </a>
                </li>
                <li className="py-space-3xs">
                  <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#pricing">
                    Pricing Plans
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-space-sm">
              <div className="font-headline-sm text-headline-sm text-on-surface">Resources</div>
              <ul className="space-y-space-xs font-body-md text-body-md list-none p-0 m-0">
                <li className="py-space-3xs">
                  <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#features">
                    Documentation
                  </a>
                </li>
                <li className="py-space-3xs">
                  <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#pipeline">
                    API Reference
                  </a>
                </li>
                <li className="py-space-3xs">
                  <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#showcase">
                    Diffusion Model Hub
                  </a>
                </li>
                <li className="py-space-3xs">
                  <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#pipeline">
                    Tutorials
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-space-sm">
              <div className="font-headline-sm text-headline-sm text-on-surface">Community</div>
              <ul className="space-y-space-xs font-body-md text-body-md list-none p-0 m-0">
                <li className="py-space-3xs">
                  <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                    Discord Guild
                  </a>
                </li>
                <li className="py-space-3xs">
                  <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                    Creative Hub
                  </a>
                </li>
                <li className="py-space-3xs">
                  <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                    GitHub Org
                  </a>
                </li>
                <li className="py-space-3xs">
                  <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                    Status System
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-space-xl flex flex-col md:flex-row items-center justify-between gap-space-md text-on-surface-variant border-t border-surface-container-high">
            <div className="font-body-sm text-body-sm">
              © 2026 FableMotion Studio, Inc. All cinematic rights reserved.
            </div>
            <div className="flex items-center gap-space-lg font-body-sm text-body-sm">
              <Link className="hover:text-primary transition-colors" href="/privacy">
                Privacy Policy
              </Link>
              <Link className="hover:text-primary transition-colors" href="/terms">
                Terms of Service
              </Link>
              <a className="hover:text-on-surface transition-colors" href="mailto:security@fablemotion.ai">
                Security &amp; Compliance
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL FOR TOUR VIDEO SIMULATION */}
      {tourOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setTourOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl bg-surface-container rounded-3xl p-space-lg shadow-2xl shadow-black space-y-space-md border border-surface-container-high"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[24px]">movie</span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  FableMotion Studio Walkthrough
                </h3>
              </div>
              <button
                onClick={() => setTourOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant transition-colors border-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="relative w-full aspect-video rounded-2xl bg-black overflow-hidden flex items-center justify-center shadow-inner border border-white/5">
              <iframe
                className="w-full h-full border-none rounded-2xl aspect-video"
                src={DEMO_MODAL_EMBED_URL}
                title="FableMotion Studio Walkthrough"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-body-sm font-body-sm text-on-surface-variant">
              <span>Demonstrating 9:16 vertical drama generation, character continuity, and automated camera sequencing.</span>
              <button
                onClick={() => {
                  setTourOpen(false);
                  handleLaunchStudio();
                }}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-semibold hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors border-none cursor-pointer shrink-0"
              >
                Launch Studio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Menu, X, Play } from 'lucide-react';
import { Fluid } from './fluid';
import { AnimatedGroup } from './animated-group';
import { cn } from '@/lib/utils';
import type { Variants } from 'motion/react';

export interface HeroSectionProps {
  onEnterStudio?: () => void;
  onOpenAuth?: () => void;
  onGetInTouch?: () => void;
  onConnect?: () => void;
  onWhatIsMysh?: () => void;
  brandName?: string;
  taglineYear?: string;
  taglineText?: string;
  titleLine1?: string;
  titleLine2?: string;
  descriptionLine1?: string;
  descriptionLine2?: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  showFluidBackground?: boolean;
}

const transitionVariants: { container?: Variants; item?: Variants } = {
  container: {
    visible: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  },
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 16,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: 'spring',
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

const carouselVariants = {
  container: {
    visible: {
      transition: {
        delayChildren: 0.6,
      },
    },
  },
  item: transitionVariants.item,
};

export const HeroSection: React.FC<HeroSectionProps> = React.memo(({
  onEnterStudio,
  onOpenAuth,
  onGetInTouch,
  onConnect,
  onWhatIsMysh,
  brandName = 'FableMotion',
  taglineYear = '2026',
  taglineText = 'Next-Gen AI Video Stories',
  titleLine1 = 'AI-Driven Stories.',
  titleLine2 = 'Redefining Video Creation.',
  descriptionLine1 = 'Creating viral AI short stories powered by Google Veo 3.1 & Gemini 3.7.',
  descriptionLine2 = 'Automated 5-phase story creation from concept to final captioned render.',
  primaryButtonText = 'Enter Studio',
  secondaryButtonText = 'What is FableMotion?',
  showFluidBackground = true,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePrimaryClick = () => {
    if (onConnect) onConnect();
    else if (onEnterStudio) onEnterStudio();
  };

  const handleSecondaryClick = () => {
    if (onWhatIsMysh) onWhatIsMysh();
    else if (onOpenAuth) onOpenAuth();
  };

  const handleTouchClick = () => {
    if (onGetInTouch) onGetInTouch();
    else if (onOpenAuth) onOpenAuth();
    else if (onEnterStudio) onEnterStudio();
  };

  return (
    <div className="bg-black text-white w-full min-h-screen relative max-w-screen overflow-x-hidden font-sans">
      {/* Layer 1: Ambient Cosmic Mesh Gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        {/* Top-Center Indigo/Purple Halo */}
        <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.22)_0%,rgba(76,29,149,0.12)_45%,transparent_75%)] blur-2xl" />

        {/* Center-Left Amethyst Nebula */}
        <div className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.1)_0%,rgba(147,51,234,0.04)_50%,transparent_70%)] blur-3xl" />

        {/* Center-Right Sapphire Prism */}
        <div className="absolute top-[25%] -right-[10%] w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08)_0%,rgba(14,165,233,0.03)_50%,transparent_70%)] blur-3xl" />
      </div>

      {/* Layer 2: Ambient Diagonal Ray Overlays from hero-section-1 */}
      <div
        aria-hidden="true"
        className="z-[1] absolute inset-0 pointer-events-none isolate opacity-35 contain-strict hidden lg:block"
      >
        <div className="w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(270,70%,65%,.15)_0,hsla(260,60%,45%,.04)_50%,transparent_80%)]" />
        <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(250,80%,70%,.08)_0,hsla(260,50%,40%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
      </div>

      {/* Layer 3: Interactive Visual Engine: Fluid Crystal Dynamics Background Canvas (vgpu/fluid) */}
      {showFluidBackground && (
        <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-auto opacity-90">
          <Fluid className="w-full h-full block touch-none cursor-crosshair" />
        </div>
      )}

      {/* Layer 4: Organic Film Grain / Noise Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[2] opacity-[0.04] mix-blend-screen"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Layer 5: Radial Edge Vignette Depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_50%_35%,transparent_35%,rgba(0,0,0,0.65)_100%)]"
      />

      {/* Dynamic Scrolled Navbar */}
      <header className="sticky top-0 z-30 w-full transition-all duration-300 pointer-events-auto">
        <nav
          className={cn(
            'flex justify-between items-center px-6 sm:px-10 py-4 sm:py-6 transition-all duration-300 relative',
            isScrolled && 'bg-black/75 backdrop-blur-xl border-b border-purple-500/20 py-3 sm:py-4 shadow-2xl shadow-purple-950/40'
          )}
        >
          <div
            onClick={onEnterStudio}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <img
              src="/fablemotion-icon.png"
              alt="FableMotion Logo"
              className="navbar-logo rounded-lg transition-transform group-hover:scale-110 duration-300"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuD-dm5dHUNYqcaoUz9luEfkBqi9qWVgTnsj1yv2A7xxBHLmbTNnzNjeEc2Dzyvw3_tLZ0hNNW-bboaz5mlQPCy4P2AHw-mAAP9cIVv2Qtry27gv0duw2A3gp2yhbB653vZpOgQB7klNwLQUR5Zdl_eefjo_Vnus_h4AlHYPrethZ8kvxYtKQ1oChl_pqpDrTLkBympPTLbVAZDLJCnGqSqeVr95xCzx-GTQoLYNOh22-ad6T4K0a7jNFQcMBsetU9sHGAE';
              }}
            />
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-200 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
              {brandName}
            </span>
          </div>

          <ul className="sm:flex space-x-6 lg:space-x-8 text-sm bg-purple-500/10 py-1.5 rounded-full px-4 hidden backdrop-blur-md border border-purple-500/20 shadow-inner">
            <li
              onClick={onEnterStudio}
              className="cursor-pointer hover:bg-purple-700/80 hover:text-white rounded-full py-1.5 px-3.5 font-light transition-all text-slate-200"
            >
              Home
            </li>
            <li
              onClick={onEnterStudio}
              className="cursor-pointer hover:bg-purple-700/80 hover:text-white rounded-full py-1.5 px-3.5 font-light transition-all text-slate-200"
            >
              About
            </li>
            <li
              onClick={onEnterStudio}
              className="cursor-pointer hover:bg-purple-700/80 hover:text-white rounded-full py-1.5 px-3.5 font-light transition-all text-slate-200"
            >
              Portfolio
            </li>
            <li
              onClick={handleTouchClick}
              className="cursor-pointer hover:bg-purple-700/80 hover:text-white rounded-full py-1.5 px-3.5 font-light transition-all text-slate-200"
            >
              Contact
            </li>
            <li
              onClick={onEnterStudio}
              className="cursor-pointer hover:bg-purple-700/80 hover:text-white rounded-full py-1.5 px-3.5 font-light transition-all text-slate-200"
            >
              FAQ
            </li>
          </ul>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTouchClick}
              className="hidden sm:inline-flex bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all text-white px-5 py-2 rounded-md text-sm font-medium shadow-lg shadow-purple-600/30 cursor-pointer"
            >
              Get In Touch
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden relative z-40 p-2 text-slate-300 hover:text-white cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? (
                <X className="size-6 transition-transform duration-200 rotate-90 scale-100" />
              ) : (
                <Menu className="size-6 transition-transform duration-200 scale-100" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="sm:hidden px-6 py-5 bg-black/95 border-b border-purple-900/40 backdrop-blur-2xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex flex-col space-y-3 text-sm">
              <button
                onClick={() => { setMobileMenuOpen(false); onEnterStudio?.(); }}
                className="text-left py-2 text-slate-200 hover:text-purple-400 font-light"
              >
                Home
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); onEnterStudio?.(); }}
                className="text-left py-2 text-slate-200 hover:text-purple-400 font-light"
              >
                About
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); onEnterStudio?.(); }}
                className="text-left py-2 text-slate-200 hover:text-purple-400 font-light"
              >
                Portfolio
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); handleTouchClick(); }}
                className="text-left py-2 text-slate-200 hover:text-purple-400 font-light"
              >
                Contact
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); onEnterStudio?.(); }}
                className="text-left py-2 text-slate-200 hover:text-purple-400 font-light"
              >
                FAQ
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); handleTouchClick(); }}
                className="w-full bg-purple-600 text-white py-2.5 rounded-md font-medium text-sm mt-2"
              >
                Get In Touch
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Animated Content Section with Spring Blur Stagger Physics */}
      <div className="flex flex-col items-center text-center px-6 sm:px-10 pt-12 sm:pt-20 relative z-10 pointer-events-none">
        <AnimatedGroup variants={transitionVariants} className="flex flex-col items-center max-w-4xl">
          {/* Animated Interactive Badge with sliding double-arrow from hero-section-1 */}
          <div
            onClick={onEnterStudio}
            className="group cursor-pointer pointer-events-auto flex items-center bg-purple-900/30 hover:bg-purple-900/50 border border-purple-600/50 hover:border-purple-500 rounded-full pl-2 pr-3 py-1 text-purple-300 text-xs mb-8 tracking-wider font-light backdrop-blur-md shadow-lg shadow-purple-950/50 transition-all duration-300"
          >
            <span className="bg-purple-600 text-white px-3 py-1 rounded-full mr-2.5 text-xs font-light">
              {taglineYear}
            </span>
            <span className="mr-2">{taglineText}</span>

            {/* Sliding Arrow effect */}
            <div className="bg-purple-800/60 group-hover:bg-purple-600 size-5 overflow-hidden rounded-full transition-colors duration-300 flex items-center justify-center">
              <div className="flex w-10 -translate-x-1/2 transition-transform duration-500 ease-in-out group-hover:translate-x-0">
                <span className="flex size-5 items-center justify-center">
                  <ArrowRight className="size-2.5 text-white" />
                </span>
                <span className="flex size-5 items-center justify-center">
                  <ArrowRight className="size-2.5 text-white" />
                </span>
              </div>
            </div>
          </div>

          {/* Staggered Heading Lines with Spring Blur */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold leading-[1.08] font-light tracking-tight text-white drop-shadow-sm pointer-events-none select-none">
            {titleLine1}
          </h1>
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold leading-[1.08] mb-6 font-light tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-300 bg-clip-text text-transparent pointer-events-none select-none">
            {titleLine2}
          </h1>

          {/* Subheading descriptions */}
          <p className="text-sm sm:text-base max-w-lg mb-2 font-light text-slate-300 pointer-events-none select-none">
            {descriptionLine1}
          </p>
          <p className="text-sm sm:text-base max-w-lg mb-4 font-light text-slate-300 pointer-events-none select-none">
            {descriptionLine2}
          </p>

          {/* Interactive Visual Engine Notice */}
          <div className="flex items-center gap-2 text-[11px] text-purple-300/80 mb-8 font-light bg-purple-950/50 border border-purple-800/40 px-3.5 py-1.5 rounded-full backdrop-blur-md pointer-events-none shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>Interactive Visual Engine · Fluid Crystal Dynamics · Move cursor to swirl gemstone particles</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-12 pointer-events-auto">
            <button
              onClick={handlePrimaryClick}
              className="bg-white hover:bg-purple-100 text-black active:scale-95 transition-all duration-200 px-6 py-2.5 cursor-pointer rounded-md text-sm font-medium shadow-lg shadow-white/10 hover:shadow-purple-500/20"
            >
              {primaryButtonText}
            </button>
            <button
              onClick={handleSecondaryClick}
              className="bg-white/10 hover:bg-purple-600/80 text-white border border-white/20 active:scale-95 transition-all duration-200 px-6 py-2.5 cursor-pointer rounded-md text-sm font-medium backdrop-blur-md hover:border-purple-400"
            >
              {secondaryButtonText}
            </button>
          </div>

          {/* Interactive Studio Preview Mockup with Centered Play Button (shadcn template style) */}
          <div className="relative w-full max-w-5xl mx-auto mb-16 z-20 pointer-events-auto px-2 sm:px-4">
            <div className="relative rounded-2xl p-2 sm:p-3 bg-[#121524]/90 border border-[#242842] shadow-2xl shadow-[#5653fe]/20 backdrop-blur-2xl overflow-hidden group">
              {/* Ambient Glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#5653fe]/30 via-[#7c5cfc]/20 to-[#4f46e5]/30 rounded-2xl blur-xl opacity-60 group-hover:opacity-90 transition-opacity" />

              {/* Dashboard Preview Image/Mockup */}
              <div className="relative rounded-xl overflow-hidden border border-[#242842] aspect-video bg-[#0b0d17]">
                <img
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1920&auto=format&fit=crop&q=85"
                  alt="AI Story Studio Dashboard"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 brightness-[0.8]"
                />

                {/* Top Simulated Window Bar */}
                <div className="absolute top-0 inset-x-0 h-9 bg-[#0b0d17]/85 backdrop-blur-md border-b border-[#242842] px-4 flex items-center justify-between z-20">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 text-xs font-mono text-[#8e93b4]">AI Story Studio — Automated Pipeline</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#a5a8f7] font-medium bg-[#1b1e38] px-2.5 py-0.5 rounded-full border border-[#333863]">
                    <Sparkles className="w-3 h-3 text-[#9b9ef5]" />
                    <span>Interactive Preview</span>
                  </div>
                </div>

                {/* Centered Play Button (Exact shadcn-dashboard-landing-template style) */}
                <div className="absolute inset-0 flex items-center justify-center z-30">
                  <button
                    type="button"
                    onClick={handlePrimaryClick}
                    aria-label="Watch demo video"
                    data-slot="button"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none bg-[#5653fe] hover:bg-[#4f46e5] text-white shadow-xl hover:shadow-[#5653fe]/60 rounded-full h-16 w-16 p-0 cursor-pointer hover:scale-110 active:scale-95 transition-all duration-300 group/btn relative"
                  >
                    {/* Pulsing ring animation */}
                    <span className="absolute -inset-2 rounded-full bg-[#5653fe]/40 animate-ping pointer-events-none" />
                    <span className="absolute -inset-1 rounded-full bg-[#7c5cfc]/30 animate-pulse pointer-events-none" />

                    <Play className="h-6 w-6 fill-current ml-0.5 relative z-10 transition-transform group-hover/btn:scale-110" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </AnimatedGroup>

        {/* Infinite Moving Fading Carousel with Spring Blur Reveal */}
        <AnimatedGroup
          variants={carouselVariants}
          className="w-full max-w-xl mx-auto overflow-hidden relative h-10 mb-20 z-10"
        >
          <div className="flex animate-marquee whitespace-nowrap text-gray-400 text-xl font-light tracking-widest items-center">
            <span className="mx-6 hover:text-purple-400 transition-colors">IPSUM</span>
            <span className="mx-6 text-purple-500">∞</span>
            <span className="mx-6 hover:text-purple-400 transition-colors">MOOO</span>
            {/* Duplicated for seamless loop */}
            <span className="mx-6 hover:text-purple-400 transition-colors">IPSUM</span>
            <span className="mx-6 text-purple-500">∞</span>
            <span className="mx-6 hover:text-purple-400 transition-colors">MOOO</span>
            {/* Redundant loop segment */}
            <span className="mx-6 hover:text-purple-400 transition-colors">IPSUM</span>
            <span className="mx-6 text-purple-500">∞</span>
            <span className="mx-6 hover:text-purple-400 transition-colors">MOOO</span>
          </div>
          {/* Fading gradients */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black via-black/80 to-transparent"></div>
        </AnimatedGroup>
      </div>

      {/* Gradient Glow with Blur Depth */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[400px] bg-gradient-to-t from-purple-900/50 via-purple-600/20 to-transparent rounded-t-full opacity-80 blur-3xl z-[1]"></div>
    </div>
  );
});

export default HeroSection;

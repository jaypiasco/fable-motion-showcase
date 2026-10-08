'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function OEmbedPreviewPage() {
  const [testUrl, setTestUrl] = useState('https://www.instagram.com/p/C6_4E7wL3qZ/');
  const [activeTab, setActiveTab] = useState<'instagram' | 'facebook'>('instagram');

  useEffect(() => {
    // Load Instagram embed script
    if (!(window as any).instgrm) {
      const igScript = document.createElement('script');
      igScript.src = 'https://www.instagram.com/embed.js';
      igScript.async = true;
      document.body.appendChild(igScript);
    } else {
      (window as any).instgrm.Embeds?.process();
    }

    // Load Facebook SDK script
    if (!(window as any).FB) {
      const fbScript = document.createElement('script');
      fbScript.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v20.0';
      fbScript.async = true;
      fbScript.defer = true;
      fbScript.crossOrigin = 'anonymous';
      document.body.appendChild(fbScript);
    } else {
      (window as any).FB.XFBML?.parse();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-surface font-hanken text-on-surface antialiased selection:bg-primary selection:text-on-primary">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/85 backdrop-blur-xl border-b border-surface-container-high shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between gap-space-md">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/fablemotion-icon.png"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuD-dm5dHUNYqcaoUz9luEfkBqi9qWVgTnsj1yv2A7xxBHLmbTNnzNjeEc2Dzyvw3_tLZ0hNNW-bboaz5mlQPCy4P2AHw-mAAP9cIVv2Qtry27gv0duw2A3gp2yhbB653vZpOgQB7klNwLQUR5Zdl_eefjo_Vnus_h4AlHYPrethZ8kvxYtKQ1oChl_pqpDrTLkBympPTLbVAZDLJCnGqSqeVr95xCzx-GTQoLYNOh22-ad6T4K0a7jNFQcMBsetU9sHGAE';
              }}
              alt="FableMotion"
              className="navbar-logo rounded-lg transition-transform group-hover:scale-105"
            />
            <span className="font-sora font-semibold text-headline-sm tracking-tight text-on-surface group-hover:text-primary transition-colors">
              FableMotion
            </span>
          </Link>

          <div className="flex items-center gap-space-md">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-space-md py-space-xs rounded-xl text-label-md font-semibold bg-primary text-on-primary shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:bg-primary-fixed hover:text-on-primary-fixed transition-all"
            >
              Launch Studio
            </Link>
          </div>
        </div>
      </header>

      <div id="fb-root"></div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-space-2xl">
        {/* Meta Review Header Banner */}
        <div className="mb-space-xl p-space-lg rounded-2xl bg-surface-container-lowest border border-surface-container-high">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-label-sm font-medium bg-secondary/10 text-secondary border border-secondary/20 mb-space-sm">
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            <span>Meta App Review — oEmbed Read Feature Test Page</span>
          </div>
          <h1 className="font-sora font-bold text-headline-xl text-on-surface mb-space-xs">
            Meta oEmbed Read Live Demonstration
          </h1>
          <p className="text-body-md text-on-surface-variant max-w-3xl">
            This page provides front-end views of public Facebook and Instagram pages, posts, and videos using Meta&apos;s official oEmbed service. In FableMotion Studio, this feature allows creators to preview and verify published Reels and posts directly within their creative project workspace.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-space-xs mb-space-lg border-b border-surface-container-high pb-2">
          <button
            onClick={() => setActiveTab('instagram')}
            className={`px-space-md py-2 rounded-xl text-label-md font-semibold transition-all cursor-pointer ${
              activeTab === 'instagram'
                ? 'bg-primary text-on-primary shadow-[0_0_16px_rgba(139,92,246,0.35)]'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            Official Instagram Embeds
          </button>
          <button
            onClick={() => setActiveTab('facebook')}
            className={`px-space-md py-2 rounded-xl text-label-md font-semibold transition-all cursor-pointer ${
              activeTab === 'facebook'
                ? 'bg-secondary text-on-secondary shadow-[0_0_16px_rgba(6,182,212,0.35)]'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            Official Facebook Page Embeds
          </button>
        </div>

        {/* Tab 1: Instagram Embeds */}
        {activeTab === 'instagram' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xl">
            {/* Embed 1: Official Instagram Post */}
            <div className="p-space-lg rounded-2xl bg-surface-container-lowest border border-surface-container-high flex flex-col items-center">
              <div className="w-full text-left mb-space-md">
                <span className="text-label-sm font-semibold text-primary block">Source: Official Instagram Account</span>
                <span className="text-body-xs text-outline">https://www.instagram.com/instagram</span>
              </div>
              <div className="w-full flex justify-center min-h-[450px]">
                <blockquote
                  className="instagram-media"
                  data-instgrm-permalink="https://www.instagram.com/instagram/"
                  data-instgrm-version="14"
                  style={{
                    background: '#15121b',
                    border: '1px solid #2c2833',
                    borderRadius: '16px',
                    margin: '1px',
                    maxWidth: '540px',
                    minWidth: '326px',
                    padding: '0',
                    width: '99.375%',
                  }}
                >
                  <div style={{ padding: '16px' }}>
                    <a
                      href="https://www.instagram.com/instagram/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      View the official Instagram profile and reels on Instagram
                    </a>
                  </div>
                </blockquote>
              </div>
            </div>

            {/* Description & Integration Details */}
            <div className="space-y-space-md">
              <div className="p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high">
                <h3 className="font-sora font-semibold text-headline-sm text-on-surface mb-space-xs">
                  How FableMotion Uses Instagram oEmbed
                </h3>
                <ul className="space-y-2 text-body-sm text-on-surface-variant list-disc list-inside">
                  <li>
                    <strong className="text-on-surface">Post-Publishing Verification:</strong> After rendering and publishing an AI video story to Instagram Reels, the studio embeds the live Reel using oEmbed so creators can inspect the post directly.
                  </li>
                  <li>
                    <strong className="text-on-surface">Community Story Showcase:</strong> Allows users to curate and embed public community reels into their creative moodboards and reference timelines.
                  </li>
                  <li>
                    <strong className="text-on-surface">Official Player Compliance:</strong> Uses Meta&apos;s authorized player to respect creator privacy, view metrics, and platform branding.
                  </li>
                </ul>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container-high text-body-xs text-outline space-y-1">
                <div className="font-semibold text-on-surface">Meta Endpoint Specification:</div>
                <code>GET https://graph.facebook.com/v20.0/instagram_oembed?url=&#123;url&#125;</code>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Facebook Embeds */}
        {activeTab === 'facebook' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xl">
            {/* Embed: Official Facebook Page Plugin */}
            <div className="p-space-lg rounded-2xl bg-surface-container-lowest border border-surface-container-high flex flex-col items-center">
              <div className="w-full text-left mb-space-md">
                <span className="text-label-sm font-semibold text-secondary block">Source: Official Facebook Page</span>
                <span className="text-body-xs text-outline">https://www.facebook.com/facebook</span>
              </div>
              <div className="w-full flex justify-center min-h-[450px]">
                <div
                  className="fb-page"
                  data-href="https://www.facebook.com/facebook"
                  data-tabs="timeline"
                  data-width="450"
                  data-height="500"
                  data-small-header="false"
                  data-adapt-container-width="true"
                  data-hide-cover="false"
                  data-show-facepile="true"
                >
                  <blockquote cite="https://www.facebook.com/facebook" className="fb-xfbml-parse-ignore">
                    <a href="https://www.facebook.com/facebook" className="text-secondary hover:underline">
                      Facebook Official Page
                    </a>
                  </blockquote>
                </div>
              </div>
            </div>

            {/* Integration Details */}
            <div className="space-y-space-md">
              <div className="p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high">
                <h3 className="font-sora font-semibold text-headline-sm text-on-surface mb-space-xs">
                  How FableMotion Uses Facebook oEmbed
                </h3>
                <ul className="space-y-2 text-body-sm text-on-surface-variant list-disc list-inside">
                  <li>
                    <strong className="text-on-surface">Page &amp; Video Embeds:</strong> Renders embedded video posts from creators&apos; connected Facebook Pages.
                  </li>
                  <li>
                    <strong className="text-on-surface">Real-Time Presentation:</strong> Creators can confirm caption formatting, video thumbnail alignment, and playback readiness.
                  </li>
                  <li>
                    <strong className="text-on-surface">No Scraping:</strong> Entirely reliant on Meta&apos;s authorized oEmbed API without storing or scraping third-party content.
                  </li>
                </ul>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container-high text-body-xs text-outline space-y-1">
                <div className="font-semibold text-on-surface">Meta Endpoint Specification:</div>
                <code>GET https://graph.facebook.com/v20.0/oembed_page?url=&#123;url&#125;</code>
                <br />
                <code>GET https://graph.facebook.com/v20.0/oembed_post?url=&#123;url&#125;</code>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-space-3xl border-t border-surface-container-high bg-surface-container-lowest/60 py-space-xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-space-md text-body-sm text-on-surface-variant">
          <div>© 2026 FableMotion Studio, Inc. All cinematic rights reserved.</div>
          <div className="flex items-center gap-space-lg">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link href="/" className="hover:text-primary transition-colors">
              Studio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

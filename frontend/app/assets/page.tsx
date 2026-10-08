'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StudioSidebar } from '@/components/StudioSidebar';
import { TopbarProfileMenu } from '@/components/TopbarProfileMenu';
import { supabase } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/admin';

export default function AssetsAndCharactersPage() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
        setIsAdmin(isAdminEmail(user.email));
      }
    });
  }, []);

  const userInitials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : 'SC';
  const userName = userEmail ? userEmail.split('@')[0] : 'Studio Creator';
  const userTier = isAdmin ? 'Admin Tier' : (userEmail ? 'Pro Tier' : 'Guest Tier');

  return (
    <div className="h-screen w-screen bg-[#08090E] text-slate-200 font-sans antialiased overflow-hidden flex select-none">
      {/* Studio Navigation Sidebar */}
      <StudioSidebar
        activePage="assets"
        hideBrandHeader
        isAdmin={isAdmin}
        userInitials={userInitials}
        userName={userName}
        userTier={userTier}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      {/* Main Shell - overflow-visible ensures topbar spans across full width without being clipped behind sidebar */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-visible bg-gradient-to-b from-[#0B0C14] via-[#090A10] to-[#07080D]">
        {/* TopBar Header */}
        <header
          className={`relative ${
            sidebarCollapsed ? '-left-16 w-[calc(100%+4rem)]' : '-left-64 w-[calc(100%+16rem)]'
          } h-14 border-b border-white/[0.07] bg-obsidian-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-50 shrink-0 transition-[left,width] duration-200`}
        >
          {/* Breadcrumbs */}
          <div className="flex items-center space-x-3 text-xs">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex items-center gap-2.5 cursor-pointer group mr-2"
              title="Return to Studio Home"
            >
              <span className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
                <img
                  src="/fablemotion-icon.png"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuD-dm5dHUNYqcaoUz9luEfkBqi9qWVgTnsj1yv2A7xxBHLmbTNnzNjeEc2Dzyvw3_tLZ0hNNW-bboaz5mlQPCy4P2AHw-mAAP9cIVv2Qtry27gv0duw2A3gp2yhbB653vZpOgQB7klNwLQUR5Zdl_eefjo_Vnus_h4AlHYPrethZ8kvxYtKQ1oChl_pqpDrTLkBympPTLbVAZDLJCnGqSqeVr95xCzx-GTQoLYNOh22-ad6T4K0a7jNFQcMBsetU9sHGAE';
                  }}
                  alt="FableMotion"
                  className="w-full h-full object-cover"
                />
              </span>
              <span className="text-white font-semibold tracking-tight text-sm group-hover:text-accent-violet transition-colors">
                FableMotion
              </span>
            </button>
            <span className="text-slate-600 font-mono">/</span>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-slate-400 hover:text-slate-200 cursor-pointer transition text-xs font-normal"
            >
              Studio
            </button>
            <span className="text-slate-600 font-mono">/</span>
            <span className="text-slate-200 font-medium text-xs">Assets &amp; Characters</span>
          </div>

          {/* Topbar Profile Menu */}
          <div className="flex items-center space-x-2.5">
            <TopbarProfileMenu />
          </div>
        </header>

        {/* Minimal Under Development Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-0 overflow-y-auto">
          <div className="space-y-4 max-w-md">
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Feature is under development
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Assets &amp; Characters management is currently in active development.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => router.push('/create')}
                className="px-4 py-2 rounded-lg bg-accent-violet hover:bg-accent-violet-hover text-white text-xs font-medium transition cursor-pointer"
              >
                Create &amp; Generate
              </button>
              <button
                type="button"
                onClick={() => router.push('/library')}
                className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
              >
                Studio Stories
              </button>
              <button
                type="button"
                onClick={() => router.push('/upload')}
                className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
              >
                Deployment Hub
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthModal } from './AuthModal';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const updateSession = (hasSession: boolean) => {
      if (!mounted) return;
      setAuthenticated(hasSession);
      setAuthChecked(true);
      if (hasSession) setAuthModalOpen(false);
    };

    supabase.auth.getSession().then(({ data }) => {
      updateSession(Boolean(data.session));
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      updateSession(Boolean(session));
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-[#08090E] flex items-center justify-center text-slate-400 text-sm">
        Checking your session...
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-[#08090E] text-white flex items-center justify-center px-6">
        <section className="w-full max-w-md rounded-2xl border border-white/[0.10] bg-white/[0.04] p-8 text-center shadow-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300">FableMotion Studio</p>
          <h1 className="mt-3 text-2xl font-semibold">Sign in to continue</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Your studio workspace and connected publishing accounts are private. Sign in before opening the
            creator or deployment tools.
          </p>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="mt-7 w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            Sign in
          </button>
          <a href="/" className="mt-4 inline-block text-xs text-slate-500 hover:text-slate-300">
            Return to landing page
          </a>
          <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        </section>
      </main>
    );
  }

  return <>{children}</>;
}

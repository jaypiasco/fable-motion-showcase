'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { isAdminEmail, getAdminEmails, isWhitelistedEmail, getAllWhitelistedUsers } from '@/lib/admin';
import {
  BarChart,
  Code,
  Eye,
  EyeOff,
  User as UserIcon,
  X,
  Lock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'signin' | 'signup';
}

const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="currentColor"
    height="48"
    viewBox="0 0 40 48"
    width="40"
    {...props}
  >
    <clipPath id="fablemotion-auth-clip">
      <path d="m0 0h40v48h-40z" />
    </clipPath>
    <g clipPath="url(#fablemotion-auth-clip)">
      <path d="m25.0887 5.05386-3.933-1.05386-3.3145 12.3696-2.9923-11.16736-3.9331 1.05386 3.233 12.0655-8.05262-8.0526-2.87919 2.8792 8.83271 8.8328-10.99975-2.9474-1.05385625 3.933 12.01860625 3.2204c-.1376-.5935-.2104-1.2119-.2104-1.8473 0-4.4976 3.646-8.1436 8.1437-8.1436 4.4976 0 8.1436 3.646 8.1436 8.1436 0 .6313-.0719 1.2459-.2078 1.8359l10.9227 2.9267 1.0538-3.933-12.0664-3.2332 11.0005-2.9476-1.0539-3.933-12.0659 3.233 8.0526-8.0526-2.8792-2.87916-8.7102 8.71026z" />
      <path d="m27.8723 26.2214c-.3372 1.4256-1.0491 2.7063-2.0259 3.7324l7.913 7.9131 2.8792-2.8792z" />
      <path d="m25.7665 30.0366c-.9886 1.0097-2.2379 1.7632-3.6389 2.1515l2.8794 10.746 3.933-1.0539z" />
      <path d="m21.9807 32.2274c-.65.1671-1.3313.2559-2.0334.2559-.7522 0-1.4806-.102-2.1721-.2929l-2.882 10.7558 3.933 1.0538z" />
      <path d="m17.6361 32.1507c-1.3796-.4076-2.6067-1.1707-3.5751-2.1833l-7.9325 7.9325 2.87919 2.8792z" />
      <path d="m13.9956 29.8973c-.9518-1.019-1.6451-2.2826-1.9751-3.6862l-10.95836 2.9363 1.05385 3.933z" />
    </g>
  </svg>
);

const GitHubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M12.001 2C6.47598 2 2.00098 6.475 2.00098 12C2.00098 16.425 4.86348 20.1625 8.83848 21.4875C9.33848 21.575 9.52598 21.275 9.52598 21.0125C9.52598 20.775 9.51348 19.9875 9.51348 19.15C7.00098 19.6125 6.35098 18.5375 6.15098 17.975C6.03848 17.6875 5.55098 16.8 5.12598 16.5625C4.77598 16.375 4.27598 15.9125 5.11348 15.9C5.90098 15.8875 6.46348 16.625 6.65098 16.925C7.55098 18.4375 8.98848 18.0125 9.56348 17.75C9.65098 17.1 9.91348 16.6625 10.201 16.4125C7.97598 16.1625 5.65098 15.3 5.65098 11.475C5.65098 10.3875 6.03848 9.4875 6.67598 8.7875C6.57598 8.5375 6.22598 7.5125 6.77598 6.1375C6.77598 6.1375 7.61348 5.875 9.52598 7.1625C10.326 6.9375 11.176 6.825 12.026 6.825C12.876 6.825 13.726 6.9375 14.526 7.1625C16.4385 5.8625 17.276 6.1375 17.276 6.1375C17.826 7.5125 17.476 8.5375 17.376 8.7875C18.0135 9.4875 18.401 10.375 18.401 11.475C18.401 15.3125 16.0635 16.1625 13.8385 16.4125C14.201 16.725 14.5135 17.325 14.5135 18.2625C14.5135 19.6 14.501 20.675 14.501 21.0125C14.501 21.275 14.6885 21.5875 15.1885 21.4875C19.259 20.1133 21.9999 16.2963 22.001 12C22.001 6.475 17.526 2 12.001 2Z" />
  </svg>
);

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'signin' }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('designer');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'github' | 'google' | null>(null);
  const [status, setStatus] = useState<'idle' | 'not_authorized' | 'authenticated' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Sync authMode with initialMode when modal opens
  useEffect(() => {
    if (isOpen && initialMode) {
      setAuthMode(initialMode);
      setErrorMessage('');
    }
  }, [isOpen, initialMode]);

  // Handle ESC key to dismiss modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    if (authMode === 'signup' && !termsAgreed) {
      setErrorMessage('Please accept the Terms and Conditions to proceed.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    // Whitelist check (enforced when whitelist contains authorized users)
    const whitelistedUsers = getAllWhitelistedUsers();
    if (whitelistedUsers.length > 0 && !isWhitelistedEmail(cleanEmail)) {
      setLoading(false);
      setStatus('not_authorized');

      try {
        await supabase.from('waitlist').insert([{ email: cleanEmail, created_at: new Date().toISOString() }]);
      } catch {
        // Silently catch if table not configured
      }
      return;
    }

    const hasSupabaseCreds = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    );

    try {
      if (hasSupabaseCreds) {
        if (authMode === 'signin') {
          const { error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: password,
          });
          if (error) throw error;
          setStatus('authenticated');
        } else {
          const { error } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
              data: {
                first_name: firstName,
                last_name: lastName,
                username: username,
                role: role,
              },
            },
          });
          if (error) throw error;
          setStatus('authenticated');
        }
      } else {
        // Sandbox fallback
        setStatus('authenticated');
      }

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
        setStatus('idle');
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during authentication.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };


  const handleOAuthSignIn = async (provider: 'github' | 'google') => {
    setOauthLoading(provider);
    setErrorMessage('');
    try {
      const hasSupabaseCreds = Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
      );

      if (!hasSupabaseCreds) {
        setStatus('authenticated');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
          setStatus('idle');
          setOauthLoading(null);
        }, 800);
        return;
      }

      const redirectTo = typeof window !== 'undefined'
        ? (window.location.pathname === '/' || window.location.pathname === '/landing'
            ? `${window.location.origin}/library`
            : `${window.location.origin}${window.location.pathname}${window.location.search}`)
        : undefined;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error(`Error logging in with ${provider}:`, err);
      let message = err?.message || `Failed to sign in with ${provider}.`;

      // Parse JSON error message if returned as stringified object
      try {
        if (typeof message === 'string' && message.trim().startsWith('{')) {
          const parsed = JSON.parse(message);
          if (parsed.msg) message = parsed.msg;
        }
      } catch {}

      if (
        message.toLowerCase().includes('provider is not enabled') ||
        message.toLowerCase().includes('unsupported provider')
      ) {
        const providerName = provider === 'github' ? 'GitHub' : 'Google';
        message = `${providerName} sign-in is not enabled in your Supabase project. Please sign in using email/password or enable ${providerName} under Supabase Authentication > Providers.`;
      }

      setErrorMessage(message);
      setStatus('error');
      setOauthLoading(null);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md my-auto mx-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border border-outline-variant/30 bg-surface-container-low text-card-foreground shadow-2xl pb-0 relative overflow-hidden rounded-2xl animate-in fade-in zoom-in-95 duration-200">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-outline hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer z-20"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* STATE 2: Gated Alpha / Invite Only */}
          {status === 'not_authorized' ? (
            /* STATE 2: Gated Alpha / Invite Only */
            <div className="p-6 sm:p-8 space-y-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-center text-muted-foreground">
                <Lock className="w-6 h-6" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container border border-outline-variant/30 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-2">
                  Private Alpha Access
                </div>
                <h2 className="text-xl font-semibold text-foreground tracking-tight">
                  Invite-Only Preview
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 max-w-xs mx-auto">
                  FableMotion Studio is currently reserved for registered testing accounts and authorized partners.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-left">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-0.5">
                  <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
                  <span>Waitlist Recorded</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  We have registered <span className="text-foreground font-medium">{email}</span>. You will receive an invitation when new cohorts open.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    setStatus('idle');
                    setEmail('');
                    setPassword('');
                  }}
                  className="w-full py-2 bg-surface-container hover:bg-surface-container-high text-foreground border border-outline-variant/30"
                >
                  Try Another Email
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Back to Showcase
                </Button>
              </div>
            </div>
          ) : status === 'authenticated' ? (
            /* STATE 3: Success Confirmation */
            <div className="p-8 space-y-4 py-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/15 text-primary border border-primary/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Welcome to FableMotion
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Access granted. Launching studio workspace...
                </p>
              </div>
            </div>
          ) : authMode === 'signup' ? (
            /* STATE 4: Sign Up Form (SignupForm layout) */
            <>
              <CardHeader className="flex flex-col items-center space-y-1.5 pb-3 pt-6">
                <div className="flex items-center space-x-2">
                  <Image
                    src="/fablemotion-icon.png"
                    alt="FableMotion"
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain"
                  />
                  <span className="font-semibold text-lg text-foreground tracking-tight">FableMotion</span>
                </div>
                <div className="space-y-0.5 flex flex-col items-center text-center">
                  <h2 className="text-xl font-semibold text-foreground tracking-tight">
                    Create an account
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Welcome! Create an account to get started.
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 px-6 sm:px-8 pb-6">
                {/* Social Sign Up Buttons */}
                <div className="flex flex-col items-center space-y-2 sm:flex-row sm:space-x-3 sm:space-y-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOAuthSignIn('github')}
                    disabled={loading || oauthLoading !== null}
                    className="w-full sm:flex-1 items-center justify-center space-x-2 py-2 border-outline-variant/30 bg-surface-container hover:bg-surface-container-high hover:border-primary/50 text-foreground transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Sign up with GitHub"
                  >
                    {oauthLoading === 'github' ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <GitHubIcon className="size-4 shrink-0 text-foreground" aria-hidden={true} />
                    )}
                    <span className="text-xs font-medium">
                      {oauthLoading === 'github' ? 'Connecting...' : 'Sign up with GitHub'}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOAuthSignIn('google')}
                    disabled={loading || oauthLoading !== null}
                    className="w-full sm:flex-1 items-center justify-center space-x-2 py-2 sm:mt-0 border-outline-variant/30 bg-surface-container hover:bg-surface-container-high hover:border-primary/50 text-foreground transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Sign up with Google"
                  >
                    {oauthLoading === 'google' ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <GoogleIcon className="size-4 shrink-0" aria-hidden={true} />
                    )}
                    <span className="text-xs font-medium">
                      {oauthLoading === 'google' ? 'Connecting...' : 'Sign up with Google'}
                    </span>
                  </Button>
                </div>

                {/* Separator */}
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-surface-container-low px-2 text-[11px] text-muted-foreground">
                      or with email
                    </span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-error-container/15 border border-error/25 text-error text-xs flex items-start gap-2 text-left">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <Label htmlFor="role">Role</Label>
                    <Select defaultValue="designer" value={role} onValueChange={setRole}>
                      <SelectTrigger
                        id="role"
                        className="[&>span]:flex [&>span]:items-center [&>span]:gap-2 [&>span_svg]:shrink-0"
                      >
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="designer">
                          <div className="flex items-center gap-2">
                            <UserIcon size={16} aria-hidden="true" />
                            <span className="truncate">Product Designer</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="developer">
                          <div className="flex items-center gap-2">
                            <Code size={16} aria-hidden="true" />
                            <span className="truncate">Developer</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="manager">
                          <div className="flex items-center gap-2">
                            <BarChart size={16} aria-hidden="true" />
                            <span className="truncate">Product Manager</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Ada"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Lovelace"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="adalovelace"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="creator@fablemotion.ai"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent hover:text-foreground cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="terms"
                      checked={termsAgreed}
                      onCheckedChange={(checked) => setTermsAgreed(Boolean(checked))}
                    />
                    <label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer select-none">
                      I agree to the{' '}
                      <Link href="/terms" target="_blank" className="text-primary hover:underline">
                        Terms
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" target="_blank" className="text-primary hover:underline">
                        Conditions
                      </Link>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-3 py-2.5 rounded-lg font-semibold text-sm bg-accent-violet hover:bg-accent-violet-hover text-white shadow-md shadow-accent-violet/25 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      'Create free account'
                    )}
                  </Button>
                </form>
              </CardContent>

              <CardFooter className="flex justify-center border-t border-outline-variant/20 !py-3.5 bg-surface-container-lowest/40">
                <p className="text-center text-xs text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setErrorMessage('');
                    }}
                    className="text-accent-violet font-semibold hover:text-accent-violet-hover hover:underline cursor-pointer bg-transparent border-none p-0 inline-flex items-center gap-1 ml-1"
                  >
                    Sign in here
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </p>
              </CardFooter>
            </>
          ) : (
            /* STATE 5: Sign In Form (Login04 layout) */
            <div className="p-6 sm:p-8">
              {/* Header Branding */}
              <div className="flex items-center space-x-2">
                <Image
                  src="/fablemotion-icon.png"
                  alt="FableMotion"
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
                <p className="font-semibold text-lg text-foreground tracking-tight">
                  FableMotion
                </p>
              </div>

              <h3 className="mt-5 text-xl font-semibold text-foreground tracking-tight">
                Sign in to your account
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMessage('');
                  }}
                  className="font-semibold text-accent-violet hover:text-accent-violet-hover hover:underline cursor-pointer bg-transparent border-none p-0 inline-flex items-center gap-0.5 ml-1"
                >
                  Sign up
                  <ArrowRight className="w-3 h-3" />
                </button>
              </p>

              {/* Social Login Buttons */}
              <div className="mt-6 flex flex-col items-center space-y-2 sm:flex-row sm:space-x-3 sm:space-y-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignIn('github')}
                  disabled={loading || oauthLoading !== null}
                  className="w-full sm:flex-1 items-center justify-center space-x-2 py-2 border-outline-variant/30 bg-surface-container hover:bg-surface-container-high hover:border-primary/50 text-foreground transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Sign in with GitHub"
                >
                  {oauthLoading === 'github' ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                  ) : (
                    <GitHubIcon className="size-4 shrink-0 text-foreground" aria-hidden={true} />
                  )}
                  <span className="text-xs font-medium">
                    {oauthLoading === 'github' ? 'Connecting...' : 'Login with GitHub'}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={loading || oauthLoading !== null}
                  className="w-full sm:flex-1 items-center justify-center space-x-2 py-2 sm:mt-0 border-outline-variant/30 bg-surface-container hover:bg-surface-container-high hover:border-primary/50 text-foreground transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Sign in with Google"
                >
                  {oauthLoading === 'google' ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                  ) : (
                    <GoogleIcon className="size-4 shrink-0" aria-hidden={true} />
                  )}
                  <span className="text-xs font-medium">
                    {oauthLoading === 'google' ? 'Connecting...' : 'Login with Google'}
                  </span>
                </Button>
              </div>

              {/* Separator */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-surface-container-low px-2 text-[11px] text-muted-foreground">
                    or
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-error-container/15 border border-error/25 text-error text-xs flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Sign In Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
                <div>
                  <Label
                    htmlFor="email-login-04"
                    className="text-xs font-medium text-foreground block mb-1.5"
                  >
                    Email
                  </Label>
                  <Input
                    type="email"
                    id="email-login-04"
                    name="email-login-04"
                    autoComplete="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator@fablemotion.ai"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="password-login-04"
                    className="text-xs font-medium text-foreground block mb-1.5"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      id="password-login-04"
                      name="password-login-04"
                      autoComplete="current-password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent hover:text-foreground cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-5 w-full py-2.5 rounded-lg font-semibold text-sm bg-accent-violet hover:bg-accent-violet-hover text-white shadow-md shadow-accent-violet/25 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              {/* Bottom Switcher & Support */}
              <div className="mt-5 pt-4 border-t border-outline-variant/20 flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground text-center">
                  Don&apos;t have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setErrorMessage('');
                    }}
                    className="font-semibold text-accent-violet hover:text-accent-violet-hover hover:underline cursor-pointer bg-transparent border-none p-0 inline-flex items-center gap-1 ml-1"
                  >
                    Create an account
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </p>
                <p className="text-[11px] text-muted-foreground/70 text-center">
                  Forgot your password?{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    className="hover:underline hover:text-foreground transition-colors"
                  >
                    Contact support
                  </a>
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>,
    document.body
  );
}

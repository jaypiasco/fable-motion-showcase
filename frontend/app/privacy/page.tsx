'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  const lastUpdated = 'September 8, 2026';

  const sections = [
    { id: 'introduction', title: '1. Introduction & Overview' },
    { id: 'collection', title: '2. Information We Collect' },
    { id: 'usage', title: '3. How We Use Information' },
    { id: 'ai-processing', title: '4. AI Model & Third-Party Processing' },
    { id: 'storage', title: '5. Storage, Retention & Security' },
    { id: 'cookies', title: '6. Cookies & Client Analytics' },
    { id: 'user-rights', title: '7. Your Privacy Rights (GDPR & CCPA)' },
    { id: 'transfers', title: '8. International Data Transfers' },
    { id: 'children', title: '9. Children’s Privacy' },
    { id: 'contact', title: '10. Contact Us & Data Requests' },
  ];

  return (
    <div className="min-h-screen bg-surface font-hanken text-on-surface antialiased selection:bg-primary selection:text-on-primary">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/85 backdrop-blur-xl border-b border-surface-container-high shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between gap-space-md">
          <Link href="/" className="flex items-center space-x-2.5 font-medium tracking-wide group">
            <img
              src="/fablemotion-icon.png"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-dm5dHUNYqcaoUz9luEfkBqi9qWVgTnsj1yv2A7xxBHLmbTNnzNjeEc2Dzyvw3_tLZ0hNNW-bboaz5mlQPCy4P2AHw-mAAP9cIVv2Qtry27gv0duw2A3gp2yhbB653vZpOgQB7klNwLQUR5Zdl_eefjo_Vnus_h4AlHYPrethZ8kvxYtKQ1oChl_pqpDrTLkBympPTLbVAZDLJCnGqSqeVr95xCzx-GTQoLYNOh22-ad6T4K0a7jNFQcMBsetU9sHGAE';
              }}
              alt="FableMotion"
              className="navbar-logo rounded-lg transition-transform group-hover:scale-105"
            />
            <span className="text-white font-semibold tracking-tight text-sm">FableMotion</span>
          </Link>

          <div className="flex items-center gap-space-md">
            <Link
              href="/terms"
              className="text-body-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors hidden sm:inline-block"
            >
              Terms of Service
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-space-md py-space-xs rounded-xl text-label-md font-semibold bg-primary text-on-primary shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:bg-primary-fixed hover:text-on-primary-fixed transition-all"
            >
              Launch Studio
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-space-2xl">
        {/* Hero Header */}
        <div className="mb-space-2xl max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-label-sm font-medium bg-secondary/10 text-secondary border border-secondary/20 mb-space-md">
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span>GDPR &amp; CCPA Compliant</span>
          </div>
          <h1 className="font-sora font-bold text-display-lg text-on-surface tracking-tight mb-space-sm">
            Privacy Policy
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Learn how FableMotion collects, safeguards, and processes your data across our generative AI video studio, creative workflows, and cloud infrastructure.
          </p>
          <div className="mt-space-md flex items-center gap-space-sm text-body-sm text-outline">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            <span>Last Updated: {lastUpdated}</span>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-2xl">
          {/* Sticky Table of Contents */}
          <aside className="lg:col-span-4">
            <div className="sticky top-28 p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high/80 backdrop-blur-md space-y-space-sm">
              <h2 className="font-sora font-semibold text-headline-sm text-on-surface mb-space-xs">
                Table of Contents
              </h2>
              <nav className="flex flex-col space-y-1 text-body-sm">
                {sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="py-1.5 px-2.5 rounded-lg text-on-surface-variant hover:text-secondary hover:bg-surface-container transition-colors"
                  >
                    {sec.title}
                  </a>
                ))}
              </nav>

              <div className="pt-space-md border-t border-surface-container-high text-body-xs text-outline">
                Privacy questions? Contact{' '}
                <a href="mailto:privacy@fablemotion.ai" className="text-secondary hover:underline">
                  privacy@fablemotion.ai
                </a>
              </div>
            </div>
          </aside>

          {/* Detailed Policy Document */}
          <article className="lg:col-span-8 space-y-space-xl text-on-surface-variant leading-relaxed">
            {/* Section 1 */}
            <section id="introduction" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                1. Introduction &amp; Overview
              </h2>
              <p className="text-body-md mb-space-sm">
                At FableMotion Studio, Inc. (&quot;FableMotion&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), we are committed to respecting and protecting the privacy of our creative community, filmmakers, and studio users. This Privacy Policy details how personal information and creative assets are gathered, utilized, stored, and shared when you access our website at fablemotion.ai, our studio dashboard, API endpoints, or our automated generative video pipeline.
              </p>
              <p className="text-body-md">
                By interacting with our platform, you acknowledge the privacy practices outlined in this policy.
              </p>
            </section>

            {/* Section 2 */}
            <section id="collection" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                2. Information We Collect
              </h2>
              <div className="space-y-space-sm text-body-md">
                <div>
                  <strong className="text-on-surface">A. Account &amp; Identity Data:</strong> When you register or authenticate via Supabase Auth or Google OAuth, we collect your email address, display name, and unique authentication identifier.
                </div>
                <div>
                  <strong className="text-on-surface">B. Creative Inputs &amp; Story Assets:</strong> Textual prompts, character descriptions, scripts, uploaded reference keyframes, and custom instructions submitted to our pipeline.
                </div>
                <div>
                  <strong className="text-on-surface">C. Generated Outputs &amp; Render Metadata:</strong> Synthesized video clips, audio tracks, keyframes, storyboards, aspect ratios, model seeds, and duration parameters generated through our 5-phase studio.
                </div>
                <div>
                  <strong className="text-on-surface">D. Telemetry &amp; Device Information:</strong> IP address, browser type, device resolution, operating system, and system log records necessary to diagnose pipeline latency and render failures.
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section id="usage" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                3. How We Use Information
              </h2>
              <p className="text-body-md mb-space-sm">
                We use collected information exclusively to fulfill your creative directives and optimize the studio experience:
              </p>
              <ul className="list-disc list-inside space-y-2 text-body-md pl-space-xs">
                <li>Orchestrating scriptwriting, keyframe rendering, video synthesis, and timeline assembly.</li>
                <li>Maintaining project history, queue state, and asset library persistence.</li>
                <li>Managing billing, credit allocations, and subscription entitlements.</li>
                <li>Diagnosing inference bottlenecks, network errors, and improving platform reliability.</li>
                <li>Preventing abuse, fraud, or violations of our Acceptable Use Policy.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section id="ai-processing" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                4. AI Model &amp; Third-Party Processing
              </h2>
              <p className="text-body-md mb-space-sm">
                To generate cinematic quality short-form video, FableMotion routes generation requests to enterprise AI foundation providers:
              </p>
              <ul className="list-disc list-inside space-y-2 text-body-md pl-space-xs mb-space-sm">
                <li><strong className="text-on-surface">Google Cloud Vertex AI &amp; Gemini:</strong> Powering script intelligence, character consistency, and Google Veo 3.1 video generation.</li>
                <li><strong className="text-on-surface">FLUX / Fal.ai / Pollinations:</strong> Utilized for high-speed keyframe synthesis and image rendering.</li>
              </ul>
              <div className="p-space-md rounded-xl bg-surface-container border border-surface-container-high text-body-sm space-y-1">
                <div className="font-semibold text-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  <span>Zero-Training Guarantee</span>
                </div>
                <p>
                  We access enterprise API tiers where Google Cloud and partner foundation model providers do not retain your private prompts or generated videos to train their public models without your explicit opt-in.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section id="storage" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                5. Storage, Retention &amp; Security
              </h2>
              <p className="text-body-md mb-space-sm">
                All media assets, project manifests, and render queues are stored in secure cloud environments protected by industry-standard encryption protocols:
              </p>
              <ul className="list-disc list-inside space-y-2 text-body-md pl-space-xs mb-space-sm">
                <li><strong className="text-on-surface">In Transit:</strong> Encrypted using TLS 1.3 for all web and API transmissions.</li>
                <li><strong className="text-on-surface">At Rest:</strong> Stored in AES-256 encrypted object storage and relational databases.</li>
              </ul>
              <p className="text-body-md">
                We retain your project assets for as long as your account remains active. You can delete individual story projects or request complete account erasure at any time.
              </p>
            </section>

            {/* Section 6 */}
            <section id="cookies" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                6. Cookies &amp; Client Analytics
              </h2>
              <p className="text-body-md mb-space-sm">
                We utilize essential cookies and browser local storage strictly to remember your active studio session, theme preferences, and editor layout. 
              </p>
              <p className="text-body-md">
                We may use privacy-preserving analytics (such as Vercel Analytics) to monitor page loads, errors, and rendering responsiveness without profiling or selling your personal data to cross-site advertising networks.
              </p>
            </section>

            {/* Section 7 */}
            <section id="user-rights" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                7. Your Privacy Rights (GDPR &amp; CCPA)
              </h2>
              <p className="text-body-md mb-space-sm">
                Regardless of your geographic location, FableMotion honors comprehensive privacy protections:
              </p>
              <ul className="list-disc list-inside space-y-2 text-body-md pl-space-xs mb-space-sm">
                <li><strong className="text-on-surface">Right to Access:</strong> Request a copy of the personal data and creative assets associated with your profile.</li>
                <li><strong className="text-on-surface">Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> Request the permanent deletion of your account, scripts, and rendered media.</li>
                <li><strong className="text-on-surface">Right to Portability:</strong> Export your story JSON schemas, keyframes, and video files in standard open formats.</li>
                <li><strong className="text-on-surface">No Sale of Personal Data:</strong> We do not sell, rent, or trade your personal data to third parties.</li>
              </ul>
              <p className="text-body-md">
                To exercise any of these rights, email <a href="mailto:privacy@fablemotion.ai" className="text-secondary hover:underline">privacy@fablemotion.ai</a>. We respond to all verified requests within thirty (30) days.
              </p>
            </section>

            {/* Section 8 */}
            <section id="transfers" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                8. International Data Transfers
              </h2>
              <p className="text-body-md">
                FableMotion operates across globally distributed cloud infrastructure, including Google Cloud Platform and Cloudflare edge networks. When data is transferred internationally (for example, to US data centers hosting Google Veo inference engines), we implement standard contractual clauses (SCCs) and rigorous technical safeguards to ensure adequate data protection.
              </p>
            </section>

            {/* Section 9 */}
            <section id="children" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                9. Children’s Privacy
              </h2>
              <p className="text-body-md">
                Our Service is not directed to individuals under 13 years of age (or 16 in the EEA). We do not knowingly collect personal information from minors. If you believe a child has provided us with personal data, please contact us immediately so we can promptly delete the information.
              </p>
            </section>

            {/* Section 10 */}
            <section id="contact" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                10. Contact Us &amp; Data Requests
              </h2>
              <p className="text-body-md mb-space-sm">
                If you have questions, concerns, or data protection inquiries regarding this Privacy Policy, please reach out to our Data Protection Officer:
              </p>
              <div className="p-space-md rounded-xl bg-surface-container text-body-sm space-y-1 border border-surface-container-high">
                <div className="font-semibold text-on-surface">FableMotion Studio, Inc.</div>
                <div>Attention: Data Protection &amp; Privacy Officer</div>
                <div>Email: <a href="mailto:privacy@fablemotion.ai" className="text-secondary hover:underline">privacy@fablemotion.ai</a></div>
                <div>General Support: <a href="mailto:support@fablemotion.ai" className="text-secondary hover:underline">support@fablemotion.ai</a></div>
              </div>
            </section>
          </article>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-space-3xl border-t border-surface-container-high bg-surface-container-lowest/60 py-space-xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-space-md text-body-sm text-on-surface-variant">
          <div>© 2026 FableMotion Studio, Inc. All cinematic rights reserved.</div>
          <div className="flex items-center gap-space-lg">
            <Link href="/privacy" className="text-secondary font-semibold">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-secondary transition-colors">
              Terms of Service
            </Link>
            <Link href="/" className="hover:text-secondary transition-colors">
              Studio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

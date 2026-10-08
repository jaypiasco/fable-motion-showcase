'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsOfServicePage() {
  const lastUpdated = 'September 8, 2026';

  const sections = [
    { id: 'acceptance', title: '1. Acceptance of Terms' },
    { id: 'services', title: '2. Services & AI Studio' },
    { id: 'accounts', title: '3. User Accounts & Security' },
    { id: 'ip-content', title: '4. Content Ownership & Rights' },
    { id: 'acceptable-use', title: '5. Acceptable Use Policy' },
    { id: 'ai-disclaimers', title: '6. AI Output & Generation Disclaimer' },
    { id: 'billing', title: '7. Subscriptions, Credits & Billing' },
    { id: 'limitation', title: '8. Limitation of Liability' },
    { id: 'termination', title: '9. Suspension & Termination' },
    { id: 'contact', title: '10. Contact Information' },
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
              href="/privacy"
              className="text-body-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors hidden sm:inline-block"
            >
              Privacy Policy
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-label-sm font-medium bg-primary/10 text-primary border border-primary/20 mb-space-md">
            <span className="material-symbols-outlined text-[16px]">gavel</span>
            <span>Legal Agreement</span>
          </div>
          <h1 className="font-sora font-bold text-display-lg text-on-surface tracking-tight mb-space-sm">
            Terms of Service
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            These terms govern your access to and use of FableMotion Studio, including our automated AI video pipeline, web interfaces, and generation services.
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
                    className="py-1.5 px-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                  >
                    {sec.title}
                  </a>
                ))}
              </nav>

              <div className="pt-space-md border-t border-surface-container-high text-body-xs text-outline">
                Questions? Email us at{' '}
                <a href="mailto:legal@fablemotion.ai" className="text-primary hover:underline">
                  legal@fablemotion.ai
                </a>
              </div>
            </div>
          </aside>

          {/* Detailed Terms Document */}
          <article className="lg:col-span-8 space-y-space-xl text-on-surface-variant leading-relaxed">
            {/* Section 1 */}
            <section id="acceptance" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                1. Acceptance of Terms
              </h2>
              <p className="text-body-md mb-space-sm">
                By accessing, browsing, or using the FableMotion platform (&quot;Service&quot;, &quot;Platform&quot;), operated by FableMotion Studio, Inc. (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
              </p>
              <p className="text-body-md">
                If you are entering into these Terms on behalf of an entity, company, or studio, you represent and warrant that you possess the requisite authority to bind that entity to these conditions. If you do not agree to these Terms, you must immediately discontinue using the Service.
              </p>
            </section>

            {/* Section 2 */}
            <section id="services" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                2. Services &amp; AI Studio
              </h2>
              <p className="text-body-md mb-space-sm">
                FableMotion provides an advanced generative media studio and pipeline orchestrator designed for producing cinematic short-form video stories. Features include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-body-md pl-space-xs mb-space-sm">
                <li>Script &amp; narrative generation powered by multimodal reasoning models.</li>
                <li>Character design and keyframe asset generation.</li>
                <li>Motion synthesis and video generation utilizing foundation video models (such as Google Veo and FLUX).</li>
                <li>Timeline sequencing, audio integration, and export workflows.</li>
              </ul>
              <p className="text-body-md">
                We reserve the right to enhance, modify, update, or discontinue features of the Platform at any time with or without prior notice.
              </p>
            </section>

            {/* Section 3 */}
            <section id="accounts" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                3. User Accounts &amp; Security
              </h2>
              <p className="text-body-md mb-space-sm">
                To access certain features of the Platform, you may be required to authenticate via email or supported OAuth providers. You agree to provide true, current, and accurate credentials and maintain the confidentiality of your account authentication tokens and keys.
              </p>
              <p className="text-body-md">
                You are entirely responsible for all activities occurring under your account or API sessions. You must immediately notify FableMotion at <a href="mailto:security@fablemotion.ai" className="text-primary hover:underline">security@fablemotion.ai</a> upon discovering any unauthorized use or security compromise of your credentials.
              </p>
            </section>

            {/* Section 4 */}
            <section id="ip-content" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                4. Content Ownership &amp; Intellectual Property
              </h2>
              <p className="text-body-md mb-space-sm">
                <strong className="text-on-surface">Your Input:</strong> You retain all right, title, and interest in and to the prompts, story concepts, character descriptions, and media assets you submit to the Platform (&quot;Input&quot;). You grant FableMotion a worldwide, non-exclusive license to process, execute, and store your Input solely for operating and rendering your requested video projects.
              </p>
              <p className="text-body-md mb-space-sm">
                <strong className="text-on-surface">Generated Output:</strong> Subject to your compliance with these Terms and applicable third-party model licenses, as between you and FableMotion, you own and control the video files, keyframes, and stories synthesized by the Platform on your behalf (&quot;Output&quot;).
              </p>
              <p className="text-body-md">
                <strong className="text-on-surface">Commercial Use:</strong> Unless explicitly restricted by an active trial tier or specific model provider constraints, you are free to monetize, distribute, broadcast, or publish your generated videos across commercial channels (including YouTube, TikTok, Instagram, and web).
              </p>
            </section>

            {/* Section 5 */}
            <section id="acceptable-use" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                5. Acceptable Use Policy
              </h2>
              <p className="text-body-md mb-space-sm">
                You agree not to utilize FableMotion to generate, upload, assemble, or distribute content that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-body-md pl-space-xs mb-space-sm">
                <li>Depicts non-consensual sexual content, explicit adult exploitation, or CSAM in any form.</li>
                <li>Promotes terrorism, real-world violence, hate speech, or harassment against individuals or protected groups.</li>
                <li>Generates deceptive deepfakes designed to unlawfully defame, commit fraud, or manipulate elections.</li>
                <li>Infringes upon third-party trademarks, copyrights, or proprietary intellectual property without legal rights.</li>
                <li>Attempts to bypass model safety filters, reverse-engineer pipeline weights, or launch automated scraping/DoS attacks against our endpoints.</li>
              </ul>
              <p className="text-body-md">
                Violation of this Acceptable Use Policy constitutes grounds for immediate termination of your access without refund.
              </p>
            </section>

            {/* Section 6 */}
            <section id="ai-disclaimers" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                6. AI Output &amp; Generation Disclaimer
              </h2>
              <p className="text-body-md mb-space-sm">
                Artificial intelligence and machine learning models are non-deterministic. Outputs may periodically contain hallucinations, visual artifacts, or variations from requested parameters.
              </p>
              <p className="text-body-md">
                FableMotion does not warrant that generated assets will be unique across different users submitting similar prompts, nor do we guarantee uninterrupted or defect-free generative inference. You are responsible for reviewing and verifying all generated media before broadcasting or publishing.
              </p>
            </section>

            {/* Section 7 */}
            <section id="billing" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                7. Subscriptions, Credits &amp; Billing
              </h2>
              <p className="text-body-md mb-space-sm">
                Certain features, model compute tiers, and generation quotas are billed on a recurring subscription or credit-based structure. 
              </p>
              <p className="text-body-md">
                All fees are billed in USD unless otherwise specified. Subscriptions automatically renew at the end of each billing cycle unless cancelled prior to the renewal date via your account dashboard. Render compute consumed during successful pipeline runs is non-refundable.
              </p>
            </section>

            {/* Section 8 */}
            <section id="limitation" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                8. Limitation of Liability
              </h2>
              <p className="text-body-md mb-space-sm">
                To the maximum extent permitted by applicable law, in no event shall FableMotion Studio, Inc., its directors, employees, or partners be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or business interruption.
              </p>
              <p className="text-body-md">
                Our total aggregate liability for all claims related to the Service shall not exceed the amount paid by you to FableMotion in the preceding twelve (12) months.
              </p>
            </section>

            {/* Section 9 */}
            <section id="termination" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                9. Suspension &amp; Termination
              </h2>
              <p className="text-body-md">
                We may suspend or terminate your access to the Platform immediately, without prior notice or liability, for any breach of these Terms, non-payment, or upon lawful order from law enforcement or judicial authorities. Upon termination, your right to use the generation pipeline ceases immediately.
              </p>
            </section>

            {/* Section 10 */}
            <section id="contact" className="scroll-mt-28 p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high">
              <h2 className="font-sora font-semibold text-headline-md text-on-surface mb-space-sm">
                10. Contact Information
              </h2>
              <p className="text-body-md mb-space-sm">
                For legal inquiries, inquiries concerning copyright, or questions regarding these Terms, please contact our legal counsel:
              </p>
              <div className="p-space-md rounded-xl bg-surface-container text-body-sm space-y-1 border border-surface-container-high">
                <div className="font-semibold text-on-surface">FableMotion Studio, Inc.</div>
                <div>Attention: Legal &amp; Compliance Department</div>
                <div>Email: <a href="mailto:legal@fablemotion.ai" className="text-primary hover:underline">legal@fablemotion.ai</a></div>
                <div>Support: <a href="mailto:support@fablemotion.ai" className="text-primary hover:underline">support@fablemotion.ai</a></div>
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
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-primary font-semibold">
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

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FableMotion Studio OS — Generative Cinema Engine',
  description: 'Context-aware cinematic scripting, frame timing, and atmospheric direction synchronized in real time.',
};

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

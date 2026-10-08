"use client";

import { Card } from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";

export interface Step {
  number: string;
  title: string;
  description: string;
  image: string;
  features: string[];
}

interface HowItWorksProps {
  title?: string;
  subtitle?: string;
  steps?: Step[];
}

const defaultSteps: Step[] = [
  {
    number: "01",
    title: "Idea & Script Storyboard",
    description:
      "Gemini 3.7 turns a sentence into a complete viral 3-second hook, logline, and scene-by-scene script with visual directions, dialogue, and timing.",
    image:
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
    features: ["3-Second Viral Hook Engine", "Scene-by-scene script & action beats", "Dynamic character dialogue & narration"],
  },
  {
    number: "02",
    title: "Character Consistency Bibles",
    description:
      "Generates immutable visual character sheets, crystal shaders, signature wardrobe, and style seed prompt anchors for recurring character permanence across scenes.",
    image:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    features: ["3D Faceted Crystal Shaders", "Immutable character sheets", "Style seed prompt anchors"],
  },
  {
    number: "03",
    title: "4K Keyframe Rendering",
    description:
      "Renders photorealistic 9:16 vertical keyframe images with crystal refractions, volumetric light rays, and cinematic composition.",
    image:
      "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=80",
    features: ["9:16 Vertical aspect ratio", "Photorealistic crystal refractions", "Cinematic composition & lighting"],
  },
  {
    number: "04",
    title: "Veo 3.1 Motion Physics",
    description:
      "Formulates dynamic camera motion, boom shots, lighting dynamics, and physics prompts for Google Veo 3.1 Fast at 1080p 24fps.",
    image:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    features: ["Dynamic Camera Boom & Pan", "Realistic Crystal Motion Physics", "Google Veo 3.1 Fast engine"],
  },
  {
    number: "05",
    title: "Video Assembly & Dynamic Captions",
    description:
      "FFmpeg sequential clip stitching, Gemini voiceover narration muxing, and faster-whisper word-level dynamic karaoke caption burning.",
    image:
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
    features: ["Word-level burned .ass subtitles", "Gemini neural voice narration", "Direct 9:16 MP4 export"],
  },
];

export function HowItWorks({
  title = "From First Thought to Final Frame",
  subtitle = "Direct the feeling. We handle the rest. An automated 5-phase pipeline powered by Google Veo 3.1 and Gemini 3.7.",
  steps = defaultSteps,
}: HowItWorksProps) {
  return (
    <section id="workflow" className="py-24 px-6 md:px-12 max-w-7xl mx-auto border-t border-white/10">
      <div className="text-center mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-bold text-violet-400 uppercase tracking-widest mb-4">
          <Sparkles className="w-3.5 h-3.5" /> 5-Phase Video Story Engine
        </div>
        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white">
          {title}
        </h2>
        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      </div>

      <div className="space-y-20">
        {steps.map((step, index) => {
          const isEven = index % 2 === 0;
          return (
            <div
              key={step.number}
              className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} gap-10 lg:gap-16 items-center`}
            >
              {/* Content */}
              <div className="flex-1 space-y-5">
                <div className="inline-block">
                  <span className="text-xs font-bold tracking-widest text-primary uppercase font-mono px-3 py-1 rounded-md bg-primary/10 border border-primary/20">
                    Phase {step.number}
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {step.title}
                </h3>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  {step.description}
                </p>
                <ul className="space-y-2.5 pt-2">
                  {step.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center text-primary flex-shrink-0 border border-primary/30">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-medium text-slate-200">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Image */}
              <div className="flex-1 w-full">
                <Card className="overflow-hidden border-white/15 bg-slate-900/60 p-2 shadow-2xl backdrop-blur-xl">
                  <div className="relative aspect-[16/10] sm:aspect-[4/3] rounded-lg overflow-hidden border border-white/10">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-slate-300">
                      <span className="bg-black/60 backdrop-blur px-2.5 py-1 rounded border border-white/10">
                        {step.title}
                      </span>
                      <span className="bg-violet-500/20 text-violet-300 backdrop-blur px-2.5 py-1 rounded border border-violet-500/30">
                        Veo 3.1 & Gemini 3.7
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default HowItWorks;

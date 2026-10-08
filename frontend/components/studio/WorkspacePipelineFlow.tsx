"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { StoryDetail, CharacterData } from "../../lib/types";
import { resolveMediaUrl } from "../../lib/api";
import { TaskSteps, TaskStep } from "../ui/task-steps";
import { AnimatedShinyText } from "../ui/animated-shiny-text";
import { TextMorph } from "../ui/text-morph";
import { BouncingDots } from "../ui/bouncing-dots";
import { Skeleton } from "../ui/skeleton";
import { List, LayoutGrid, Volume2, ChevronDown, ChevronUp, Sparkles, RefreshCw, Play, Pause, Square, AlertTriangle, AlertCircle, RotateCcw, Video, CheckCircle2, ArrowRight } from "lucide-react";

export interface WorkspacePipelineFlowProps {
  activeStoryDetail: StoryDetail | null;
  activeStoryId?: string | null;
  activePhase: number | null;
  isGenerating?: boolean;
  generatingPrompt?: string;
  generationFailed?: boolean;
  onRetryGeneration?: () => void;
  onCancelGeneration?: () => void;
  onResumeGeneration?: () => void;
  isResuming?: boolean;
  characters: CharacterData[];
  isSynthesizingCharacters: boolean;
  onSynthesizeCharacters: () => void;
  onRegenerateCharacters?: (instructions?: string) => void;
  isRegeneratingCharacters?: boolean;
  onRegenerateKeyframes?: (instructions?: string) => void;
  isRegeneratingKeyframes?: boolean;
  onRegenerateVideoClips?: (instructions?: string) => void;
  isRegeneratingVideoClips?: boolean;
  isAdvancingPhase: boolean;
  onApproveAndProceed: (targetPhase?: number) => void;
  onSelectPhase: (phase: number) => void;
  onOpenVideoPreview?: () => void;
  onDeploy?: () => void;
  isDeploying?: boolean;
  setToastMessage: (msg: string | null) => void;
  onSelectConcept?: (concept: any) => Promise<void>;
  isSelectingConcept?: boolean;
  onSwitchConcept?: () => void;
  onRegenerateConcepts?: () => void;
  isRegeneratingConcepts?: boolean;
  onRunPhase5Assembly?: () => void;
  isAssemblingPhase5?: boolean;
  onRunOneScenePipeline?: () => void;
  isRunningOneScenePipeline?: boolean;
}


const PHASE_1_TASK_STEPS: TaskStep[] = [
  { id: "analyze", label: "Prompt & Theme Analysis", meta: "0.6s" },
  { id: "hook", label: "Drafting 3s Viral Hook", meta: "1.4s" },
  { id: "beats", label: "Scene Beats & Dynamic Dialogue", meta: "2.2s" },
  { id: "compile", label: "Compiling Phase 1 Script Plan", meta: "0.8s" },
];

const PHASE_2_TASK_STEPS: TaskStep[] = [
  { id: "archetypes", label: "Extracting Character Bibles & Style Prompts", meta: "0.8s" },
  { id: "shaders", label: "Formulating Produce Anatomy & Lighting", meta: "1.5s" },
  { id: "anchors", label: "Rendering 9:16 Portrait Anchors in Imagen", meta: "2.4s" },
];

const SCRIPT_MORPH_WORDS = [
  "Analyzing story prompt & context...",
  "Drafting 3-second hook & premise...",
  "Structuring 12-scene narrative arc...",
  "Synthesizing dynamic character conflicts...",
  "Directing camera lighting & lenses...",
  "Compiling Phase 1 script plan...",
];

const CHARACTER_MORPH_WORDS = [
  "Extracting character bibles and style prompts from Phase 1 script...",
  "Calibrating 3D fruit/produce peel textures & facial anatomy...",
  "Configuring 3-point studio rim lighting & 9:16 framing...",
  "Rendering master character reference portraits in Imagen 3...",
  "Storing immutable visual character references in /assets/characters...",
];

export function formatOneWordName(name?: string | null): string {
  if (!name) return "Character";
  const first = name.trim().split(/\s+/)[0];
  return first.replace(/[^a-zA-Z0-9]/g, "") || "Character";
}

export function formatShortRole(role?: string | null, archetype?: string | null, index = 0): string {
  const raw = (role || archetype || "").trim().replace(/[_-]+/g, " ");
  if (!raw) return index === 0 ? "Protagonist" : "Supporting";

  const lower = raw.toLowerCase();
  if (lower.includes("protagonist") || lower.includes("lead") || lower.includes("hero")) return "Protagonist";
  if (lower.includes("antagonist") || lower.includes("rival") || lower.includes("villain")) return "Antagonist";
  if (lower.includes("deuteragonist")) return "Deuteragonist";
  if (lower.includes("love") || lower.includes("interest")) return "Love Interest";
  if (lower.includes("mentor") || lower.includes("coach") || lower.includes("guide")) return "Mentor";
  if (lower.includes("sidekick") || lower.includes("partner") || lower.includes("friend")) return "Sidekick";
  if (lower.includes("supporting") || lower.includes("cast")) return "Supporting";

  // Take at most first 2 words and title-case
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length <= 2) {
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  }
  return words.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

export function getInitialExpandedPhases(detail: StoryDetail | null, activePhase: number | null): Record<number, boolean> {
  const phaseOrder = [
    "phase_1_script",
    "phase_2_characters",
    "phase_3_images",
    "phase_4_animation_prompts",
    "phase_5_video_generation",
  ];
  const curPhase = detail?.current_phase || "phase_1_script";
  const curIdx = phaseOrder.indexOf(curPhase);

  const isAllComplete = curPhase === "completed" || curPhase === "assembly" || Boolean(
    detail?.phases?.phase_5_video_generation?.assembly?.captioned_video_url ||
    detail?.phases?.phase_5_video_generation?.assembly?.final_video_url ||
    (detail as any)?.captioned_video_url ||
    (detail as any)?.final_video_url
  );

  let targetPhase: number;
  if (activePhase) {
    targetPhase = activePhase;
  } else if (isAllComplete) {
    targetPhase = 5;
  } else if (curIdx === -1) {
    targetPhase = 1;
  } else {
    targetPhase = curIdx + 1;
  }

  // Check if video clips are all completed without errors
  const rawClips = (detail?.phases?.phase_5_video_generation as any)?.items ||
                   detail?.phases?.phase_5_video_generation?.clips || [];
  const scenes = detail?.phases?.phase_1_script?.scenes || [];
  const requiredCount = scenes.length > 0 ? scenes.length : 1;
  const completedClips = rawClips.filter((c: any) => Boolean(c.video_url) && c.status === "completed" && !c.error);
  const allClipsDone = rawClips.length >= requiredCount && completedClips.length >= requiredCount;

  // If clips are not all completed or have errors, do NOT expand Phase 5; keep Phase 4 expanded
  let resolvedTargetPhase = targetPhase;
  if (resolvedTargetPhase >= 5 && !allClipsDone && !isAllComplete) {
    resolvedTargetPhase = 4;
  }

  return {
    1: resolvedTargetPhase === 1,
    2: resolvedTargetPhase === 2,
    3: resolvedTargetPhase === 3,
    4: resolvedTargetPhase === 4,
    5: resolvedTargetPhase >= 5,
  };
}

export function WorkspacePipelineFlow({
  activeStoryDetail,
  activeStoryId,
  activePhase,
  isGenerating = false,
  generatingPrompt = "",
  generationFailed = false,
  onRetryGeneration,
  onCancelGeneration,
  onResumeGeneration,
  isResuming = false,
  characters,
  isSynthesizingCharacters,
  onSynthesizeCharacters,
  onRegenerateCharacters,
  isRegeneratingCharacters = false,
  onRegenerateKeyframes,
  isRegeneratingKeyframes = false,
  onRegenerateVideoClips,
  isRegeneratingVideoClips = false,
  isAdvancingPhase,
  onApproveAndProceed,
  onOpenVideoPreview,
  onDeploy,
  isDeploying = false,
  setToastMessage,
  onSelectConcept,
  isSelectingConcept = false,
  onSwitchConcept,
  onRegenerateConcepts,
  isRegeneratingConcepts = false,
  onRunPhase5Assembly,
  isAssemblingPhase5 = false,
  onRunOneScenePipeline,
  isRunningOneScenePipeline = false,
}: WorkspacePipelineFlowProps) {

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [generationStep, setGenerationStep] = useState(0);
  const [characterStep, setCharacterStep] = useState(0);

  // Modification instructions and panel open state for Phase 2, 3, 4
  const [phase2OpenRegen, setPhase2OpenRegen] = useState(false);
  const [phase2Instructions, setPhase2Instructions] = useState("");

  const [phase3OpenRegen, setPhase3OpenRegen] = useState(false);
  const [phase3Instructions, setPhase3Instructions] = useState("");

  const [phase4OpenRegen, setPhase4OpenRegen] = useState(false);
  const [phase4Instructions, setPhase4Instructions] = useState("");

  // Video error inspection state for Phase 4 clips and Phase 5 master video
  const [videoLoadErrors, setVideoLoadErrors] = useState<Record<string | number, { code: number; message: string }>>({});
  const [masterVideoError, setMasterVideoError] = useState<{ code: number; message: string } | null>(null);
  const [masterPlaybackUrl, setMasterPlaybackUrl] = useState<string | null>(null);


  // Accordion toggle states: current active phase expanded, finished phases minimized
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>(() =>
    getInitialExpandedPhases(activeStoryDetail, activePhase)
  );
  const [sceneLayoutMode, setSceneLayoutMode] = useState<"vertical" | "grid">("vertical");
  const [selectedSceneNav, setSelectedSceneNav] = useState<number | null>(null);

  // Phase container refs for scroll positioning
  const phase1Ref = useRef<HTMLDivElement>(null);
  const phase2Ref = useRef<HTMLDivElement>(null);
  const phase3Ref = useRef<HTMLDivElement>(null);
  const phase4Ref = useRef<HTMLDivElement>(null);
  const phase5Ref = useRef<HTMLDivElement>(null);

  const scrollToPhase = useCallback((phase: number) => {
    const refs: Record<number, React.RefObject<HTMLDivElement | null>> = {
      1: phase1Ref,
      2: phase2Ref,
      3: phase3Ref,
      4: phase4Ref,
      5: phase5Ref,
    };
    const target = refs[phase]?.current;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);



  const prevSynthesizingRef = useRef(isSynthesizingCharacters);
  useEffect(() => {
    // When character synthesis finishes, ensure Phase 2 accordion remains expanded so user sees the generated portraits
    if (prevSynthesizingRef.current && !isSynthesizingCharacters) {
      setExpandedPhases((prev) => ({
        ...prev,
        2: true,
      }));
    }
    prevSynthesizingRef.current = isSynthesizingCharacters;
  }, [isSynthesizingCharacters]);

  // Track expanded state for characters in pre-generation vertical list dropdown (defaults to minimized)
  const [expandedCharacterDropdown, setExpandedCharacterDropdown] = useState<Record<number, boolean>>({});

  const toggleCharacterDropdown = (idx: number) => {
    setExpandedCharacterDropdown((prev) => ({
      ...prev,
      [idx]: !Boolean(prev[idx]),
    }));
  };

  const displayCharacters = useMemo(() => {
    const p2List = activeStoryDetail?.phases?.phase_2_characters?.characters;
    const sourceList = (p2List && p2List.length > 0) ? p2List : characters;

    // Extract dynamic visual style direction from Phase 1 script (avoiding hardcoded tailored attire)
    const scriptStyleDirection =
      activeStoryDetail?.phases?.phase_1_script?.visual_style ||
      activeStoryDetail?.phases?.phase_1_script?.style_direction ||
      activeStoryDetail?.phases?.phase_1_script?.lighting ||
      "cinematic 3D animation style, authentic narrative wardrobe and textures matching story context";

    const getWardrobeDescription = (charName: string) => {
      const scenes = activeStoryDetail?.phases?.phase_1_script?.scenes || [];
      const nameKey = (charName || "").toLowerCase().split(" ")[0];
      for (const sc of scenes) {
        const text = `${sc.visual_description || ""} ${sc.action || ""}`.toLowerCase();
        if (nameKey && text.includes(nameKey)) {
          if (text.includes("hoodie") || text.includes("sweatshirt")) return "wearing oversized athletic hoodie";
          if (text.includes("tank top") || text.includes("stringer")) return "wearing gym stringer tank top";
          if (text.includes("suit") || text.includes("blazer")) return "wearing tailored professional attire";
          if (text.includes("dress") || text.includes("gown")) return "wearing elegant evening dress";
          if (text.includes("jacket") || text.includes("coat")) return "wearing stylish streetwear jacket";
          if (text.includes("apron")) return "wearing artisanal apron";
        }
      }
      return "authentic wardrobe matching the character archetype and story storyline";
    };

    if (sourceList && sourceList.length > 0) {
      return sourceList.map((c, i) => {
        const wardrobe = getWardrobeDescription(c.name || "");
        return {
          name: c.name || `Character ${i + 1}`,
          role: c.role || c.archetype || (i === 0 ? "Protagonist" : "Supporting Cast"),
          archetype: c.archetype || c.role || "",
          style_prompt:
            c.style_prompt ||
            c.style_seed_prompt ||
            c.image_prompt_sent ||
            c.portrait_prompt ||
            c.visual_dna ||
            `Full body cinematic 3D character portrait of ${c.name || `Character ${i + 1}`}, an anthropomorphic produce character with natural skin and peel textures, head fused into shoulders with no neck, large glossy expressive eyes, ${wardrobe}. Rendered with ${scriptStyleDirection}, centered on a clean studio background, Octane Render 8k, 9:16 vertical composition.`,
          visual_anchor: c.visual_anchor || c.visual_dna || `Organic peel texture, expressive glossy eyes, ${wardrobe}.`,
          image_url: c.image_url || null,
          status: (c as any).status || (c.image_url ? "completed" : "pending"),
        };
      });
    }

    const scenes = activeStoryDetail?.phases?.phase_1_script?.scenes || [];
    const names: string[] = [];

    // Check script-level characters list
    const scriptLevelChars = (activeStoryDetail?.phases?.phase_1_script as any)?.characters || [];
    if (Array.isArray(scriptLevelChars)) {
      scriptLevelChars.forEach((ch: any) => {
        const cName = typeof ch === "string" ? ch.trim() : ch?.name?.trim();
        if (cName && !names.includes(cName)) names.push(cName);
      });
    }

    // Check scene characters list
    scenes.forEach((sc: any) => {
      (sc.characters || []).forEach((ch: string) => {
        if (typeof ch === "string" && ch.trim() && !names.includes(ch.trim())) {
          names.push(ch.trim());
        }
      });
    });

    // Check dialogue speaker tags in scene scripts
    if (names.length === 0) {
      scenes.forEach((sc: any) => {
        const text = `${sc.dialogue || ""} ${sc.voiceover || ""} ${sc.action || ""}`;
        const matches = text.match(/(?:VOICEOVER\s+)?([A-Z][a-zA-Z]{2,15})(?:\s*\([^)]*\))?:/g);
        if (matches) {
          matches.forEach((m: string) => {
            const clean = m.replace(/^VOICEOVER\s+/i, "").replace(/\s*\([^)]*\)?:/, "").trim();
            if (clean && !["THE", "NARRATOR", "SCENE", "VOICEOVER", "CUT", "FADE", "SHOT"].includes(clean.toUpperCase()) && !names.includes(clean)) {
              names.push(clean);
            }
          });
        }
      });
    }

    // If still no names, derive from title / idea premise
    if (names.length === 0) {
      const ideaTitle = activeStoryDetail?.phases?.phase_1_script?.idea?.title || generatingPrompt || "";
      const commonProduce = ["Banana", "Orange", "Garlic", "Apple", "Lemon", "Durian", "Strawberry", "Tomato", "Broccoli", "Avocado", "Carrot", "Peach"];
      const found = commonProduce.filter((p) => new RegExp(`\\b${p}\\b`, "i").test(ideaTitle));
      if (found.length > 0) {
        found.forEach((p) => names.push(`${p} Lead`));
      }
    }

    // Default generic roles without hardcoding specific fictional names
    if (names.length === 0) {
      names.push("Lead Protagonist", "Supporting Character");
    }

    return names.map((name, i) => {
      const role = i === 0 ? "Protagonist" : i === 1 ? "Antagonist" : "Supporting Cast";
      const wardrobe = getWardrobeDescription(name);
      return {
        name,
        role,
        archetype: i === 0 ? "Lead Character" : "Supporting Cast",
        style_prompt: `Full body cinematic 3D character portrait of ${name}, an anthropomorphic produce character with natural skin and peel textures, head fused into shoulders with no neck, large glossy expressive eyes, ${wardrobe}. Rendered with ${scriptStyleDirection}, centered on a clean studio background, Octane Render 8k, 9:16 vertical composition.`,
        visual_anchor: `Organic peel texture, expressive glossy eyes, ${wardrobe}.`,
        image_url: null,
        status: "pending",
      };
    });
  }, [characters, activeStoryDetail, generatingPrompt]);

  const togglePhaseAccordion = (phase: number) => {
    setExpandedPhases((prev) => {
      const next = prev[phase] !== undefined ? !prev[phase] : false;
      if (next) {
        setTimeout(() => scrollToPhase(phase), 100);
      }
      return {
        ...prev,
        [phase]: next,
      };
    });
  };

  const finalVideoUrl = useMemo(() => {
    const p5Assembly = activeStoryDetail?.phases?.phase_5_video_generation?.assembly;
    const p5Phase = activeStoryDetail?.phases?.phase_5_video_generation as any;
    const mediaFolder = activeStoryDetail?.story_id || activeStoryDetail?.story_slug || "";

    const toPlayable = (value: unknown): string | null => {
      if (!value || typeof value !== "string") return null;
      if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/media/")) {
        return value;
      }
      if (value.startsWith("/api/media/final/")) {
        const filePart = value.replace("/api/media/final/", "");
        return mediaFolder ? `/media/${mediaFolder}/final/${filePart}` : value;
      }
      const norm = value.replace(/\\/g, "/");
      const archiveIdx = norm.toLowerCase().lastIndexOf("/archive/");
      if (archiveIdx !== -1) {
        return `/media/${norm.slice(archiveIdx + "/archive/".length)}`;
      }
      return null;
    };

    const explicit =
      toPlayable(p5Assembly?.captioned_video_url) ||
      toPlayable(p5Phase?.captioned_video_url) ||
      toPlayable((activeStoryDetail as any)?.captioned_video_url) ||
      toPlayable(p5Assembly?.final_video_url) ||
      toPlayable(p5Phase?.final_video_url) ||
      toPlayable((activeStoryDetail as any)?.final_video_url);

    if (explicit) return explicit;

    const assemblyReady = Boolean(
      p5Assembly?.status === "completed" ||
      p5Phase?.status === "completed" ||
      p5Assembly?.final_video_path ||
      p5Assembly?.captioned_video_path ||
      (activeStoryDetail as any)?.has_final_video
    );
    if (!assemblyReady || !mediaFolder) return null;

    const preferCaptioned = Boolean(
      p5Assembly?.captioned_video_url ||
      p5Phase?.captioned_video_url ||
      p5Assembly?.captioned_video_path
    );
    return preferCaptioned
      ? `/media/${mediaFolder}/final/final_story_captioned.mp4`
      : `/media/${mediaFolder}/final/final_story.mp4`;
  }, [activeStoryDetail]);

  useEffect(() => {
    setMasterPlaybackUrl(finalVideoUrl);
    setMasterVideoError(null);
  }, [finalVideoUrl]);

  useEffect(() => {
    if (!masterVideoError) return;
    setExpandedPhases((cur) => (cur[5] ? cur : { ...cur, 5: true }));
  }, [masterVideoError]);

  useEffect(() => {
    if (!isGenerating) {
      setElapsedSeconds(0);
      setGenerationStep(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    const stepTimers = [
      setTimeout(() => setGenerationStep(1), 1000),
      setTimeout(() => setGenerationStep(2), 2500),
      setTimeout(() => setGenerationStep(3), 4800),
    ];

    return () => {
      clearInterval(timer);
      stepTimers.forEach(clearTimeout);
    };
  }, [isGenerating]);

  useEffect(() => {
    if (!isSynthesizingCharacters) {
      setCharacterStep(0);
      return;
    }

    const stepTimers = [
      setTimeout(() => setCharacterStep(1), 1200),
      setTimeout(() => setCharacterStep(2), 3000),
    ];

    return () => {
      stepTimers.forEach(clearTimeout);
    };
  }, [isSynthesizingCharacters]);

  const isAwaitingConceptSelection = Boolean(
    activeStoryDetail?.concepts &&
    activeStoryDetail.concepts.length > 0 &&
    !activeStoryDetail.selected_concept
  );
  const phase1Plan = activeStoryDetail?.phases?.phase_1_script;
  const phase1Done =
    activeStoryDetail?.phases?.phase_1_script?.status === "completed" ||
    phase1Plan?.status === "completed" ||
    Boolean(activeStoryDetail?.concepts && activeStoryDetail.concepts.length > 0);
  const phase2Done =
    activeStoryDetail?.phases?.phase_2_characters?.status === "completed" ||
    (displayCharacters.length > 0 && displayCharacters.every((ch) => Boolean(ch.image_url)));
  const phase3Done = activeStoryDetail?.phases?.phase_3_images?.status === "completed";
  const phase4Status = activeStoryDetail?.phases?.phase_4_animation_prompts?.status;
  const phase4Error =
    activeStoryDetail?.phases?.phase_4_animation_prompts?.error ||
    (phase4Status === "error" ? (activeStoryDetail?.error || "Motion dynamics prompt generation failed.") : null);

  const phase5Status = activeStoryDetail?.phases?.phase_5_video_generation?.status;
  const phase5Error =
    activeStoryDetail?.phases?.phase_5_video_generation?.error ||
    (phase5Status === "error" ? (activeStoryDetail?.error || "Video clip rendering failed.") : null);

  const hasPhase4ClipErrors = Boolean(
    (() => {
      const rawClips = (activeStoryDetail?.phases?.phase_5_video_generation as any)?.items ||
                       activeStoryDetail?.phases?.phase_5_video_generation?.clips || [];
      return rawClips.some((c: any) => c.status === "error" || Boolean(c.error));
    })()
  );

  const hasAnyPhase4Errors = Boolean(
    phase4Error ||
    hasPhase4ClipErrors ||
    Object.keys(videoLoadErrors).length > 0 ||
    phase4Status === "error"
  );

  const allClipsCompleted = Boolean(
    phase1Plan?.scenes &&
    phase1Plan.scenes.length > 0 &&
    !hasAnyPhase4Errors &&
    phase1Plan.scenes.every((sc: any, idx: number) => {
      const sid = sc.scene_id || idx + 1;
      const rawClips = (activeStoryDetail?.phases?.phase_5_video_generation as any)?.items ||
                       activeStoryDetail?.phases?.phase_5_video_generation?.clips || [];
      const c = rawClips.find((item: any) => item.scene_id === sid || item.clip_id === sid);
      return c?.status === "completed" && Boolean(c?.video_url) && !videoLoadErrors[sid] && !c?.error;
    })
  );

  const phase4Done = Boolean(
    !hasAnyPhase4Errors &&
    allClipsCompleted
  );

  const isPhaseApproved = (phase: number) => {
    const curPhase = activeStoryDetail?.current_phase || "phase_1_script";
    if (curPhase === "completed" || curPhase === "assembly") return true;
    const phaseOrder = [
      "phase_1_script",
      "phase_2_characters",
      "phase_3_images",
      "phase_4_animation_prompts",
      "phase_5_video_generation",
    ];
    const curIdx = phaseOrder.indexOf(curPhase);
    if (curIdx === -1) return false;
    return curIdx >= phase;
  };

  // Phase 5 is only completed when the stitched and captioned master video is rendered and available
  // Require BOTH the phase completion markers AND a real video URL to prevent premature "Production Ready"
  const isPhase5Completed = Boolean(
    !isAssemblingPhase5 &&
    Boolean(finalVideoUrl) &&
    (
      Boolean(activeStoryDetail?.phases?.phase_5_video_generation?.assembly?.captioned_video_url) ||
      Boolean(activeStoryDetail?.phases?.phase_5_video_generation?.assembly?.final_video_url) ||
      (
        activeStoryDetail?.current_phase === "completed" &&
        activeStoryDetail?.phases?.phase_5_video_generation?.status === "completed"
      )
    )
  );

  const phase5Done = Boolean(
    !hasAnyPhase4Errors &&
    phase4Done &&
    isPhaseApproved(4) &&
    isPhase5Completed
  );

  const isPhase1Approved = Boolean(
    isPhaseApproved(1) ||
    phase2Done ||
    phase3Done ||
    phase4Done ||
    phase5Done ||
    (activeStoryDetail?.current_phase && activeStoryDetail.current_phase !== "phase_1_script")
  );
  const isPhase2Approved = Boolean(
    isPhaseApproved(2) ||
    phase3Done ||
    phase4Done ||
    phase5Done ||
    ["phase_3_images", "phase_4_animation_prompts", "phase_5_video_generation", "completed"].includes(activeStoryDetail?.current_phase || "")
  );
  const isPhase3Approved = Boolean(
    isPhaseApproved(3) ||
    phase4Done ||
    phase5Done ||
    ["phase_4_animation_prompts", "phase_5_video_generation", "completed"].includes(activeStoryDetail?.current_phase || "")
  );
  const isPhase4Approved = Boolean(
    phase4Done &&
    !hasAnyPhase4Errors &&
    (isPhaseApproved(4) || phase5Done || activeStoryDetail?.current_phase === "phase_5_video_generation" || activeStoryDetail?.current_phase === "assembly" || activeStoryDetail?.current_phase === "completed")
  );

  const isAllPipelineFinished = Boolean(
    phase5Done && phase1Done && phase2Done && phase3Done && phase4Done
  );

  const prevStoryIdRef = useRef<string | null | undefined>(activeStoryId);
  const prevPhasesStatusRef = useRef({
    p1: isPhase1Approved,
    p2: isPhase2Approved,
    p3: isPhase3Approved,
    p4: isPhase4Approved,
    p5: phase5Done,
  });

  // Reset expanded phases and video errors when switching stories
  useEffect(() => {
    if (activeStoryId !== prevStoryIdRef.current) {
      prevStoryIdRef.current = activeStoryId;
      setExpandedPhases(getInitialExpandedPhases(activeStoryDetail, activePhase));
      setVideoLoadErrors({});
      setMasterVideoError(null);
      setMasterPlaybackUrl(null);
      prevPhasesStatusRef.current = {
        p1: isPhase1Approved,
        p2: isPhase2Approved,
        p3: isPhase3Approved,
        p4: isPhase4Approved,
        p5: phase5Done,
      };
    }
  }, [activeStoryId, activeStoryDetail, activePhase, isPhase1Approved, isPhase2Approved, isPhase3Approved, isPhase4Approved, phase5Done]);

  // Expand phase if activePhase explicitly changes from parent
  const prevActivePhaseRef = useRef(activePhase);
  useEffect(() => {
    if (activePhase && activePhase !== prevActivePhaseRef.current) {
      prevActivePhaseRef.current = activePhase;
      setExpandedPhases((prev) => ({
        ...prev,
        [activePhase]: true,
      }));
    }
  }, [activePhase]);

  // Auto-minimize finished phases and advance accordion; anchor scroll position at Phase 1 dropdown
  useEffect(() => {
    const prev = prevPhasesStatusRef.current;
    let anyPhaseStateChanged = false;

    if (!prev.p1 && isPhase1Approved) {
      setExpandedPhases((cur) => ({ ...cur, 1: false, 2: true }));
      anyPhaseStateChanged = true;
    }
    if (!prev.p2 && isPhase2Approved) {
      setExpandedPhases((cur) => ({ ...cur, 2: false, 3: true }));
      anyPhaseStateChanged = true;
    }
    if (!prev.p3 && isPhase3Approved) {
      setExpandedPhases((cur) => ({ ...cur, 3: false, 4: true }));
      anyPhaseStateChanged = true;
    }
    if (!prev.p4 && isPhase4Approved) {
      setExpandedPhases((cur) => ({ ...cur, 4: false, 5: true }));
      anyPhaseStateChanged = true;
    }
    if (!prev.p5 && phase5Done) {
      setExpandedPhases((cur) => ({ ...cur, 5: true }));
      anyPhaseStateChanged = true;
    }

    if (anyPhaseStateChanged) {
      // User directive: place the scroll position after each phase finishes and minimizes their dropdown at the phase 1 dropdown
      const timer = setTimeout(() => {
        scrollToPhase(1);
      }, 150);
      prevPhasesStatusRef.current = {
        p1: isPhase1Approved,
        p2: isPhase2Approved,
        p3: isPhase3Approved,
        p4: isPhase4Approved,
        p5: phase5Done,
      };
      return () => clearTimeout(timer);
    }

    prevPhasesStatusRef.current = {
      p1: isPhase1Approved,
      p2: isPhase2Approved,
      p3: isPhase3Approved,
      p4: isPhase4Approved,
      p5: phase5Done,
    };
  }, [isPhase1Approved, isPhase2Approved, isPhase3Approved, isPhase4Approved, phase5Done, scrollToPhase]);

  const isCancelledOrPaused = Boolean(
    activeStoryDetail?.status === "cancelled" ||
    activeStoryDetail?.status === "paused" ||
    activeStoryDetail?.paused
  );

  const currentPhaseNumber = useMemo(() => {
    const phaseMap: Record<string, number> = {
      phase_1_script: 1,
      phase_2_characters: 2,
      phase_3_images: 3,
      phase_4_animation_prompts: 4,
      phase_5_video_generation: 5,
      completed: 5,
      assembly: 5,
    };
    return activeStoryDetail?.current_phase ? (phaseMap[activeStoryDetail.current_phase] || 1) : 1;
  }, [activeStoryDetail?.current_phase]);

  // Smoothly adjust scroll position: when activePhase is explicitly set from parent, scroll to it; otherwise default/anchor to Phase 1
  useEffect(() => {
    if (activePhase) {
      const timer = setTimeout(() => {
        scrollToPhase(activePhase);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activePhase, scrollToPhase]);

  // Scroll to phase 2 when character generation starts
  useEffect(() => {
    if (isSynthesizingCharacters) {
      const timer = setTimeout(() => {
        scrollToPhase(2);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isSynthesizingCharacters, scrollToPhase]);

  // Scroll to phase 1 when initial prompt synthesis begins
  useEffect(() => {
    if (isGenerating) {
      const timer = setTimeout(() => {
        scrollToPhase(1);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isGenerating, scrollToPhase]);


  const phase2Status = activeStoryDetail?.phases?.phase_2_characters?.status;
  const phase2Error =
    (activeStoryDetail?.phases?.phase_2_characters as any)?.error ||
    (phase2Status === "error" ? (activeStoryDetail?.error || "Character generation failed.") : null);

  const phase3Status = activeStoryDetail?.phases?.phase_3_images?.status;
  const phase3Error = activeStoryDetail?.phases?.phase_3_images?.error || (phase3Status === "error" ? (activeStoryDetail?.error || "Keyframe generation failed.") : null);

  const isPhase1Generating = Boolean(!isCancelledOrPaused && (isGenerating || (activePhase === 1 && !phase1Done)));
  const isPhase2Generating = Boolean(
    !isCancelledOrPaused &&
    !phase2Error &&
    (isSynthesizingCharacters ||
      (isPhase1Approved && !isPhase2Approved && characters.length === 0))
  );
  const isPhase3Generating = Boolean(
    !isCancelledOrPaused && !phase3Error && (
      // isAdvancingPhase covers the approval HTTP call window
      (isPhase2Approved && !isPhase3Approved && isAdvancingPhase) ||
      // current_phase === phase_3_images means backend is actively running this phase
      (!isPhase3Approved && activeStoryDetail?.current_phase === 'phase_3_images') ||
      // item-level activity: some items still in_progress or pending
      (isPhase2Approved && !isPhase3Approved && (
        !activeStoryDetail?.phases?.phase_3_images?.items ||
        activeStoryDetail.phases.phase_3_images.items.length === 0 ||
        activeStoryDetail.phases.phase_3_images.items.some(k => k.status === 'in_progress' || k.status === 'pending' || k.status === 'generating')
      ))
    )
  );
  const isPhase4Generating = Boolean(
    !isCancelledOrPaused && !phase4Error && (
      (isPhase3Approved && !isPhase4Approved && isAdvancingPhase) ||
      // current_phase === phase_4_animation_prompts means backend is actively running this phase
      (!isPhase4Approved && activeStoryDetail?.current_phase === 'phase_4_animation_prompts') ||
      // item-level activity
      (isPhase3Approved && !isPhase4Approved && (
        !activeStoryDetail?.phases?.phase_4_animation_prompts?.items ||
        activeStoryDetail.phases.phase_4_animation_prompts.items.length === 0 ||
        activeStoryDetail.phases.phase_4_animation_prompts.items.some(m => m.status === 'in_progress' || m.status === 'pending' || m.status === 'generating')
      ))
    )
  );
  const isPhase5Generating = Boolean(
    !phase5Error && !isCancelledOrPaused && (
      isAssemblingPhase5 ||
      // Phase 4 approved, assembly not yet complete — keep showing assembling
      (isPhase4Approved && !phase5Done) ||
      // Backend is actively running phase 5 stitching/captioning
      (activeStoryDetail?.current_phase === 'phase_5_video_generation' && !phase5Done) ||
      (activeStoryDetail?.current_phase === 'assembly' && !phase5Done)
    )
  );

  // Real-time active item tracking for live feedback across Phase 2, 3, and 4
  const currentGeneratingChar = (activeStoryDetail?.phases?.phase_2_characters as any)?.current_character;
  const activeCharIndex = useMemo(() => {
    if (currentGeneratingChar) {
      const idx = displayCharacters.findIndex(
        (c) => c.name.trim().toLowerCase() === currentGeneratingChar.trim().toLowerCase()
      );
      if (idx !== -1) return idx;
    }
    return displayCharacters.findIndex((c) => !c.image_url);
  }, [currentGeneratingChar, displayCharacters]);

  const completedCharCount = useMemo(() => {
    return displayCharacters.filter((c) => Boolean(c.image_url)).length;
  }, [displayCharacters]);

  const activeP3SceneId = useMemo(() => {
    const currentSceneId = (activeStoryDetail?.phases?.phase_3_images as any)?.current_scene;
    if (typeof currentSceneId === "number") return currentSceneId;
    const items = activeStoryDetail?.phases?.phase_3_images?.items || [];
    const genItem = items.find((it: any) => it.status === "generating");
    if (genItem) return genItem.scene_id;
    if (isPhase3Generating) {
      const scenes = phase1Plan?.scenes || [];
      const firstUnfinished = (scenes.length > 0 ? scenes : [{ scene_id: 1 }]).find((sc: any, idx: number) => {
        const sid = sc.scene_id || idx + 1;
        const kf = items.find((it: any) => it.scene_id === sid);
        return !kf?.image_url && kf?.status !== "completed";
      });
      return firstUnfinished?.scene_id || 1;
    }
    return null;
  }, [activeStoryDetail, isPhase3Generating, phase1Plan?.scenes]);

  const completedP3Count = useMemo(() => {
    const items = activeStoryDetail?.phases?.phase_3_images?.items || [];
    return items.filter((it: any) => Boolean(it.image_url) || it.status === "completed").length;
  }, [activeStoryDetail]);

  const activeP4SceneId = useMemo(() => {
    const currentSceneId =
      (activeStoryDetail?.phases?.phase_4_animation_prompts as any)?.current_scene ||
      (activeStoryDetail?.phases?.phase_5_video_generation as any)?.current_scene;
    if (typeof currentSceneId === "number") return currentSceneId;

    const rawClips =
      (activeStoryDetail?.phases?.phase_5_video_generation as any)?.items ||
      activeStoryDetail?.phases?.phase_5_video_generation?.clips ||
      [];
    const genClip = rawClips.find((it: any) => it.status === "generating");
    if (genClip) return genClip.scene_id || genClip.clip_id;

    if (isPhase4Generating) {
      const scenes = phase1Plan?.scenes || [];
      const firstUnfinished = (scenes.length > 0 ? scenes : [{ scene_id: 1 }]).find((sc: any, idx: number) => {
        const sid = sc.scene_id || idx + 1;
        const c = rawClips.find((it: any) => it.scene_id === sid || it.clip_id === sid);
        return !c?.video_url && c?.status !== "completed";
      });
      return firstUnfinished?.scene_id || 1;
    }
    return null;
  }, [activeStoryDetail, isPhase4Generating, phase1Plan?.scenes]);

  const completedP4Count = useMemo(() => {
    const rawClips =
      (activeStoryDetail?.phases?.phase_5_video_generation as any)?.items ||
      activeStoryDetail?.phases?.phase_5_video_generation?.clips ||
      [];
    return rawClips.filter((c: any) => Boolean(c.video_url) && c.status === "completed" && !c.error).length;
  }, [activeStoryDetail]);

  return (
    <div className="space-y-4 w-full pb-24 animate-in fade-in duration-300">
      {/* 0. PAUSED / CANCELLED PIPELINE BANNER */}
      {isCancelledOrPaused && (
        <div className="rounded-2xl bg-amber-950/20 border border-amber-500/30 p-4 sm:p-5 shadow-xl relative overflow-hidden transition-all duration-300">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                <Pause className="w-4 h-4 fill-amber-300" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-display font-semibold text-white">
                    Phase {currentPhaseNumber} Generation Paused
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 bg-amber-500/20 border border-amber-500/30 rounded px-1.5 py-0.5">
                    Progress Preserved
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans">
                  Pipeline stopped by user. All generated scenes, character portraits, and clips are saved. Click Resume to continue right where you left off.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {onResumeGeneration && (
                <button
                  type="button"
                  onClick={onResumeGeneration}
                  disabled={isResuming}
                  className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-500 text-white font-display font-semibold text-xs tracking-wide flex items-center gap-2 transition cursor-pointer shadow-glow-sm active:scale-[0.99] disabled:opacity-50"
                >
                  {isResuming ? (
                    <>
                      <BouncingDots className="w-3.5 h-1.5 text-white shrink-0" />
                      <span>Resuming Phase {currentPhaseNumber}...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Resume Generation</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. PHASE 1: SCRIPT & SCENE BEATS */}
      {(phase1Done || isGenerating || isPhase1Generating) && (
        <div ref={phase1Ref} className="rounded-2xl bg-obsidian-850/90 border border-white/[0.08] overflow-hidden transition-all duration-300">
          {/* Phase 1 Accordion Header Toggle */}
          <button
            type="button"
            onClick={() => togglePhaseAccordion(1)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-semibold shrink-0 ${
                isPhase1Approved
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : (isGenerating || isPhase1Generating)
                  ? "bg-violet-600/30 text-violet-200 border border-violet-500/40 animate-pulse"
                  : "bg-violet-600/30 text-violet-200 border border-violet-500/40"
              }`}>
                {isPhase1Approved ? "✓" : (isGenerating || isPhase1Generating) ? "…" : "1"}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-display font-semibold text-white truncate">
                    Phase 1: Script &amp; Scene Beats
                  </span>
                  <span className={`text-[10px] font-mono uppercase rounded px-1.5 py-0.5 border ${
                    isPhase1Approved
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : (isGenerating || isPhase1Generating)
                      ? "text-violet-300 bg-violet-500/15 border-violet-500/30 animate-pulse"
                      : "text-violet-300 bg-violet-500/10 border-violet-500/20"
                  }`}>
                    {isPhase1Approved ? "Approved" : (isGenerating || isPhase1Generating) ? "Generating..." : "Awaiting Approval"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                  {phase1Plan?.idea?.title
                    ? `Premise: "${phase1Plan.idea.title}"`
                    : (isGenerating || isPhase1Generating)
                    ? (generatingPrompt ? `Synthesizing: "${generatingPrompt}"` : "Synthesizing Story Beats & Dialogue...")
                    : `${(phase1Plan?.scenes || []).length || 4} scenes outlined`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-slate-400">
              <span className="text-[11px] font-mono text-slate-500">
                {expandedPhases[1] ? "Collapse" : "View"}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  expandedPhases[1] ? "rotate-180 text-violet-400" : ""
                }`}
              />
            </div>
          </button>

          {/* Full Content */}
          {expandedPhases[1] && (
            <div className={`p-4 sm:p-5 space-y-4 ${isPhase1Approved ? "border-t border-white/[0.06] bg-obsidian-900/40" : ""}`}>
              {(!phase1Done && (isGenerating || isPhase1Generating)) ? (
                /* Dedicated Phase 1 Loading UI while prompt is generating */
                <div className="space-y-4 text-left">
                  {/* Neural Synthesis Live Banner */}
                  <div className="rounded-xl bg-violet-950/25 border border-violet-500/30 p-4 space-y-3 relative overflow-hidden shadow-sm">
                    <div className="absolute -top-10 -right-10 w-36 h-36 bg-violet-600/20 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-violet-500/15 text-violet-300 border border-violet-500/30">
                        <BouncingDots className="w-4 h-2 text-violet-400 shrink-0" />
                        <span>Neural Script Synthesis Running</span>
                      </span>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono text-slate-400 tabular-nums">
                          00:{elapsedSeconds < 10 ? `0${elapsedSeconds}` : elapsedSeconds}s
                        </span>
                        {onCancelGeneration && (
                          <button
                            type="button"
                            onClick={onCancelGeneration}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-100 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                            title="Cancel Phase 1 generation"
                          >
                            <Square className="w-3 h-3 fill-rose-300" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <AnimatedShinyText className="text-sm sm:text-base font-display font-semibold tracking-wide block">
                        Synthesizing Story Beats, Characters &amp; Viral Hook
                      </AnimatedShinyText>
                      {generatingPrompt && (
                        <p className="text-xs text-slate-300 mt-1 line-clamp-2 italic font-sans">
                          &ldquo;{generatingPrompt}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Text Morph Status */}
                    <div className="py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center min-h-[34px]">
                      <TextMorph
                        words={SCRIPT_MORPH_WORDS}
                        interval={2200}
                        className="text-xs text-violet-300 font-mono"
                      />
                    </div>

                    {/* TaskSteps Live Progress */}
                    <div className="pt-2 border-t border-white/[0.06]">
                      <TaskSteps
                        steps={PHASE_1_TASK_STEPS}
                        current={generationStep}
                        failed={generationFailed}
                        label="Phase 1 script generation progress"
                      />
                    </div>

                    {generationFailed && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={onRetryGeneration}
                          className="w-full py-2 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-medium transition cursor-pointer"
                        >
                          Retry Story Generation
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Skeletons preview showing 3s hook & scene beats being assembled */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span className="flex items-center gap-1.5 text-violet-300">
                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                        <span>Constructing Script Architecture...</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Gemini 2.5 Flash</span>
                    </div>

                    {/* 3s Viral Hook Skeleton */}
                    <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-3.5 w-24 rounded bg-amber-400/20" />
                          <Skeleton className="h-3 w-16 rounded bg-amber-400/10" />
                        </div>
                      </div>
                      <Skeleton className="h-3 w-4/5 rounded bg-amber-300/15" />
                      <Skeleton className="h-3 w-2/3 rounded bg-amber-300/15" />
                    </div>

                    {/* Scene Outline Skeletons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((sId) => (
                        <div
                          key={sId}
                          className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <Skeleton className="h-3.5 w-20 rounded" />
                            <Skeleton className="h-3 w-14 rounded" />
                          </div>
                          <Skeleton className="h-3 w-full rounded" />
                          <Skeleton className="h-3 w-3/4 rounded" />
                          <div className="pt-1.5 border-t border-white/[0.04] flex items-center gap-2">
                            <Skeleton className="h-2.5 w-12 rounded" />
                            <Skeleton className="h-2.5 w-3/5 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
              {/* Header row when awaiting approval */}
              {!isPhase1Approved && (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {isPhase1Generating && <BouncingDots className="w-5 h-2.5 text-violet-400 shrink-0" />}
                      <span className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-200 border border-violet-500/40 flex items-center justify-center text-xs font-mono font-medium">
                        1
                      </span>
                      <h2 className="text-sm font-display font-semibold text-white">
                        {isAwaitingConceptSelection
                          ? "Phase 1: Choose Story Concept"
                          : "Phase 1: Story Direction & Scene Beats"}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-sans">
                      {isAwaitingConceptSelection
                        ? "Select one of the 3 viral story concepts below to synthesize full scene beats."
                        : "Select or review your story direction, hook, and narrative arc before advancing."}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 bg-white/[0.05] border border-white/[0.1] rounded-md px-2 py-0.5 shrink-0 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    <span>{isAwaitingConceptSelection ? "Concept Selection" : "Awaiting approval"}</span>
                  </span>
                </div>
              )}

              {/* Concept Selection Stage OR Standard Story Premise & Direction */}
              {isAwaitingConceptSelection ? (
                <div className="space-y-4 py-1 text-left">
                  {/* Call to Action Banner */}
                  <div className="p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/30 text-left space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-violet-300 font-semibold px-2 py-0.5 rounded bg-violet-500/20 border border-violet-500/30">
                          Concept Options
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {activeStoryDetail?.concepts?.length || 3} Concepts Generated
                        </span>
                      </div>
                      {onRegenerateConcepts && (
                        <button
                          type="button"
                          disabled={isRegeneratingConcepts || isSelectingConcept}
                          onClick={onRegenerateConcepts}
                          className="py-1 px-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
                          title="Regenerate 3 fresh concepts with AI"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-violet-400 ${isRegeneratingConcepts ? "animate-spin" : ""}`} />
                          <span>{isRegeneratingConcepts ? "Regenerating..." : "Regenerate Ideas"}</span>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-200 font-sans font-medium">
                      {activeStoryDetail?.call_to_action || "Choose a concept (1, 2, or 3) or provide custom modifications to proceed to Phase 2."}
                    </p>
                  </div>

                  {/* Concept Cards - Loading Skeleton or Vertical List */}
                  {isRegeneratingConcepts ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-violet-500/30">
                        <AnimatedShinyText className="text-xs font-semibold">
                          Generating 3 fresh viral story directions with Gemini...
                        </AnimatedShinyText>
                        <BouncingDots className="w-4 h-2 text-violet-400 shrink-0" />
                      </div>
                      <div className="flex flex-col gap-3">
                        {[1, 2, 3].map((idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <Skeleton className="h-4 w-28 rounded" />
                              <Skeleton className="h-3 w-16 rounded" />
                            </div>
                            <Skeleton className="h-3 w-4/5 rounded" />
                            <Skeleton className="h-3 w-3/5 rounded" />
                            <div className="pt-2 flex justify-end">
                              <Skeleton className="h-8 w-28 rounded-lg" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {activeStoryDetail?.concepts?.map((concept: any, idx: number) => {
                        const cId = concept.id || String(idx + 1);
                        return (
                          <div
                            key={cId}
                            className="rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-violet-400/40 hover:bg-violet-950/20 p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left group"
                          >
                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-violet-300 font-semibold bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 rounded">
                                  Option {cId}
                                </span>
                                {concept.genre && (
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-fuchsia-300 font-semibold bg-fuchsia-500/20 border border-fuchsia-500/30 px-2 py-0.5 rounded">
                                    {concept.genre}
                                  </span>
                                )}
                                <h3 className="text-sm font-display font-semibold text-white group-hover:text-violet-200 transition-colors">
                                  {concept.title || `Concept ${cId}`}
                                </h3>
                                {concept.estimated_scenes && (
                                  <span className="text-[10px] font-mono text-slate-500">
                                    · {concept.estimated_scenes} Scenes
                                  </span>
                                )}
                              </div>

                            {concept.hook_3s && (
                              <div className="text-[11px] text-slate-300 font-sans italic leading-relaxed">
                                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 not-italic mr-1.5">3s Hook:</span>
                                &ldquo;{concept.hook_3s}&rdquo;
                              </div>
                            )}

                            {concept.logline && (
                              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 mr-1.5">Logline:</span>
                                {concept.logline}
                              </p>
                            )}

                            {concept.big_twist && (
                              <p className="text-[11px] text-amber-300/90 font-sans leading-relaxed">
                                <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400/70 mr-1.5">Climax Twist:</span>
                                {concept.big_twist}
                              </p>
                            )}

                            {concept.visual_style && (
                              <p className="text-[10px] text-slate-400 font-sans">
                                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 mr-1.5">Aesthetic:</span>
                                {concept.visual_style}
                              </p>
                            )}

                            {Array.isArray(concept.core_cast) && concept.core_cast.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 mr-1">Cast:</span>
                                {concept.core_cast.slice(0, 4).map((cm: any, cIdx: number) => (
                                  <span
                                    key={cIdx}
                                    className="text-[9px] font-mono text-slate-400 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded"
                                    title={cm.archetype ? `${cm.archetype} (${cm.features || ''})` : ''}
                                  >
                                    {cm.role ? cm.role.replace(/_/g, ' ') : cm.name || 'Cast'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 flex items-center justify-end">
                            <button
                              type="button"
                              disabled={isSelectingConcept}
                              onClick={() => onSelectConcept?.(concept)}
                              className="w-full sm:w-auto py-2.5 px-4 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-200 hover:text-white text-xs font-display font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
                            >
                              {isSelectingConcept ? (
                                <AnimatedShinyText className="text-xs font-medium text-white">
                                  Synthesizing...
                                </AnimatedShinyText>
                              ) : (
                                <span>Choose Option {cId}</span>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
                /* Vertical Minimalist Story Premise & Direction */
                <div className="space-y-3.5 py-1 text-left border-b border-white/[0.06] pb-3">
                  {activeStoryDetail?.selected_concept && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-violet-950/20 border border-violet-500/25">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-violet-300 bg-violet-500/20 border border-violet-500/30 rounded px-1.5 py-0.5">
                        Selected Concept {activeStoryDetail.selected_concept.id || ""}
                      </span>
                      <span className="text-xs font-semibold text-white truncate">
                        {activeStoryDetail.selected_concept.title}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-semibold">Story Title</span>
                    <h3 className="text-sm font-display font-semibold text-white tracking-wide">
                      {phase1Plan?.idea?.title || activeStoryDetail?.selected_concept?.title || activeStoryDetail?.prompt || "Untitled Story"}
                    </h3>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-semibold">Scenario</span>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      {phase1Plan?.idea?.logline || activeStoryDetail?.selected_concept?.logline || activeStoryDetail?.prompt || "Dramatic high-stakes story arc."}
                    </p>
                  </div>

                  {(phase1Plan?.idea?.hook_3s || activeStoryDetail?.selected_concept?.hook_3s) && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-semibold">3-Second Hook</span>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed italic">
                        &ldquo;{phase1Plan?.idea?.hook_3s || activeStoryDetail?.selected_concept?.hook_3s}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Scenes Breakdown Section */}
              {phase1Plan?.scenes && phase1Plan.scenes.length > 0 && (
                <div className="space-y-3 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-medium text-slate-300">
                      Scene Breakdown ({phase1Plan.scenes.length} Scenes)
                    </span>
                    {/* Layout Toggle Buttons with Lucide Icons */}
                    <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => setSceneLayoutMode("vertical")}
                        className={`px-2 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition cursor-pointer ${
                          sceneLayoutMode === "vertical"
                            ? "bg-violet-600/40 text-white border border-violet-500/40 shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                        title="Vertical Text Layout"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Vertical</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSceneLayoutMode("grid")}
                        className={`px-2 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition cursor-pointer ${
                          sceneLayoutMode === "grid"
                            ? "bg-violet-600/40 text-white border border-violet-500/40 shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                        title="Grid Layout"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Grid</span>
                      </button>
                    </div>
                  </div>

                  {/* Navigation Pane: Quick Jump Scene Rail */}
                  <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setSelectedSceneNav(null)}
                      className={`px-2 py-1 rounded-md transition shrink-0 cursor-pointer ${
                        selectedSceneNav === null
                          ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                          : "bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-white/[0.06]"
                      }`}
                    >
                      All Scenes
                    </button>
                    {phase1Plan.scenes.map((s, idx) => (
                      <button
                        key={s.scene_id || idx}
                        type="button"
                        onClick={() => {
                          setSelectedSceneNav(s.scene_id);
                          const el = document.getElementById(`scene-card-${s.scene_id}`);
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        }}
                        className={`px-2 py-1 rounded-md transition shrink-0 cursor-pointer ${
                          selectedSceneNav === s.scene_id
                            ? "bg-violet-500/25 text-violet-200 border border-violet-500/40"
                            : "bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-white/[0.06]"
                        }`}
                      >
                        Scene {s.scene_id}
                      </button>
                    ))}
                  </div>

                  {/* Scenes Content List - Vertical or Grid */}
                  {sceneLayoutMode === "vertical" ? (
                    /* Vertical Text Layout */
                    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                      {phase1Plan.scenes.map((scene, idx) => {
                        const isNavActive = selectedSceneNav === scene.scene_id;
                        const voiceoverText =
                          scene.voiceover ||
                          scene.narration ||
                          (typeof scene.dialogue === "string" && scene.dialogue.trim()
                            ? scene.dialogue.trim()
                            : Array.isArray(scene.dialogue) && scene.dialogue.length > 0
                            ? scene.dialogue
                                .map((d: any) =>
                                  d.exact_speech
                                    ? `${d.speaker ? d.speaker + ": " : ""}${d.exact_speech}`
                                    : ""
                                )
                                .filter(Boolean)
                                .join(" ")
                            : null) ||
                          (scene.characters && scene.characters.length > 0 && scene.visual_description
                            ? `${scene.characters[0]}: "${scene.visual_description}"`
                            : scene.visual_description
                            ? `Narrator: ${scene.visual_description}`
                            : `Scene ${scene.scene_id}: Spoken dialogue delivering high-stakes confrontation.`);

                        return (
                          <div
                            key={idx}
                            id={`scene-card-${scene.scene_id}`}
                            className={`p-3.5 rounded-xl transition text-left space-y-2.5 ${
                              isNavActive
                                ? "bg-violet-950/20 border border-violet-500/40 ring-1 ring-violet-500/20"
                                : "bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12]"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                              <span className="font-semibold text-white">Scene {scene.scene_id}</span>
                              {scene.shot_type && (
                                <span className="text-violet-400">{scene.shot_type}</span>
                              )}
                            </div>

                            {scene.setting && (
                              <div className="text-[11px] text-slate-400 font-mono">
                                <span className="text-slate-500">Setting:</span> {scene.setting}
                              </div>
                            )}

                            <p className="text-xs text-slate-300 font-sans leading-relaxed">
                              {scene.visual_description || "Dynamic visual story sequence"}
                            </p>

                            {/* Dedicated Voiceover / Hook Block */}
                            {scene.scene_id === 1 && (scene.hook_3s || activeStoryDetail?.selected_concept?.hook_3s || phase1Plan?.idea?.hook_3s) ? (
                              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 text-amber-300 font-mono text-[10px] uppercase tracking-wider font-semibold">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>3s Viral Retention Hook</span>
                                  </div>
                                  <span className="text-[9px] font-mono text-amber-400/80 bg-amber-400/10 border border-amber-400/20 rounded px-1.5 py-0.5">
                                    TikTok / Reels
                                  </span>
                                </div>
                                <p className="text-xs text-amber-100 font-sans leading-relaxed italic font-medium">
                                  "{scene.hook_3s || activeStoryDetail?.selected_concept?.hook_3s || phase1Plan?.idea?.hook_3s}"
                                </p>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                                <div className="flex items-center gap-1.5 text-violet-400 font-mono text-[10px] uppercase tracking-wider">
                                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>Voiceover</span>
                                </div>
                                <p className="text-xs text-slate-200 font-sans leading-relaxed italic">
                                  {voiceoverText}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Grid Layout */
                    <div className="grid gap-2.5 sm:grid-cols-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                      {phase1Plan.scenes.map((scene, idx) => {
                        const isNavActive = selectedSceneNav === scene.scene_id;
                        const voiceoverText =
                          scene.voiceover ||
                          scene.narration ||
                          (typeof scene.dialogue === "string" && scene.dialogue.trim()
                            ? scene.dialogue.trim()
                            : Array.isArray(scene.dialogue) && scene.dialogue.length > 0
                            ? scene.dialogue
                                .map((d: any) =>
                                  d.exact_speech
                                    ? `${d.speaker ? d.speaker + ": " : ""}${d.exact_speech}`
                                    : ""
                                )
                                .filter(Boolean)
                                .join(" ")
                            : null) ||
                          (scene.characters && scene.characters.length > 0 && scene.visual_description
                            ? `${scene.characters[0]}: "${scene.visual_description}"`
                            : scene.visual_description
                            ? `Narrator: ${scene.visual_description}`
                            : `Scene ${scene.scene_id}: Spoken dialogue delivering high-stakes confrontation.`);

                        return (
                          <div
                            key={idx}
                            id={`scene-card-${scene.scene_id}`}
                            className={`p-3 rounded-xl transition text-left space-y-2 flex flex-col justify-between ${
                              isNavActive
                                ? "bg-violet-950/20 border border-violet-500/40 ring-1 ring-violet-500/20"
                                : "bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12]"
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                                <span className="font-semibold text-white">Scene {scene.scene_id}</span>
                                {scene.shot_type && (
                                  <span className="text-violet-400 text-[10px]">{scene.shot_type}</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-300 font-sans line-clamp-3 leading-relaxed">
                                {scene.visual_description || scene.setting || "Dynamic visual story sequence"}
                              </p>
                            </div>

                            {/* Dedicated Voiceover / Hook Block */}
                            {scene.scene_id === 1 && (scene.hook_3s || activeStoryDetail?.selected_concept?.hook_3s || phase1Plan?.idea?.hook_3s) ? (
                              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 space-y-1 mt-1">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1 text-amber-300 font-mono text-[9px] uppercase tracking-wider font-semibold">
                                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                                    <span>Viral 3s Hook</span>
                                  </div>
                                  <span className="text-[8px] font-mono text-amber-400/80 bg-amber-400/10 border border-amber-400/20 rounded px-1">
                                    TikTok/Reels
                                  </span>
                                </div>
                                <p className="text-[11px] text-amber-100 font-sans line-clamp-2 italic font-medium">
                                  "{scene.hook_3s || activeStoryDetail?.selected_concept?.hook_3s || phase1Plan?.idea?.hook_3s}"
                                </p>
                              </div>
                            ) : (
                              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1 mt-1">
                                <div className="flex items-center gap-1.5 text-violet-400 font-mono text-[9px] uppercase tracking-wider">
                                  <Volume2 className="w-3 h-3 shrink-0" />
                                  <span>Voiceover</span>
                                </div>
                                <p className="text-[11px] text-slate-200 font-sans line-clamp-2 italic">
                                  {voiceoverText}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Approve Button (Shown when Phase 1 script generated & NOT approved & NOT generating) */}
              {!isPhase1Approved && phase1Done && !isAwaitingConceptSelection && !isGenerating && !isPhase1Generating && (
                <div className="pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedPhases((prev) => ({ ...prev, 1: false, 2: true }));
                      onApproveAndProceed(1);
                    }}
                    disabled={isAdvancingPhase}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 hover:from-violet-500 hover:to-indigo-500 text-white font-display font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-glow-sm active:scale-[0.99] disabled:opacity-50"
                  >
                    {isAdvancingPhase ? (
                      <AnimatedShinyText className="text-xs font-medium text-white">
                        Advancing to Phase 2...
                      </AnimatedShinyText>
                    ) : (
                      <>
                        <span>Approve &amp; Continue to Characters</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}

                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. PHASE 2: CHARACTER BIBLES & ASSETS */}
      {isPhase1Approved && (
        <div ref={phase2Ref} className="rounded-2xl bg-obsidian-850/90 border border-white/[0.08] overflow-hidden transition-all duration-300">
          {/* Phase 2 Accordion Header Toggle */}
          <button
            type="button"
            onClick={() => togglePhaseAccordion(2)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-semibold shrink-0 ${
                isPhase2Approved
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : isSynthesizingCharacters
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30 animate-pulse"
                  : phase2Error
                  ? "bg-rose-500/20 text-rose-200 border border-rose-500/40"
                  : "bg-violet-600/30 text-violet-200 border border-violet-500/40"
              }`}>
                {isPhase2Approved ? "✓" : isSynthesizingCharacters ? "…" : "2"}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-display font-semibold text-white truncate">
                    Phase 2: Character Bibles &amp; /assets
                  </span>
                  <span className={`text-[10px] font-mono uppercase rounded px-1.5 py-0.5 border ${
                    isPhase2Approved
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : isSynthesizingCharacters
                      ? "text-violet-300 bg-violet-500/15 border-violet-500/30 animate-pulse"
                      : phase2Error
                      ? "text-rose-300 bg-rose-500/15 border-rose-500/30"
                      : "text-slate-300 bg-white/[0.05] border-white/[0.1]"
                  }`}>
                    {isPhase2Approved ? "Approved" : isSynthesizingCharacters ? "Generating..." : phase2Error ? "Error" : "Awaiting Approval"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                  {displayCharacters.length > 0 ? `${displayCharacters.length} Character Profiles (${completedCharCount}/${displayCharacters.length} Anchored in /assets)` : "Character Bibles Active"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-slate-400">
              <span className="text-[11px] font-mono text-slate-500">
                {expandedPhases[2] ? "Collapse" : "View"}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  expandedPhases[2] ? "rotate-180 text-violet-400" : ""
                }`}
              />
            </div>
          </button>

          {/* Full Content */}
          {expandedPhases[2] && (
            <div className={`p-4 sm:p-5 space-y-4 ${isPhase2Approved ? "border-t border-white/[0.06] bg-obsidian-900/40" : ""}`}>
              {!isPhase2Approved && (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {isPhase2Generating && <BouncingDots className="w-5 h-2.5 text-violet-400 shrink-0" />}
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-medium ${
                        phase2Error
                          ? "bg-rose-500/20 text-rose-200 border border-rose-500/40"
                          : "bg-violet-600/30 text-violet-200 border border-violet-500/40"
                      }`}>
                        2
                      </span>
                      <h2 className="text-sm font-display font-semibold text-white">
                        Phase 2: Character Bibles &amp; Visual Anchors
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-sans">
                      Synthesize visual DNA, crystal shaders, and 9:16 portrait anchors stored in /assets.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isPhase2Generating && onCancelGeneration && (
                      <button
                        type="button"
                        onClick={onCancelGeneration}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-100 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                        title="Cancel character generation"
                      >
                        <Square className="w-3 h-3 fill-rose-300" />
                        <span>Cancel</span>
                      </button>
                    )}
                    <span className={`text-[10px] font-mono uppercase tracking-wider rounded-md px-2 py-0.5 flex items-center gap-1.5 border ${
                      phase2Error
                        ? "text-rose-300 bg-rose-500/15 border-rose-500/30"
                        : "text-slate-300 bg-white/[0.05] border-white/[0.1]"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${phase2Error ? "bg-rose-400" : "bg-violet-400"}`} />
                      <span>{isPhase2Generating ? "Generating..." : phase2Error ? "Generation error" : "Awaiting approval"}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Phase 2 Error Alert Banner */}
              {phase2Error && (
                <div className="rounded-xl bg-rose-950/30 border border-rose-500/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-200">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-semibold text-rose-200">Character Generation Notice</p>
                      <p className="text-[11px] text-rose-300/80 break-words font-sans">{phase2Error}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (onRegenerateCharacters) {
                          onRegenerateCharacters();
                        } else if (onSynthesizeCharacters) {
                          onSynthesizeCharacters();
                        } else if (onResumeGeneration) {
                          onResumeGeneration();
                        } else if (onRetryGeneration) {
                          onRetryGeneration();
                        }
                      }}
                      disabled={isSynthesizingCharacters || isRegeneratingCharacters}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      <RotateCcw className={`w-3 h-3 ${(isSynthesizingCharacters || isRegeneratingCharacters) ? "animate-spin" : ""}`} />
                      <span>{(isSynthesizingCharacters || isRegeneratingCharacters) ? "Retrying..." : "Retry Phase 2"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Character Synthesis In-Progress State (Progressive Live Roster) */}
              {isSynthesizingCharacters ? (
                <div className="rounded-xl bg-white/[0.02] border border-violet-500/30 p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <AnimatedShinyText className="text-xs font-semibold truncate block">
                        {completedCharCount === displayCharacters.length
                          ? "All Character Portraits Completed!"
                          : activeCharIndex !== -1
                            ? `Generating Portrait: ${displayCharacters[activeCharIndex]?.name} (${completedCharCount + 1}/${displayCharacters.length})...`
                            : "Generating Character Portraits in Imagen 3..."}
                      </AnimatedShinyText>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                        {completedCharCount} of {displayCharacters.length} character reference portraits generated and saved to /assets.
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <BouncingDots className="w-4 h-2 text-violet-400 shrink-0" />
                      {onCancelGeneration && (
                        <button
                          type="button"
                          onClick={onCancelGeneration}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-100 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                          title="Cancel character generation"
                        >
                          <Square className="w-3 h-3 fill-rose-300" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="py-2 px-3 rounded-lg bg-violet-950/20 border border-violet-500/20 flex items-center gap-2.5 min-h-[34px] overflow-hidden">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
                    <TextMorph
                      words={CHARACTER_MORPH_WORDS}
                      interval={2800}
                      className="text-xs text-violet-200 font-mono tracking-tight"
                    />
                  </div>
                  <TaskSteps
                    steps={PHASE_2_TASK_STEPS}
                    current={characterStep}
                    label="Character image generation progress"
                  />

                  {/* Progressive Live Roster: Immediate loading as each character finishes */}
                  <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>9:16 Character Reference Anchors ({completedCharCount}/{displayCharacters.length} Ready)</span>
                      <span className="text-violet-400">/assets/characters</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {displayCharacters.map((c, i) => {
                        const isCompleted = Boolean(c.image_url);
                        const isGeneratingThis = isSynthesizingCharacters && (
                          (currentGeneratingChar && c.name.trim().toLowerCase() === currentGeneratingChar.trim().toLowerCase()) ||
                          (!currentGeneratingChar && i === activeCharIndex)
                        );
                        return (
                          <div
                            key={i}
                            className={`p-2.5 rounded-xl transition-all duration-300 space-y-2 ${
                              isGeneratingThis
                                ? "bg-violet-950/30 border-2 border-violet-500 shadow-lg shadow-violet-500/10 ring-1 ring-violet-400/40"
                                : isCompleted
                                  ? "bg-white/[0.02] border border-emerald-500/30"
                                  : "bg-white/[0.01] border border-white/[0.06] opacity-70"
                            }`}
                          >
                            {isCompleted ? (
                              <div className="relative aspect-[9/16] w-full rounded-lg overflow-hidden border border-emerald-500/30 group">
                                <img
                                  src={resolveMediaUrl(c.image_url)}
                                  alt={c.name}
                                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                  }}
                                />
                                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-emerald-500/40 text-[9px] font-mono text-emerald-300 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span>Ready</span>
                                </div>
                              </div>
                            ) : isGeneratingThis ? (
                              <div className="relative aspect-[9/16] w-full rounded-lg overflow-hidden border border-violet-500/40 bg-violet-950/40">
                                <Skeleton className="w-full h-full rounded-lg bg-violet-950/40 animate-pulse" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 text-center pointer-events-none">
                                  <BouncingDots className="w-4 h-2 text-violet-400" />
                                  <span className="text-[10px] font-mono text-violet-200 font-semibold animate-pulse">Generating Portrait</span>
                                  <span className="text-[10px] font-sans text-white font-medium truncate max-w-full px-1">{c.name}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="relative aspect-[9/16] w-full rounded-lg overflow-hidden border border-white/[0.08] bg-white/[0.02]">
                                <Skeleton className="w-full h-full rounded-lg bg-white/[0.03]" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center gap-1.5 pointer-events-none">
                                  <div className="w-6 h-6 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400">
                                    <Sparkles className="w-3 h-3 text-slate-400" />
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-300 font-medium">9:16 Portrait</span>
                                  <span className="text-[9px] font-mono text-slate-500">Queued</span>
                                </div>
                              </div>
                            )}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="text-[11px] font-display font-medium text-white">{formatOneWordName(c.name)}</div>
                                <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                                  isCompleted
                                    ? "text-emerald-400 bg-emerald-500/10"
                                    : isGeneratingThis
                                      ? "text-violet-300 bg-violet-500/20 font-semibold"
                                      : "text-slate-500 bg-white/[0.04]"
                                }`}>
                                  {isCompleted ? "✓ Ready" : isGeneratingThis ? "Rendering..." : "Queued"}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-sans">{formatShortRole(c.role, c.archetype, i)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : !displayCharacters.some((ch) => Boolean(ch.image_url)) ? (
                /* Pre-generation State: Vertical List Dropdown with UI Skeletons for ungenerated characters */
                <div className="space-y-4 py-1 text-left">
                  {/* Top Header Banner */}
                  <div className="p-3.5 rounded-xl bg-violet-950/25 border border-violet-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-violet-300 font-semibold px-2 py-0.5 rounded bg-violet-500/20 border border-violet-500/30">
                          Character Roster
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {displayCharacters.length} Characters Identified from Script
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-sans">
                        Review each character&apos;s visual DNA, 9:16 portrait canvas, and style prompt below before generating portraits.
                      </p>
                    </div>


                  </div>

                  {/* Vertical List Dropdown of Characters with 9:16 Portrait Skeletons */}
                  <div className="flex flex-col gap-3">
                    {displayCharacters.map((ch, idx) => {
                      const isExpanded = Boolean(expandedCharacterDropdown[idx]);
                      return (
                        <div
                          key={idx}
                          className="rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-violet-500/30 transition-all overflow-hidden"
                        >
                          {/* Dropdown Card Header Toggle */}
                          <button
                            type="button"
                            onClick={() => toggleCharacterDropdown(idx)}
                            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition cursor-pointer"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              {/* 9:16 Portrait Skeleton Thumbnail */}
                              <div className="w-12 sm:w-14 aspect-[9/16] rounded-lg border border-violet-500/30 bg-violet-950/30 relative overflow-hidden shrink-0 flex flex-col items-center justify-center">
                                <Skeleton className="w-full h-full bg-violet-950/40" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center pointer-events-none">
                                  <Sparkles className="w-3.5 h-3.5 text-violet-400 mb-0.5" />
                                  <span className="text-[8px] font-mono text-violet-300 font-semibold">9:16</span>
                                  <span className="text-[7px] font-mono text-slate-400">Skeleton</span>
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-display font-semibold text-white text-xs">
                                    {formatOneWordName(ch.name)}
                                  </span>
                                  <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded shrink-0">
                                    {formatShortRole(ch.role, ch.archetype, idx)}
                                  </span>
                                  <span className="text-[9px] font-mono text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded hidden sm:inline">
                                    Pending Imagen 3
                                  </span>
                                </div>
                                {ch.visual_anchor && (
                                  <p className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                                    {ch.visual_anchor}
                                  </p>
                                )}
                                <p className="text-[10px] font-mono text-violet-300/70 truncate mt-0.5">
                                  Portrait Anchor: Ready for Synthesis
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 text-slate-400 pl-2">
                              <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                                {isExpanded ? "Hide Details" : "View Style Prompt"}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-violet-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </button>

                          {/* Collapsible Style Prompt & 9:16 Portrait Canvas Preview */}
                          {isExpanded && (
                            <div className="px-3.5 pb-3.5 pt-0 space-y-3 border-t border-white/[0.04]">
                              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                                {/* Explicit 9:16 Portrait Skeleton Preview */}
                                <div className="w-full sm:w-32 aspect-[9/16] rounded-xl border border-violet-500/30 bg-violet-950/30 relative overflow-hidden shrink-0 shadow-md flex flex-col items-center justify-center p-2 text-center">
                                  <Skeleton className="w-full h-full bg-violet-950/40" />
                                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center gap-1.5 pointer-events-none">
                                    <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                                      <Sparkles className="w-4 h-4 text-violet-300 animate-pulse" />
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-mono font-semibold text-violet-200 block">9:16 Canvas</span>
                                      <span className="text-[8px] font-sans text-slate-400 block mt-0.5">Pending Synthesis</span>
                                    </div>
                                    <span className="text-[8px] font-mono uppercase bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded border border-violet-500/30">
                                      Imagen 3
                                    </span>
                                  </div>
                                </div>

                                {/* Character Details & Style Prompt */}
                                <div className="flex-1 space-y-2 min-w-0">
                                  <div className="rounded-lg bg-obsidian-900/80 border border-white/[0.06] p-3 space-y-2">
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                      <span className="text-violet-400 uppercase tracking-wider font-semibold">
                                        Style Prompt (Sent to Imagen)
                                      </span>
                                      <span className="text-slate-500">9:16 Vertical Composition</span>
                                    </div>
                                    <p className="text-xs font-mono text-slate-200 leading-relaxed break-words selection:bg-violet-600/40">
                                      {ch.style_prompt}
                                    </p>
                                    {ch.visual_anchor && (
                                      <div className="pt-2 border-t border-white/[0.04] text-[11px] text-slate-400 flex items-start gap-1.5 font-sans">
                                        <span className="text-[9px] font-mono uppercase text-violet-400/80 shrink-0 mt-0.5 font-medium">
                                          Visual Anchor:
                                        </span>
                                        <span className="text-slate-300">{ch.visual_anchor}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Primary Action Button Below List */}
                  <div className="pt-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={onSynthesizeCharacters}
                      disabled={isSynthesizingCharacters}
                      className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 hover:from-violet-500 hover:to-indigo-500 text-white font-display font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-glow-sm active:scale-[0.99] disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4 text-violet-200" />
                      <span>Generate Image Character</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Generated State: Display rendered 9:16 portraits */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>{completedCharCount} of {displayCharacters.length} Character Portraits Ready</span>
                    <button
                      type="button"
                      onClick={() => setPhase2OpenRegen(!phase2OpenRegen)}
                      disabled={isSynthesizingCharacters || isRegeneratingCharacters}
                      className="text-violet-400 hover:text-violet-300 text-[11px] cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 transition"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSynthesizingCharacters || isRegeneratingCharacters ? "animate-spin text-violet-300" : ""}`} />
                      <span>{phase2OpenRegen ? "Close Customizer" : "Regenerate Characters"}</span>
                    </button>
                  </div>

                  {/* Phase 2 Custom Modification & Regeneration Panel */}
                  {phase2OpenRegen && (
                    <div className="p-3.5 rounded-xl bg-obsidian-900/90 border border-violet-500/30 space-y-3 animate-fade-in text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-white">
                          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                          <span>Custom Character Modification (Optional)</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">Phase 2</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans">
                        Optionally describe what you want to modify before regenerating character portraits and bibles.
                      </p>
                      <textarea
                        value={phase2Instructions}
                        onChange={(e) => setPhase2Instructions(e.target.value)}
                        placeholder="e.g., 'Make the orange character's facial expressions more intense and suspicious', 'Sharpen the garlic character's arched eyebrows', 'Softer lighting'..."
                        rows={2}
                        className="w-full text-xs font-mono bg-white/[0.03] border border-white/[0.1] rounded-lg p-2.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setPhase2OpenRegen(false)}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-mono transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSynthesizingCharacters || isRegeneratingCharacters}
                          onClick={() => {
                            if (onRegenerateCharacters) {
                              onRegenerateCharacters(phase2Instructions);
                            } else {
                              onSynthesizeCharacters();
                            }
                            setPhase2OpenRegen(false);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${(isSynthesizingCharacters || isRegeneratingCharacters) ? "animate-spin" : ""}`} />
                          <span>{(isSynthesizingCharacters || isRegeneratingCharacters) ? "Regenerating..." : "Confirm & Regenerate"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Generation Banner in Generated State */}
                  {(isSynthesizingCharacters || isRegeneratingCharacters || (activeStoryDetail?.phases?.phase_2_characters as any)?.status === "generating" || (activeStoryDetail?.phases?.phase_2_characters as any)?.status === "in_progress") && (
                    <div className="p-3 rounded-xl bg-violet-950/25 border border-violet-500/30 flex items-center justify-between gap-2.5 shadow-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BouncingDots className="w-4 h-2 text-violet-400 shrink-0" />
                        <span className="text-xs font-mono text-violet-200 truncate">
                          {completedCharCount === displayCharacters.length
                            ? "All character portraits rendered."
                            : `Generating character portrait in Imagen 3 (${completedCharCount}/${displayCharacters.length} ready)...`}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-violet-300 bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 rounded shrink-0">
                        Imagen 3 Active
                      </span>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    {displayCharacters.map((ch, idx) => {
                      const isCompleted = Boolean(ch.image_url);
                      const isP2Active = Boolean(
                        isSynthesizingCharacters ||
                        isRegeneratingCharacters ||
                        activePhase === 2 ||
                        (activeStoryDetail?.phases?.phase_2_characters as any)?.status === "generating" ||
                        (activeStoryDetail?.phases?.phase_2_characters as any)?.status === "in_progress" ||
                        (isPhase1Approved && !isPhase2Approved)
                      );
                      const isGeneratingThis = isP2Active && (
                        (currentGeneratingChar && ch.name.trim().toLowerCase() === currentGeneratingChar.trim().toLowerCase()) ||
                        (!currentGeneratingChar && idx === activeCharIndex) ||
                        (ch as any).status === "generating" ||
                        (!isCompleted && !currentGeneratingChar && idx === displayCharacters.findIndex((c) => !c.image_url))
                      );

                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl transition-all duration-300 flex gap-3.5 ${
                            isGeneratingThis
                              ? "bg-violet-950/20 border-2 border-violet-500 shadow-lg shadow-violet-500/10 ring-1 ring-violet-400/30"
                              : isCompleted
                                ? "bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/20"
                                : "bg-white/[0.01] border border-white/[0.06]"
                          }`}
                        >
                          <div className="w-20 shrink-0">
                            {isCompleted ? (
                              <div className="relative w-20 aspect-[9/16] rounded-lg overflow-hidden border border-emerald-500/30 bg-black group">
                                <img
                                  src={resolveMediaUrl(ch.image_url)}
                                  alt={ch.name}
                                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                  }}
                                />
                                {isP2Active && isGeneratingThis && (
                                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-1 text-center">
                                    <BouncingDots className="w-4 h-2 text-violet-400 mb-1" />
                                    <span className="text-[8px] font-mono text-violet-200">Updating</span>
                                  </div>
                                )}
                              </div>
                            ) : isGeneratingThis ? (
                              /* Active UI Skeleton for Generating Character */
                              <div className="relative w-20 aspect-[9/16] rounded-lg overflow-hidden border border-violet-500/50 bg-violet-950/40 shadow-inner">
                                <Skeleton className="w-full h-full rounded-lg bg-violet-950/50 animate-pulse" />
                                <div className="absolute inset-0 bg-gradient-to-b from-violet-600/20 via-indigo-600/10 to-violet-900/30 animate-pulse" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center gap-1 pointer-events-none">
                                  <BouncingDots className="w-4 h-2 text-violet-400 mb-0.5" />
                                  <span className="text-[8px] font-mono text-violet-200 font-semibold animate-pulse leading-tight">
                                    Rendering
                                  </span>
                                  <span className="text-[7px] font-mono text-violet-400/80">9:16 Canvas</span>
                                </div>
                              </div>
                            ) : (
                              /* Queued / Pending UI Skeleton */
                              <div className="relative w-20 aspect-[9/16] rounded-lg overflow-hidden border border-violet-500/20 bg-obsidian-900/90 shadow-inner">
                                <Skeleton className="w-full h-full rounded-lg bg-white/[0.03] animate-pulse" />
                                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-white/[0.01]" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center gap-1 pointer-events-none">
                                  <Sparkles className="w-3.5 h-3.5 text-violet-400/70 animate-pulse" />
                                  <span className="text-[8px] font-mono text-slate-300 font-medium">9:16 Canvas</span>
                                  <span className="text-[7px] font-mono text-violet-300 bg-violet-500/15 px-1 py-0.5 rounded border border-violet-500/25">Queued</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-display font-semibold text-white text-xs truncate">
                                {formatOneWordName(ch.name)}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {isGeneratingThis ? (
                                  <span className="text-[9px] font-mono text-violet-300 bg-violet-500/20 border border-violet-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
                                    Rendering...
                                  </span>
                                ) : isCompleted ? (
                                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                    ✓ Ready
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono text-slate-400 bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                    Queued
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
                                  {formatShortRole(ch.role, ch.archetype, idx)}
                                </span>
                              </div>
                            </div>
                            {isGeneratingThis ? (
                              <div className="space-y-1.5 py-1">
                                <Skeleton className="h-2 w-4/5 bg-violet-500/20 rounded animate-pulse" />
                                <Skeleton className="h-2 w-3/5 bg-violet-500/15 rounded animate-pulse" />
                                <p className="text-[10px] font-mono text-violet-300/80 animate-pulse pt-0.5">
                                  Generating 9:16 character portrait in Imagen 3...
                                </p>
                              </div>
                            ) : !isCompleted ? (
                              <div className="space-y-1.5 py-1">
                                <Skeleton className="h-2 w-3/4 bg-white/[0.05] rounded animate-pulse" />
                                <Skeleton className="h-2 w-1/2 bg-white/[0.03] rounded animate-pulse" />
                                <p className="text-[10px] font-mono text-slate-400 pt-0.5">
                                  Queued for Imagen 3 synthesis
                                </p>
                              </div>
                            ) : (
                              <>
                                <p className="text-[11px] text-slate-300 line-clamp-3 font-sans leading-relaxed">
                                  {ch.visual_anchor || ch.style_prompt}
                                </p>
                                {ch.style_prompt && (
                                  <p className="text-[10px] font-mono text-slate-500 truncate pt-1 border-t border-white/[0.04]">
                                    Prompt: {ch.style_prompt}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Approve Button (Shown when character portraits generated & NOT approved) */}
              {!isPhase2Approved && displayCharacters.some((ch) => Boolean(ch.image_url)) && (
                <div className="pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedPhases((prev) => ({ ...prev, 2: false, 3: true }));
                      onApproveAndProceed(2);
                    }}
                    disabled={isAdvancingPhase}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 hover:from-violet-500 hover:to-indigo-500 text-white font-display font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-glow-sm active:scale-[0.99] disabled:opacity-50"
                  >
                    {isAdvancingPhase ? (
                      <AnimatedShinyText className="text-xs font-medium text-white">
                        Advancing to Phase 3...
                      </AnimatedShinyText>
                    ) : (
                      <>
                        <span>Approve &amp; Continue</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. PHASE 3: SCENE KEYFRAME GENERATION */}
      {isPhase2Approved && (
        <div ref={phase3Ref} className="rounded-2xl bg-obsidian-850/90 border border-white/[0.08] overflow-hidden transition-all duration-300">
          {/* Phase 3 Accordion Header Toggle */}
          <button
            type="button"
            onClick={() => togglePhaseAccordion(3)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-semibold shrink-0 ${
                isPhase3Approved
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : isPhase3Generating
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30 animate-pulse"
                  : phase3Error
                  ? "bg-rose-500/20 text-rose-200 border border-rose-500/40"
                  : "bg-violet-600/30 text-violet-200 border border-violet-500/40"
              }`}>
                {isPhase3Approved ? "✓" : isPhase3Generating ? "…" : "3"}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-display font-semibold text-white truncate">
                    Phase 3: Scene Keyframe Generation
                  </span>
                  <span className={`text-[10px] font-mono uppercase rounded px-1.5 py-0.5 border ${
                    isPhase3Approved
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : isPhase3Generating
                      ? "text-violet-300 bg-violet-500/15 border-violet-500/30 animate-pulse"
                      : phase3Error
                      ? "text-rose-300 bg-rose-500/15 border-rose-500/30"
                      : "text-slate-300 bg-white/[0.05] border-white/[0.1]"
                  }`}>
                    {isPhase3Approved ? "Approved" : isPhase3Generating ? "Generating..." : phase3Error ? "Error" : "Awaiting Approval"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                  {activeStoryDetail?.phases?.phase_3_images?.items?.length || completedP3Count || 4} Keyframe shots generated in 9:16
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-slate-400">
              <span className="text-[11px] font-mono text-slate-500">
                {expandedPhases[3] ? "Collapse" : "View"}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  expandedPhases[3] ? "rotate-180 text-violet-400" : ""
                }`}
              />
            </div>
          </button>

          {/* Full Content */}
          {expandedPhases[3] && (
            <div className={`p-4 sm:p-5 space-y-4 ${isPhase3Approved ? "border-t border-white/[0.06] bg-obsidian-900/40" : ""}`}>
              {!isPhase3Approved && (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {isPhase3Generating && <BouncingDots className="w-5 h-2.5 text-violet-400 shrink-0" />}
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-medium ${
                        phase3Error
                          ? "bg-rose-500/20 text-rose-200 border border-rose-500/40"
                          : "bg-violet-600/30 text-violet-200 border border-violet-500/40"
                      }`}>
                        3
                      </span>
                      <h2 className="text-sm font-display font-semibold text-white">
                        Phase 3: Scene Keyframe Generation
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-sans">
                      Per-clip keyframes generated using scene scripts and character portraits from /assets.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isPhase3Generating && onCancelGeneration && (
                      <button
                        type="button"
                        onClick={onCancelGeneration}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-100 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                        title="Cancel keyframe generation"
                      >
                        <Square className="w-3 h-3 fill-rose-300" />
                        <span>Cancel</span>
                      </button>
                    )}
                    <span className={`text-[10px] font-mono uppercase tracking-wider rounded-md px-2 py-0.5 flex items-center gap-1.5 border ${
                      phase3Error
                        ? "text-rose-300 bg-rose-500/15 border-rose-500/30"
                        : "text-slate-300 bg-white/[0.05] border-white/[0.1]"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${phase3Error ? "bg-rose-400" : isPhase3Generating ? "bg-violet-400 animate-pulse" : "bg-emerald-400"}`} />
                      <span>{isPhase3Generating ? (activeP3SceneId ? `Rendering Scene ${activeP3SceneId} (${completedP3Count}/${(phase1Plan?.scenes || []).length || 4})...` : "Generating...") : phase3Error ? "Generation error" : "Awaiting approval"}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Phase 3 Error Alert Banner */}
              {phase3Error && (
                <div className="rounded-xl bg-rose-950/30 border border-rose-500/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-200">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-semibold text-rose-200">Keyframe Generation Notice</p>
                      <p className="text-[11px] text-rose-300/80 break-words font-sans">{phase3Error}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(onResumeGeneration || onRetryGeneration) && (
                      <button
                        type="button"
                        onClick={onResumeGeneration || onRetryGeneration}
                        disabled={isResuming}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{isResuming ? "Retrying..." : "Retry Phase 3"}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Phase 3 Subheader Toolbar */}
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Keyframe Visuals ({completedP3Count}/{(phase1Plan?.scenes || []).length || 4} Rendered)</span>
                {onRegenerateKeyframes && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onRegenerateKeyframes()}
                      disabled={isPhase3Generating || isRegeneratingKeyframes}
                      className="text-violet-300 hover:text-white text-[11px] font-medium cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 transition disabled:opacity-50"
                      title="Immediately regenerate all scene keyframes"
                    >
                      <RefreshCw className={`w-3 h-3 ${isPhase3Generating || isRegeneratingKeyframes ? "animate-spin text-violet-300" : ""}`} />
                      <span>Regenerate Keyframes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhase3OpenRegen(!phase3OpenRegen)}
                      disabled={isPhase3Generating || isRegeneratingKeyframes}
                      className="text-slate-400 hover:text-slate-200 text-[11px] cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition"
                    >
                      <Sparkles className="w-3 h-3 text-violet-400" />
                      <span>{phase3OpenRegen ? "Close Customizer" : "Customize"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Phase 3 Custom Modification & Regeneration Panel */}
              {phase3OpenRegen && (
                <div className="p-3.5 rounded-xl bg-obsidian-900/90 border border-violet-500/30 space-y-3 animate-fade-in text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-white">
                      <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                      <span>Custom Keyframe Modification (Optional)</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Phase 3</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Optionally describe what you want to modify before regenerating scene keyframe images.
                  </p>
                  <textarea
                    value={phase3Instructions}
                    onChange={(e) => setPhase3Instructions(e.target.value)}
                    placeholder="e.g., 'Make scene 2 dramatic with moody rim lighting and volumetric dust', 'Change camera angle to low angle heroic', 'Enhance fruit texture detail'..."
                    rows={2}
                    className="w-full text-xs font-mono bg-white/[0.03] border border-white/[0.1] rounded-lg p-2.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPhase3OpenRegen(false)}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-mono transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isPhase3Generating || isRegeneratingKeyframes}
                      onClick={() => {
                        if (onRegenerateKeyframes) {
                          onRegenerateKeyframes(phase3Instructions);
                        }
                        setPhase3OpenRegen(false);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${(isPhase3Generating || isRegeneratingKeyframes) ? "animate-spin" : ""}`} />
                      <span>{(isPhase3Generating || isRegeneratingKeyframes) ? "Regenerating..." : "Confirm & Regenerate"}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  (phase1Plan?.scenes && phase1Plan.scenes.length > 0)
                    ? phase1Plan.scenes.map((sc: any, idx: number) => {
                        const sid = sc.scene_id || idx + 1;
                        const existingKf = (activeStoryDetail?.phases?.phase_3_images?.items || []).find(
                          (item: any) => item.scene_id === sid
                        );
                        const hasErr = existingKf?.status === "error" || Boolean(existingKf?.error) || (!existingKf?.image_url && Boolean(phase3Error));
                        
                        // Extract characters mentioned in scene or recorded in existing keyframe
                        const rawCharNames: string[] = sc.characters || existingKf?.characters || [];
                        const matchedChars = displayCharacters.filter((dc) => {
                          const dcName = (dc.name || "").toLowerCase();
                          const firstName = dcName.split(" ")[0] || dcName;
                          const inList = rawCharNames.some((n: string) => n.toLowerCase() === dcName || n.toLowerCase() === firstName);
                          const textBlob = `${sc.visual_description || ""} ${sc.setting || ""} ${sc.dialogue || ""}`.toLowerCase();
                          const inText = dcName && (textBlob.includes(dcName) || (firstName.length >= 3 && textBlob.includes(firstName)));
                          return inList || inText;
                        });

                        const sceneHook = sid === 1
                          ? (sc.hook_3s || existingKf?.hook_3s || activeStoryDetail?.phases?.phase_1_script?.idea?.hook_3s || activeStoryDetail?.selected_concept?.hook_3s || phase1Plan?.idea?.hook_3s)
                          : undefined;

                        return {
                          scene_id: sid,
                          setting: sc.setting || sc.visual_description || existingKf?.setting || `Scene ${sid}`,
                          image_url: existingKf?.image_url,
                          status: existingKf?.status || (hasErr ? "error" : isPhase3Generating ? "in_progress" : "pending"),
                          error: existingKf?.error || (existingKf as any)?.error_message || (hasErr ? phase3Error : undefined),
                          attached_characters: matchedChars,
                          hook_3s: sceneHook,
                        };
                      })
                    : (activeStoryDetail?.phases?.phase_3_images?.items || [
                        { scene_id: 1, setting: "Scene 1 Keyframe", attached_characters: [] },
                        { scene_id: 2, setting: "Scene 2 Keyframe", attached_characters: [] },
                      ])
                ).map((kf: any, idx: number) => {
                  const isThisSceneGenerating = isPhase3Generating && !kf.image_url && (activeP3SceneId === kf.scene_id || kf.status === "generating");
                  const attachedChars = kf.attached_characters || [];

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl transition-all duration-300 space-y-2.5 ${
                        isThisSceneGenerating
                          ? "bg-violet-950/30 border-2 border-violet-500 shadow-lg shadow-violet-500/10 ring-1 ring-violet-400/40"
                          : kf.image_url
                            ? "bg-white/[0.02] border border-white/[0.08]"
                            : "bg-white/[0.01] border border-white/[0.06] opacity-70"
                      }`}
                    >
                      {/* Keyframe 9:16 Image or Error card or Skeleton if waiting */}
                      {kf.image_url ? (
                        <div className="relative aspect-[9/16] w-full rounded-lg overflow-hidden border border-white/[0.08] group">
                          <img
                            src={resolveMediaUrl(kf.image_url)}
                            alt={kf.setting || `Scene ${kf.scene_id}`}
                            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] font-mono text-emerald-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Scene {kf.scene_id} Ready</span>
                          </div>
                        </div>
                      ) : kf.status === "error" || kf.error ? (
                        <div className="relative aspect-[9/16] w-full rounded-lg overflow-hidden border border-rose-500/30 bg-rose-950/20 flex flex-col items-center justify-center p-3 text-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-semibold text-rose-200">Scene {kf.scene_id} Failed</span>
                          <p className="text-[10px] text-rose-300/80 font-sans line-clamp-3">
                            {kf.error || "Generation error. Backoff or quota limit reached."}
                          </p>
                          {(onResumeGeneration || onRetryGeneration) && (
                            <button
                              type="button"
                              onClick={onResumeGeneration || onRetryGeneration}
                              disabled={isResuming}
                              className="mt-1 px-2.5 py-1 rounded bg-rose-600/80 hover:bg-rose-500 text-white text-[10px] font-medium flex items-center gap-1 transition cursor-pointer"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Retry Scene</span>
                            </button>
                          )}
                        </div>
                      ) : isThisSceneGenerating ? (
                        <div className="relative aspect-[9/16] w-full rounded-lg overflow-hidden border border-violet-500/40 bg-violet-950/40">
                          <Skeleton className="w-full h-full rounded-lg bg-violet-950/40 animate-pulse" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center pointer-events-none">
                            <BouncingDots className="w-4 h-2 text-violet-400" />
                            <span className="text-[11px] font-mono text-violet-200 font-semibold animate-pulse">Rendering Keyframe</span>
                            <span className="text-[10px] text-violet-300 font-sans font-medium">Scene {kf.scene_id} via Imagen 3</span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative aspect-[9/16] w-full rounded-lg overflow-hidden border border-white/[0.06] bg-black/20 flex flex-col items-center justify-center p-3 text-center">
                          <span className="text-[10px] font-mono text-slate-500">Queued</span>
                          <span className="text-[10px] text-slate-600 font-sans mt-0.5">Scene {kf.scene_id}</span>
                        </div>
                      )}

                      {/* Header row: Scene Number & Status Badge */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="text-white font-medium">Scene {kf.scene_id}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                          kf.image_url
                            ? "text-emerald-400 bg-emerald-500/10"
                            : isThisSceneGenerating
                              ? "text-violet-300 bg-violet-500/20 font-semibold"
                              : "text-slate-500 bg-white/[0.04]"
                        }`}>
                          {kf.image_url ? "✓ 9:16 Keyframe" : isThisSceneGenerating ? "Generating..." : "Queued"}
                        </span>
                      </div>

                      {/* Setting Description */}
                      <p className="text-xs text-slate-200 line-clamp-2">{kf.setting || "Cinematic composition"}</p>

                      {/* Scene 1 Hyper-Viral 3-Second Retention Hook Anchor */}
                      {kf.scene_id === 1 && kf.hook_3s && (
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-300">
                              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>3s Viral Retention Hook</span>
                            </span>
                            <span className="text-[9px] font-mono text-amber-400/80 bg-amber-400/10 border border-amber-400/20 rounded px-1.5 py-0.5">
                              TikTok / Reels
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-100 font-sans italic leading-snug font-medium">
                            "{kf.hook_3s}"
                          </p>
                        </div>
                      )}

                      {/* Attached Phase 2 Character References indicator row */}
                      {attachedChars.length > 0 && (
                        <div className="pt-1 border-t border-white/[0.05] space-y-1">
                          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                            <span>Attached Phase 2 Portraits:</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {attachedChars.map((ac: any, cIdx: number) => (
                              <div
                                key={cIdx}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.07] text-[10px] font-mono text-slate-300"
                                title={`Phase 2 portrait attached to Scene ${kf.scene_id} keyframe generation`}
                              >
                                {ac.image_url ? (
                                  <img
                                    src={resolveMediaUrl(ac.image_url)}
                                    alt={ac.name}
                                    className="w-3.5 h-3.5 rounded-full object-cover border border-white/20 shrink-0"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-full bg-purple-500/30 flex items-center justify-center text-[8px] font-bold text-purple-200 shrink-0">
                                    {ac.name?.[0] || "C"}
                                  </span>
                                )}
                                <span className="truncate max-w-[110px]">{ac.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!isPhase3Approved && !isPhase3Generating && (
                <div className="pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedPhases((prev) => ({ ...prev, 3: false, 4: true }));
                      onApproveAndProceed(3);
                    }}
                    disabled={isAdvancingPhase}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 hover:from-violet-500 hover:to-indigo-500 text-white font-display font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-glow-sm active:scale-[0.99] disabled:opacity-50"
                  >
                    {isAdvancingPhase ? (
                      <AnimatedShinyText className="text-xs font-medium text-white">
                        Advancing to Phase 4...
                      </AnimatedShinyText>
                    ) : (
                      <>
                        <span>Approve &amp; Continue</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. PHASE 4: MOTION DYNAMICS & VIDEO CLIPS */}
      {isPhase3Approved && (
        <div ref={phase4Ref} className="rounded-2xl bg-obsidian-850/90 border border-white/[0.08] overflow-hidden transition-all duration-300">
          {/* Phase 4 Accordion Header Toggle */}
          <button
            type="button"
            onClick={() => togglePhaseAccordion(4)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-semibold shrink-0 ${
                isPhase4Approved
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : isPhase4Generating
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30 animate-pulse"
                  : (phase4Error)
                  ? "bg-rose-500/20 text-rose-200 border border-rose-500/40"
                  : "bg-violet-600/30 text-violet-200 border border-violet-500/40"
              }`}>
                {isPhase4Approved ? "✓" : isPhase4Generating ? "…" : "4"}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-display font-semibold text-white truncate">
                    Phase 4: Motion Dynamics &amp; Video Clips
                  </span>
                  <span className={`text-[10px] font-mono uppercase rounded px-1.5 py-0.5 border ${
                    isPhase4Approved
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : isPhase4Generating
                      ? "text-violet-300 bg-violet-500/15 border-violet-500/30 animate-pulse"
                      : (phase4Error)
                      ? "text-rose-300 bg-rose-500/15 border-rose-500/30"
                      : "text-slate-300 bg-white/[0.05] border-white/[0.1]"
                  }`}>
                    {isPhase4Approved ? "Approved" : isPhase4Generating ? "Generating..." : (phase4Error) ? "Error" : "Awaiting Approval"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                  Camera choreography and Veo video clips rendered ({completedP4Count}/{(phase1Plan?.scenes || []).length || 4} clips ready)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-slate-400">
              <span className="text-[11px] font-mono text-slate-500">
                {expandedPhases[4] ? "Collapse" : "View"}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  expandedPhases[4] ? "rotate-180 text-violet-400" : ""
                }`}
              />
            </div>
          </button>

          {/* Full Content */}
          {expandedPhases[4] && (
            <div className={`p-4 sm:p-5 space-y-4 ${isPhase4Approved ? "border-t border-white/[0.06] bg-obsidian-900/40" : ""}`}>
              {!isPhase4Approved && (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {isPhase4Generating && <BouncingDots className="w-5 h-2.5 text-violet-400 shrink-0" />}
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-medium ${
                        phase4Error
                          ? "bg-rose-500/20 text-rose-200 border border-rose-500/40"
                          : "bg-violet-600/30 text-violet-200 border border-violet-500/40"
                      }`}>
                        4
                      </span>
                      <h2 className="text-sm font-display font-semibold text-white">
                        Phase 4: Motion Dynamics &amp; Video Clips
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-sans">
                      Single-pass video clips with character dialogue and camera motion.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isPhase4Generating && onCancelGeneration && (
                      <button
                        type="button"
                        onClick={onCancelGeneration}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-100 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                        title="Cancel video generation"
                      >
                        <Square className="w-3 h-3 fill-rose-300" />
                        <span>Cancel</span>
                      </button>
                    )}
                    <span className={`text-[10px] font-mono uppercase tracking-wider rounded-md px-2 py-0.5 flex items-center gap-1.5 border transition-all ${
                      phase4Error
                        ? "text-rose-300 bg-rose-500/15 border-rose-500/30"
                        : isPhase4Generating
                        ? "text-cyan-300 bg-cyan-500/15 border-cyan-500/30"
                        : "text-slate-300 bg-white/[0.05] border-white/[0.1]"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        phase4Error
                          ? "bg-rose-400"
                          : isPhase4Generating
                          ? "bg-cyan-400 animate-ping"
                          : allClipsCompleted
                          ? "bg-emerald-400"
                          : "bg-violet-400"
                      }`} />
                      <span>
                        {isPhase4Generating
                          ? (activeP4SceneId
                              ? `Rendering Scene ${activeP4SceneId} via Veo (${completedP4Count}/${(phase1Plan?.scenes || []).length || 4})...`
                              : "Rendering clips via Veo...")
                          : (phase4Error)
                          ? "Generation error"
                          : allClipsCompleted
                          ? `${(phase1Plan?.scenes || []).length}/${(phase1Plan?.scenes || []).length} Clips Rendered`
                          : "Awaiting approval"}
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* Phase 4 Error Alert Banner */}
              {(phase4Error) && (
                <div className="rounded-xl bg-rose-950/30 border border-rose-500/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-200">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-semibold text-rose-200">Video Generation Notice</p>
                      <p className="text-[11px] text-rose-300/80 break-words font-sans">{phase4Error}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(onResumeGeneration || onRetryGeneration) && (
                      <button
                        type="button"
                        onClick={onResumeGeneration || onRetryGeneration}
                        disabled={isResuming}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{isResuming ? "Retrying..." : "Retry Phase 4"}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Phase 4 Subheader Toolbar */}
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Video Clips ({(phase1Plan?.scenes || []).length || 4} Scenes)</span>
                {onRegenerateVideoClips && (
                  <button
                    type="button"
                    onClick={() => setPhase4OpenRegen(!phase4OpenRegen)}
                    disabled={isPhase4Generating || isRegeneratingVideoClips}
                    className="text-violet-400 hover:text-violet-300 text-[11px] cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 transition"
                  >
                    <RefreshCw className={`w-3 h-3 ${isPhase4Generating || isRegeneratingVideoClips ? "animate-spin text-violet-300" : ""}`} />
                    <span>{phase4OpenRegen ? "Close Customizer" : "Regenerate Video Clips"}</span>
                  </button>
                )}
              </div>

              {/* Phase 4 Custom Modification & Regeneration Panel */}
              {phase4OpenRegen && (
                <div className="p-3.5 rounded-xl bg-obsidian-900/90 border border-violet-500/30 space-y-3 animate-fade-in text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-white">
                      <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                      <span>Custom Video &amp; Motion Modification (Optional)</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Phase 4</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Optionally describe what you want to modify before regenerating camera choreography and video clips.
                  </p>
                  <textarea
                    value={phase4Instructions}
                    onChange={(e) => setPhase4Instructions(e.target.value)}
                    placeholder="e.g., 'Slow deliberate cinematic camera pan', 'Faster character movement and more energetic facial dialogue delivery', 'Enhance ambient sound'..."
                    rows={2}
                    className="w-full text-xs font-mono bg-white/[0.03] border border-white/[0.1] rounded-lg p-2.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPhase4OpenRegen(false)}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-mono transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isPhase4Generating || isRegeneratingVideoClips}
                      onClick={() => {
                        if (onRegenerateVideoClips) {
                          onRegenerateVideoClips(phase4Instructions);
                        }
                        setPhase4OpenRegen(false);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${(isPhase4Generating || isRegeneratingVideoClips) ? "animate-spin" : ""}`} />
                      <span>{(isPhase4Generating || isRegeneratingVideoClips) ? "Regenerating..." : "Confirm & Regenerate"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Video Clips waiting or rendered */}
              <div className="grid gap-3.5 sm:grid-cols-2">
                {(
                  (phase1Plan?.scenes && phase1Plan.scenes.length > 0)
                    ? phase1Plan.scenes.map((sc: any, idx: number) => {
                        const sid = sc.scene_id || idx + 1;
                        const rawClips = (activeStoryDetail?.phases?.phase_5_video_generation as any)?.items ||
                                         activeStoryDetail?.phases?.phase_5_video_generation?.clips || [];
                        const existingClip = rawClips.find(
                          (item: any) => item.scene_id === sid || item.clip_id === sid
                        );
                        const motionPrompt = (activeStoryDetail?.phases?.phase_4_animation_prompts?.items || []).find(
                          (item: any) => item.scene_id === sid
                        );
                        let vidUrl = existingClip?.video_url || null;
                        if (!vidUrl) {
                          const p = existingClip?.video_path;
                          if (p && typeof p === "string") {
                            const match = p.match(/archive[\\/](.+)$/);
                            if (match && match[1]) {
                              vidUrl = `/media/${match[1].replace(/\\/g, '/')}`;
                            }
                          }
                        }
                        const isCompleted = Boolean(vidUrl && existingClip?.status === "completed" && !videoLoadErrors[sid]);
                        const hasErr = existingClip?.status === "error" || Boolean(existingClip?.error) || (!isCompleted && Boolean(phase4Error));
                        return {
                          clip_id: sid,
                          scene_id: sid,
                          video_url: vidUrl,
                          status: isCompleted ? "completed" : (existingClip?.status || (hasErr ? "error" : isPhase4Generating ? "in_progress" : "pending")),
                          error: existingClip?.error || (hasErr ? (phase4Error) : undefined),
                          motion_type: motionPrompt?.camera_dynamics || existingClip?.motion_type || "Veo Motion",
                          action: motionPrompt?.action_description || sc.visual_description || existingClip?.action || `Scene ${sid} animation`,
                        };
                      })
                    : ((activeStoryDetail?.phases?.phase_5_video_generation as any)?.items ||
                       activeStoryDetail?.phases?.phase_5_video_generation?.clips || [
                        { clip_id: 1, scene_id: 1, motion_type: "Veo Motion", action: "Scene 1 animation" },
                        { clip_id: 2, scene_id: 2, motion_type: "Veo Motion", action: "Scene 2 animation" },
                      ])
                ).map((clip: any, idx: number) => {
                  const sid = clip.scene_id || idx + 1;
                  const isThisClipGenerating =
                    (isPhase4Generating && activeP4SceneId === sid) ||
                    clip.status === "generating";

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl transition-all space-y-2.5 ${
                        isThisClipGenerating
                          ? "bg-cyan-950/20 border-2 border-cyan-500/50 ring-2 ring-cyan-500/20"
                          : clip.video_url && clip.status === "completed"
                          ? "bg-white/[0.02] border border-white/[0.08]"
                          : "bg-white/[0.01] border border-white/[0.04]"
                      }`}
                    >
                      {clip.video_url && clip.status === "completed" && !videoLoadErrors[sid] && !isThisClipGenerating ? (
                        <div className="relative aspect-[9/16] w-full rounded-lg overflow-hidden border border-white/[0.08] bg-black group">
                          <video
                            src={resolveMediaUrl(clip.video_url)}
                            controls
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              const mediaErr = e.currentTarget.error;
                              console.error("Video failed to load for URL:", resolveMediaUrl(clip.video_url), mediaErr?.code, mediaErr?.message, mediaErr);
                              if (mediaErr) {
                                setVideoLoadErrors((prev) => ({
                                  ...prev,
                                  [sid]: {
                                    code: mediaErr.code,
                                    message: mediaErr.message || (
                                      mediaErr.code === 2 ? "MEDIA_ERR_NETWORK: Network/fetching failure." :
                                      mediaErr.code === 3 ? "MEDIA_ERR_DECODE: Corrupt file or unsupported video codec." :
                                      mediaErr.code === 4 ? "MEDIA_ERR_SRC_NOT_SUPPORTED: 404 Not Found, bad MIME type, or bad format." :
                                      "Unknown media error"
                                    )
                                  }
                                }));
                              }
                            }}
                          />
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            <span>Veo Clip</span>
                          </div>
                        </div>
                      ) : videoLoadErrors[sid] || clip.status === "error" || clip.error ? (
                        <div className="relative aspect-[9/16] w-full rounded-lg overflow-hidden border border-rose-500/30 bg-rose-950/20 flex flex-col items-center justify-center p-3 text-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-semibold text-rose-200">Scene {clip.scene_id || idx + 1} Clip Failed</span>
                          {videoLoadErrors[sid] ? (
                            <div className="space-y-1">
                              <span className="inline-block px-1.5 py-0.5 rounded bg-rose-500/20 text-[9px] font-mono text-rose-300">
                                Code {videoLoadErrors[sid].code}
                              </span>
                              <p className="text-[10px] text-rose-300/80 font-sans line-clamp-3">
                                {videoLoadErrors[sid].message}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-rose-300/80 font-sans line-clamp-3">
                              {clip.error || "Video rendering error. Backoff or quota limit reached."}
                            </p>
                          )}
                          {(onRegenerateVideoClips || onResumeGeneration || onRetryGeneration) && (
                            <button
                              type="button"
                              onClick={() => {
                                setVideoLoadErrors((prev) => {
                                  const next = { ...prev };
                                  delete next[sid];
                                  return next;
                                });
                                if (onRegenerateVideoClips) onRegenerateVideoClips();
                                else if (onResumeGeneration) onResumeGeneration();
                                else if (onRetryGeneration) onRetryGeneration();
                              }}
                              disabled={isResuming || isRegeneratingVideoClips}
                              className="mt-1 px-2.5 py-1 rounded bg-rose-600/80 hover:bg-rose-500 text-white text-[10px] font-medium flex items-center gap-1 transition cursor-pointer"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Retry Clip</span>
                            </button>
                          )}
                        </div>
                      ) : isThisClipGenerating ? (
                        <div className="relative aspect-[9/16] w-full rounded-lg overflow-hidden border border-cyan-500/40 bg-cyan-950/30 flex flex-col items-center justify-center p-3 text-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center">
                            <RefreshCw className="w-4 h-4 text-cyan-300 animate-spin" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-cyan-200 block">Rendering Video Clip</span>
                            <span className="text-[10px] font-mono text-cyan-300/80 block">Scene {clip.scene_id || idx + 1} via Veo 3.1 Fast</span>
                          </div>
                          <span className="text-[10px] text-cyan-400 font-medium animate-pulse">Generating motion...</span>
                        </div>
                      ) : (
                        <div className="relative aspect-[9/16] w-full rounded-lg overflow-hidden border border-white/[0.06] bg-obsidian-900/60 flex flex-col items-center justify-center p-3 text-center gap-1.5">
                          <div className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-500">
                            <Video className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-medium text-slate-400">Scene {clip.scene_id || idx + 1}</span>
                          <span className="text-[10px] font-mono text-slate-500">Queued for Veo</span>
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-white font-medium">Scene {clip.scene_id || idx + 1}</span>
                          {videoLoadErrors[sid] || clip.status === "error" || clip.error ? (
                            <span className="text-rose-400 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              Failed
                            </span>
                          ) : clip.video_url ? (
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Ready
                            </span>
                          ) : isThisClipGenerating ? (
                            <span className="text-cyan-400 font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                              Rendering
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-[10px]">Queued</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-2">{clip.action || clip.prompt || "Dynamic camera motion & dialogue"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex flex-col sm:flex-row items-center gap-2.5">
                {!isPhase4Approved && !isPhase4Generating && (
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedPhases((prev) => ({ ...prev, 4: false, 5: true }));
                      onApproveAndProceed(4);
                    }}
                    disabled={isAdvancingPhase || hasAnyPhase4Errors || !allClipsCompleted}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 hover:from-violet-500 hover:to-indigo-500 text-white font-display font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-glow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAdvancingPhase ? (
                      <AnimatedShinyText className="text-xs font-medium text-white">
                        Advancing to Phase 5...
                      </AnimatedShinyText>
                    ) : hasAnyPhase4Errors ? (
                      <span>Clips Failed - Fix or Retry to Proceed</span>
                    ) : (
                      <>
                        <span>{allClipsCompleted ? "Approve & Advance to Phase 5" : "Approve & Continue"}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}


      {/* 6. PHASE 5: MASTER VIDEO ASSEMBLY & CAPTIONS */}
      {Boolean((isPhase4Approved || isPhase5Completed || masterVideoError) && (phase5Done || isAssemblingPhase5 || masterVideoError || isPhase5Completed || activePhase === 5 || expandedPhases[5])) && (
        <div ref={phase5Ref} className="rounded-2xl bg-obsidian-850/90 border border-emerald-500/30 overflow-hidden transition-all duration-300 shadow-glow-sm">
          {/* Phase 5 Accordion Header Toggle */}
          <button
            type="button"
            onClick={() => togglePhaseAccordion(5)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-semibold shrink-0 ${
                (Boolean(finalVideoUrl) && !isAssemblingPhase5 && phase5Done)
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : (isAssemblingPhase5 || (isPhase4Approved && !finalVideoUrl))
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse"
                  : "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
              }`}>
                {(Boolean(finalVideoUrl) && !isAssemblingPhase5 && phase5Done) ? "✓" : (isAssemblingPhase5 || (isPhase4Approved && !finalVideoUrl)) ? "…" : "5"}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-display font-semibold text-white truncate">
                    Phase 5: Master Video Assembly &amp; Dynamic Captions
                  </span>
                  <span className={`text-[10px] font-mono uppercase rounded px-1.5 py-0.5 border ${
                    (Boolean(finalVideoUrl) && !isAssemblingPhase5 && phase5Done)
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : (isAssemblingPhase5 || (isPhase4Approved && !finalVideoUrl))
                      ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30 animate-pulse"
                      : phase4Done
                      ? "text-cyan-300 bg-cyan-500/10 border-cyan-500/20"
                      : "text-slate-400 bg-white/[0.03] border-white/[0.08]"
                  }`}>
                    {(Boolean(finalVideoUrl) && !isAssemblingPhase5 && phase5Done) ? "Production Ready" : (isAssemblingPhase5 || (isPhase4Approved && !finalVideoUrl)) ? "Assembling..." : phase4Done ? "Ready for Assembly" : "Waiting for Phase 4"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                  {phase5Done
                    ? "Full sequence compiled, native Veo audio synchronized, and karaoke captions burned"
                    : "1080p 9:16 master video compilation with word-level subtitles"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-slate-400">
              <span className="text-[11px] font-mono text-slate-500">
                {expandedPhases[5] ? "Collapse" : "View"}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  expandedPhases[5] ? "rotate-180 text-emerald-400" : ""
                }`}
              />
            </div>
          </button>

          {/* Collapsible Phase 5 Content */}
          {expandedPhases[5] && (
            <div className="p-4 sm:p-5 space-y-5 border-t border-white/[0.06] bg-obsidian-900/40">
              {/* Sequential Assembly Milestones Stepper */}
              <div className="rounded-xl bg-obsidian-950/60 border border-white/[0.06] p-3.5 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="font-semibold text-white">Assembly &amp; Captioning Pipeline</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Step 1: FFmpeg Stitch */}
                  <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                    Boolean(finalVideoUrl)
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                      : isAssemblingPhase5
                      ? "bg-violet-950/20 border-violet-500/30 text-violet-200"
                      : "bg-white/[0.02] border-white/[0.06] text-slate-400"
                  }`}>
                    <div className="mt-0.5 shrink-0">
                      {Boolean(finalVideoUrl) ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isAssemblingPhase5 ? (
                        <BouncingDots className="w-4 h-2 text-violet-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[9px] font-mono text-slate-400">
                          1
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate text-white">1. Video Stitch</p>
                      <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                        {Boolean(finalVideoUrl) ? "All scene clips stitched seamlessly" : isAssemblingPhase5 ? "Concatenating full sequence..." : "Combines all Phase 4 scene clips"}
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Dynamic Karaoke Subtitles */}
                  <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                    Boolean(finalVideoUrl)
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                      : isAssemblingPhase5
                      ? "bg-violet-950/20 border-violet-500/30 text-violet-200"
                      : "bg-white/[0.02] border-white/[0.06] text-slate-400"
                  }`}>
                    <div className="mt-0.5 shrink-0">
                      {Boolean(finalVideoUrl) ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isAssemblingPhase5 ? (
                        <BouncingDots className="w-4 h-2 text-violet-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[9px] font-mono text-slate-400">
                          2
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate text-white">2. Dynamic Karaoke Subtitles</p>
                      <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                        {Boolean(finalVideoUrl) ? "Word-level karaoke subtitles burned" : isAssemblingPhase5 ? "Transcribing & burning captions..." : "Transcribes dialogue & burns .ass captions"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Master Video Display OR Loading UI */}
              {isAssemblingPhase5 || (!finalVideoUrl && isPhase4Approved) ? (
                <div className="relative aspect-[9/16] max-w-xs mx-auto rounded-2xl overflow-hidden border border-emerald-500/30 bg-obsidian-950/90 shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-violet-500/5 to-transparent animate-pulse pointer-events-none" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-5 text-center">
                    <div className="relative w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-glow-sm">
                      <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-mono font-semibold text-emerald-200 tracking-wide">
                        Compiling Master 9:16 Story...
                      </p>
                      <p className="text-[11px] text-slate-300 font-sans max-w-[220px] leading-relaxed">
                        Stitching scene clips and generating word-aligned dynamic karaoke subtitles with Whisper.
                      </p>
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>Rendering final captioned MP4</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (masterPlaybackUrl || finalVideoUrl) && !isAssemblingPhase5 && !isPhase5Generating && !masterVideoError ? (
                <div className="space-y-3">
                  <div className="relative aspect-[9/16] max-w-xs mx-auto rounded-2xl overflow-hidden border border-emerald-500/40 shadow-2xl bg-black group">
                    <video
                      src={resolveMediaUrl(masterPlaybackUrl || finalVideoUrl)}
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const mediaErr = e.currentTarget.error;
                        const currentSrc = masterPlaybackUrl || finalVideoUrl || "";
                        const mediaFolder = activeStoryDetail?.story_id || activeStoryDetail?.story_slug || "";
                        const fallbackSrc = mediaFolder ? `/media/${mediaFolder}/final/final_story.mp4` : "";
                        // Try captioned → uncaptioned fallback first
                        if (currentSrc.includes("final_story_captioned") && fallbackSrc && currentSrc !== fallbackSrc) {
                          setMasterPlaybackUrl(fallbackSrc);
                          return;
                        }
                        // Code 4 = 404 / format error. If still assembling, reset to loading state instead of showing error.
                        if (mediaErr?.code === 4 || !mediaErr?.code) {
                          setMasterPlaybackUrl(null);
                          return;
                        }
                        console.error("Master video failed to load:", mediaErr?.code, mediaErr?.message, mediaErr);
                        setMasterVideoError({
                          code: mediaErr?.code ?? 4,
                          message: mediaErr?.message || (
                            mediaErr?.code === 2 ? "MEDIA_ERR_NETWORK: Network/fetching failure." :
                            mediaErr?.code === 3 ? "MEDIA_ERR_DECODE: Corrupt file or unsupported video codec." :
                            mediaErr?.code === 4 ? "MEDIA_ERR_SRC_NOT_SUPPORTED: 404 Not Found, bad MIME type, or bad format." :
                            "Unknown media error"
                          )
                        });
                      }}
                    />
                  </div>
                </div>
              ) : masterVideoError ? (
                <div className="relative aspect-[9/16] max-w-xs mx-auto rounded-2xl overflow-hidden border border-rose-500/30 bg-rose-950/20 flex flex-col items-center justify-center p-4 text-center gap-2.5 shadow-2xl">
                  <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-rose-200">Master Video Render Failed</span>
                  <span className="inline-block px-2 py-0.5 rounded bg-rose-500/20 text-[10px] font-mono text-rose-300">
                    Code {masterVideoError.code}
                  </span>
                  <p className="text-[11px] text-rose-300/80 font-sans leading-relaxed">
                    {masterVideoError.message}
                  </p>
                  {onRunPhase5Assembly && (
                    <button
                      type="button"
                      onClick={() => {
                        setMasterVideoError(null);
                        setMasterPlaybackUrl(finalVideoUrl);
                        onRunPhase5Assembly();
                      }}
                      disabled={isAssemblingPhase5}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-assemble Master Video</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative aspect-[9/16] max-w-xs mx-auto rounded-2xl overflow-hidden border border-emerald-500/25 bg-obsidian-950/80 shadow-2xl">
                  <Skeleton className="w-full h-full bg-emerald-950/20 animate-pulse" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                      <BouncingDots className="w-5 h-2.5 text-emerald-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-mono font-semibold text-emerald-200 animate-pulse">
                        Awaiting Phase 5 Assembly
                      </p>
                      <p className="text-[10px] text-slate-400 font-sans max-w-[200px] leading-relaxed">
                        Waiting for all Veo generations to be stitched together before dynamic karaoke captions are burned.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Phase 5 Action Toolbar (Deploy, Preview, Download) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
                <div className="flex flex-wrap items-center gap-2">
                  {onOpenVideoPreview && finalVideoUrl && (
                    <button
                      type="button"
                      onClick={onOpenVideoPreview}
                      className="py-2 px-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.14] text-white font-medium text-xs tracking-wide flex items-center gap-2 transition cursor-pointer shadow-sm hover:border-violet-400/50"
                    >
                      <svg className="w-3.5 h-3.5 text-violet-400" fill="currentColor" viewBox="0 0 24 24">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <span>Preview Master Video</span>
                    </button>
                  )}

                  {finalVideoUrl && (
                    <a
                      href={finalVideoUrl}
                      download="final_story.mp4"
                      className="py-2 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white font-medium text-xs tracking-wide flex items-center gap-2 transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Download MP4</span>
                    </a>
                  )}
                </div>

                {/* Prominent Deploy to Channels Button */}
                {onDeploy && (
                  <button
                    type="button"
                    onClick={onDeploy}
                    disabled={isDeploying || (!finalVideoUrl && isAssemblingPhase5)}
                    className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 hover:from-violet-500 hover:to-indigo-500 text-white font-display font-semibold text-xs tracking-wide flex items-center gap-2 transition cursor-pointer shadow-glow-sm disabled:opacity-50"
                    title={!finalVideoUrl ? "Assemble master video before deploying" : "Deploy final master video to production social channels"}
                  >
                    {isDeploying ? (
                      <AnimatedShinyText className="text-xs font-medium text-white">
                        Deploying to Channels...
                      </AnimatedShinyText>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-violet-200" />
                        <span>Deploy to Channels</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WorkspacePipelineFlow;

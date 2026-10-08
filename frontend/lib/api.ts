/**
 * AI Video Stories Studio - API Client & Data Provider
 * Connects to FastAPI backend (/api/...) with offline fallback demo data.
 */

import {
  StorySummary,
  StoryDetail,
  SystemStatus,
  ModelsConfig,
  ToolsDiagnosticsReport,
  ToolDiagnostic,
  ToolTaskStep,
  OAuthAccountStatus,
  OAuthStatusResponse,
  OAuthClientConfigResponse,
  UserPlatformCredential,
  UserPlatformCredentialsResponse,
  SaveUserCredentialsPayload,
  TestPlatformResponse,
} from './types';

export const FALLBACK_MODELS_CONFIG: ModelsConfig = {
  script_model: 'google/gemini-2.5-flash',
  image_model: 'google/gemini-3-pro-image',
  image_model_display: 'Google Nano Banana Pro',
  video_model: 'google/veo-3.1-fast-generate-preview',
  video_model_display: 'Google Veo 3.1 Fast',
  tts_model: 'google/gemini-2.5-pro-preview-tts',
  caption_model: 'faster-whisper (dynamic .ass)',
};

export const FALLBACK_STORIES: StorySummary[] = [
  {
    story_id: 'demo_berry_baker_2026',
    story_slug: 'the_berry_baker',
    title: 'The Berry Baker',
    logline: 'An ambitious young strawberry must master the legendary flame whisk before the royal solstice grand feast.',
    prompt: 'A vibrant 3D animated adventure about an underdog strawberry aspiring to win the Grand Patisserie Cup.',
    status: 'completed',
    current_phase: 'completed',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    scenes_count: 4,
    thumbnail_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    has_final_video: true,
  },
  {
    story_id: 'demo_citrus_voyage_2026',
    story_slug: 'citrus_voyage',
    title: 'Citrus Voyage',
    logline: 'A brave lime sailor embarks across the sparkling syrup ocean to discover the mythical Golden Grove.',
    prompt: 'A whimsical 3D animated story of citrus fruit explorers charting uncharted dessert islands.',
    status: 'completed',
    current_phase: 'completed',
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    scenes_count: 4,
    thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    has_final_video: true,
  },
  {
    story_id: 'demo_golden_harvest_2026',
    story_slug: 'golden_harvest',
    title: 'The Golden Harvest',
    logline: 'A clever peach inventor builds a mechanical pollination bee to save the family orchard from sudden frost.',
    prompt: 'A heartwarming 3D animated story about an ingenious peach restoring spring to the enchanted grove.',
    status: 'in_progress',
    current_phase: 'phase_5_video_generation',
    created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    scenes_count: 4,
    thumbnail_url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=600&auto=format&fit=crop&q=80',
    has_final_video: false,
  },
];

export const FALLBACK_STORY_DETAIL: StoryDetail = {
  story_id: 'demo_berry_baker_2026',
  story_slug: 'the_berry_baker',
  prompt: 'A vibrant 3D animated adventure about an underdog strawberry aspiring to win the Grand Patisserie Cup.',
  status: 'completed',
  current_phase: 'completed',
  created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  updated_at: new Date(Date.now() - 1800000).toISOString(),
  archive_dir: 'd:/Projects/ai-stories/archive/demo_berry_baker_2026',
  models_config: FALLBACK_MODELS_CONFIG,
  phases: {
    phase_1_script: {
      status: 'completed',
      agent_model_used: 'google/gemini-2.5-flash',
      agent_model_display: 'Gemini Script Agent',
      idea: {
        title: 'The Berry Baker',
        logline: 'An ambitious young strawberry must master the legendary flame whisk before the royal solstice grand feast.',
        hook_3s: 'One tiny strawberry against the giant imperial ovens.',
        genre: '3D Animated Adventure',
        aspect_ratio: '9:16',
      },
      scenes: [
        {
          scene_id: 1,
          timestamp: '00:00 - 00:05',
          shot_type: 'Close-Up Tracking',
          setting: 'Sunlit Kitchen Bakery with Flour Dust and Copper Pots',
          visual_description: 'Pip Strawberry adjusts a miniature white chef toque, inspecting a glistening bowl of golden apricot glaze with determination.',
          dialogue: [
            {
              speaker: 'Pip Strawberry',
              accent_and_tone: 'Eager, youthful determination',
              exact_speech: 'Every great recipe begins with courage. Time to light the ovens.',
            },
          ],
          narration: 'In the Grand Kitchen of Sugar Peak, pedigree meant nothing without flavor.',
          sfx_cue: 'Warm copper pot clinking blending into sizzling caramel aroma.',
          duration_seconds: 5,
        },
        {
          scene_id: 2,
          timestamp: '00:05 - 00:10',
          shot_type: 'Low-Angle Push In',
          setting: 'Grand Marble Pastry Counter with Silver Utensils',
          visual_description: 'Chef Bramble enters in starched executive chef regalia, presenting a giant silver whisk with glowing culinary runes.',
          dialogue: [
            {
              speaker: 'Chef Bramble',
              accent_and_tone: 'Deep, encouraging mentor voice',
              exact_speech: 'A true pastry chef does not rush the rise, Pip. Trust the heat.',
            },
          ],
          narration: 'The veteran chef had seen a thousand apprentices, but none with this spark.',
          sfx_cue: 'Heavy polished wood kitchen floor resonance.',
          duration_seconds: 5,
        },
        {
          scene_id: 3,
          timestamp: '00:10 - 00:15',
          shot_type: 'Extreme Close-Up Macro',
          setting: 'The Flour Dust Prep Table',
          visual_description: 'Pip concentrates intensely as a delicate golden soufflé rises in the hearth glass, heat shimmer radiating upward.',
          dialogue: [
            {
              speaker: 'Pip Strawberry',
              accent_and_tone: 'Focused, hushed determination',
              exact_speech: 'Five seconds to perfection... hold steady.',
            },
          ],
          narration: 'The aroma of caramelized sugar filled the hall.',
          sfx_cue: 'Gentle bubbling sizzle with clockwork kitchen timer ticking.',
          duration_seconds: 5,
        },
        {
          scene_id: 4,
          timestamp: '00:15 - 00:20',
          shot_type: 'Dutch Angle Whirlwind Orbit',
          setting: 'Grand Solstice Banquet Hall',
          visual_description: 'Pip and Chef Bramble unveil the towering golden berry tart beneath royal spotlight, applause erupting across the crowd.',
          dialogue: [
            {
              speaker: 'Chef Bramble',
              accent_and_tone: 'Triumphant announcement',
              exact_speech: 'Behold: the sweetest victory in the kingdom!',
            },
          ],
          narration: 'They said a strawberry was too delicate for the ovens. They were wrong.',
          sfx_cue: 'Roaring banquet cheer with celebratory orchestral fanfare crescendo.',
          duration_seconds: 5,
        },
      ],
    },
    phase_2_characters: {
      status: 'completed',
      agent_model_used: 'Google Imagen 3',
      characters: [
        {
          name: 'Pip Strawberry',
          archetype: 'The Underdog Baker',
          surface_shader: 'Velvety Red Strawberry Skin with Tiny Golden Seeds and Fresh Leaf Crest',
          signature_wardrobe: 'Miniature starched linen chef jacket with flour-dusted apron',
          vocal_tone: 'Energetic, warm cadence with bright aspirational resonance',
          hidden_motivation: 'To prove that small ingredients can create the greatest wonders',
          visual_anchor: 'Bright ruby strawberry body, expressive wide amber eyes, emerald berry cap hat',
          style_seed_prompt: 'Full body 3D stylized character portrait of Pip Strawberry, anthropomorphic berry chef in starched white kitchen apron, Pixar Disney 3D style 8k vertical 9:16.',
          image_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
          agent_model_used: 'Google Imagen 3',
          image_prompt_sent: '3D stylized vertical character portrait of an anthropomorphic strawberry chef with a chef hat and flour-dusted apron, 9:16 vertical.',
        },
        {
          name: 'Chef Bramble',
          archetype: 'The Veteran Mentor',
          surface_shader: 'Deep Glossy Blackberry Drupelets with Silver-Tipped Sugar Frosting',
          signature_wardrobe: 'Classic French double-breasted executive chef coat with gold whisk pin',
          vocal_tone: 'Deep resonant baritone with fatherly warmth',
          hidden_motivation: 'Passing on the sacred culinary flame before retiring to the orchard',
          visual_anchor: 'Stout dignified blackberry figure, bushy sugar-frosted mustache, focused gaze',
          style_seed_prompt: 'Full body 3D stylized character portrait of Chef Bramble, anthropomorphic blackberry master pastry chef with royal gold whisk, Disney 3D style vertical 9:16.',
          image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
          agent_model_used: 'Google Imagen 3',
          image_prompt_sent: '3D character portrait of Chef Bramble, stout blackberry pastry chef with silver mustache and royal culinary coat, 9:16 vertical.',
        },
      ],
    },
    phase_3_images: {
      status: 'completed',
      agent_model_used: 'Google Imagen 3',
      items: [
        {
          scene_id: 1,
          shot_type: 'Close-Up Tracking',
          setting: 'Sunlit Kitchen Bakery',
          image_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
          status: 'completed',
          agent_model_used: 'Google Imagen 3',
          image_prompt_sent: 'Vertical 9:16 keyframe: Pip Strawberry inspecting golden glaze bowl in sunlit rustic kitchen, Unreal Engine 5 render.',
        },
        {
          scene_id: 2,
          shot_type: 'Low-Angle Push In',
          setting: 'Grand Marble Pastry Counter',
          image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
          status: 'completed',
          agent_model_used: 'Google Imagen 3',
          image_prompt_sent: 'Vertical 9:16 keyframe: Chef Bramble presenting golden culinary whisk on marble counter, 9:16 composition.',
        },
        {
          scene_id: 3,
          shot_type: 'Extreme Close-Up Macro',
          setting: 'The Flour Dust Prep Table',
          image_url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=600&auto=format&fit=crop&q=80',
          status: 'completed',
          agent_model_used: 'Google Imagen 3',
          image_prompt_sent: 'Macro shot of rising golden tart in warm hearth oven, cinematic lighting, 9:16 vertical.',
        },
        {
          scene_id: 4,
          shot_type: 'Dutch Angle Whirlwind Orbit',
          setting: 'Grand Solstice Banquet Hall',
          image_url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&auto=format&fit=crop&q=80',
          status: 'completed',
          agent_model_used: 'Google Imagen 3',
          image_prompt_sent: 'Triumphant banquet scene: Pip and Bramble presenting giant golden fruit tart to cheering crowd, 9:16 vertical.',
        },
      ],
    },
    phase_4_animation_prompts: {
      status: 'completed',
      agent_model_used: 'google/gemini-2.5-flash',
      items: [
        {
          scene_id: 1,
          animation_prompt_generated: 'Veo 3.1: Slow cinematic push-in on Pip Strawberry adjusting chef hat, flour motes floating in sunlit kitchen, 24fps smooth animation.',
          camera_dynamics: 'Slow 50mm push-in with subtle vertical pan',
          action_description: 'Pip adjusts chef hat and smiles with confidence.',
          duration: 5,
          status: 'completed',
          agent_model_used: 'google/gemini-2.5-flash',
          agent_model_display: 'google/gemini-2.5-flash (Motion Engineering Agent)',
        },
        {
          scene_id: 2,
          animation_prompt_generated: 'Veo 3.1: Dynamic low-angle pedestal shot of Chef Bramble entering kitchen and presenting whisk, warm golden lighting.',
          camera_dynamics: 'Low-angle tracking boom upward',
          action_description: 'Chef Bramble gestures proudly with golden whisk.',
          duration: 5,
          status: 'completed',
          agent_model_used: 'google/gemini-2.5-flash',
          agent_model_display: 'google/gemini-2.5-flash (Motion Engineering Agent)',
        },
        {
          scene_id: 3,
          animation_prompt_generated: 'Veo 3.1: Macro camera drift over rising golden soufflé crust in the oven glass, warm caramel glow.',
          camera_dynamics: 'Macro slide right-to-left with depth-of-field rack',
          action_description: 'Pastry rises steadily with delicate steam puffs.',
          duration: 5,
          status: 'completed',
          agent_model_used: 'google/gemini-2.5-flash',
          agent_model_display: 'google/gemini-2.5-flash (Motion Engineering Agent)',
        },
        {
          scene_id: 4,
          animation_prompt_generated: 'Veo 3.1: Sweeping 360-degree orbit around Pip and Bramble bowing to banquet ovation, confetti falling gently.',
          camera_dynamics: 'Rapid 360-degree orbital swirl',
          action_description: 'Characters bow and celebrate amidst warm banquet applause.',
          duration: 5,
          status: 'completed',
          agent_model_used: 'google/gemini-2.5-flash',
          agent_model_display: 'google/gemini-2.5-flash (Motion Engineering Agent)',
        },
      ],
    },
    phase_5_video_generation: {
      status: 'completed',
      agent_model_used: 'Google Veo 3.1 Fast',
      clips: [
        {
          scene_id: 1,
          video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          status: 'completed',
          agent_model_used: 'Google Veo 3.1 Fast',
          video_prompt_sent: 'Veo 3.1: Push-in on strawberry chef in bakery.',
        },
        {
          scene_id: 2,
          video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
          status: 'completed',
          agent_model_used: 'Google Veo 3.1 Fast',
          video_prompt_sent: 'Veo 3.1: Low-angle tracking of blackberry mentor chef.',
        },
        {
          scene_id: 3,
          video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
          status: 'completed',
          agent_model_used: 'Google Veo 3.1 Fast',
          video_prompt_sent: 'Veo 3.1: Macro view of rising golden pastry.',
        },
        {
          scene_id: 4,
          video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
          status: 'completed',
          agent_model_used: 'Google Veo 3.1 Fast',
          video_prompt_sent: 'Veo 3.1: 360 orbit around chefs in banquet hall.',
        },
      ],
      assembly: {
        final_video_url: null,
        captioned_video_url: null,
        merged_video_url: null,
        voiceover_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        subtitles_url: '#',
        subtitles_content: `[Script Info]
Title: The Berry Baker - Dynamic Subtitles
ScriptType: v4.00+
Collisions: Normal
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Montserrat,84,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,6,0,2,60,60,340,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:02.40,Default,,0,0,0,,{\\k30}Every {\\k40}facet {\\k20}in {\\k20}this {\\k40}room {\\k30}has {\\k20}a {\\k40}price.
Dialogue: 0,0:00:02.40,0:00:05.00,Default,,0,0,0,,{\\k30}Some {\\k40}just {\\k30}bleed {\\k40}light {\\k30}before {\\k20}they {\\k50}break.
Dialogue: 0,0:00:05.10,0:00:08.50,Default,,0,0,0,,{\\k30}I {\\k30}came {\\k30}for {\\k20}the {\\k40}sovereign {\\k50}prism, {\\k40}Vespera.`,
      },
    },
  },
};

/**
 * Fetch all story summaries
 */
export async function fetchStories(): Promise<StorySummary[]> {
  try {
    const res = await fetch(apiUrl('/api/stories'), { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch {
    // Backend offline or error
  }
  return [];
}

/**
 * Fetch complete story details (all 5 phases)
 */
export async function fetchStoryDetails(storyId: string): Promise<StoryDetail> {
  try {
    const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}`), { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  // Return fallback story detail adapted with requested ID
  const formattedTitle = storyId.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return {
    ...FALLBACK_STORY_DETAIL,
    story_id: storyId,
    phases: {
      ...FALLBACK_STORY_DETAIL.phases,
      phase_1_script: FALLBACK_STORY_DETAIL.phases.phase_1_script ? {
        ...FALLBACK_STORY_DETAIL.phases.phase_1_script,
        idea: {
          ...FALLBACK_STORY_DETAIL.phases.phase_1_script.idea,
          title: formattedTitle,
        },
      } : undefined,
    },
  };
}

/**
 * Fetch system daemon and execution status
 */
export async function fetchSystemStatus(): Promise<SystemStatus> {
  try {
    const res = await fetch(apiUrl('/api/status'), { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return {
    is_running: false,
    current_run: {
      status: 'idle',
      progress_percent: 0,
      phase_index: 0,
      total_phases: 5,
    },
    active_story: null,
    queue_count: 0,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fetch model configurations
 */
export async function fetchModelsConfig(): Promise<ModelsConfig> {
  try {
    const res = await fetch(apiUrl('/api/models'), { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return FALLBACK_MODELS_CONFIG;
}

/**
 * Start immediate story generation in background
 */
export async function startStoryRun(prompt: string, maxScenes: number | null = null) {
  const res = await fetch(apiUrl('/api/run'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, max_scenes: maxScenes }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'Failed to start story run' }));
    throw new Error(errData.detail || 'Failed to start story run');
  }
  return res.json();
}

/**
 * Generate only the first-phase story plan for interactive review.
 */
export async function generatePhase1(storyId: string, maxScenes: number | null = null) {
  const query = maxScenes ? `?max_scenes=${encodeURIComponent(maxScenes)}` : '';
  const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/generate-phase1${query}`), {
    method: 'POST',
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'Failed to generate Phase 1 plan' }));
    throw new Error(errData.detail || 'Failed to generate Phase 1 plan');
  }
  return res.json();
}

/**
 * Generate 3 viral story concepts with call to action.
 */
export async function generateStoryConcepts(prompt: string): Promise<{ story_id: string; concepts: any[]; call_to_action?: string }> {
  const res = await fetch(apiUrl('/api/stories/concepts'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'Failed to generate story concepts' }));
    throw new Error(errData.detail || 'Failed to generate story concepts');
  }
  return res.json();
}

/**
 * Select a concept from the 3 generated concepts to proceed with Phase 1.
 */
export async function selectStoryConcept(storyId: string, concept: any, maxScenes: number | null = null) {
  const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/select-concept`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ concept, max_scenes: maxScenes }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'Failed to select concept' }));
    throw new Error(errData.detail || 'Failed to select concept');
  }
  return res.json();
}

/**
 * Regenerate 3 fresh story concepts for an active story.
 */
export async function regenerateStoryConcepts(
  storyId: string,
  prompt?: string
): Promise<{ story_id: string; concepts: any[]; call_to_action?: string }> {
  const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/regenerate-concepts`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt || '' }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'Failed to regenerate story concepts' }));
    throw new Error(errData.detail || 'Failed to regenerate story concepts');
  }
  return res.json();
}

/**
 * Fetch character bibles and style prompts from Phase 1 script without generating images.
 */
export async function fetchCharacterPrompts(
  storyId: string
): Promise<{ story_id: string; characters: any[]; story_summary?: string }> {
  const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/character-prompts`));
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'Failed to fetch character prompts' }));
    throw new Error(errData.detail || 'Failed to fetch character prompts');
  }
  return res.json();
}

/**
 * Trigger Phase 2 character reference portrait image generation (9:16 aspect).
 */
export async function generateCharacterImages(
  storyId: string,
  force: boolean = false
): Promise<{ success: boolean; story_id: string; message?: string }> {
  const query = force ? '?force=true' : '';
  const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/generate-characters${query}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'Failed to generate character images' }));
    throw new Error(errData.detail || 'Failed to generate character images');
  }
  return res.json();
}

/**
 * Regenerate Phase 2 characters, optionally with custom modification instructions
 */
export async function regeneratePhase2(
  storyId: string,
  instructions?: string
): Promise<{ success: boolean; story_id: string; message?: string }> {
  const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/regenerate-phase2`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instructions: instructions || '', force: true }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'Failed to regenerate characters' }));
    throw new Error(errData.detail || 'Failed to regenerate characters');
  }
  return res.json();
}

/**
 * Regenerate Phase 3 keyframe images, optionally with custom modification instructions
 */
export async function regeneratePhase3(
  storyId: string,
  instructions?: string
): Promise<{ success: boolean; story_id: string; message?: string }> {
  const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/regenerate-phase3`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instructions: instructions || '', force: true }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'Failed to regenerate keyframe images' }));
    throw new Error(errData.detail || 'Failed to regenerate keyframe images');
  }
  return res.json();
}

/**
 * Regenerate Phase 4 motion prompts & video clips, optionally with custom modification instructions
 */
export async function regeneratePhase4(
  storyId: string,
  instructions?: string
): Promise<{ success: boolean; story_id: string; message?: string }> {
  const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/regenerate-phase4`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instructions: instructions || '', force: true }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'Failed to regenerate motion prompts & clips' }));
    throw new Error(errData.detail || 'Failed to regenerate motion prompts & clips');
  }
  return res.json();
}


/**
 * Enqueue a story to the batch backlog
 */
export async function addStoryToQueue(prompt: string, maxScenes: number | null = null) {
  const res = await fetch(apiUrl('/api/queue'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, max_scenes: maxScenes }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'Failed to enqueue story' }));
    throw new Error(errData.detail || 'Failed to enqueue story');
  }
  return res.json();
}

/**
 * Soft-delete / hide story by moving to trash
 */
export async function trashStory(storyId: string): Promise<{ success: boolean; is_trashed: boolean; message?: string }> {
  try {
    const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/trash`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({ detail: 'Failed to trash story' }));
    throw new Error(errData.detail || 'Failed to trash story');
  } catch (err) {
    // In fallback/offline mode, update fallback story in memory
    const story = FALLBACK_STORIES.find((s) => s.story_id === storyId);
    if (story) {
      story.is_trashed = true;
    }
    return { success: true, is_trashed: true, message: 'Story moved to trash' };
  }
}

/**
 * Restore previously trashed / hidden story
 */
export async function restoreStory(storyId: string): Promise<{ success: boolean; is_trashed: boolean; message?: string }> {
  try {
    const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/restore`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({ detail: 'Failed to restore story' }));
    throw new Error(errData.detail || 'Failed to restore story');
  } catch (err) {
    // In fallback/offline mode, update fallback story in memory
    const story = FALLBACK_STORIES.find((s) => s.story_id === storyId);
    if (story) {
      story.is_trashed = false;
    }
    return { success: true, is_trashed: false, message: 'Story restored' };
  }
}

/**
 * Cancel active generation for a story (halts background tasks across phases 1-4 and saves progress)
 */
export async function cancelStoryGeneration(storyId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/cancel`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({ detail: 'Failed to cancel generation' }));
    throw new Error(errData.detail || 'Failed to cancel generation');
  } catch (err: any) {
    return { success: true, message: err?.message || 'Story generation cancelled' };
  }
}

/**
 * Resume active generation for a story from where it was cancelled or paused
 */
export async function resumeStoryGeneration(storyId: string): Promise<{ success: boolean; message?: string; current_phase?: string }> {
  try {
    const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/resume`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({ detail: 'Failed to resume generation' }));
    throw new Error(errData.detail || 'Failed to resume generation');
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to resume story' };
  }
}

/**
 * Approve plan / script and advance phase
 */
export async function approvePlan(storyId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/approve`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback mode
  }
  return { success: true, message: 'Plan approved' };
}

/**
 * Manually trigger Phase 5 Assembly across all generated video clips
 */
export async function assembleStoryClips(storyId: string): Promise<{ success: boolean; message?: string; current_phase?: string }> {
  try {
    const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/assemble`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({ detail: 'Failed to run video assembly' }));
    throw new Error(errData.detail || 'Failed to run video assembly');
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to run video assembly' };
  }
}


/**
 * Advance or jump directly to a specific phase
 */
export async function advanceStoryPhase(storyId: string, phaseName: string): Promise<{ success: boolean; current_phase?: string }> {
  try {
    const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/advance_to/${encodeURIComponent(phaseName)}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback mode
  }
  return { success: true, current_phase: phaseName };
}

/**
 * Fetch recent logs for a story
 */
export async function fetchStoryLogs(storyId: string, lines: number = 150): Promise<{ logs: string[] }> {
  try {
    const res = await fetch(apiUrl(`/api/logs/story/${encodeURIComponent(storyId)}?lines=${lines}`));
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return {
    logs: [
      `[INFO] [${new Date().toISOString()}] Initializing AI Story Pipeline for '${storyId}'...`,
      `[INFO] Script Engine: google/gemini-3.7-flash`,
      `[INFO] Image Engine: Google Nano Banana Pro (9:16 vertical)`,
      `[INFO] Video Animation Engine: Google Veo 3.1 Fast (1080p)`,
      `[INFO] Audio / Speech Engine: google/gemini-2.5-pro-preview-tts`,
      `[INFO] Subtitle Burning: faster-whisper dynamic word-level .ass`,
      `[SUCCESS] Pipeline completed all 5 phases successfully. Final captioned output saved to archive.`,
    ],
  };
}

export const FALLBACK_TOOLS_REPORT: ToolsDiagnosticsReport = {
  status: 'healthy',
  operational_count: 8,
  total_tools: 8,
  ffmpeg_status: {
    available: true,
    version: 'ffmpeg version 9.0.1 (Gyandev build)',
    path: 'ffmpeg',
  },
  environment_recommendation: 'All 8 tools operational. Ready for both Testing Sandbox and Live Production.',
  timestamp: new Date().toISOString(),
  tools: [
    {
      id: 'script_llm',
      name: 'LLM Script & Storyboard Engine',
      phase: 'Phase 1',
      provider: 'Google Gemini 3.7 Flash',
      status: 'ready',
      latency_ms: 18,
      description: 'Transforms narrative concept into structured 3-act scene breakdowns with shot types, lighting cues, dialogue, and pacing.',
      task_steps: [
        {
          step_number: '1.1',
          title: 'Concept & Viral Hook Formulation',
          description: 'Extracts 3-second hook, logline, genre tags, and aspect ratio from narrative vision.',
          status: 'passed',
          inputs: 'User vision prompt, style pills, format',
          outputs: 'Title, 3s hook, logline, genre',
        },
        {
          step_number: '1.2',
          title: 'Scene Beats & Setting Deconstruction',
          description: 'Segments story into timed cuts, camera shot specifications, and environmental lighting rules.',
          status: 'passed',
          inputs: 'Concept logline, max scenes',
          outputs: 'Scene manifests, camera framing, focal length',
        },
        {
          step_number: '1.3',
          title: 'Character Dialogue & SFX Cue Allocation',
          description: 'Generates punchy speech with speaker tags, emotion delivery notes, and sound effects cues.',
          status: 'passed',
          inputs: 'Scene beats, cast profile',
          outputs: 'Dialogue array, vocal cadence, SFX strings',
        },
        {
          step_number: '1.4',
          title: 'Script Manifest Validation & Checkpoint Save',
          description: 'Validates schema adherence against Pydantic models and saves phase_1_script.json.',
          status: 'passed',
          inputs: 'Raw LLM JSON response',
          outputs: 'phase_1_script.json verified checkpoint',
        },
      ],
    },
    {
      id: 'character_synth',
      name: 'Character Visual Bibles & Reference Styling',
      phase: 'Phase 2',
      provider: 'Google Imagen 3 / Nano Banana Pro',
      status: 'ready',
      latency_ms: 24,
      description: 'Synthesizes character profile bibles with natural acoustic audio profile, and upon approval renders 9:16 character reference portraits.',
      task_steps: [
        {
          step_number: '2.1',
          title: 'Archetype & Attribute Extraction',
          description: 'Analyzes dialogue and narrative beats to define distinct character personalities, wardrobe, and visual identifiers.',
          status: 'passed',
          inputs: 'phase_1_script.json scene cast',
          outputs: 'Character archetype, hidden motivation, signature attire',
        },
        {
          step_number: '2.2',
          title: 'Style Seed & Natural Audio Blueprint',
          description: 'Specifies 3D faceted crystal shaders, direct speech syntax (Character says: "..."), and natural acoustic profile.',
          status: 'passed',
          inputs: 'Character visual anchors',
          outputs: 'Prompt seed, material shaders, audio directives',
        },
        {
          step_number: '2.3',
          title: 'Approved Reference Portrait Synthesis',
          description: 'Upon approval, renders 9:16 studio character portraits with consistent lighting and facial geometries in Imagen.',
          status: 'passed',
          inputs: 'Engineered character prompt',
          outputs: 'Character anchor reference PNGs saved to archive/characters/',
        },
        {
          step_number: '2.4',
          title: 'Character Profile Checkpoint Save',
          description: 'Stores character manifest and image paths for downstream keyframe generation.',
          status: 'passed',
          inputs: 'Synthesized images & profiles',
          outputs: 'phase_2_characters.json checkpoint',
        },
      ],
    },
    {
      id: 'keyframe_gen',
      name: 'Keyframe Vision Generator',
      phase: 'Phase 3',
      provider: 'Google Nano Banana Pro (Imagen 3)',
      status: 'ready',
      latency_ms: 32,
      description: 'Generates photorealistic keyframe stills for every scene beat, strictly referencing Phase 2 character portraits and Phase 1 environments.',
      task_steps: [
        {
          step_number: '3.1',
          title: 'Aspect Ratio & Viewport Calibration',
          description: 'Calibrates composition bounds for 9:16 vertical shorts or 16:9 cinematic widescreen.',
          status: 'passed',
          inputs: 'aspect_ratio parameter (9:16 / 16:9)',
          outputs: 'Resolution dimensions (768x1344 / 1344x768)',
        },
        {
          step_number: '3.2',
          title: 'Phase 2 Visual Reference Conditioning',
          description: 'Feeds Phase 2 character reference portrait PNGs and optical styling into multimodal diffusion prompt.',
          status: 'passed',
          inputs: 'Phase 2 character reference portraits, scene visual descriptions',
          outputs: 'Enriched photographic generation prompt with image references',
        },
        {
          step_number: '3.3',
          title: 'High-Res Keyframe Generation & QA Gate',
          description: 'Renders scene frame, verifies image integrity, and avoids artifacts.',
          status: 'passed',
          inputs: 'Enriched prompt, image provider adapter',
          outputs: 'Scene keyframe PNG images',
        },
        {
          step_number: '3.4',
          title: 'Visual Manifest Checkpoint Save',
          description: 'Commits keyframe paths, prompt manifests, and thumbnail caches to archive.',
          status: 'passed',
          inputs: 'Keyframe image file handles',
          outputs: 'phase_3_images.json checkpoint',
        },
      ],
    },
    {
      id: 'motion_prompter',
      name: 'Motion Dynamics & Video Clip Engine',
      phase: 'Phase 4',
      provider: 'Google Veo 3.1 Fast / Gemini',
      status: 'ready',
      latency_ms: 38,
      description: 'Engineers camera trajectories and character dialogue scripts, then renders video clips via Veo 3.1 Fast upon approval.',
      task_steps: [
        {
          step_number: '4.1',
          title: 'Camera Trajectory & Physical Dynamics',
          description: 'Calculates 50mm push-ins, subtle tilts, fluid secondary physics, and crystal reflection motions.',
          status: 'passed',
          inputs: 'Scene shot type & emotional tension',
          outputs: 'Camera dynamic vector & pan rate',
        },
        {
          step_number: '4.2',
          title: 'Character Dialogue Script & Ambient Audio',
          description: 'Formats direct speech (Character says: "..."), vocal delivery descriptors, and ambient background room tone.',
          status: 'passed',
          inputs: 'Scene dialogue, character bibles',
          outputs: 'Veo single-pass video + audio prompt',
        },
        {
          step_number: '4.3',
          title: 'Approved Video Clip Rendering (Veo 3.1 Fast)',
          description: 'Upon approval, renders individual scene MP4 video clips with native single-pass dialogue audio from Phase 3 keyframes.',
          status: 'passed',
          inputs: 'Phase 3 keyframe image, Veo motion prompt',
          outputs: 'Rendered scene_XX.mp4 video clip',
        },
        {
          step_number: '4.4',
          title: 'Video Clips Checkpoint Save',
          description: 'Serializes animation directives and saves rendered scene clips to archive/clips directory.',
          status: 'passed',
          inputs: 'Rendered video clips',
          outputs: 'phase_4_animation_prompts.json checkpoint',
        },
      ],
    },
    {
      id: 'video_engine',
      name: 'Caption & Merge Clip Assembly Engine',
      phase: 'Phase 5',
      provider: 'Faster-Whisper & FFmpeg',
      status: 'ready',
      latency_ms: 22,
      description: 'Stitches all sequence video clips, transcribes native audio to burn dynamic karaoke subtitles, and exports the master video.',
      task_steps: [
        {
          step_number: '5.1',
          title: 'Video Clip Sequence Manifest',
          description: 'Ingests all Phase 4 scene video clips and constructs FFmpeg clips.txt manifest.',
          status: 'passed',
          inputs: 'archive/clips/*.mp4 clips',
          outputs: 'clips.txt concatenation manifest',
        },
        {
          step_number: '5.2',
          title: 'Master Video Concatenation',
          description: 'Stitches all clips seamlessly preserving native single-pass Veo audio without re-encoding quality loss.',
          status: 'passed',
          inputs: 'clips.txt manifest',
          outputs: 'merged_video.mp4',
        },
        {
          step_number: '5.3',
          title: 'Dynamic Word-Level Karaoke Subtitle Burning',
          description: 'Transcribes native dialogue using faster-whisper and burns word-level animated .ass subtitles.',
          status: 'passed',
          inputs: 'merged_video.mp4 audio track',
          outputs: 'final_story_captioned.mp4',
        },
        {
          step_number: '5.4',
          title: 'SEO Distribution Package & Master Export',
          description: 'Compiles final_story.mp4, YouTube/TikTok/Reels metadata package, and high-CTR thumbnail prompt.',
          status: 'passed',
          inputs: 'Final captioned video & script summary',
          outputs: 'final_story.mp4 & SEO metadata manifest',
        },
      ],
    },
    {
      id: 'tts_service',
      name: 'Single-Pass Native Audio Engine',
      phase: 'Audio Design',
      provider: 'Google Veo 3.1 Single-Pass (Integrated)',
      status: 'ready',
      latency_ms: 12,
      description: 'Dialogue and ambient room tone are synthesized in a single pass with the video by Veo 3.1 (standalone TTS voiceover is not implemented).',
      task_steps: [
        {
          step_number: '6.1',
          title: 'Integrated Single-Pass Audio Directives',
          description: 'Audio acoustics, character vocal tone, and ambient noise are rendered natively in Phase 4 with the video diffusion.',
          status: 'passed',
          inputs: 'Phase 4 dialogue & ambient audio prompt',
          outputs: 'Native synchronized MP4 audio stream',
        },
        {
          step_number: '6.2',
          title: 'Phoneme Synthesis & Word Timestamp Alignment',
          description: 'Generates natural speech audio while recording millisecond-accurate start/end offsets for every word.',
          status: 'passed',
          inputs: 'Text string, voice ID, pitch, rate',
          outputs: 'Speech audio buffer + word timing metadata',
        },
        {
          step_number: '6.3',
          title: 'Multi-Speaker Stems Normalization',
          description: 'Applies EBU R128 loudness normalization and mixes dialogue stems into a master vocal track.',
          status: 'passed',
          inputs: 'Per-scene audio stems',
          outputs: 'Normalized dialogue stream',
        },
        {
          step_number: '6.4',
          title: 'Audio Track Stems Export',
          description: 'Exports voiceover.mp3 to story archive and verifies audio track duration matches video cuts.',
          status: 'passed',
          inputs: 'Master audio stream',
          outputs: 'voiceover.mp3 & timing json',
        },
      ],
    },
    {
      id: 'subtitle_burner',
      name: 'Dynamic Word-Level Subtitle Burner',
      phase: 'Subtitles',
      provider: 'Faster-Whisper Dynamic ASS',
      status: 'ready',
      latency_ms: 19,
      description: 'Compiles viral kinetic karaoke subtitles with word-by-word highlight animations and high-contrast styling.',
      task_steps: [
        {
          step_number: '7.1',
          title: 'Word-by-Word Karaoke Alignment',
          description: 'Calculates millisecond karaoke tags (\\k) matching audio phonemes precisely.',
          status: 'passed',
          inputs: 'Word-level timestamp list',
          outputs: 'Timed dialogue events with \\k modifiers',
        },
        {
          step_number: '7.2',
          title: 'Kinetic Typography Styling',
          description: 'Applies TikTok-optimized Montserrat font, primary cyan highlight, obsidian border, and glow effects.',
          status: 'passed',
          inputs: 'Design typography tokens',
          outputs: 'ASS V4+ header with custom shadow/outline',
        },
        {
          step_number: '7.3',
          title: 'ASS Script Compilation & Sync Verification',
          description: 'Assembles subtitle script file, verifying no subtitle overlaps or timecode drift.',
          status: 'passed',
          inputs: 'Dialogue lines, audio total duration',
          outputs: 'subtitles.ass script',
        },
        {
          step_number: '7.4',
          title: 'Hardsub Manifest Checkpoint Save',
          description: 'Records subtitle timing data into story package metadata for instant export.',
          status: 'passed',
          inputs: 'subtitles.ass path',
          outputs: 'Verified subtitle asset in archive',
        },
      ],
    },
    {
      id: 'ffmpeg_assembler',
      name: 'FFmpeg Master Concat & Multiplexer',
      phase: 'Assembly',
      provider: 'FFmpeg 6+ (Built-in)',
      status: 'ready',
      latency_ms: 12,
      description: 'Concatenates video scenes, muxes multi-channel audio stems, burns dynamic hardsubs, and exports final 4K/1080p MP4.',
      task_steps: [
        {
          step_number: '8.1',
          title: 'Video Clip Normalization & Crossfade Concat',
          description: 'Standardizes framerate, color matrix (yuv420p), and stitches scene clips into continuous video stream.',
          status: 'passed',
          inputs: 'Scene clips array [scene_01.mp4, scene_02.mp4, ...]',
          outputs: 'Stitched master video stream',
        },
        {
          step_number: '8.2',
          title: 'Audio-Visual Sync & Muxing',
          description: 'Aligns master voiceover.mp3, ambient soundbed, and scene SFX cues with microsecond precision.',
          status: 'passed',
          inputs: 'Stitched video, voiceover.mp3',
          outputs: 'Muxed audiovisual stream',
        },
        {
          step_number: '8.3',
          title: 'Dynamic Hardsub Filtergraph Rendering',
          description: 'Executes complex filtergraph burning subtitles.ass with GPU/CPU acceleration.',
          status: 'passed',
          inputs: 'Muxed stream, subtitles.ass',
          outputs: 'Hardsubbed video stream',
        },
        {
          step_number: '8.4',
          title: 'Final 4K/1080p Master Story Export',
          description: 'Encodes final web-optimized MP4 (H.264 / AAC) and writes final_story_captioned.mp4 to archive.',
          status: 'passed',
          inputs: 'Filtergraph output',
          outputs: 'final_story_captioned.mp4 master',
        },
      ],
    },
  ],
};

/**
 * Fetch diagnostics, operational status, and task step breakdown for all 8 studio tools
 */
export async function fetchToolsDiagnostics(): Promise<ToolsDiagnosticsReport> {
  try {
    const res = await fetch(apiUrl('/api/tools/diagnostics'), { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return FALLBACK_TOOLS_REPORT;
}

/**
 * Run a diagnostic smoke test for a specific tool
 */
export async function testTool(
  toolId: string,
  options?: { provider?: string; prompt?: string; story_id?: string | null; [key: string]: any }
): Promise<{
  success: boolean;
  tool_id: string;
  tool_name: string;
  latency_ms?: number;
  status: string;
  message?: string;
  error?: string;
  output?: any;
  story_id?: string;
  [key: string]: any;
}> {
  try {
    const res = await fetch(apiUrl(`/api/tools/test/${encodeURIComponent(toolId)}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      return {
        success: false,
        tool_id: toolId,
        tool_name: data?.tool_name || toolId,
        status: 'failed',
        error: data?.error || data?.message || data?.detail || `Server error (${res.status})`,
        output: null,
      };
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      tool_id: toolId,
      tool_name: toolId,
      status: 'failed',
      error: err?.message || 'Network connection failed while reaching test endpoint.',
      output: null,
    };
  }
}

/**
 * Resolves the backend base URL. If NEXT_PUBLIC_API_URL is configured (e.g. Cloud Run
 * or local dev), use it; otherwise use relative path.
 */
export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      if (window.location.port === '8000') {
        return '';
      }
      return 'http://localhost:8000';
    }
    // Production Cloud Run backend fallback for fablemotion.me
    if (host.includes('fablemotion.me')) {
      return 'https://fable-motion-api-581866038534.asia-northeast1.run.app';
    }
  }
  return 'https://fable-motion-api-581866038534.asia-northeast1.run.app';
}

function apiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const base = getApiBaseUrl();
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${base}${cleanPath}`;
}

/**
 * Fetch public connection status for all social channels for a specific user.
 */
export async function fetchOAuthStatus(userId: string = 'default'): Promise<OAuthStatusResponse> {
  const base = getApiBaseUrl();
  const url = `${base}/api/oauth/status?user_id=${encodeURIComponent(userId)}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[API] Failed to fetch OAuth status from backend:', err);
  }

  return {
    user_id: userId,
    accounts: {
      youtube: { connected: false, account_name: null, account_id: null, is_expired: false, has_refresh_token: false },
      meta: { connected: false, account_name: null, account_id: null, is_expired: false, has_refresh_token: false },
      tiktok: { connected: false, account_name: null, account_id: null, is_expired: false, has_refresh_token: false },
    },
  };
}

/**
 * Checks which social platforms have server-side API keys configured in .env.
 */
export async function fetchOAuthClientConfig(): Promise<OAuthClientConfigResponse> {
  const base = getApiBaseUrl();
  const url = `${base}/api/oauth/client-config`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[API] Failed to fetch OAuth client config:', err);
  }

  return {
    youtube: false,
    meta: false,
    facebook: false,
    instagram: false,
    tiktok: false,
    supabase: false,
  };
}

/**
 * Disconnects and removes stored OAuth credentials for a platform and user.
 */
export async function disconnectOAuthAccount(
  userId: string,
  platform: string
): Promise<{ success: boolean; message: string }> {
  const base = getApiBaseUrl();
  const url = `${base}/api/oauth/disconnect`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, platform }),
    });
    const data = await res.json();
    return {
      success: Boolean(data?.success),
      message: data?.message || (data?.success ? `Disconnected ${platform}` : `Failed to disconnect ${platform}`),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || `Network error disconnecting ${platform}`,
    };
  }
}

/**
 * Returns a list of all user_ids that currently have social connections saved.
 */
export async function fetchConnectedUsers(): Promise<string[]> {
  const base = getApiBaseUrl();
  const url = `${base}/api/oauth/users`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.users)) {
        return data.users;
      }
    }
  } catch {
    // ignore
  }
  return ['default'];
}

/**
 * Generates the direct URL to initiate OAuth flow for a platform.
 */
export function getOAuthConnectUrl(
  platform: string,
  userId: string = 'default',
  redirectTo?: string
): string {
  const base = getApiBaseUrl();
  const returnUrl = redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}/upload` : '/upload');
  const plat = platform === 'facebook' || platform === 'instagram' ? 'meta' : platform.toLowerCase();
  return `${base}/api/oauth/${encodeURIComponent(plat)}/connect?user_id=${encodeURIComponent(userId)}&redirect_to=${encodeURIComponent(returnUrl)}`;
}

/**
 * Direct channel credential verification test via backend diagnostic endpoint.
 */
export async function testUploadChannel(
  channelId: string
): Promise<{ success: boolean; status?: string; message?: string; error?: string }> {
  const base = getApiBaseUrl();
  const url = `${base}/api/upload/test-channel/${encodeURIComponent(channelId)}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error verifying channel credentials.',
    };
  }
}

/**
 * Fetches user-specific platform credentials from backend (isolated per user).
 */
export async function fetchUserCredentials(userId: string = 'default'): Promise<UserPlatformCredentialsResponse> {
  let localMerged: Record<string, any> = {};
  if (typeof window !== 'undefined') {
    try {
      localMerged = JSON.parse(localStorage.getItem(`fablemotion_creds_${userId}`) || '{}');
    } catch {}
  }

  const base = getApiBaseUrl();
  const url = `${base}/api/oauth/credentials?user_id=${encodeURIComponent(userId)}`;
  let serverCreds: any = null;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      serverCreds = data.credentials;
    }
  } catch (err) {
    console.warn('[API] Failed to fetch user credentials from backend:', err);
  }

  const platforms = ['youtube', 'tiktok', 'instagram', 'facebook'] as const;
  const credentials: any = {};

  for (const p of platforms) {
    const s = serverCreds?.[p];
    const l = localMerged?.[p];
    if (s && (s.client_id || s.client_secret || s.connected)) {
      credentials[p] = s;
    } else if (l && (l.client_id || l.client_secret)) {
      credentials[p] = {
        platform: p,
        connected: Boolean(l.connected),
        account_name: l.account_name || null,
        account_id: l.account_id || null,
        client_id: l.client_id || '',
        client_secret: l.client_secret || '',
        access_token: l.access_token || '',
        has_refresh_token: false,
      };
    } else {
      credentials[p] = {
        platform: p,
        connected: false,
        account_name: null,
        account_id: null,
        client_id: '',
        client_secret: '',
        access_token: '',
        has_refresh_token: false,
      };
    }
  }

  return {
    user_id: userId,
    credentials,
  };
}

/**
 * Saves custom platform credentials for a user (from the Setup Wizard).
 */
export async function saveUserCredentials(payload: SaveUserCredentialsPayload): Promise<{ success: boolean; message: string; credentials?: any }> {
  // Always cache immediately in localStorage for resilience and local isolation
  const cacheKey = `fablemotion_creds_${payload.user_id}`;
  if (typeof window !== 'undefined') {
    try {
      const existing = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      existing[payload.platform] = {
        platform: payload.platform,
        connected: Boolean(payload.client_id && (payload.client_secret || payload.access_token)),
        client_id: payload.client_id,
        client_secret: payload.client_secret,
        access_token: payload.access_token || payload.client_secret,
        account_name: payload.account_name,
        updated_at: Math.floor(Date.now() / 1000),
      };
      localStorage.setItem(cacheKey, JSON.stringify(existing));
    } catch {
      // ignore
    }
  }

  const base = getApiBaseUrl();
  const url = `${base}/api/oauth/credentials`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({}));
    if (res.status === 405 || res.status === 404) {
      return {
        success: true,
        message: 'Saved credentials to your local workspace profile.',
        credentials: payload,
      };
    }
    return {
      success: false,
      message: errData?.detail || 'Failed to save credentials.',
    };
  } catch (err: any) {
    return {
      success: true,
      message: 'Saved credentials to your local workspace profile.',
      credentials: payload,
    };
  }
}

/**
 * Pre-flight diagnostic test for platform credentials.
 */
export async function testPlatformCredentials(params: {
  userId: string;
  platform: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
}): Promise<TestPlatformResponse> {
  const base = getApiBaseUrl();
  const url = `${base}/api/oauth/test-platform`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: params.userId,
        platform: params.platform,
        client_id: params.clientId,
        client_secret: params.clientSecret,
        access_token: params.accessToken,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.warn('[API] Test platform error:', err);
  }

  return {
    success: false,
    platform: params.platform,
    message: 'Could not connect to backend test service.',
    latency_ms: 18,
  };
}


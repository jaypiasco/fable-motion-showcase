/**
 * AI Video Stories Studio - Core TypeScript Data Models
 */

export type StoryStatus = 'pending' | 'in_progress' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'unknown';

export interface StorySummary {
  story_id: string;
  story_slug: string;
  title: string;
  logline?: string;
  prompt: string;
  status: StoryStatus;
  current_phase: string;
  created_at: string;
  updated_at: string;
  scenes_count: number;
  thumbnail_url: string | null;
  has_final_video: boolean;
  final_video_url?: string | null;
  is_trashed?: boolean;
  is_test_run?: boolean;
}

export interface DialogueLine {
  speaker?: string;
  accent_and_tone?: string;
  exact_speech?: string;
}

export interface SceneScript {
  scene_id: number;
  timestamp?: string;
  shot_type?: string;
  setting?: string;
  visual_description?: string;
  characters?: string[];
  dialogue?: DialogueLine[] | string;
  narration?: string;
  voiceover?: string;
  sfx_cue?: string;
  duration_seconds?: number;
}

export interface Phase1Script {
  status: string;
  completed_at?: string;
  agent_model_used?: string;
  agent_model_display?: string;
  idea: {
    title: string;
    logline?: string;
    hook_3s?: string;
    genre?: string;
    aspect_ratio?: string;
  };
  scenes: SceneScript[];
}

export interface CharacterData {
  name: string;
  role?: string;
  visual_dna?: string;
  portrait_prompt?: string;
  archetype?: string;
  crystal_shader?: string;
  fruit_shader?: string;
  signature_wardrobe?: string;
  vocal_tone?: string;
  hidden_motivation?: string;
  visual_anchor?: string;
  style_seed_prompt?: string;
  style_prompt?: string;
  image_url?: string | null;
  agent_model_used?: string;
  image_prompt_sent?: string;
}

export interface Phase2Characters {
  status: string;
  completed_at?: string;
  agent_model_used?: string;
  script_model_used?: string;
  story_summary?: string;
  characters: CharacterData[];
}

export interface KeyframeItem {
  scene_id: number;
  shot_type?: string;
  setting?: string;
  image_url?: string | null;
  status: string;
  error?: string;
  completed_at?: string;
  agent_model_used?: string;
  image_prompt_sent?: string;
}

export interface Phase3Images {
  status: string;
  error?: string;
  completed_at?: string;
  agent_model_used?: string;
  items: KeyframeItem[];
}

export interface MotionItem {
  scene_id: number;
  animation_prompt_generated?: string;
  camera_dynamics?: string;
  camera_movement?: string;
  action_description?: string;
  dialogue?: any;
  audio_cues?: string;
  duration?: number;
  status?: string;
  error?: string;
  agent_model_used?: string;
  agent_model_display?: string;
}

export interface Phase4Motion {
  status: string;
  error?: string;
  completed_at?: string;
  agent_model_used?: string;
  items: MotionItem[];
}

export interface VideoClipItem {
  scene_id: number;
  video_url?: string | null;
  status: string;
  error?: string;
  completed_at?: string;
  agent_model_used?: string;
  video_prompt_sent?: string;
}

export interface AssemblyFiles {
  final_video_url?: string | null;
  captioned_video_url?: string | null;
  merged_video_url?: string | null;
  voiceover_url?: string | null;
  subtitles_url?: string | null;
  subtitles_content?: string | null;
}

export interface Phase5Video {
  status: string;
  error?: string;
  completed_at?: string;
  agent_model_used?: string;
  clips: VideoClipItem[];
  assembly: AssemblyFiles;
}

export interface StoryConceptCastMember {
  role: string;
  archetype: string;
  features?: string;
  wardrobe?: string;
  emotional_tone?: string;
}

export interface StoryConcept {
  id: number | string;
  story_archetype_id?: string;
  title: string;
  genre?: string;
  hook_3s?: string;
  logline?: string;
  big_twist?: string;
  visual_style?: string;
  style_and_concept?: {
    visual_engine?: string;
    aesthetic?: string;
    tone?: string;
  };
  core_cast?: StoryConceptCastMember[];
  environment_arc?: {
    act_1_crisis?: string;
    act_2_exile?: string;
    act_3_sanctuary?: string;
    act_4_climax?: string;
  };
  camera_and_motion?: {
    camera?: string;
    physics_effects?: string;
  };
  plot_beats?: string[];
  estimated_scenes?: number;
}

export interface StoryDetail {
  story_id: string;
  story_slug: string;
  prompt: string;
  status: StoryStatus;
  error?: string;
  current_phase: string;
  created_at: string;
  updated_at: string;
  archive_dir?: string;
  models_config?: ModelsConfig;
  is_trashed?: boolean;
  paused?: boolean;
  is_test_run?: boolean;
  has_final_video?: boolean;
  final_video_url?: string | null;
  concepts?: StoryConcept[];
  selected_concept?: StoryConcept | null;
  call_to_action?: string;
  phases: {
    phase_1_script?: Phase1Script;
    phase_2_characters?: Phase2Characters;
    phase_3_images?: Phase3Images;
    phase_4_animation_prompts?: Phase4Motion;
    phase_5_video_generation?: Phase5Video;
  };
}

export interface ModelsConfig {
  script_model: string;
  image_model: string;
  image_model_display: string;
  video_model: string;
  video_model_display: string;
  tts_model: string;
  caption_model: string;
}

export interface SystemStatus {
  is_running: boolean;
  current_run: {
    active_story_id?: string;
    story_slug?: string;
    prompt?: string;
    current_phase?: string;
    phase_index?: number;
    total_phases?: number;
    progress_percent?: number;
    status?: string;
  };
  active_story?: StorySummary | null;
  queue_count: number;
  updated_at: string;
}

export interface QueueItem {
  id?: string;
  prompt: string;
  max_scenes?: number | null;
  created_at?: string;
}

export interface ToolTaskStep {
  step_number: string;
  title: string;
  description: string;
  status: 'passed' | 'running' | 'idle' | 'failed' | 'skipped';
  inputs?: string;
  outputs?: string;
  latency_ms?: number;
}

export interface ToolDiagnostic {
  id: string;
  name: string;
  phase: string;
  provider: string;
  status: 'ready' | 'testing' | 'passed' | 'failed' | 'idle';
  latency_ms?: number;
  description: string;
  task_steps: ToolTaskStep[];
}

export interface ToolsDiagnosticsReport {
  status: string;
  operational_count: number;
  total_tools: number;
  ffmpeg_status?: {
    available: boolean;
    version: string;
    path: string;
  };
  environment_recommendation: string;
  tools: ToolDiagnostic[];
  timestamp: string;
}

export interface OAuthAccountStatus {
  connected: boolean;
  account_name: string | null;
  account_id: string | null;
  connected_at?: number;
  is_expired: boolean;
  has_refresh_token: boolean;
  details?: Record<string, any>;
}

export interface OAuthStatusResponse {
  user_id: string;
  accounts: {
    youtube?: OAuthAccountStatus;
    meta?: OAuthAccountStatus;
    tiktok?: OAuthAccountStatus;
    facebook?: OAuthAccountStatus;
    instagram?: OAuthAccountStatus;
    [key: string]: OAuthAccountStatus | undefined;
  };
}

export interface PlatformClientConfig {
  configured: boolean;
  env_vars: string[];
  missing: string[];
}

export interface OAuthClientConfigResponse {
  youtube: boolean;
  meta: boolean;
  facebook: boolean;
  instagram: boolean;
  tiktok: boolean;
  supabase: boolean;
  details?: {
    youtube: PlatformClientConfig;
    meta: PlatformClientConfig;
    facebook: PlatformClientConfig;
    instagram: PlatformClientConfig;
    tiktok: PlatformClientConfig;
    supabase: PlatformClientConfig;
  };
}

export interface UserPlatformCredential {
  platform: string;
  connected: boolean;
  account_name: string | null;
  account_id: string | null;
  client_id: string;
  client_secret: string;
  access_token: string;
  has_refresh_token: boolean;
  updated_at?: number | string | null;
}

export interface UserPlatformCredentialsResponse {
  user_id: string;
  credentials: {
    youtube?: UserPlatformCredential;
    tiktok?: UserPlatformCredential;
    instagram?: UserPlatformCredential;
    facebook?: UserPlatformCredential;
    [key: string]: UserPlatformCredential | undefined;
  };
}

export interface SaveUserCredentialsPayload {
  user_id: string;
  platform: string;
  client_id?: string;
  client_secret?: string;
  access_token?: string;
  account_id?: string;
  account_name?: string;
  page_id?: string;
  ig_user_id?: string;
  details?: Record<string, any>;
}

export interface TestPlatformResponse {
  success: boolean;
  platform: string;
  message: string;
  latency_ms?: number;
  channel_name?: string;
  account_name?: string;
}



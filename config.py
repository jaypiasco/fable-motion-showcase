"""
Configuration module for AI Video Story Pipeline.
"""

from pathlib import Path
import shutil
from typing import Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, AliasChoices

# Explicitly populate os.environ from .env
_env_path = Path(__file__).resolve().parent / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path, override=False)


def _resolve_ffmpeg_path() -> str:
    found = shutil.which("ffmpeg")
    if found:
        return found
    winget_ffmpeg = Path.home() / "AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe"
    if winget_ffmpeg.exists():
        return str(winget_ffmpeg)
    return "ffmpeg"


class PipelineConfig(BaseSettings):
    # Base Directories
    BASE_DIR: Path = Path(__file__).resolve().parent
    ARCHIVE_DIR: Path = BASE_DIR / "archive"
    QUEUE_DIR: Path = BASE_DIR / "queue"
    LOGS_DIR: Path = BASE_DIR / "logs"
    STATE_DIR: Path = BASE_DIR / "state"
    TEMP_DIR: Path = BASE_DIR / "temp"

    # Queue configuration
    QUEUE_FILE: Path = QUEUE_DIR / "story_queue.json"
    CURRENT_STATE_FILE: Path = STATE_DIR / "current_run.json"

    # AI Model Providers & Model Identifiers
    # Phase 1, Phase 2 & Phase 4 logic: Google Gemini 3.5 Flash-Lite
    LLM_PROVIDER: str = "gemini_direct"  # "gemini_direct" or "gateway"
    GATEWAY_URL: str = "http://localhost:8080/api/v1"
    GATEWAY_NAMESPACE_PREFIX: str = "ai_stories"
    SCRIPT_MODEL: str = "gemini-3.5-flash-lite"  # Primary LLM for Phase 1 (script), Phase 2 (characters), Phase 4 (motion prompts)
    MAX_SCENES: Optional[int] = None  # None for full scenes, or integer (e.g. 1) for test runs
    
    # Google Cloud & Vertex AI Configuration
    GOOGLE_CLOUD_PROJECT: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices(
            "GOOGLE_CLOUD_PROJECT",
            "AI_STORY_GOOGLE_CLOUD_PROJECT",
            "GCP_PROJECT",
            "PROJECT_ID",
            "CLOUD_RUN_PROJECT"
        )
    )
    GOOGLE_CLOUD_LOCATION: str = Field(
        default="us-central1",
        validation_alias=AliasChoices(
            "GOOGLE_CLOUD_LOCATION",
            "AI_STORY_GOOGLE_CLOUD_LOCATION",
            "GCP_LOCATION",
            "VERTEX_LOCATION"
        )
    )
    VERTEX_API_KEY: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices(
            "VERTEX_API_KEY",
            "AI_STORY_VERTEX_API_KEY",
            "VERTEX_AI_API_KEY"
        )
    )
    GCS_BUCKET_NAME: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("GCS_BUCKET_NAME", "AI_STORY_GCS_BUCKET_NAME", "GOOGLE_CLOUD_STORAGE_BUCKET")
    )
    GCS_PUBLIC_BASE_URL: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("GCS_PUBLIC_BASE_URL", "AI_STORY_GCS_PUBLIC_BASE_URL")
    )

    # Supabase PostgreSQL & Auth Configuration
    SUPABASE_URL: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("SUPABASE_URL", "AI_STORY_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
    )
    SUPABASE_KEY: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("SUPABASE_KEY", "AI_STORY_SUPABASE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    )
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("SUPABASE_SERVICE_ROLE_KEY", "AI_STORY_SUPABASE_SERVICE_ROLE_KEY")
    )

    # Metrics & Prometheus Auth (Required for Grafana Cloud scrape targets)
    METRICS_USERNAME: str = Field(
        default="grafana",
        validation_alias=AliasChoices("METRICS_USERNAME", "AI_STORY_METRICS_USERNAME")
    )
    METRICS_PASSWORD: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("METRICS_PASSWORD", "AI_STORY_METRICS_PASSWORD")
    )

    # Langfuse LLMOps Observability & Tracing
    ENABLE_LANGFUSE: bool = Field(
        default=True,
        validation_alias=AliasChoices("ENABLE_LANGFUSE", "AI_STORY_ENABLE_LANGFUSE")
    )
    LANGFUSE_PUBLIC_KEY: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("LANGFUSE_PUBLIC_KEY", "AI_STORY_LANGFUSE_PUBLIC_KEY")
    )
    LANGFUSE_SECRET_KEY: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("LANGFUSE_SECRET_KEY", "AI_STORY_LANGFUSE_SECRET_KEY")
    )
    LANGFUSE_HOST: str = Field(
        default="https://cloud.langfuse.com",
        validation_alias=AliasChoices("LANGFUSE_HOST", "AI_STORY_LANGFUSE_HOST", "LANGFUSE_BASE_URL")
    )

    # API Keys & Third-Party Service Credentials
    FAL_KEY: Optional[str] = None
    ELEVENLABS_API_KEY: Optional[str] = None  # Deprecated / Phased out
    SYNC_LABS_API_KEY: Optional[str] = None   # Deprecated / Phased out

    # Audio / TTS Settings (Phased out: relying on Veo 3 native audio or video-only)
    ENABLE_VOICEOVER: bool = False
    TTS_PROVIDER: str = "none"  # "none" (TTS / ElevenLabs phased out)
    MULTI_VOICE_ENABLED: bool = False
    EDGE_TTS_VOICE: str = "en-US-ChristopherNeural"
    EDGE_TTS_RATE: str = "+0%"
    EDGE_TTS_PITCH: str = "+0Hz"
    ELEVENLABS_VOICE_ID: Optional[str] = None
    ELEVENLABS_MODEL_ID: Optional[str] = None
    
    IMAGE_PROVIDER: str = "gemini_imagen"  # "gemini_imagen" (Google Gemini/Imagen prod)
    IMAGEN_MODEL: str = "gemini-2.5-flash-image"  # Multimodal Google image generation model
    POLLINATIONS_MODEL: str = "flux"  # Keyless fallback
    POLLINATIONS_API_KEY: Optional[str] = None
    IMAGE_ASPECT_RATIO: str = "9:16"  # 9:16 vertical standard
    
    # Phase 5: Video Generation Settings (Primary: Google Veo 3.1 Fast)
    VIDEO_PROVIDER: str = "google_veo"  # "google_veo" (Google Veo 3.1 Fast prod)
    VEO_MODEL: str = "veo-3.1-fast-generate-001"  # Google Veo 3.1 Fast
    VIDEO_ROUTER_MODE: str = "smart"
    VIDEO_DURATION_SECONDS: int = 4  # default duration per clip (supported by Veo: 4, 6, 8)
    FAL_KLING_MODEL: str = "fal-ai/kling-video/v1.5/pro/image-to-video"
    
    # Lip-Sync Provider Settings (Phased out)
    ENABLE_LIPSYNC: bool = False
    LIPSYNC_PROVIDER: str = "none"
    
    # Rate Limit & Resilience Settings
    MAX_RETRIES: int = 8
    INITIAL_BACKOFF_SECONDS: float = 5.0
    MAX_BACKOFF_SECONDS: float = 300.0  # 5 minutes max wait
    BACKOFF_MULTIPLIER: float = 2.0
    REQUEST_TIMEOUT_SECONDS: int = 180
    POLL_INTERVAL_SECONDS: int = 10
    
    # Assembly & FFmpeg Post-Processing Settings
    ENABLE_ASSEMBLY: bool = True
    FFMPEG_PATH: str = Field(default_factory=_resolve_ffmpeg_path)
    VIDEO_ENCODING_PRESET: str = "slow"
    VIDEO_CRF: int = 18
    AUDIO_BITRATE: str = "192k"
    
    # Dynamic Captioning & Transcription (Disabled)
    ENABLE_DYNAMIC_CAPTIONS: bool = False
    CAPTION_STYLE: str = "karaoke"  # "karaoke" or "word_flash"
    CAPTION_FONT: str = "Impact"  # "Impact", "Montserrat Black", "Arial Black", "Bebas Neue"
    CAPTION_FONT_SIZE: int = 75
    CAPTION_SPACING: int = 2  # Letter spacing in .ass
    WHISPER_MODEL_SIZE: str = "base"  # "base", "small", "medium", "large-v3"
    WHISPER_DEVICE: str = "cpu"
    WHISPER_COMPUTE_TYPE: str = "int8"
    
    # Background Daemon
    DAEMON_POLL_INTERVAL_SECONDS: int = 15  # sleep time when queue is empty

    model_config = SettingsConfigDict(
        env_prefix="AI_STORY_",
        env_file=".env",
        extra="ignore"
    )


config = PipelineConfig()

# Ensure standard directories exist
for directory in [config.ARCHIVE_DIR, config.QUEUE_DIR, config.LOGS_DIR, config.STATE_DIR, config.TEMP_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

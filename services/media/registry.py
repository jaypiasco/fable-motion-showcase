"""
Media Provider Registry & Factory.
Provides dynamic registration, resolution, and fallback chains for TTS, Image, Video, and Lip-Sync providers.
Allows instant 1-line tool switching via config or runtime parameters.
"""

from typing import Dict, Type, Optional
from core.logger import logger
from config import config
from services.media.base import (
    BaseTTSProvider,
    BaseImageProvider,
    BaseVideoProvider,
    BaseLipSyncProvider,
)

# Providers
from services.media.tts import EdgeTTSAdapter, ElevenLabsFlashAdapter, GTTSAdapter, AmbientAudioAdapter, NoneTTSAdapter
from services.media.images import FalFluxAdapter, PollinationsFluxAdapter, GeminiImagenAdapter, ProceduralCrystalAdapter
from services.media.video import GoogleVeoAdapter, FalLTXVideoAdapter, FalKlingAdapter, ShotRouter
from services.media.lipsync import PassthroughLipSyncAdapter, SyncLabsLipSyncAdapter


# Registry Storage
_TTS_REGISTRY: Dict[str, BaseTTSProvider] = {}
_IMAGE_REGISTRY: Dict[str, BaseImageProvider] = {}
_VIDEO_REGISTRY: Dict[str, BaseVideoProvider] = {}
_LIPSYNC_REGISTRY: Dict[str, BaseLipSyncProvider] = {}


def _init_default_registries():
    """Initializes standard built-in providers."""
    # TTS
    register_tts_provider(NoneTTSAdapter())
    register_tts_provider(EdgeTTSAdapter())
    register_tts_provider(ElevenLabsFlashAdapter())
    register_tts_provider(GTTSAdapter())
    register_tts_provider(AmbientAudioAdapter())

    # Images
    register_image_provider(GeminiImagenAdapter())
    register_image_provider(FalFluxAdapter())
    register_image_provider(PollinationsFluxAdapter())
    register_image_provider(ProceduralCrystalAdapter())

    # Video
    register_video_provider(GoogleVeoAdapter())
    register_video_provider(ShotRouter())
    register_video_provider(FalLTXVideoAdapter())
    register_video_provider(FalKlingAdapter())

    # LipSync
    register_lipsync_provider(PassthroughLipSyncAdapter())
    register_lipsync_provider(SyncLabsLipSyncAdapter())


# Registration API
def register_tts_provider(provider: BaseTTSProvider):
    _TTS_REGISTRY[provider.name.lower()] = provider

def register_image_provider(provider: BaseImageProvider):
    _IMAGE_REGISTRY[provider.name.lower()] = provider

def register_video_provider(provider: BaseVideoProvider):
    _VIDEO_REGISTRY[provider.name.lower()] = provider

def register_lipsync_provider(provider: BaseLipSyncProvider):
    _LIPSYNC_REGISTRY[provider.name.lower()] = provider


# Provider Lookup & Resolution API
def get_tts_provider(name: Optional[str] = None) -> BaseTTSProvider:
    """Resolves TTS provider by name, falling back to config setting or edge_tts."""
    if not _TTS_REGISTRY:
        _init_default_registries()

    target = (name or getattr(config, "TTS_PROVIDER", "none")).lower()
    
    # Handle aliases
    if target in ["none", "disabled", "off", "null"]:
        return _TTS_REGISTRY.get("none", NoneTTSAdapter())

    if target in ["gemini", "gemini_tts"]:
        target = "edge_tts"

    if target in _TTS_REGISTRY:
        return _TTS_REGISTRY[target]

    logger.warning(f"[Registry] Unknown TTS provider '{target}'. Falling back to 'none'.")
    return _TTS_REGISTRY.get("none", NoneTTSAdapter())


def get_image_provider(name: Optional[str] = None) -> BaseImageProvider:
    """Resolves Image provider by name, falling back to config setting or gemini_imagen."""
    if not _IMAGE_REGISTRY:
        _init_default_registries()

    target = (name or getattr(config, "IMAGE_PROVIDER", "gemini_imagen")).lower()
    
    # Handle aliases
    if target in ["opencode", "nano_banana_pro", "gemini_3_pro_image", "imagen", "imagen_3"]:
        target = "gemini_imagen"

    if target in _IMAGE_REGISTRY:
        return _IMAGE_REGISTRY[target]

    logger.warning(f"[Registry] Unknown Image provider '{target}'. Falling back to 'gemini_imagen'.")
    return _IMAGE_REGISTRY.get("gemini_imagen", GeminiImagenAdapter())


def get_video_provider(name: Optional[str] = None) -> BaseVideoProvider:
    """Resolves Video provider by name, falling back to config setting, google_veo, or router."""
    if not _VIDEO_REGISTRY:
        _init_default_registries()

    target = (name or getattr(config, "VIDEO_PROVIDER", "google_veo")).lower()

    if target in ["opencode", "veo", "veo_fast", "veo_3_1", "veo3"]:
        target = "google_veo"

    if target in _VIDEO_REGISTRY:
        return _VIDEO_REGISTRY[target]

    logger.warning(f"[Registry] Unknown Video provider '{target}'. Falling back to 'google_veo'.")
    return _VIDEO_REGISTRY.get("google_veo", GoogleVeoAdapter())


def get_lipsync_provider(name: Optional[str] = None) -> BaseLipSyncProvider:
    """Resolves LipSync provider by name, falling back to config setting or passthrough."""
    if not _LIPSYNC_REGISTRY:
        _init_default_registries()

    target = (name or getattr(config, "LIPSYNC_PROVIDER", "passthrough")).lower()

    if target in ["none", "disabled", "off", "passthrough"]:
        return _LIPSYNC_REGISTRY.get("passthrough", PassthroughLipSyncAdapter())

    if target in _LIPSYNC_REGISTRY:
        return _LIPSYNC_REGISTRY[target]

    logger.warning(f"[Registry] Unknown LipSync provider '{target}'. Falling back to 'passthrough'.")
    return _LIPSYNC_REGISTRY.get("passthrough", PassthroughLipSyncAdapter())


# Initialize registries on module load
_init_default_registries()

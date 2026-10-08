"""
Media Provider Abstraction Layer for AI Video Story Pipeline.
Provides unified interfaces, factory registry, and adapters for TTS, Image, Video, and LipSync engines.
"""

from services.media.base import (
    ImageGenRequest,
    ImageGenResult,
    VideoGenRequest,
    VideoGenResult,
    TTSRequest,
    TTSResult,
    LipSyncRequest,
    LipSyncResult,
    BaseImageProvider,
    BaseVideoProvider,
    BaseTTSProvider,
    BaseLipSyncProvider,
)
from services.media.registry import (
    get_tts_provider,
    get_image_provider,
    get_video_provider,
    get_lipsync_provider,
    register_tts_provider,
    register_image_provider,
    register_video_provider,
    register_lipsync_provider,
)

__all__ = [
    "ImageGenRequest",
    "ImageGenResult",
    "VideoGenRequest",
    "VideoGenResult",
    "TTSRequest",
    "TTSResult",
    "LipSyncRequest",
    "LipSyncResult",
    "BaseImageProvider",
    "BaseVideoProvider",
    "BaseTTSProvider",
    "BaseLipSyncProvider",
    "get_tts_provider",
    "get_image_provider",
    "get_video_provider",
    "get_lipsync_provider",
    "register_tts_provider",
    "register_image_provider",
    "register_video_provider",
    "register_lipsync_provider",
]

"""
TTS Providers Package.
"""

from services.media.tts.edge_tts_adapter import EdgeTTSAdapter
from services.media.tts.elevenlabs_adapter import ElevenLabsFlashAdapter
from services.media.tts.gtts_adapter import GTTSAdapter, AmbientAudioAdapter
from services.media.tts.none_adapter import NoneTTSAdapter

__all__ = [
    "EdgeTTSAdapter",
    "ElevenLabsFlashAdapter",
    "GTTSAdapter",
    "AmbientAudioAdapter",
    "NoneTTSAdapter",
]

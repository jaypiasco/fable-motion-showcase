"""
None / Disabled TTS Adapter.
Used when voiceover is disabled (e.g. relying on Veo 3 native audio or video-only).
"""

from pathlib import Path
from services.media.base import BaseTTSProvider, TTSRequest, TTSResult


class NoneTTSAdapter(BaseTTSProvider):
    """No-op TTS provider that skips speech generation."""

    @property
    def name(self) -> str:
        return "none"

    def generate(self, req: TTSRequest) -> TTSResult:
        return TTSResult(
            audio_path=req.output_path,
            duration_seconds=float((req.extra_params or {}).get("duration", 0.0)),
            words=[],
            provider=self.name,
            metadata={"status": "disabled", "message": "Voiceover is disabled in configuration"}
        )

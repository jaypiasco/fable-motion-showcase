"""
gTTS and FFmpeg Ambient TTS Fallback Adapters.
"""

import subprocess
from pathlib import Path
from gtts import gTTS

from core.logger import logger
from config import config
from services.media.base import BaseTTSProvider, TTSRequest, TTSResult


class GTTSAdapter(BaseTTSProvider):
    """Google Translate TTS (Free, lightweight fallback)."""

    @property
    def name(self) -> str:
        return "gtts"

    def generate(self, req: TTSRequest) -> TTSResult:
        req.output_path.parent.mkdir(parents=True, exist_ok=True)
        logger.info(f"[gTTS] Generating audio -> {req.output_path.name}")
        tts = gTTS(text=req.text, lang='en', slow=False)
        tts.save(str(req.output_path))
        return TTSResult(
            audio_path=req.output_path,
            duration_seconds=0.0,
            words=[],
            provider=self.name,
            metadata={"lang": "en"}
        )


class AmbientAudioAdapter(BaseTTSProvider):
    """Generates a clean ambient sine wave audio track using FFmpeg."""

    @property
    def name(self) -> str:
        return "ambient"

    def generate(self, req: TTSRequest) -> TTSResult:
        req.output_path.parent.mkdir(parents=True, exist_ok=True)
        duration = req.extra_params.get("duration", 15)
        logger.info(f"[Ambient] Generating {duration}s ambient background track -> {req.output_path.name}")

        cmd = [
            config.FFMPEG_PATH, "-y",
            "-f", "lavfi",
            "-i", f"sine=frequency=220:duration={duration}",
            "-af", "volume=0.05, lowpass=f=300",
            "-c:a", "libmp3lame",
            "-b:a", config.AUDIO_BITRATE,
            str(req.output_path)
        ]
        try:
            subprocess.run(cmd, capture_output=True, check=True)
        except Exception as e:
            logger.error(f"FFmpeg ambient audio generation failed: {e}")

        return TTSResult(
            audio_path=req.output_path,
            duration_seconds=float(duration),
            words=[],
            provider=self.name,
            metadata={"duration": duration}
        )

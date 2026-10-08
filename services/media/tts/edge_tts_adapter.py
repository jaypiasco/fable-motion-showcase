"""
Edge-TTS Adapter (Microsoft Neural Voices).
Free, zero-key, ultra-fast neural speech synthesis with word-level boundary timestamps.
"""

import asyncio
from pathlib import Path
from typing import List, Optional

import edge_tts
from core.logger import logger
from config import config
from services.media.base import BaseTTSProvider, TTSRequest, TTSResult, WordTimestamp


class EdgeTTSAdapter(BaseTTSProvider):
    """
    Microsoft Edge Neural TTS Provider.
    Ultra-low latency, natural prosody, free for development and testing.
    """

    DEFAULT_VOICE = "en-US-ChristopherNeural"

    # Common high quality voices:
    # Male: en-US-ChristopherNeural, en-US-GuyNeural, en-GB-RyanNeural
    # Female: en-US-JennyNeural, en-US-AriaNeural, en-GB-SoniaNeural

    @property
    def name(self) -> str:
        return "edge_tts"

    def generate(self, req: TTSRequest) -> TTSResult:
        """Synchronous wrapper around async edge-tts generation."""
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                return pool.submit(lambda: asyncio.run(self._generate_async(req))).result()
        else:
            return asyncio.run(self._generate_async(req))

    async def _generate_async(self, req: TTSRequest) -> TTSResult:
        voice = req.voice_id or getattr(config, "EDGE_TTS_VOICE", self.DEFAULT_VOICE)
        rate = req.rate or getattr(config, "EDGE_TTS_RATE", "+0%")
        pitch = req.pitch or getattr(config, "EDGE_TTS_PITCH", "+0Hz")

        req.output_path.parent.mkdir(parents=True, exist_ok=True)
        logger.info(f"[EdgeTTS] Generating speech with voice '{voice}' -> {req.output_path.name}")

        communicate = edge_tts.Communicate(text=req.text, voice=voice, rate=rate, pitch=pitch)
        
        words: List[WordTimestamp] = []
        with open(req.output_path, "wb") as f:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    f.write(chunk["data"])
                elif chunk["type"] in ["WordBoundary", "SentenceBoundary"]:
                    start_sec = chunk["offset"] / 10_000_000.0
                    dur_sec = chunk["duration"] / 10_000_000.0
                    words.append(WordTimestamp(
                        word=chunk["text"],
                        start_sec=round(start_sec, 3),
                        end_sec=round(start_sec + dur_sec, 3)
                    ))

        duration_seconds = words[-1].end_sec if words else 0.0
        
        return TTSResult(
            audio_path=req.output_path,
            duration_seconds=duration_seconds,
            words=words,
            provider=self.name,
            metadata={"voice": voice, "rate": rate, "pitch": pitch, "word_count": len(words)}
        )

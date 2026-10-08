"""
ElevenLabs Flash / Turbo TTS Adapter.
Production-grade emotional voiceover generation with character & word-level timing data.
"""

import os
import json
import base64
import requests
from pathlib import Path
from typing import List, Optional

from core.logger import logger
from core.retry import retry_with_backoff
from config import config
from services.media.base import BaseTTSProvider, TTSRequest, TTSResult, WordTimestamp


class ElevenLabsFlashAdapter(BaseTTSProvider):
    """
    ElevenLabs Voice Generation Provider.
    Targeted for production drama rendering with low latency (Flash v2.5 / Turbo v2.5).
    """

    BASE_URL = "https://api.elevenlabs.io/v1"

    @property
    def name(self) -> str:
        return "elevenlabs"

    @retry_with_backoff(max_retries=3, initial_delay=2.0)
    def generate(self, req: TTSRequest) -> TTSResult:
        api_key = req.extra_params.get("api_key") or getattr(config, "ELEVENLABS_API_KEY", None) or os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            raise ValueError(
                "ElevenLabs API Key is missing. Set ELEVENLABS_API_KEY in .env or switch TTS_PROVIDER to 'edge_tts'."
            )

        voice_id = req.voice_id
        if not voice_id or "Neural" in voice_id or "-" in voice_id:
            voice_id = getattr(config, "ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
        model_id = req.model or getattr(config, "ELEVENLABS_MODEL_ID", "eleven_flash_v2_5")

        req.output_path.parent.mkdir(parents=True, exist_ok=True)
        logger.info(f"[ElevenLabs] Generating speech (model={model_id}, voice={voice_id}) -> {req.output_path.name}")

        # Use /v1/text-to-speech/{voice_id}/with-timestamps endpoint for word timing
        url = f"{self.BASE_URL}/text-to-speech/{voice_id}/with-timestamps"
        headers = {
            "xi-api-key": api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "text": req.text,
            "model_id": model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.8,
                "style": 0.2,
                "use_speaker_boost": True
            }
        }

        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=60)
            if resp.status_code == 200:
                data = resp.json()
                audio_bytes = base64.b64decode(data.get("audio_base64", ""))
                with open(req.output_path, "wb") as f:
                    f.write(audio_bytes)

                # Parse alignment
                alignment = data.get("alignment", {})
                chars = alignment.get("characters", [])
                start_times = alignment.get("character_start_times_seconds", [])
                end_times = alignment.get("character_end_times_seconds", [])

                words = self._reconstruct_words_from_chars(chars, start_times, end_times)
                duration = end_times[-1] if end_times else 0.0

                return TTSResult(
                    audio_path=req.output_path,
                    duration_seconds=duration,
                    words=words,
                    provider=self.name,
                    metadata={"voice_id": voice_id, "model_id": model_id}
                )
            else:
                # Fallback to standard stream endpoint if with-timestamps is unavailable on tier
                logger.warning(f"[ElevenLabs] with-timestamps returned {resp.status_code}, falling back to standard audio stream...")
                stream_url = f"{self.BASE_URL}/text-to-speech/{voice_id}"
                stream_resp = requests.post(stream_url, json=payload, headers=headers, timeout=60)
                stream_resp.raise_for_status()

                with open(req.output_path, "wb") as f:
                    f.write(stream_resp.content)

                return TTSResult(
                    audio_path=req.output_path,
                    duration_seconds=0.0,
                    words=[],
                    provider=self.name,
                    metadata={"voice_id": voice_id, "model_id": model_id}
                )
        except Exception as e:
            logger.error(f"[ElevenLabs] TTS Generation failed: {e}")
            raise

    def _reconstruct_words_from_chars(
        self,
        characters: List[str],
        start_times: List[float],
        end_times: List[float]
    ) -> List[WordTimestamp]:
        """Groups character alignment into word timestamps."""
        words: List[WordTimestamp] = []
        cur_word = []
        word_start = None

        for idx, char in enumerate(characters):
            s_time = start_times[idx] if idx < len(start_times) else 0.0
            e_time = end_times[idx] if idx < len(end_times) else 0.0

            if char.isspace():
                if cur_word and word_start is not None:
                    words.append(WordTimestamp(
                        word="".join(cur_word),
                        start_sec=round(word_start, 3),
                        end_sec=round(end_times[idx - 1], 3)
                    ))
                    cur_word = []
                    word_start = None
            else:
                if word_start is None:
                    word_start = s_time
                cur_word.append(char)

        if cur_word and word_start is not None:
            words.append(WordTimestamp(
                word="".join(cur_word),
                start_sec=round(word_start, 3),
                end_sec=round(end_times[-1], 3)
            ))

        return words

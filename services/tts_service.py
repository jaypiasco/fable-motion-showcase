"""
Voiceover & TTS Service for AI Video Story Pipeline.
Generates narration / dialogue audio tracks for each scene and combines them into voiceover.mp3
using the pluggable TTS Provider Registry (Edge-TTS, ElevenLabs Flash, gTTS, Ambient).
"""

from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from core.logger import logger
from config import config
from services.media.base import TTSRequest, TTSResult
from services.media.registry import get_tts_provider


class TTSService:
    """Service to generate multi-character speech narration and per-scene dialogue audio."""

    DEFAULT_VOICE_MAP = {
        "obsidian": "en-US-ChristopherNeural",
        "aurelius": "en-GB-RyanNeural",
        "sapphire": "en-US-JennyNeural",
        "julian": "en-GB-RyanNeural",
        "diamond": "en-US-AriaNeural",
        "emerald": "en-US-GuyNeural",
        "ruby": "en-US-AnaNeural"
    }

    def __init__(self, provider_name: Optional[str] = None):
        self.provider_name = provider_name or getattr(config, "TTS_PROVIDER", "edge_tts")

    def generate_voiceover(
        self,
        text: str,
        output_path: Path,
        voice_id: Optional[str] = None,
        provider_name: Optional[str] = None
    ) -> TTSResult:
        """Generates voiceover speech audio directly from text."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        provider = get_tts_provider(provider_name or self.provider_name)
        if not getattr(config, "ENABLE_VOICEOVER", False) or provider.name == "none":
            logger.info("[TTS] Voiceover disabled in config. Skipping voiceover generation.")
            return TTSResult(
                audio_path=output_path,
                duration_seconds=0.0,
                words=[],
                provider="none",
                metadata={"status": "disabled"}
            )
        voice = voice_id or getattr(config, "EDGE_TTS_VOICE", "en-US-ChristopherNeural")
        req = TTSRequest(text=text, output_path=output_path, voice_id=voice)
        return provider.generate(req)


    def resolve_voice_for_speaker(
        self,
        speaker_name: str,
        characters_bible: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """Determines the most appropriate neural TTS voice for a speaking character."""
        name_clean = speaker_name.lower().strip()
        
        # 1. Check if defined in character bible
        if characters_bible:
            for char in characters_bible:
                c_name = char.get("name", "").lower().strip()
                if c_name and (c_name in name_clean or name_clean in c_name):
                    if char.get("voice_persona"):
                        return char["voice_persona"]
                    gender = char.get("gender", "").lower()
                    archetype = char.get("archetype", "").lower()
                    if "female" in gender or "heiress" in archetype or "maid" in archetype:
                        return "en-US-JennyNeural"
                    elif "british" in archetype or "oligarch" in archetype:
                        return "en-GB-RyanNeural"
                    else:
                        return "en-US-ChristopherNeural"

        # 2. Check predefined name map
        for key, voice in self.DEFAULT_VOICE_MAP.items():
            if key in name_clean:
                return voice

        # 3. Default fallback based on common feminine names/keywords
        if any(w in name_clean for w in ["lady", "mrs", "miss", "woman", "heiress", "rose", "elena", "victoria"]):
            return "en-US-JennyNeural"
        
        return getattr(config, "EDGE_TTS_VOICE", "en-US-ChristopherNeural")

    def extract_scene_dialogue_info(self, scene: Dict[str, Any]) -> Tuple[str, str]:
        """
        Extracts (speaker_name, dialogue_text) from a scene dict.
        Returns ("", "") if no spoken content.
        """
        dialogue = scene.get("dialogue")
        if isinstance(dialogue, list):
            for d in dialogue:
                if isinstance(d, dict) and d.get("exact_speech"):
                    speaker = d.get("speaker") or (scene.get("characters", [""])[0] if scene.get("characters") else "")
                    return speaker, d.get("exact_speech").strip()
                elif isinstance(d, str) and d.strip():
                    speaker = scene.get("characters", [""])[0] if scene.get("characters") else ""
                    return speaker, d.strip()
        elif isinstance(dialogue, str) and dialogue.strip():
            # Format often like "OBSIDIAN: (Furious) You think..."
            raw = dialogue.strip()
            if ":" in raw:
                spk, speech = raw.split(":", 1)
                # strip emotional direction in parens
                import re
                speech_clean = re.sub(r"\(.*?\)", "", speech).strip()
                return spk.strip(), speech_clean or speech.strip()
            speaker = scene.get("characters", [""])[0] if scene.get("characters") else ""
            return speaker, raw

        narration = scene.get("narration", "").strip()
        if narration:
            return "Narrator", narration

        return "", ""

    def _extract_scene_text(self, scene: Dict[str, Any]) -> str:
        """Extracts plain dialogue text from a scene dict."""
        _, text = self.extract_scene_dialogue_info(scene)
        return text

    def generate_scene_audio(
        self,
        scene: Dict[str, Any],
        output_path: Path,
        characters_bible: Optional[List[Dict[str, Any]]] = None,
        provider_name: Optional[str] = None
    ) -> TTSResult:
        """Generates isolated dialogue audio for a single scene with specific character voice."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        provider = get_tts_provider(provider_name or self.provider_name)
        if not getattr(config, "ENABLE_VOICEOVER", False) or provider.name == "none":
            return TTSResult(
                audio_path=output_path,
                duration_seconds=float(scene.get("duration_seconds", 5)),
                words=[],
                provider="none",
                metadata={"status": "disabled"}
            )
        speaker, text = self.extract_scene_dialogue_info(scene)
        voice_id = self.resolve_voice_for_speaker(speaker, characters_bible)

        if not text:
            duration = scene.get("duration_seconds", 5)
            ambient_provider = get_tts_provider("ambient")
            return ambient_provider.generate(TTSRequest(
                text="",
                output_path=output_path,
                extra_params={"duration": duration}
            ))

        logger.info(f"[{provider.name.upper()}] Synthesizing Scene Audio ({speaker} -> {voice_id}): '{text[:40]}...'")
        req = TTSRequest(
            text=text,
            output_path=output_path,
            voice_id=voice_id
        )
        return provider.generate(req)

    def generate_narration(
        self,
        scenes: List[Dict[str, Any]],
        output_path: Path,
        characters_bible: Optional[List[Dict[str, Any]]] = None,
        provider_name: Optional[str] = None
    ) -> TTSResult:
        """
        Generates expressive multi-character narration/dialogue audio from the list of scenes.
        Uses EdgeTTS (free/dev), ElevenLabs Flash (prod), or configured provider.
        """
        output_path.parent.mkdir(parents=True, exist_ok=True)
        provider = get_tts_provider(provider_name or self.provider_name)
        if not getattr(config, "ENABLE_VOICEOVER", False) or provider.name == "none":
            logger.info("[TTS] Voiceover disabled in config. Skipping narration generation.")
            return TTSResult(
                audio_path=output_path,
                duration_seconds=0.0,
                words=[],
                provider="none",
                metadata={"status": "disabled"}
            )
        spoken_items = [self.extract_scene_dialogue_info(s) for s in scenes if self.extract_scene_dialogue_info(s)[1]]

        if not spoken_items:
            logger.info("No spoken text provided in scenes. Generating subtle ambient background audio...")
            total_duration = sum(s.get("duration_seconds", 5) for s in scenes)
            ambient_provider = get_tts_provider("ambient")
            return ambient_provider.generate(TTSRequest(
                text="",
                output_path=output_path,
                extra_params={"duration": total_duration}
            ))

        # Build combined text with natural pauses
        full_narration = " ... ".join([text for _, text in spoken_items])
        first_speaker = spoken_items[0][0] if spoken_items else ""
        lead_voice = self.resolve_voice_for_speaker(first_speaker, characters_bible)

        logger.info(f"[{provider.name.upper()}] Generating audio track ({len(spoken_items)} scene lines) -> {output_path.name}")

        try:
            req = TTSRequest(
                text=full_narration,
                output_path=output_path,
                voice_id=lead_voice
            )
            result = provider.generate(req)
            return result
        except Exception as e:
            logger.warning(f"[{provider.name}] Generation failed ({e}). Falling back to Edge-TTS / gTTS...")
            if provider.name != "edge_tts":
                try:
                    fallback_provider = get_tts_provider("edge_tts")
                    return fallback_provider.generate(TTSRequest(text=full_narration, output_path=output_path, voice_id=lead_voice))
                except Exception as fb_err:
                    logger.warning(f"[EdgeTTS Fallback] Failed ({fb_err}). Trying gTTS...")

            fallback_provider = get_tts_provider("gTTS")
            return fallback_provider.generate(TTSRequest(text=full_narration, output_path=output_path))


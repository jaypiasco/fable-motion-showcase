"""
Volatile Character Style DNA Configuration.
Defines runtime creative & visual aesthetic parameters for the Viral Anthropomorphic 3D Produce & Fruit Drama Engine.
"""

from typing import Dict, Any
import copy
from prompts.presets import (
    ANTHROPOMORPHIC_PRODUCE_PRESET,
    FACETED_CRYSTAL_PRESET,
    AVAILABLE_PRESETS,
    get_preset,
    list_presets,
    register_preset,
)


# Active default character style DNA: Anthropomorphic 3D Produce & Fruit Drama Engine (Pixar Style)
DEFAULT_CHARACTER_STYLE_DNA: Dict[str, Any] = copy.deepcopy(ANTHROPOMORPHIC_PRODUCE_PRESET)

MASTER_PIPELINE_INSTRUCTION: str = """
Multimodal AI Video Pipeline - 5-Phase End-to-End Orchestration Architecture:

1. Global Preparation:
   - Phase 1 (Script & Dialogue Generation): Synthesizes a structured 10 to 14 scene vertical (9:16) screenplay with high-retention opening hooks, dramatic escalation, narration voiceover, concise character dialogue lines, camera dynamics, and Foley sound cues.
   - Phase 2 (Character Consistency Bibles): Formulates immutable character profile sheets and visual style anchors. Renders high-fidelity 9:16 character reference portraits saved to persistent asset storage (/assets/characters) for downstream visual continuity.

2. Iterative Per-Scene Synthesis Loop (Scene 1 through Scene N):
   - Phase 3 (Keyframe Synthesis): Generates scene keyframe stills conditioned directly on Phase 2 character portraits to preserve visual identity across disparate scenes.
   - Phase 4 (Motion Dynamics & Video Synthesis): Synthesizes 9:16 cinematic video clips conditioned on Phase 3 keyframes, incorporating native camera physics, actor actions, and synchronized dialogue.
   - Phase 5a (Dynamic Karaoke Captioning): Transcribes dialogue using Faster-Whisper, aligns word-level millisecond timestamps, and burns SubStation Alpha (.ass) dynamic subtitles per scene.

3. Master Delivery Assembly:
   - Phase 5b (Stream Concatenation & SEO Package): Concatenates all rendered scene clips with FFmpeg stream validation, exports the final master story video deliverable, and generates multi-platform SEO metadata.
""".strip()

# Active runtime character style DNA (volatile)
_ACTIVE_CHARACTER_STYLE_DNA = copy.deepcopy(DEFAULT_CHARACTER_STYLE_DNA)


def get_character_style_dna() -> Dict[str, Any]:
    """Returns the current active Character Style DNA."""
    return _ACTIVE_CHARACTER_STYLE_DNA


def set_character_style_dna(custom_dna: Dict[str, Any]):
    """
    Updates or overrides the active Character Style DNA.
    Allows changing character styles, materials, wardrobe, or aesthetics dynamically.
    """
    global _ACTIVE_CHARACTER_STYLE_DNA
    _ACTIVE_CHARACTER_STYLE_DNA.update(custom_dna)


def load_preset(preset_id: str) -> Dict[str, Any]:
    """
    Loads a preset by ID and sets it as the active runtime Character Style DNA.
    Available IDs: 'anthropomorphic_produce', 'banana_husband', 'faceted_crystal'.
    """
    global _ACTIVE_CHARACTER_STYLE_DNA
    preset = get_preset(preset_id)
    _ACTIVE_CHARACTER_STYLE_DNA = copy.deepcopy(preset)
    return _ACTIVE_CHARACTER_STYLE_DNA


def reset_character_style_dna():
    """Resets the Character Style DNA back to the default Anthropomorphic 3D Produce & Fruit Drama Engine."""
    global _ACTIVE_CHARACTER_STYLE_DNA
    _ACTIVE_CHARACTER_STYLE_DNA = copy.deepcopy(DEFAULT_CHARACTER_STYLE_DNA)

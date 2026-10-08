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
Viral Anthropomorphic 3D Produce & Fruit Drama Engine (Pixar Style) - 5-Phase Clip-by-Clip Iterative Orchestration Architecture:

1. Global Preparation:
   - Phase 1 (Script & Dialogue Generation): Generates a complete 10 to 14 scene vertical (9:16) script (Scene 1 through Scene N, where N is dynamically chosen between 10 to 14 scenes based on narrative pacing), with a shocking 3-second hook, intense soap-opera conflict, voiceover, character dialogue scripts, camera movements, and audio cues. Characters are full-body anthropomorphic produce beings across diverse fruit and vegetable varieties (e.g. Banana, Red Onion, Savoy Cabbage, Strawberry, Carrot, Lemon, Eggplant, Tomato, Garlic) designed with realistic adult human body proportions (strict 1:7.5 to 1:8 head-to-body ratio, tall statuesque frame, elongated tailored legs, broad shoulders, human head scale, no bobblehead or cartoon chibi distortions), realistic organic skin/peel/leaf textures, and carved facial features. CRITICAL: Every character MUST be given an authentic human name (e.g. 'Arthur Bananier', 'Elena Vance', 'Julian Corvus', 'Marcus Sterling', 'Beatrice Chen'). NEVER name characters simply 'Banana', 'Onion', 'Cabbage', or after materials/gemstones (e.g., 'Obsidian', 'Sapphire').
   - Phase 2 (Character Consistency & Asset Storage): Synthesizes character profile bibles and visual style anchors for all characters across all scenes/clips (Scene 1 to Scene N). Characters are rendered centered on a clean white background in ultra-detailed Pixar-style 3D with glossy materials, realistic fruit/vegetable textures, tailored modern wardrobe (e.g. bespoke suits, blazers, evening gowns, tailored trousers), adult human body proportions (1:8 head-to-body ratio, no bobbleheads), and authentic human names. Renders high-resolution character reference portraits upon approval using Google Imagen 3, and stores the image assets in /assets/characters.

2. Per-Clip Iterative Generation Cycle (Scene 1 through Scene N):
   The pipeline executes an iterative per-clip synthesis loop where each scene clip is generated, animated, and captioned before proceeding:
   - First Iteration (Scene 1):
     * Phase 3 (Keyframe Generation): Uses the Phase 1 script for Scene 1 and character(s) mentioned in Scene 1 (referencing Phase 2 character portraits stored in /assets/characters) to create the Scene 1 keyframe still in 9:16 vertical Pixar-style 3D strictly using Google Imagen 3 (no third-party fallbacks).
     * Phase 4 (Video Clip Generation): Waits for Phase 3's keyframe still for Scene 1, combines it with Scene 1's motion dynamics, character dialogue script (Character says: "..."), and acoustic profile, and generates the Scene 1 video clip via Google Veo 3.1 Fast.
     * Phase 5 (Per-Clip Captioning): Applies dynamic word-level karaoke captions to Scene 1's generated video clip.
   - Second Iteration (Scene 2):
     * Phase 3 (Keyframe Generation): Uses the Phase 1 script for Scene 2 and character(s) mentioned in Scene 2 (referencing Phase 2 character portraits stored in /assets/characters) to create the Scene 2 keyframe still using Google Imagen 3.
     * Phase 4 (Video Clip Generation): Waits for Phase 3's keyframe still for Scene 2, combines it with Scene 2's motion dynamics, character dialogue script, and acoustic profile, and generates the Scene 2 video clip via Google Veo 3.1 Fast.
     * Phase 5 (Per-Clip Captioning): Applies dynamic word-level karaoke captions to Scene 2's generated video clip.
   - ... Subsequent Iterations (Scene 3 to Scene N-1):
     * Iteratively executes Phase 3 (Google Imagen 3 keyframe still) -> Phase 4 (Waits for Phase 3 keyframe -> Google Veo 3.1 Fast video clip render) -> Phase 5 (Applies caption to scene video clip).
   - Final Iteration (Scene N, 10 to 14 scenes):
     * Phase 3 (Keyframe Generation): Uses the Phase 1 script for Scene N and character(s) mentioned in Scene N (referencing Phase 2 character portraits in /assets/characters) to create the Scene N keyframe still via Google Imagen 3.
     * Phase 4 (Video Clip Generation): Waits for Phase 3's Scene N keyframe still and generates the Scene N video clip via Google Veo 3.1 Fast.
     * Phase 5 (Per-Clip Captioning & Final Merge Assembly): Applies dynamic word-level karaoke captions to Scene N's generated video clip, AND merges/concatenates all the captioned clips together into the final compiled master story video, producing the multi-platform SEO package and viral thumbnail prompt.
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

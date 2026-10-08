"""
Core Content Sanitizer.
Enforces showrunner creative guidelines across all pipeline phases:
1. Strips over-fictional and supernatural effects (glowing eyes, golden eye flares, laser pupils, magical auras)
   to ensure eye consistency with Phase 2 character portraits.
2. Removes deity/religious tropes ("god", "true god", "godlike") from dialogue, voiceovers, and prompts,
   replacing them with grounded dramatic words ("champion", "master", "powerhouse", "titan").
"""

import re
from typing import Dict, Any, List, Union

# Prohibited supernatural visual patterns (eyes flaring, glowing light, energy auras)
SUPERNATURAL_EYE_PATTERNS = [
    (re.compile(r"his\s+eyes\s+flare\s+with\s+supernatural\s+(?:golden|fiery|blue)?\s*light\.?", re.IGNORECASE), "His eyes lock forward with intense steely determination."),
    (re.compile(r"her\s+eyes\s+flare\s+with\s+supernatural\s+(?:golden|fiery|blue)?\s*light\.?", re.IGNORECASE), "Her eyes lock forward with intense steely determination."),
    (re.compile(r"eyes\s+flare\s+with\s+supernatural\s+(?:golden|fiery|blue)?\s*light\.?", re.IGNORECASE), "eyes focused with intense steely determination."),
    (re.compile(r"eyes\s+flare\s+with\s+(?:golden|fiery|yellow|blue)\s+light\.?", re.IGNORECASE), "eyes focused with fierce grounded determination."),
    (re.compile(r"eyes\s+glow(?:ing)?\s+with\s+(?:supernatural\s+)?(?:golden|fiery|blue)?\s*light\.?", re.IGNORECASE), "eyes showing intense expressive focus."),
    (re.compile(r"glowing\s+fiery\s+eye\s+flares", re.IGNORECASE), "dramatic muscle tension"),
    (re.compile(r"glowing\s+(?:golden|fiery|blue|red)?\s*eyes", re.IGNORECASE), "large glossy animated eyes"),
    (re.compile(r"supernatural\s+golden\s+light", re.IGNORECASE), "dramatic volumetric rim lighting"),
    (re.compile(r"supernatural\s+rage\s+awakening", re.IGNORECASE), "dramatic confrontation and power shift"),
    (re.compile(r"supernatural\s+(?:aura|energy|glow)", re.IGNORECASE), "dramatic presence"),
    (re.compile(r"volumetric\s+godrays?", re.IGNORECASE), "volumetric rim lighting"),
    (re.compile(r"laser\s+eyes", re.IGNORECASE), "piercing gaze"),
]

# Prohibited deity / god tropes in dialogue & voiceover
DEITY_DIALOGUE_PATTERNS = [
    (re.compile(r"\bhow\s+a\s+true\s+god\s+lifts\b", re.IGNORECASE), "how a true champion lifts"),
    (re.compile(r"\ba\s+true\s+god\b", re.IGNORECASE), "a true champion"),
    (re.compile(r"\btrue\s+god\b", re.IGNORECASE), "true champion"),
    (re.compile(r"\blike\s+a\s+god\b", re.IGNORECASE), "like a champion"),
    (re.compile(r"\bas\s+a\s+god\b", re.IGNORECASE), "as a champion"),
    (re.compile(r"\ba\s+god\b", re.IGNORECASE), "a champion"),
    (re.compile(r"\bgodlike\b", re.IGNORECASE), "unstoppable"),
    (re.compile(r"\bgods\b", re.IGNORECASE), "champions"),
    (re.compile(r"\bgod\b", re.IGNORECASE), "master"),
]


# Prohibited SFX / ambient audio keywords that cause Veo to generate distorted or monstrous audio
# These patterns strip forbidden audio instructions that produce bass-shifted, creature-like, or
# heavily pitch-modulated audio output instead of natural human speech.
SFX_AUDIO_PATTERNS = [
    # Bass drops / stingers / impact hits
    (re.compile(r'\bbass\s+drop\b', re.IGNORECASE), ''),
    (re.compile(r'\bstinger\b', re.IGNORECASE), ''),
    (re.compile(r'\bimpact\s+hit\b', re.IGNORECASE), ''),
    (re.compile(r'\bdrumroll\b', re.IGNORECASE), ''),
    (re.compile(r'\bfoley\b', re.IGNORECASE), ''),
    # Glass/object SFX
    (re.compile(r'\bshattering\s+glass\b', re.IGNORECASE), 'tension'),
    (re.compile(r'\bglass\s+shattering\b', re.IGNORECASE), 'tension'),
    # Explosive / rumble sounds
    (re.compile(r'\bdeep\s+rumble\b', re.IGNORECASE), ''),
    (re.compile(r'\bthunder\s+clap\b', re.IGNORECASE), ''),
    (re.compile(r'\bexplosion\s+SFX\b', re.IGNORECASE), ''),
    # Creature / monster pitch modulation directives
    (re.compile(r'\bcreature\s+roar\b', re.IGNORECASE), ''),
    (re.compile(r'\bmonster\s+voice\b', re.IGNORECASE), 'natural human voice'),
    (re.compile(r'\bpitch[\s-]+shifted\s+voice\b', re.IGNORECASE), 'natural human voice'),
    (re.compile(r'\bpitch[\s-]+modulated\s+voice\b', re.IGNORECASE), 'natural human voice'),
    (re.compile(r'\blow[\s-]+frequency\s+pitch\s+shift\b', re.IGNORECASE), ''),
    # Ambient SFX cues that bleed into dialogue
    (re.compile(r'\bBackground\s+sound\s+includes?[^.]*\.', re.IGNORECASE), ''),
    (re.compile(r'\bbackground\s+sound:\s*[^.]*\.', re.IGNORECASE), ''),
    (re.compile(r'\bsfx\s+cue:\s*[^.]*\.', re.IGNORECASE), ''),
]


def sanitize_visual_description(text: str) -> str:
    """Removes supernatural eye flares, glowing eyes, and fantasy aura effects to preserve eye consistency."""
    if not text or not isinstance(text, str):
        return text or ""
    result = text
    for pattern, replacement in SUPERNATURAL_EYE_PATTERNS:
        result = pattern.sub(replacement, result)
    return re.sub(r"\s+", " ", result).strip()


def sanitize_dialogue(text: str) -> str:
    """Removes 'god', 'true god', deity tropes, and forbidden SFX audio keywords from dialogue and voiceover lines."""
    if not text or not isinstance(text, str):
        return text or ""
    result = text
    for pattern, replacement in DEITY_DIALOGUE_PATTERNS:
        result = pattern.sub(replacement, result)
    for pattern, replacement in SFX_AUDIO_PATTERNS:
        result = pattern.sub(replacement, result)
    # Clean up any double spaces left by removals
    return re.sub(r"\s+", " ", result).strip()


def sanitize_scene_dict(scene: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitizes all text fields within a scene dictionary."""
    if not isinstance(scene, dict):
        return scene

    sc = dict(scene)
    if "visual_description" in sc and isinstance(sc["visual_description"], str):
        sc["visual_description"] = sanitize_visual_description(sc["visual_description"])
    if "visual_action" in sc and isinstance(sc["visual_action"], str):
        sc["visual_action"] = sanitize_visual_description(sc["visual_action"])
    if "video_prompt" in sc and isinstance(sc["video_prompt"], str):
        sc["video_prompt"] = sanitize_visual_description(sc["video_prompt"])

    if "voiceover" in sc and isinstance(sc["voiceover"], str):
        sc["voiceover"] = sanitize_dialogue(sc["voiceover"])

    if "dialogue" in sc:
        if isinstance(sc["dialogue"], str):
            sc["dialogue"] = sanitize_dialogue(sc["dialogue"])
        elif isinstance(sc["dialogue"], list):
            new_list = []
            for d in sc["dialogue"]:
                if isinstance(d, dict):
                    d_copy = dict(d)
                    for k in ["exact_speech", "direct_speech", "text"]:
                        if k in d_copy and isinstance(d_copy[k], str):
                            d_copy[k] = sanitize_dialogue(d_copy[k])
                    new_list.append(d_copy)
                elif isinstance(d, str):
                    new_list.append(sanitize_dialogue(d))
                else:
                    new_list.append(d)
            sc["dialogue"] = new_list

    return sc

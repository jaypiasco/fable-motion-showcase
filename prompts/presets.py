"""
Character Style Preset Registry & Storage.
Allows archiving, loading, and switching between creative style DNA presets.
"""

from typing import Dict, Any, List, Optional
import copy
import json
from pathlib import Path


# ==============================================================================
# ARCHIVED PRESET: FACETED-CRYSTAL 3D DRAMA ENGINE
# ==============================================================================
FACETED_CRYSTAL_PRESET: Dict[str, Any] = {
    "preset_id": "faceted_crystal",
    "name": "Viral Faceted-Crystal 3D Drama Engine",
    "engine_name": "VIRAL FACETED-CRYSTAL 3D DRAMA ENGINE",
    "target_platforms": "TikTok, YouTube Shorts, Instagram Reels (60–90 seconds)",
    "aspect_ratio": "9:16",
    
    # Core Aesthetic & Shader Rules
    "character_aesthetic": (
        "Stylized 3D faceted crystal/gemstone humanoid characters (e.g., Diamond, Polished Gold, "
        "Blue Sapphire, Iridescent Silver, Rose Quartz, Jet Obsidian). Translucent and reflective low-poly geometric skin shaders "
        "with internal refractive caustics, large glossy expressive eyes with natural reflections, contrasted against expressive, animated facial features."
    ),
    "wardrobe_contrast": (
        "Hyper-realistic, high-fashion, and detailed everyday textiles (e.g., oversized knit hoodies, "
        "boned lace corsets, bespoke tuxedos, silk lounge sets, sharp wool pinstripe suits) draped over geometric crystalline bodies."
    ),
    "environment": (
        "Cinematic, ultra-luxurious, realistic environments (e.g., marble-floored neoclassical mansions, "
        "customized Rolls-Royce interiors, opulent dressing rooms, neon-lit luxury boardrooms, penthouses)."
    ),
    "story_tropes": (
        "Extreme soap-opera melodrama, cheating scandals, secret parentage, unfair family treatment, "
        "class divides (maid vs. billionaire), forced physical restrictions, and sudden revenge glow-ups."
    ),
    "audio_and_dialogue": (
        "Audio: Natural, warm, grounded voice with realistic room acoustics and subtle breathing. "
        "Background sound includes soft ambient rain outside and a quiet room tone. No background music. (no subtitles). "
        "Character speech must use explicit quotation marks or syntax like Character says: \"...\". "
        "Vocal delivery & tone must include descriptors like conversational, warm, hushed tone, subtle pause, or grounded delivery. "
        "Always add ambient audio (quiet room tone, distant traffic, soft hum of an AC unit) for Veo single-pass video/audio generation. "
        "Keep speech short: 10 to 18 words, spoken naturally over 4 to 6 seconds within Veo's 8-second generation length."
    ),
    "studio_lighting": (
        "3-point studio lighting setup, high-contrast rim lighting, volumetric light rays, soft diffuse fill, "
        "specular highlights glistening across geometric crystal edges, deep cinematic shadows"
    ),
    "render_quality": (
        "cinematic volumetric lighting, 8k resolution, Unreal Engine 5 render style, hyper-detailed textures, Octane Render, ray tracing, photorealistic caustics"
    ),
    "mandatory_cta": "Visit fablemotion.ai and create your own ai short stories",
    "sample_materials": [
        "Faceted Blue Sapphire Crystal",
        "Polished 24K Gold Alloy",
        "Faceted Diamond Crystal",
        "Iridescent Silver Alloy",
        "Rose Quartz Crystal",
        "Faceted Jet Obsidian Crystal",
        "Emerald Gemstone"
    ],
    "audio_profile": (
        "Audio: Natural, warm, grounded voice with realistic room acoustics and subtle breathing. "
        "Background sound includes soft ambient rain outside and a quiet room tone. No background music. (no subtitles)"
    ),
    "character_naming_convention": (
        "MANDATORY: Every character MUST be given an authentic, realistic human first and last name (e.g. 'Julian Corvus', "
        "'Elena Vance', 'Marcus Sterling', 'Victoria Chen', 'Damian Cross', 'Seraphina Reed'). "
        "NEVER name characters after gemstones, minerals, or materials (e.g., NEVER use 'Obsidian', 'Sapphire', "
        "'Emerald', 'Ruby', 'Diamond', or 'Gold' as character names). The crystal material defines their visual shader, "
        "while their character name must always be a distinguished, realistic human name."
    ),
    "pipeline_iteration_architecture": (
        "Phase 1 generates the full 10-14 scene script with authentic human character names. Phase 2 generates character reference portraits stored in /assets for all clips. "
        "The engine then iterates per clip (Scene 1 to Scene 12): Phase 3 creates the scene keyframe using /assets character references -> "
        "Phase 4 waits for Phase 3 keyframe and renders the video clip with character dialogue -> Phase 5 applies dynamic captions to the clip. "
        "On the final scene (Scene N, 10 to 14 scenes), Phase 5 captions the final clip and merges all clips into the master story video."
    )
}


# ==============================================================================
# ACTIVE PRESET: ANTHROPOMORPHIC 3D PRODUCE & FRUIT DRAMA ENGINE (PIXAR STYLE)
# Supports full fruit & vegetable spectrum: Banana, Onion, Cabbage, Strawberry,
# Carrot, Lemon, Eggplant, Tomato, Garlic, Pepper, etc.
# ==============================================================================
ANTHROPOMORPHIC_PRODUCE_PRESET: Dict[str, Any] = {
    "preset_id": "anthropomorphic_produce",
    "name": "Viral Anthropomorphic 3D Produce & Fruit Drama Engine (Pixar Style)",
    "engine_name": "VIRAL ANTHROPOMORPHIC 3D PRODUCE & FRUIT DRAMA ENGINE",
    "target_platforms": "TikTok, YouTube Shorts, Instagram Reels (60–90 seconds)",
    "aspect_ratio": "9:16",
    
    # Core Aesthetic & Visual Anatomy Rules
    "character_aesthetic": (
        "Full-body anthropomorphic fruit and vegetable humanoid characters spanning all produce varieties "
        "(e.g., Banana Husband, Red Onion Matriarch, Savoy Cabbage Oligarch, Heirloom Strawberry Heiress, "
        "Carrot Tycoon, Meyer Lemon Executive, Eggplant Diplomat, Crisp Apple Judge). "
        "Anatomical Rule: Realistic adult human body proportions with a strict 1:7.5 to 1:8 head-to-body ratio. "
        "The character possesses a tall, statuesque adult build, broad structured shoulders, an elongated tailored torso, and long elegant legs. "
        "The fruit or vegetable head is naturally human head-sized relative to the body (NEVER oversized, ballooned, or bobblehead). "
        "The produce head transitions seamlessly into the shoulders with an integrated neck and collarbone structure, smoothly fitted into tailored high-fashion collars. "
        "Strictly avoid: bobblehead, giant head, chibi, funko pop, dwarfism, stubby legs, caricature proportions, childlike or cartoonish oversized head proportions. "
        "Facial Features: Naturally organic fruit/vegetable peel and texture (e.g. curved ripe banana peel with tiny brown speckles, "
        "glossy translucent purple onion skin with delicate papery veins, tightly curled Savoy cabbage leaf ridges, textured strawberry with seed pits, "
        "smooth citrus pores). The expressive face is carved directly into the produce skin/peel/leaves. "
        "Large glossy expressive eyes, defined sculpted eyebrows, a defined nose carved directly into the produce, "
        "and expressive, emotionally nuanced lips/mouth. No human skin is visible anywhere. "
        "The entire body, torso, limbs, stylized hands, and feet are smooth, stylized, and fully colored in the "
        "natural rich hue of that produce species (e.g. banana yellow, onion magenta-violet, cabbage leaf emerald-green, "
        "carrot vibrant orange). Premium animated proportions with an adult fashion-model silhouette, "
        "and a clean readable silhouette inspired by world-class 3D animated films (Pixar/Disney 3D feature animation)."
    ),
    "wardrobe_contrast": (
        "High-contrast realistic apparel: Hyper-realistic tailored garments (e.g. fitted navy-blue blazers over crisp white shirts "
        "with black ties, haute-couture evening gowns, silk scarves, wool trench coats, tailored pinstripe trousers, polished leather dress shoes, "
        "and fine jewelry such as silver wedding rings and diamond cufflinks) draped over smooth stylized fruit/vegetable bodies. "
        "Poised, dramatic postures with subtle body language reflecting high-status drama."
    ),
    "environment": (
        "Cinematic 3D environments: For character reference portraits, centered full-body composition on a pure clean background. "
        "For story scenes: cinematic luxury penthouses, modern minimalist architectural spaces, high-stakes corporate boardrooms, "
        "dramatic marble ballrooms, and upscale domestic living rooms."
    ),
    "story_tropes": (
        "Extreme soap-opera melodrama, cheating scandals, secret prenups, hidden parentage, corporate betrayal, "
        "high-society status clashes, unfair family treatment, sudden revenge glow-ups, and intense emotional confrontations "
        "played completely straight with profound emotional gravity by anthropomorphic produce characters."
    ),
    "audio_and_dialogue": (
        "Audio: Natural, warm, grounded voice with realistic room acoustics and subtle breathing. "
        "Background sound includes soft ambient rain outside and a quiet room tone. No background music. (no subtitles). "
        "Character speech must use explicit quotation marks or syntax like Character says: \"...\". "
        "Vocal delivery & tone must include descriptors like conversational, warm, hushed tone, subtle pause, or grounded delivery. "
        "Always add ambient audio (quiet room tone, distant traffic, soft hum of an AC unit) for Veo single-pass video/audio generation. "
        "Keep speech short: 10 to 18 words, spoken naturally over 4 to 6 seconds within Veo's 8-second generation length."
    ),
    "studio_lighting": (
        "Cinematic 3-point studio lighting, high-contrast soft rim lighting, volumetric fill, "
        "glossy materials, realistic organic texture sheen across fruit/vegetable peels and leaf layers, deep soft cinematic shadows"
    ),
    "render_quality": (
        "Ultra-detailed Pixar-style 3D rendering, glossy organic materials, cinematic lighting, ultra-high quality, "
        "8k resolution, Unreal Engine 5 render style, Octane Render, clean readable silhouette, ray tracing"
    ),
    "mandatory_cta": "Visit fablemotion.ai and create your own ai short stories",
    "sample_species": [
        {"species": "Ripe Banana", "color": "Rich Yellow with Tiny Brown Speckles", "archetype": "Banana Husband / Tech Executive"},
        {"species": "Red Onion", "color": "Glossy Deep Magenta-Violet with Papery Layering", "archetype": "Ruthless Onion Matriarch"},
        {"species": "Savoy Cabbage", "color": "Textured Emerald and Pale Green Ribbed Leaves", "archetype": "Old-Money Cabbage Oligarch"},
        {"species": "Ripe Strawberry", "color": "Vibrant Glossy Crimson with Gold Seed Pits", "archetype": "Betrayed Heiress"},
        {"species": "Crisp Carrot", "color": "Textured Deep Orange with Feathered Green Boutonniere", "archetype": "Ambitious Lawyer / Detective"},
        {"species": "Meyer Lemon", "color": "Sunlit Textured Yellow with Pitted Zest", "archetype": "Acid-Tongued Media Mogul"},
        {"species": "Royal Eggplant", "color": "Lustrous Deep Indigo-Purple with Velvet Sheen", "archetype": "Foreign Diplomat"}
    ],
    "audio_profile": (
        "Audio: Natural, warm, grounded voice with realistic room acoustics and subtle breathing. "
        "Background sound includes soft ambient rain outside and a quiet room tone. No background music. (no subtitles)"
    ),
    "character_naming_convention": (
        "MANDATORY: Every character MUST be given an authentic, realistic human first and last name "
        "(e.g. 'Arthur Bananier', 'Julian Corvus', 'Elena Vance', 'Marcus Sterling', 'Victoria Chen', 'Damian Cross'). "
        "Characters possess anthropomorphic produce physiology (banana, onion, cabbage, strawberry, etc.) "
        "but carry authentic human names. NEVER name characters simply 'Banana', 'Onion', 'Cabbage', or gemstone names."
    ),
    "pipeline_iteration_architecture": (
        "Phase 1 generates the full 10-14 scene script with authentic human character names and produce melodrama. "
        "Phase 2 generates character reference portraits (Pixar-style 3D anthropomorphic produce portraits on clean white backgrounds) stored in /assets for all clips. "
        "The engine then iterates per clip (Scene 1 to Scene N): Phase 3 creates the scene keyframe using /assets character references -> "
        "Phase 4 waits for Phase 3 keyframe and renders the video clip with native character dialogue -> Phase 5 applies dynamic captions to the clip. "
        "On the final scene (Scene N, 10 to 14 scenes), Phase 5 captions the final clip and merges all clips into the master story video."
    )
}

# Alias for backwards compatibility with "banana_husband" key
BANANA_HUSBAND_PRESET = ANTHROPOMORPHIC_PRODUCE_PRESET


# ==============================================================================
# PRESET REGISTRY & UTILITIES
# ==============================================================================
AVAILABLE_PRESETS: Dict[str, Dict[str, Any]] = {
    "anthropomorphic_produce": ANTHROPOMORPHIC_PRODUCE_PRESET,
    "banana_husband": BANANA_HUSBAND_PRESET,
    "faceted_crystal": FACETED_CRYSTAL_PRESET,
}


def list_presets() -> List[str]:
    """Returns the list of available preset identifiers."""
    return list(AVAILABLE_PRESETS.keys())


def get_preset(preset_id: str) -> Dict[str, Any]:
    """Retrieves a deep copy of a character style preset by ID."""
    preset_key = preset_id.strip().lower()
    if preset_key not in AVAILABLE_PRESETS:
        raise KeyError(f"Unknown preset '{preset_id}'. Available presets: {list_presets()}")
    return copy.deepcopy(AVAILABLE_PRESETS[preset_key])


def register_preset(preset_id: str, preset_data: Dict[str, Any]):
    """Registers or updates a character style preset."""
    AVAILABLE_PRESETS[preset_id.strip().lower()] = copy.deepcopy(preset_data)


def export_presets_to_disk(directory: Optional[Path] = None):
    """Exports all available presets as JSON files into the specified directory."""
    target_dir = directory or (Path(__file__).resolve().parent.parent / "presets")
    target_dir.mkdir(parents=True, exist_ok=True)
    for p_id, p_data in AVAILABLE_PRESETS.items():
        out_file = target_dir / f"{p_id}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(p_data, f, indent=2)

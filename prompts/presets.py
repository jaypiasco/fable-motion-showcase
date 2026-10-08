"""
Character Style Preset Registry & Storage (Showcase Edition).
Allows archiving, loading, and switching between creative style DNA presets.
Features generic placeholder presets demonstrating extensible design patterns.
"""

from typing import Dict, Any, List, Optional
import copy
import json
from pathlib import Path


# ==============================================================================
# PRESET 1: BABY RHYMES & NURSERY TALES
# ==============================================================================
BABY_RHYMES_PRESET: Dict[str, Any] = {
    "preset_id": "baby_rhymes",
    "name": "Baby Rhymes & Nursery Tales (Stylized 3D Preschool)",
    "engine_name": "BABY RHYMES & NURSERY ANIMATION ENGINE",
    "target_platforms": "YouTube Kids, YouTube Shorts, TikTok (30–60 seconds)",
    "aspect_ratio": "9:16",
    "character_aesthetic": (
        "Soft, rounded 3D animated toddler and animal companions with friendly expressive faces, "
        "pastel textures, smooth geometry, and large gentle animated eyes with warm specular reflections."
    ),
    "wardrobe_contrast": (
        "Cute knitted overalls, cozy pastel pajamas, patterned bibs, and soft colorful socks designed for preschool appeal."
    ),
    "environment": (
        "Sunny nursery playrooms, floating cloud dreamscapes, colorful block gardens, and cozy storybook bedrooms with soft pastel gradients."
    ),
    "story_tropes": (
        "Playful bedtime adventures, counting challenges, discovering shapes and colors, gentle friendship lessons, and joyful nursery lullabies."
    ),
    "audio_and_dialogue": (
        "Warm soothing narrator voice, gentle melodic rhyme cadence, soft xylophone and music-box stingers, playful cheerful giggles."
    ),
    "studio_lighting": (
        "Bright, cheerful high-key diffuse lighting, soft pastel bounce lights, warm sunbeams, gentle shadows."
    ),
    "render_quality": (
        "Pixar-inspired soft 3D stylized preschool rendering, smooth matte toy surfaces, 8k resolution, Octane Render."
    ),
    "mandatory_cta": "Subscribe for daily musical rhymes and playful bedtime stories",
    "sample_characters": [
        {"name": "Leo the Lion Cub", "species": "Golden Lion Cub", "archetype": "Curious Toddler Explorer"},
        {"name": "Mimi the Bunny", "species": "Pastel Pink Rabbit", "archetype": "Gentle Melody Singer"},
        {"name": "Barnaby Bear", "species": "Honey Brown Bear", "archetype": "Sleepy Storyteller"},
    ],
    "audio_profile": "Audio: Gentle, warm preschool narrator cadence with soft music-box melodies, room tone, and subtle giggle sound effects.",
    "character_naming_convention": "Friendly, memorable storybook first names suitable for toddlers (e.g., 'Barnaby', 'Mimi', 'Leo', 'Pip', 'Ella').",
    "pipeline_iteration_architecture": "Standard 5-phase story execution generating rhyming scene beats, preschool character bibles, pastel keyframe stills, gentle motion clips, and synchronized lyric subtitles.",
}


# ==============================================================================
# PRESET 2: FILIPINO FOLKLORE & CULTURAL TALES
# ==============================================================================
FILIPINO_CHARACTERS_PRESET: Dict[str, Any] = {
    "preset_id": "filipino_characters",
    "name": "Filipino Folklore & Cultural Tales (Stylized 3D Feature)",
    "engine_name": "FILIPINO FOLKLORE & CULTURAL DRAMA ENGINE",
    "target_platforms": "TikTok, YouTube Shorts, Facebook Reels (60–90 seconds)",
    "aspect_ratio": "9:16",
    "character_aesthetic": (
        "Warm, expressive 3D animated characters celebrating Filipino cultural identity, folklore archetypes, "
        "warm golden-brown skin tones, expressive dark eyes, and authentic cultural anatomy."
    ),
    "wardrobe_contrast": (
        "Intricately embroidered Barong Tagalog, elegant Baro't Saya, colorful modern streetwear, and handwoven indigenous textile accents (Inabel, Yakan)."
    ),
    "environment": (
        "Lush tropical barangay coastlines, ancestral wooden Bahay na Bato verandas, misty provincial rice terraces, and bustling modern Manila night markets."
    ),
    "story_tropes": (
        "Bayanihan communal solidarity, heartfelt family reunions, encounters with mythical Diwata protectors, respect for ancestral heritage, and wholesome overcoming-the-odds triumphs."
    ),
    "audio_and_dialogue": (
        "Warm emotional cadence, bilingual conversational delivery (Tagalog/English), acoustic guitar or kulintang accents, authentic natural room tone."
    ),
    "studio_lighting": (
        "Golden hour tropical sunbeams, warm ambient bounce, lush foliage rim lighting, cinematic dusk shadows."
    ),
    "render_quality": (
        "High-fidelity 3D animated feature rendering, photorealistic fabric weaves and lace details, Unreal Engine 5 render style, 8k resolution."
    ),
    "mandatory_cta": "Follow for more heartwarming Filipino cultural stories and folklore",
    "sample_characters": [
        {"name": "Lolo Mateo", "species": "Human Elder", "archetype": "Wise Village Storyteller"},
        {"name": "Tala the Diwata", "species": "Nature Spirit", "archetype": "Forest Guardian"},
        {"name": "Danilo Cruz", "species": "Human Protagonist", "archetype": "Hardworking Overseas Returnee"},
    ],
    "audio_profile": "Audio: Natural, warm voice with authentic cultural cadence, gentle ambient breeze, distant cicadas, and subtle room acoustics.",
    "character_naming_convention": "Authentic Filipino names reflecting regional heritage (e.g., 'Danilo Cruz', 'Elena Santos', 'Mateo Reyes', 'Tala Morales').",
    "pipeline_iteration_architecture": "Standard 5-phase story execution generating cultural story beats, character consistency portraits, keyframe stills, Veo video dynamics, and word-level karaoke subtitles.",
}


# ==============================================================================
# PRESET 3: ANTHROPOMORPHIC ANIMAL FABLES
# ==============================================================================
ANIMAL_CHARACTERS_PRESET: Dict[str, Any] = {
    "preset_id": "animal_characters",
    "name": "Anthropomorphic Animal Fables (Stylized 3D Feature)",
    "engine_name": "ANTHROPOMORPHIC ANIMAL FABLE ENGINE",
    "target_platforms": "TikTok, YouTube Shorts, Instagram Reels (60–90 seconds)",
    "aspect_ratio": "9:16",
    "character_aesthetic": (
        "Full-body stylized 3D anthropomorphic animal characters (e.g., Red Fox, Timber Wolf, Barn Owl, Brown Bear, Hare) "
        "with realistic anatomical proportions, fine fur groom shaders, feather subsurface scattering, and large expressive animated eyes."
    ),
    "wardrobe_contrast": (
        "Bespoke tailored heritage garments: tweed waistcoats, brass-buttoned trenchcoats, wool knit scarves, vintage explorer boots, and leather messenger satchels."
    ),
    "environment": (
        "Misty pine forest libraries, gaslit cobblestone alleyways, cozy timber cabins with stone fireplaces, and vaulted woodland council halls."
    ),
    "story_tropes": (
        "Clever forest mystery investigations, ancient woodland pacts, status rivalries among noble animal clans, and heartwarming underdog courage."
    ),
    "audio_and_dialogue": (
        "Natural resonant vocal delivery, subtle forest ambient cues (rustling pines, gentle mountain wind, fireplace crackles), authentic room tone."
    ),
    "studio_lighting": (
        "Cinematic volumetric forest sunlight, high-contrast atmospheric rim lighting, soft diffuse fill, deep dramatic shadows."
    ),
    "render_quality": (
        "Pixar/Disney-quality 3D feature animation rendering, detailed fur grooming shaders, Octane Render, 8k resolution."
    ),
    "mandatory_cta": "Follow for daily anthropomorphic fable mysteries and adventures",
    "sample_characters": [
        {"name": "Arthur Foxglove", "species": "Red Fox", "archetype": "Shrewd Woodland Detective"},
        {"name": "Gideon Vance", "species": "Timber Wolf", "archetype": "Stern Forest Magistrate"},
        {"name": "Minerva Quill", "species": "Barn Owl", "archetype": "Scholarly Archivist"},
    ],
    "audio_profile": "Audio: Natural, grounded voice with atmospheric room tone, gentle forest wind outside, and soft footsteps.",
    "character_naming_convention": "Classic distinguished human names paired with nature-inspired surnames (e.g., 'Arthur Foxglove', 'Minerva Quill', 'Gideon Vance').",
    "pipeline_iteration_architecture": "Standard 5-phase story execution generating narrative screenplay, character reference sheets, forest keyframe stills, Veo motion clips, and word-level dynamic subtitles.",
}


# ==============================================================================
# PRESET 4: STYLIZED 3D FRUIT & GARDEN TALES
# ==============================================================================
FRUIT_CHARACTERS_PRESET: Dict[str, Any] = {
    "preset_id": "fruit_characters",
    "name": "Stylized 3D Animated Fruit & Garden Tales",
    "engine_name": "ANTHROPOMORPHIC 3D FRUIT ANIMATION ENGINE",
    "target_platforms": "TikTok, YouTube Shorts, Instagram Reels (60–90 seconds)",
    "aspect_ratio": "9:16",
    "character_aesthetic": (
        "Stylized 3D anthropomorphic fruit characters (e.g., Orange, Apple, Lemon, Berry) with natural organic peel textures, "
        "large expressive animated Pixar-style eyes with glossy reflections, and friendly expressive facial features carved naturally into the fruit surface."
    ),
    "wardrobe_contrast": (
        "Playful modern outfits: casual denim jackets, colorful athletic sneakers, cozy hoodies, and tiny tailored blazers draped over fruit bodies."
    ),
    "environment": (
        "Sunlit orchard terraces, vibrant market cafes, modern kitchen counter studios, and colorful community gardens."
    ),
    "story_tropes": (
        "Lighthearted garden adventures, wholesome friendship misunderstandings, playful kitchen contests, and uplifting teamwork victories."
    ),
    "audio_and_dialogue": (
        "Lively conversational delivery, subtle acoustic kitchen room tone, playful sound effect cues, natural room acoustics."
    ),
    "studio_lighting": (
        "Bright cinematic 3-point studio lighting, glossy specular highlights across peel rinds, warm soft rim lights."
    ),
    "render_quality": (
        "Pixar-style glossy 3D animation, subsurface fruit peel scattering, Octane Render, 8k resolution."
    ),
    "mandatory_cta": "Visit fablemotion.ai and create your own ai short stories",
    "sample_species": [
        {"species": "Ripe Banana", "color": "Rich Yellow with Tiny Brown Speckles", "archetype": "Banana Husband / Tech Executive"},
        {"species": "Red Onion", "color": "Glossy Deep Magenta-Violet", "archetype": "Market Manager"},
        {"species": "Crisp Apple", "color": "Vibrant Red with Glossy Finish", "archetype": "Garden Lead"},
    ],
    "audio_profile": (
        "Audio: Natural, warm, grounded voice with realistic room acoustics and subtle breathing. "
        "Background sound includes soft ambient rain outside and a quiet room tone. No background music. (no subtitles)"
    ),
    "character_naming_convention": (
        "MANDATORY: Every character MUST be given an authentic, realistic human first and last name (e.g. 'Arthur Bananier', 'Elena Vance')."
    ),
    "pipeline_iteration_architecture": (
        "Phase 1 generates the full 10-14 scene script with authentic human character names. "
        "Phase 2 generates character reference portraits stored in /assets for all clips. "
        "The engine then iterates per clip: Phase 3 keyframe -> Phase 4 video clip -> Phase 5 dynamic captions."
    ),
}

# Compatibility aliases
ANTHROPOMORPHIC_PRODUCE_PRESET = FRUIT_CHARACTERS_PRESET
BANANA_HUSBAND_PRESET = FRUIT_CHARACTERS_PRESET


# ==============================================================================
# PRESET 5: ARCHIVED FACETED-CRYSTAL (GENERIC PLACEHOLDER)
# ==============================================================================
FACETED_CRYSTAL_PRESET: Dict[str, Any] = {
    "preset_id": "faceted_crystal",
    "name": "Generic Faceted Crystal 3D Geometric Style (Placeholder)",
    "engine_name": "VIRAL FACETED-CRYSTAL 3D DRAMA ENGINE",
    "target_platforms": "TikTok, YouTube Shorts, Instagram Reels (60–90 seconds)",
    "aspect_ratio": "9:16",
    "character_aesthetic": (
        "Stylized 3D geometric crystalline humanoid characters with refractive low-poly facet shaders, "
        "glossy animated eyes, and clean geometric anatomy."
    ),
    "wardrobe_contrast": "Modern tailored garments draped over geometric crystalline bodies.",
    "environment": "Minimalist architectural spaces, neoclassical rooms, and modern geometric lounges.",
    "story_tropes": "Dramatic status conflicts, high-society negotiations, and moral parables.",
    "audio_and_dialogue": "Natural, grounded voice with room acoustics and clear tone.",
    "studio_lighting": "3-point studio lighting with specular crystalline edge glints.",
    "render_quality": "Clean 3D render style with volumetric lighting, 8k resolution.",
    "mandatory_cta": "Visit fablemotion.ai and create your own ai short stories",
    "sample_materials": ["Faceted Blue Sapphire Crystal", "Polished 24K Gold Alloy"],
    "audio_profile": "Audio: Natural, warm, grounded voice with realistic room acoustics and subtle breathing.",
    "character_naming_convention": "Distinguished realistic human names.",
    "pipeline_iteration_architecture": "Standard 5-phase story execution.",
}


# ==============================================================================
# PRESET REGISTRY & UTILITIES
# ==============================================================================
AVAILABLE_PRESETS: Dict[str, Dict[str, Any]] = {
    "baby_rhymes": BABY_RHYMES_PRESET,
    "filipino_characters": FILIPINO_CHARACTERS_PRESET,
    "animal_characters": ANIMAL_CHARACTERS_PRESET,
    "fruit_characters": FRUIT_CHARACTERS_PRESET,
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

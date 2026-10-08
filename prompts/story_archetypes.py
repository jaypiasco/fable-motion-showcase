"""
Story Archetypes Configuration & Dynamic Slot Compilation Engine.
Validates structured story archetypes (genre, visual style, core cast, environment arc, camera, plot beats)
and compiles them dynamically into prompt slots for high-variety concept generation.
"""

from typing import Dict, Any, List, Optional
import copy
import random
from pydantic import BaseModel, Field


class StyleAndConcept(BaseModel):
    visual_engine: str = Field(..., description="Visual render engine description (e.g. 3D Pixar meets Octane Render, 8K)")
    aesthetic: str = Field(..., description="Aesthetic description of characters, textures, and apparel")
    tone: str = Field(..., description="Emotional and dramatic tone (e.g. High-stakes dramatic soap opera)")


class CastMemberArchetype(BaseModel):
    role: str = Field(..., description="Character role identifier (e.g. vulnerable_mother, underdog_protagonist)")
    archetype: str = Field(..., description="Produce/character archetype (e.g. Soft, fragile produce (e.g., White Strawberry, Peach))")
    features: str = Field(..., description="Distinct visual facial and physiological features")
    wardrobe: str = Field(..., description="Signature apparel and styling")
    emotional_tone: str = Field(..., description="Emotional cadence and performance tone")


class EnvironmentArc(BaseModel):
    act_1_crisis: str = Field(..., description="Act 1 setting / crisis environment")
    act_2_exile: str = Field(..., description="Act 2 setting / exile or breakdown environment")
    act_3_sanctuary: str = Field(..., description="Act 3 setting / training or sanctuary environment")
    act_4_climax: str = Field(..., description="Act 4 setting / confrontation or climax environment")


class CameraAndMotion(BaseModel):
    camera: str = Field(..., description="Camera angles, lens choices, and movement styles")
    physics_effects: str = Field(..., description="Physical simulation and atmospheric effects")


class StoryArchetypeConfig(BaseModel):
    story_id: str = Field(..., description="Unique archetype identifier")
    genre: str = Field(..., description="Narrative genre (e.g. Viral Melodrama / Produce Soap Opera)")
    style_and_concept: StyleAndConcept
    core_cast: List[CastMemberArchetype]
    environment_arc: EnvironmentArc
    camera_and_motion: CameraAndMotion
    plot_beats: List[str] = Field(..., description="Sequential plot beat progression")


# ==============================================================================
# DEFAULT ARCHETYPE POOL (6 Schema-Validated Configurations)
# ==============================================================================
RAW_ARCHETYPES_DATA: List[Dict[str, Any]] = [
    {
        "story_id": "fruit_drama_01_baby_trafficking_v1",
        "genre": "Viral Melodrama / Produce Soap Opera",
        "style_and_concept": {
            "visual_engine": "3D Pixar meets Octane Render, 8K",
            "aesthetic": "Anthropomorphic fruit/vegetable heads, hyper-expressive glossy 3D facial animation, realistic human bodies in textured apparel",
            "tone": "High-stakes dramatic soap opera"
        },
        "core_cast": [
            {
                "role": "vulnerable_mother",
                "archetype": "Soft, fragile produce (e.g., White Strawberry, Peach)",
                "features": "Pale, delicate, glossy tear-filled eyes",
                "wardrobe": "Lived-in knitwear, oversized sweater",
                "emotional_tone": "Desperate, sorrowful, protective"
            },
            {
                "role": "rejecting_partner",
                "archetype": "Rough, aggressive produce (e.g., Red Strawberry, Jalapeño)",
                "features": "Veiny brow, steam vents, scowling mouth",
                "wardrobe": "Distressed casual wear, denim, hoodie",
                "emotional_tone": "Explosive rage, selfish panic"
            },
            {
                "role": "predatory_billionaire",
                "archetype": "Sleek, tall produce (e.g., Broccoli, Eggplant)",
                "features": "Immaculate textures, calculating smirk",
                "wardrobe": "Bespoke charcoal CEO three-piece suit",
                "emotional_tone": "Cold, predatory elegance"
            },
            {
                "role": "henchman",
                "archetype": "Heavyweight produce (e.g., Muscular Peach, Coconut)",
                "features": "Broad, stone-faced, intimidating build",
                "wardrobe": "Tight tactical t-shirt or security uniform",
                "emotional_tone": "Stoic, silent obedience"
            },
            {
                "role": "infants",
                "archetype": "Massive litter of tiny seedling fruit babies",
                "features": "Over 900 miniature swaddled fruit newborns",
                "wardrobe": "Identical newborn swaddles",
                "emotional_tone": "Helpless, synchronized crying"
            }
        ],
        "environment_arc": {
            "act_1_crisis": "Overcrowded fluorescent maternity hospital ward packed with baby bassinets",
            "act_2_exile": "Rain-drenched city bus shelter under cold amber streetlamps",
            "act_3_sanctuary": "Neoclassical ballroom nursery filled with dozens of pristine golden cribs",
            "act_4_climax": "Vaulted mansion hallway at night with flashlights, shifting to cold morning light"
        },
        "camera_and_motion": {
            "camera": "Snap-zooms on tears, low-angle confrontation framing, tracking pushes along crib rows",
            "physics_effects": "Volumetric steam drift, heavy rainfall physics, fabric stretching under tension"
        },
        "plot_beats": [
            "Extreme multiple birth triggers partner panic and eviction",
            "Exiled mother huddled in the storm is approached by an elite benefactor",
            "Mother is settled into an opulent nursery and offered drugged tea",
            "Henchmen load the sleeping infants onto transport carts at midnight",
            "Morning discovery of empty cribs leads to an icy confrontation"
        ]
    },
    {
        "story_id": "fruit_drama_02_fitness_revenge_v1",
        "genre": "Underdog Revenge / Fitness Melodrama",
        "style_and_concept": {
            "visual_engine": "Pixar meets Unreal Engine 5, 8K Octane",
            "aesthetic": "Anthropomorphic vegetable heads, vascular micro-textures, photorealistic athletic human bodies",
            "tone": "Gritty, aggressive, high-melodrama fitness betrayal"
        },
        "core_cast": [
            {
                "role": "underdog_protagonist",
                "archetype": "Emaciated pale produce (e.g., Scallion, Garlic, Onion)",
                "features": "Hollow cheeks, oversized tearful eyes, protruding ribs",
                "wardrobe": "Baggy worn sweatpants, oversized t-shirt",
                "emotional_tone": "Insecure grief transitioning to fierce resolve"
            },
            {
                "role": "demanding_partner",
                "archetype": "Hyper-muscular female produce (e.g., Pineapple, Dragon Fruit)",
                "features": "Broad defined shoulders, dismissive sneer",
                "wardrobe": "High-end athletic performance gymwear",
                "emotional_tone": "Arrogant, mocking, condescending"
            },
            {
                "role": "rival",
                "archetype": "Massive alpha produce (e.g., Potato, Durian)",
                "features": "Rugged textured skin, thick vascular neck",
                "wardrobe": "Stringer tank top showing striations",
                "emotional_tone": "Smug, dominating, boastful"
            },
            {
                "role": "hype_crew",
                "archetype": "Flamboyant gym regulars (e.g., Glossy Cherry, Kale)",
                "features": "Toned builds, laughing expressions",
                "wardrobe": "Color-blocked gym sets, weightlifting belts",
                "emotional_tone": "Cruel, gossiping, derisive"
            }
        ],
        "environment_arc": {
            "act_1_crisis": "Opulent penthouse dining room with warm golden luxury lighting",
            "act_2_exile": "Steamy marble bathroom mirror under harsh overhead downlight",
            "act_3_sanctuary": "Industrial commercial gym under cold desaturated LED tubes",
            "act_4_climax": "Sunny outdoor rooftop gym patio where betrayal occurs in public"
        },
        "camera_and_motion": {
            "camera": "Wide power-imbalance frames, tight macro-tracking on pulsing veins, crash zooms",
            "physics_effects": "Sweat bead accumulation, weighted bar deflection, chalk dust suspension, dramatic muscle tension"
        },
        "plot_beats": [
            "Scrawny protagonist announces ambition and is publicly laughed down by partner and peers",
            "Protagonist undergoes a tearful breakdown and mirror-vow of vengeance",
            "Grueling gym training montage and high-intensity supplement preparation",
            "Protagonist catches partner openly cheating with the muscular rival",
            "Dramatic confrontation and dominant power-shift freeze-frame cliffhanger"
        ]
    },
    {
        "story_id": "fruit_drama_03_the_honest_heir_v1",
        "genre": "Moral Parable / Luxury Prestige Drama",
        "style_and_concept": {
            "visual_engine": "Hyperrealistic Live-Action Hybrid, Unreal Engine 5",
            "aesthetic": "Anthropomorphic sports-ball/fruit heads with glossy micro-expressions on live-action human bodies",
            "tone": "Cinematic, prestige melodrama with moral gravitas"
        },
        "core_cast": [
            {
                "role": "protagonist_child",
                "archetype": "Petite working-class youth (e.g., Patterned Mini-Ball, Apple)",
                "features": "Glossy wide innocent eyes, quivering determined chin",
                "wardrobe": "Faded oversized thrift jacket, muddy sneakers",
                "emotional_tone": "Guileless, fiercely principled, resilient"
            },
            {
                "role": "sick_parent",
                "archetype": "Bedridden frail elder sharing child's species motif",
                "features": "Dull matte surface, soft weary smile, sunken sockets",
                "wardrobe": "Faded flannel hospital gown",
                "emotional_tone": "Quiet dignity, unwavering moral authority"
            },
            {
                "role": "wealthy_tycoon",
                "archetype": "Monolithic elite figure (e.g., Pristine Golf Ball, Cue Ball)",
                "features": "Polished dimpled surface, dark luxury sunglasses",
                "wardrobe": "Bespoke black tailored overcoat, silk tie",
                "emotional_tone": "Stern, test-oriented, emotionally masked"
            },
            {
                "role": "skeptical_butler",
                "archetype": "Textured brute enforcer (e.g., Baseball with red seams)",
                "features": "Broad jaw, furrowed brow, defensive squint",
                "wardrobe": "Formal chauffeur/bodyguard suit",
                "emotional_tone": "Suspicious, cynical, protective"
            }
        ],
        "environment_arc": {
            "act_1_crisis": "Rain-slicked luxury hotel entrance under overcast slate-grey skies",
            "act_2_exile": "Sterile charity hospital room illuminated by dim medical monitors",
            "act_3_sanctuary": "Flooded urban crosswalk during a torrential midnight thunderstorm",
            "act_4_climax": "Gilded mansion foyer featuring towering chandeliers and polished marble"
        },
        "camera_and_motion": {
            "camera": "Low-angle child hero perspective, backward tracking storm walks, slow push-ins",
            "physics_effects": "Dynamic water splash simulations, fabric drenching, subtle lip-sync tremors"
        },
        "plot_beats": [
            "Poor street kid finds high-value item left behind by aloof billionaire",
            "Dying parent refuses pawn money and demands child return the item despite hardship",
            "Child braves a dangerous storm and physical injury to protect the returned item",
            "Child delivers item to the mansion gate and rejects financial reward",
            "Tycoon spots family heirloom on the child, recognizing his long-lost child"
        ]
    },
    {
        "story_id": "fruit_drama_01_baby_trafficking_v2",
        "genre": "Viral Melodrama / Produce Soap Opera",
        "style_and_concept": {
            "visual_engine": "3D Pixar meets Octane Render, 8K",
            "aesthetic": "Anthropomorphic fruit/vegetable heads, hyper-expressive glossy 3D facial animation, realistic human bodies in textured apparel",
            "tone": "High-stakes dramatic soap opera"
        },
        "core_cast": [
            {
                "role": "vulnerable_mother",
                "archetype": "Soft, fragile produce (e.g., White Strawberry, Peach)",
                "features": "Pale, delicate, glossy tear-filled eyes",
                "wardrobe": "Lived-in knitwear, oversized sweater",
                "emotional_tone": "Desperate, sorrowful, protective"
            },
            {
                "role": "rejecting_partner",
                "archetype": "Rough, aggressive produce (e.g., Red Strawberry, Jalapeño)",
                "features": "Veiny brow, steam vents, scowling mouth",
                "wardrobe": "Distressed casual wear, denim, hoodie",
                "emotional_tone": "Explosive rage, selfish panic"
            },
            {
                "role": "predatory_billionaire",
                "archetype": "Sleek, tall produce (e.g., Broccoli, Eggplant)",
                "features": "Immaculate textures, calculating smirk",
                "wardrobe": "Bespoke charcoal CEO three-piece suit",
                "emotional_tone": "Cold, predatory elegance"
            },
            {
                "role": "henchman",
                "archetype": "Heavyweight produce (e.g., Muscular Peach, Coconut)",
                "features": "Broad, stone-faced, intimidating build",
                "wardrobe": "Tight tactical t-shirt or security uniform",
                "emotional_tone": "Stoic, silent obedience"
            },
            {
                "role": "infants",
                "archetype": "Massive litter of tiny seedling fruit babies",
                "features": "Over 900 miniature swaddled fruit newborns",
                "wardrobe": "Identical newborn swaddles",
                "emotional_tone": "Helpless, synchronized crying"
            }
        ],
        "environment_arc": {
            "act_1_crisis": "Overcrowded fluorescent maternity hospital ward packed with baby bassinets",
            "act_2_exile": "Rain-drenched city bus shelter under cold amber streetlamps",
            "act_3_sanctuary": "Neoclassical ballroom nursery filled with dozens of pristine golden cribs",
            "act_4_climax": "Vaulted mansion hallway at night with flashlights, shifting to cold morning light"
        },
        "camera_and_motion": {
            "camera": "Snap-zooms on tears, low-angle confrontation framing, tracking pushes along crib rows",
            "physics_effects": "Volumetric steam drift, heavy rainfall physics, fabric stretching under tension"
        },
        "plot_beats": [
            "Extreme multiple birth triggers partner panic and eviction",
            "Exiled mother huddled in the storm is approached by an elite benefactor",
            "Mother is settled into an opulent nursery and offered drugged tea",
            "Henchmen load the sleeping infants onto transport carts at midnight",
            "Morning discovery of empty cribs leads to an icy confrontation"
        ]
    },
    {
        "story_id": "fruit_drama_02_fitness_revenge_v2",
        "genre": "Underdog Revenge / Fitness Melodrama",
        "style_and_concept": {
            "visual_engine": "Pixar meets Unreal Engine 5, 8K Octane",
            "aesthetic": "Anthropomorphic vegetable heads, vascular micro-textures, photorealistic athletic human bodies",
            "tone": "Gritty, aggressive, high-melodrama fitness betrayal"
        },
        "core_cast": [
            {
                "role": "underdog_protagonist",
                "archetype": "Emaciated pale produce (e.g., Scallion, Garlic, Onion)",
                "features": "Hollow cheeks, oversized tearful eyes, protruding ribs",
                "wardrobe": "Baggy worn sweatpants, oversized t-shirt",
                "emotional_tone": "Insecure grief transitioning to fierce resolve"
            },
            {
                "role": "demanding_partner",
                "archetype": "Hyper-muscular female produce (e.g., Pineapple, Dragon Fruit)",
                "features": "Broad defined shoulders, dismissive sneer",
                "wardrobe": "High-end athletic performance gymwear",
                "emotional_tone": "Arrogant, mocking, condescending"
            },
            {
                "role": "rival",
                "archetype": "Massive alpha produce (e.g., Potato, Durian)",
                "features": "Rugged textured skin, thick vascular neck",
                "wardrobe": "Stringer tank top showing striations",
                "emotional_tone": "Smug, dominating, boastful"
            },
            {
                "role": "hype_crew",
                "archetype": "Flamboyant gym regulars (e.g., Glossy Cherry, Kale)",
                "features": "Toned builds, laughing expressions",
                "wardrobe": "Color-blocked gym sets, weightlifting belts",
                "emotional_tone": "Cruel, gossiping, derisive"
            }
        ],
        "environment_arc": {
            "act_1_crisis": "Opulent penthouse dining room with warm golden luxury lighting",
            "act_2_exile": "Steamy marble bathroom mirror under harsh overhead downlight",
            "act_3_sanctuary": "Industrial commercial gym under cold desaturated LED tubes",
            "act_4_climax": "Sunny outdoor rooftop gym patio where betrayal occurs in public"
        },
        "camera_and_motion": {
            "camera": "Wide power-imbalance frames, tight macro-tracking on pulsing veins, crash zooms",
            "physics_effects": "Sweat bead accumulation, weighted bar deflection, chalk dust suspension, dramatic muscle tension"
        },
        "plot_beats": [
            "Scrawny protagonist announces ambition and is publicly laughed down by partner and peers",
            "Protagonist undergoes a tearful breakdown and mirror-vow of vengeance",
            "Grueling gym training montage and high-intensity supplement preparation",
            "Protagonist catches partner openly cheating with the muscular rival",
            "Dramatic confrontation and dominant power-shift freeze-frame cliffhanger"
        ]
    },
    {
        "story_id": "fruit_drama_03_the_honest_heir_v2",
        "genre": "Moral Parable / Luxury Prestige Drama",
        "style_and_concept": {
            "visual_engine": "Hyperrealistic Live-Action Hybrid, Unreal Engine 5",
            "aesthetic": "Anthropomorphic sports-ball/fruit heads with glossy micro-expressions on live-action human bodies",
            "tone": "Cinematic, prestige melodrama with moral gravitas"
        },
        "core_cast": [
            {
                "role": "protagonist_child",
                "archetype": "Petite working-class youth (e.g., Patterned Mini-Ball, Apple)",
                "features": "Glossy wide innocent eyes, quivering determined chin",
                "wardrobe": "Faded oversized thrift jacket, muddy sneakers",
                "emotional_tone": "Guileless, fiercely principled, resilient"
            },
            {
                "role": "sick_parent",
                "archetype": "Bedridden frail elder sharing child's species motif",
                "features": "Dull matte surface, soft weary smile, sunken sockets",
                "wardrobe": "Faded flannel hospital gown",
                "emotional_tone": "Quiet dignity, unwavering moral authority"
            },
            {
                "role": "wealthy_tycoon",
                "archetype": "Monolithic elite figure (e.g., Pristine Golf Ball, Cue Ball)",
                "features": "Polished dimpled surface, dark luxury sunglasses",
                "wardrobe": "Bespoke black tailored overcoat, silk tie",
                "emotional_tone": "Stern, test-oriented, emotionally masked"
            },
            {
                "role": "skeptical_butler",
                "archetype": "Textured brute enforcer (e.g., Baseball with red seams)",
                "features": "Broad jaw, furrowed brow, defensive squint",
                "wardrobe": "Formal chauffeur/bodyguard suit",
                "emotional_tone": "Suspicious, cynical, protective"
            }
        ],
        "environment_arc": {
            "act_1_crisis": "Rain-slicked luxury hotel entrance under overcast slate-grey skies",
            "act_2_exile": "Sterile charity hospital room illuminated by dim medical monitors",
            "act_3_sanctuary": "Flooded urban crosswalk during a torrential midnight thunderstorm",
            "act_4_climax": "Gilded mansion foyer featuring towering chandeliers and polished marble"
        },
        "camera_and_motion": {
            "camera": "Low-angle child hero perspective, backward tracking storm walks, slow push-ins",
            "physics_effects": "Dynamic water splash simulations, fabric drenching, subtle lip-sync tremors"
        },
        "plot_beats": [
            "Poor street kid finds high-value item left behind by aloof billionaire",
            "Dying parent refuses pawn money and demands child return the item despite hardship",
            "Child braves a dangerous storm and physical injury to protect the returned item",
            "Child delivers item to the mansion gate and rejects financial reward",
            "Tycoon spots family heirloom on the child, recognizing his long-lost child"
        ]
    }
]

# Validated archetype objects in memory
_ARCHETYPES_REGISTRY: Dict[str, StoryArchetypeConfig] = {
    item["story_id"]: StoryArchetypeConfig.model_validate(item)
    for item in RAW_ARCHETYPES_DATA
}


def get_all_archetypes() -> List[StoryArchetypeConfig]:
    """Returns a list of all validated story archetypes."""
    return list(_ARCHETYPES_REGISTRY.values())


def get_archetype(story_id: str) -> Optional[StoryArchetypeConfig]:
    """Retrieves a single archetype configuration by story_id."""
    return _ARCHETYPES_REGISTRY.get(story_id)


def register_archetype(data: Dict[str, Any]) -> StoryArchetypeConfig:
    """Validates and registers a new archetype configuration."""
    validated = StoryArchetypeConfig.model_validate(data)
    _ARCHETYPES_REGISTRY[validated.story_id] = validated
    return validated


def sample_distinct_archetypes(
    count: int = 3,
    exclude_ids: Optional[List[str]] = None,
    custom_archetypes: Optional[List[Dict[str, Any]]] = None,
) -> List[StoryArchetypeConfig]:
    """
    Dynamically samples distinct archetypes from the pool without fixed defaults.
    Guarantees genre diversity where possible, and avoids previously used IDs on regeneration.
    """
    if custom_archetypes:
        try:
            return [StoryArchetypeConfig.model_validate(item) for item in custom_archetypes[:count]]
        except Exception:
            pass

    exclude_set = set(exclude_ids or [])
    available = [arch for s_id, arch in _ARCHETYPES_REGISTRY.items() if s_id not in exclude_set]

    # If all archetypes were excluded, reset exclusion to allow full pool
    if len(available) < count:
        available = list(_ARCHETYPES_REGISTRY.values())

    # Group by genre to maximize variety across options
    genre_groups: Dict[str, List[StoryArchetypeConfig]] = {}
    for arch in available:
        genre_groups.setdefault(arch.genre, []).append(arch)

    selected: List[StoryArchetypeConfig] = []
    shuffled_genres = list(genre_groups.keys())
    random.shuffle(shuffled_genres)

    # Pick one archetype from distinct genres first
    for g in shuffled_genres:
        if len(selected) >= count:
            break
        candidates = genre_groups[g]
        random.shuffle(candidates)
        selected.append(candidates[0])

    # If count not met, fill from remaining available archetypes
    if len(selected) < count:
        remaining = [a for a in available if a not in selected]
        random.shuffle(remaining)
        selected.extend(remaining[: count - len(selected)])

    # Ensure list length is count (or fallback to pool)
    if not selected:
        selected = list(_ARCHETYPES_REGISTRY.values())[:count]

    return selected[:count]


def compile_archetype_slots(archetype: StoryArchetypeConfig, option_number: int) -> str:
    """
    Formats key/value slots of an archetype into structured markdown for prompt injection.
    """
    cast_lines = []
    for c in archetype.core_cast:
        cast_lines.append(
            f"    - Role: {c.role} | Archetype: {c.archetype} | Features: {c.features} | Wardrobe: {c.wardrobe} | Tone: {c.emotional_tone}"
        )
    cast_block = "\n".join(cast_lines)

    beats_lines = [f"    {idx + 1}. {beat}" for idx, beat in enumerate(archetype.plot_beats)]
    beats_block = "\n".join(beats_lines)

    return f"""### OPTION {option_number} ARCHETYPE SEED [ID: {archetype.story_id}]
- Genre: {archetype.genre}
- Visual Engine & Style: {archetype.style_and_concept.visual_engine}
- Character Aesthetic: {archetype.style_and_concept.aesthetic}
- Tone: {archetype.style_and_concept.tone}
- Core Cast Dynamic:
{cast_block}
- Environment Arc:
    * Act 1 Crisis: {archetype.environment_arc.act_1_crisis}
    * Act 2 Exile: {archetype.environment_arc.act_2_exile}
    * Act 3 Sanctuary: {archetype.environment_arc.act_3_sanctuary}
    * Act 4 Climax: {archetype.environment_arc.act_4_climax}
- Camera & Motion Physics:
    * Camera: {archetype.camera_and_motion.camera}
    * Physics & Atmospherics: {archetype.camera_and_motion.physics_effects}
- Narrative Escalation Beats:
{beats_block}"""


def compile_dynamic_concept_slots(archetypes: List[StoryArchetypeConfig]) -> str:
    """
    Loops through sampled archetypes and compiles multi-archetype contrast directive.
    """
    blocks = []
    for idx, arch in enumerate(archetypes):
        blocks.append(compile_archetype_slots(arch, idx + 1))
    return "\n\n".join(blocks)


def hydrate_concept_from_archetype(concept: Dict[str, Any], archetype: Optional[StoryArchetypeConfig] = None) -> Dict[str, Any]:
    """
    Hydrates a generated concept dictionary with archetype slots if missing.
    Ensures downstream pipeline receives complete structured schema.
    """
    hydrated = dict(concept)
    if not archetype:
        arch_id = hydrated.get("story_archetype_id") or hydrated.get("story_id")
        if arch_id:
            archetype = get_archetype(arch_id)

    if archetype:
        hydrated.setdefault("story_archetype_id", archetype.story_id)
        hydrated.setdefault("genre", archetype.genre)
        hydrated.setdefault("visual_style", archetype.style_and_concept.aesthetic)
        hydrated.setdefault("style_and_concept", archetype.style_and_concept.model_dump())
        hydrated.setdefault("core_cast", [c.model_dump() for c in archetype.core_cast])
        hydrated.setdefault("environment_arc", archetype.environment_arc.model_dump())
        hydrated.setdefault("camera_and_motion", archetype.camera_and_motion.model_dump())
        hydrated.setdefault("plot_beats", list(archetype.plot_beats))
    return hydrated

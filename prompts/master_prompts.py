"""
Master Prompts Module: VIRAL ANTHROPOMORPHIC 3D PRODUCE & FRUIT DRAMA ENGINE.
Re-exports prompt templates, creative DNA, presets, formatters, and dynamic story archetypes.
"""

from prompts.presets import (
    ANTHROPOMORPHIC_PRODUCE_PRESET,
    FACETED_CRYSTAL_PRESET,
    AVAILABLE_PRESETS,
    get_preset,
    list_presets,
    register_preset,
    export_presets_to_disk,
)

from prompts.dna import (
    DEFAULT_CHARACTER_STYLE_DNA,
    MASTER_PIPELINE_INSTRUCTION,
    get_character_style_dna,
    set_character_style_dna,
    load_preset,
    reset_character_style_dna,
)

from prompts.story_archetypes import (
    StoryArchetypeConfig,
    StyleAndConcept,
    CastMemberArchetype,
    EnvironmentArc,
    CameraAndMotion,
    get_all_archetypes,
    get_archetype,
    register_archetype,
    sample_distinct_archetypes,
    compile_archetype_slots,
    compile_dynamic_concept_slots,
    hydrate_concept_from_archetype,
)

from prompts.phase1_prompts import (
    PHASE_1_CONCEPT_SYSTEM_PROMPT,
    PHASE_1_SCRIPT_SYSTEM_PROMPT,
    PHASE_1_SCRIPT_USER_TEMPLATE,
    PHASE_1_CONCEPT_USER_TEMPLATE,
    compile_phase1_concept_system_prompt,
    format_phase1_concept_prompt,
    format_phase1_prompt,
)

from prompts.phase2_prompts import (
    PHASE_2_CHARACTER_SYSTEM_PROMPT,
    PHASE_2_CHARACTER_USER_TEMPLATE,
    format_phase2_prompt,
)

from prompts.phase3_prompts import (
    PHASE_3_IMAGE_SYSTEM_PROMPT,
    PHASE_3_IMAGE_PROMPT_TEMPLATE,
    format_phase3_image_prompt,
)

from prompts.phase4_prompts import (
    PHASE_4_ANIMATION_SYSTEM_PROMPT,
    PHASE_4_ANIMATION_USER_TEMPLATE,
    format_phase4_motion_prompt,
)

from prompts.phase5_prompts import (
    CTA_PRESETS,
    PHASE_5_VIDEO_PROMPT_TEMPLATE,
    PHASE_5_SEO_SYSTEM_PROMPT,
    PHASE_5_THUMBNAIL_PROMPT_TEMPLATE,
    format_phase5_video_prompt,
    format_phase5_seo_prompt,
    format_phase5_thumbnail_prompt,
)

__all__ = [
    "CTA_PRESETS",
    "DEFAULT_CHARACTER_STYLE_DNA",
    "MASTER_PIPELINE_INSTRUCTION",
    "ANTHROPOMORPHIC_PRODUCE_PRESET",
    "FACETED_CRYSTAL_PRESET",
    "AVAILABLE_PRESETS",
    "get_preset",
    "list_presets",
    "register_preset",
    "load_preset",
    "get_character_style_dna",
    "set_character_style_dna",
    "reset_character_style_dna",
    "export_presets_to_disk",
    "StoryArchetypeConfig",
    "StyleAndConcept",
    "CastMemberArchetype",
    "EnvironmentArc",
    "CameraAndMotion",
    "get_all_archetypes",
    "get_archetype",
    "register_archetype",
    "sample_distinct_archetypes",
    "compile_archetype_slots",
    "compile_dynamic_concept_slots",
    "hydrate_concept_from_archetype",
    "PHASE_1_CONCEPT_SYSTEM_PROMPT",
    "PHASE_1_SCRIPT_SYSTEM_PROMPT",
    "PHASE_1_SCRIPT_USER_TEMPLATE",
    "PHASE_1_CONCEPT_USER_TEMPLATE",
    "compile_phase1_concept_system_prompt",
    "PHASE_2_CHARACTER_SYSTEM_PROMPT",
    "PHASE_2_CHARACTER_USER_TEMPLATE",
    "PHASE_3_IMAGE_SYSTEM_PROMPT",
    "PHASE_3_IMAGE_PROMPT_TEMPLATE",
    "PHASE_4_ANIMATION_SYSTEM_PROMPT",
    "PHASE_4_ANIMATION_USER_TEMPLATE",
    "PHASE_5_VIDEO_PROMPT_TEMPLATE",
    "PHASE_5_SEO_SYSTEM_PROMPT",
    "PHASE_5_THUMBNAIL_PROMPT_TEMPLATE",
    "format_phase1_concept_prompt",
    "format_phase1_prompt",
    "format_phase2_prompt",
    "format_phase3_image_prompt",
    "format_phase4_motion_prompt",
    "format_phase5_video_prompt",
    "format_phase5_seo_prompt",
    "format_phase5_thumbnail_prompt",
]

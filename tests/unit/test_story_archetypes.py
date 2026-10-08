"""
Unit and Integration Tests for Dynamic Story Archetypes & Concept Variation Engine.
Tests:
1. Pydantic validation of all 6 archetype configurations (v1 and v2 variants).
2. Dynamic sampling without static defaults (varying per generation).
3. Exclusion of previous archetype IDs on regeneration.
4. Compilation of archetype key/value slots into prompt templates.
5. Concept hydration and schema integrity.
6. Phase 1 script prompt compilation using selected concept slots.
"""

import pytest
from prompts.story_archetypes import (
    StoryArchetypeConfig,
    get_all_archetypes,
    get_archetype,
    sample_distinct_archetypes,
    compile_archetype_slots,
    compile_dynamic_concept_slots,
    hydrate_concept_from_archetype,
    RAW_ARCHETYPES_DATA,
)
from prompts.phase1_prompts import (
    compile_phase1_concept_system_prompt,
    format_phase1_concept_prompt,
    format_phase1_prompt,
    PHASE_1_CONCEPT_SYSTEM_PROMPT,
)


def test_archetypes_schema_validation():
    print("[Test 1] Testing Archetypes Pydantic Schema Validation...")
    all_archetypes = get_all_archetypes()
    assert len(all_archetypes) == 6, f"Expected 6 archetypes, got {len(all_archetypes)}"

    expected_ids = [
        "fruit_drama_01_baby_trafficking_v1",
        "fruit_drama_02_fitness_revenge_v1",
        "fruit_drama_03_the_honest_heir_v1",
        "fruit_drama_01_baby_trafficking_v2",
        "fruit_drama_02_fitness_revenge_v2",
        "fruit_drama_03_the_honest_heir_v2",
    ]

    for expected_id in expected_ids:
        arch = get_archetype(expected_id)
        assert arch is not None, f"Archetype '{expected_id}' not found"
        assert arch.story_id == expected_id
        assert len(arch.genre) > 0
        assert len(arch.core_cast) >= 3
        assert len(arch.plot_beats) == 5
        assert arch.environment_arc.act_1_crisis
        assert arch.environment_arc.act_4_climax
        assert arch.camera_and_motion.camera
    print("[PASS] Archetypes Schema Validation passed.")


def test_dynamic_sampling_no_static_defaults():
    print("[Test 2] Testing Dynamic Sampling without Static Defaults...")
    # Sample 3 archetypes multiple times
    samples = [sample_distinct_archetypes(count=3) for _ in range(10)]

    for sample in samples:
        assert len(sample) == 3
        ids = [a.story_id for a in sample]
        # Ensure no duplicates in a single generation
        assert len(set(ids)) == 3, f"Duplicate archetypes in single sample: {ids}"
        # Ensure diverse genres
        genres = [a.genre for a in sample]
        assert len(set(genres)) >= 2, f"Expected diverse genres in sample: {genres}"

    print("[PASS] Dynamic Sampling without Static Defaults passed.")


def test_regeneration_exclusion():
    print("[Test 3] Testing Regeneration Exclusion of Previous Archetypes...")
    # Simulate first generation
    first_gen = [
        "fruit_drama_01_baby_trafficking_v1",
        "fruit_drama_02_fitness_revenge_v1",
        "fruit_drama_03_the_honest_heir_v1",
    ]

    # Sample for regeneration excluding first_gen IDs
    regen_sample = sample_distinct_archetypes(count=3, exclude_ids=first_gen)
    regen_ids = [a.story_id for a in regen_sample]

    assert len(regen_sample) == 3
    # All sampled archetypes must be from the v2 variants (or not in first_gen)
    for s_id in regen_ids:
        assert s_id not in first_gen, f"Regenerated archetype {s_id} was not excluded from previous run"

    assert "fruit_drama_01_baby_trafficking_v2" in regen_ids
    assert "fruit_drama_02_fitness_revenge_v2" in regen_ids
    assert "fruit_drama_03_the_honest_heir_v2" in regen_ids
    print("[PASS] Regeneration Exclusion passed.")


def test_slot_compilation():
    print("[Test 4] Testing Archetype Slot Compilation into Prompts...")
    arch = get_archetype("fruit_drama_01_baby_trafficking_v1")
    slot_text = compile_archetype_slots(arch, 1)

    assert "OPTION 1 ARCHETYPE SEED" in slot_text
    assert "fruit_drama_01_baby_trafficking_v1" in slot_text
    assert "Viral Melodrama" in slot_text
    assert "vulnerable_mother" in slot_text
    assert "Overcrowded fluorescent maternity hospital ward" in slot_text
    assert "Snap-zooms on tears" in slot_text
    assert "Extreme multiple birth" in slot_text

    sampled = sample_distinct_archetypes(count=3)
    slots_combined = compile_dynamic_concept_slots(sampled)
    assert "OPTION 1 ARCHETYPE SEED" in slots_combined
    assert "OPTION 2 ARCHETYPE SEED" in slots_combined
    assert "OPTION 3 ARCHETYPE SEED" in slots_combined

    # Test dynamic system prompt and user prompt
    sys_prompt = compile_phase1_concept_system_prompt(sampled)
    assert "DYNAMIC ARCHETYPE SEEDS FOR THIS GENERATION" in sys_prompt
    assert sampled[0].story_id in sys_prompt

    user_prompt = format_phase1_concept_prompt("Revenge at the luxury gala", sampled)
    assert "Revenge at the luxury gala" in user_prompt
    assert "CRITICAL REQUIREMENT" in user_prompt
    assert sampled[1].story_id in user_prompt
    print("[PASS] Archetype Slot Compilation passed.")


def test_concept_hydration():
    print("[Test 5] Testing Concept Hydration from Archetype...")
    raw_llm_concept = {
        "id": 2,
        "title": "The Iron Scallion",
        "hook_3s": "Arthur rips off his oversized sweater revealing vascular striations.",
        "logline": "An emaciated scallion takes revenge on his bodybuilding dragon-fruit ex.",
        "big_twist": "The gym supplements were laced with glowing fertilizer.",
        "story_archetype_id": "fruit_drama_02_fitness_revenge_v1",
    }

    hydrated = hydrate_concept_from_archetype(raw_llm_concept)
    assert hydrated["genre"] == "Underdog Revenge / Fitness Melodrama"
    assert "vascular micro-textures" in hydrated["visual_style"]
    assert len(hydrated["core_cast"]) == 4
    assert hydrated["core_cast"][0]["role"] == "underdog_protagonist"
    assert len(hydrated["plot_beats"]) == 5
    assert hydrated["environment_arc"]["act_1_crisis"]
    assert hydrated["camera_and_motion"]["camera"]
    print("[PASS] Concept Hydration passed.")


def test_phase1_script_prompt_with_selected_concept():
    print("[Test 6] Testing Phase 1 Script Generation Prompt with Selected Concept Slots...")
    arch = get_archetype("fruit_drama_03_the_honest_heir_v1")
    selected_concept = hydrate_concept_from_archetype(
        {
            "id": 3,
            "title": "The Golden Core",
            "logline": "A poor apple street kid returns a lost black titanium card to a reclusive tycoon.",
            "big_twist": "The tycoon sees the carved family crest on the boy's peel.",
            "story_archetype_id": arch.story_id,
        },
        arch,
    )

    script_prompt = format_phase1_prompt(
        prompt="A poor apple street kid returns a lost card",
        selected_concept=selected_concept,
    )

    assert "The Golden Core" in script_prompt
    assert "Moral Parable / Luxury Prestige Drama" in script_prompt
    assert "protagonist_child" in script_prompt
    assert "Rain-slicked luxury hotel entrance" in script_prompt
    assert "Dynamic water splash simulations" in script_prompt
    assert "Poor street kid finds high-value item" in script_prompt
    print("[PASS] Phase 1 Script Generation Prompt with Selected Concept Slots passed.")


if __name__ == "__main__":
    test_archetypes_schema_validation()
    test_dynamic_sampling_no_static_defaults()
    test_regeneration_exclusion()
    test_slot_compilation()
    test_concept_hydration()
    test_phase1_script_prompt_with_selected_concept()
    print("\nALL DYNAMIC STORY ARCHETYPE & CONCEPT VARIATION TESTS PASSED SUCCESSFULLY!")

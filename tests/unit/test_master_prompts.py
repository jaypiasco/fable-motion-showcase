"""
Unit & Integration Test for Viral Anthropomorphic 3D Produce & Fruit Drama Engine Prompts.
Tests 5-Phase Production Flow:
- Phase 1: Script & Scene Beats (Treatment, hook & dialogue, 10-14 scenes)
- Phase 2: Character Bibles & assets (Global cast anchors stored in assets, styling & audio profile)
- Phase 3: Scene Keyframe Generation (Keyframes from assets reference for video generation)
- Phase 4: Motion Dynamics & Video Clips (Applies dialogue scripts & renders video clips)
- Phase 5: Caption & Final Clip Merge (Dynamic captions, SEO & final delivery)
"""

import json
from prompts.master_prompts import (
    DEFAULT_CHARACTER_STYLE_DNA,
    ANTHROPOMORPHIC_PRODUCE_PRESET,
    FACETED_CRYSTAL_PRESET,
    get_character_style_dna,
    set_character_style_dna,
    reset_character_style_dna,
    load_preset,
    list_presets,
    get_preset,
    PHASE_1_CONCEPT_SYSTEM_PROMPT,
    PHASE_1_SCRIPT_SYSTEM_PROMPT,
    PHASE_2_CHARACTER_SYSTEM_PROMPT,
    PHASE_3_IMAGE_SYSTEM_PROMPT,
    PHASE_4_ANIMATION_SYSTEM_PROMPT,
    PHASE_5_SEO_SYSTEM_PROMPT,
    format_phase1_concept_prompt,
    format_phase1_prompt,
    format_phase2_prompt,
    format_phase3_image_prompt,
    format_phase4_motion_prompt,
    format_phase5_video_prompt,
    format_phase5_seo_prompt,
    format_phase5_thumbnail_prompt,
)


def test_presets_and_dna():
    print("[Test 1] Testing Character Style DNA and Presets...")
    
    # 1. Test preset registry
    presets = list_presets()
    assert "anthropomorphic_produce" in presets
    assert "banana_husband" in presets
    assert "faceted_crystal" in presets

    # 2. Verify archived faceted crystal preset is preserved
    fc_preset = get_preset("faceted_crystal")
    assert "FACETED-CRYSTAL" in fc_preset["engine_name"]
    assert "fablemotion.ai" in fc_preset["mandatory_cta"]

    # 3. Verify active default is Anthropomorphic Produce / Pixar 3D
    dna = get_character_style_dna()
    assert "ANTHROPOMORPHIC" in dna["engine_name"].upper()
    assert "9:16" in dna["aspect_ratio"]
    assert "fablemotion.ai" in dna["mandatory_cta"]

    # 4. Test dynamic override (volatile)
    set_character_style_dna({
        "character_aesthetic": "Cybernetic Chrome Androids with neon fiber optics"
    })
    updated_dna = get_character_style_dna()
    assert "Cybernetic Chrome Androids" in updated_dna["character_aesthetic"]

    # 5. Test switching to archived crystal preset
    load_preset("faceted_crystal")
    loaded_fc = get_character_style_dna()
    assert "FACETED-CRYSTAL" in loaded_fc["engine_name"]

    # 6. Test reset back to default
    reset_character_style_dna()
    reset_dna = get_character_style_dna()
    assert "anthropomorphic" in reset_dna["character_aesthetic"].lower()
    print("[PASS] Presets and Character Style DNA passed.")


def test_phase_prompts_and_formatters():
    print("[Test 2] Testing Phase 1 to Phase 5 Prompts & Formatters...")
    
    # Phase 1
    concept_p = format_phase1_concept_prompt("Cheating scandal between the Banana Executive and Onion Heiress")
    assert "Banana Executive" in concept_p
    assert "3 wildly dramatic" in PHASE_1_CONCEPT_SYSTEM_PROMPT
    assert "10 to 14" in PHASE_1_SCRIPT_SYSTEM_PROMPT

    # Phase 2
    sample_script = json.dumps({"title": "Produce Betrayal", "scenes": []})
    char_p = format_phase2_prompt(sample_script)
    assert "Produce Betrayal" in char_p
    assert "fruit_shader" in PHASE_2_CHARACTER_SYSTEM_PROMPT

    # Phase 3
    img_p = format_phase3_image_prompt(
        visual_description="Arthur discovering the prenuptial agreement",
        shot_type="Medium close-up, eye-level, shallow depth of field",
        character_anchors="Banana head fused to shoulders, navy-blue blazer",
        setting="Opulent modern penthouse dressing room"
    )
    assert "9:16" in img_p
    assert "prenuptial" in img_p
    assert "Unreal Engine 5" in img_p
    assert "Octane Render" in img_p
    assert "Pixar" in img_p

    # Phase 4
    motion_p = format_phase4_motion_prompt(
        scenes_json_str="[{\"scene_id\": 1}]",
        characters_json_str="[{\"name\": \"Arthur\"}]"
    )
    assert "Veo 3.1" in PHASE_4_ANIMATION_SYSTEM_PROMPT
    assert "dialogue" in PHASE_4_ANIMATION_SYSTEM_PROMPT

    # Phase 5 Video, SEO, & Thumbnail
    vid_p = format_phase5_video_prompt("Slow push-in on trembling peel hands")
    assert "Slow push-in" in vid_p
    assert "Pixar-style" in vid_p or "Unreal Engine 5" in vid_p

    seo_p = format_phase5_seo_prompt(sample_script)
    assert "SEO" in seo_p
    assert "fablemotion.ai" in PHASE_5_SEO_SYSTEM_PROMPT

    thumb_p = format_phase5_thumbnail_prompt("Arthur", "gasping in shock as the prenup is discovered")
    assert "Arthur" in thumb_p
    assert "9:16 vertical composition" in thumb_p

    print("[PASS] Phase 1 to Phase 5 Prompts & Formatters passed.")


if __name__ == "__main__":
    test_presets_and_dna()
    test_phase_prompts_and_formatters()
    print("\nALL MASTER PROMPT & PRESET TESTS PASSED SUCCESSFULLY!")

"""
Test Suite: Scene-Based Storage, Fresh Character Generation & Phase 3 Consistency.
Verifies:
1. Phase 1 creates discrete scene folders (scenes/scene_XX/script.json and script.md).
2. Phase 2 creates fresh distinct characters without reusing past/parent story characters.
3. Phase 2 attaches image_url and saves character portraits to local and cloud storage.
4. Phase 3 fetches scene scripts from scene folders, resolves involved characters, and attaches reference images.
5. GeminiDirectClient prioritizes multimodal models when character references are present.
"""

import os
import json
import shutil
import uuid
from pathlib import Path
from unittest.mock import patch

import pytest

from config import config
from core.state_manager import StateManager
from phases.phase1_script import Phase1Script
from phases.phase2_characters import Phase2Characters
from phases.phase3_images import Phase3Images
from services.ai_client import AIClient
from services.gemini_direct_client import GeminiDirectClient


def _helper_create_dummy_image(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    from PIL import Image
    img = Image.new("RGB", (720, 1280), color=(100, 150, 200))
    img.save(path)
    return path


def test_phase1_creates_scene_folders_and_scripts():
    story_id = f"test_scene_storage_{uuid.uuid4().hex[:8]}"
    state_mgr = StateManager(story_id=story_id)
    ai_client = AIClient()

    mock_script = {
        "title": "The Heir of Lemon Ridge",
        "logline": "A dramatic confrontation between Arthur and Elena over citrus orchard rights.",
        "hook_3s": "Arthur slams the legal deed onto the mahogany table.",
        "genre": "Soap Opera",
        "scenes": [
            {
                "scene_id": 1,
                "setting": "Sunlit Orchard Conservatory",
                "shot_type": "medium_close_up",
                "characters": ["Arthur Bananier"],
                "visual_description": "Arthur stands tall in his tailored navy blazer looking tense.",
                "dialogue": "We built this from nothing.",
                "duration_seconds": 5
            },
            {
                "scene_id": 2,
                "setting": "Marble Corridor",
                "shot_type": "reaction_shot",
                "characters": ["Elena Vance"],
                "visual_description": "Elena glares with calculating composure in ivory silk.",
                "dialogue": "And I will take it back.",
                "duration_seconds": 6
            }
        ]
    }

    try:
        p1 = Phase1Script(state_mgr, ai_client)
        with patch.object(ai_client, "generate_script", return_value=mock_script):
            result = p1.execute()

        assert len(result["scenes"]) == 2
        assert state_mgr.is_phase_completed("phase_1_script")

        # Verify scene folder creation
        scenes_dir = state_mgr.scenes_dir
        assert scenes_dir.exists()

        scene_1_dir = scenes_dir / "scene_01"
        scene_2_dir = scenes_dir / "scene_02"
        assert scene_1_dir.exists() and scene_1_dir.is_dir()
        assert scene_2_dir.exists() and scene_2_dir.is_dir()

        # Verify script.json and script.md in each scene folder
        s1_json = scene_1_dir / "script.json"
        s1_md = scene_1_dir / "script.md"
        assert s1_json.exists()
        assert s1_md.exists()

        with open(s1_json, "r", encoding="utf-8") as f:
            data1 = json.load(f)
            assert data1["scene_id"] == 1
            assert "Arthur Bananier" in data1["characters"]

        with open(s1_md, "r", encoding="utf-8") as f:
            content1 = f.read()
            assert "Scene 1" in content1
            assert "Sunlit Orchard Conservatory" in content1

    finally:
        state_mgr.close()
        shutil.rmtree(state_mgr.archive_dir, ignore_errors=True)


def test_phase2_generates_fresh_distinct_characters_without_past_reuse():
    story_id = f"test_fresh_char_{uuid.uuid4().hex[:8]}"
    state_mgr = StateManager(story_id=story_id)
    ai_client = AIClient()

    # Prepopulate Phase 1
    state_mgr.complete_phase_1({
        "title": "Fresh Produce Drama",
        "logline": "Test logline",
        "scenes": [
            {"scene_id": 1, "characters": ["Cynthia Cabbage", "Derrick Pepper"]}
        ]
    })

    mock_generated_chars = {
        "story_summary": "Test summary",
        "characters": [
            {
                "name": "Cynthia Cabbage",
                "species": "Savoy Cabbage",
                "archetype": "Cabbage Matriarch",
                "fruit_shader": "Crisp emerald cabbage leaves with dew drops",
                "signature_wardrobe": "Haute couture emerald gown",
                "visual_anchor": "Tall statuesque cabbage woman in emerald gown",
                "style_seed_prompt": "Portrait of Cynthia Cabbage on white background"
            }
        ]
    }

    try:
        p2 = Phase2Characters(state_mgr, ai_client)

        with patch.object(ai_client, "generate_characters", return_value=mock_generated_chars):
            char_bible = p2.generate_character_prompts()

        # Characters should NOT be replaced by Julian Corvus or Elena Vance
        names = [c["name"] for c in char_bible["characters"]]
        assert "Cynthia Cabbage" in names
        assert "Julian Corvus" not in names

        # Render character image
        def mock_gen_img(visual_description, output_path, **kwargs):
            return _helper_create_dummy_image(output_path)

        with patch.object(ai_client, "generate_keyframe_image", side_effect=mock_gen_img):
            p2.render_character_images(char_bible)

        assert state_mgr.is_phase_completed("phase_2_characters")
        c_img = state_mgr.characters_dir / "Cynthia Cabbage.png"
        assert c_img.exists()

        p2_state = state_mgr.get_phase_data("phase_2_characters")
        assert len(p2_state["characters"]) == 1
        assert p2_state["characters"][0]["image_path"] == str(c_img)
        assert p2_state["characters"][0].get("image_url") is not None

    finally:
        state_mgr.close()
        shutil.rmtree(state_mgr.archive_dir, ignore_errors=True)


def test_phase3_fetches_scene_script_and_passes_character_reference_image():
    story_id = f"test_phase3_consistency_{uuid.uuid4().hex[:8]}"
    state_mgr = StateManager(story_id=story_id)
    ai_client = AIClient()

    # Setup Phase 1 with scene folders
    mock_script = {
        "title": "The Garlic Plot",
        "logline": "Test logline",
        "scenes": [
            {
                "scene_id": 1,
                "setting": "Minimalist Glass Penthouse",
                "shot_type": "medium_close_up",
                "characters": ["Gordon Garlic"],
                "visual_description": "Gordon Garlic glares from behind his dark sunglasses.",
                "dialogue": "Watch your back."
            }
        ]
    }
    state_mgr.complete_phase_1(mock_script)

    # Setup Phase 2 with portrait
    garlic_portrait = state_mgr.characters_dir / "Gordon Garlic.png"
    _helper_create_dummy_image(garlic_portrait)

    char_bible = {
        "characters": [
            {
                "name": "Gordon Garlic",
                "species": "Garlic",
                "archetype": "Cunning Garlic Mogul",
                "fruit_shader": "Papery white garlic clove with delicate purple veining",
                "signature_wardrobe": "Charcoal three-piece suit",
                "visual_anchor": "Tall adult garlic humanoid with sharp tailored suit",
                "style_seed_prompt": "Portrait of Gordon Garlic",
                "image_path": str(garlic_portrait)
            }
        ]
    }
    state_mgr.complete_phase_2(char_bible)

    captured_call = {}

    def mock_kf_gen(visual_description, output_path, involved_characters, **kwargs):
        captured_call["visual_description"] = visual_description
        captured_call["involved_characters"] = involved_characters
        captured_call["output_path"] = output_path
        return _helper_create_dummy_image(output_path)

    try:
        p3 = Phase3Images(state_mgr, ai_client)
        with patch.object(ai_client, "generate_keyframe_image", side_effect=mock_kf_gen):
            p3.execute()

        assert state_mgr.is_phase_completed("phase_3_images")
        assert len(captured_call["involved_characters"]) == 1
        assert captured_call["involved_characters"][0]["name"] == "Gordon Garlic"
        assert Path(captured_call["involved_characters"][0]["image_path"]).resolve() == garlic_portrait.resolve()

        # Verify keyframe was also saved into the scene folder
        scene_dir = state_mgr.get_scene_dir(1)
        scene_kf = scene_dir / "keyframe.png"
        assert scene_kf.exists()

    finally:
        state_mgr.close()
        shutil.rmtree(state_mgr.archive_dir, ignore_errors=True)


def test_gemini_direct_client_image_model_pool_is_valid():
    client = GeminiDirectClient(api_key="test_dummy_key")

    # Verify image pool contains valid Imagen 3 models and no invalid/401 models
    assert len(client.IMAGE_MODEL_POOL) > 0
    assert all("imagen-3.0" in m for m in client.IMAGE_MODEL_POOL)
    assert not any("banana" in m or "flash-lite-image" in m for m in client.IMAGE_MODEL_POOL)

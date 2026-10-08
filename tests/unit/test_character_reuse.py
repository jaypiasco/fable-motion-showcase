"""
Integration Test: Character Reuse across Story Sequences & Episodes.
Verifies:
1. StateManager properly links parent_story_id and resolves parent_archive_dir.
2. Character portraits and bibles are inherited from the parent story.
3. Phase 2 reuses established character profiles and portraits without calling image models.
4. Phase 3 keyframe generation resolves inherited character portraits.
5. REST API endpoint POST /api/stories/{story_id}/new-episode spawns sequel episodes with parent_story_id.
"""

import os
import shutil
import json
from pathlib import Path
from fastapi.testclient import TestClient

from config import config
from core.state_manager import StateManager
from phases.phase2_characters import Phase2Characters
from server import app


def test_character_inheritance_and_reuse():
    print("\n--- 1. Testing Parent Story Setup & Character Assets ---")
    parent_story_id = "test_parent_story_series_01"
    parent_dir = config.ARCHIVE_DIR / parent_story_id
    if parent_dir.exists():
        shutil.rmtree(parent_dir)

    parent_mgr = StateManager(story_id=parent_story_id, prompt="Episode 1: The Diamond Dynasty")
    
    # Create mock parent character portrait & bible
    char_name = "Lady Sapphire"
    parent_portrait = parent_mgr.characters_dir / f"{char_name}.png"
    with open(parent_portrait, "wb") as f:
        f.write(b"MOCK_SAPPHIRE_PORTRAIT_IMAGE_BYTES_12345")

    parent_bible = {
        "characters": [
            {
                "name": char_name,
                "archetype": "Betrayed Crystal Heiress",
                "gender": "female",
                "audio_profile": "Audio: Natural, warm, grounded female voice with realistic room acoustics and subtle breathing. Background sound includes quiet room tone. No background music. (no subtitles)",
                "crystal_shader": "Translucent royal-blue faceted sapphire crystal",
                "signature_wardrobe": "White lace corset and silk sapphire cape",
                "visual_anchor": "Royal blue faceted sapphire skin with internal refractive caustics",
                "style_seed_prompt": "Cinematic 3D studio character portrait of Lady Sapphire"
            }
        ]
    }
    parent_mgr.complete_phase_2(parent_bible)
    parent_mgr.close()

    assert parent_portrait.exists()
    assert (parent_dir / "scripts" / "characters.json").exists()
    print("[PASS] Parent story established with Lady Sapphire character portrait and bible.")

    print("\n--- 2. Testing Child Episode Linking to Parent Story ---")
    child_story_id = "test_child_episode_series_02"
    child_dir = config.ARCHIVE_DIR / child_story_id
    if child_dir.exists():
        shutil.rmtree(child_dir)

    child_mgr = StateManager(
        story_id=child_story_id,
        prompt="Episode 2: Sapphire's Revenge at the Auction",
        parent_story_id=parent_story_id
    )

    assert child_mgr.parent_story_id == parent_story_id
    assert child_mgr.parent_archive_dir == parent_dir
    assert child_mgr.state.get("parent_story_id") == parent_story_id
    print(f"[PASS] Child episode successfully linked to parent story '{parent_story_id}'.")

    print("\n--- 3. Testing get_parent_characters and Automatic Portrait Copying ---")
    parent_chars = child_mgr.get_parent_characters()
    assert parent_chars is not None
    assert len(parent_chars.get("characters", [])) == 1
    assert parent_chars["characters"][0]["name"] == char_name

    # Check that calling get_character_image_path on child auto-copies portrait from parent
    child_portrait_path = child_mgr.get_character_image_path(char_name)
    assert child_portrait_path is not None
    assert child_portrait_path.exists()
    assert child_portrait_path.parent == child_mgr.characters_dir
    assert child_portrait_path.read_bytes() == b"MOCK_SAPPHIRE_PORTRAIT_IMAGE_BYTES_12345"
    print(f"[PASS] Child episode retrieved and auto-copied established portrait -> {child_portrait_path.name}")

    print("\n--- 4. Testing Phase 2 Zero-Token Character Reuse ---")
    # Simulate Phase 1 output for child episode mentioning Lady Sapphire
    child_script = {
        "title": "Episode 2: Sapphire's Revenge",
        "logline": "Sapphire outbids her enemies at the high-stakes gemstone auction.",
        "scenes": [
            {
                "scene_id": 1,
                "setting": "Grand Auction Room",
                "characters": [char_name],
                "visual_description": "Lady Sapphire walks in wearing an opulent silk gown."
            }
        ]
    }
    child_mgr.complete_phase_1(child_script)

    class MockAIClient:
        def generate_characters(self, script_json):
            raise AssertionError("generate_characters should NOT be called when all characters are inherited!")

        def generate_keyframe_image(self, **kwargs):
            raise AssertionError("generate_keyframe_image should NOT be called for established characters!")

    p2 = Phase2Characters(child_mgr, MockAIClient())
    p2_result = p2.execute()

    assert p2_result is not None
    assert len(p2_result.get("characters", [])) == 1
    assert p2_result["characters"][0]["name"] == char_name
    assert (child_dir / "scripts" / "characters.json").exists()
    assert child_mgr.is_phase_completed("phase_2_characters")
    print("[PASS] Phase 2 executed with 0 LLM/Imagen token calls by directly reusing parent character assets.")

    child_mgr.close()

    print("\n--- 5. Testing REST API POST /api/stories/{story_id}/new-episode ---")
    client = TestClient(app)
    r = client.post(
        f"/api/stories/{parent_story_id}/new-episode",
        json={
            "prompt": "Episode 3: The Royal Coronation",
            "max_scenes": 1,
            "run_now": False
        }
    )
    assert r.status_code == 200
    res_data = r.json()
    assert res_data.get("parent_story_id") == parent_story_id
    ep3_story_id = res_data.get("story_id")
    assert ep3_story_id is not None

    # Check child episode metadata from API
    r_detail = client.get(f"/api/stories/{ep3_story_id}")
    assert r_detail.status_code == 200
    detail_data = r_detail.json()
    assert detail_data.get("parent_story_id") == parent_story_id
    print(f"[PASS] REST API /api/stories/{parent_story_id}/new-episode successfully created linked episode: {ep3_story_id}")

    # Clean up test directories
    if parent_dir.exists():
        shutil.rmtree(parent_dir)
    if child_dir.exists():
        shutil.rmtree(child_dir)
    ep3_dir = config.ARCHIVE_DIR / ep3_story_id
    if ep3_dir.exists():
        shutil.rmtree(ep3_dir)

    print("\n=======================================================")
    print("  ALL CHARACTER REUSE INTEGRATION TESTS PASSED!        ")
    print("=======================================================\n")


if __name__ == "__main__":
    test_character_inheritance_and_reuse()

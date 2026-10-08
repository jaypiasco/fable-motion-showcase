import pytest
from unittest.mock import patch, MagicMock
from pathlib import Path
import json

from core.state_manager import StateManager
from phases.phase1_script import Phase1Script
from phases.phase3_images import Phase3Images
from phases.phase4_motion import Phase4Motion
from api.enricher import enrich_story_details

MOCK_VIRAL_HOOK = "Watch me lift the entire world, Elena."

MOCK_SCRIPT_WITH_HOOK = {
    "title": "The Golden Banana Revenge",
    "logline": "Arthur Bananier returns transformed to confront Elena Vance.",
    "hook_3s": MOCK_VIRAL_HOOK,
    "genre": "Viral 3D Fruit Soap-Opera Drama",
    "aspect_ratio": "9:16",
    "scenes": [
        {
            "scene_id": 1,
            "timestamp": "00:00 - 00:04",
            "setting": "Opulent Gold Marble Penthouse",
            "shot_type": "extreme_close_up",
            "visual_description": "Arthur Bananier glares directly into the camera lens with burning intensity.",
            "characters": ["Arthur Bananier"],
            "dialogue": f'Arthur says: "{MOCK_VIRAL_HOOK}"',
            "voiceover": f'Arthur: "{MOCK_VIRAL_HOOK}"',
            "hook_3s": MOCK_VIRAL_HOOK,
            "duration_seconds": 4
        }
    ]
}

def test_scene1_viral_hook_synchronization():
    import uuid
    import shutil
    story_id = f"test_hook_story_{uuid.uuid4().hex[:8]}"
    state_mgr = StateManager(story_id=story_id)
    story_dir = state_mgr.archive_dir
    state_mgr.state["selected_concept"] = {
        "title": "The Golden Banana Revenge",
        "hook_3s": MOCK_VIRAL_HOOK
    }
    state_mgr._persist_state()

    try:
        # Phase 1: Complete script with hook
        state_mgr.complete_phase_1(MOCK_SCRIPT_WITH_HOOK)
        p1_data = state_mgr.get_phase_data("phase_1_script")
        assert p1_data["hook_3s"] == MOCK_VIRAL_HOOK
        assert p1_data["scenes"][0]["hook_3s"] == MOCK_VIRAL_HOOK

        # Phase 3: Verify keyframe prompt captures hyper-viral 3-second retention hook showrunner directive
        mock_ai = MagicMock()
        p3 = Phase3Images(state_mgr, mock_ai)
        
        saved_prompts = []
        def fake_generate_keyframe_image(visual_description, output_path, **kwargs):
            saved_prompts.append(visual_description)
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            Path(output_path).write_bytes(b"fake_image_bytes")
            return output_path

        mock_ai.generate_keyframe_image.side_effect = fake_generate_keyframe_image
        p3.execute()

        assert len(saved_prompts) == 1
        prompt_sent = saved_prompts[0]
        assert "HYPER-VIRAL 3-SECOND RETENTION HOOK" in prompt_sent
        assert "TikTok/Shorts/Reels High Retention" in prompt_sent
        # Crucial: Spoken dialogue must NOT be passed to the still image prompt to prevent burned-in captions/subtitles
        assert MOCK_VIRAL_HOOK not in prompt_sent
        assert "strictly NO subtitles" in prompt_sent or "textless" in prompt_sent.lower()

        # Phase 4: Verify motion prompts speak the hook in dialogue overlay
        mock_ai.generate_animation_prompts.return_value = [
            {
                "scene_id": 1,
                "action_description": "Arthur steps forward",
                "camera_dynamics": "Rapid push-in to Arthur's glowing eyes"
            }
        ]
        p4 = Phase4Motion(state_mgr, mock_ai)
        motion_items = p4.generate_motion_prompts(force_regenerate=True)
        assert len(motion_items) == 1
        assert motion_items[0]["scene_id"] == 1
        assert motion_items[0]["hook_3s"] == MOCK_VIRAL_HOOK
        assert MOCK_VIRAL_HOOK in motion_items[0]["dialogue"]
        assert MOCK_VIRAL_HOOK in motion_items[0]["motion_prompt"]
        assert "Hyper-viral 3-second opening retention hook choreography" in motion_items[0]["motion_prompt"]

        # Enricher: Check frontend data enrichment
        enriched = enrich_story_details(story_dir)
        p1_enriched = enriched["phases"]["phase_1_script"]
        assert p1_enriched["idea"]["hook_3s"] == MOCK_VIRAL_HOOK
        assert p1_enriched["scenes"][0]["hook_3s"] == MOCK_VIRAL_HOOK
        assert MOCK_VIRAL_HOOK in p1_enriched["scenes"][0]["voiceover"]

        p3_enriched = enriched["phases"]["phase_3_images"]
        assert p3_enriched["items"][0]["hook_3s"] == MOCK_VIRAL_HOOK
    finally:
        state_mgr.close()
        shutil.rmtree(story_dir, ignore_errors=True)

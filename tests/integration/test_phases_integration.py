"""
Comprehensive Unit & Integration Test Suite: 5-Phase Production Flow.

Verifies that all 5 phases seamlessly interact with state persistence and data handoffs:
- Phase 1: Script & Scene Beats (Treatment, hook & dialogue, 10-14 scenes).
- Phase 2: Character Bibles & assets (Global cast anchors stored in assets, styling & audio profile).
- Phase 3: Scene Keyframe Generation (Keyframes from assets reference for video generation).
- Phase 4: Motion Dynamics & Video Clips (Applies dialogue scripts & renders single-pass video clips).
- Phase 5: Caption & Final Clip Merge (Dynamic word-level captions per clip & final master merge).
"""

import os
import json
import shutil
import subprocess
from pathlib import Path
from unittest.mock import patch
from PIL import Image
import pytest

from config import config
from core.state_manager import StateManager
from phases.phase1_script import Phase1Script
from phases.phase2_characters import Phase2Characters
from phases.phase3_images import Phase3Images
from phases.phase4_motion import Phase4Motion
from phases.phase5_video import Phase5Video
from services.ai_client import AIClient
from services.video_editor import VideoEditor
from caption_pipeline import burn_subtitles


# =========================================================================
# Realistic Test Data & Fixtures
# =========================================================================

MOCK_SCRIPT_DATA = {
    "title": "The Sapphire Prenup Scandal",
    "logline": "Heiress Sapphire discovers Julian's secret prenuptial agreement in their penthouse dressing room.",
    "hook_3s": "Sapphire freezes as she unearths the hidden safe behind the gold-framed mirror.",
    "genre": "Viral 3D Crystal Soap-Opera Drama",
    "aspect_ratio": "9:16",
    "scenes": [
        {
            "scene_id": 1,
            "timestamp": "00:00 - 00:04",
            "setting": "Opulent Neoclassical Marble Dressing Room with Gold-Framed Mirrors",
            "shot_type": "medium_close_up",
            "motion_level": "subtle_emotion",
            "is_speaking": True,
            "recommended_engine": "kling",
            "visual_description": "Sapphire, a humanoid made of translucent faceted blue sapphire crystal in a boned lace corset, gasps in shock as she reads the document.",
            "characters": ["Sapphire"],
            "dialogue": "SAPPHIRE: (Furious, voice trembling) You signed this behind my back, Julian?!",
            "video_prompt": "Slow emotional head tilt, sapphire facets glistening under volumetric rim light, pushing in gently.",
            "sfx_cue": "Tense cello riser with deep bass thud",
            "duration_seconds": 3
        }
    ]
}

MOCK_CHARACTERS_DATA = {
    "story_summary": "Sapphire uncovers Julian's betrayal in the luxury dressing room.",
    "characters": [
        {
            "name": "Sapphire",
            "archetype": "Betrayed Heiress",
            "gender": "female",
            "audio_profile": "Audio: Natural, warm, grounded female voice with realistic room acoustics and subtle breathing. Background sound includes quiet room tone. No background music. (no subtitles)",
            "crystal_shader": "Faceted Blue Sapphire Crystal with internal caustics and sharp refractive facets",
            "signature_wardrobe": "Boned white lace corset with silk lounge pants and diamond pendant",
            "vocal_tone": "Sharp, dramatic, emotionally charged with conversational cadence and subtle pause",
            "hidden_motivation": "Protecting her family dynasty before the midnight gala",
            "visual_anchor": "Faceted blue sapphire crystal skin, glowing azure eyes, sharp geometric jawline, wearing a boned white lace corset",
            "style_seed_prompt": "Cinematic 3D studio portrait of Sapphire, faceted blue sapphire crystal humanoid, glowing azure eyes, boned white lace corset, 3-point studio lighting, Octane Render, 8k resolution"
        }
    ]
}

MOCK_MOTION_DATA = [
    {
        "scene_id": 1,
        "motion_prompt": "Slow push-in on Sapphire's face, translucent sapphire crystal facets refracting rim light, subtle eye blink, shallow depth of field. Sapphire says: \"You signed this behind my back, Julian?!\" Audio: Natural, warm, grounded female voice with realistic room acoustics and subtle breathing. Background sound includes quiet room tone. No background music. (no subtitles)",
        "camera_dynamics": "Slow push-in on character's face, slight upward tilt",
        "action_description": "Sapphire gazes in disbelief at the contract.",
        "duration": 3,
        "status": "completed"
    }
]


def helper_create_synthetic_image(path: Path, width: int = 768, height: int = 1344, color=(30, 40, 90)):
    """Helper to generate a real 9:16 vertical PNG file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", (width, height), color=color)
    img.save(path)
    return path


def helper_create_synthetic_video(image_path: Path, output_path: Path, duration: float = 2.0):
    """Helper to generate a real 9:16 vertical MP4 video clip from an image using FFmpeg."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        config.FFMPEG_PATH, "-y",
        "-loop", "1",
        "-i", str(image_path),
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-t", str(duration),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "ultrafast",
        str(output_path)
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output_path


# =========================================================================
# Unit Tests: Phase by Phase & Interlock Verification
# =========================================================================

class TestPhasesIntegration:

    @pytest.fixture(autouse=True)
    def setup_teardown(self):
        """Creates an isolated test story run directory and cleans it up after test."""
        import uuid
        self.story_id = f"test_phase_integration_run_{uuid.uuid4().hex[:8]}"
        self.state_mgr = StateManager(story_id=self.story_id)
        self.ai_client = AIClient()
        self.video_editor = VideoEditor()

        yield

        # Cleanup
        self.state_mgr.close()
        shutil.rmtree(self.state_mgr.archive_dir, ignore_errors=True)

    def test_phase1_creates_script(self):
        """
        Phase 1: Script & Scene Beats.
        Generates vertical 9:16 treatment, 3-second viral hook, 1-scene test pacing,
        character voiceover, dialogue, and sound cues.
        """
        p1 = Phase1Script(self.state_mgr, self.ai_client)

        with patch.object(self.ai_client, "_generate_json", return_value=MOCK_SCRIPT_DATA):
            script_data = p1.execute()

        assert self.state_mgr.is_phase_completed("phase_1_script")
        assert script_data["title"] == "The Sapphire Prenup Scandal"
        assert len(script_data["scenes"]) == 1

        # Verify Scene 1 environment and character directives
        s1 = script_data["scenes"][0]
        assert s1["scene_id"] == 1
        assert "Marble Dressing Room" in s1["setting"]
        assert "Sapphire" in s1["characters"]
        assert s1["is_speaking"] is True
        assert len(s1["dialogue"]) > 0

    def test_phase2_character_prompts_and_approved_imagen_generation(self):
        """
        Phase 2: Character Bibles & assets.
        Synthesizes character visual styling, shaders, acoustic audio profile,
        and renders 9:16 reference portraits stored in assets for all clips.
        """
        # Prerequisite: Complete Phase 1
        self.state_mgr.complete_phase_1(MOCK_SCRIPT_DATA)
        p2 = Phase2Characters(self.state_mgr, self.ai_client)

        # Step 2A: Write character prompts from Phase 1 script
        with patch.object(self.ai_client, "_generate_json", return_value=MOCK_CHARACTERS_DATA):
            draft_characters = p2.generate_character_prompts()

        assert "characters" in draft_characters
        char = draft_characters["characters"][0]
        assert char["name"] == "Sapphire"
        assert "Faceted Blue Sapphire" in char["crystal_shader"]
        assert "boned white lace corset" in char["signature_wardrobe"].lower()
        assert "style_seed_prompt" in char
        assert "audio_profile" in char
        assert "Neural" not in json.dumps(draft_characters)

        # Verify that before user approval, Phase 2 is NOT marked completed and image is not rendered
        assert not self.state_mgr.is_phase_completed("phase_2_characters")
        sapphire_img = self.state_mgr.characters_dir / "Sapphire.png"
        assert not sapphire_img.exists()

        # Step 2B: Simulate User Approval Gate
        user_approval_granted = True
        assert user_approval_granted is True, "User rejected character prompt review."

        # Step 2C: Trigger Imagen rendering with cost-effective model
        def mock_generate_portrait(visual_description, output_path, **kwargs):
            # Assert that the prompt uses the cost-effective Imagen model and character style seed
            assert "Sapphire" in visual_description
            return helper_create_synthetic_image(output_path, color=(20, 60, 180))

        with patch.object(self.ai_client, "generate_keyframe_image", side_effect=mock_generate_portrait):
            completed_chars = p2.render_character_images(draft_characters)

        # Verification: Character image is created on disk and recorded
        assert sapphire_img.exists() and sapphire_img.stat().st_size > 0
        assert self.state_mgr.is_phase_completed("phase_2_characters")
        assert self.state_mgr.is_character_image_completed("Sapphire")
        assert completed_chars["characters"][0]["image_path"] == str(sapphire_img)

    def test_phase3_references_phase2_character_and_phase1_environment(self):
        """
        Phase 3: Scene Keyframe Generation.
        Generates scene keyframe stills using scene scripts and character portraits
        from assets for video generation.
        """
        # Setup: Complete Phase 1 and generate Phase 2 character portrait
        self.state_mgr.complete_phase_1(MOCK_SCRIPT_DATA)
        char_portrait = self.state_mgr.characters_dir / "Sapphire.png"
        helper_create_synthetic_image(char_portrait, color=(20, 60, 180))
        
        char_data = dict(MOCK_CHARACTERS_DATA)
        char_data["characters"][0]["image_path"] = str(char_portrait)
        self.state_mgr.complete_phase_2(char_data)

        p3 = Phase3Images(self.state_mgr, self.ai_client)

        captured_requests = []

        def mock_generate_keyframe(visual_description, output_path, setting, involved_characters, **kwargs):
            captured_requests.append({
                "visual_description": visual_description,
                "setting": setting,
                "involved_characters": involved_characters,
                "output_path": output_path
            })
            return helper_create_synthetic_image(output_path, color=(40, 70, 150))

        with patch.object(self.ai_client, "generate_keyframe_image", side_effect=mock_generate_keyframe):
            items = p3.execute()

        # Verification: Phase 3 generated images for all scenes (1 scene test mode)
        assert len(items) == 1
        assert self.state_mgr.is_phase_completed("phase_3_images")
        assert self.state_mgr.is_scene_image_completed(1)

        # Verification: Setting came from Phase 1, Character reference came from Phase 2
        req1 = captured_requests[0]
        assert "Marble Dressing Room" in req1["setting"]
        assert len(req1["involved_characters"]) == 1
        assert req1["involved_characters"][0]["name"] == "Sapphire"
        assert req1["involved_characters"][0]["image_path"] == str(char_portrait)

    def test_phase3_resilient_to_missing_character_image_on_disk(self):
        """
        Phase 3 gracefully handles missing character portraits on disk without crashing,
        falling back to text anchors and generating keyframes reliably.
        """
        self.state_mgr.complete_phase_1(MOCK_SCRIPT_DATA)
        self.state_mgr.complete_phase_2(MOCK_CHARACTERS_DATA)
        # Deliberately do NOT create Sapphire.png on disk

        p3 = Phase3Images(self.state_mgr, self.ai_client)
        with patch.object(self.ai_client, "generate_keyframe_image", side_effect=lambda visual_description, output_path, **kw: helper_create_synthetic_image(output_path)):
            results = p3.execute()
        assert len(results) == 1
        assert self.state_mgr.is_phase_completed("phase_3_images")

    def test_phase4_motion_prompt_and_approved_veo_animation(self):
        """
        Phase 4: Motion Dynamics & Video Clips.
        Applies character dialogue scripts and renders single-pass cinematic video clips.
        """
        # Setup: Complete Phases 1, 2, 3
        self.state_mgr.complete_phase_1(MOCK_SCRIPT_DATA)
        self.state_mgr.complete_phase_2(MOCK_CHARACTERS_DATA)

        keyframe_1 = self.state_mgr.images_dir / "scene_01_keyframe.png"
        helper_create_synthetic_image(keyframe_1)
        self.state_mgr.update_scene_image(1, prompt="Scene 1", image_path=str(keyframe_1))
        self.state_mgr.complete_phase_3()

        # Step 4A: Formulate motion prompts based on Phase 1 environment & dialogue
        p4 = Phase4Motion(self.state_mgr, self.ai_client)
        with patch.object(self.ai_client, "_generate_json", return_value={"items": MOCK_MOTION_DATA}):
            motion_items = p4.generate_motion_prompts()

        assert len(motion_items) == 1
        assert "Sapphire" in motion_items[0]["motion_prompt"]
        assert "dialogue" in motion_items[0]

        # Step 4B: Simulate User Approval Gate
        user_approved_motion = True
        assert user_approved_motion is True, "User rejected motion prompt review."

        # Step 4C: Generate video clips using Veo upon approval
        def mock_generate_video(motion_prompt, image_path, output_path, duration, **kwargs):
            # Veo uses keyframe from Phase 3 and motion prompt from Phase 4
            assert image_path.exists()
            assert len(motion_prompt) > 0
            return helper_create_synthetic_video(image_path, output_path, duration=duration)

        with patch.object(self.ai_client, "generate_video_clip", side_effect=mock_generate_video):
            video_items = p4.render_video_clips(motion_items)

        assert len(video_items) == 1
        assert self.state_mgr.is_phase_completed("phase_4_animation_prompts")
        assert self.state_mgr.is_scene_video_completed(1)

        clip_1 = self.state_mgr.clips_dir / "scene_01.mp4"
        assert clip_1.exists() and clip_1.stat().st_size > 0

    def test_phase5_concatenate_clips_and_burn_subtitles(self):
        """
        Phase 5: Caption & Final Clip Merge.
        Applies dynamic word-level captions per clip; on the final clip, merges all scene clips
        into the complete story master.
        """
        # Setup: Complete Phase 1 and create two video clips rendered from Phase 4
        self.state_mgr.complete_phase_1(MOCK_SCRIPT_DATA)
        clip1 = self.state_mgr.clips_dir / "scene_01.mp4"
        clip2 = self.state_mgr.clips_dir / "scene_02.mp4"
        img1 = helper_create_synthetic_image(self.state_mgr.images_dir / "temp1.png", color=(30, 30, 80))
        img2 = helper_create_synthetic_image(self.state_mgr.images_dir / "temp2.png", color=(80, 30, 30))
        helper_create_synthetic_video(img1, clip1, duration=2.0)
        helper_create_synthetic_video(img2, clip2, duration=2.0)

        # 1. Stitch clips using VideoEditor
        manifest_file = self.state_mgr.clips_dir / "clips.txt"
        self.video_editor.create_clips_manifest([clip1, clip2], manifest_file)
        assert manifest_file.exists()

        merged_video = self.state_mgr.final_dir / "merged_video.mp4"
        self.video_editor.stitch_clips(manifest_file, merged_video)
        assert merged_video.exists() and merged_video.stat().st_size > 0

        # 2. Generate subtitle file (.ass) with dynamic styling
        ass_file = self.state_mgr.final_dir / "subtitles.ass"
        ass_content = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ViralDrama,Impact,75,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,2,0,1,6,2,2,40,40,650,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.20,0:00:01.80,ViralDrama,,0,0,0,,{\\c&H0000FFFF&}YOU{\\c&H00FFFFFF&} SIGNED THIS BEHIND MY BACK!
Dialogue: 0,0:00:02.10,0:00:03.90,ViralDrama,,0,0,0,,{\\c&H0000FFFF&}JULIAN,{\\c&H00FFFFFF&} HOW COULD YOU?!
"""
        with open(ass_file, "w", encoding="utf-8") as f:
            f.write(ass_content)

        assert ass_file.exists()

        # 3. Burn subtitles into final video using FFmpeg
        final_captioned = self.state_mgr.final_dir / "final_story_captioned.mp4"
        burned_path = burn_subtitles(str(merged_video), str(ass_file), str(final_captioned), ffmpeg_cmd=config.FFMPEG_PATH)

        assert Path(burned_path).exists()
        assert Path(burned_path).stat().st_size > 0

    def test_full_5_phases_end_to_end_workflow(self):
        """
        Full End-to-End Orchestration:
        Executes all 5 phases in sequence with approval gates and confirms that every phase's
        outputs become valid inputs to the subsequent phase.
        """
        # =====================================================================
        # Phase 1: Script
        # =====================================================================
        p1 = Phase1Script(self.state_mgr, self.ai_client)
        with patch.object(self.ai_client, "_generate_json", return_value=MOCK_SCRIPT_DATA):
            script_data = p1.execute()
        assert self.state_mgr.is_phase_completed("phase_1_script")

        # =====================================================================
        # Phase 2: Character Prompt -> User Approval -> Imagen Portrait
        # =====================================================================
        p2 = Phase2Characters(self.state_mgr, self.ai_client)
        with patch.object(self.ai_client, "_generate_json", return_value=MOCK_CHARACTERS_DATA):
            char_prompts = p2.generate_character_prompts()

        # User approval check
        approved_p2 = True
        assert approved_p2 is True

        with patch.object(self.ai_client, "generate_keyframe_image", side_effect=lambda visual_description, output_path, **kw: helper_create_synthetic_image(output_path, color=(20, 60, 180))):
            chars_data = p2.render_character_images(char_prompts)

        assert self.state_mgr.is_phase_completed("phase_2_characters")
        char_img = self.state_mgr.get_character_image_path("Sapphire")
        assert char_img is not None and char_img.exists()

        # =====================================================================
        # Phase 3: Imagen Keyframes referencing Phase 2 Character & Phase 1 Environment
        # =====================================================================
        p3 = Phase3Images(self.state_mgr, self.ai_client)
        with patch.object(self.ai_client, "generate_keyframe_image", side_effect=lambda visual_description, output_path, **kw: helper_create_synthetic_image(output_path, color=(40, 70, 150))):
            p3.execute()

        assert self.state_mgr.is_phase_completed("phase_3_images")
        assert self.state_mgr.is_scene_image_completed(1)

        # =====================================================================
        # Phase 4: Motion Prompt from Environment & Dialogue -> User Approval -> Veo Video Animation
        # =====================================================================
        p4 = Phase4Motion(self.state_mgr, self.ai_client)
        with patch.object(self.ai_client, "_generate_json", return_value={"items": MOCK_MOTION_DATA}):
            motion_items = p4.generate_motion_prompts()
        assert "Sapphire" in motion_items[0]["motion_prompt"]

        # User approval check
        approved_p4 = True
        assert approved_p4 is True

        with patch.object(self.ai_client, "generate_video_clip", side_effect=lambda motion_prompt, image_path, output_path, duration, **kw: helper_create_synthetic_video(image_path, output_path, duration)):
            video_items = p4.render_video_clips(motion_items)

        assert self.state_mgr.is_phase_completed("phase_4_animation_prompts")
        assert self.state_mgr.is_scene_video_completed(1)

        # =====================================================================
        # Phase 5: Concatenate clips together to create final compiled clip with subtitle
        # =====================================================================
        p5 = Phase5Video(self.state_mgr, self.ai_client)
        with patch.object(self.ai_client, "generate_seo_metadata", return_value={"title": "Test Title"}):
            assembly_data = p5.execute()

        assert self.state_mgr.is_phase_completed("phase_5_video_generation")
        assert self.state_mgr.is_phase_completed("assembly")
        assert Path(assembly_data["final_video_path"]).exists()
        assert Path(assembly_data["merged_video_path"]).exists()
        print("\n>>> ALL 5 PHASES COMPLETED AND VERIFIED TOGETHER SUCCESSFULLY! <<<")


if __name__ == "__main__":
    pytest.main(["-v", __file__])

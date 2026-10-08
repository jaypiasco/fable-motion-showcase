"""
Integration & Unit Test for AI Video Story Pipeline & Auto-Captioning.
Tests:
1. StateManager initialization and atomic state saving
2. Interruption and resume capability (skipping completed items)
3. FFmpeg video stitching and audio muxing
4. Automated word-level dynamic auto-captioning with faster-whisper and .ass burning
"""

import os
import json
import shutil
import subprocess
from pathlib import Path
from core.state_manager import StateManager
from services.video_editor import VideoEditor
from services.tts_service import TTSService
from caption_pipeline import generate_viral_ass_subtitles, burn_subtitles, process_video_captions
from config import config


def test_state_and_recovery():
    print("[Test 1] Testing StateManager and recovery...")
    prompt = "Test Sci-Fi Odyssey"
    state_mgr = StateManager(prompt=prompt)
    
    assert state_mgr.state_path.exists()
    assert (state_mgr.archive_dir / "pipeline_state.json").exists()
    assert state_mgr.scripts_dir.exists()
    assert state_mgr.images_dir.exists()
    assert state_mgr.clips_dir.exists()
    assert state_mgr.final_dir.exists()

    # Simulate completing Phase 1
    sample_script = {
        "title": "Test Story",
        "logline": "A test logline",
        "genre": "Sci-Fi",
        "scenes": [
            {
                "scene_id": 1,
                "shot_type": "Wide shot",
                "visual_description": "A spaceship floating near a nebula",
                "characters": ["Pilot"],
                "narration": "In the deep void, quiet answers awaited.",
                "sfx_cue": "Cosmic rumble",
                "duration_seconds": 2
            },
            {
                "scene_id": 2,
                "shot_type": "Close-up",
                "visual_description": "Pilot looking at star map",
                "characters": ["Pilot"],
                "narration": "The coordinates led to uncharted space.",
                "sfx_cue": "Console beep",
                "duration_seconds": 2
            }
        ]
    }
    state_mgr.complete_phase_1(sample_script)
    assert state_mgr.is_phase_completed("phase_1_script")

    # Simulate resuming with a new StateManager instance
    resumed_mgr = StateManager(story_id=state_mgr.story_id)
    assert resumed_mgr.is_phase_completed("phase_1_script")
    assert resumed_mgr.get_phase_data("phase_1_script")["title"] == "Test Story"
    print("[PASS] StateManager and resume verification passed.")

    # Cleanup test archive
    state_mgr.close()
    resumed_mgr.close()
    shutil.rmtree(state_mgr.archive_dir, ignore_errors=True)


def test_ffmpeg_stitching_and_muxing():
    print("[Test 2] Testing FFmpeg video stitching and audio muxing...")
    test_dir = config.BASE_DIR / "archive" / "test_ffmpeg_run"
    test_clips_dir = test_dir / "clips"
    test_final_dir = test_dir / "final"
    test_clips_dir.mkdir(parents=True, exist_ok=True)
    test_final_dir.mkdir(parents=True, exist_ok=True)

    clip1 = test_clips_dir / "scene_01.mp4"
    clip2 = test_clips_dir / "scene_02.mp4"

    # Create two synthetic test video clips using lavfi
    cmd1 = [
        config.FFMPEG_PATH, "-y",
        "-f", "lavfi", "-i", "color=c=blue:s=640x360:d=2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        str(clip1)
    ]
    cmd2 = [
        config.FFMPEG_PATH, "-y",
        "-f", "lavfi", "-i", "color=c=red:s=640x360:d=2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        str(clip2)
    ]
    subprocess.run(cmd1, capture_output=True, check=True)
    subprocess.run(cmd2, capture_output=True, check=True)

    editor = VideoEditor()
    manifest_file = test_clips_dir / "clips.txt"
    editor.create_clips_manifest([clip1, clip2], manifest_file)
    assert manifest_file.exists()

    merged_video = test_final_dir / "merged_video.mp4"
    editor.stitch_clips(manifest_file, merged_video)
    assert merged_video.exists() and merged_video.stat().st_size > 0

    # Test audio generation and muxing
    orig_vo = getattr(config, "ENABLE_VOICEOVER", False)
    orig_prov = getattr(config, "TTS_PROVIDER", "none")
    config.ENABLE_VOICEOVER = True
    config.TTS_PROVIDER = "edge_tts"
    try:
        tts = TTSService()
        audio_file = test_final_dir / "voiceover.mp3"
        tts.generate_narration([
            {"narration": "Testing scene one audio.", "duration_seconds": 2},
            {"narration": "Testing scene two audio.", "duration_seconds": 2}
        ], audio_file)
        assert audio_file.exists() and audio_file.stat().st_size > 0
    finally:
        config.ENABLE_VOICEOVER = orig_vo
        config.TTS_PROVIDER = orig_prov

    final_video = test_final_dir / "final_story.mp4"
    editor.mux_audio(merged_video, audio_file, final_video)
    assert final_video.exists() and final_video.stat().st_size > 0

    print("[PASS] FFmpeg video stitching and audio muxing passed.")

    # Cleanup test dir
    shutil.rmtree(test_dir, ignore_errors=True)


def test_caption_pipeline():
    print("[Test 3] Testing faster-whisper word-level dynamic auto-captioning...")
    test_dir = config.BASE_DIR / "archive" / "test_caption_run"
    test_dir.mkdir(parents=True, exist_ok=True)

    video_file = test_dir / "test_input.mp4"
    audio_file = test_dir / "test_audio.mp3"
    ass_file = test_dir / "subtitles.ass"
    captioned_video = test_dir / "test_captioned.mp4"

    # 1. Generate clean spoken audio using TTS
    orig_vo = getattr(config, "ENABLE_VOICEOVER", False)
    orig_prov = getattr(config, "TTS_PROVIDER", "none")
    config.ENABLE_VOICEOVER = True
    config.TTS_PROVIDER = "edge_tts"
    try:
        tts = TTSService()
        tts.generate_narration([
            {"narration": "Hello world. This is a viral crystal drama test.", "duration_seconds": 3}
        ], audio_file)
        assert audio_file.exists() and audio_file.stat().st_size > 0
    finally:
        config.ENABLE_VOICEOVER = orig_vo
        config.TTS_PROVIDER = orig_prov

    # 2. Create synthetic 9:16 vertical video with audio
    cmd = [
        config.FFMPEG_PATH, "-y",
        "-f", "lavfi", "-i", "color=c=darkblue:s=1080x1920:d=3",
        "-i", str(audio_file),
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-shortest",
        str(video_file)
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    assert video_file.exists() and video_file.stat().st_size > 0

    # 3. Test generate_viral_ass_subtitles
    generate_viral_ass_subtitles(str(video_file), str(ass_file), model_size="tiny" if hasattr(config, "WHISPER_MODEL_SIZE") else "base")
    assert ass_file.exists() and ass_file.stat().st_size > 0

    with open(ass_file, "r", encoding="utf-8") as f:
        ass_content = f.read()
    assert "PlayResX: 1080" in ass_content
    assert "PlayResY: 1920" in ass_content
    assert "ViralDrama" in ass_content

    # 4. Test burn_subtitles
    burn_subtitles(str(video_file), str(ass_file), str(captioned_video))
    assert captioned_video.exists() and captioned_video.stat().st_size > 0

    print("[PASS] Word-level dynamic auto-captioning passed.")

    # Cleanup test dir
    shutil.rmtree(test_dir, ignore_errors=True)


def test_phase5_video_execution():
    print("[Test 4] Testing Phase 5 video generation execution & state tracking...")
    test_prompt = "Test Crystal Revelation"
    state_mgr = StateManager(prompt=test_prompt)

    # Populate dummy script and characters
    sample_script = {
        "title": "Phase 5 Test",
        "scenes": [
            {
                "scene_id": 1,
                "shot_type": "Close-up",
                "visual_description": "Obsidian looking shocked",
                "characters": ["Obsidian"],
                "dialogue": "You lied to me!",
                "duration_seconds": 2
            }
        ]
    }
    state_mgr.complete_phase_1(sample_script)
    state_mgr.complete_phase_2({"characters": [{"name": "Obsidian", "crystal_shader": "jet black obsidian", "audio_profile": "Audio: Natural, warm, grounded male voice with realistic room acoustics and subtle breathing. Background sound includes quiet room tone. No background music. (no subtitles)"}]})

    # Generate dummy keyframe
    from PIL import Image
    keyframe_file = state_mgr.images_dir / "scene_01_keyframe.png"
    img = Image.new("RGB", (768, 1344), color=(20, 20, 40))
    img.save(keyframe_file)

    state_mgr.update_scene_image(1, prompt="Obsidian looking shocked", image_path=str(keyframe_file))
    state_mgr.complete_phase_3()

    # Motion items generated in Phase 4
    motion_items = [{
        "scene_id": 1,
        "motion_prompt": "Slow dramatic push-in on obsidian character. Obsidian says: \"You lied to me!\" Audio: Natural, warm, grounded male voice with realistic room acoustics and subtle breathing. Background sound includes quiet room tone. No background music. (no subtitles)",
        "duration": 2,
        "status": "completed"
    }]

    # Phase 4 renders video clips upon approval
    from phases.phase4_motion import Phase4Motion
    from phases.phase5_video import Phase5Video
    from services.ai_client import AIClient
    ai_client = AIClient()
    p4 = Phase4Motion(state_mgr, ai_client)
    vid_items = p4.render_video_clips(motion_items)

    assert len(vid_items) == 1
    assert state_mgr.is_scene_video_completed(1)
    vid_file = state_mgr.clips_dir / "scene_01.mp4"
    assert vid_file.exists() and vid_file.stat().st_size > 0

    # Phase 5 concatenates clips and captions master video
    p5 = Phase5Video(state_mgr, ai_client)
    assembly_result = p5.execute()
    assert state_mgr.is_phase_completed("phase_5_video_generation")
    assert state_mgr.is_phase_completed("assembly")
    final_file = state_mgr.final_dir / "final_story.mp4"
    assert final_file.exists() and final_file.stat().st_size > 0
    print("[PASS] Phase 4 video clip render and Phase 5 assembly execution passed.")

    # Cleanup test archive
    state_mgr.close()
    shutil.rmtree(state_mgr.archive_dir, ignore_errors=True)


if __name__ == "__main__":
    test_state_and_recovery()
    test_ffmpeg_stitching_and_muxing()
    test_caption_pipeline()
    test_phase5_video_execution()
    print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!")

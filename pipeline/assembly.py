"""
Story Assembly Engine.
Stitches video clips, overlays TTS voiceover, generates dynamic auto-captions (faster-whisper),
and serializes final manifests.
"""

import json
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional


from config import config
from core.logger import logger
from core.state_manager import StateManager
from services.video_editor import VideoEditor
from services.tts_service import TTSService
from caption_pipeline import generate_viral_ass_subtitles, burn_subtitles


def assemble_story(
    state_mgr: StateManager,
    script_data: Dict[str, Any],
    video_editor: VideoEditor,
    tts_service: Optional[TTSService] = None
) -> Path:
    """Stitches all scene clips in sequence, overlays voiceover, generates dynamic captions, and updates state."""
    if state_mgr.is_phase_completed("assembly"):
        logger.info("[Assembly] Already completed. Skipping.")
        return Path(state_mgr.state["phases"]["assembly"]["final_video_path"])

    scenes = script_data.get("scenes", [])
    clip_paths: List[Path] = []

    for scene in scenes:
        scene_id = scene.get("scene_id", 1)
        clip_file = state_mgr.clips_dir / f"scene_{scene_id:02d}.mp4"
        if not clip_file.exists():
            raise FileNotFoundError(f"Missing required video clip: {clip_file}")
        clip_paths.append(clip_file)

    # 1. Create clips.txt manifest
    clips_manifest = state_mgr.clips_dir / "clips.txt"
    video_editor.create_clips_manifest(clip_paths, clips_manifest)

    # 2. Concatenate video clips
    merged_video = state_mgr.final_dir / "merged_video.mp4"
    video_editor.stitch_clips(clips_manifest, merged_video)

    # 3. Handle Voiceover Audio & Sound Design (if enabled)
    tts = tts_service or TTSService()
    voiceover_path = state_mgr.final_dir / "voiceover.mp3"
    muxed_video = state_mgr.final_dir / "merged_with_audio.mp4"
    chars_data = state_mgr.get_phase_data("phase_2_characters") or {}
    characters_bible = chars_data.get("characters", [])
    
    working_video = merged_video
    if getattr(config, "ENABLE_VOICEOVER", False):
        try:
            tts_result = tts.generate_narration(scenes, voiceover_path, characters_bible=characters_bible)
            if voiceover_path.exists() and voiceover_path.stat().st_size > 0:
                has_audio = False
                try:
                    probe_cmd = ["ffprobe", "-v", "error", "-show_streams", "-select_streams", "a", str(merged_video)]
                    probe_res = subprocess.run(probe_cmd, capture_output=True, text=True)
                    if "codec_type=audio" in probe_res.stdout:
                        has_audio = True
                except Exception:
                    pass

                if not has_audio:
                    video_editor.mux_audio(merged_video, voiceover_path, muxed_video)
                    working_video = muxed_video
        except Exception as e:
            logger.warning(f"[Assembly] Audio check/mux error ({e}). Proceeding with stitched video.")
            working_video = merged_video


    # 4. Dynamic Auto-Captioning with Karaoke Highlighting (faster-whisper)
    captioned_video = state_mgr.final_dir / "final_story_captioned.mp4"
    ass_subtitles = state_mgr.final_dir / "subtitles.ass"
    final_video_path = working_video

    if getattr(config, "ENABLE_DYNAMIC_CAPTIONS", True):
        try:
            logger.info(">>> Auto-Captioning: Transcribing & Burning Dynamic Word-Level Karaoke Captions <<<")
            generate_viral_ass_subtitles(
                video_path=str(working_video),
                ass_output_path=str(ass_subtitles),
                model_size=getattr(config, "WHISPER_MODEL_SIZE", "base"),
                device=getattr(config, "WHISPER_DEVICE", "cpu"),
                compute_type=getattr(config, "WHISPER_COMPUTE_TYPE", "int8"),
                font_name=getattr(config, "CAPTION_FONT", "Impact"),
                spacing=getattr(config, "CAPTION_SPACING", 2),
                style_mode=getattr(config, "CAPTION_STYLE", "karaoke")
            )
            burn_subtitles(
                input_video=str(working_video),
                ass_file=str(ass_subtitles),
                output_video=str(captioned_video),
                ffmpeg_cmd=config.FFMPEG_PATH
            )
            final_video_path = captioned_video
            logger.info(f"[Assembly] Dynamic auto-captioning completed -> {captioned_video}")
        except Exception as e:
            logger.warning(f"[Assembly] Auto-captioning encountered error ({e}). Using audio-muxed video as fallback.")

    # Provide standard final_story.mp4 file for convenient access
    standard_final = state_mgr.final_dir / "final_story.mp4"
    if final_video_path != standard_final:
        shutil.copyfile(final_video_path, standard_final)

    # 5. Record completion in state
    state_mgr.complete_assembly(
        clips_manifest_path=str(clips_manifest),
        merged_video_path=str(merged_video),
        voiceover_path=str(voiceover_path) if voiceover_path.exists() else None,
        final_video_path=str(standard_final),
        subtitles_path=str(ass_subtitles) if ass_subtitles.exists() else None,
        captioned_video_path=str(captioned_video) if captioned_video.exists() else str(standard_final)
    )

    # 6. Save top-level manifest
    top_manifest_path = state_mgr.archive_dir / "manifest.json"
    with open(top_manifest_path, "w", encoding="utf-8") as f:
        json.dump(state_mgr.state, f, indent=2, ensure_ascii=False)

    return standard_final

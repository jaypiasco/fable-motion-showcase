"""
Phase 5: Caption Generation & Video Clip Merge Assembly.
Stitches all scene video clips generated in Phase 4, generates dynamic word-aligned
karaoke captions (faster-whisper), and compiles the final master 1080p MP4 story.
Note: Separate audio/voiceover TTS is not implemented because Veo generates native single-pass
dialogue and ambient audio directly with each video clip in Phase 4.
"""

from pathlib import Path
from typing import Dict, Any, List, Optional
import shutil
import json

from config import config
from core.logger import logger
from core.state_manager import StateManager
from services.ai_client import AIClient
from services.video_editor import VideoEditor
from caption_pipeline import generate_viral_ass_subtitles, burn_subtitles
from prompts.phase5_prompts import format_phase5_seo_prompt, format_phase5_thumbnail_prompt


class Phase5Video:
    """Phase 5: Concatenates video clips, burns dynamic word-level subtitles, and exports master video."""

    def __init__(self, state_mgr: StateManager, ai_client: AIClient):
        self.state_mgr = state_mgr
        self.ai_client = ai_client
        self.video_editor = VideoEditor()

    def caption_scene_clip(self, scene_id: int) -> Path:
        """
        Applies dynamic word-level karaoke subtitles to an individual scene video clip.
        Operates during the scene-by-scene iteration (Scene 1 to Scene N).
        """
        raw_clip = self.state_mgr.clips_dir / f"scene_{scene_id:02d}.mp4"
        if not raw_clip.exists():
            raise FileNotFoundError(f"[Phase 5] Cannot caption missing video clip for Scene {scene_id} at '{raw_clip}'")

        captioned_clip = self.state_mgr.clips_dir / f"scene_{scene_id:02d}_captioned.mp4"
        ass_subtitles = self.state_mgr.clips_dir / f"scene_{scene_id:02d}.ass"

        if getattr(config, "ENABLE_DYNAMIC_CAPTIONS", True):
            try:
                logger.info(f"[Phase 5] Generating karaoke subtitles for Scene {scene_id} clip...")
                generate_viral_ass_subtitles(
                    video_path=str(raw_clip),
                    ass_output_path=str(ass_subtitles),
                    model_size=getattr(config, "WHISPER_MODEL_SIZE", "base"),
                    device=getattr(config, "WHISPER_DEVICE", "cpu"),
                    compute_type=getattr(config, "WHISPER_COMPUTE_TYPE", "int8"),
                    font_name=getattr(config, "CAPTION_FONT", "Impact"),
                    spacing=getattr(config, "CAPTION_SPACING", 2),
                    style_mode=getattr(config, "CAPTION_STYLE", "karaoke")
                )
                burn_subtitles(
                    input_video=str(raw_clip),
                    ass_file=str(ass_subtitles),
                    output_video=str(captioned_clip),
                    ffmpeg_cmd=config.FFMPEG_PATH
                )
                logger.info(f"[Phase 5] Scene {scene_id} clip captioned successfully -> {captioned_clip.name}")
                return captioned_clip
            except Exception as e:
                logger.warning(f"[Phase 5] Scene {scene_id} caption notice ({e}). Using raw clip.")

        return raw_clip

    def execute(self) -> Dict[str, Any]:
        """Executes Phase 5 captioning, video clip stitching, and final assembly."""
        if self.state_mgr.is_phase_completed("phase_5_video_generation") and self.state_mgr.is_phase_completed("assembly"):
            logger.info("[Phase 5] Captioning & Clip Assembly already completed in state. Skipping.")
            return self.state_mgr.get_phase_data("assembly") or self.state_mgr.get_phase_data("phase_5_video_generation")

        script_data = self.state_mgr.get_phase_data("phase_1_script") or {}
        scenes = script_data.get("scenes", [])

        # 1. Collect all video clips rendered in Phase 4 (favoring per-clip captioned versions if present)
        clip_paths: List[Path] = []
        for scene in scenes:
            scene_id = scene.get("scene_id", 1)
            captioned_clip = self.state_mgr.clips_dir / f"scene_{scene_id:02d}_captioned.mp4"
            raw_clip = self.state_mgr.clips_dir / f"scene_{scene_id:02d}.mp4"
            clip_file = captioned_clip if captioned_clip.exists() else raw_clip
            if not clip_file.exists():
                err_msg = (
                    f"Missing video clip for scene {scene_id} at '{raw_clip}'. "
                    f"Phase 4 must render video clips before Phase 5 can assemble and caption them."
                )
                self.state_mgr.record_error(err_msg, phase_name="phase_5_video_generation")
                raise FileNotFoundError(f"[Phase 5 Error] {err_msg}")
            clip_paths.append(clip_file)

        # 2. Stitch / Concatenate video clips using FFmpeg
        clips_manifest = self.state_mgr.clips_dir / "clips.txt"
        self.video_editor.create_clips_manifest(clip_paths, clips_manifest)

        merged_video = self.state_mgr.final_dir / "merged_video.mp4"
        logger.info(f"[Phase 5] Stitching {len(clip_paths)} video clips into merged master -> {merged_video.name}")
        self.video_editor.stitch_clips(clips_manifest, merged_video)

        # Note: Separate audio/voiceover TTS is not implemented because Veo generates native single-pass audio
        working_video = merged_video

        # 3. Dynamic Auto-Captioning with Karaoke Highlighting (faster-whisper)
        captioned_video = self.state_mgr.final_dir / "final_story_captioned.mp4"
        ass_subtitles = self.state_mgr.final_dir / "subtitles.ass"
        final_video_path = working_video

        if getattr(config, "ENABLE_DYNAMIC_CAPTIONS", True):
            try:
                logger.info("[Phase 5] Generating dynamic word-level karaoke subtitles from native clip audio...")
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
                logger.info(f"[Phase 5] Dynamic subtitles burned successfully -> {captioned_video.name}")
            except Exception as e:
                logger.warning(f"[Phase 5] Subtitle burning notice ({e}). Using stitched video as final video.")

        # Standard final_story.mp4 path
        standard_final = self.state_mgr.final_dir / "final_story.mp4"
        if final_video_path != standard_final and final_video_path.exists():
            shutil.copyfile(final_video_path, standard_final)
        elif not standard_final.exists() and working_video.exists():
            shutil.copyfile(working_video, standard_final)

        # 4. Generate SEO package & viral thumbnail prompt
        seo_package = {}
        try:
            seo_prompt = format_phase5_seo_prompt(json.dumps(script_data))
            seo_package = self.ai_client.generate_seo_metadata(seo_prompt)
        except Exception as e:
            logger.warning(f"[Phase 5] SEO generation notice ({e}).")

        # Use the archive directory name (timestamp_slug) so /media/... resolves on disk.
        media_dir_name = self.state_mgr.archive_dir.name
        final_video_url = f"/media/{media_dir_name}/final/final_story.mp4"
        captioned_exists = captioned_video.exists() and captioned_video.stat().st_size > 1024
        captioned_video_url = (
            f"/media/{media_dir_name}/final/final_story_captioned.mp4"
            if captioned_exists
            else final_video_url
        )

        assembly_result = {
            "status": "completed",
            "clips_manifest_path": str(clips_manifest),
            "merged_video_path": str(merged_video),
            "voiceover_status": "not_implemented_native_veo_audio",
            "final_video_path": str(standard_final),
            "final_video_url": final_video_url,
            "subtitles_path": str(ass_subtitles) if ass_subtitles.exists() else None,
            "captioned_video_path": str(captioned_video) if captioned_exists else str(standard_final),
            "captioned_video_url": captioned_video_url,
            "seo_package": seo_package
        }

        existing_p5 = self.state_mgr.state["phases"].get("phase_5_video_generation") or {}
        self.state_mgr.state["phases"]["phase_5_video_generation"] = {
            **existing_p5,
            "status": "completed",
            "error": None,
            "clips_count": len(clip_paths),
            "merged_video_url": f"/media/{media_dir_name}/final/merged_video.mp4",
            "final_video_url": final_video_url,
            "captioned_video_url": captioned_video_url,
            "assembly": assembly_result
        }
        self.state_mgr.complete_phase_5()
        self.state_mgr.complete_assembly(
            clips_manifest_path=str(clips_manifest),
            merged_video_path=str(merged_video),
            final_video_path=str(standard_final),
            subtitles_path=str(ass_subtitles) if ass_subtitles.exists() else None,
            captioned_video_path=str(captioned_video) if captioned_exists else str(standard_final)
        )

        logger.info(f"[Phase 5] Captioning & Clip Assembly COMPLETED -> {standard_final}")
        return assembly_result


# Aliases for backward compatibility
Phase5CaptionAndMerge = Phase5Video
Phase5Assembly = Phase5Video

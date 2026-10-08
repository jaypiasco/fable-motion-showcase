"""
Video Editor & Stitcher for AI Video Story Pipeline.
Uses deterministic FFmpeg commands to concatenate scene clips and overlay voiceover/audio tracks.
"""

import os
import subprocess
from pathlib import Path
from typing import List, Optional

from core.logger import logger
from config import config


class VideoEditor:
    """Handles deterministic video stitching, audio muxing, and final assembly via FFmpeg."""

    def __init__(self):
        self.ffmpeg_cmd = config.FFMPEG_PATH

    def create_clips_manifest(self, clip_paths: List[Path], manifest_path: Path) -> Path:
        """
        Creates the FFmpeg concat playlist file (clips.txt).
        Uses relative paths to avoid Windows drive-letter escaping issues with concat demuxer.
        """
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(manifest_path, "w", encoding="utf-8") as f:
            for clip in clip_paths:
                try:
                    rel_path = os.path.relpath(clip, manifest_path.parent).replace("\\", "/")
                except Exception:
                    rel_path = str(clip.resolve()).replace("\\", "/")
                f.write(f"file '{rel_path}'\n")

        logger.info(f"[Video Editor] Created clips playlist with {len(clip_paths)} clips at {manifest_path}")
        return manifest_path

    def stitch_clips(self, manifest_path: Path, output_video_path: Path) -> Path:
        """
        Concatenates video clips in sequence using FFmpeg concat demuxer:
        ffmpeg -f concat -safe 0 -i clips.txt -c copy output.mp4
        With automatic re-encode fallback if stream copy encounters codec mismatches.
        """
        output_video_path.parent.mkdir(parents=True, exist_ok=True)
        logger.info(f"[Video Editor] Stitching clips into {output_video_path.name}...")

        # Primary command: Fast stream copy
        cmd_copy = [
            self.ffmpeg_cmd, "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(manifest_path),
            "-c", "copy",
            str(output_video_path)
        ]

        logger.debug(f"[Video Editor] Running: {' '.join(cmd_copy)}")
        result = subprocess.run(cmd_copy, capture_output=True, text=True, check=False)

        if result.returncode == 0 and output_video_path.exists() and output_video_path.stat().st_size > 0:
            logger.info(f"[Video Editor] Successfully stitched video via stream copy -> {output_video_path}")
            return output_video_path

        # Fallback command: Re-encode video stream to ensure seamless timebase & codec alignment
        logger.warning("[Video Editor] Direct stream copy failed or had format differences. Re-encoding sequence...")
        cmd_reencode = [
            self.ffmpeg_cmd, "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(manifest_path),
            "-c:v", "libx264",
            "-preset", config.VIDEO_ENCODING_PRESET,
            "-crf", str(config.VIDEO_CRF),
            "-pix_fmt", "yuv420p",
            str(output_video_path)
        ]

        result_reencode = subprocess.run(cmd_reencode, capture_output=True, text=True, check=False)
        if result_reencode.returncode != 0:
            err = f"{result_reencode.stdout}\n{result_reencode.stderr}"
            logger.error(f"[Video Editor] FFmpeg re-encode failed: {err}")
            raise RuntimeError(f"FFmpeg stitch failed: {err}")

        logger.info(f"[Video Editor] Successfully stitched video via re-encode -> {output_video_path}")
        return output_video_path

    def mux_audio(self, video_path: Path, audio_path: Optional[Path], final_output_path: Path) -> Path:
        """
        Overlays audio / voiceover onto the stitched video:
        ffmpeg -i video.mp4 -i voiceover.mp3 -c:v copy -c:a aac -shortest final.mp4
        """
        final_output_path.parent.mkdir(parents=True, exist_ok=True)

        if not audio_path or not audio_path.exists():
            logger.info("[Video Editor] No separate audio track provided. Finalizing video directly...")
            import shutil
            shutil.copyfile(video_path, final_output_path)
            return final_output_path

        logger.info(f"[Video Editor] Muxing audio ({audio_path.name}) with video ({video_path.name}) -> {final_output_path.name}")

        cmd = [
            self.ffmpeg_cmd, "-y",
            "-i", str(video_path),
            "-i", str(audio_path),
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", config.AUDIO_BITRATE,
            "-shortest",
            str(final_output_path)
        ]

        logger.debug(f"[Video Editor] Running: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)

        if result.returncode != 0:
            err = f"{result.stdout}\n{result.stderr}"
            logger.error(f"[Video Editor] FFmpeg audio muxing failed: {err}")
            raise RuntimeError(f"FFmpeg audio mux failed: {err}")

        logger.info(f"[Video Editor] Final story video created successfully -> {final_output_path}")
        return final_output_path

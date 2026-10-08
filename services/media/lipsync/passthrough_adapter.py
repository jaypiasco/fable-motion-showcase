"""
Passthrough Lip-Sync & Audio Synchronization Adapter.
Preserves video stream and muxes scene audio track directly via FFmpeg.
"""

import shutil
import subprocess
from pathlib import Path
from core.logger import logger
from config import config
from services.media.base import BaseLipSyncProvider, LipSyncRequest, LipSyncResult


class PassthroughLipSyncAdapter(BaseLipSyncProvider):
    """Passthrough adapter for audio/video synchronization."""

    @property
    def name(self) -> str:
        return "passthrough"

    def generate(self, req: LipSyncRequest) -> LipSyncResult:
        req.output_path.parent.mkdir(parents=True, exist_ok=True)

        if not req.video_path.exists():
            raise FileNotFoundError(f"Input video not found: {req.video_path}")

        # If dialogue audio is present, mux it cleanly with FFmpeg
        if req.audio_path and Path(req.audio_path).exists() and Path(req.audio_path).stat().st_size > 0:
            logger.info(f"[LipSync] Synchronizing scene audio ({req.audio_path.name}) -> {req.output_path.name}")
            cmd = [
                config.FFMPEG_PATH, "-y",
                "-i", str(req.video_path),
                "-i", str(req.audio_path),
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", getattr(config, "AUDIO_BITRATE", "192k"),
                "-shortest",
                str(req.output_path)
            ]
            try:
                subprocess.run(cmd, check=True, capture_output=True)
                return LipSyncResult(
                    video_path=req.output_path,
                    provider=self.name,
                    metadata={"status": "audio_muxed", "audio": str(req.audio_path)}
                )
            except Exception as e:
                logger.warning(f"[LipSync] Audio mux warning ({e}). Falling back to file copy.")

        # Fallback / no audio copy
        if req.output_path != req.video_path:
            shutil.copyfile(req.video_path, req.output_path)
            
        logger.debug(f"[LipSync] Passthrough for {req.output_path.name}")
        return LipSyncResult(
            video_path=req.output_path,
            provider=self.name,
            metadata={"status": "passthrough"}
        )

"""
Fal.ai Video Generation Adapters (LTX-Video & Kling 1.5/1.6 Image-to-Video).
Provides secondary environment motion and character animation options.
"""

import os
import time
import base64
import requests
from pathlib import Path
from typing import Optional

from core.logger import logger
from core.retry import retry_with_backoff
from config import config
from services.media.base import BaseVideoProvider, VideoGenRequest, VideoGenResult


def _image_to_data_uri(image_path: Path) -> str:
    """Encodes a local image as a base64 data URI for direct Fal upload."""
    mime = "image/png" if image_path.suffix.lower() == ".png" else "image/jpeg"
    with open(image_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
    return f"data:{mime};base64,{encoded}"


class FalLTXVideoAdapter(BaseVideoProvider):
    """
    Fal.ai LTX-Video Video Provider.
    Ideal for B-roll, landscape, wide shots, and background dynamics.
    """

    @property
    def name(self) -> str:
        return "fal_ltx"

    @retry_with_backoff(max_retries=2, initial_delay=3.0)
    def generate(self, req: VideoGenRequest) -> VideoGenResult:
        fal_key = req.extra_params.get("fal_key") or getattr(config, "FAL_KEY", None) or os.getenv("FAL_KEY") or os.getenv("FAL_API_KEY")
        if not fal_key:
            from services.media.video.google_veo import GoogleVeoAdapter
            logger.warning("[FalLTX] FAL_KEY not found. Routing to Google Veo 3.1 Fast...")
            return GoogleVeoAdapter().generate(req)

        model = req.model or getattr(config, "FAL_LTX_MODEL", "fal-ai/ltx-video")
        logger.info(f"[FalLTX] Rendering clip with {model} -> {req.output_path.name}")

        image_data_uri = _image_to_data_uri(req.image_path)

        headers = {
            "Authorization": f"Key {fal_key}" if not fal_key.startswith("Key ") else fal_key,
            "Content-Type": "application/json"
        }

        payload = {
            "prompt": req.motion_prompt,
            "image_url": image_data_uri,
            "aspect_ratio": req.aspect_ratio or "9:16",
        }

        url = f"https://fal.run/{model}"
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=120)
            resp.raise_for_status()
            data = resp.json()

            video_info = data.get("video", {})
            video_url = video_info.get("url")
            if not video_url:
                raise ValueError(f"No video URL in Fal.ai response: {data}")

            # Download video
            vid_resp = requests.get(video_url, timeout=60)
            vid_resp.raise_for_status()
            with open(req.output_path, "wb") as f:
                f.write(vid_resp.content)

            return VideoGenResult(
                video_path=req.output_path,
                duration=float(req.duration),
                provider=self.name,
                metadata={"model": model, "video_url": video_url}
            )
        except Exception as e:
            from services.media.video.google_veo import GoogleVeoAdapter
            logger.warning(f"[FalLTX] Fal LTX-Video error ({e}). Routing to Google Veo fallback...")
            return GoogleVeoAdapter().generate(req)


class FalKlingAdapter(BaseVideoProvider):
    """
    Fal.ai Kling 1.5/1.6 Hero Video Provider.
    High facial coherence, cinematic micro-movements, and emotional close-up dynamics.
    """

    @property
    def name(self) -> str:
        return "fal_kling"

    @retry_with_backoff(max_retries=2, initial_delay=3.0)
    def generate(self, req: VideoGenRequest) -> VideoGenResult:
        fal_key = req.extra_params.get("fal_key") or getattr(config, "FAL_KEY", None) or os.getenv("FAL_KEY") or os.getenv("FAL_API_KEY")
        if not fal_key:
            from services.media.video.google_veo import GoogleVeoAdapter
            logger.warning("[FalKling] FAL_KEY not found. Routing to Google Veo 3.1 Fast...")
            return GoogleVeoAdapter().generate(req)

        model = req.model or getattr(config, "FAL_KLING_MODEL", "fal-ai/kling-video/v1.5/pro/image-to-video")
        logger.info(f"[FalKling] Rendering hero clip with {model} -> {req.output_path.name}")

        image_data_uri = _image_to_data_uri(req.image_path)

        headers = {
            "Authorization": f"Key {fal_key}" if not fal_key.startswith("Key ") else fal_key,
            "Content-Type": "application/json"
        }

        payload = {
            "prompt": req.motion_prompt,
            "image_url": image_data_uri,
            "duration": "5" if req.duration <= 5 else "10",
            "aspect_ratio": req.aspect_ratio or "9:16"
        }

        url = f"https://fal.run/{model}"
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=180)
            resp.raise_for_status()
            data = resp.json()

            video_info = data.get("video", {})
            video_url = video_info.get("url")
            if not video_url:
                raise ValueError(f"No video URL in Fal.ai response: {data}")

            # Download video
            vid_resp = requests.get(video_url, timeout=60)
            vid_resp.raise_for_status()
            with open(req.output_path, "wb") as f:
                f.write(vid_resp.content)

            return VideoGenResult(
                video_path=req.output_path,
                duration=float(req.duration),
                provider=self.name,
                metadata={"model": model, "video_url": video_url}
            )
        except Exception as e:
            from services.media.video.google_veo import GoogleVeoAdapter
            logger.warning(f"[FalKling] Fal Kling error ({e}). Routing to Google Veo fallback...")
            return GoogleVeoAdapter().generate(req)

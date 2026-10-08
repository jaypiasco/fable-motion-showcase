"""
Fal.ai Flux Image Generation Adapter (Flux Schnell / Dev).
Cinematic photorealistic 9:16 keyframe image synthesis with prompt adherence.
"""

import os
import time
import requests
from pathlib import Path
from typing import Optional

from core.logger import logger
from core.retry import retry_with_backoff
from config import config
from services.media.base import BaseImageProvider, ImageGenRequest, ImageGenResult


class FalFluxAdapter(BaseImageProvider):
    """
    Fal.ai Flux Provider (Flux Schnell / Flux Dev).
    Fast, hyper-detailed keyframe generation.
    """

    @property
    def name(self) -> str:
        return "fal_flux"

    @retry_with_backoff(max_retries=3, initial_delay=2.0)
    def generate(self, req: ImageGenRequest) -> ImageGenResult:
        fal_key = req.extra_params.get("fal_key") or getattr(config, "FAL_KEY", None) or os.getenv("FAL_KEY") or os.getenv("FAL_API_KEY")
        if not fal_key:
            raise ValueError("FAL_KEY is not set. Add FAL_KEY to your .env file or switch IMAGE_PROVIDER to 'pollinations' or 'gemini_imagen'.")

        model = req.model or getattr(config, "FAL_FLUX_MODEL", "fal-ai/flux/schnell")
        
        # Map aspect ratio to image dimensions
        aspect_ratio = req.aspect_ratio or "9:16"
        if aspect_ratio == "9:16":
            image_size = {"width": 768, "height": 1344}
        elif aspect_ratio == "16:9":
            image_size = {"width": 1344, "height": 768}
        else:
            image_size = {"width": 1024, "height": 1024}

        headers = {
            "Authorization": f"Key {fal_key}" if not fal_key.startswith("Key ") else fal_key,
            "Content-Type": "application/json"
        }

        payload = {
            "prompt": req.prompt,
            "image_size": image_size,
            "num_inference_steps": 4 if "schnell" in model else 28,
            "num_images": 1,
            "enable_safety_checker": False
        }

        if req.seed is not None:
            payload["seed"] = req.seed

        url = f"https://fal.run/{model}"
        logger.info(f"[FalFlux] Requesting image ({model}, {aspect_ratio}) -> {url}")

        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        data = resp.json()

        images = data.get("images", [])
        if not images or not images[0].get("url"):
            raise ValueError(f"Fal.ai returned no valid image URL: {data}")

        image_url = images[0]["url"]
        seed_used = data.get("seed", req.seed)

        # Download image to local target path
        output_path = req.output_path or Path("temp_keyframe.png")
        output_path.parent.mkdir(parents=True, exist_ok=True)

        img_resp = requests.get(image_url, timeout=30)
        img_resp.raise_for_status()
        with open(output_path, "wb") as f:
            f.write(img_resp.content)

        logger.info(f"[FalFlux] Successfully saved image to {output_path.name}")
        return ImageGenResult(
            image_path=output_path,
            seed=seed_used,
            provider=self.name,
            metadata={"model": model, "image_url": image_url}
        )

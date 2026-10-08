"""
Pollinations.ai Image Generation Adapter.
Free, zero-key instant keyframe image generation using Flux / Turbo.
"""

import os
import urllib.parse
import requests
from pathlib import Path

from core.logger import logger
from core.retry import retry_with_backoff
from services.media.base import BaseImageProvider, ImageGenRequest, ImageGenResult
from config import config


class PollinationsFluxAdapter(BaseImageProvider):
    """
    Pollinations.ai Studio Image Provider.
    Zero configuration, photorealistic keyframe rendering using Flux / Sana.
    Supports both free keyless mode and authenticated mode via POLLINATIONS_API_KEY.
    """

    @property
    def name(self) -> str:
        return "pollinations"

    @retry_with_backoff(max_retries=3, initial_delay=2.0)
    def generate(self, req: ImageGenRequest) -> ImageGenResult:
        aspect_ratio = req.aspect_ratio or "9:16"
        if aspect_ratio == "9:16":
            width, height = 768, 1344
        elif aspect_ratio == "16:9":
            width, height = 1344, 768
        else:
            width, height = 1024, 1024

        # Deterministic seed from character anchors or prompt if not provided
        seed = req.seed
        if seed is None:
            import hashlib
            seed = int(hashlib.md5(req.prompt.encode("utf-8")).hexdigest()[:8], 16) % 1000000

        # Enhance prompt with studio lighting directives if not present
        full_prompt = req.prompt
        if "studio lighting" not in full_prompt.lower():
            full_prompt += ", 3-point studio lighting, high-contrast rim light, 8k resolution, Unreal Engine 5 render, Octane Render"

        encoded_prompt = urllib.parse.quote(full_prompt)
        model_name = getattr(config, "POLLINATIONS_MODEL", "flux")
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&model={model_name}&nologo=true&seed={seed}&enhance=false"

        # Optional API Key handling (if user configured enter.pollinations.ai key)
        api_key = (
            getattr(config, "POLLINATIONS_API_KEY", None)
            or os.environ.get("POLLINATIONS_API_KEY")
            or os.environ.get("POLLINATIONS_KEY")
        )
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
            url += f"&key={urllib.parse.quote(api_key)}"

        logger.info(f"[Pollinations] Fetching studio keyframe ({width}x{height}, seed={seed}, auth={'yes' if api_key else 'keyless'}) -> {req.output_path.name if req.output_path else 'image'}")
        
        resp = requests.get(url, headers=headers, timeout=60)
        resp.raise_for_status()

        if len(resp.content) < 1000:
            raise ValueError(f"Pollinations returned invalid/empty image payload ({len(resp.content)} bytes)")

        output_path = req.output_path or Path("temp_keyframe.png")
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "wb") as f:
            f.write(resp.content)

        return ImageGenResult(
            image_path=output_path,
            seed=seed,
            provider=self.name,
            metadata={"model": model_name, "url": url, "seed": seed}
        )


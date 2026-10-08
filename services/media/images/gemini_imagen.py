"""
Google Gemini Imagen / Nano Banana Pro Image Adapter.
Supports Vertex AI (Google Gen AI SDK with ADC) and direct multi-account Gemini REST fallback.
"""

import os
from pathlib import Path
from typing import Optional

from core.logger import logger
from config import config
from services.media.base import BaseImageProvider, ImageGenRequest, ImageGenResult
from services.gemini_direct_client import GeminiDirectClient


class GeminiImagenAdapter(BaseImageProvider):
    """Google Gemini Imagen adapter supporting Vertex AI ADC and direct REST fallback."""

    def __init__(self):
        self.client = GeminiDirectClient()

    @property
    def name(self) -> str:
        return "gemini_imagen"

    def _generate_via_vertex(self, req: ImageGenRequest, output_path: Path) -> Optional[Path]:
        """Attempts image generation via Google Cloud Vertex AI using ADC."""
        vertex_project = getattr(config, "GOOGLE_CLOUD_PROJECT", None) or os.getenv("GOOGLE_CLOUD_PROJECT")
        vertex_location = getattr(config, "GOOGLE_CLOUD_LOCATION", None) or os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        if not vertex_project:
            return None

        try:
            from google import genai
            from google.genai import types
            from PIL import Image

            client = genai.Client(vertexai=True, project=vertex_project, location=vertex_location)

            model_name = getattr(config, "IMAGEN_MODEL", "imagen-3.0-generate-002")
            aspect_ratio = req.aspect_ratio or "9:16"

            contents = []
            ref_mappings = []
            if req.character_references:
                for idx, ref_path in enumerate(req.character_references):
                    p = Path(ref_path)
                    if p.exists() and p.stat().st_size > 0:
                        try:
                            # Load via PIL Image as per Google GenAI multimodal spec
                            pil_img = Image.open(p)
                            contents.append(pil_img)
                            char_label = p.stem.replace("_", " ")
                            ref_mappings.append(f"Reference image {idx + 1} is '{char_label}'")
                            logger.info(f"[GeminiImagen] Attached Phase 2 character reference portrait: {p.name} ('{char_label}')")
                        except Exception as ref_err:
                            logger.warning(f"[GeminiImagen] Failed to load character reference {p}: {ref_err}")

            if ref_mappings:
                mapping_header = ". ".join(ref_mappings) + ". "
                prompt_directive = (
                    f"Generate a {aspect_ratio} cinematic scene. {mapping_header}"
                    f"Maintain identical facial features, carved produce peel textures, and signature wardrobe matching each respective attached reference portrait. "
                    f"Strictly textless image, clean visual composition, absolutely NO captions, NO subtitles, NO speech bubbles, NO typography on image: {req.prompt}"
                )
            else:
                prompt_directive = f"Generate an image in vertical {aspect_ratio} format. Strictly textless image, clean visual composition, absolutely NO captions, NO subtitles, NO speech bubbles, NO typography on image: {req.prompt}"

            contents.append(prompt_directive)

            target_model = "gemini-2.5-flash-image" if req.character_references else (
                model_name if "imagen" not in model_name.lower() else "gemini-2.5-flash-image"
            )
            logger.info(f"[GeminiImagen] Requesting Vertex AI image via generate_content ({target_model}, {aspect_ratio}, {len(contents) - 1} reference images)...")
            res = client.models.generate_content(
                model=target_model,
                contents=contents,
                config=types.GenerateContentConfig(response_modalities=["IMAGE"])
            )

            if res.candidates:
                for part in res.candidates[0].content.parts:
                    if getattr(part, "inline_data", None) and part.inline_data.data:
                        with open(output_path, "wb") as f_out:
                            f_out.write(part.inline_data.data)
                        logger.info(f"[GeminiImagen] Successfully saved Vertex AI image -> {output_path}")
                        return output_path

            logger.warning("[GeminiImagen] Vertex AI response contained no image data.")
            return None
        except Exception as e:
            logger.warning(f"[GeminiImagen] Vertex AI image generation error: {e}. Falling back to REST client...")
            return None

    def generate(self, req: ImageGenRequest) -> ImageGenResult:
        output_path = req.output_path or Path("temp_keyframe.png")
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # 1. Try Vertex AI with ADC
        saved_path = self._generate_via_vertex(req, output_path)
        if saved_path:
            return ImageGenResult(
                image_path=saved_path,
                seed=req.seed,
                provider=self.name,
                metadata={"engine": "vertex_ai", "aspect_ratio": req.aspect_ratio or "9:16"}
            )

        # 2. Fallback to direct Gemini multi-account REST client
        if not self.client.is_available():
            raise RuntimeError("No Google Vertex AI project or Gemini API keys configured.")

        logger.info(f"[GeminiImagen] Generating image via direct REST client -> {output_path.name}")
        saved_path = self.client.generate_image(
            prompt=req.prompt,
            output_path=output_path,
            aspect_ratio=req.aspect_ratio or "9:16",
            character_references=req.character_references
        )

        return ImageGenResult(
            image_path=saved_path,
            seed=req.seed,
            provider=self.name,
            metadata={"engine": "gemini_imagen_direct"}
        )


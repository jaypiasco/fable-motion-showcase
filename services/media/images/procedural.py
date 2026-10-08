"""
Procedural 3D Crystal Keyframe Renderer Adapter.
Offline Pillow-based geometric render engine for 3D crystal humanoids and luxury scenes.
"""

from pathlib import Path
from core.logger import logger
from services.media.base import BaseImageProvider, ImageGenRequest, ImageGenResult
from services.image_renderer import render_crystal_scene_keyframe, render_crystal_character_portrait


class ProceduralCrystalAdapter(BaseImageProvider):
    """Offline procedural crystal rendering fallback."""

    @property
    def name(self) -> str:
        return "procedural"

    def generate(self, req: ImageGenRequest) -> ImageGenResult:
        output_path = req.output_path or Path("temp_keyframe.png")
        logger.info(f"[Procedural] Rendering geometric crystal keyframe -> {output_path.name}")

        if "character" in str(output_path.parent).lower() or output_path.parent.name == "characters":
            char_name = output_path.stem
            char_dict = {
                "name": char_name,
                "crystal_shader": req.character_anchors or "Faceted Blue Sapphire Crystal",
                "signature_wardrobe": "Luxury Silk Gown",
                "visual_anchor": req.character_anchors
            }
            saved_path = render_crystal_character_portrait(
                character_name=char_name,
                character_data=char_dict,
                output_path=output_path
            )
        else:
            saved_path = render_crystal_scene_keyframe(
                prompt=req.prompt,
                visual_description=req.prompt,
                involved_characters=req.involved_characters or [],
                output_path=output_path,
                setting=req.setting or ""
            )

        return ImageGenResult(
            image_path=saved_path,
            seed=req.seed,
            provider=self.name,
            metadata={"engine": "procedural_crystal"}
        )

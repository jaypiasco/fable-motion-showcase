"""
3D Crystal Drama Image Rendering Engine (services/image_renderer.py).
Generates high-resolution 9:16 vertical 3D faceted-crystal imagery for character bibles
and scene keyframes (Nano Banana Pro / Octane 3D style).
"""

import os
import math
import random
import re
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from core.logger import logger


GEM_PALETTES: Dict[str, Tuple[Tuple[int, int, int], str]] = {
    "sapphire": ((25, 80, 220), "Deep Translucent Blue Sapphire"),
    "emerald": ((20, 180, 90), "Vibrant Refractive Emerald Green"),
    "ruby": ((210, 30, 70), "Crimson Glowing Faceted Ruby"),
    "diamond": ((210, 240, 255), "Iridescent Holographic Diamond"),
    "amethyst": ((140, 50, 210), "Deep Regal Amethyst Violet"),
    "topaz": ((230, 160, 30), "Radiant Golden Amber Topaz"),
    "onyx": ((40, 45, 60), "Smoky Obsidian Gloss Black"),
    "rose": ((235, 100, 160), "Translucent Rose Quartz Pink"),
}


def detect_gem_color(text: str) -> Tuple[int, int, int]:
    """Detects gem material or produce color from prompt or character name."""
    lower = text.lower()
    if "banana" in lower:
        return (248, 212, 42)  # Ripe banana yellow
    if "onion" in lower:
        return (180, 45, 120)  # Red onion magenta-violet
    if "cabbage" in lower:
        return (50, 165, 85)   # Savoy cabbage emerald green
    if "carrot" in lower:
        return (240, 110, 25)  # Carrot orange
    if "strawberry" in lower:
        return (225, 35, 55)   # Strawberry crimson
    if "lemon" in lower:
        return (250, 225, 45)  # Lemon bright yellow
    if "eggplant" in lower:
        return (75, 30, 105)   # Eggplant deep indigo
    if "tomato" in lower:
        return (215, 45, 35)   # Heirloom tomato red
    for gem_key, (rgb, _) in GEM_PALETTES.items():
        if gem_key in lower:
            return rgb
    if "gold" in lower or "yellow" in lower:
        return (230, 170, 30)
    if "green" in lower:
        return (20, 180, 90)
    if "red" in lower:
        return (210, 30, 70)
    if "purple" in lower:
        return (140, 50, 210)
    # Default to luxury deep sapphire blue
    return (25, 80, 220)


def render_crystal_character_portrait(
    character_name: str,
    character_data: Dict[str, Any],
    output_path: Path
) -> Path:
    """
    Renders an individual character reference portrait (Phase 2)
    and saves to characters/{character_name}.png.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    width, height = 1080, 1920
    img = Image.new("RGBA", (width, height), (8, 12, 22, 255))
    draw = ImageDraw.Draw(img)

    shader_desc = character_data.get("surface_shader") or character_data.get("material_shader") or character_data.get("fruit_shader") or character_data.get("crystal_shader", "")
    gem_color = detect_gem_color(character_name + " " + shader_desc)
    wardrobe = character_data.get("signature_wardrobe", "").lower()
    is_white_silk = "white" in wardrobe or "silk" in wardrobe or "ivory" in wardrobe

    # 1. Luxury Neoclassical Gradient Backdrop
    for y in range(height):
        ratio = y / height
        r = int(6 + 18 * (1 - ratio) + 8 * math.sin(ratio * 3.14))
        g = int(10 + 35 * (1 - ratio) + 15 * math.sin(ratio * 3.14))
        b = int(24 + 75 * (1 - ratio) + 30 * math.sin(ratio * 3.14))
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    # 2. Volumetric lighting rays & architectural pillars
    for i in range(14):
        ray_x = width * (i / 14) + random.randint(-40, 40)
        draw.polygon(
            [(ray_x, 0), (ray_x + 100, 0), (ray_x + 280, height), (ray_x + 160, height)],
            fill=(40, 110, 210, 16)
        )

    cx, cy = width // 2, int(height * 0.44)
    scale = 1.35

    # 3. High-Fashion Tailored Wardrobe (Silk blazer with gold trim)
    blazer_fill = (242, 245, 252, 245) if is_white_silk else (25, 30, 45, 245)
    blazer_poly = [
        (cx - int(280 * scale), cy + int(180 * scale)),
        (cx - int(120 * scale), cy + int(65 * scale)),
        (cx + int(120 * scale), cy + int(65 * scale)),
        (cx + int(280 * scale), cy + int(180 * scale)),
        (cx + int(360 * scale), cy + int(650 * scale)),
        (cx - int(360 * scale), cy + int(650 * scale)),
    ]
    draw.polygon(blazer_poly, fill=blazer_fill)
    draw.line(blazer_poly, fill=(225, 185, 65, 255), width=7)
    draw.line([(cx, cy + int(65 * scale)), (cx, cy + int(650 * scale))], fill=(215, 175, 55, 255), width=5)

    # 4. Faceted 3D Crystal Head & Body Polygons (Sharp geometric poly facets)
    head_nodes = [
        (cx, cy - int(230 * scale)),                    # 0: Crown
        (cx - int(115 * scale), cy - int(135 * scale)),  # 1: Temple L
        (cx + int(115 * scale), cy - int(135 * scale)),  # 2: Temple R
        (cx - int(95 * scale), cy + int(15 * scale)),    # 3: Cheek L
        (cx + int(95 * scale), cy + int(15 * scale)),    # 4: Cheek R
        (cx, cy + int(75 * scale)),                     # 5: Chin
        (cx, cy - int(35 * scale)),                     # 6: Nose Apex
        (cx, cy - int(125 * scale)),                    # 7: Forehead Center
    ]

    facets = [
        (0, 1, 7), (0, 7, 2),
        (1, 3, 7), (2, 7, 4),
        (7, 3, 6), (7, 6, 4),
        (3, 5, 6), (4, 6, 5),
    ]

    base_r, base_g, base_b = gem_color

    for idx, (p1, p2, p3) in enumerate(facets):
        pts = [head_nodes[p1], head_nodes[p2], head_nodes[p3]]
        shade = 0.65 + 0.55 * math.cos(idx * 1.1 + 0.5)
        fr = min(255, int(base_r * shade + 35))
        fg = min(255, int(base_g * shade + 45))
        fb = min(255, int(base_b * shade + 75))
        draw.polygon(pts, fill=(fr, fg, fb, 235))
        draw.polygon(pts, outline=(210, 245, 255, 190), width=2)

    # 5. Glowing Geometric Eyes & Face Refractions
    eye_y = cy - int(55 * scale)
    eye_glow = (min(255, base_r + 120), min(255, base_g + 120), min(255, base_b + 120), 255)
    draw.ellipse([(cx - int(60 * scale), eye_y - 8), (cx - int(25 * scale), eye_y + 8)], fill=eye_glow)
    draw.ellipse([(cx + int(25 * scale), eye_y - 8), (cx + int(60 * scale), eye_y + 8)], fill=eye_glow)

    img = img.filter(ImageFilter.SMOOTH_MORE)
    img.save(output_path, "PNG")
    logger.info(f"[Image Engine] Rendered character reference portrait for '{character_name}' -> {output_path}")
    return output_path


def render_crystal_scene_keyframe(
    prompt: str,
    visual_description: str,
    involved_characters: List[Dict[str, Any]],
    output_path: Path,
    setting: str = ""
) -> Path:
    """
    Renders a full 9:16 vertical scene keyframe (Phase 3)
    combining Phase 1 visual_description + Phase 2 character bibles.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    width, height = 1080, 1920
    img = Image.new("RGBA", (width, height), (8, 12, 22, 255))
    draw = ImageDraw.Draw(img)

    num_chars = len(involved_characters) if involved_characters else 1

    # 1. Neoclassical Vault / Grand Ballroom Setting Gradient
    for y in range(height):
        ratio = y / height
        r = int(8 + 20 * (1 - ratio) + 12 * math.sin(ratio * 3.14))
        g = int(14 + 40 * (1 - ratio) + 20 * math.sin(ratio * 3.14))
        b = int(32 + 80 * (1 - ratio) + 35 * math.sin(ratio * 3.14))
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    # 2. Vault Architecture & Volumetric Light Shafts
    for i in range(16):
        ray_x = width * (i / 16) + random.randint(-40, 40)
        draw.polygon(
            [(ray_x, 0), (ray_x + 90, 0), (ray_x + 260, height), (ray_x + 150, height)],
            fill=(50, 130, 230, 20)
        )

    # 3. Opulent Vault Pedestal & Glowing Crystal Hologram
    pedestal_y = int(height * 0.72)
    draw.polygon(
        [(width // 2 - 240, pedestal_y), (width // 2 + 240, pedestal_y), (width // 2 + 380, height), (width // 2 - 380, height)],
        fill=(14, 25, 48, 250), outline=(70, 190, 250, 220), width=5
    )
    # Glowing Holographic Scroll / Will
    draw.ellipse(
        [(width // 2 - 160, pedestal_y - 80), (width // 2 + 160, pedestal_y + 40)],
        fill=(0, 240, 255, 120), outline=(200, 255, 255, 200), width=3
    )

    # 4. Render Characters in Scene
    positions = []
    if num_chars == 1:
        positions = [(width // 2, int(height * 0.46), 1.15)]
    elif num_chars == 2:
        positions = [
            (int(width * 0.35), int(height * 0.46), 1.05),
            (int(width * 0.68), int(height * 0.48), 0.95)
        ]
    else:
        positions = [
            (int(width * 0.28), int(height * 0.46), 0.95),
            (int(width * 0.50), int(height * 0.44), 1.05),
            (int(width * 0.75), int(height * 0.48), 0.90)
        ]

    for idx, (cx, cy, scale) in enumerate(positions):
        c_info = involved_characters[idx] if idx < len(involved_characters) else {}
        char_name = c_info.get("name", "Character")
        c_shader = c_info.get("surface_shader") or c_info.get("material_shader") or c_info.get("fruit_shader") or c_info.get("crystal_shader", "")
        gem_color = detect_gem_color(char_name + " " + c_shader)
        wardrobe = c_info.get("signature_wardrobe", "").lower()
        is_white_silk = "white" in wardrobe or "silk" in wardrobe or "ivory" in wardrobe

        # Luxury Wardrobe
        blazer_fill = (242, 245, 252, 240) if is_white_silk else (22, 28, 42, 240)
        blazer_poly = [
            (cx - int(240 * scale), cy + int(160 * scale)),
            (cx - int(100 * scale), cy + int(55 * scale)),
            (cx + int(100 * scale), cy + int(55 * scale)),
            (cx + int(240 * scale), cy + int(160 * scale)),
            (cx + int(300 * scale), cy + int(580 * scale)),
            (cx - int(300 * scale), cy + int(580 * scale)),
        ]
        draw.polygon(blazer_poly, fill=blazer_fill)
        draw.line(blazer_poly, fill=(225, 185, 65, 255), width=6)
        draw.line([(cx, cy + int(55 * scale)), (cx, cy + int(580 * scale))], fill=(215, 175, 55, 255), width=4)

        # 3D Faceted Crystal Head
        head_nodes = [
            (cx, cy - int(210 * scale)),
            (cx - int(105 * scale), cy - int(120 * scale)),
            (cx + int(105 * scale), cy - int(120 * scale)),
            (cx - int(85 * scale), cy + int(15 * scale)),
            (cx + int(85 * scale), cy + int(15 * scale)),
            (cx, cy + int(65 * scale)),
            (cx, cy - int(30 * scale)),
            (cx, cy - int(115 * scale)),
        ]

        facets = [
            (0, 1, 7), (0, 7, 2),
            (1, 3, 7), (2, 7, 4),
            (7, 3, 6), (7, 6, 4),
            (3, 5, 6), (4, 6, 5),
        ]

        base_r, base_g, base_b = gem_color
        for f_idx, (p1, p2, p3) in enumerate(facets):
            pts = [head_nodes[p1], head_nodes[p2], head_nodes[p3]]
            shade = 0.65 + 0.55 * math.cos(f_idx * 1.1 + idx * 0.8)
            fr = min(255, int(base_r * shade + 35))
            fg = min(255, int(base_g * shade + 45))
            fb = min(255, int(base_b * shade + 75))
            draw.polygon(pts, fill=(fr, fg, fb, 235))
            draw.polygon(pts, outline=(210, 245, 255, 190), width=2)

        # Glowing Eyes
        eye_y = cy - int(50 * scale)
        eye_glow = (min(255, base_r + 120), min(255, base_g + 120), min(255, base_b + 120), 255)
        draw.ellipse([(cx - int(50 * scale), eye_y - 7), (cx - int(20 * scale), eye_y + 7)], fill=eye_glow)
        draw.ellipse([(cx + int(20 * scale), eye_y - 7), (cx + int(50 * scale), eye_y + 7)], fill=eye_glow)

    img = img.filter(ImageFilter.SMOOTH_MORE)
    img.save(output_path, "PNG")
    logger.info(f"[Image Engine] Rendered 9:16 vertical scene keyframe -> {output_path}")
    return output_path

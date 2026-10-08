"""
Image utility module for Fable Motion.
Provides robust detection, cropping, and aspect ratio normalization for scene keyframes
to ensure zero letterboxing/pillarboxing before video generation (e.g. Veo).
"""

from pathlib import Path
from typing import Tuple, Optional
from PIL import Image
from core.logger import logger


def crop_black_bars(
    image_path: Path,
    target_ratio: float = 9 / 16,
    threshold: int = 20,
    min_resolution: Tuple[int, int] = (720, 1280),
) -> Path:
    """
    Inspects an image, detects and removes black/dark letterbox or pillarbox bars,
    and ensures the resulting image matches true 9:16 portrait resolution
    (defaulting to 720x1280 or 1080x1920). Overwrites or returns the sanitized image.

    Args:
        image_path: Path to the image file.
        target_ratio: Desired aspect ratio (width / height), defaults to 9/16 (0.5625).
        threshold: Pixel value threshold below which a pixel is considered black (0-255).
        min_resolution: Minimum output dimensions (width, height), e.g. (720, 1280).

    Returns:
        Path to the sanitized image (saved back to image_path).
    """
    if not image_path.exists() or image_path.stat().st_size == 0:
        logger.warning(f"[ImageUtils] Cannot crop black bars: file does not exist or is empty ({image_path}).")
        return image_path

    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            orig_w, orig_h = img.size

            # 1. Detect content bounding box by thresholding out black/near-black pixels
            # A pixel where max(R, G, B) > threshold is considered content
            gray = img.convert("L")
            # Map pixels <= threshold to 0, and > threshold to 255
            mask = gray.point(lambda p: 255 if p > threshold else 0, mode="1")
            bbox = mask.getbbox()

            if bbox:
                left, top, right, bottom = bbox
                # Only crop if there's a meaningful black border (at least 2px on any side)
                if left > 2 or top > 2 or right < orig_w - 2 or bottom < orig_h - 2:
                    logger.info(
                        f"[ImageUtils] Detected black borders in {image_path.name}: "
                        f"original ({orig_w}x{orig_h}), content bbox ({left}, {top}, {right}, {bottom}). Cropping..."
                    )
                    img = img.crop((left, top, right, bottom))
            else:
                logger.warning(f"[ImageUtils] Image appears completely black: {image_path.name}")

            cropped_w, cropped_h = img.size
            current_ratio = cropped_w / cropped_h

            # 2. Adjust crop to exact target aspect ratio (9:16 = 0.5625)
            # If current_ratio > target_ratio (too wide/squat), crop sides
            # If current_ratio < target_ratio (too tall/thin), crop top/bottom
            tolerance = 0.005
            if abs(current_ratio - target_ratio) > tolerance:
                if current_ratio > target_ratio:
                    # Too wide -> center-crop width
                    new_w = int(cropped_h * target_ratio)
                    offset = (cropped_w - new_w) // 2
                    img = img.crop((offset, 0, offset + new_w, cropped_h))
                else:
                    # Too tall -> center-crop height
                    new_h = int(cropped_w / target_ratio)
                    offset = (cropped_h - new_h) // 2
                    img = img.crop((0, offset, cropped_w, offset + new_h))

            # 3. Ensure standard resolution: exactly 720x1280 or 1080x1920
            w, h = img.size
            if w >= 1000:
                final_w, final_h = (1080, 1920)
            else:
                final_w, final_h = (720, 1280)

            if (w, h) != (final_w, final_h):
                img = img.resize((final_w, final_h), resample=Image.Resampling.LANCZOS)
                logger.info(f"[ImageUtils] Standardized {image_path.name} to {final_w}x{final_h} (true 9:16).")

            # Save back sanitized image
            img.save(image_path, format="PNG", quality=95)
            logger.info(f"[ImageUtils] Clean 9:16 keyframe saved: {image_path.name} ({final_w}x{final_h})")

    except Exception as e:
        logger.error(f"[ImageUtils] Error cropping black bars for {image_path}: {e}")

    return image_path

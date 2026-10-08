"""
API Helpers, Request Schemas & Utility Functions.
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional
from pydantic import BaseModel

from config import config


class NewStoryRequest(BaseModel):
    prompt: str
    max_scenes: Optional[int] = None
    run_now: Optional[bool] = True
    parent_story_id: Optional[str] = None


def get_agent_models_info() -> Dict[str, Any]:
    """Returns the current configured models and agent providers."""
    img_model = getattr(config, "IMAGEN_MODEL", "imagen-3.0-generate-002")
    vid_model = getattr(config, "VEO_MODEL", "veo-3.1-generate-preview")
    tts_display = "Phased Out" if not getattr(config, "ENABLE_VOICEOVER", False) else config.TTS_PROVIDER
    return {
        "script_model": config.SCRIPT_MODEL,
        "image_provider": config.IMAGE_PROVIDER,
        "image_model": img_model,
        "image_model_display": f"{config.IMAGE_PROVIDER} ({img_model})",
        "video_provider": config.VIDEO_PROVIDER,
        "video_model": vid_model,
        "video_model_display": f"{config.VIDEO_PROVIDER} ({vid_model})",
        "tts_provider": config.TTS_PROVIDER,
        "tts_model": tts_display,
        "lipsync_provider": "Phased Out",
        "assembly_enabled": getattr(config, "ENABLE_ASSEMBLY", False),
        "aspect_ratio": config.IMAGE_ASPECT_RATIO,
    }


def normalize_media_url(file_path_str: Optional[str]) -> Optional[str]:
    """Converts a local filesystem path, cloud URL, or archive path to a web-accessible URL."""
    if not file_path_str:
        return None
    file_path_clean = str(file_path_str).strip()
    if not file_path_clean:
        return None
    # If already a web URL or /media/ route, return directly
    if file_path_clean.startswith("http://") or file_path_clean.startswith("https://") or file_path_clean.startswith("/media/"):
        return file_path_clean
    try:
        p = Path(file_path_clean)
        # 1. Try relative to configured ARCHIVE_DIR
        try:
            rel = p.relative_to(config.ARCHIVE_DIR)
            return f"/media/{rel.as_posix()}"
        except (ValueError, Exception):
            pass

        # 2. Extract path after 'archive' if contained in path parts
        parts = list(p.parts)
        if "archive" in parts:
            idx = parts.index("archive")
            rel_parts = parts[idx + 1:]
            if rel_parts:
                return f"/media/{'/'.join(rel_parts)}"

        # 3. Fallback to clean relative posix representation
        norm = file_path_clean.replace("\\", "/").lstrip("/")
        if norm.startswith("media/"):
            return f"/{norm}"
        if "archive/" in norm:
            return f"/media/{norm.split('archive/', 1)[1]}"
        return f"/media/{p.name}"
    except Exception:
        return None


def read_json_safely(path: Path) -> Optional[Dict[str, Any]]:
    """Safely reads a JSON file without raising exceptions on corrupt/missing files."""
    if path.exists() and path.is_file():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None

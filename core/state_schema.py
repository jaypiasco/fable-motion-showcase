"""
Pipeline State Schema & Initializer.
Provides default state tree structure and helper utilities for story run instances.
"""

import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional


def generate_slug(text: str) -> str:
    """Converts prompt or title to a safe filesystem slug."""
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    words = text.strip().split()[:5]
    return "_".join(words) if words else "story"


def create_initial_state(
    prompt: str,
    story_id: str,
    story_slug: str,
    archive_dir: Path,
    parent_story_id: Optional[str] = None
) -> Dict[str, Any]:
    """Generates the initial JSON state dictionary adhering to pipeline_state_schema.json."""
    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        "story_id": story_id,
        "story_slug": story_slug,
        "parent_story_id": parent_story_id,
        "prompt": prompt,
        "created_at": now_iso,
        "updated_at": now_iso,
        "status": "in_progress",
        "manual_approval_required": True,
        "paused": False,
        "checkpoint": {"phase": "phase_1_script", "item": None},
        "concepts": [],
        "selected_concept": None,
        "current_phase": "phase_1_script",
        "archive_dir": str(archive_dir),
        "retry_count": 0,
        "last_error": None,
        "phases": {
            "phase_1_script": {
                "status": "pending",
                "completed_at": None,
                "data": None
            },
            "phase_2_characters": {
                "status": "pending",
                "completed_at": None,
                "data": None
            },
            "phase_3_images": {
                "status": "pending",
                "completed_at": None,
                "items": []
            },
            "phase_4_animation_prompts": {
                "status": "pending",
                "completed_at": None,
                "items": []
            },
            "phase_5_video_generation": {
                "status": "pending",
                "completed_at": None,
                "items": []
            },
            "assembly": {
                "status": "pending",
                "completed_at": None,
                "clips_manifest_path": None,
                "merged_video_path": None,
                "voiceover_path": None,
                "final_video_path": None,
                "subtitles_path": None,
                "captioned_video_path": None
                ,"error": None
            }
        }
    }

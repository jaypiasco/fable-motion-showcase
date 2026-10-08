"""
Backlog Queue Engine for AI Video Story Pipeline.
Provides atomic file-based queue persistence and queue management operations.
"""

import time
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

from config import config
from core.logger import logger


def load_queue() -> List[Dict[str, Any]]:
    """Loads the backlog queue from disk safely."""
    if not config.QUEUE_FILE.exists():
        return []
    try:
        with open(config.QUEUE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                return data.get("queue", [])
            return []
    except Exception:
        return []


def save_queue(queue: List[Dict[str, Any]]):
    """Saves the backlog queue atomically to disk."""
    config.QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    temp_file = config.QUEUE_FILE.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(queue, f, indent=2, ensure_ascii=False)
    temp_file.replace(config.QUEUE_FILE)


def add_to_queue(
    prompt: str,
    title: Optional[str] = None,
    max_scenes: Optional[int] = None,
    parent_story_id: Optional[str] = None
) -> Dict[str, Any]:
    """Adds a new story concept or continuation sequence to the backlog queue."""
    q = load_queue()
    item = {
        "id": f"item_{int(time.time())}_{len(q) + 1}",
        "prompt": prompt.strip(),
        "title": title or prompt.strip()[:40],
        "max_scenes": max_scenes,
        "parent_story_id": parent_story_id,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "status": "pending"
    }
    q.append(item)
    save_queue(q)
    logger.info(f"[Queue] Added story to queue: '{item['title']}' (Queue size: {len(q)})")
    return item


def clear_queue():
    """Clears all items in the backlog queue."""
    save_queue([])
    logger.info("[Queue] Story queue cleared.")

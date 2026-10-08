"""
Cancellation and Interrupt Management for AI Video Story Pipeline.
Provides thread-safe cancellation tracking and standardized cancellation exceptions.
"""

import threading
from typing import Set


class CancellationManager:
    """Thread-safe in-memory cancellation registry for active story pipeline executions."""
    _cancelled_stories: Set[str] = set()
    _lock = threading.Lock()

    @classmethod
    def cancel_story(cls, story_id: str) -> None:
        with cls._lock:
            cls._cancelled_stories.add(story_id)

    @classmethod
    def clear_cancellation(cls, story_id: str) -> None:
        with cls._lock:
            cls._cancelled_stories.discard(story_id)

    @classmethod
    def is_cancelled(cls, story_id: str) -> bool:
        with cls._lock:
            return story_id in cls._cancelled_stories


class GenerationCancelledError(Exception):
    """Raised when a story pipeline phase execution is cancelled or halted by user command."""
    pass

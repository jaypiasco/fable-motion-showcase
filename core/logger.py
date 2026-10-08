"""
Structured Logger for AI Video Story Pipeline.
"""

import sys
from pathlib import Path
from loguru import logger
from config import config

# Remove default handler
logger.remove()

# Standard console logging format
LOG_FORMAT = (
    "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
    "<level>{level: <8}</level> | "
    "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
    "<level>{message}</level>"
)

# Console logger
logger.add(
    sys.stdout,
    format=LOG_FORMAT,
    level="INFO",
    colorize=True
)

# File logger for global pipeline logs
global_log_path = config.LOGS_DIR / "pipeline.log"
logger.add(
    str(global_log_path),
    rotation="10 MB",
    retention="14 days",
    format=LOG_FORMAT,
    level="DEBUG",
    encoding="utf-8"
)


def attach_story_logger(story_dir: Path) -> int:
    """Attaches a dedicated log file to the specific story directory."""
    story_log_path = story_dir / "story_execution.log"
    return logger.add(
        str(story_log_path),
        format=LOG_FORMAT,
        level="DEBUG",
        encoding="utf-8"
    )


def detach_story_logger(handler_id: int):
    """Detaches and closes a dedicated story log file handler."""
    try:
        logger.remove(handler_id)
    except Exception:
        pass

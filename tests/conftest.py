"""
Pytest configuration and shared fixtures for FableMotion test suite.
"""

import os
import json
import pytest
from pathlib import Path

# Ensure mock/test environment variables are set
os.environ.setdefault("ENABLE_LANGFUSE", "false")
os.environ.setdefault("ENVIRONMENT", "test")


@pytest.fixture(scope="session")
def project_root() -> Path:
    """Returns the project root directory."""
    return Path(__file__).resolve().parent.parent


@pytest.fixture
def sample_story_script():
    """Provides a realistic sample 3-scene script for pipeline testing."""
    return {
        "title": "The Heirloom Betrayal",
        "logline": "Arthur discovers his partner forged a secret prenuptial agreement before the harvest gala.",
        "hook_3s": "Arthur gasps in shock as he uncovers the forged seal inside the locked walnut bureau.",
        "genre": "Viral 3D Anthropomorphic Produce Drama",
        "aspect_ratio": "9:16",
        "scenes": [
            {
                "scene_id": 1,
                "timestamp": "00:00 - 00:05",
                "setting": "Opulent Modern Penthouse Dressing Suite",
                "motion_level": "subtle_emotion",
                "is_speaking": True,
                "recommended_engine": "google_veo",
                "visual_description": "Arthur, an anthropomorphic banana male in a bespoke navy blazer, uncovers forged documents, eyes wide in disbelief.",
                "characters": ["Arthur"],
                "voiceover": "ARTHUR: (Whispering in shock) You signed away everything behind my back?!",
                "dialogue": "ARTHUR: You signed away everything behind my back?!",
                "video_prompt": "Slow camera push-in on Arthur's trembling peel hands holding document, shallow depth of field.",
                "sfx_cue": "Sudden sharp cello tension riser with muffled heartbeat",
                "duration_seconds": 5
            },
            {
                "scene_id": 2,
                "timestamp": "00:05 - 00:10",
                "setting": "Rain-Drenched Penthouse Balcony",
                "motion_level": "dynamic_action",
                "is_speaking": True,
                "recommended_engine": "google_veo",
                "visual_description": "Elena, an anthropomorphic red onion in an emerald silk evening gown, turns sharply in the rain, unapologetic glare.",
                "characters": ["Elena"],
                "voiceover": "ELENA: (Cold, unwavering) It was never about love, Arthur.",
                "dialogue": "ELENA: It was never about love, Arthur.",
                "video_prompt": "Tracking shot through raindrops, lightning flash illuminating Elena's polished exterior.",
                "sfx_cue": "Heavy rain rumble and thunderclap",
                "duration_seconds": 5
            }
        ]
    }

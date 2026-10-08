"""
Unit Test Suite: Deterministic Output Guardrails & Prompt Sanitizer.

Verifies that LLM-generated visual descriptions and dialogue scripts are stripped
of hallucinated supernatural modifiers, prohibited lighting tropes, and non-grounded
descriptors prior to conditioning Google Imagen 3 and Veo 3.1 Fast.
"""

import pytest
from core.sanitizer import (
    sanitize_visual_description,
    sanitize_dialogue,
    sanitize_scene_dict,
)


def test_regression_compound_scene_sanitization():
    """
    Verifies end-to-end sanitization on a compound scene containing both
    prohibited visual lighting flares and disallowed dialogue tropes.
    """
    raw_visual = (
        "Arthur steps forward, removing his oversized hoodie to reveal his "
        "shredded, chiseled garlic physique. His eyes flare with supernatural golden light."
    )
    raw_voiceover = (
        "ARTHUR: (Cold, commanding tone) Move aside, amateur. "
        "Let me show you how a true god lifts."
    )

    clean_visual = sanitize_visual_description(raw_visual)
    assert "supernatural golden light" not in clean_visual
    assert "His eyes flare with supernatural" not in clean_visual
    assert "garlic physique" in clean_visual
    assert "steely determination" in clean_visual or "eyes" in clean_visual

    clean_voiceover = sanitize_dialogue(raw_voiceover)
    assert "god" not in clean_voiceover.lower()
    assert "how a true champion lifts" in clean_voiceover


@pytest.mark.parametrize(
    "raw_prompt, expected_replacement",
    [
        ("His eyes flare with supernatural golden light.", "steely determination"),
        ("Her eyes flare with supernatural fiery light.", "steely determination"),
        ("Eyes flare with golden light as he lifts the barbell.", "grounded determination"),
        ("Arthur glares with glowing fiery eye flares.", "dramatic muscle tension"),
        ("Translucent skin with glowing golden eyes.", "large glossy animated eyes"),
        ("Volumetric godrays shining through the high windows.", "volumetric rim lighting"),
    ],
)
def test_sanitize_visual_hallucination_modifiers(raw_prompt: str, expected_replacement: str):
    """
    Parametrized guardrail check ensuring prohibited supernatural/glowing visual
    hallucinations are normalized into grounded studio lighting descriptors.
    """
    sanitized = sanitize_visual_description(raw_prompt)
    assert "supernatural" not in sanitized.lower()
    assert "glowing" not in sanitized.lower()
    assert "godray" not in sanitized.lower()
    assert expected_replacement in sanitized


@pytest.mark.parametrize(
    "raw_dialogue, expected_phrase",
    [
        ("Move aside, amateur. Let me show you how a true god lifts.", "true champion"),
        ("I am a true god in this arena.", "true champion"),
        ("Bow before a god!", "before a champion"),
        ("His godlike power shocked everyone.", "unstoppable power"),
    ],
)
def test_sanitize_dialogue_deity_tropes(raw_dialogue: str, expected_phrase: str):
    """
    Parametrized check ensuring prohibited deity tropes in character dialogue
    are normalized into grounded competitive phrasing.
    """
    sanitized = sanitize_dialogue(raw_dialogue)
    assert "god" not in sanitized.lower()
    assert expected_phrase in sanitized


def test_sanitize_nested_scene_payload():
    """
    Verifies recursive sanitization across structured scene dictionaries,
    including nested speaker dialogue arrays.
    """
    scene = {
        "scene_id": 11,
        "visual_description": "Arthur steps forward. His eyes flare with supernatural golden light.",
        "voiceover": "ARTHUR: Move aside. Let me show you how a true god lifts.",
        "dialogue": [
            {
                "speaker": "Arthur",
                "exact_speech": "Let me show you how a true god lifts.",
            }
        ],
    }
    cleaned = sanitize_scene_dict(scene)
    assert "supernatural" not in cleaned["visual_description"].lower()
    assert "god" not in cleaned["voiceover"].lower()
    assert "champion" in cleaned["voiceover"].lower()
    assert "god" not in cleaned["dialogue"][0]["exact_speech"].lower()
    assert "champion" in cleaned["dialogue"][0]["exact_speech"].lower()

"""
Unit tests for Call-To-Action (CTA) strategies and platform-tailored SEO prompts.
Verifies backward compatibility with default branding and dynamic engagement overrides.
"""

import pytest
from prompts.phase5_prompts import (
    CTA_PRESETS,
    PHASE_5_SEO_SYSTEM_PROMPT,
    format_phase5_seo_prompt,
)


def test_default_cta_presence():
    """Ensures the baseline brand CTA is enforced in default system prompts."""
    assert "fablemotion.ai" in PHASE_5_SEO_SYSTEM_PROMPT
    assert "Visit fablemotion.ai and create your own ai short stories" in PHASE_5_SEO_SYSTEM_PROMPT


def test_custom_cta_prompt_formatting():
    """Verifies custom CTA injection with platform-aware formatting rules."""
    script_str = '{"title": "The Banana Betrayal", "scenes": []}'
    custom_cta = "Who was in the wrong? Vote in the comments below! 👇"

    prompt = format_phase5_seo_prompt(script_str, custom_cta=custom_cta)
    assert custom_cta in prompt
    assert "CUSTOM CALL-TO-ACTION (CTA) DIRECTIVE" in prompt
    assert "TikTok: Integrate natively into the caption hook" in prompt
    assert "YouTube Shorts: Include in description body" in prompt


def test_preset_cta_strategies():
    """Verifies that all pre-engineered viral CTA strategies resolve cleanly."""
    script_str = '{"title": "Produce Showdown", "scenes": []}'
    
    for strategy_name, expected_text in CTA_PRESETS.items():
        prompt = format_phase5_seo_prompt(script_str, cta_strategy=strategy_name)
        assert expected_text in prompt
        assert "Platform-Aware Formatting Rules" in prompt


def test_unrecognized_strategy_falls_back_gracefully():
    """Ensures unrecognized strategy names fall back cleanly to standard formatting without error."""
    script_str = '{"title": "Test Story"}'
    prompt = format_phase5_seo_prompt(script_str, cta_strategy="non_existent_strategy")
    assert "CUSTOM CALL-TO-ACTION (CTA) DIRECTIVE" not in prompt
    assert "Story Script & Characters" in prompt

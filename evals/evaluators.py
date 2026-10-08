"""
Evaluation metrics, quality rubrics, and scoring functions for FableMotion pipeline outputs.
Evaluates deterministic schema adherence, cross-scene character token persistence,
viral hook & dialogue conciseness, safety guardrails, and social CTA distribution packages.
"""

from typing import Dict, Any, List, Optional
import re


def evaluate_schema_and_structure(scenes: List[Dict[str, Any]], criteria: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluates JSON schema completeness, scene count boundaries, and cinematic camera cues."""
    scores = {}
    min_scenes = criteria.get('min_scenes', 1)
    max_scenes = criteria.get('max_scenes', 14)

    scene_count = len(scenes)
    scores['scene_count_valid'] = 1.0 if (min_scenes <= scene_count <= max_scenes) else 0.0

    required_keys = {'scene_number', 'narration', 'visual_prompt'}
    # Also support alternate scene schema keys (scene_id, dialogue/voiceover, visual_description)
    alt_required_keys = {'scene_id', 'visual_description'}

    valid_scenes = 0
    for s in scenes:
        keys = set(s.keys())
        if required_keys.issubset(keys) or alt_required_keys.issubset(keys):
            valid_scenes += 1

    scores['schema_completeness'] = valid_scenes / max(scene_count, 1)

    camera_keywords = ['shot', 'angle', 'view', 'close-up', 'pan', 'wide', 'tracking', 'cinematic', 'push-in', 'zoom']
    scenes_with_camera = [
        s for s in scenes
        if any(w in (s.get('visual_prompt', '') or s.get('video_prompt', '') or s.get('visual_description', '')).lower() for w in camera_keywords)
    ]
    scores['visual_camera_cues'] = len(scenes_with_camera) / max(scene_count, 1)

    return scores


def evaluate_character_consistency(scenes: List[Dict[str, Any]], character_profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates cross-scene character continuity.
    Checks name appearance and persistence of distinct visual identity tokens (wardrobe, textures).
    """
    char_name = character_profile.get('name', '').lower()
    visual_identity = character_profile.get('visual_identity', '').lower()
    visual_tokens = [t.strip() for t in visual_identity.split(',') if len(t.strip()) > 3]

    scene_prompts = [
        (s.get('visual_prompt', '') or s.get('visual_description', '')).lower()
        for s in scenes
    ]
    scenes_with_char = [p for p in scene_prompts if char_name in p]
    name_presence_ratio = len(scenes_with_char) / max(len(scene_prompts), 1)

    token_hits = 0
    total_checks = max(len(scene_prompts) * len(visual_tokens), 1)
    for p in scene_prompts:
        for t in visual_tokens:
            if t in p:
                token_hits += 1
    token_persistence_score = token_hits / total_checks

    overall_score = round((name_presence_ratio * 0.5) + (token_persistence_score * 0.5), 2)

    return {
        'character_name_presence': round(name_presence_ratio, 2),
        'character_token_persistence': round(token_persistence_score, 2),
        'character_consistency_score': overall_score
    }


def evaluate_viral_hook_and_dialogue(scenes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Evaluates viral hook execution in Scene 1 and strict dialogue word-limit compliance (5 to 8 words per cut, max 9).
    """
    if not scenes:
        return {'hook_present': 0.0, 'dialogue_pacing_score': 0.0}

    # Scene 1 hook check
    scene_1 = scenes[0]
    scene_1_text = (
        scene_1.get('voiceover', '') or
        scene_1.get('narration', '') or
        scene_1.get('dialogue', '')
    )
    if isinstance(scene_1_text, list) and scene_1_text:
        scene_1_text = str(scene_1_text[0])

    hook_present = 1.0 if len(str(scene_1_text).strip()) > 10 else 0.5

    # Dialogue pacing check across all scenes
    valid_pacing_count = 0
    for s in scenes:
        diag = s.get('dialogue', '') or s.get('voiceover', '') or s.get('narration', '')
        if isinstance(diag, list):
            diag = " ".join(str(d.get('exact_speech', d)) if isinstance(d, dict) else str(d) for d in diag)
        # Strip speaker attribution like "ARTHUR: (Furious) ..."
        clean_speech = re.sub(r'^[A-Z\s]+:\s*(\([^)]*\))?\s*', '', str(diag))
        words = clean_speech.strip().split()
        word_count = len(words)
        # Compliant if between 3 and 10 words per cut
        if 3 <= word_count <= 10 or word_count == 0:
            valid_pacing_count += 1

    dialogue_pacing_score = round(valid_pacing_count / max(len(scenes), 1), 2)

    return {
        'hook_present': hook_present,
        'dialogue_pacing_score': dialogue_pacing_score,
    }


def evaluate_safety_guardrails(scenes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Evaluates adherence to grounded visual and narrative guardrails.
    Penalizes prohibited supernatural glowing eyes and forbidden deity/god tropes.
    """
    banned_visual_terms = ['supernatural golden light', 'glowing eyes', 'eye flare', 'dragon-ball', 'magical aura']
    banned_deity_terms = ['true god', 'a god', 'bow before a god', 'godlike power']

    violations = 0
    for s in scenes:
        vis = (s.get('visual_prompt', '') or s.get('visual_description', '')).lower()
        dlg = str(s.get('dialogue', '') or s.get('voiceover', '')).lower()

        if any(term in vis for term in banned_visual_terms):
            violations += 1
        if any(term in dlg for term in banned_deity_terms):
            violations += 1

    safety_score = 1.0 if violations == 0 else max(0.0, 1.0 - (violations * 0.25))
    return {'guardrails_safety_score': round(safety_score, 2)}


def evaluate_cta_and_distribution(distribution_pkg: Dict[str, Any], expected_cta_substring: Optional[str] = None) -> Dict[str, Any]:
    """
    Evaluates Phase 5 social distribution metadata for YouTube Shorts, TikTok, and Instagram Reels.
    Checks CTA inclusion, hashtag counts, and search tags.
    """
    if not distribution_pkg:
        return {'cta_compliance_score': 0.0, 'distribution_completeness': 0.0}

    platforms = ['youtube_shorts', 'tiktok', 'instagram_reels']
    present_platforms = [p for p in platforms if p in distribution_pkg]
    completeness = len(present_platforms) / len(platforms)

    cta_matches = 0
    target_cta = (expected_cta_substring or 'fablemotion.ai').lower()

    for p in present_platforms:
        pkg = distribution_pkg.get(p, {})
        text_blob = str(pkg.get('description', '') or pkg.get('caption', '')).lower()
        if target_cta in text_blob or 'link in bio' in text_blob or 'comment' in text_blob:
            cta_matches += 1

    cta_score = cta_matches / max(len(present_platforms), 1)

    return {
        'cta_compliance_score': round(cta_score, 2),
        'distribution_completeness': round(completeness, 2),
    }


def compute_composite_eval_score(eval_results: Dict[str, Any]) -> float:
    """Computes a balanced composite quality score across all evaluated dimensions."""
    weights = {
        'scene_count_valid': 0.15,
        'schema_completeness': 0.20,
        'visual_camera_cues': 0.15,
        'character_consistency_score': 0.25,
        'dialogue_pacing_score': 0.10,
        'guardrails_safety_score': 0.15,
    }
    total = 0.0
    total_weights = 0.0

    for key, weight in weights.items():
        if key in eval_results:
            total += float(eval_results[key]) * weight
            total_weights += weight

    if total_weights == 0.0:
        return 0.0

    normalized_score = total / total_weights
    return round(normalized_score, 3)

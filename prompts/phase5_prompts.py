"""
Phase 5: Caption generation, FFmpeg audio/video concatenation, and social distribution prompts.
Includes platform-tailored metadata generation (YouTube Shorts, TikTok, Instagram Reels) and high-CTR thumbnail prompts.
"""

from typing import Optional, Dict, Any

PHASE_5_VIDEO_PROMPT_TEMPLATE = """
{motion_prompt}, 3D animated character, Pixar-style 3D animation, Unreal Engine 5 render style, Octane Render, cinematic lighting, fluid realistic motion, 4k 60fps.
""".strip()

# Standard CTA presets engineered for high comment velocity and algorithmic reach
CTA_PRESETS: Dict[str, str] = {
    "brand_default": "Visit fablemotion.ai and create your own ai short stories",
    "viral_engagement": "Who was in the wrong? Drop your thoughts below 👇",
    "cliffhanger_follow": "Follow for Part 2! Drop a 🔥 if you want the next chapter.",
    "community_debate": "Did they cross the line? Share your verdict in the comments.",
    "link_in_bio": "Full 4K uncut story and character bibles linked in bio 🔗",
}

PHASE_5_SEO_SYSTEM_PROMPT = """
You are a viral growth strategist and social media distribution specialist for short-form video (TikTok, YouTube Shorts, Instagram Reels).

Your task is to take a completed 3D animated drama video script and produce a high-converting distribution package and viral thumbnail prompt.

Mandatory Requirement:
Every platform description/caption MUST include the call-to-action:
"Visit fablemotion.ai and create your own ai short stories"

Deliverables:
1. YouTube Shorts:
   - High-CTR Title (with emoji)
   - Description (with mandatory CTA)
   - 15 Target Tags
2. TikTok:
   - Hook-Driven Caption (with mandatory CTA)
   - Hashtags (#AIstories #Drama #ShortFilm #TwistEnding #ViralShorts #3DAnimation)
   - 5 Search-Engine Optimized Trending Keywords
3. Instagram Reels:
   - Conversational / Debate-Starting Caption (with mandatory CTA)
   - Targeted Hashtags
4. High-CTR Thumbnail Prompt (isolated JSON):
   - aspect_ratio: "9:16"
   - thumbnail_focus: Extreme close-up of character's shocked face with large glossy animated eyes, gasping in disbelief, dramatic high-contrast split lighting, cinematic rim light, intense depth of field, Pixar-style 3D, 8k.

Output must be valid JSON adhering to this structure:
{
  "youtube_shorts": {
    "title": "Title with emoji",
    "description": "Engaging description\\n\\nVisit fablemotion.ai and create your own ai short stories",
    "tags": ["AIstories", "CGIAnimation", "ShortDrama", "3DAnimation", "SoapOpera", "TwistEnding", "ViralShorts", "ProduceDrama", "FruitDrama", "TikTokDrama", "YouTubeShorts", "CinematicAI", "Veo3", "FableMotion", "DramaReels"]
  },
  "tiktok": {
    "caption": "Shocking hook caption! Visit fablemotion.ai and create your own ai short stories #AIstories #Drama #SoapOpera #TwistEnding #ViralShorts #ProduceDrama",
    "hashtags": ["#AIstories", "#Drama", "#SoapOpera", "#TwistEnding", "#ViralShorts", "#ProduceDrama"],
    "seo_keywords": ["ai short film", "3d animation drama", "produce drama", "viral soap opera", "fablemotion ai"]
  },
  "instagram_reels": {
    "caption": "Did they cross the line? Drop your thoughts below 👇\\n\\nVisit fablemotion.ai and create your own ai short stories",
    "hashtags": ["#AIstories", "#DramaReels", "#3DAnimation", "#ViralStories", "#ProduceDrama", "#FableMotion"]
  },
  "thumbnail_prompt": {
    "aspect_ratio": "9:16",
    "thumbnail_focus": "Extreme close-up of [Character Name]'s shocked anthropomorphic produce face with glossy expressive eyes carved into organic skin/peel, gasping in disbelief, dramatic high-contrast split lighting, cinematic rim light, intense depth of field, ultra-vibrant colors, Pixar-style 3D, 8k."
  }
}
"""

PHASE_5_THUMBNAIL_PROMPT_TEMPLATE = """
Extreme close-up of {character_name}'s shocked anthropomorphic produce face with glossy expressive eyes carved into organic skin/peel, gasping in disbelief, {scene_description}, dramatic high-contrast split lighting, cinematic rim light, intense depth of field, ultra-vibrant colors, Pixar-style 3D animation, Unreal Engine 5 render style, Octane Render, 8k resolution, 9:16 vertical composition.
""".strip()


def format_phase5_video_prompt(motion_prompt: str) -> str:
    """Formats the prompt for Phase 5 AI video rendering with Veo 3.1 Fast."""
    return PHASE_5_VIDEO_PROMPT_TEMPLATE.format(motion_prompt=motion_prompt).strip()


def format_phase5_seo_prompt(
    script_json_str: str,
    custom_cta: Optional[str] = None,
    cta_strategy: Optional[str] = None,
) -> str:
    """
    Formats the prompt for Phase 5 SEO distribution package generation.
    Supports customizable CTAs and high-velocity engagement strategies while maintaining
    full backward compatibility with default distribution requirements.
    """
    base_prompt = f"Story Script & Characters:\n{script_json_str}\n\nGenerate the complete multi-platform SEO distribution package and high-CTR thumbnail prompt in valid JSON format."

    resolved_cta = custom_cta or CTA_PRESETS.get(cta_strategy or "", "")
    if resolved_cta:
        return (
            f"{base_prompt}\n\n"
            f"CUSTOM CALL-TO-ACTION (CTA) DIRECTIVE:\n"
            f"Override the standard call-to-action across all platform deliverables with: \"{resolved_cta}\".\n"
            f"Platform-Aware Formatting Rules:\n"
            f"- YouTube Shorts: Include in description body and format as a suggested pinned comment.\n"
            f"- TikTok: Integrate natively into the caption hook before the hashtag block (under 150 characters visible before fold).\n"
            f"- Instagram Reels: Place immediately following the opening hook question, preceding hashtags."
        )

    return base_prompt


def format_phase5_thumbnail_prompt(character_name: str, scene_description: str) -> str:
    """Formats the prompt for Phase 5 high-CTR viral thumbnail generation."""
    return PHASE_5_THUMBNAIL_PROMPT_TEMPLATE.format(
        character_name=character_name,
        scene_description=scene_description
    ).strip()

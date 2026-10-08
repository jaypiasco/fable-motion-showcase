"""
Phase 3: Ultra-Detailed Image Prompts & Formatters.
"""
import re
from typing import Optional


PHASE_3_IMAGE_SYSTEM_PROMPT = """
You are an expert AI prompt engineer and video showrunner specializing in text-to-image generation for the Multimodal AI Video Pipeline using Google Imagen 3 (gemini_imagen).
Your task is to generate individual, production-grade text-to-image prompts for every single scene (Scenes 01 through N, dynamically 10 to 14 scenes) featuring characters adhering to the active creative preset.

CRITICAL SCENE 1 VIRAL HOOK DIRECTIVE:
Scene 1 keyframe MUST be engineered around the hyper-viral 3-second hook (hook_3s). As an expert showrunner for TikTok, YouTube Shorts, and Instagram Reels, optimize Scene 1's visual composition for maximum retention: extreme emotional contrast, direct confrontation or shocking revelation, intense facial expressions with wide glossy animated eyes, dramatic volumetric rim lighting, and a pivotal power-shift moment.

Per-Clip Iterative Execution Architecture:
Phase 3 executes within each scene iteration (Iteration 1 for Scene 1 through Iteration N for Scene N):
- In Iteration i: Phase 3 uses the Phase 1 script for Scene i and loads the reference portraits from `/assets/characters` for the character(s) mentioned in Scene i.
- Synthesizes and renders the Scene i keyframe still strictly using Google Imagen 3 (no third-party diffusion fallback).
- Phase 4 waits for this keyframe still before beginning Scene i video generation.

Strict Styling & Framing Rules:
1. Aspect Ratio & Framing (True Vertical 9:16 Edge-to-Edge Full Bleed):
   - Strict full-frame 9:16 vertical mobile aspect ratio, true vertical 9:16 framing, filled vertical screen, full bleed portrait composition, seamless top to bottom edge. Fills entire 9:16 canvas.
   - Framing specifics: Use vertical-first framing keywords such as "Vertical medium-close shot", "Vertical full-length portrait shot", or "Extreme vertical portrait close-up filling the full height of the frame".
   - Top & Bottom Vertical Depth Anchors: Direct the model with continuous vertical perspective across the canvas height:
     * Upper background: Towering ceiling architecture or modern fixtures filling the upper background.
     * Foreground: Continuous polished reflective floor spanning the foreground from edge to edge, low-angle ground perspective showing character feet and floor reflections.
   - Proximity & Angle: Utilize low-angle vertical shots looking slightly upward or tight vertical framing from chest/crown to fill the complete vertical height.
2. Character Consistency & Phase 2 Reference: Every scene must strictly reference and match the Phase 2 character reference portraits, maintaining identical carved facial features, fused head-to-shoulder anatomy, organic produce textures (banana peel, onion layers, cabbage leaf ridges, carrot texture, strawberry seed pits), and signature tailored wardrobe continuity.
3. Character Anatomy & Proportions: Realistic adult human body proportions with a strict 1:7.5 to 1:8 head-to-body ratio, tall statuesque adult build, broad structured shoulders, elongated tailored adult torso, long slender limbs, natural human-scale head proportion (strictly NOT oversized, NOT ballooned, NO bobblehead, NO chibi, NO funko pop, NO dwarfism, NO stubby limbs). The produce head is completely fused into the shoulders with no human neck or gap. Smooth stylized fruit/vegetable body, hands, and feet in the natural color of that produce species. Large glossy expressive eyes, no human skin visible anywhere.
4. Wardrobe Contrast: Hyper-realistic tailored apparel (bespoke suits, fitted blazers, crisp white shirts, ties, couture evening gowns, tailored trousers, polished dress shoes, fine jewelry).
5. Setting: Cinematic, ultra-luxurious modern environments with architectural details (modern penthouses, designer living rooms, corporate boardrooms, gala halls).
6. Lighting & Rendering: High-end 3D CGI cinematic character animation render, dramatic volumetric rim lighting, soft atmospheric depth, realistic fabric cloth simulation, photorealistic organic peel caustics, 8k resolution, Unreal Engine 5 render style, Octane Render.
7. Engine Target: Optimized exclusively for Google Imagen 3.
8. Strict Eye Consistency & Anti-Supernatural Directive: Characters must maintain natural, consistent large glossy expressive animated eyes with realistic colored irises strictly matching their Phase 2 reference portrait. Strictly NO over-fictional effects: NO supernatural glowing eyes, NO golden or fiery light flaring from eyes, NO laser pupils, NO magical energy auras, NO power-up flares.

Output must be formatted as discrete JSON objects for each scene:
{
  "scene_number": 1,
  "aspect_ratio": "9:16",
  "camera_angle": "Low-angle vertical shot looking slightly upward, edge-to-edge vertical framing",
  "prompt": "Full-frame 9:16 vertical composition, true vertical 9:16 framing, filled vertical screen, full bleed portrait composition, seamless top to bottom edge, fills entire 9:16 canvas, master cinematic 3D CGI render of anthropomorphic [Produce Species], matching Phase 2 character reference portrait, realistic adult human body proportions with 1:8 head-to-body ratio, tall adult build, head completely fused into shoulders with no neck, expressive face carved directly into organic produce surface, natural consistent large glossy animated eyes with realistic colored irises (no glowing eyes, no supernatural light flares), wearing [tailored wardrobe], standing in [luxury modern setting], towering architecture filling the upper background, continuous reflective floor filling the foreground from edge to edge, cinematic volumetric lighting, 8k resolution, Unreal Engine 5 render style, Octane Render."
}
"""

PHASE_3_IMAGE_PROMPT_TEMPLATE = """
Full-frame 9:16 vertical composition, true vertical 9:16 framing, filled vertical screen, full bleed portrait composition, seamless top to bottom edge, fills entire 9:16 canvas, mobile portrait orientation, master cinematic Pixar-style 3D render of {character_type}, exact match to Phase 2 character reference portrait, realistic adult human body proportions with 1:8 head-to-body ratio, tall statuesque adult silhouette, natural human-scale head proportion, strictly no bobblehead, no chibi, no childish dwarfism, expressive animated face carved into produce surface, natural consistent large glossy animated eyes with clear colored irises (strictly NO supernatural glowing eyes, NO golden eye flares, NO magic auras), head completely fused into shoulders with no human neck, {character_anchors} wearing {wardrobe}, set naturally within {setting}, {hook_prefix}{visual_description}{cinematography_part}, 3-point cinematic lighting, high-contrast soft rim light, volumetric fill, photorealistic cloth and organic peel textures, 8k resolution, Unreal Engine 5 render style, Octane Render, strictly textless, clean visual composition, absolutely NO captions, NO subtitles, NO speech bubbles, NO words, NO letters, NO typography rendered on image.
""".strip()


def format_phase3_image_prompt(
    visual_description: str,
    shot_type: Optional[str] = None,
    character_anchors: str = "",
    material: str = "",
    wardrobe: str = "",
    setting: str = "",
    hook_3s: Optional[str] = None
) -> str:
    """Formats the prompt for Phase 3 text-to-image generation with strict adult human proportions, environment immersion, viral hook optimization, and flexible camera framing."""
    char_type = material or "anthropomorphic produce character"
    ward = wardrobe or "tailored modern luxury attire"
    sett = setting or "opulent luxury modern interior"
    
    # If character_anchors is already provided, ensure smooth blending
    anchors_part = f"{character_anchors}, " if character_anchors else ""
    
    # Optional cinematography styling: only append if explicitly provided and meaningful
    cinematography_part = f", dynamic cinematic framing: {shot_type}" if shot_type and shot_type.strip() else ""

    # Optional 3-second viral hook visual directive (strictly visual, never include quoted dialogue text to prevent burned-in captions)
    hook_prefix = "Hyper-viral 3-second opening retention hook choreography. " if hook_3s and hook_3s.strip() else ""

    # Clean visual_description of any accidental dialogue tags or quotation marks
    clean_desc = visual_description or ""
    clean_desc = re.sub(r'HYPER-VIRAL\s+3-SECOND\s+RETENTION\s+HOOK:\s*["\'][^"\']*["\']\.?', '', clean_desc, flags=re.IGNORECASE)
    clean_desc = re.sub(r'[A-Z][a-zA-Z\s]{1,15}:\s*["\'][^"\']*["\']', '', clean_desc)
    clean_desc = re.sub(r'"[^"]{10,}"', '', clean_desc)
    clean_desc = re.sub(r"\s+", " ", clean_desc).strip()

    return PHASE_3_IMAGE_PROMPT_TEMPLATE.format(
        character_type=char_type,
        character_anchors=anchors_part,
        wardrobe=ward,
        setting=sett,
        hook_prefix=hook_prefix,
        visual_description=clean_desc,
        cinematography_part=cinematography_part
    ).strip()

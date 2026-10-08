"""
Unified AI Client Facade.
Coordinates structured JSON generation (GeminiDirectClient) and dispatches media synthesis
through the Pluggable Media Provider Registry (Image, Video, TTS, LipSync).
"""

from pathlib import Path
from typing import Dict, Any, Optional, List

import time
from core.logger import logger
from config import config
from services.gemini_direct_client import GeminiDirectClient
from services.gateway_client import GatewayClient
from services.langfuse_tracer import langfuse_tracer
from services.media.base import ImageGenRequest, VideoGenRequest, LipSyncRequest
from services.media.registry import get_image_provider, get_video_provider, get_lipsync_provider
from prompts.master_prompts import (
    PHASE_1_CONCEPT_SYSTEM_PROMPT,
    PHASE_1_SCRIPT_SYSTEM_PROMPT,
    PHASE_2_CHARACTER_SYSTEM_PROMPT,
    PHASE_4_ANIMATION_SYSTEM_PROMPT,
    PHASE_5_SEO_SYSTEM_PROMPT,
    compile_phase1_concept_system_prompt,
    format_phase1_concept_prompt,
    format_phase1_prompt,
    format_phase2_prompt,
    format_phase3_image_prompt,
    format_phase4_motion_prompt,
    format_phase5_video_prompt,
)
from core.sanitizer import sanitize_scene_dict, sanitize_dialogue, sanitize_visual_description
from prompts.master_prompts import (
    format_phase5_seo_prompt,
    format_phase5_thumbnail_prompt,
    sample_distinct_archetypes,
    hydrate_concept_from_archetype,
    StoryArchetypeConfig,
)


class AIClient:
    """Unified AI Client for script generation, character bibles, images, video clips, and distribution packages."""

    def __init__(self):
        self.gemini_direct = GeminiDirectClient()
        self.gateway_client = GatewayClient()

    def _generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        namespace: str = "ai_stories:default",
    ) -> Dict[str, Any]:
        """Routes structured JSON generation via GenAI Gateway with MLOps caching/telemetry or fallback to direct Gemini."""
        use_gateway = getattr(config, "LLM_PROVIDER", "gateway") == "gateway"

        if use_gateway:
            try:
                if self.gateway_client.is_available():
                    return self.gateway_client.generate_json(
                        prompt=prompt,
                        system_prompt=system_prompt,
                        namespace=namespace,
                        model=model,
                    )
                else:
                    logger.debug("[AIClient] GenAI Gateway offline; falling back to direct Gemini client.")
            except Exception as e:
                logger.warning(f"[AIClient] GenAI Gateway error ({e}); falling back to direct Gemini client.")

        if not self.gemini_direct.is_available():
            raise RuntimeError("Gemini API key is missing. Please set GEMINI_API_KEYS in your .env file or start GenAI Gateway.")

        model_name = model or getattr(config, "SCRIPT_MODEL", "gemini-2.5-flash")
        start_t = time.perf_counter()
        err_msg = None
        result = None
        try:
            result = self.gemini_direct.generate_json(
                prompt=prompt,
                system_prompt=system_prompt,
                model=model_name
            )
            return result
        except Exception as e:
            err_msg = str(e)
            raise
        finally:
            elapsed = round(time.perf_counter() - start_t, 3)
            out_summary = {"keys": list(result.keys())} if isinstance(result, dict) else ({"preview": str(result)[:200]} if result else None)
            usage = getattr(self.gemini_direct, "last_usage_metadata", None) or None
            actual_model = getattr(self.gemini_direct, "last_model_used", None) or model_name
            langfuse_tracer.log_generation(
                name=namespace,
                model=actual_model,
                input_data={"prompt": prompt[:1000]},
                output_data=out_summary,
                usage=usage,
                metadata={"duration_seconds": elapsed},
                level="ERROR" if err_msg else "DEFAULT",
                status_message=err_msg
            )

    def generate_concepts(
        self,
        prompt: str,
        archetypes: Optional[List[Dict[str, Any]]] = None,
        exclude_archetype_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Generates 3 wildly distinct story concepts compiled dynamically from diverse archetypes.
        No static defaults: dynamically samples fresh archetypes per generation or accepts custom overrides.
        """
        sampled_archetypes = sample_distinct_archetypes(
            count=3,
            exclude_ids=exclude_archetype_ids,
            custom_archetypes=archetypes,
        )

        user_prompt = format_phase1_concept_prompt(prompt, sampled_archetypes)
        system_prompt = compile_phase1_concept_system_prompt(sampled_archetypes)

        logger.info(
            f"[Phase 1] Generating dynamic story concepts using {len(sampled_archetypes)} archetypes: "
            f"{[a.story_id for a in sampled_archetypes]}..."
        )
        ns = f"{getattr(config, 'GATEWAY_NAMESPACE_PREFIX', 'ai_stories')}:phase1_concept"
        result = self._generate_json(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model=config.SCRIPT_MODEL,
            namespace=ns,
        )

        raw_concepts = result.get("concepts", result.get("ideas", []))
        hydrated_concepts = []
        for idx, rc in enumerate(raw_concepts[:3]):
            arch = sampled_archetypes[idx] if idx < len(sampled_archetypes) else None
            hydrated = hydrate_concept_from_archetype(rc, arch)
            hydrated["id"] = idx + 1
            hydrated_concepts.append(hydrated)

        result["concepts"] = hydrated_concepts
        return result


    def generate_script(
        self,
        prompt: str,
        max_scenes: Optional[int] = None,
        existing_characters: Optional[List[Dict[str, Any]]] = None,
        selected_concept: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generates structured scene breakdown and script (with optional scene limit for testing, character continuity, and selected concept slots)."""
        user_prompt = format_phase1_prompt(prompt, selected_concept=selected_concept)
        if existing_characters:
            char_summaries = []
            for c in existing_characters:
                c_name = c.get("name", "Character")
                c_arch = c.get("archetype", "")
                c_shader = (
                    c.get("surface_shader")
                    or c.get("material_shader")
                    or c.get("fruit_shader")
                    or c.get("crystal_shader")
                    or c.get("visual_anchor")
                    or ""
                )
                char_summaries.append(f"- {c_name} ({c_arch}): {c_shader}")
            char_block = "\n".join(char_summaries)
            user_prompt += (
                f"\n\nCRITICAL CONTINUITY & STYLE CONSISTENCY REQUIREMENT (SERIES SEQUEL / CONTINUATION):\n"
                f"This story is a continuation or new episode from an existing story series with established characters.\n"
                f"You MUST maintain continuity and reuse the established characters wherever appropriate:\n"
                f"{char_block}\n"
                f"CRITICAL STYLE UNIFORMITY DIRECTIVE: Maintain their exact names, relationships, species/material, and established visual identity.\n"
                f"Strictly adhere to ONE unified character and art style across the entire cast. Do NOT mix disparate styles "
                f"(e.g., NEVER mix faceted crystal with organic produce, never mix realistic human skin with stylized produce, never mix cartoon chibi with adult proportions).\n"
                f"Stick strictly to the single established visual style direction of this story. You may introduce 1 or 2 new characters if the story demands, but they MUST strictly match this established character style."
            )

        if max_scenes == 1:
            user_prompt += "\n\nCRITICAL INSTRUCTION: This is a 1-scene test run. Generate exactly 1 scene for Scene 1 in valid JSON format."
        elif max_scenes:
            user_prompt += f"\n\nCRITICAL INSTRUCTION: Generate exactly {max_scenes} scenes in valid JSON format."

        logger.info(f"[Phase 1] Generating storyboard script (scenes: {max_scenes or '10-14'}, reused chars: {len(existing_characters) if existing_characters else 0})...")
        ns = f"{getattr(config, 'GATEWAY_NAMESPACE_PREFIX', 'ai_stories')}:phase1_script"
        script_data = self._generate_json(
            prompt=user_prompt,
            system_prompt=PHASE_1_SCRIPT_SYSTEM_PROMPT,
            model=config.SCRIPT_MODEL,
            namespace=ns,
        )

        if max_scenes and "scenes" in script_data and len(script_data["scenes"]) > max_scenes:
            script_data["scenes"] = script_data["scenes"][:max_scenes]

        # Enforce hook_3s as creative reference on Scene 1 (do NOT override AI-generated voiceover)
        hook_3s = script_data.get("hook_3s") or (selected_concept.get("hook_3s") if selected_concept else "")
        scenes_list = script_data.get("scenes", [])
        if hook_3s and scenes_list:
            s1 = scenes_list[0]
            clean_hook = hook_3s.strip().strip('"\'')
            # Store hook as scene-level creative reference only
            s1["hook_3s"] = clean_hook

        # Sanitize all scenes to strip over-fictional eye effects and deity/god tropes
        sanitized_scenes = []
        for idx, sc in enumerate(scenes_list):
            if not sc.get("voiceover"):
                diag = sc.get("dialogue")
                if isinstance(diag, str) and diag.strip():
                    sc["voiceover"] = diag.strip()
                elif isinstance(diag, list) and diag and isinstance(diag[0], dict) and diag[0].get("exact_speech"):
                    speaker = diag[0].get("speaker", "Character")
                    sc["voiceover"] = f"{speaker}: {diag[0]['exact_speech']}"
                elif sc.get("characters") and sc.get("visual_description"):
                    first_char = sc["characters"][0]
                    sc["voiceover"] = f"{first_char}: \"{sc['visual_description']}\""
                elif sc.get("visual_description"):
                    sc["voiceover"] = f"Narrator: {sc['visual_description']}"
                else:
                    sc["voiceover"] = f"Scene {idx + 1}: The tension tightens with emotional stakes."

            clean_sc = sanitize_scene_dict(sc)
            sanitized_scenes.append(clean_sc)

        script_data["scenes"] = sanitized_scenes
        if script_data.get("hook_3s"):
            script_data["hook_3s"] = sanitize_dialogue(script_data["hook_3s"])

        return script_data

    # =========================================================================
    # Phase 2: Character Consistency & Bibles
    # =========================================================================
    def generate_characters(self, script_json_str: str) -> Dict[str, Any]:
        """Generates character visual consistency sheets and anchor prompts adhering strictly to a single visual style."""
        user_prompt = format_phase2_prompt(script_json_str)
        user_prompt += (
            "\n\nCRITICAL STYLE UNIFORMITY DIRECTIVE:\n"
            "All characters generated for this story MUST strictly share ONE single unified visual art style and material aesthetic.\n"
            "Do NOT mix disparate styles (e.g., NEVER mix faceted crystal with organic produce, never mix cartoon chibi with realistic adult proportions, never mix human skin with produce bodies).\n"
            "Every character in the cast must strictly conform to the single art direction established by the story."
        )
        logger.info("[Phase 2] Generating character consistency sheets & bibles (single uniform style)...")
        ns = f"{getattr(config, 'GATEWAY_NAMESPACE_PREFIX', 'ai_stories')}:phase2_characters"
        return self._generate_json(
            prompt=user_prompt,
            system_prompt=PHASE_2_CHARACTER_SYSTEM_PROMPT,
            model=config.SCRIPT_MODEL,
            namespace=ns,
        )


    # =========================================================================
    # Phase 3: Keyframe Image Generation (Pluggable Provider Registry)
    # =========================================================================
    def generate_keyframe_image(
        self,
        visual_description: str,
        shot_type: Optional[str] = None,
        character_anchors: str = "",
        output_path: Optional[Path] = None,
        material: str = "",
        wardrobe: str = "",
        setting: str = "",
        involved_characters: Optional[List[Dict[str, Any]]] = None,
        provider_name: Optional[str] = None,
        scene_id: Optional[int] = None,
        story_id: Optional[str] = None,
        character_name: Optional[str] = None
    ) -> Path:
        """Generates starting 9:16 keyframe image for a scene using the active Image Provider."""
        formatted_prompt = format_phase3_image_prompt(
            visual_description=visual_description,
            shot_type=shot_type,
            character_anchors=character_anchors,
            material=material,
            wardrobe=wardrobe,
            setting=setting
        )

        char_refs = [
            Path(c["image_path"]) for c in (involved_characters or [])
            if c.get("image_path") and Path(c["image_path"]).exists()
        ]

        req = ImageGenRequest(
            prompt=formatted_prompt,
            output_path=output_path,
            aspect_ratio=getattr(config, "IMAGE_ASPECT_RATIO", "9:16"),
            character_anchors=character_anchors,
            character_references=char_refs if char_refs else None,
            involved_characters=involved_characters,
            setting=setting
        )

        target_provider_name = provider_name or getattr(config, "IMAGE_PROVIDER", "gemini_imagen")
        provider = get_image_provider(target_provider_name)
        logger.info(f"[Phase 3] Generating keyframe strictly via [{provider.name}] -> {output_path.name if output_path else 'image'}")

        start_t = time.perf_counter()
        err_msg = None
        try:
            result = provider.generate(req)
            return result.image_path
        except Exception as e:
            err_msg = str(e)
            logger.error(f"[Phase 3] Image generation failed with [{provider.name}]: {err_msg}")
            raise e
        finally:
            elapsed = round(time.perf_counter() - start_t, 3)
            if scene_id is not None:
                gen_name = f"scene_{scene_id:02d}_imagen_generation"
            elif character_name:
                gen_name = f"character_{character_name}_portrait_generation"
            else:
                gen_name = f"{getattr(config, 'GATEWAY_NAMESPACE_PREFIX', 'ai_stories')}:phase3_imagen"

            meta = {"duration_seconds": elapsed, "provider": provider.name}
            if scene_id is not None:
                meta["scene_id"] = scene_id
            if story_id:
                meta["story_id"] = story_id

            inp = {"prompt": formatted_prompt[:1000], "aspect_ratio": req.aspect_ratio}
            if scene_id is not None:
                inp["scene_id"] = scene_id

            actual_model = getattr(config, "IMAGEN_MODEL", "gemini-2.5-flash-image")
            # Google Vertex AI predictions: 1296 tokens per image @ $30 / 1M tokens ($0.00003/token) = $0.03888
            image_cost = 0.03888
            meta["cost_usd"] = image_cost

            langfuse_tracer.log_generation(
                name=gen_name,
                model=actual_model,
                input_data=inp,
                output_data={"image_path": str(output_path), "status": "completed"} if not err_msg else None,
                usage={"input": 0, "output": 1296, "total": 1296},
                cost_details={"input": 0.0, "output": image_cost, "total": image_cost},
                metadata=meta,
                level="ERROR" if err_msg else "DEFAULT",
                status_message=err_msg
            )

    # =========================================================================
    # Phase 4: Animation Prompting & Audio Blueprint
    # =========================================================================
    def generate_animation_prompts(self, scenes_json_str: str, characters_json_str: str) -> List[Dict[str, Any]]:
        """Generates motion prompts and audio blueprints for video synthesis."""
        user_prompt = format_phase4_motion_prompt(scenes_json_str, characters_json_str)
        logger.info("[Phase 4] Formulating animation motion prompts & audio blueprints...")
        ns = f"{getattr(config, 'GATEWAY_NAMESPACE_PREFIX', 'ai_stories')}:phase4_motion"
        result = self._generate_json(
            prompt=user_prompt,
            system_prompt=PHASE_4_ANIMATION_SYSTEM_PROMPT,
            model=config.SCRIPT_MODEL,
            namespace=ns,
        )
        if isinstance(result, dict) and "items" in result:
            return result["items"]
        if isinstance(result, list):
            return result
        return [result]

    # =========================================================================
    # Phase 5: AI Video Generation (Veo 3.1 Fast / Pluggable Video)
    # =========================================================================
    def generate_video_clip(
        self,
        motion_prompt: str,
        image_path: Path,
        output_path: Path,
        duration: Optional[int] = None,
        shot_type: Optional[str] = None,
        motion_level: str = "subtle_emotion",
        camera_motion: Optional[str] = "push_in",
        provider_name: Optional[str] = None,
        extra_params: Optional[Dict[str, Any]] = None,
        scene_id: Optional[int] = None,
        story_id: Optional[str] = None
    ) -> Path:
        """Generates a vertical 9:16 video clip using the Video Provider (Google Veo 3.1 Fast)."""
        # Standardized Engine Resolver: Explicitly route to Google Veo
        if provider_name and provider_name.lower() in ["kling", "fal_kling", "router"]:
            target_provider_name = "google_veo"
        else:
            target_provider_name = provider_name or getattr(config, "VIDEO_PROVIDER", "google_veo")
        provider = get_video_provider(target_provider_name)
        
        formatted_prompt = format_phase5_video_prompt(motion_prompt)
        
        dur_label = f"{duration}s" if duration else "natural length"
        logger.info(f"[Phase 4/5] Dispatching video render ({provider.name}, {dur_label}) -> {output_path.name}")

        req = VideoGenRequest(
            motion_prompt=formatted_prompt,
            image_path=image_path,
            output_path=output_path,
            duration=duration,
            aspect_ratio=getattr(config, "VIDEO_ASPECT_RATIO", "9:16"),
            shot_type=shot_type,
            motion_level=motion_level,
            camera_motion=camera_motion,
            extra_params=extra_params or {}
        )

        start_t = time.perf_counter()
        err_msg = None
        result = None
        try:
            result = provider.generate(req)
            return result.video_path
        except Exception as e:
            err_msg = str(e)
            logger.error(f"[Phase 4/5] Video generation failed with [{provider.name}]: {err_msg}")
            raise e
        finally:
            elapsed = round(time.perf_counter() - start_t, 3)
            if scene_id is not None:
                gen_name = f"scene_{scene_id:02d}_veo_generation"
            else:
                gen_name = f"{getattr(config, 'GATEWAY_NAMESPACE_PREFIX', 'ai_stories')}:phase4_veo_video"

            from services.media.video.google_veo import get_video_file_duration
            measured_dur = get_video_file_duration(output_path)
            if measured_dur is None and result is not None:
                measured_dur = getattr(result, "duration", None)

            clip_dur = round(float(measured_dur), 2) if measured_dur else None
            # Google Vertex AI Veo 3.1 Fast rate (SKU A9F8-76D1-003D): $0.10 flat per clip
            video_cost = 0.10
            meta = {
                "duration_seconds": elapsed,
                "provider": provider.name,
                "cost_usd": video_cost
            }
            if clip_dur is not None:
                meta["clip_duration"] = clip_dur
            if scene_id is not None:
                meta["scene_id"] = scene_id
            if story_id:
                meta["story_id"] = story_id

            inp: Dict[str, Any] = {
                "motion_prompt": formatted_prompt[:1000],
                "aspect_ratio": req.aspect_ratio
            }
            if duration:
                inp["duration_seconds"] = duration
            if scene_id is not None:
                inp["scene_id"] = scene_id

            actual_model = getattr(config, "VEO_MODEL", "veo-3.1-fast-generate-001")
            langfuse_tracer.log_generation(
                name=gen_name,
                model=actual_model,
                input_data=inp,
                output_data={"video_path": str(output_path), "status": "completed", **({"actual_duration": clip_dur} if clip_dur else {})} if not err_msg else None,
                usage={"input": 0, "output": int(clip_dur or 1), "total": int(clip_dur or 1)},
                cost_details={"input": 0.0, "output": video_cost, "total": video_cost},
                metadata=meta,
                level="ERROR" if err_msg else "DEFAULT",
                status_message=err_msg
            )


    def generate_seo_and_thumbnail(self, script_json_str: str) -> Dict[str, Any]:
        """Generates multi-platform SEO copy (Shorts, TikTok, Reels) and high-CTR thumbnail prompt."""
        user_prompt = format_phase5_seo_prompt(script_json_str)
        logger.info("[Phase 5] Generating SEO distribution package & viral thumbnail prompt...")
        ns = f"{getattr(config, 'GATEWAY_NAMESPACE_PREFIX', 'ai_stories')}:phase5_seo"
        return self._generate_json(
            prompt=user_prompt,
            system_prompt=PHASE_5_SEO_SYSTEM_PROMPT,
            model=config.SCRIPT_MODEL,
            namespace=ns,
        )

    def generate_seo_metadata(self, script_json_str: str) -> Dict[str, Any]:
        """Alias for generate_seo_and_thumbnail for backward compatibility."""
        return self.generate_seo_and_thumbnail(script_json_str)



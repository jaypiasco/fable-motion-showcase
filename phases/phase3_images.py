"""
Phase 3: Keyframe Image Generation.
Generates starting keyframe images for each scene using Nano Banana Pro / Gemini Image.
Tracks each scene individually and skips already generated images on resume.
"""

from pathlib import Path
from typing import Dict, Any, List, Optional
from time import perf_counter
import re
import json
import shutil
from config import config
from core.logger import logger
from core.state_manager import StateManager
from core.cancellation import GenerationCancelledError
from services.ai_client import AIClient
from services.langfuse_tracer import langfuse_tracer
from monitoring.metrics import scene_imagen_runs, scene_imagen_duration, active_media_renders
from core.sanitizer import sanitize_visual_description, sanitize_dialogue
from core.image_utils import crop_black_bars


class Phase3Images:
    def __init__(self, state_mgr: StateManager, ai_client: AIClient):
        self.state_mgr = state_mgr
        self.ai_client = ai_client

    def execute(self, target_scene_id: Optional[int] = None, force_regenerate: bool = False) -> List[Dict[str, Any]]:
        """Executes Phase 3 keyframe image generation for all scenes or a specific scene."""
        if self.state_mgr.is_cancelled():
            raise GenerationCancelledError(f"Phase 3 keyframe generation cancelled for story '{self.state_mgr.story_id}'.")

        if target_scene_id is None and self.state_mgr.is_phase_completed("phase_3_images") and not force_regenerate:
            logger.info("[Phase 3] All keyframe images already completed in state. Skipping.")
            return self.state_mgr.get_phase_items("phase_3_images")

        script_data = self.state_mgr.get_phase_data("phase_1_script")
        chars_data = self.state_mgr.get_phase_data("phase_2_characters") or {}
        scenes = script_data.get("scenes", [])
        if target_scene_id is not None:
            scenes = [s for s in scenes if s.get("scene_id", 1) == target_scene_id]

        # Check for user modification instructions
        p3_phase_data = self.state_mgr.state.get("phases", {}).get("phase_3_images", {})
        mod_instructions = p3_phase_data.get("modification_instructions", "")

        # Build character lookup map
        raw_characters = chars_data.get("characters", [])
        char_map = {c.get("name", "").strip(): c for c in raw_characters}

        for scene in scenes:
            if self.state_mgr.is_cancelled():
                raise GenerationCancelledError(f"Phase 3 keyframe generation cancelled for story '{self.state_mgr.story_id}'.")

            scene_id = scene.get("scene_id", 1)
            self.state_mgr.set_checkpoint("phase_3_images", scene_id)
            scene_dir = self.state_mgr.get_scene_dir(scene_id)

            # 1. Fetch script for this specific scene from scene folder if available
            scene_script_file = scene_dir / "script.json"
            if scene_script_file.exists():
                try:
                    with open(scene_script_file, "r", encoding="utf-8") as f_sc:
                        disk_scene = json.load(f_sc)
                        if isinstance(disk_scene, dict):
                            scene = {**scene, **disk_scene}
                except Exception as sc_err:
                    logger.debug(f"[Phase 3] Notice reading scene {scene_id} script from folder: {sc_err}")

            output_img_path = self.state_mgr.images_dir / f"scene_{scene_id:02d}_keyframe.png"

            # Check if this specific scene image is already completed
            if not force_regenerate and self.state_mgr.is_scene_image_completed(scene_id):
                logger.info(f"[Phase 3] Scene {scene_id} keyframe image already exists. Skipping.")
                continue

            # Visual description from scene script - sanitized to remove over-fictional eye effects
            visual_desc = scene.get("visual_description") or scene.get("visual_action", "")
            if mod_instructions:
                visual_desc = f"{visual_desc}. User modification directive: {mod_instructions}"
            visual_desc = sanitize_visual_description(visual_desc)
            # Strictly remove dialogue quotes, speaker tags, or caption-inducing text from visual_description
            visual_desc = re.sub(r'HYPER-VIRAL\s+3-SECOND\s+RETENTION\s+HOOK:\s*["\'][^"\']*["\']\.?', '', visual_desc, flags=re.IGNORECASE)
            visual_desc = re.sub(r'[A-Z][a-zA-Z\s]{1,15}:\s*["\'][^"\']*["\']', '', visual_desc)
            visual_desc = re.sub(r'"[^"]{10,}"', '', visual_desc)
            visual_desc = re.sub(r"\s+", " ", visual_desc).strip()
            setting = scene.get("setting", "")

            # Scene 1: Enforce & Optimize the 3-Second Viral Hook Choreography
            # As an expert AI Video Showrunner and Prompt Engineer specializing in hyper-viral,
            # high-retention short-form drama for TikTok, YouTube Shorts, and Instagram Reels,
            # Scene 1 keyframe MUST be engineered around the explosive 3-second hook moment visually.
            # Strictly NO captions or subtitles should be embedded in the keyframe still image.
            scene_hook_3s = None
            if scene_id == 1:
                scene_hook_3s = (
                    scene.get("hook_3s")
                    or script_data.get("hook_3s")
                    or (self.state_mgr.state.get("selected_concept") or {}).get("hook_3s")
                    or (self.state_mgr.state.get("phases") or {}).get("phase_1_script", {}).get("idea", {}).get("hook_3s")
                )
                if scene_hook_3s:
                    clean_hook = scene_hook_3s.strip().strip('"\'')
                    scene_hook_3s = clean_hook
                    hook_showrunner_directive = (
                        "HYPER-VIRAL 3-SECOND RETENTION HOOK: Opening Hook Visual Choreography (TikTok/Shorts/Reels High Retention): "
                        "Extreme emotional contrast, high-stakes confrontation, explosive direct eye contact with lens, "
                        "wide glossy expressive animated eyes filled with betrayal and defiance, "
                        "pivotal power-shift moment, dramatic volumetric rim lighting, photorealistic 9:16 vertical staging, "
                        "clean textless visual composition, strictly NO subtitles, NO captions, NO words or typography."
                    )
                    visual_desc = f"{hook_showrunner_directive} {visual_desc}"

            # 2. Characters involved in this scene (indexed against characters.json)
            scene_chars = list(scene.get("characters", []))
            # Robust extraction: also scan visual description, dialogue, and setting for all known Phase 2 characters
            text_context = f"{visual_desc} {scene.get('dialogue', '')} {setting}".lower()
            for k_name in char_map.keys():
                if not k_name:
                    continue
                k_clean = k_name.strip()
                k_lower = k_clean.lower()
                first_name = k_clean.split()[0].lower() if k_clean.split() else k_lower
                # Match full name or first name if distinct (e.g. "Elena" for "Elena Vance", "Arthur" for "Arthur Bananier")
                if k_lower in text_context or (len(first_name) >= 3 and first_name in text_context):
                    if not any(sc.strip().lower() == k_lower or sc.strip().lower() == first_name for sc in scene_chars):
                        scene_chars.append(k_clean)

            involved_characters: List[Dict[str, Any]] = []
            for c_name in scene_chars:
                c_info = char_map.get(c_name)
                if not c_info:
                    c_info = next((v for k, v in char_map.items() if k.lower() == c_name.lower()), None)
                if not c_info:
                    c_info = next((v for k, v in char_map.items() if k.split()[0].lower() == c_name.split()[0].lower()), None)

                if c_info:
                    # Verify character reference image is saved in characters/ or /assets/characters
                    char_img = self.state_mgr.get_character_image_path(c_info.get("name", c_name))
                    if not char_img or not char_img.exists():
                        direct_file = self.state_mgr.characters_dir / f"{c_name}.png"
                        if direct_file.exists() and direct_file.stat().st_size > 0:
                            char_img = direct_file
                        else:
                            matches = list(self.state_mgr.characters_dir.glob(f"*{c_name.split()[0]}*.png"))
                            if matches:
                                char_img = matches[0]

                    c_info_copy = dict(c_info)
                    if char_img and char_img.exists():
                        c_info_copy["image_path"] = str(char_img)
                    if not any(ic.get("name") == c_info_copy.get("name") for ic in involved_characters):
                        involved_characters.append(c_info_copy)

            # Build rich character anchor string ensuring strict Phase 2 visual consistency
            ref_ordinals = ["first", "second", "third", "fourth", "fifth"]
            anchor_list = []
            ref_idx = 0
            for c in involved_characters:
                c_name = c.get("name", "Character")
                c_shader = c.get("surface_shader") or c.get("material_shader") or c.get("fruit_shader") or c.get("crystal_shader", "smooth organic surface")
                c_wardrobe = c.get("signature_wardrobe", "bespoke tailored luxury couture")
                c_anchor = c.get("visual_anchor") or ""
                c_style = c.get("style_seed_prompt") or ""
                has_img = bool(c.get("image_path") and Path(c["image_path"]).exists())

                if has_img:
                    ordinal = ref_ordinals[ref_idx] if ref_idx < len(ref_ordinals) else f"image {ref_idx + 1}"
                    ref_idx += 1
                    ref_clause = f"Condition directly on the attached Phase 2 reference portrait ({ordinal} image) for '{c_name}' to maintain identical facial features, carved produce peel texture, natural consistent colored irises with natural reflections (strictly NO supernatural glowing eyes or eye flares), and signature wardrobe."
                else:
                    ref_clause = f"Maintain strict character visual styling for '{c_name}' with identical carved produce peel texture, natural consistent glossy eyes (strictly NO glowing eyes or supernatural eye effects), and wardrobe."

                char_desc_parts = [
                    f"Character '{c_name}': anthropomorphic {c_shader} character. {ref_clause}"
                ]
                if c_style:
                    char_desc_parts.append(f"Visual Bible: {c_style}")
                if c_anchor:
                    char_desc_parts.append(f"Physical Details: {c_anchor}")
                char_desc_parts.append(f"Wardrobe: wearing {c_wardrobe}")
                char_desc_parts.append("Anatomy: realistic adult human body build 1:8 head-to-body ratio, statuesque adult posture, no bobblehead, no chibi, head seamlessly fused into shoulders")
                anchor_list.append(". ".join(char_desc_parts))
            anchors_str = " | ".join(anchor_list)

            logger.info(f"[Phase 3] Generating studio keyframe image for Scene {scene_id} (Involved characters: {[c.get('name') for c in involved_characters]})...")

            char_names_list = [c.get("name") for c in involved_characters if c.get("name")]
            char_refs_meta = [
                {"name": c.get("name"), "image_path": c.get("image_path")}
                for c in involved_characters if c.get("image_path")
            ]

            # Record scene rendering in-progress state for real-time frontend active feedback
            self.state_mgr.update_scene_image(
                scene_id=scene_id,
                prompt=f"{anchors_str} {visual_desc}",
                image_path="",
                status="generating",
                characters=char_names_list,
                character_references=char_refs_meta,
                hook_3s=scene_hook_3s
            )

            # Extract materials & wardrobe if single lead character
            lead_char = involved_characters[0] if involved_characters else {}
            lead_material = lead_char.get("surface_shader") or lead_char.get("material_shader") or lead_char.get("fruit_shader") or lead_char.get("crystal_shader", "")
            lead_wardrobe = lead_char.get("signature_wardrobe", "")

            # Trace individual scene keyframe generation in Langfuse & Prometheus
            with langfuse_tracer.span(
                f"scene_{scene_id:02d}_imagen_keyframe",
                metadata={
                    "scene_id": scene_id,
                    "setting": setting,
                    "characters": [c.get("name") for c in involved_characters],
                    "story_id": self.state_mgr.story_id
                },
                input_data={"visual_description": visual_desc, "anchors": anchors_str}
            ):
                active_media_renders.labels("imagen").inc()
                t0 = perf_counter()
                model_name = getattr(config, "IMAGEN_MODEL", "imagen-3.0-generate-002")
                max_retries = 3
                last_exc = None

                try:
                    for attempt in range(max_retries):
                        if self.state_mgr.is_cancelled():
                            raise GenerationCancelledError(f"Phase 3 cancelled during Scene {scene_id}.")
                        try:
                            logger.info(f"[Phase 3] Scene {scene_id} render attempt {attempt + 1}/{max_retries}...")
                            generated_path = self.ai_client.generate_keyframe_image(
                                visual_description=visual_desc,
                                character_anchors=anchors_str,
                                output_path=output_img_path,
                                material=lead_material,
                                wardrobe=lead_wardrobe,
                                setting=setting,
                                involved_characters=involved_characters,
                                scene_id=scene_id,
                                story_id=self.state_mgr.story_id
                            )
                            last_exc = None
                            break
                        except GenerationCancelledError:
                            raise
                        except Exception as attempt_err:
                            last_exc = attempt_err
                            logger.warning(f"[Phase 3] Scene {scene_id} attempt {attempt + 1} failed: {attempt_err}")
                            if attempt < max_retries - 1:
                                import time
                                time.sleep(4 * (attempt + 1))

                    if last_exc:
                        raise last_exc

                    # Ensure keyframe is free of letterbox bars and normalized to true 9:16 (720x1280 or 1080x1920)
                    crop_black_bars(Path(generated_path))

                    scene_imagen_runs.labels(model=model_name, status="success").inc()
                    scene_imagen_duration.labels(model=model_name).observe(perf_counter() - t0)
                except GenerationCancelledError:
                    raise
                except Exception as img_exc:
                    scene_imagen_runs.labels(model=model_name, status="error").inc()
                    self.state_mgr.update_scene_image(
                        scene_id=scene_id,
                        prompt=f"{anchors_str} {visual_desc}",
                        image_path="",
                        status="error",
                        error_message=str(img_exc),
                        hook_3s=scene_hook_3s
                    )
                    self.state_mgr.record_error(img_exc)
                    raise img_exc
                finally:
                    active_media_renders.labels("imagen").dec()

            # Record scene completion in state with character reference links
            self.state_mgr.update_scene_image(
                scene_id=scene_id,
                prompt=f"{anchors_str} {visual_desc}",
                image_path=str(generated_path),
                status="completed",
                characters=char_names_list,
                character_references=char_refs_meta,
                hook_3s=scene_hook_3s
            )

            # Also store a copy of the keyframe in the scene's dedicated folder
            try:
                scene_keyframe = scene_dir / "keyframe.png"
                if Path(generated_path).exists() and Path(generated_path).resolve() != scene_keyframe.resolve():
                    shutil.copyfile(str(generated_path), str(scene_keyframe))
                    logger.debug(f"[Phase 3] Saved scene keyframe copy to {scene_keyframe}")
            except Exception as sc_copy_err:
                logger.debug(f"[Phase 3] Notice copying keyframe to scene folder: {sc_copy_err}")

        if target_scene_id is None:
            self.state_mgr.complete_phase_3()
            logger.info("[Phase 3] All keyframe images successfully generated.")
        return self.state_mgr.get_phase_items("phase_3_images")

"""
Phase 2: Character Consistency Generation.
Extracts characters from Phase 1 and creates immutable visual character sheets & anchor prompts.
"""

import json
import shutil
import re
from pathlib import Path
from typing import Dict, Any
from config import config
from core.logger import logger
from core.state_manager import StateManager
from core.cancellation import GenerationCancelledError
from services.ai_client import AIClient


class Phase2Characters:
    def __init__(self, state_mgr: StateManager, ai_client: AIClient):
        self.state_mgr = state_mgr
        self.ai_client = ai_client

    def generate_character_prompts(self) -> Dict[str, Any]:
        """
        Phase 2A: Uses Phase 1 script to establish brand new, distinct character consistency prompts & bibles.
        Always creates fresh characters unique to this story (no past or parent story reuse).
        """
        if self.state_mgr.is_cancelled():
            raise GenerationCancelledError(f"Phase 2 cancelled for story '{self.state_mgr.story_id}'.")
        script_data = self.state_mgr.get_phase_data("phase_1_script")
        if not script_data:
            raise ValueError("Cannot run Phase 2 without completed Phase 1 script data.")

        # Check if parent story has characters to reuse for sequel/series continuity
        parent_chars_data = self.state_mgr.get_parent_characters()
        parent_characters = parent_chars_data.get("characters", []) if parent_chars_data else []
        parent_char_map = {c.get("name", "").strip().lower(): c for c in parent_characters if c.get("name")}

        # Find characters featured in the new script
        script_chars = set()
        script_level_chars = script_data.get("characters") or []
        if isinstance(script_level_chars, list):
            for c in script_level_chars:
                name_str = c if isinstance(c, str) else c.get("name") if isinstance(c, dict) else None
                if name_str and name_str.strip():
                    script_chars.add(name_str.strip())
        for s in script_data.get("scenes", []):
            for c in s.get("characters", []):
                if isinstance(c, str) and c.strip():
                    script_chars.add(c.strip())
            diag = s.get("dialogue") or s.get("voiceover") or ""
            if isinstance(diag, str):
                m = re.match(r"^([A-Z][a-zA-Z]{2,15})(?:\s*\([^)]*\))?:", diag.strip())
                if m and m.group(1).upper() not in ("THE", "NARRATOR", "SCENE", "VOICEOVER", "CUT", "FADE"):
                    script_chars.add(m.group(1).strip())

        reused_characters = []
        new_char_names = set()

        for c_name in script_chars:
            if c_name.lower() in parent_char_map:
                reused_characters.append(dict(parent_char_map[c_name.lower()]))
            else:
                new_char_names.add(c_name)

        # If this is a child episode and all characters match the parent story, reuse directly (0 tokens)
        if parent_char_map and not new_char_names and reused_characters:
            logger.info(f"[Phase 2] All {len(reused_characters)} characters match parent story '{self.state_mgr.parent_story_id}'. Reusing established character bibles directly.")
            return {
                "story_summary": script_data.get("logline", ""),
                "characters": reused_characters
            }

        # Check for user modification instructions
        p2_state = self.state_mgr.state.get("phases", {}).get("phase_2_characters", {})
        mod_instructions = p2_state.get("modification_instructions", "")

        # Invoke LLM to generate fresh character sheets tailored specifically to this script
        script_payload = dict(script_data)
        if script_chars:
            script_payload["script_characters"] = list(script_chars)
        selected_concept = self.state_mgr.state.get("selected_concept")
        if selected_concept and selected_concept.get("core_cast"):
            script_payload["concept_core_cast"] = selected_concept.get("core_cast")
        if mod_instructions:
            script_payload["user_modification_instructions"] = mod_instructions
        script_json_str = json.dumps(script_payload, indent=2)
        generated_data = self.ai_client.generate_characters(script_json_str)

        final_characters = list(reused_characters)
        final_names_lower = {c.get("name", "").strip().lower() for c in final_characters}

        for c in generated_data.get("characters", []):
            c_name = c.get("name", "").strip()
            if not c_name:
                continue
            c_name_lower = c_name.lower()
            if c_name_lower in final_names_lower:
                continue

            # If the script specified an explicit cast roster, only accept characters belonging to that roster
            if script_chars:
                matches_script = any(
                    sc.lower() in c_name_lower or c_name_lower in sc.lower() or
                    sc.lower().split()[0] == c_name_lower.split()[0]
                    for sc in script_chars
                )
                if not matches_script:
                    logger.info(f"[Phase 2] Skipping extra/hallucinated character '{c_name}' not found in script cast {list(script_chars)}")
                    continue

            final_characters.append(c)
            final_names_lower.add(c_name_lower)

        # Fallback: if script had characters but filtering removed everything, keep at most len(script_chars) characters
        if not final_characters and generated_data.get("characters"):
            max_keep = len(script_chars) if script_chars else 1
            final_characters = generated_data.get("characters")[:max_keep]

        logger.info(f"[Phase 2] Generated {len(final_characters)} fresh distinct character bibles for story '{self.state_mgr.story_id}'.")
        return {
            "story_summary": generated_data.get("story_summary") or script_data.get("logline", ""),
            "characters": final_characters
        }

    def render_character_images(self, characters_data: Dict[str, Any], force_regenerate: bool = False) -> Dict[str, Any]:
        """
        Phase 2B: Renders character reference portraits in Imagen / Gemini
        and persists the completed Phase 2 character data to state and cloud storage.
        """
        self._ensure_character_images(characters_data, force_regenerate=force_regenerate)
        self.state_mgr.complete_phase_2(characters_data)
        logger.info(f"[Phase 2] Completed character profiles & reference images for {len(characters_data.get('characters', []))} character(s).")
        return characters_data

    def execute(self, force_regenerate: bool = False) -> Dict[str, Any]:
        """
        Executes Phase 2:
        1. Generates fresh character consistency sheets & bibles.
        2. Generates new studio portraits with Imagen / Gemini and persists them.
        """
        if self.state_mgr.is_cancelled():
            raise GenerationCancelledError(f"Phase 2 cancelled for story '{self.state_mgr.story_id}'.")

        if self.state_mgr.is_phase_completed("phase_2_characters") and not force_regenerate:
            logger.info("[Phase 2] Character sheets already completed in state. Checking character images...")
            characters_data = self.state_mgr.get_phase_data("phase_2_characters")
            self._ensure_character_images(characters_data, force_regenerate=False)
            return characters_data

        characters_data = self.state_mgr.get_phase_data("phase_2_characters") if force_regenerate and self.state_mgr.get_phase_data("phase_2_characters") else self.generate_character_prompts()
        return self.render_character_images(characters_data, force_regenerate=force_regenerate)

    def _ensure_character_images(self, characters_data: Dict[str, Any], force_regenerate: bool = False):
        """Generates and verifies reference images for all characters in the story's characters directory."""
        from services.tts_service import TTSService
        tts = TTSService()

        for char in characters_data.get("characters", []):
            if self.state_mgr.is_cancelled():
                # Persist whatever characters were completed so far so resume picks up seamlessly
                self.state_mgr.state.setdefault("phases", {}).setdefault("phase_2_characters", {})["data"] = characters_data
                self.state_mgr._persist_state()
                raise GenerationCancelledError(f"Phase 2 character rendering cancelled for story '{self.state_mgr.story_id}'.")

            char_name = char.get("name", "Character").strip()
            safe_name = re.sub(r'[^\w\-]', '_', char_name).strip() if "re" in globals() else char_name.replace(" ", "_")
            char_img_file = self.state_mgr.characters_dir / f"{char_name}.png"

            if force_regenerate:
                if char_img_file.exists():
                    try:
                        char_img_file.unlink()
                        logger.info(f"[Phase 2] Deleted existing portrait for '{char_name}' to force regeneration.")
                    except Exception as del_err:
                        logger.warning(f"[Phase 2] Could not delete old portrait {char_img_file}: {del_err}")

            # Ensure natural acoustic audio profile is assigned
            if not char.get("audio_profile"):
                gender = char.get("gender", "female" if any(w in char_name.lower() for w in ["sapphire", "vespera", "lady", "queen", "princess", "nicole"]) else "male")
                char["audio_profile"] = (
                    f"Audio: Natural, warm, grounded {gender} voice with realistic room acoustics and subtle breathing. "
                    "Background sound includes soft ambient rain outside and a quiet room tone. No background music. (no subtitles)"
                )

            # Check if this character image already exists in parent story and copy it over (only if not forcing regeneration)
            if not force_regenerate and (not char_img_file.exists() or char_img_file.stat().st_size == 0):
                copied_img = self.state_mgr.copy_parent_character_image(char_name)
                if copied_img and copied_img.exists() and copied_img.stat().st_size > 0:
                    char_img_file = copied_img
                    logger.info(f"[Phase 2] Reused established portrait for '{char_name}' from parent story (0 image tokens used).")

            if not char_img_file.exists() or char_img_file.stat().st_size == 0:
                logger.info(f"[Phase 2] Generating studio character reference portrait for '{char_name}' via Imagen...")
                self.state_mgr.set_character_generating(char_name)
                
                # Build rich studio portrait prompt with strict adult human proportions
                visual_anchor = char.get("visual_anchor", "")
                shader = char.get("surface_shader") or char.get("material_shader") or char.get("fruit_shader") or char.get("crystal_shader", "smooth organic surface")
                wardrobe = char.get("signature_wardrobe", "high-fashion luxury couture")
                style_seed = char.get("style_seed_prompt", "")

                proportion_rules = (
                    "Realistic adult human body proportions with a strict 1:7.5 to 1:8 head-to-body ratio, "
                    "tall statuesque adult build, broad structured shoulders, elongated tailored adult torso, long slender legs, "
                    "natural human-scale head proportion (strictly NOT oversized, NOT ballooned, NO bobblehead, NO chibi, NO funko pop, NO dwarfism, NO stubby limbs). "
                )

                eye_rules = (
                    "Eyes: Large, glossy, and highly rendered modern 3D feature animation eyes (Pixar/Disney aesthetic) "
                    "with detailed colored irises, distinct white sclera, sharp pupils, sculpted eyelids, and prominent specular catchlights/light reflections. "
                    "STRICTLY NO pitch-black eyes, NO hollow black eye sockets, NO void eyes, NO lifeless dark holes. "
                )

                if style_seed:
                    portrait_prompt = f"{style_seed}. {eye_rules}{proportion_rules}"
                else:
                    portrait_prompt = (
                        f"9:16 vertical composition, master cinematic 3D studio character portrait of {char_name}, "
                        f"anthropomorphic produce character made of {shader}, expressive emotional face carved directly into produce surface, "
                        f"large 3D animated expressive eyes with detailed colored irises and bright specular light reflections (strictly no pitch-black eyes), "
                        f"naturally proportioned fruit head seamlessly integrated into elegant broad shoulders, wearing {wardrobe}. {visual_anchor}. "
                        f"{eye_rules}"
                        f"{proportion_rules}"
                        f"3-point studio lighting setup, high-contrast rim lighting, volumetric light rays, "
                        f"Pixar-style 3D animated film render, Unreal Engine 5 render style, Octane Render 8k resolution, hyper-detailed organic textures, pure clean white background, centered composition, full body visible from head to shoes."
                    )

                self.ai_client.generate_keyframe_image(
                    visual_description=portrait_prompt,
                    shot_type="Full body character portrait, eye-level, neutral lighting",
                    character_anchors=f"{visual_anchor}. Large modern 3D animated eyes with detailed colored irises, white sclera, and bright specular catchlights (strictly no pitch-black eyes). Adult human proportions 1:8 ratio, no bobblehead",
                    output_path=char_img_file,
                    setting="Centered on a pure clean white background, full body visible from head to toe, neutral studio lighting"
                )

            # Store character reference portrait in /assets/characters for cross-clip access
            try:
                story_assets_dir = getattr(self.state_mgr, "assets_characters_dir", self.state_mgr.archive_dir / "assets" / "characters")
                story_assets_dir.mkdir(parents=True, exist_ok=True)
                target_asset = story_assets_dir / f"{char_name}.png"
                if char_img_file.exists():
                    shutil.copyfile(char_img_file, target_asset)
                    logger.info(f"[Phase 2] Stored character reference portrait in /assets -> {target_asset}")
            except Exception as asset_err:
                logger.debug(f"[Phase 2] Notice syncing to /assets: {asset_err}")

            char["image_path"] = str(char_img_file)
            # Incrementally persist each character's image to state immediately upon generation
            self.state_mgr.update_character_image(char_name, str(char_img_file), char, status="completed")



"""
Phase 4: Animation Prompting & Audio Blueprint.
Formulates motion dynamics, camera paths, atmospheric crystal physics, and directives tailored for Veo 3.1 Fast.
"""

import re
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from time import perf_counter
from core.logger import logger
from config import config
from core.state_manager import StateManager
from services.ai_client import AIClient
from services.langfuse_tracer import langfuse_tracer
from core.cancellation import GenerationCancelledError
from monitoring.metrics import scene_veo_runs, scene_veo_duration, active_media_renders
from core.sanitizer import sanitize_visual_description, sanitize_dialogue
from core.image_utils import crop_black_bars


class Phase4Motion:
    def __init__(self, state_mgr: StateManager, ai_client: AIClient):
        self.state_mgr = state_mgr
        self.ai_client = ai_client

    def generate_motion_prompts(self, force_regenerate: bool = False) -> List[Dict[str, Any]]:
        """
        Phase 4A: Formulates motion prompts and character dialogue scripts for each scene.
        Embeds direct quotes, vocal delivery, and ambient audio for Veo single-pass generation.
        """
        if self.state_mgr.is_cancelled():
            raise GenerationCancelledError(f"Phase 4 cancelled for story '{self.state_mgr.story_id}'.")

        if not force_regenerate and self.state_mgr.is_phase_completed("phase_4_animation_prompts"):
            items = self.state_mgr.get_phase_items("phase_4_animation_prompts")
            if items:
                logger.info("[Phase 4] Animation prompts already completed in state.")
                return items

        script_data = self.state_mgr.get_phase_data("phase_1_script")
        chars_data = self.state_mgr.get_phase_data("phase_2_characters") or {}
        scenes = script_data.get("scenes", [])

        # Check if blueprints already generated
        existing_items = self.state_mgr.get_phase_items("phase_4_animation_prompts")
        if not force_regenerate and existing_items and len(existing_items) == len(scenes):
            logger.info(f"[Phase 4] Reusing {len(existing_items)} existing animation prompt blueprints.")
            return existing_items

        # Check for user modification instructions
        p4_state = self.state_mgr.state.get("phases", {}).get("phase_4_animation_prompts", {})
        mod_instructions = p4_state.get("modification_instructions", "")

        scenes_copy = [dict(s) for s in scenes]
        if mod_instructions:
            for s in scenes_copy:
                s["user_motion_instructions"] = mod_instructions

        scenes_str = json.dumps(scenes_copy, indent=2)
        chars_str = json.dumps(chars_data, indent=2)

        motion_items = self.ai_client.generate_animation_prompts(scenes_str, chars_str)

        # Retrieve concept-level hook_3s if available
        concept_hook = (
            script_data.get("hook_3s")
            or self.state_mgr.state.get("selected_concept", {}).get("hook_3s")
            or self.state_mgr.state.get("phases", {}).get("phase_1_script", {}).get("idea", {}).get("hook_3s")
        )

        # Standardize format: Visual Motion + Audio/Dialogue Overlay for Google Veo single-pass
        standardized_items = []
        for i, scene in enumerate(scenes):
            scene_id = scene.get("scene_id", i + 1)
            scene_hook = scene.get("hook_3s") or (concept_hook if scene_id == 1 else None)
            matching = next(
                (m for m in motion_items if m.get("scene_id") == scene_id or m.get("scene_number") == scene_id),
                None
            )

            cam_dyn = (
                matching.get("camera_movement")
                or matching.get("camera_dynamics", "Slow push-in on character's face, slight upward tilt")
                if matching
                else "Slow push-in on character's face, slight upward tilt"
            )
            # Sanitize cam_dyn to ensure smooth, cinematic movement and remove rapid snap-zooms
            cam_dyn_clean = cam_dyn
            for rapid_term in ["rapid snap-zoom", "snap-zoom", "rapid zoom", "whip pan", "fast zoom", "quick pan", "violent camera"]:
                cam_dyn_clean = re.sub(rapid_term, "slow cinematic push-in", cam_dyn_clean, flags=re.IGNORECASE)
            cam_dyn = cam_dyn_clean

            visual_cues = (
                matching.get("action_description")
                or scene.get("visual_description")
                or scene.get("visual_action", "character in cinematic setting")
                if matching
                else scene.get("visual_description", "character in cinematic setting")
            )

            # For Scene 1, condition visual motion with dramatic hook directives without forcing unnatural direct eye contact
            if scene_id == 1 and scene_hook:
                visual_cues = f"Hyper-viral 3-second opening retention hook choreography. Extreme emotional intensity, expressive dramatic confrontation. {visual_cues}"

            # Strip any lingering direct eye contact lens or aspect ratio labels from visual cues
            visual_cues = re.sub(r'direct eye contact with camera lens', 'intense dramatic gaze', visual_cues, flags=re.IGNORECASE)
            visual_cues = re.sub(r'9:16 vertical video,?', '', visual_cues, flags=re.IGNORECASE)
            visual_cues = sanitize_visual_description(visual_cues)

            # 1. Visual Motion Structure: [camera_motion] + [character visual cues]
            # Replace generic push-in with explicit vertical-first framing keywords and zero-letterboxing
            clean_cam = cam_dyn.strip()
            clean_cam = re.sub(r'^(camera motion:?\s*)+', '', clean_cam, flags=re.IGNORECASE).strip()
            # If camera motion was a generic push-in towards face, elevate to vertical-first framing
            if re.search(r'push-in towards .*face', clean_cam, flags=re.IGNORECASE) or clean_cam.lower() in ["slow cinematic push-in", "push_in"]:
                clean_cam = "Low-angle vertical shot looking slightly upward, gentle cinematic vertical push-in capturing from polished floor up to high ceiling"

            visual_motion = (
                f"Full bleed vertical 9:16 frame, edge-to-edge mobile portrait orientation, zero letterbox, fills entire vertical screen. "
                f"Camera motion: {clean_cam}. "
                f"Visual cues: {visual_cues}. Pixar-style 3D animated film quality, fluid motion, 4k 60fps."
            )

            # 2. Dialogue & Voice Delivery Overlay: [character] says: "[dialogue]" spoken in a [tone] tone.
            delivery = (
                (matching.get("delivery_and_tone") if matching else None)
                or scene.get("delivery_and_tone")
                or "highly expressive, melodramatic vocal delivery with palpable emotional tension and theatrical conviction"
            )
            dialogue_val = matching.get("dialogue", scene.get("dialogue")) if matching else scene.get("dialogue")
            scene_chars = scene.get("characters", [])
            lead_speaker = scene_chars[0] if scene_chars else "Character"

            def trim_words_max_9(speech_text: str) -> str:
                """Ensures dialogue speech is tightly edited to 5 to 8 words, never exceeding 9 words."""
                words = speech_text.strip().split()
                if len(words) > 9:
                    words = words[:8]
                return " ".join(words)

            def strip_says_prefix(text: str, speaker: str = "") -> str:
                """Strip any existing 'Speaker says: ' or generic 'X says: ' prefix to prevent double-wrapping."""
                text = text.strip().strip('"\'')
                # Strip exact speaker prefix (case-insensitive)
                if speaker:
                    text = re.sub(r'^' + re.escape(speaker.strip()) + r'\s+says:\s*["\']?', '', text, flags=re.IGNORECASE).strip().strip('"\'')
                # Strip any generic 'Word says: ' prefix (up to 4 words in speaker name)
                text = re.sub(r'^(?:\w+\s+){0,3}\w+\s+says:\s*["\']?', '', text, flags=re.IGNORECASE).strip().strip('"\'')
                return text

            dialogue_overlay = ""
            if isinstance(dialogue_val, list):
                parts = []
                for d in dialogue_val:
                    if isinstance(d, dict):
                        spk = d.get("speaker", lead_speaker)
                        speech = d.get("exact_speech") or d.get("direct_speech") or d.get("text", "")
                        speech = str(speech).strip()
                        # Fix nested prefix bug: strip any existing "Speaker says:" before re-wrapping
                        speech = strip_says_prefix(speech, spk)
                        speech = trim_words_max_9(speech)
                        emo = d.get("delivery_and_tone") or delivery
                        # Determine vocal tone keyword for audio spec
                        if any(w in emo.lower() for w in ["calm", "hushed", "whisper", "quiet", "soft"]):
                            tone_word = "calm"
                        elif any(w in emo.lower() for w in ["intense", "rage", "fury", "anger", "furious", "trembling"]):
                            tone_word = "intense"
                        else:
                            tone_word = "determined"
                        parts.append(f'{spk} says: "{speech}", spoken in a {tone_word} tone.')
                    else:
                        parts.append(str(d))
                dialogue_overlay = " ".join(parts)
            elif isinstance(dialogue_val, str) and dialogue_val.strip():
                clean_speech = dialogue_val.strip().strip('"\'')
                if re.match(r'^(?:\w+\s+){0,3}\w+\s+says:\s*', clean_speech, re.IGNORECASE):
                    # Already has "Speaker says:" format — extract and re-wrap cleanly
                    says_match = re.match(r'^([\w][\w\s]{0,30}?)\s+says:\s*["\']?(.*?)["\']?\s*$', clean_speech, re.IGNORECASE | re.DOTALL)
                    if says_match:
                        speaker_name = says_match.group(1).strip()
                        raw_text = says_match.group(2).strip().strip('"\'')
                        raw_text = re.sub(r'^\([^)]*\)\s*', '', raw_text)
                        trimmed_text = trim_words_max_9(raw_text)
                    else:
                        speaker_name = lead_speaker
                        trimmed_text = trim_words_max_9(strip_says_prefix(clean_speech))
                elif ":" in clean_speech and not clean_speech.lower().startswith("http"):
                    speaker_part, text_part = clean_speech.split(":", 1)
                    speaker_name = speaker_part.strip()
                    raw_text = text_part.strip().strip('"\'')
                    raw_text = re.sub(r'^\([^)]*\)\s*', '', raw_text)
                    trimmed_text = trim_words_max_9(raw_text)
                else:
                    speaker_name = lead_speaker
                    trimmed_text = trim_words_max_9(clean_speech)

                if any(w in (delivery or "").lower() for w in ["calm", "hushed", "whisper", "quiet", "soft"]):
                    tone_word = "calm"
                elif any(w in (delivery or "").lower() for w in ["intense", "rage", "fury", "anger", "furious", "trembling"]):
                    tone_word = "intense"
                else:
                    tone_word = "determined"
                dialogue_overlay = f'{speaker_name} says: "{trimmed_text}", spoken in a {tone_word} tone.'

            if dialogue_overlay:
                dialogue_overlay = sanitize_dialogue(dialogue_overlay)
            if isinstance(dialogue_val, str):
                dialogue_val = sanitize_dialogue(dialogue_val)

            # 3. Audio Specification: Natural human voice only — zero SFX, zero Foley, zero music, zero bass drops.
            # No sfx_cue or ambient sound injection — these caused distorted monster/creature pitch modulation in Veo.
            audio_spec = (
                "Audio Specifications: Natural, clear human speaking voice, realistic human vocal cords, "
                "clean studio recording, articulate mid-range pitch. "
                "Zero voice distortion, no robotic effects, no monster or creature pitch modulation. "
                "Spoken dialogue only: no background sound effects, no Foley, no bass drops, no stingers, no background music. (no subtitles)"
            )

            # 4. Synthesize complete audio-visual Veo motion prompt without truncation
            if dialogue_overlay:
                final_motion_prompt = f"{visual_motion} {dialogue_overlay} {audio_spec}"
            else:
                final_motion_prompt = f"{visual_motion} {audio_spec}"

            # Clean any double prefixes and nested "says: says:" artifacts
            final_motion_prompt = re.sub(r'Camera motion:\s*Camera motion:', 'Camera motion:', final_motion_prompt, flags=re.IGNORECASE)
            # Fix any remaining "Name says: Name says:" double-prefix pattern
            final_motion_prompt = re.sub(
                r'([\w][\w\s]{0,30}?)\s+says:\s*["\']?\1\s+says:\s*["\']?',
                r'\1 says: "',
                final_motion_prompt,
                flags=re.IGNORECASE
            )
            final_motion_prompt = sanitize_dialogue(sanitize_visual_description(final_motion_prompt))

            standardized_items.append({
                "scene_id": scene_id,
                "motion_prompt": final_motion_prompt,
                "camera_dynamics": cam_dyn,
                "camera_movement": cam_dyn,
                "action_description": visual_cues,
                "dialogue": dialogue_overlay or dialogue_val,
                "duration": matching.get("duration") if matching else scene.get("duration_seconds"),
                "hook_3s": scene_hook if scene_id == 1 else None,
                "status": "in_progress"
            })

        # Save prompt blueprints to state and disk while keeping status in_progress until video clips render
        self.state_mgr.state["phases"]["phase_4_animation_prompts"]["items"] = standardized_items
        self.state_mgr.state["phases"]["phase_4_animation_prompts"]["status"] = "in_progress"
        motion_json_file = self.state_mgr.scripts_dir / "motion_prompts.json"
        with open(motion_json_file, "w", encoding="utf-8") as f:
            json.dump(standardized_items, f, indent=2, ensure_ascii=False)
        self.state_mgr._persist_state()

        logger.info(f"[Phase 4] Formulated animation prompts & dialogue blueprints for {len(standardized_items)} scenes.")
        return standardized_items

    def render_video_clips(
        self,
        motion_items: Optional[List[Dict[str, Any]]] = None,
        target_scene_id: Optional[int] = None,
        force_regenerate: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Phase 4B: Renders video clips for each scene upon approval using Veo 3.1 Fast (single-pass video + audio)
        referencing Phase 3 keyframes and Phase 4 motion & dialogue prompts.
        """
        if not motion_items:
            motion_items = self.state_mgr.get_phase_items("phase_4_animation_prompts") or self.generate_motion_prompts(force_regenerate=force_regenerate)

        image_items = self.state_mgr.get_phase_items("phase_3_images")
        script_data = self.state_mgr.get_phase_data("phase_1_script") or {}
        scenes = script_data.get("scenes", [])
        if target_scene_id is not None:
            scenes = [s for s in scenes if s.get("scene_id", 1) == target_scene_id]

        chars_data = self.state_mgr.get_phase_data("phase_2_characters") or {}
        characters_bible = chars_data.get("characters", [])

        # Lookup maps
        image_map = {
            item.get("scene_id", i + 1): Path(item["image_path"])
            for i, item in enumerate(image_items)
            if item.get("image_path")
        }
        motion_map = {
            item.get("scene_id", i + 1): item
            for i, item in enumerate(motion_items)
            if isinstance(item, dict)
        }

        rendered_clips = []
        for scene in scenes:
            if self.state_mgr.is_cancelled():
                raise GenerationCancelledError(f"Phase 4 video generation cancelled for story '{self.state_mgr.story_id}'.")

            scene_id = scene.get("scene_id", 1)
            output_vid_path = self.state_mgr.clips_dir / f"scene_{scene_id:02d}.mp4"

            # Check if this scene video clip is already completed
            if not force_regenerate and self.state_mgr.is_scene_video_completed(scene_id) and output_vid_path.exists() and output_vid_path.stat().st_size > 0:
                logger.info(f"[Phase 4] Scene {scene_id} video clip already rendered. Skipping.")
                rendered_clips.append({"scene_id": scene_id, "video_path": str(output_vid_path), "status": "completed"})
                continue

            motion_info = motion_map.get(scene_id, {})
            motion_prompt = (
                motion_info.get("motion_prompt")
                or scene.get("video_prompt")
                or scene.get("visual_description", "")
            )
            # Ensure no rapid movements or direct eye contact lens keywords contaminate the generation
            motion_prompt = re.sub(r'direct eye contact with camera lens', 'intense dramatic gaze', motion_prompt, flags=re.IGNORECASE)
            for rapid_term in ["rapid snap-zoom", "snap-zoom", "rapid zoom", "whip pan", "fast zoom", "quick pan"]:
                motion_prompt = re.sub(rapid_term, "slow cinematic push-in", motion_prompt, flags=re.IGNORECASE)
            # Remove any unwanted push-in towards face in motion_prompt
            motion_prompt = re.sub(r'Camera motion:\s*Slow cinematic push-in towards [^,.]*face', 'Low-angle vertical shot looking slightly upward from polished floor up to high ceiling fixtures', motion_prompt, flags=re.IGNORECASE)
            motion_prompt = re.sub(r'Slow cinematic push-in towards [^,.]*face', 'Low-angle vertical shot looking slightly upward from polished floor up to high ceiling fixtures', motion_prompt, flags=re.IGNORECASE)
            # Ensure full bleed 9:16 vertical edge-to-edge framing is front and center if not already present
            if "edge-to-edge" not in motion_prompt.lower() or "zero letterbox" not in motion_prompt.lower():
                motion_prompt = f"Full bleed vertical 9:16 frame, edge-to-edge mobile portrait orientation, zero letterbox, fills entire vertical screen. {motion_prompt}"
            # Refactor any legacy rigid cornice edge anchors
            motion_prompt = re.sub(
                r'Overhead architectural cornices line the top edge while rain-soaked reflective pavement spans the bottom foreground\.?',
                'Vertical composition showing towering hotel architecture filling the upper background, continuous rain-slicked pavement filling the foreground from edge to edge.',
                motion_prompt,
                flags=re.IGNORECASE
            )

            raw_dur = motion_info.get("duration") or scene.get("duration_seconds")
            duration = int(raw_dur) if raw_dur else None
            motion_level = scene.get("motion_level", "subtle_emotion")
            camera_motion = motion_info.get("camera_movement") or "push_in"
            if camera_motion in ["rapid snap-zoom", "snap-zoom", "whip pan", "fast zoom"]:
                camera_motion = "push_in"
            elif re.search(r'push-in towards .*face', camera_motion, flags=re.IGNORECASE):
                camera_motion = "push_in"

            keyframe_path = image_map.get(scene_id)
            if not keyframe_path or not keyframe_path.exists():
                fallback_keyframe = self.state_mgr.images_dir / f"scene_{scene_id:02d}_keyframe.png"
                if fallback_keyframe.exists():
                    keyframe_path = fallback_keyframe
                else:
                    raise FileNotFoundError(
                        f"[Phase 4 Error] Scene {scene_id} keyframe image not found at '{keyframe_path}'. "
                        f"Phase 3 must generate keyframe images before Phase 4 can render video clips."
                    )

            # Auto-crop any black bars and ensure true 9:16 portrait resolution (720x1280 or 1080x1920)
            keyframe_path = crop_black_bars(Path(keyframe_path))

            dur_label = f"{duration}s" if duration else "natural length"
            logger.info(f"[Phase 4] Rendering video clip for Scene {scene_id} ({dur_label}, motion={motion_level}) via Veo 3.1 Fast...")

            # Record scene clip rendering in-progress state for real-time frontend active feedback
            self.state_mgr.update_scene_video(
                scene_id=scene_id,
                video_path="",
                status="generating"
            )

            t0 = perf_counter()
            # Trace individual scene video generation in Langfuse & Prometheus
            with langfuse_tracer.span(
                f"scene_{scene_id:02d}_veo_video",
                metadata={
                    "scene_id": scene_id,
                    **({"duration": duration} if duration else {}),
                    "motion_level": motion_level,
                    "camera_motion": camera_motion,
                    "story_id": self.state_mgr.story_id
                },
                input_data={
                    "motion_prompt": motion_prompt,
                    "keyframe": str(keyframe_path),
                    **({"duration": duration} if duration else {})
                }
            ) as span_obj:
                active_media_renders.labels("veo").inc()
                try:
                    generated_vid_path = self.ai_client.generate_video_clip(
                        motion_prompt=motion_prompt,
                        image_path=keyframe_path,
                        output_path=output_vid_path,
                        duration=duration,
                        motion_level=motion_level,
                        camera_motion=camera_motion,
                        provider_name="google_veo",
                        extra_params={
                            "character_references": [
                                str(self.state_mgr.get_character_image_path(c.get("name", "")))
                                for c in characters_bible
                                if self.state_mgr.get_character_image_path(c.get("name", ""))
                            ],
                            "characters_bible": characters_bible,
                        },
                        scene_id=scene_id,
                        story_id=self.state_mgr.story_id
                    )
                    gen_elapsed = round(perf_counter() - t0, 3)
                    from services.media.video.google_veo import get_video_file_duration
                    actual_clip_dur = get_video_file_duration(output_vid_path) or (float(duration) if duration else 5.0)
                    if span_obj and hasattr(span_obj, "update"):
                        span_obj.update(output={
                            "video_path": str(generated_vid_path),
                            "duration_seconds": gen_elapsed,
                            "actual_video_length": actual_clip_dur,
                            "status": "completed"
                        })
                    model_name = getattr(config, "VEO_MODEL", "veo-3.1-fast")
                    scene_veo_runs.labels(model=model_name, status="success").inc()
                    scene_veo_duration.labels(model=model_name).observe(gen_elapsed)
                except Exception as veo_exc:
                    model_name = getattr(config, "VEO_MODEL", "veo-3.1-fast")
                    scene_veo_runs.labels(model=model_name, status="error").inc()
                    if output_vid_path.exists() and output_vid_path.stat().st_size <= 1024:
                        output_vid_path.unlink(missing_ok=True)
                    self.state_mgr.update_scene_video(
                        scene_id=scene_id,
                        video_path="",
                        status="error",
                        error_message=str(veo_exc)
                    )
                    self.state_mgr.record_error(veo_exc)
                    raise veo_exc
                finally:
                    active_media_renders.labels("veo").dec()

            if not output_vid_path.exists() or output_vid_path.stat().st_size <= 1024:
                if output_vid_path.exists():
                    output_vid_path.unlink(missing_ok=True)
                raise RuntimeError(f"Rendered video clip for Scene {scene_id} is missing or corrupted on disk ({output_vid_path}).")

            from services.media.video.google_veo import get_video_file_duration
            measured_clip_dur = get_video_file_duration(output_vid_path) or (float(duration) if duration else 5.0)
            self.state_mgr.update_scene_video(
                scene_id=scene_id,
                video_path=str(generated_vid_path),
                status="completed",
                duration=measured_clip_dur
            )
            rendered_clips.append({
                "scene_id": scene_id,
                "video_path": str(generated_vid_path),
                "duration": measured_clip_dur,
                "status": "completed"
            })

        # Complete Phase 4 only when all scenes have rendered video clips
        all_scenes_rendered = all(
            self.state_mgr.is_scene_video_completed(s.get("scene_id", idx + 1))
            for idx, s in enumerate(scenes)
        )
        if all_scenes_rendered:
            self.state_mgr.complete_phase_4(motion_items or [])
            logger.info(f"[Phase 4] All {len(scenes)} video clips rendered successfully via Google Veo. Phase 4 COMPLETED.")
        else:
            logger.info(f"[Phase 4] Rendered {len(rendered_clips)} / {len(scenes)} video clips.")
        return rendered_clips

    def execute(self, target_scene_id: Optional[int] = None, force_regenerate: bool = False) -> List[Dict[str, Any]]:
        """
        Executes Phase 4:
        1. Formulates animation motion prompts and character dialogue scripts.
        2. Renders video clips for each scene upon approval using Veo 3.1 Fast.
        """
        if self.state_mgr.is_cancelled():
            raise GenerationCancelledError(f"Phase 4 cancelled for story '{self.state_mgr.story_id}'.")

        # If current_phase is already phase_5_video_generation and not force_regenerate, do not re-render
        if not force_regenerate and self.state_mgr.state.get("current_phase") == "phase_5_video_generation":
            existing = self.state_mgr.get_phase_items("phase_4_animation_prompts")
            if existing:
                logger.info("[Phase 4] Current phase is Phase 5 and Phase 4 items exist. Skipping clip rendering.")
                return existing

        motion_items = self.generate_motion_prompts(force_regenerate=force_regenerate)
        self.render_video_clips(motion_items, target_scene_id=target_scene_id, force_regenerate=force_regenerate)
        return self.state_mgr.get_phase_items("phase_4_animation_prompts")

"""
Story Generation Pipeline Coordinator.
Runs and resumes Phases 1 through 5 and triggers final assembly.
"""

from pathlib import Path
from typing import Optional, Dict, Any

from config import config
from core.logger import logger
from core.state_manager import StateManager
from services.ai_client import AIClient
from services.tts_service import TTSService
from services.video_editor import VideoEditor
from phases import (
    Phase1Script,
    Phase2Characters,
    Phase3Images,
    Phase4Motion,
    Phase5Video
)
from pipeline.assembly import assemble_story
from monitoring.metrics import phase_runs, phase_duration, active_stories
from services.langfuse_tracer import langfuse_tracer
from core.cancellation import GenerationCancelledError
from time import perf_counter


class StoryPipeline:
    """Executes the 5-phase story creation pipeline with state checkpointing and recovery."""

    def __init__(self, state_mgr: StateManager, max_scenes: Optional[int] = None):
        self.state_mgr = state_mgr
        self.max_scenes = max_scenes if max_scenes is not None else (self.state_mgr.state.get("max_scenes") or getattr(config, "MAX_SCENES", None))
        self.ai_client = AIClient()
        self.tts_service = TTSService()
        self.video_editor = VideoEditor()

        # Phase handlers
        self.p1_script = Phase1Script(self.state_mgr, self.ai_client)
        self.p2_characters = Phase2Characters(self.state_mgr, self.ai_client)
        self.p3_images = Phase3Images(self.state_mgr, self.ai_client)
        self.p4_motion = Phase4Motion(self.state_mgr, self.ai_client)
        self.p5_video = Phase5Video(self.state_mgr, self.ai_client)

    def run(self) -> Path:
        """Runs all 5 phases and the final assembly, resuming from any prior checkpoint."""
        logger.info(f"=== Starting Story Pipeline: {self.state_mgr.story_id} ===")
        logger.info(f"Prompt: {self.state_mgr.state.get('prompt')}")
        if self.max_scenes:
            logger.info(f"Test Run Mode: Limiting to {self.max_scenes} scene(s)")
        logger.info(f"Archive directory: {self.state_mgr.archive_dir}")

        if self.state_mgr.is_cancelled():
            logger.info("[Pipeline] Story is cancelled/paused; resume it before running.")
            return Path(self.state_mgr.state.get("phases", {}).get("assembly", {}).get("final_video_path") or self.state_mgr.archive_dir)

        if self.state_mgr.state.get("paused") or self.state_mgr.state.get("status") == "paused":
            logger.info("[Pipeline] Story is paused; resume it before running.")
            return Path(self.state_mgr.state.get("phases", {}).get("assembly", {}).get("final_video_path") or self.state_mgr.archive_dir)
        active_stories.inc()
        prompt_text = self.state_mgr.state.get("prompt", "")
        langfuse_tracer.start_trace(
            name="story_pipeline_batch",
            story_id=self.state_mgr.story_id,
            metadata={"prompt": prompt_text, "mode": "batch", "max_scenes": self.max_scenes},
            tags=["fable-motion", "video-pipeline", "batch"]
        )
        try:
            if self.state_mgr.is_cancelled():
                raise GenerationCancelledError(f"Pipeline cancelled for story {self.state_mgr.story_id}")

            current_target_phase = self.state_mgr.state.get("current_phase")
            # If current phase is Phase 5, jump straight to Phase 5 stitching and captioning without touching Phase 1-4
            if current_target_phase == "phase_5_video_generation":
                logger.info(">>> Current phase is Phase 5: Jumping directly to Caption Generation & Video Clip Merge Assembly <<<")
                phase_done = self.state_mgr.is_phase_completed("phase_5_video_generation")
                self._phase("phase_5_video_generation", self.p5_video.execute, span_name="stitch_and_caption")
                if self._awaiting_approval("phase_5_video_generation", not phase_done):
                    return self._checkpoint_path()

                final_vid_path = (
                    self.state_mgr.state.get("phases", {}).get("assembly", {}).get("final_video_path")
                    or str(self.state_mgr.final_dir / "final_story.mp4")
                )
                final_video = Path(final_vid_path)
                logger.info(f"=== Story Pipeline COMPLETED Successfully! ===")
                logger.info(f"Final Video: {final_video}")
                langfuse_tracer.end_trace(output_data={"status": "completed", "final_video": str(final_video)})
                return final_video

            # -------------------------------------------------------------
            # PHASE 1: Script & Storyboard Generation
            # -------------------------------------------------------------
            logger.info(">>> [1/5] Phase 1: Script & Storyboard Generation <<<")
            phase_done = self.state_mgr.is_phase_completed("phase_1_script")
            script_data = self._phase("phase_1_script", lambda: self.p1_script.execute(max_scenes=self.max_scenes))
            if self._awaiting_approval("phase_1_script", not phase_done):
                return self._checkpoint_path()

            # -------------------------------------------------------------
            # PHASE 2: Character Consistency Generation
            # -------------------------------------------------------------
            logger.info(">>> [2/5] Phase 2: Character Consistency Generation <<<")
            phase_done = self.state_mgr.is_phase_completed("phase_2_characters")
            self._phase("phase_2_characters", self.p2_characters.execute)
            if self._awaiting_approval("phase_2_characters", not phase_done):
                return self._checkpoint_path()

            # -------------------------------------------------------------
            # PHASE 3: Keyframe Image Generation (Imagen 3)
            # -------------------------------------------------------------
            logger.info(">>> [3/5] Phase 3: Keyframe Image Generation (Imagen 3) <<<")
            phase_done = self.state_mgr.is_phase_completed("phase_3_images")
            self._phase("phase_3_images", self.p3_images.execute)
            if self._awaiting_approval("phase_3_images", not phase_done):
                return self._checkpoint_path()

            # -------------------------------------------------------------
            # PHASE 4: Animation Motion Prompting & Video Clip Generation (Veo 3.1 Fast)
            # -------------------------------------------------------------
            logger.info(">>> [4/5] Phase 4: Animation Prompting & Video Clip Generation (Veo 3.1 Fast) <<<")
            phase_done = self.state_mgr.is_phase_completed("phase_4_animation_prompts")
            self._phase("phase_4_animation_prompts", self.p4_motion.execute)
            if self._awaiting_approval("phase_4_animation_prompts", not phase_done):
                return self._checkpoint_path()

            # -------------------------------------------------------------
            # PHASE 5: Caption Generation & Video Clip Merge Assembly
            # -------------------------------------------------------------
            logger.info(">>> [5/5] Phase 5: Caption Generation & Video Clip Merge Assembly <<<")
            phase_done = self.state_mgr.is_phase_completed("phase_5_video_generation")
            self._phase("phase_5_video_generation", self.p5_video.execute, span_name="stitch_and_caption")
            if self._awaiting_approval("phase_5_video_generation", not phase_done):
                return self._checkpoint_path()

            final_vid_path = (
                self.state_mgr.state.get("phases", {}).get("assembly", {}).get("final_video_path")
                or str(self.state_mgr.final_dir / "final_story.mp4")
            )
            final_video = Path(final_vid_path)

            logger.info(f"=== Story Pipeline COMPLETED Successfully! ===")
            logger.info(f"Final Video: {final_video}")
            langfuse_tracer.end_trace(output_data={"status": "completed", "final_video": str(final_video)})
            return final_video

        except GenerationCancelledError as ce:
            logger.info(f"[StoryPipeline] Pipeline execution cancelled by user: {ce}")
            self.state_mgr.state["status"] = "cancelled"
            self.state_mgr.state["paused"] = True
            self.state_mgr._persist_state()
            langfuse_tracer.end_trace(output_data={"status": "cancelled", "reason": str(ce)})
            return self._checkpoint_path()
        except Exception as e:
            logger.error(f"Pipeline error in story {self.state_mgr.story_id}: {e}")
            self.state_mgr.record_error(e)
            langfuse_tracer.end_trace(error=str(e))
            raise
        finally:
            active_stories.dec()

    def _phase(self, name: str, fn, metadata: Optional[Dict[str, Any]] = None, span_name: Optional[str] = None):
        if self.state_mgr.is_cancelled():
            raise GenerationCancelledError(f"Pipeline cancelled before phase '{name}'.")
        if self.state_mgr.is_phase_completed(name):
            return self.state_mgr.get_phase_data(name) or self.state_mgr.get_phase_items(name)
        started = perf_counter()
        langfuse_label = span_name or name
        with langfuse_tracer.span(langfuse_label, metadata=metadata):
            try:
                result = fn()
                phase_runs.labels(name, "success").inc()
                return result
            except GenerationCancelledError:
                raise
            except Exception:
                phase_runs.labels(name, "error").inc()
                raise
            finally:
                phase_duration.labels(name).observe(perf_counter() - started)

    def _awaiting_approval(self, phase_name, just_completed):
        if not just_completed:
            return False
        self.state_mgr.state["manual_approval_required"] = True
        self.state_mgr.state["status"] = "in_progress"
        self.state_mgr.state["current_phase"] = phase_name
        self.state_mgr._persist_state()
        return True

    def run_iterative(self) -> Path:
        """
        Executes the clip-by-clip iterative generation cycle (Scene 1 to Scene N, dynamically 10-14 scenes):
        1. Phase 1 generates script and dialogue for all scenes (10 to 14 scenes based on narrative pacing).
        2. Phase 2 generates the characters used for all clips and stores images in /assets/characters.
        3. For each scene (Scene 1 to Scene N):
           - Phase 3: creates keyframe still using Scene i script and /assets character portraits.
           - Phase 4: waits for Phase 3's keyframe still and renders the Scene i video clip.
           - Phase 5: applies dynamic word-level karaoke captions to the Scene i video clip.
        4. On the final scene (Scene N), Phase 5 additionally merges all captioned clips together
           into the final compiled story master video!
        """
        logger.info(f"=== Starting Iterative Story Pipeline: {self.state_mgr.story_id} ===")
        active_stories.inc()
        prompt_text = self.state_mgr.state.get("prompt", "")
        langfuse_tracer.start_trace(
            name="story_pipeline_iterative",
            story_id=self.state_mgr.story_id,
            metadata={"prompt": prompt_text, "mode": "iterative", "max_scenes": self.max_scenes},
            tags=["fable-motion", "video-pipeline", "iterative-loop"]
        )
        try:
            # 1. Phase 1: Script & Storyboard
            logger.info(">>> [1/5] Phase 1: Script & Storyboard Generation <<<")
            script_data = self._phase("phase_1_script", lambda: self.p1_script.execute(max_scenes=self.max_scenes))
            scenes = script_data.get("scenes", []) if isinstance(script_data, dict) else []

            # 2. Phase 2: Characters stored in /assets
            logger.info(">>> [2/5] Phase 2: Global Character Cast <<<")
            chars_data = self._phase("phase_2_characters", self.p2_characters.execute)

            # 3. Iterative per-clip loop (Scene 1 to Scene N)
            for idx, scene in enumerate(scenes):
                scene_id = scene.get("scene_id", idx + 1)
                is_last = (idx == len(scenes) - 1)
                logger.info(f">>> [Iteration {scene_id}/{len(scenes)}] Processing Scene {scene_id} <<<")

                with langfuse_tracer.span(f"scene_{scene_id:02d}_iteration", metadata={"scene_id": scene_id, "is_last": is_last}):
                    # Phase 3: Keyframe generation
                    self._phase("phase_3_images", lambda: self.p3_images.execute(target_scene_id=scene_id), metadata={"scene_id": scene_id})

                    # Phase 4: Waits for Phase 3 keyframe & renders video clip
                    self._phase("phase_4_animation_prompts", lambda: self.p4_motion.execute(target_scene_id=scene_id), metadata={"scene_id": scene_id})

                    # Phase 5: Dynamic captions for this clip
                    self._phase("phase_5_video_generation", lambda: self.p5_video.caption_scene_clip(scene_id), metadata={"scene_id": scene_id, "action": "caption"}, span_name="stitch_and_caption")

            # Final assembly: Merge all clips into master story
            logger.info(f">>> [Final Assembly] Merging all {len(scenes)} clips into master video <<<")
            self._phase("phase_5_video_generation", self.p5_video.execute, metadata={"action": "merge_all"}, span_name="stitch_and_caption")

            final_vid_path = (
                self.state_mgr.state.get("phases", {}).get("assembly", {}).get("final_video_path")
                or str(self.state_mgr.final_dir / "final_story.mp4")
            )
            final_video = Path(final_vid_path)
            langfuse_tracer.end_trace(output_data={"status": "completed", "final_video": str(final_video)})
            return final_video
        except GenerationCancelledError as ce:
            logger.info(f"[StoryPipeline] Iterative pipeline execution cancelled by user: {ce}")
            self.state_mgr.state["status"] = "cancelled"
            self.state_mgr.state["paused"] = True
            self.state_mgr._persist_state()
            langfuse_tracer.end_trace(output_data={"status": "cancelled", "reason": str(ce)})
            return self._checkpoint_path()
        except Exception as e:
            logger.error(f"Iterative pipeline error in story {self.state_mgr.story_id}: {e}")
            self.state_mgr.record_error(e)
            langfuse_tracer.end_trace(error=str(e))
            raise
        finally:
            active_stories.dec()

    def _checkpoint_path(self):
        return Path(self.state_mgr.archive_dir)


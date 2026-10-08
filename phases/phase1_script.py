"""
Phase 1: Script & Storyboard Generation.
Generates narrative premise, scene-by-scene script, character actions, narration lines, and visual cues.
"""

from typing import Dict, Any, Optional
from core.logger import logger
from core.state_manager import StateManager
from core.cancellation import GenerationCancelledError
from services.ai_client import AIClient
from config import config


class Phase1Script:
    def __init__(self, state_mgr: StateManager, ai_client: AIClient):
        self.state_mgr = state_mgr
        self.ai_client = ai_client

    def execute(self, max_scenes: Optional[int] = None) -> Dict[str, Any]:
        """Executes Phase 1, skipping if already completed in pipeline_state.json."""
        if self.state_mgr.is_cancelled():
            raise GenerationCancelledError(f"Phase 1 execution cancelled for story '{self.state_mgr.story_id}'.")

        target_scenes = max_scenes if max_scenes is not None else getattr(config, "MAX_SCENES", None)

        if self.state_mgr.is_phase_completed("phase_1_script"):
            logger.info("[Phase 1] Script already completed in state. Skipping generation.")
            data = self.state_mgr.get_phase_data("phase_1_script")
            if target_scenes and "scenes" in data and len(data["scenes"]) > target_scenes:
                data["scenes"] = data["scenes"][:target_scenes]
            return data

        prompt = self.state_mgr.state.get("prompt", "A captivating cinematic story")
        logger.info(f"[Phase 1] Generating fresh script for prompt: '{prompt}' (target scenes: {target_scenes or '10-14'})")

        if self.state_mgr.is_cancelled():
            raise GenerationCancelledError(f"Phase 1 execution cancelled for story '{self.state_mgr.story_id}'.")

        selected_concept = self.state_mgr.state.get("selected_concept")
        script_data = self.ai_client.generate_script(
            prompt,
            max_scenes=target_scenes,
            existing_characters=None,
            selected_concept=selected_concept,
        )

        if self.state_mgr.is_cancelled():
            raise GenerationCancelledError(f"Phase 1 execution cancelled for story '{self.state_mgr.story_id}'.")

        # Validate basic schema
        if not script_data.get("scenes"):
            raise ValueError("Phase 1 generation returned no scenes.")

        if target_scenes and len(script_data.get("scenes", [])) > target_scenes:
            script_data["scenes"] = script_data["scenes"][:target_scenes]

        self.state_mgr.complete_phase_1(script_data)
        logger.info(f"[Phase 1] Script completed with {len(script_data['scenes'])} scenes.")
        return script_data

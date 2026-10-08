"""
State & Recovery Engine for AI Video Story Pipeline.
Manages pipeline_state.json, atomic disk persistence, crash recovery, and graceful SIGINT interruption.
"""

import os
import sys
import json
import signal
import re
import time
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List

from core.logger import logger, attach_story_logger
from core.state_schema import create_initial_state, generate_slug
from config import config


class StateManager:
    """
    Manages the lifecycle of a story generation run, ensuring state is persisted atomically
    after every operation and can be resumed at any time without duplicating work.
    """

    def __init__(
        self,
        story_id: Optional[str] = None,
        prompt: Optional[str] = None,
        state_file_path: Optional[Path] = None,
        parent_story_id: Optional[str] = None
    ):
        self.interrupted = False
        self.is_restored_from_cloud = False
        self._setup_signal_handlers()

        if state_file_path and state_file_path.exists():
            self.state_path = state_file_path
            self.state = self._load_state(self.state_path)
            self.archive_dir = Path(self.state["archive_dir"])
            self.story_id = self.state.get("story_id", self.archive_dir.name)
            self.story_slug = self.state.get("story_slug", "story")
            self.parent_story_id = self.state.get("parent_story_id") or parent_story_id
        elif story_id:
            # Look for existing state file in archive
            matching_dirs = list(config.ARCHIVE_DIR.glob(f"*{story_id}*"))
            if matching_dirs and (matching_dirs[0] / "pipeline_state.json").exists():
                self.archive_dir = matching_dirs[0]
                self.state_path = self.archive_dir / "pipeline_state.json"
                self.state = self._load_state(self.state_path)
                self.story_id = self.state.get("story_id", story_id)
                self.story_slug = self.state.get("story_slug", "story")
                self.parent_story_id = self.state.get("parent_story_id") or parent_story_id
            else:
                # Check Supabase if running on ephemeral container or cloud instance
                restored_state = None
                try:
                    from services.supabase_sync import fetch_story_by_id_from_supabase, is_supabase_configured
                    if is_supabase_configured():
                        remote = fetch_story_by_id_from_supabase(story_id)
                        if remote and remote.get("state") and isinstance(remote.get("state"), dict):
                            restored_state = remote["state"]
                except Exception as e:
                    logger.debug(f"[StateManager] Supabase restore check notice: {e}")

                if restored_state:
                    self.is_restored_from_cloud = True
                    self.story_id = restored_state.get("story_id", story_id)
                    self.story_slug = restored_state.get("story_slug", "story")
                    self.parent_story_id = restored_state.get("parent_story_id") or parent_story_id
                    self.archive_dir = config.ARCHIVE_DIR / self.story_id
                    self.archive_dir.mkdir(parents=True, exist_ok=True)
                    self.state_path = self.archive_dir / "pipeline_state.json"
                    self.state = restored_state
                    self._persist_state()
                    self._rehydrate_media_from_gcs()
                    logger.info(f"[StateManager] Restored story state for '{self.story_id}' from Supabase cloud database.")
                else:
                    self._initialize_new_story(prompt or "Untitled Story", story_id=story_id, parent_story_id=parent_story_id)
        else:
            self._initialize_new_story(prompt or "Untitled Story", parent_story_id=parent_story_id)

        self.parent_archive_dir = self._resolve_parent_archive_dir(self.parent_story_id)
        if self.parent_story_id and self.parent_archive_dir:
            logger.info(f"[StateManager] Linked sequence/episode to parent story: '{self.parent_archive_dir.name}'")

        self.scripts_dir = self.archive_dir / "scripts"
        self.scenes_dir = self.archive_dir / "scenes"
        self.characters_dir = self.archive_dir / "characters"
        self.assets_dir = self.archive_dir / "assets"
        self.assets_characters_dir = self.assets_dir / "characters"
        self.images_dir = self.archive_dir / "images"
        self.clips_dir = self.archive_dir / "clips"
        self.final_dir = self.archive_dir / "final"

        # Ensure all story subdirectories exist
        for d in [self.scripts_dir, self.scenes_dir, self.characters_dir, self.assets_dir, self.assets_characters_dir, self.images_dir, self.clips_dir, self.final_dir]:
            d.mkdir(parents=True, exist_ok=True)

        from core.logger import detach_story_logger
        self._detach_story_logger = detach_story_logger
        self.logger_id = attach_story_logger(self.archive_dir)

    def get_scene_dir(self, scene_id: int) -> Path:
        """Returns and ensures directory for an individual scene."""
        scene_path = self.scenes_dir / f"scene_{scene_id:02d}"
        scene_path.mkdir(parents=True, exist_ok=True)
        return scene_path

    def close(self):
        """Releases file locks and detaches story logger."""
        if hasattr(self, "logger_id") and self.logger_id is not None:
            self._detach_story_logger(self.logger_id)
    def _resolve_parent_archive_dir(self, parent_id: Optional[str]) -> Optional[Path]:
        """Finds parent story directory in archive by ID or slug."""
        if not parent_id:
            return None
        direct = config.ARCHIVE_DIR / parent_id
        if direct.exists() and direct.is_dir():
            return direct
        matches = list(config.ARCHIVE_DIR.glob(f"*{parent_id}*"))
        for m in matches:
            if m.is_dir() and (m / "pipeline_state.json").exists():
                return m
        return None

    def get_parent_characters(self) -> Optional[Dict[str, Any]]:
        """Retrieves character consistency bibles from parent story if available."""
        if not hasattr(self, "parent_archive_dir") or not self.parent_archive_dir:
            return None
        char_file = self.parent_archive_dir / "scripts" / "characters.json"
        if char_file.exists():
            try:
                with open(char_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"[StateManager] Failed to read parent characters.json: {e}")
        return None

    def copy_parent_character_image(self, character_name: str) -> Optional[Path]:
        """Copies an established character reference portrait from parent story into current characters directory."""
        if not hasattr(self, "parent_archive_dir") or not self.parent_archive_dir:
            return None
        safe_name = re.sub(r'[^\w\-]', '_', character_name).strip()
        candidates = [
            self.parent_archive_dir / "characters" / f"{character_name}.png",
            self.parent_archive_dir / "characters" / f"{character_name}.jpg",
            self.parent_archive_dir / "characters" / f"{safe_name}.png",
            self.parent_archive_dir / "characters" / f"{safe_name}.jpg",
        ]
        for src in candidates:
            if src.exists() and src.stat().st_size > 0:
                dest = self.characters_dir / src.name
                if not dest.exists() or dest.stat().st_size == 0:
                    import shutil
                    shutil.copyfile(src, dest)
                    logger.info(f"[StateManager] Reused character portrait '{character_name}' from parent story -> {dest.name}")
                return dest
        return None

    def get_character_image_path(self, character_name: str) -> Optional[Path]:
        """Looks up a character's reference image in the story's characters directory, falling back to parent story."""
        safe_name = re.sub(r'[^\w\-]', '_', character_name).strip()
        candidates = [
            self.characters_dir / f"{character_name}.png",
            self.characters_dir / f"{character_name}.jpg",
            self.characters_dir / f"{safe_name}.png",
            self.characters_dir / f"{safe_name}.jpg",
            self.assets_characters_dir / f"{character_name}.png",
            self.assets_characters_dir / f"{character_name}.jpg",
            self.assets_characters_dir / f"{safe_name}.png",
            self.assets_characters_dir / f"{safe_name}.jpg",
            self.assets_dir / f"{character_name}.png",
            self.assets_dir / f"{safe_name}.png",
        ]
        for c in candidates:
            if c.exists() and os.path.getsize(c) > 0:
                return c

        # Cloud rehydration fallback: check if character has an image_url in state
        p2_data = self.state.get("phases", {}).get("phase_2_characters", {}).get("data", {})
        characters = p2_data.get("characters", []) if isinstance(p2_data, dict) else []
        for char in characters:
            if isinstance(char, dict) and char.get("name", "").strip().lower() == character_name.strip().lower():
                img_url = char.get("image_url")
                if img_url:
                    rehydrated = self._rehydrate_media_file(
                        str(self.characters_dir / f"{safe_name}.png"),
                        img_url,
                        default_subfolder="characters"
                    )
                    if rehydrated and Path(rehydrated).exists():
                        return Path(rehydrated)

        # Fallback: check parent story and copy into current episode characters folder
        copied = self.copy_parent_character_image(character_name)
        if copied and copied.exists() and os.path.getsize(copied) > 0:
            return copied

        return None

    def is_character_image_completed(self, character_name: str) -> bool:
        """Checks if a character image already exists in the story directory or parent story."""
        return self.get_character_image_path(character_name) is not None

    def _setup_signal_handlers(self):
        """Attaches graceful interruption handlers for SIGINT (Ctrl+C) and SIGTERM."""
        import threading
        if threading.current_thread() is not threading.main_thread():
            return

        try:
            def handle_signal(sig, frame):
                logger.warning("Received termination signal (SIGINT/SIGTERM). Gracefully pausing pipeline...")
                self.interrupted = True
                if hasattr(self, "state"):
                    self.state["status"] = "paused"
                    self.state["updated_at"] = datetime.now(timezone.utc).isoformat()
                    self._persist_state()
                logger.info("Pipeline state saved. Exiting cleanly. You can resume anytime.")
                sys.exit(0)

            signal.signal(signal.SIGINT, handle_signal)
            if hasattr(signal, "SIGTERM"):
                signal.signal(signal.SIGTERM, handle_signal)
        except Exception:
            pass

    def _generate_slug(self, text: str) -> str:
        """Converts prompt or title to a safe filesystem slug."""
        return generate_slug(text)

    def _initialize_new_story(self, prompt: str, story_id: Optional[str] = None, parent_story_id: Optional[str] = None):
        """Initializes a new story run and directory hierarchy."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        slug = self._generate_slug(prompt)
        self.story_id = story_id or f"{timestamp}_{slug}"
        self.story_slug = slug
        self.parent_story_id = parent_story_id
        
        # Dedicated archive folder: ./archive/{timestamp}_{story_slug}/
        self.archive_dir = config.ARCHIVE_DIR / self.story_id
        self.archive_dir.mkdir(parents=True, exist_ok=True)
        self.state_path = self.archive_dir / "pipeline_state.json"

        self.state = create_initial_state(
            prompt=prompt,
            story_id=self.story_id,
            story_slug=self.story_slug,
            archive_dir=self.archive_dir,
            parent_story_id=parent_story_id
        )
        self._persist_state()
        self._update_global_current_run()

    def _load_state(self, path: Path) -> Dict[str, Any]:
        """Loads state JSON from disk."""
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _persist_state(self):
        """Writes state atomically to disk using a temporary file and triggers cloud sync."""
        self.state["updated_at"] = datetime.now(timezone.utc).isoformat()
        temp_path = self.state_path.with_suffix(".tmp")
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(self.state, f, indent=2, ensure_ascii=False)
        
        # Windows-resilient atomic replace with retry
        for attempt in range(5):
            try:
                temp_path.replace(self.state_path)
                break
            except (PermissionError, OSError):
                if attempt == 4:
                    try:
                        shutil.copyfile(temp_path, self.state_path)
                        temp_path.unlink(missing_ok=True)
                    except Exception:
                        pass
                else:
                    time.sleep(0.05)
        self._update_global_current_run()
        self._sync_to_cloud()

    def _rehydrate_media_file(
        self,
        file_path: Optional[str],
        file_url: Optional[str],
        default_subfolder: str
    ) -> Optional[str]:
        """
        Downloads a missing media file from GCS back to the local archive directory.
        Returns the resolved local path as a string if present or successfully rehydrated,
        or None if it could not be resolved/downloaded.
        """
        if not file_url or not self._is_gcs_url(file_url):
            return None

        marker = f"stories/{self.story_id}/"
        rel_str = None
        if marker in file_url:
            rel_str = file_url.split(marker, 1)[1].split("?")[0].strip("/")
        elif file_path:
            filename = Path(file_path).name
            rel_str = f"{default_subfolder}/{filename}"

        if not rel_str:
            return None

        # Always use forward slashes for GCS blob names
        clean_rel = rel_str.replace("\\", "/")
        blob_name = f"stories/{self.story_id}/{clean_rel}"
        local_file = self.archive_dir / Path(clean_rel)

        if not local_file.exists() or local_file.stat().st_size == 0:
            try:
                from services.gcs_storage import download_file_from_gcs
                if download_file_from_gcs(blob_name, str(local_file)):
                    logger.info(f"[StateManager] Rehydrated media from GCS: {blob_name} -> {local_file}")
                    return str(local_file)
                else:
                    logger.warning(f"[StateManager] Failed to rehydrate media from GCS: {blob_name}")
                    return None
            except Exception as e:
                logger.warning(f"[StateManager] Error rehydrating {blob_name}: {e}")
                return None

        return str(local_file)

    def _rehydrate_media_from_gcs(self) -> None:
        """Download missing media files from GCS to local archive directory."""
        try:
            from services.gcs_storage import is_gcs_configured
        except ImportError:
            logger.warning("[StateManager] Could not import GCS storage module for media rehydration")
            return

        if not is_gcs_configured():
            return

        state_modified = False

        # 0. Phase 2: Character reference portraits
        p2_chars = self.state.get("phases", {}).get("phase_2_characters", {}).get("data", {}).get("characters", [])
        if isinstance(p2_chars, list):
            for char in p2_chars:
                if isinstance(char, dict):
                    c_name = char.get("name", "character").strip()
                    safe_name = re.sub(r'[^\w\-]', '_', c_name).strip()
                    target_file = str(self.characters_dir / f"{safe_name}.png")
                    rehydrated = self._rehydrate_media_file(
                        char.get("image_path") or target_file,
                        char.get("image_url"),
                        default_subfolder="characters"
                    )
                    if rehydrated and char.get("image_path") != rehydrated:
                        char["image_path"] = rehydrated
                        state_modified = True

        # 1. Phase 3: Images
        p3 = self.state.get("phases", {}).get("phase_3_images", {})
        for item in p3.get("items", []):
            if isinstance(item, dict):
                rehydrated = self._rehydrate_media_file(
                    item.get("image_path"),
                    item.get("image_url"),
                    default_subfolder="images"
                )
                if rehydrated and item.get("image_path") != rehydrated:
                    item["image_path"] = rehydrated
                    state_modified = True

        # 2. Phase 4: Animation prompts / video clips
        p4 = self.state.get("phases", {}).get("phase_4_animation_prompts", {})
        for item in p4.get("items", []):
            if isinstance(item, dict):
                rehydrated = self._rehydrate_media_file(
                    item.get("video_path"),
                    item.get("video_url"),
                    default_subfolder="clips"
                )
                if rehydrated and item.get("video_path") != rehydrated:
                    item["video_path"] = rehydrated
                    state_modified = True

        # 3. Phase 5: Video generation items and clips
        p5 = self.state.get("phases", {}).get("phase_5_video_generation", {})
        for item in p5.get("items", []):
            if isinstance(item, dict):
                rehydrated = self._rehydrate_media_file(
                    item.get("video_path"),
                    item.get("video_url"),
                    default_subfolder="clips"
                )
                if rehydrated and item.get("video_path") != rehydrated:
                    item["video_path"] = rehydrated
                    state_modified = True
        if "items" in p5:
            p5["clips"] = p5.get("items", [])

        # 4. Assembly masters
        assembly = self.state.get("phases", {}).get("assembly", {})
        assembly_fields = [
            ("final_video_path", "final_video_url"),
            ("captioned_video_path", "captioned_video_url"),
            ("merged_video_path", "merged_video_url")
        ]
        for path_key, url_key in assembly_fields:
            rehydrated = self._rehydrate_media_file(
                assembly.get(path_key),
                assembly.get(url_key),
                default_subfolder="final"
            )
            if rehydrated and assembly.get(path_key) != rehydrated:
                assembly[path_key] = rehydrated
                state_modified = True

        if state_modified:
            self._persist_state()

    def _is_gcs_url(self, url: Optional[str]) -> bool:
        """Check if a URL points to Google Cloud Storage."""
        if not url or not isinstance(url, str):
            return False
        gcs_patterns = [
            "https://storage.googleapis.com/",
            "http://storage.googleapis.com/",
            "https://www.storage.googleapis.com/",
            "http://www.storage.googleapis.com/",
        ]
        public_base = getattr(config, "GCS_PUBLIC_BASE_URL", None)
        if public_base:
            gcs_patterns.append(str(public_base).rstrip("/"))

        for pattern in gcs_patterns:
            if url.startswith(pattern):
                return True
        return False

    def _sync_to_cloud(self):
        """Asynchronously syncs current story state to Supabase in a background thread."""
        try:
            from services.supabase_sync import sync_story_to_supabase, is_supabase_configured
            if is_supabase_configured():
                import threading
                import copy
                snapshot = copy.deepcopy(self.state)
                t = threading.Thread(target=sync_story_to_supabase, args=(snapshot,), daemon=True)
                t.start()
        except Exception as e:
            logger.debug(f"[StateManager] Cloud sync trigger notice: {e}")

    def _upload_media(self, local_path: Optional[str], subfolder: str) -> Optional[str]:
        """Uploads a local media asset to Google Cloud Storage if configured."""
        if not local_path:
            return None
        try:
            from services.gcs_storage import upload_file_to_gcs, is_gcs_configured
            if is_gcs_configured():
                return upload_file_to_gcs(local_path, story_id=self.story_id, subfolder=subfolder)
        except Exception as e:
            logger.debug(f"[StateManager] GCS media upload notice: {e}")
        return None

    def _local_media_url(self, local_path: Optional[str], subfolder: str) -> Optional[str]:
        """Builds a /media/{archive_folder}/... URL that the local media route can serve."""
        if not local_path:
            return None
        folder = None
        if getattr(self, "archive_dir", None):
            folder = Path(self.archive_dir).name
        folder = folder or self.story_id or self.story_slug
        if not folder:
            return None
        return f"/media/{folder}/{subfolder}/{Path(local_path).name}"

    def _update_global_current_run(self):
        """Updates the global pointer in state/current_run.json."""
        try:
            config.STATE_DIR.mkdir(parents=True, exist_ok=True)
            temp_global = config.CURRENT_STATE_FILE.with_suffix(".tmp")
            with open(temp_global, "w", encoding="utf-8") as f:
                json.dump({
                    "active_story_id": self.state["story_id"],
                    "state_path": str(self.state_path),
                    "status": self.state["status"],
                    "manual_approval_required": self.state.get("manual_approval_required", False),
                    "current_phase": self.state["current_phase"],
                    "updated_at": self.state["updated_at"]
                }, f, indent=2)
            temp_global.replace(config.CURRENT_STATE_FILE)
        except Exception as e:
            logger.debug(f"Failed to update global current_run.json: {e}")

    # =========================================================================
    # Phase & Item Completion Queries
    # =========================================================================

    def is_phase_completed(self, phase_name: str) -> bool:
        """Returns True if the entire phase has been marked completed."""
        phase = self.state["phases"].get(phase_name, {})
        if phase.get("status") != "completed":
            return False
        # For Phase 4: ensure all scene video clips are actually completed on disk
        if phase_name == "phase_4_animation_prompts":
            script_data = self.get_phase_data("phase_1_script") or {}
            scenes = script_data.get("scenes", [])
            if scenes:
                return all(self.is_scene_video_completed(s.get("scene_id", i + 1)) for i, s in enumerate(scenes))
        return True

    def get_phase_data(self, phase_name: str) -> Any:
        """Retrieves output data for a completed phase."""
        phase = self.state["phases"].get(phase_name, {})
        return phase.get("data")

    def get_phase_items(self, phase_name: str) -> List[Dict[str, Any]]:
        """Retrieves items array for list-based phases (images, motion, video)."""
        phase = self.state["phases"].get(phase_name, {})
        return phase.get("items", [])

    def is_scene_image_completed(self, scene_id: int) -> bool:
        """Checks if keyframe image for a scene ID is already generated and valid on disk."""
        items = self.get_phase_items("phase_3_images")
        for item in items:
            if item.get("scene_id") == scene_id and item.get("status") == "completed":
                img_path = item.get("image_path")
                if img_path and Path(img_path).exists() and os.path.getsize(img_path) > 0:
                    return True
        return False

    def is_scene_video_completed(self, scene_id: int) -> bool:
        """Checks if video clip for a scene ID is already generated and valid on disk."""
        items = self.get_phase_items("phase_5_video_generation")
        for item in items:
            if item.get("scene_id") == scene_id and item.get("status") == "completed":
                vid_path = item.get("video_path")
                if vid_path and Path(vid_path).exists() and os.path.getsize(vid_path) > 1024:
                    return True
        cand = self.clips_dir / f"scene_{scene_id:02d}.mp4"
        if cand.exists() and cand.stat().st_size > 1024:
            return True
        return False

    # =========================================================================
    # Phase & Item Update Methods
    # =========================================================================

    def set_current_phase(self, phase_name: str):
        self.state["current_phase"] = phase_name
        self.state["phases"][phase_name]["status"] = "in_progress"
        self.state["checkpoint"] = {"phase": phase_name, "item": None}
        self._persist_state()

    def set_manual_approval(self, required: bool):
        self.state["manual_approval_required"] = required
        self._persist_state()

    def is_cancelled(self) -> bool:
        """Returns True if cancellation has been requested via memory flag, disk marker, or state."""
        if getattr(self, "interrupted", False):
            return True
        from core.cancellation import CancellationManager
        if CancellationManager.is_cancelled(self.story_id):
            return True
        if hasattr(self, "archive_dir"):
            cancelled_marker = self.archive_dir / ".cancelled"
            if cancelled_marker.exists():
                return True
        if hasattr(self, "state") and isinstance(self.state, dict):
            status = self.state.get("status")
            if status in ("cancelled", "paused"):
                return True
        return False

    def cancel(self):
        """Cancels generation, sets in-memory flag, writes .cancelled marker, and updates state."""
        from core.cancellation import CancellationManager
        CancellationManager.cancel_story(self.story_id)
        if hasattr(self, "state") and isinstance(self.state, dict):
            self.state["status"] = "cancelled"
            self.state["paused"] = True
            current_phase = self.state.get("current_phase")
            if current_phase and current_phase in self.state.get("phases", {}):
                phase_data = self.state["phases"][current_phase]
                if phase_data.get("status") == "in_progress":
                    phase_data["status"] = "cancelled"
            self._persist_state()
        if hasattr(self, "archive_dir"):
            try:
                (self.archive_dir / ".cancelled").write_text(datetime.now(timezone.utc).isoformat(), encoding="utf-8")
            except Exception:
                pass
        logger.info(f"[StateManager] Cancelled story generation for '{self.story_id}'.")

    def pause(self):
        self.cancel()

    def resume(self):
        from core.cancellation import CancellationManager
        CancellationManager.clear_cancellation(self.story_id)
        if hasattr(self, "archive_dir"):
            cancelled_marker = self.archive_dir / ".cancelled"
            if cancelled_marker.exists():
                try:
                    cancelled_marker.unlink()
                except Exception:
                    pass
        if hasattr(self, "state") and isinstance(self.state, dict):
            if self.state.get("status") == "completed":
                return
            self.state["status"] = "in_progress"
            self.state["paused"] = False
            current_phase = self.state.get("current_phase")
            if current_phase and current_phase in self.state.get("phases", {}):
                phase_data = self.state["phases"][current_phase]
                if phase_data.get("status") == "cancelled":
                    phase_data["status"] = "in_progress"
            self._persist_state()
        logger.info(f"[StateManager] Resumed story generation for '{self.story_id}'.")

    def set_checkpoint(self, phase_name: str, item: Optional[Any] = None):
        self.state["checkpoint"] = {"phase": phase_name, "item": item}
        self._persist_state()

    def complete_phase_1(self, script_data: Dict[str, Any]):
        """Records Phase 1 script completion, creating per-scene folders and storing scene scripts."""
        self.state["phases"]["phase_1_script"]["status"] = "completed"
        self.state["phases"]["phase_1_script"]["completed_at"] = datetime.now(timezone.utc).isoformat()
        self.state["phases"]["phase_1_script"]["data"] = script_data
        
        # 1. Write story-wide script JSON and human-readable Markdown to /scripts
        script_json_file = self.scripts_dir / "script.json"
        with open(script_json_file, "w", encoding="utf-8") as f:
            json.dump(script_data, f, indent=2, ensure_ascii=False)
            
        script_md_file = self.scripts_dir / "script.md"
        with open(script_md_file, "w", encoding="utf-8") as f:
            f.write(f"# {script_data.get('title', 'AI Video Story')}\n\n")
            f.write(f"**Logline:** {script_data.get('logline', '')}\n\n")
            if script_data.get("hook_3s"):
                f.write(f"**3-Second Hook:** {script_data.get('hook_3s')}\n\n")
            f.write(f"**Genre:** {script_data.get('genre', '')}\n\n---\n\n")
            for scene in script_data.get("scenes", []):
                scene_id = scene.get("scene_id", 1)
                shot = scene.get("shot_type", "Scene")
                setting = f" | {scene.get('setting')}" if scene.get("setting") else ""
                f.write(f"### Scene {scene_id}: {shot}{setting}\n")
                if scene.get("timestamp"):
                    f.write(f"- **Timestamp:** `{scene.get('timestamp')}`\n")
                visual = scene.get("visual_description") or scene.get("visual_action", "")
                if visual:
                    f.write(f"- **Visual Action:** {visual}\n")
                if scene.get("dialogue"):
                    dialogue = scene.get("dialogue")
                    if isinstance(dialogue, list):
                        for d in dialogue:
                            if isinstance(d, dict):
                                f.write(f"- **Dialogue ({d.get('speaker', 'Character')} - *{d.get('accent_and_tone', '')}*):** \"{d.get('exact_speech', '')}\"\n")
                            else:
                                f.write(f"- **Dialogue:** \"{d}\"\n")
                    else:
                        f.write(f"- **Dialogue:** \"{dialogue}\"\n")
                if scene.get("narration"):
                    f.write(f"- **Narration:** *\"{scene.get('narration')}\"*\n")
                audio = scene.get("sfx_cue") or scene.get("audio_cues")
                if audio:
                    f.write(f"- **Audio / SFX:** {audio}\n")
                f.write(f"- **Duration:** {scene.get('duration_seconds', 5)}s\n\n")

        # 2. File storage for each scene: create folder for each scene and store scene script
        scenes = script_data.get("scenes", [])
        for i, scene in enumerate(scenes):
            scene_id = scene.get("scene_id", i + 1)
            scene_dir = self.get_scene_dir(scene_id)
            
            # Write individual scene script.json
            scene_json_file = scene_dir / "script.json"
            with open(scene_json_file, "w", encoding="utf-8") as f_sc:
                json.dump(scene, f_sc, indent=2, ensure_ascii=False)
            
            # Write individual scene script.md
            scene_md_file = scene_dir / "script.md"
            with open(scene_md_file, "w", encoding="utf-8") as f_md:
                f_md.write(f"## Scene {scene_id}: {scene.get('shot_type', 'Scene')}\n\n")
                if scene.get("setting"):
                    f_md.write(f"**Setting:** {scene.get('setting')}\n\n")
                if scene.get("characters"):
                    f_md.write(f"**Characters:** {', '.join(scene.get('characters', []))}\n\n")
                visual = scene.get("visual_description") or scene.get("visual_action", "")
                if visual:
                    f_md.write(f"**Visual Action:** {visual}\n\n")
                if scene.get("dialogue"):
                    f_md.write(f"**Dialogue:** {scene.get('dialogue')}\n\n")
                if scene.get("voiceover") or scene.get("narration"):
                    f_md.write(f"**Voiceover:** {scene.get('voiceover') or scene.get('narration')}\n\n")

            # Mirror scene script to GCS in background
            try:
                self._upload_media(str(scene_json_file), subfolder=f"scenes/scene_{scene_id:02d}")
            except Exception as up_err:
                logger.debug(f"[StateManager] Scene {scene_id} script GCS upload notice: {up_err}")

        logger.info(f"[StateManager] Created {len(scenes)} scene folders in {self.scenes_dir} with discrete scripts.")
        self.state["checkpoint"] = {"phase": "phase_1_script", "item": None}
        self._persist_state()

    def set_character_generating(self, character_name: str):
        """Records which character is actively being rendered via Imagen in Phase 2."""
        p2 = self.state["phases"].setdefault("phase_2_characters", {})
        p2["current_character"] = character_name
        if p2.get("status") != "completed":
            p2["status"] = "in_progress"
        self._persist_state()

    def update_character_image(
        self,
        character_name: str,
        image_path: str,
        char_data: Optional[Dict[str, Any]] = None,
        status: str = "completed"
    ):
        """Records generation status and image URL for an individual character portrait as soon as Imagen finishes."""
        p2 = self.state["phases"].setdefault("phase_2_characters", {})
        if p2.get("current_character") == character_name:
            p2["current_character"] = None

        # Ensure data and characters structure exists
        if not isinstance(p2.get("data"), dict):
            p2["data"] = {}
        data = p2["data"]
        if not isinstance(data.get("characters"), list):
            data["characters"] = []
        characters = data["characters"]

        # Upload to GCS if configured
        cloud_url = None
        if image_path and os.path.exists(image_path) and os.path.getsize(image_path) > 0:
            cloud_url = self._upload_media(str(image_path), subfolder="characters")
            media_url = cloud_url or f"/media/{self.story_id}/characters/{Path(image_path).name}"
        else:
            media_url = None

        # Find character in existing list or append
        target_char = next((c for c in characters if isinstance(c, dict) and c.get("name", "").strip().lower() == character_name.strip().lower()), None)
        if target_char:
            if char_data:
                for k, v in char_data.items():
                    if k not in ["image_url", "image_path"] or v:
                        target_char[k] = v
            target_char["image_path"] = str(image_path)
            if media_url:
                target_char["image_url"] = media_url
            target_char["status"] = status
        else:
            new_char = dict(char_data or {})
            new_char["name"] = character_name
            new_char["image_path"] = str(image_path)
            if media_url:
                new_char["image_url"] = media_url
            new_char["status"] = status
            characters.append(new_char)

        # Persist characters.json
        try:
            char_json_file = self.scripts_dir / "characters.json"
            with open(char_json_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            char_dir_json = self.characters_dir / "characters.json"
            with open(char_dir_json, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.debug(f"[StateManager] Error writing characters.json: {e}")

        self._persist_state()

    def complete_phase_2(self, characters_data: Dict[str, Any]):
        """Records Phase 2 character profiles completion, uploading portraits to GCS."""
        self.state["phases"]["phase_2_characters"]["status"] = "completed"
        self.state["phases"]["phase_2_characters"]["current_character"] = None
        self.state["phases"]["phase_2_characters"]["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        # Ensure character images are uploaded to GCS and image_urls assigned
        chars_list = characters_data.get("characters", [])
        for char in chars_list:
            if isinstance(char, dict):
                char_name = char.get("name", "character").strip()
                safe_name = re.sub(r'[^\w\-]', '_', char_name).strip()
                char_img = self.characters_dir / f"{char_name}.png"
                if not char_img.exists():
                    char_img = self.characters_dir / f"{safe_name}.png"

                if char_img.exists() and os.path.getsize(char_img) > 0:
                    cloud_url = self._upload_media(str(char_img), subfolder="characters")
                    media_url = cloud_url or f"/media/{self.story_id}/characters/{char_img.name}"
                    char["image_url"] = media_url
                    char["image_path"] = str(char_img)

        self.state["phases"]["phase_2_characters"]["data"] = characters_data

        char_json_file = self.scripts_dir / "characters.json"
        with open(char_json_file, "w", encoding="utf-8") as f:
            json.dump(characters_data, f, indent=2, ensure_ascii=False)

        # Also store characters.json directly in characters_dir
        char_dir_json = self.characters_dir / "characters.json"
        with open(char_dir_json, "w", encoding="utf-8") as f:
            json.dump(characters_data, f, indent=2, ensure_ascii=False)

        try:
            self._upload_media(str(char_dir_json), subfolder="characters")
        except Exception:
            pass

        self.set_current_phase("phase_3_images")

    def update_scene_image(
        self,
        scene_id: int,
        prompt: str,
        image_path: str,
        status: str = "completed",
        error_message: Optional[str] = None,
        characters: Optional[List[str]] = None,
        character_references: Optional[List[Dict[str, Any]]] = None,
        hook_3s: Optional[str] = None
    ):
        cand_p = Path(image_path) if image_path else (self.images_dir / f"scene_{scene_id:02d}_keyframe.png")
        has_file = cand_p.exists() and cand_p.stat().st_size > 1024
        cloud_url = self._upload_media(str(cand_p), subfolder="images") if status == "completed" and has_file else None
        media_url = cloud_url or (f"/media/{self.story_id}/images/scene_{scene_id:02d}_keyframe.png" if status == "completed" and has_file else None)
        p3 = self.state["phases"].setdefault("phase_3_images", {})
        if status == "generating":
            p3["current_scene"] = scene_id
            if p3.get("status") != "completed":
                p3["status"] = "in_progress"
        elif p3.get("current_scene") == scene_id:
            p3["current_scene"] = None

        if not isinstance(p3.get("items"), list):
            p3["items"] = []
        items = p3["items"]
        existing = next((i for i in items if i["scene_id"] == scene_id), None)
        if existing:
            if prompt:
                existing["prompt"] = prompt
            if image_path:
                existing["image_path"] = image_path
            if media_url:
                existing["image_url"] = media_url
            if characters is not None:
                existing["characters"] = characters
            if character_references is not None:
                existing["character_references"] = character_references
            if hook_3s is not None:
                existing["hook_3s"] = hook_3s
            existing["status"] = status
            existing["error"] = error_message
            if status == "completed":
                existing["completed_at"] = datetime.now(timezone.utc).isoformat()
        else:
            items.append({
                "scene_id": scene_id,
                "prompt": prompt,
                "image_path": image_path,
                "image_url": media_url,
                "characters": characters or [],
                "character_references": character_references or [],
                "hook_3s": hook_3s,
                "status": status,
                "error": error_message,
                "completed_at": datetime.now(timezone.utc).isoformat() if status == "completed" else None
            })
        self._persist_state()

    def complete_phase_3(self):
        """Marks Phase 3 as completely finished."""
        self.state["phases"]["phase_3_images"]["status"] = "completed"
        self.state["phases"]["phase_3_images"]["current_scene"] = None
        self.state["phases"]["phase_3_images"]["completed_at"] = datetime.now(timezone.utc).isoformat()
        self.set_current_phase("phase_4_animation_prompts")

    def complete_phase_4(self, motion_items: List[Dict[str, Any]]):
        """Records Phase 4 animation prompts completion."""
        # Cross-populate video URLs from Phase 5 clips if clips were rendered
        p5_items = self.state["phases"]["phase_5_video_generation"].get("items", [])
        p5_map = {c.get("scene_id"): c for c in p5_items if isinstance(c, dict)}
        for m in motion_items:
            sid = m.get("scene_id")
            matching_clip = p5_map.get(sid)
            cand_p = self.clips_dir / f"scene_{sid:02d}.mp4"
            if matching_clip and matching_clip.get("video_url") and cand_p.exists() and cand_p.stat().st_size > 1024:
                m["video_url"] = matching_clip["video_url"]
                m["status"] = "completed"
            elif cand_p.exists() and cand_p.stat().st_size > 1024:
                m["video_url"] = f"/media/{self.story_id}/clips/scene_{sid:02d}.mp4"
                m["status"] = "completed"
            else:
                m["video_url"] = None

        self.state["phases"]["phase_4_animation_prompts"]["status"] = "completed"
        self.state["phases"]["phase_4_animation_prompts"]["current_scene"] = None
        self.state["phases"]["phase_4_animation_prompts"]["completed_at"] = datetime.now(timezone.utc).isoformat()
        self.state["phases"]["phase_4_animation_prompts"]["items"] = motion_items

        motion_json_file = self.scripts_dir / "motion_prompts.json"
        with open(motion_json_file, "w", encoding="utf-8") as f:
            json.dump(motion_items, f, indent=2, ensure_ascii=False)

        self.set_current_phase("phase_5_video_generation")

    def update_scene_video(self, scene_id: int, video_path: str, job_id: Optional[str] = None, status: str = "completed", error_message: Optional[str] = None, duration: Optional[float] = None):
        """Records generation status for an individual scene video clip, uploading to GCS if configured."""
        cloud_url = self._upload_media(video_path, subfolder="clips") if status == "completed" and video_path else None
        media_url = cloud_url or (f"/media/{self.story_id}/clips/scene_{scene_id:02d}.mp4" if status == "completed" and video_path else None)
        p4 = self.state["phases"].setdefault("phase_4_animation_prompts", {})
        p5 = self.state["phases"].setdefault("phase_5_video_generation", {})

        if status == "generating":
            p4["current_scene"] = scene_id
            p5["current_scene"] = scene_id
        elif p4.get("current_scene") == scene_id:
            p4["current_scene"] = None
            p5["current_scene"] = None

        # Update Phase 4 animation prompts items if matching scene exists
        p4_items = p4.get("items", [])
        p4_match = next((m for m in p4_items if m.get("scene_id") == scene_id), None)
        if p4_match:
            p4_match["status"] = status
            if media_url:
                p4_match["video_url"] = media_url
            if duration is not None:
                p4_match["duration"] = duration

        if not isinstance(p5.get("items"), list):
            p5["items"] = []
        items = p5["items"]
        existing = next((i for i in items if i["scene_id"] == scene_id), None)
        if existing:
            existing["job_id"] = job_id or existing.get("job_id")
            if video_path:
                existing["video_path"] = video_path
            if media_url:
                existing["video_url"] = media_url
            if duration is not None:
                existing["duration"] = duration
            existing["status"] = status
            existing["error"] = error_message
            if status == "completed":
                existing["completed_at"] = datetime.now(timezone.utc).isoformat()
        else:
            new_item = {
                "scene_id": scene_id,
                "job_id": job_id,
                "video_path": video_path,
                "video_url": media_url,
                "status": status,
                "error": error_message,
                "completed_at": datetime.now(timezone.utc).isoformat() if status == "completed" else None
            }
            if duration is not None:
                new_item["duration"] = duration
            items.append(new_item)
        # Keep clips array in sync
        p5["clips"] = items
        self._persist_state()

    def complete_phase_5(self):
        """Marks Phase 5 video clip generation as completely finished."""
        self.state["phases"]["phase_5_video_generation"]["status"] = "completed"
        self.state["phases"]["phase_5_video_generation"]["completed_at"] = datetime.now(timezone.utc).isoformat()
        self.set_current_phase("assembly")

    def complete_assembly(
        self,
        clips_manifest_path: str,
        merged_video_path: str,
        final_video_path: str,
        voiceover_path: Optional[str] = None,
        subtitles_path: Optional[str] = None,
        captioned_video_path: Optional[str] = None
    ):
        """Records final assembly and finishes the story run, uploading masters to GCS."""
        cloud_final = self._upload_media(final_video_path, subfolder="final")
        cloud_captioned = self._upload_media(captioned_video_path, subfolder="final") if captioned_video_path else None

        local_final_url = self._local_media_url(final_video_path, "final")
        local_captioned_url = self._local_media_url(captioned_video_path, "final")
        resolved_final_url = cloud_final or local_final_url
        resolved_captioned_url = cloud_captioned or local_captioned_url or resolved_final_url

        self.state["phases"]["assembly"]["status"] = "completed"
        self.state["phases"]["assembly"]["completed_at"] = datetime.now(timezone.utc).isoformat()
        self.state["phases"]["assembly"]["clips_manifest_path"] = clips_manifest_path
        self.state["phases"]["assembly"]["merged_video_path"] = merged_video_path
        self.state["phases"]["assembly"]["voiceover_path"] = voiceover_path
        self.state["phases"]["assembly"]["final_video_path"] = final_video_path
        self.state["phases"]["assembly"]["final_video_url"] = resolved_final_url
        self.state["phases"]["assembly"]["subtitles_path"] = subtitles_path
        self.state["phases"]["assembly"]["captioned_video_path"] = captioned_video_path
        self.state["phases"]["assembly"]["captioned_video_url"] = resolved_captioned_url

        self.state["final_video_url"] = resolved_final_url
        if resolved_captioned_url:
            self.state["captioned_video_url"] = resolved_captioned_url

        # Mirror URLs onto phase 5 so the studio player does not depend on GCS-only assembly fields.
        p5 = self.state["phases"].setdefault("phase_5_video_generation", {})
        p5_assembly = p5.get("assembly") if isinstance(p5.get("assembly"), dict) else {}
        p5_assembly.update({
            "status": "completed",
            "clips_manifest_path": clips_manifest_path,
            "merged_video_path": merged_video_path,
            "final_video_path": final_video_path,
            "final_video_url": resolved_final_url,
            "subtitles_path": subtitles_path,
            "captioned_video_path": captioned_video_path,
            "captioned_video_url": resolved_captioned_url,
        })
        p5["assembly"] = p5_assembly
        p5["final_video_url"] = resolved_final_url
        p5["captioned_video_url"] = resolved_captioned_url
        p5["error"] = None

        self.state["status"] = "completed"
        self.state["current_phase"] = "completed"
        self._persist_state()

    def record_error(self, error: Exception):
        """Records failure error message, updates current phase status to error, and increments retry count."""
        err_msg = str(error)
        self.state["retry_count"] += 1
        self.state["last_error"] = err_msg
        self.state["error"] = err_msg
        self.state["status"] = "error"
        current = self.state.get("current_phase")
        if current and current in self.state.get("phases", {}):
            self.state["phases"][current]["error"] = err_msg
            self.state["phases"][current]["status"] = "error"
        self._persist_state()

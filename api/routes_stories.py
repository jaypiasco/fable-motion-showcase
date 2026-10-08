"""
Story Management API Routes.
Endpoints for listing archived stories and retrieving detailed 5-phase story breakdowns.
"""

from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel

from config import config
from core.logger import logger
from api.enricher import get_story_summary, enrich_story_details, enrich_story_state_dict

router = APIRouter(prefix="/api/stories", tags=["Stories"])


class ConceptsRequest(BaseModel):
    prompt: str
    archetypes: Optional[List[Dict[str, Any]]] = None


class RegenerateConceptsRequest(BaseModel):
    prompt: Optional[str] = None
    archetypes: Optional[List[Dict[str, Any]]] = None


class PhaseRegenerateRequest(BaseModel):
    instructions: Optional[str] = None
    force: Optional[bool] = True


class ConceptSelection(BaseModel):
    concept: Dict[str, Any]
    max_scenes: Optional[int] = None


def _find_story_dir(story_id: str) -> Path:
    """Finds story directory by exact name, timestamp prefix, or bidirectional substring match."""
    story_dir = config.ARCHIVE_DIR / story_id
    if story_dir.exists() and story_dir.is_dir():
        return story_dir
    if config.ARCHIVE_DIR.exists():
        # 1. Exact or bidirectional substring match
        for d in config.ARCHIVE_DIR.iterdir():
            if d.is_dir() and (d.name == story_id or d.name in story_id or story_id in d.name):
                return d
        # 2. Timestamp prefix match (e.g. 20260914_004542)
        parts = story_id.split("_")
        if len(parts) >= 2 and len(parts[0]) == 8 and len(parts[1]) == 6:
            ts_prefix = f"{parts[0]}_{parts[1]}"
            for d in config.ARCHIVE_DIR.iterdir():
                if d.is_dir() and d.name.startswith(ts_prefix):
                    return d
    raise HTTPException(status_code=404, detail=f"Story '{story_id}' not found.")


def materialize_or_find_story_dir(story_id: str) -> Path:
    """
    Finds story directory, restoring from Supabase if not present on disk.
    First attempts to find the directory locally; if missing and Supabase is
    configured, instantiates StateManager to hydrate state from cloud storage.
    Returns the archive directory Path.
    Raises HTTPException(404) if story cannot be found locally or in cloud DB.
    """
    try:
        return _find_story_dir(story_id)
    except HTTPException as e:
        # Story not on disk; verify Supabase is configured and story exists
        from services.supabase_sync import is_supabase_configured, fetch_story_by_id_from_supabase
        if not is_supabase_configured():
            raise e

        remote = fetch_story_by_id_from_supabase(story_id)
        if not remote or not remote.get("state") or not isinstance(remote.get("state"), dict):
            raise e

        from core.state_manager import StateManager
        mgr = StateManager(story_id=story_id)  # triggers Supabase restore path internally
        archive_dir = mgr.archive_dir
        is_restored = getattr(mgr, "is_restored_from_cloud", False) or (archive_dir.exists() and (archive_dir / "pipeline_state.json").exists())
        mgr.close()
        if is_restored and archive_dir.exists():
            return archive_dir
        # Re-raise the original 404 if restore didn't produce a directory
        raise e


@router.post("/concepts")
def generate_concepts(req: ConceptsRequest):
    """Create a story run and persist three selectable concepts with dynamic archetype variation."""
    from core.state_manager import StateManager
    from services.ai_client import AIClient
    state_mgr = StateManager(prompt=req.prompt)
    try:
        result = AIClient().generate_concepts(req.prompt, archetypes=req.archetypes)
        concepts = result.get("concepts", result.get("ideas", []))
        if not concepts:
            raise ValueError("Concept generation returned no concepts.")
        if len(concepts) > 3:
            concepts = concepts[:3]
        state_mgr.state["concepts"] = concepts
        cta = result.get("call_to_action", "Choose a concept (1, 2, or 3) or provide custom modifications to proceed to Phase 2.")
        state_mgr.state["call_to_action"] = cta
        state_mgr._persist_state()
        return {"story_id": state_mgr.story_id, "concepts": concepts, "call_to_action": cta}
    except Exception as exc:
        state_mgr.record_error(exc)
        raise HTTPException(status_code=502, detail=f"Unable to generate concepts: {exc}")
    finally:
        state_mgr.close()


@router.post("/{story_id}/regenerate-concepts")
def regenerate_concepts(story_id: str, req: Optional[RegenerateConceptsRequest] = None):
    """Regenerates 3 fresh concepts for an existing story run, rotating to fresh archetypes."""
    story_dir = materialize_or_find_story_dir(story_id)
    from core.state_manager import StateManager
    from services.ai_client import AIClient

    state_mgr = StateManager(story_id=story_dir.name)
    try:
        prompt = (req.prompt if req and req.prompt else None) or state_mgr.state.get("prompt") or "A captivating cinematic story"
        # Extract previously used archetype IDs so regeneration rotates to different archetypes
        prev_concepts = state_mgr.state.get("concepts") or []
        prev_arch_ids = [
            c.get("story_archetype_id") or c.get("story_id")
            for c in prev_concepts
            if isinstance(c, dict) and (c.get("story_archetype_id") or c.get("story_id"))
        ]
        custom_archetypes = req.archetypes if req else None

        result = AIClient().generate_concepts(
            prompt,
            archetypes=custom_archetypes,
            exclude_archetype_ids=prev_arch_ids,
        )
        concepts = result.get("concepts", result.get("ideas", []))
        if not concepts:
            raise ValueError("Concept generation returned no concepts.")
        if len(concepts) > 3:
            concepts = concepts[:3]
        state_mgr.state["concepts"] = concepts
        cta = result.get("call_to_action", "Choose a concept (1, 2, or 3) or provide custom modifications to proceed to Phase 2.")
        state_mgr.state["call_to_action"] = cta
        state_mgr.state["selected_concept"] = None
        state_mgr._persist_state()
        return {"story_id": state_mgr.story_id, "concepts": concepts, "call_to_action": cta}
    except Exception as exc:
        logger.error(f"[RoutesStories] Failed to regenerate concepts: {exc}")
        state_mgr.record_error(exc)
        raise HTTPException(status_code=502, detail=f"Unable to regenerate concepts: {exc}")
    finally:
        state_mgr.close()


@router.get("", response_model=List[Dict[str, Any]])
def list_stories(include_trashed: bool = Query(True, description="Include trashed/hidden stories in results")):
    """
    Returns list of all stories.
    Pulls from Supabase PostgreSQL first (for Cloud Run persistence), merging with local archive.
    """
    stories_by_id: Dict[str, Dict[str, Any]] = {}

    # 1. Query Supabase for cloud-persisted stories
    try:
        from services.supabase_sync import fetch_stories_from_supabase, is_supabase_configured
        if is_supabase_configured():
            remote = fetch_stories_from_supabase(include_trashed=include_trashed)
            for s in remote:
                sid = s.get("id") or ""
                title = s.get("title") or ""
                if s.get("is_test_run") or sid.startswith("test_") or "_test_" in sid.lower() or title.lower().startswith("test "):
                    continue
                if sid:
                    stories_by_id[sid] = {
                        "story_id": sid,
                        "title": title or "Untitled Story",
                        "logline": s.get("script_data", {}).get("logline", ""),
                        "prompt": s.get("prompt", ""),
                        "status": s.get("status", "completed"),
                        "current_phase": s.get("current_phase", "completed"),
                        "created_at": s.get("created_at"),
                        "updated_at": s.get("updated_at"),
                        "scenes_count": len(s.get("scenes") or []),
                        "thumbnail_url": s.get("thumbnail_url"),
                        "has_final_video": bool(s.get("final_video_url")),
                        "is_trashed": bool(s.get("is_trashed", False)),
                        "storage_provider": s.get("storage_provider", "gcs")
                    }
    except Exception as e:
        logger.debug(f"[RoutesStories] Remote fetch notice: {e}")

    # 2. Merge local archive stories (taking local version if newer or not yet in cloud)
    if config.ARCHIVE_DIR.exists():
        for item in sorted(config.ARCHIVE_DIR.iterdir(), key=lambda d: d.stat().st_mtime if d.is_dir() else 0, reverse=True):
            if item.is_dir():
                summary = get_story_summary(item)
                if summary:
                    if not include_trashed and summary.get("is_trashed"):
                        continue
                    sid = summary.get("story_id") or ""
                    title = summary.get("title") or ""
                    if summary.get("is_test_run") or sid.startswith("test_") or "_test_" in sid.lower() or title.lower().startswith("test "):
                        continue
                    if sid:
                        stories_by_id[sid] = summary

    # Sort all stories descending by updated_at or created_at
    result = list(stories_by_id.values())
    result.sort(key=lambda s: s.get("updated_at") or s.get("created_at") or "", reverse=True)
    return result


@router.get("/{story_id}")
def get_story(story_id: str):
    """
    Returns complete details, phase breakdowns, prompts, and media links for a specific story.
    Checks local archive first; falls back to Supabase if running on ephemeral Cloud Run.
    """
    try:
        story_dir = _find_story_dir(story_id)
        return enrich_story_details(story_dir)
    except HTTPException:
        # If not on local disk (e.g. fresh container on Cloud Run), query Supabase
        try:
            from services.supabase_sync import fetch_story_by_id_from_supabase, is_supabase_configured
            if is_supabase_configured():
                remote_story = fetch_story_by_id_from_supabase(story_id)
                if remote_story:
                    state = remote_story.get("state")
                    if state and isinstance(state, dict):
                        return enrich_story_state_dict(state, remote_story)
                    return remote_story
        except Exception as e:
            logger.debug(f"[RoutesStories] Supabase story lookup notice: {e}")

        raise HTTPException(status_code=404, detail=f"Story '{story_id}' not found locally or in cloud database.")


@router.post("/{story_id}/generate-phase1")
def generate_phase1(story_id: str, background_tasks: BackgroundTasks, max_scenes: Optional[int] = Query(None, ge=1, le=20)):
    """Generate only the Phase 1 plan; later phases remain approval-gated."""
    story_dir = materialize_or_find_story_dir(story_id)
    state_file = story_dir / "pipeline_state.json"
    if not state_file.exists():
        raise HTTPException(status_code=404, detail=f"Story '{story_id}' has no pipeline state.")

    from core.cancellation import CancellationManager, GenerationCancelledError
    CancellationManager.clear_cancellation(story_dir.name)

    def _generate():
        from core.state_manager import StateManager
        from phases.phase1_script import Phase1Script
        from services.ai_client import AIClient

        state_mgr = StateManager(story_id=story_dir.name)
        try:
            state_mgr.resume()
            Phase1Script(state_mgr, AIClient()).execute(max_scenes=max_scenes)
        except GenerationCancelledError as gce:
            logger.info(f"[RoutesStories] Phase 1 generation cancelled: {gce}")
        except Exception as e:
            logger.error(f"[RoutesStories] Error in Phase 1: {e}")
            state_mgr.record_error(e)
        finally:
            state_mgr.close()

    background_tasks.add_task(_generate)
    return {
        "success": True,
        "story_id": story_dir.name,
        "current_phase": "phase_1_script",
        "message": "Phase 1 generation started. Review the plan before approving Phase 2.",
    }


@router.post("/{story_id}/trash")
@router.delete("/{story_id}")
def trash_story(story_id: str):
    """Marks a story as hidden/trashed in both local disk and Supabase."""
    success = False
    story_name = story_id

    # 1. Local disk mark
    try:
        story_dir = materialize_or_find_story_dir(story_id)
        story_name = story_dir.name
        trashed_marker = story_dir / ".trashed"
        trashed_marker.write_text(datetime.now(timezone.utc).isoformat(), encoding="utf-8")
        success = True
    except HTTPException:
        pass

    # 2. Supabase mark
    try:
        from services.supabase_sync import trash_story_in_supabase, is_supabase_configured
        if is_supabase_configured():
            remote_success = trash_story_in_supabase(story_id, trashed=True)
            success = success or remote_success
    except Exception as e:
        logger.debug(f"[RoutesStories] Remote trash notice: {e}")

    if not success:
        raise HTTPException(status_code=404, detail=f"Story '{story_id}' could not be located to trash.")

    return {
        "success": True,
        "story_id": story_name,
        "is_trashed": True,
        "message": f"Story '{story_name}' has been moved to trash (hidden)."
    }


@router.post("/{story_id}/restore")
def restore_story(story_id: str):
    """Restores a previously trashed/hidden story back to active status."""
    success = False
    story_name = story_id

    # 1. Local disk restore
    try:
        story_dir = materialize_or_find_story_dir(story_id)
        story_name = story_dir.name
        trashed_marker = story_dir / ".trashed"
        if trashed_marker.exists():
            trashed_marker.unlink()
        success = True
    except HTTPException:
        pass

    # 2. Supabase restore
    try:
        from services.supabase_sync import trash_story_in_supabase, is_supabase_configured
        if is_supabase_configured():
            remote_success = trash_story_in_supabase(story_id, trashed=False)
            success = success or remote_success
    except Exception as e:
        logger.debug(f"[RoutesStories] Remote restore notice: {e}")

    if not success:
        raise HTTPException(status_code=404, detail=f"Story '{story_id}' could not be located to restore.")

    return {
        "success": True,
        "story_id": story_name,
        "is_trashed": False,
        "message": f"Story '{story_name}' has been restored."
    }


@router.post("/{story_id}/approve")
def approve_story(story_id: str, background_tasks: BackgroundTasks):
    """Approves the current story phase and advances the pipeline to the next phase."""
    if story_id.startswith("demo_"):
        return {
            "success": True,
            "story_id": story_id,
            "message": "Demo story approved."
        }
    story_dir = materialize_or_find_story_dir(story_id)
    state_file = story_dir / "pipeline_state.json"
    if not state_file.exists():
        return {
            "success": True,
            "story_id": story_dir.name,
            "message": "Demo story approved."
        }

    try:
        from core.state_manager import StateManager
        state_mgr = StateManager(story_id=story_dir.name)

        phase_order = [
            "phase_1_script",
            "phase_2_characters",
            "phase_3_images",
            "phase_4_animation_prompts",
            "phase_5_video_generation",
            "completed"
        ]

        current = state_mgr.state.get("current_phase", "phase_1_script")
        cur_idx = phase_order.index(current) if current in phase_order else 0

        # Check if current phase is completed, or if previous phase is completed and current is ready to run
        if state_mgr.is_phase_completed(current):
            next_phase = phase_order[min(cur_idx + 1, len(phase_order) - 1)]
        elif cur_idx > 0 and state_mgr.is_phase_completed(phase_order[cur_idx - 1]):
            # The previous phase already completed (and set current_phase to this next phase).
            # The user is now approving advancing into this phase!
            next_phase = current
        else:
            state_mgr.close()
            raise HTTPException(status_code=409, detail=f"Phase {current} is not complete and cannot be approved.")

        if next_phase != "completed":
            from core.cancellation import CancellationManager
            CancellationManager.clear_cancellation(story_dir.name)
            state_mgr.resume()
            state_mgr.set_current_phase(next_phase)
            state_mgr.state["manual_approval_required"] = False
            state_mgr.state["status"] = "in_progress"
            state_mgr._persist_state()
            state_mgr.close()
            def _run_next():
                from pipeline.story_pipeline import StoryPipeline
                mgr = StateManager(story_id=story_dir.name)
                try:
                    StoryPipeline(mgr).run()
                finally:
                    mgr.close()
            background_tasks.add_task(_run_next)
        else:
            state_mgr.state["current_phase"] = "completed"
            state_mgr.state["status"] = "completed"
            state_mgr._persist_state()

            state_mgr.state["manual_approval_required"] = False
            state_mgr.close()

        return {
            "success": True,
            "story_id": story_dir.name,
            "previous_phase": current,
            "current_phase": next_phase,
            "message": f"Story approved. Advanced to {next_phase}."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve story phase: {e}")


@router.post("/{story_id}/select-concept")
def select_concept(story_id: str, req: ConceptSelection, background_tasks: BackgroundTasks):
    """Persist the selected concept and generate its Phase 1 script."""
    story_dir = materialize_or_find_story_dir(story_id)
    from core.state_manager import StateManager
    state_mgr = StateManager(story_id=story_dir.name)
    concepts = state_mgr.state.get("concepts", [])
    matched_concept = None
    for c in concepts:
        if isinstance(c, dict):
            if (
                (req.concept.get("id") and c.get("id") == req.concept.get("id"))
                or (req.concept.get("title") and c.get("title") == req.concept.get("title"))
                or (req.concept.get("story_archetype_id") and c.get("story_archetype_id") == req.concept.get("story_archetype_id"))
            ):
                matched_concept = c
                break

    if not matched_concept and req.concept not in concepts and concepts:
        if not req.concept.get("title") and not req.concept.get("logline"):
            state_mgr.close()
            raise HTTPException(status_code=400, detail="Selected concept is not one of the generated concepts.")

    chosen = dict(matched_concept or {})
    chosen.update(req.concept)

    from core.cancellation import CancellationManager, GenerationCancelledError
    CancellationManager.clear_cancellation(story_dir.name)

    state_mgr.state["selected_concept"] = chosen
    state_mgr.state["prompt"] = chosen.get("logline") or chosen.get("premise") or chosen.get("title") or str(chosen)
    if req.max_scenes:
        state_mgr.state["max_scenes"] = req.max_scenes
    state_mgr.state["manual_approval_required"] = True
    state_mgr.resume()
    state_mgr.close()

    def _run_phase1():
        from phases.phase1_script import Phase1Script
        from services.ai_client import AIClient
        mgr = StateManager(story_id=story_dir.name)
        try:
            Phase1Script(mgr, AIClient()).execute(max_scenes=req.max_scenes)
        except GenerationCancelledError as gce:
            logger.info(f"[RoutesStories] Concept script execution cancelled: {gce}")
        except Exception as e:
            logger.error(f"[RoutesStories] Error in concept script execution: {e}")
            mgr.record_error(e)
        finally:
            mgr.close()

    background_tasks.add_task(_run_phase1)
    return {"success": True, "story_id": story_dir.name, "selected_concept": req.concept, "current_phase": "phase_1_script"}


@router.get("/{story_id}/character-prompts")
def get_character_prompts(story_id: str):
    """Returns character bibles and style prompts from Phase 1 without generating images."""
    story_dir = materialize_or_find_story_dir(story_id)
    from core.state_manager import StateManager
    from phases.phase2_characters import Phase2Characters
    from services.ai_client import AIClient

    state_mgr = StateManager(story_id=story_dir.name)
    try:
        existing_p2 = state_mgr.get_phase_data("phase_2_characters")
        if existing_p2 and existing_p2.get("characters"):
            return {
                "story_id": story_dir.name,
                "characters": existing_p2["characters"],
                "story_summary": existing_p2.get("story_summary", "")
            }

        phase2 = Phase2Characters(state_mgr, AIClient())
        chars_data = phase2.generate_character_prompts()
        state_mgr.state.setdefault("phases", {}).setdefault("phase_2_characters", {})["data"] = chars_data
        state_mgr._persist_state()
        return {
            "story_id": story_dir.name,
            "characters": chars_data.get("characters", []),
            "story_summary": chars_data.get("story_summary", "")
        }
    except Exception as exc:
        logger.warning(f"[RoutesStories] Could not generate character prompts via AI: {exc}")
        p1_data = state_mgr.get_phase_data("phase_1_script") or {}
        scenes = p1_data.get("scenes", [])
        extracted_names = []
        for s in scenes:
            for c in s.get("characters", []):
                if isinstance(c, str) and c.strip() and c.strip() not in extracted_names:
                    extracted_names.append(c.strip())
        if not extracted_names:
            extracted_names = ["Arthur Bananier", "Elena Vance"]

        gemstone_fallback_map = {
            "obsidian": "Julian Corvus",
            "sapphire": "Elena Vance",
            "emerald": "Marcus Sterling",
            "diamond": "Victoria Chen",
            "gold": "Damian Cross",
            "ruby": "Scarlett Vance",
            "quartz": "Seraphina Reed",
            "crystal": "Aria Sterling",
            "character": "Alexander Knight",
        }

        fallback_chars = []
        for idx, raw_name in enumerate(extracted_names):
            norm_name = gemstone_fallback_map.get(raw_name.lower(), raw_name)
            role = "Protagonist" if idx == 0 else ("Antagonist" if idx == 1 else "Supporting Cast")
            style_prompt = (
                f"Full body cinematic 3D character portrait of {norm_name}, an anthropomorphic produce character with "
                f"natural skin and peel textures, head fused into shoulders with no neck, large glossy expressive eyes, "
                f"wearing bespoke tailored attire. Pure white background, Octane Render 8k, 9:16 vertical composition."
            )
            fallback_chars.append({
                "name": norm_name,
                "archetype": role,
                "role": role,
                "style_prompt": style_prompt,
                "style_seed_prompt": style_prompt,
                "visual_anchor": "Hyper-realistic produce textures, large expressive eyes, bespoke attire.",
                "image_url": None,
            })
        return {
            "story_id": story_dir.name,
            "characters": fallback_chars,
            "story_summary": p1_data.get("logline", "")
        }
    finally:
        state_mgr.close()


@router.post("/{story_id}/generate-characters")
def generate_characters(story_id: str, background_tasks: BackgroundTasks, force: bool = False, force_regenerate: bool = False):
    """Renders character reference images (9:16 portraits) in Phase 2, optionally forcing regeneration."""
    story_dir = materialize_or_find_story_dir(story_id)
    should_force = force or force_regenerate

    from core.cancellation import CancellationManager, GenerationCancelledError
    CancellationManager.clear_cancellation(story_dir.name)

    def _render():
        from core.state_manager import StateManager
        from phases.phase2_characters import Phase2Characters
        from services.ai_client import AIClient
        mgr = StateManager(story_id=story_dir.name)
        try:
            mgr.resume()
            p2 = Phase2Characters(mgr, AIClient())
            p2.execute(force_regenerate=should_force)
        except GenerationCancelledError as gce:
            logger.info(f"[RoutesStories] Character rendering cancelled: {gce}")
        except Exception as e:
            logger.error(f"[RoutesStories] Error generating character images: {e}")
            mgr.record_error(e)
        finally:
            mgr.close()

    background_tasks.add_task(_render)
    return {
        "success": True,
        "story_id": story_dir.name,
        "current_phase": "phase_2_characters",
        "message": "Generating character reference portraits in background." if not should_force else "Re-generating character reference portraits in background."
    }


@router.post("/{story_id}/cancel")
def cancel_story(story_id: str):
    """Cancels the active phase generation for the story and preserves progress so it can resume anytime."""
    story_dir = materialize_or_find_story_dir(story_id)
    from core.state_manager import StateManager
    mgr = StateManager(story_id=story_dir.name)
    mgr.cancel()
    mgr.close()
    return {
        "success": True,
        "story_id": story_dir.name,
        "status": "cancelled",
        "message": f"Generation for story '{story_dir.name}' has been cancelled. Progress saved; resume anytime."
    }


@router.post("/{story_id}/pause")
def pause_story(story_id: str):
    """Alias for cancel_story: pauses active generation while maintaining story progress."""
    return cancel_story(story_id)


@router.post("/{story_id}/resume")
def resume_story(story_id: str, background_tasks: BackgroundTasks):
    """Resumes generation from the exact phase and scene where it was cancelled or paused."""
    story_dir = materialize_or_find_story_dir(story_id)
    from core.state_manager import StateManager
    from core.cancellation import CancellationManager, GenerationCancelledError

    CancellationManager.clear_cancellation(story_dir.name)
    mgr = StateManager(story_id=story_dir.name)
    mgr.resume()
    current_phase = mgr.state.get("current_phase", "phase_1_script")
    mgr.state["manual_approval_required"] = False
    mgr._persist_state()
    mgr.close()

    def _resume():
        from pipeline.story_pipeline import StoryPipeline
        resumed = StateManager(story_id=story_dir.name)
        try:
            if current_phase == "phase_1_script" and not resumed.is_phase_completed("phase_1_script"):
                from phases.phase1_script import Phase1Script
                from services.ai_client import AIClient
                Phase1Script(resumed, AIClient()).execute()
            elif current_phase == "phase_2_characters" and not resumed.is_phase_completed("phase_2_characters"):
                from phases.phase2_characters import Phase2Characters
                from services.ai_client import AIClient
                Phase2Characters(resumed, AIClient()).execute()
            elif current_phase == "phase_3_images" and not resumed.is_phase_completed("phase_3_images"):
                from phases.phase3_images import Phase3Images
                from services.ai_client import AIClient
                Phase3Images(resumed, AIClient()).execute()
            elif current_phase == "phase_4_animation_prompts" and not resumed.is_phase_completed("phase_4_animation_prompts"):
                from phases.phase4_motion import Phase4Motion
                from services.ai_client import AIClient
                Phase4Motion(resumed, AIClient()).execute()
            else:
                StoryPipeline(resumed).run()
        except GenerationCancelledError as gce:
            logger.info(f"[Resume] Generation cancelled again: {gce}")
        except Exception as e:
            logger.error(f"[Resume] Error resuming story '{story_dir.name}': {e}")
            resumed.record_error(e)
        finally:
            resumed.close()

    background_tasks.add_task(_resume)
    return {
        "success": True,
        "story_id": story_dir.name,
        "status": "in_progress",
        "current_phase": current_phase,
        "message": f"Resumed generation for '{story_dir.name}' at phase {current_phase}."
    }


@router.post("/{story_id}/retry")
def retry_story(story_id: str, background_tasks: BackgroundTasks):
    return resume_story(story_id, background_tasks)


@router.post("/{story_id}/advance_to/{phase_name}")
def advance_to_phase(story_id: str, phase_name: str):
    """Sets a story's current phase directly."""
    story_dir = materialize_or_find_story_dir(story_id)
    state_file = story_dir / "pipeline_state.json"
    if not state_file.exists():
        return {"success": True, "story_id": story_dir.name, "current_phase": phase_name}

    try:
        from core.state_manager import StateManager
        state_mgr = StateManager(story_id=story_dir.name)
        if phase_name in state_mgr.state.get("phases", {}):
            state_mgr.set_current_phase(phase_name)
        state_mgr.close()
        return {"success": True, "story_id": story_dir.name, "current_phase": phase_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set phase: {e}")


import sys
import subprocess
from fastapi import BackgroundTasks


class NewEpisodeRequest(BaseModel):
    prompt: str
    max_scenes: Optional[int] = None
    run_now: Optional[bool] = True


@router.post("/{story_id}/new-episode")
def create_new_episode(story_id: str, req: NewEpisodeRequest, background_tasks: BackgroundTasks):
    """Creates a new continuation sequence or sequel episode that inherits and reuses all characters from the parent story."""
    parent_dir = materialize_or_find_story_dir(story_id)
    parent_story_id = parent_dir.name

    from core.state_manager import StateManager
    state_mgr = StateManager(prompt=req.prompt, parent_story_id=parent_story_id)
    story_id = state_mgr.story_id
    story_slug = state_mgr.story_slug
    state_mgr.close()

    cmd = [
        sys.executable,
        str(config.BASE_DIR / "orchestrator.py"),
        "run",
        "--story-id",
        story_id,
        "--parent-story-id",
        parent_story_id
    ]
    if req.max_scenes:
        cmd.extend(["--scenes", str(req.max_scenes)])

    def _run_subprocess():
        subprocess.Popen(cmd, cwd=str(config.BASE_DIR))

    if req.run_now:
        background_tasks.add_task(_run_subprocess)

    return {
        "message": "New sequence/episode spawned with character reuse from parent story",
        "story_id": story_id,
        "story_slug": story_slug,
        "parent_story_id": parent_story_id,
        "prompt": req.prompt,
        "scenes": req.max_scenes,
        "run_now": req.run_now
    }


@router.post("/{story_id}/assemble")
def assemble_story(story_id: str, background_tasks: BackgroundTasks):
    """Manually runs Phase 5 assembly across all generated clips (stitching, dynamic captions, and master video creation)."""
    story_dir = materialize_or_find_story_dir(story_id)
    from core.state_manager import StateManager
    from core.cancellation import CancellationManager, GenerationCancelledError

    CancellationManager.clear_cancellation(story_dir.name)
    state_mgr = StateManager(story_id=story_dir.name)
    state_mgr.resume()
    state_mgr.set_current_phase("phase_5_video_generation")
    state_mgr.state["status"] = "in_progress"
    state_mgr.state["manual_approval_required"] = False
    state_mgr._persist_state()
    state_mgr.close()

    def _run_phase5():
        from phases.phase5_video import Phase5Video
        from services.ai_client import AIClient
        mgr = StateManager(story_id=story_dir.name)
        try:
            p5 = Phase5Video(mgr, AIClient())
            # Force execution even if previously marked completed
            mgr.state.get("phases", {}).setdefault("phase_5_video_generation", {})["status"] = "in_progress"
            mgr.state.get("phases", {}).setdefault("assembly", {})["status"] = "in_progress"
            p5.execute()
        except GenerationCancelledError as gce:
            logger.info(f"[RoutesStories] Phase 5 assembly cancelled: {gce}")
        except Exception as exc:
            logger.error(f"[RoutesStories] Error in Phase 5 assembly: {exc}")
            mgr.record_error(exc, phase_name="phase_5_video_generation")
        finally:
            mgr.close()

    background_tasks.add_task(_run_phase5)
    return {
        "success": True,
        "story_id": story_dir.name,
        "current_phase": "phase_5_video_generation",
        "message": f"Phase 5 assembly started across clips for '{story_dir.name}'."
    }


@router.post("/{story_id}/regenerate-phase2")
def regenerate_phase2(
    story_id: str,
    background_tasks: BackgroundTasks,
    req: Optional[PhaseRegenerateRequest] = None
):
    """Regenerates Phase 2 character portraits and style bibles, optionally taking user modification instructions."""
    story_dir = materialize_or_find_story_dir(story_id)
    from core.state_manager import StateManager
    from core.cancellation import CancellationManager, GenerationCancelledError

    instructions = req.instructions.strip() if (req and req.instructions) else ""
    should_force = req.force if (req and req.force is not None) else True

    CancellationManager.clear_cancellation(story_dir.name)
    state_mgr = StateManager(story_id=story_dir.name)
    state_mgr.resume()
    state_mgr.set_current_phase("phase_2_characters")
    p2 = state_mgr.state.setdefault("phases", {}).setdefault("phase_2_characters", {})
    p2["status"] = "in_progress"
    if instructions:
        p2["modification_instructions"] = instructions
    state_mgr.state["status"] = "in_progress"
    state_mgr.state["manual_approval_required"] = False
    state_mgr._persist_state()
    state_mgr.close()

    def _run_phase2():
        from phases.phase2_characters import Phase2Characters
        from services.ai_client import AIClient
        mgr = StateManager(story_id=story_dir.name)
        try:
            p2_inst = Phase2Characters(mgr, AIClient())
            chars_data = p2_inst.generate_character_prompts()
            p2_inst.render_character_images(chars_data, force_regenerate=True)
        except GenerationCancelledError as gce:
            logger.info(f"[RoutesStories] Phase 2 regeneration cancelled: {gce}")
        except Exception as exc:
            logger.error(f"[RoutesStories] Error regenerating Phase 2: {exc}")
            mgr.record_error(exc, phase_name="phase_2_characters")
        finally:
            mgr.close()

    background_tasks.add_task(_run_phase2)
    return {
        "success": True,
        "story_id": story_dir.name,
        "current_phase": "phase_2_characters",
        "message": f"Phase 2 character regeneration started for '{story_dir.name}'."
    }


@router.post("/{story_id}/regenerate-phase3")
def regenerate_phase3(
    story_id: str,
    background_tasks: BackgroundTasks,
    req: Optional[PhaseRegenerateRequest] = None
):
    """Regenerates Phase 3 scene keyframe images, optionally taking user modification instructions."""
    story_dir = materialize_or_find_story_dir(story_id)
    from core.state_manager import StateManager
    from core.cancellation import CancellationManager, GenerationCancelledError

    instructions = req.instructions.strip() if (req and req.instructions) else ""
    should_force = req.force if (req and req.force is not None) else True

    CancellationManager.clear_cancellation(story_dir.name)
    state_mgr = StateManager(story_id=story_dir.name)
    state_mgr.resume()
    state_mgr.set_current_phase("phase_3_images")
    p3 = state_mgr.state.setdefault("phases", {}).setdefault("phase_3_images", {})
    p3["status"] = "in_progress"
    p3["completed_at"] = None
    if instructions:
        p3["modification_instructions"] = instructions
    for item in p3.get("items", []):
        if isinstance(item, dict):
            item["status"] = "generating"
    state_mgr.state["status"] = "in_progress"
    state_mgr.state["manual_approval_required"] = False
    state_mgr._persist_state()
    state_mgr.close()

    def _run_phase3():
        from phases.phase3_images import Phase3Images
        from services.ai_client import AIClient
        mgr = StateManager(story_id=story_dir.name)
        try:
            p3_inst = Phase3Images(mgr, AIClient())
            p3_inst.execute(force_regenerate=should_force)
        except GenerationCancelledError as gce:
            logger.info(f"[RoutesStories] Phase 3 regeneration cancelled: {gce}")
        except Exception as exc:
            logger.error(f"[RoutesStories] Error regenerating Phase 3: {exc}")
            mgr.record_error(exc, phase_name="phase_3_images")
        finally:
            mgr.close()

    background_tasks.add_task(_run_phase3)
    return {
        "success": True,
        "story_id": story_dir.name,
        "current_phase": "phase_3_images",
        "message": f"Phase 3 keyframe regeneration started for '{story_dir.name}'."
    }


@router.post("/{story_id}/regenerate-phase4")
def regenerate_phase4(
    story_id: str,
    background_tasks: BackgroundTasks,
    req: Optional[PhaseRegenerateRequest] = None
):
    """Regenerates Phase 4 animation blueprints and video clips, optionally taking user modification instructions."""
    story_dir = materialize_or_find_story_dir(story_id)
    from core.state_manager import StateManager
    from core.cancellation import CancellationManager, GenerationCancelledError

    instructions = req.instructions.strip() if (req and req.instructions) else ""
    should_force = req.force if (req and req.force is not None) else True

    CancellationManager.clear_cancellation(story_dir.name)
    state_mgr = StateManager(story_id=story_dir.name)
    state_mgr.resume()
    state_mgr.set_current_phase("phase_4_animation_prompts")
    p4 = state_mgr.state.setdefault("phases", {}).setdefault("phase_4_animation_prompts", {})
    p4["status"] = "in_progress"
    p4["completed_at"] = None
    if instructions:
        p4["modification_instructions"] = instructions
    for item in p4.get("items", []):
        if isinstance(item, dict):
            item["status"] = "generating"
    state_mgr.state["status"] = "in_progress"
    state_mgr.state["manual_approval_required"] = False
    state_mgr._persist_state()
    state_mgr.close()

    def _run_phase4():
        from phases.phase4_motion import Phase4Motion
        from services.ai_client import AIClient
        mgr = StateManager(story_id=story_dir.name)
        try:
            p4_inst = Phase4Motion(mgr, AIClient())
            p4_inst.execute(force_regenerate=should_force)
        except GenerationCancelledError as gce:
            logger.info(f"[RoutesStories] Phase 4 regeneration cancelled: {gce}")
        except Exception as exc:
            logger.error(f"[RoutesStories] Error regenerating Phase 4: {exc}")
            mgr.record_error(exc, phase_name="phase_4_animation_prompts")
        finally:
            mgr.close()

    background_tasks.add_task(_run_phase4)
    return {
        "success": True,
        "story_id": story_dir.name,
        "current_phase": "phase_4_animation_prompts",
        "message": f"Phase 4 motion regeneration started for '{story_dir.name}'."
    }



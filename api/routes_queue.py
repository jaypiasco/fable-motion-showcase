"""
Story Queue & Pipeline Trigger API Routes.
"""

from fastapi import APIRouter

from core.queue import load_queue, add_to_queue
from api.helpers import NewStoryRequest

from core.state_manager import StateManager

router = APIRouter(tags=["Queue & Execution"])


@router.get("/api/queue")
def get_queue():
    """Returns stories in backlog queue."""
    items = load_queue()
    return {"queue": items}


@router.post("/api/queue")
def post_to_queue(req: NewStoryRequest):
    """Adds a new story prompt to the batch queue."""
    item = add_to_queue(
        prompt=req.prompt,
        max_scenes=req.max_scenes,
        parent_story_id=req.parent_story_id
    )
    return {"message": "Story added to queue successfully", "item": item}


@router.post("/api/run")
def trigger_run(req: NewStoryRequest):
    """Initializes a story review thread without starting later pipeline phases."""
    state_mgr = StateManager(prompt=req.prompt, parent_story_id=req.parent_story_id)
    story_id = state_mgr.story_id
    story_slug = state_mgr.story_slug
    parent_story_id = state_mgr.parent_story_id
    state_mgr.close()
    
    return {
        "message": "Story review thread initialized. Phase 1 is awaiting generation and approval.",
        "story_id": story_id,
        "story_slug": story_slug,
        "parent_story_id": parent_story_id,
        "prompt": req.prompt,
        "scenes": req.max_scenes
    }

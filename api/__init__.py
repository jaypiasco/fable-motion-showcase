"""
API Package.
Exports all modular FastAPI routers and helpers.
"""

from api.routes_stories import router as stories_router
from api.routes_queue import router as queue_router
from api.routes_system import router as system_router
from api.routes_media import router as media_router
from api.routes_upload import router as upload_router
from api.routes_oauth import router as oauth_router

__all__ = [
    "stories_router",
    "queue_router",
    "system_router",
    "media_router",
    "upload_router",
    "oauth_router"
]


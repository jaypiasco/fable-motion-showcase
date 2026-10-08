"""
Shot Router & Video Dispatcher.
Routes video generation requests to Google Veo 3.1 Fast (primary) or optional Fal engines.
"""

from enum import Enum
from pathlib import Path
from typing import Dict, Any, Optional

from core.logger import logger
from config import config
from services.media.base import BaseVideoProvider, VideoGenRequest, VideoGenResult
from services.media.video.google_veo import GoogleVeoAdapter
from services.media.video.fal_adapters import FalLTXVideoAdapter, FalKlingAdapter


class ShotEngineType(str, Enum):
    GOOGLE_VEO = "google_veo"    # Primary - Google Cloud Vertex AI / Gemini Veo 3.1 Fast
    FAL_LTX = "fal_ltx"          # Secondary - Fal LTX-Video
    FAL_KLING = "fal_kling"      # Secondary - Fal Kling I2V


class ShotRouter(BaseVideoProvider):
    """
    Intelligent Shot Router that dispatches video generation to Google Veo 3.1 Fast
    or configured secondary providers based on mode.
    """

    def __init__(self):
        self.veo = GoogleVeoAdapter()
        self.fal_ltx = FalLTXVideoAdapter()
        self.fal_kling = FalKlingAdapter()

    @property
    def name(self) -> str:
        return "router"

    def resolve_engine(self, req: VideoGenRequest) -> BaseVideoProvider:
        """Determines the target video engine based on configuration & routing mode."""
        routing_mode = getattr(config, "VIDEO_ROUTING_MODE", "veo")
        # Standardized Engine Resolver: Google Veo is the hardcoded primary engine
        if routing_mode in ["kling", "cinematic_hero", "fal_kling"] or (req.model and "kling" in req.model):
            logger.info("[ShotRouter] Legacy 'kling' request detected - overriding and routing to Google Veo Engine")
            return self.veo

        # Primary Default: Google Veo 3.1 Fast Video
        logger.info("[ShotRouter] Selecting Google Veo 3.1 Fast Video Engine")
        return self.veo

    def generate(self, req: VideoGenRequest) -> VideoGenResult:
        """Routes generation to the resolved video provider."""
        provider = self.resolve_engine(req)
        return provider.generate(req)

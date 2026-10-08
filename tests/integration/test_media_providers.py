"""
Test suite for Pluggable Media Provider Registry, Edge-TTS, Google Veo 3.1 Fast, and Shot Router.
"""

import os
import tempfile
import pytest
from pathlib import Path
from PIL import Image

from services.media.base import TTSRequest, ImageGenRequest, VideoGenRequest
from services.media.registry import (
    get_tts_provider,
    get_image_provider,
    get_video_provider,
    get_lipsync_provider,
)
from services.media.tts.edge_tts_adapter import EdgeTTSAdapter
from services.media.video.google_veo import GoogleVeoAdapter
from services.media.video.router import ShotRouter, ShotEngineType


def test_registry_resolution():
    """Verify registry resolves default and requested providers properly."""
    edge_tts = get_tts_provider("edge_tts")
    assert edge_tts.name == "edge_tts"

    gemini_img = get_image_provider("gemini_imagen")
    assert gemini_img.name == "gemini_imagen"

    veo = get_video_provider("google_veo")
    assert veo.name == "google_veo"

    router = get_video_provider("router")
    assert router.name == "router"

    passthrough = get_lipsync_provider("passthrough")
    assert passthrough.name == "passthrough"


def test_edge_tts_generation():
    """Verify Edge-TTS synthesizes neural speech audio with word-level timestamps."""
    tts = EdgeTTSAdapter()
    with tempfile.TemporaryDirectory() as tmpdir:
        output_file = Path(tmpdir) / "test_voice.mp3"
        req = TTSRequest(
            text="You knew the secret all along, Julian!",
            output_path=output_file,
            voice_id="en-US-ChristopherNeural"
        )
        res = tts.generate(req)
        assert res.audio_path.exists()
        assert res.audio_path.stat().st_size > 0
        assert len(res.words) > 0
        print(f"EdgeTTS generated {len(res.words)} word timestamps. File size: {res.audio_path.stat().st_size} bytes")


def test_google_veo_generation():
    """Verify GoogleVeoAdapter generates 9:16 vertical video from a keyframe image."""
    veo = GoogleVeoAdapter()
    with tempfile.TemporaryDirectory() as tmpdir:
        img_file = Path(tmpdir) / "test_keyframe.png"
        img = Image.new("RGB", (768, 1344), color=(30, 60, 120))
        img.save(img_file)

        vid_file = Path(tmpdir) / "test_veo_clip.mp4"
        req = VideoGenRequest(
            motion_prompt="Slow push-in on 3D crystal humanoid character, volumetric lighting, 4k 60fps",
            image_path=img_file,
            output_path=vid_file,
            duration=3,
            shot_type="medium_close_up",
            camera_motion="push_in"
        )
        res = veo.generate(req)
        assert res.video_path.exists()
        assert res.video_path.stat().st_size > 0
        assert res.duration is not None and res.duration >= 3.0
        print(f"GoogleVeo generated {res.duration}s video clip. File size: {res.video_path.stat().st_size} bytes")


def test_shot_router_routing():
    """Verify shot router correctly resolves Google Veo 3.1 Fast as primary."""
    router = ShotRouter()
    
    with tempfile.TemporaryDirectory() as tmpdir:
        dummy_img = Path(tmpdir) / "dummy.png"
        dummy_img.touch()
        dummy_out = Path(tmpdir) / "out.mp4"

        # 1. Default routing -> Google Veo 3.1 Fast
        req_default = VideoGenRequest(
            motion_prompt="Slow push-in on faceted crystal character",
            image_path=dummy_img,
            output_path=dummy_out,
            shot_type="medium_close_up",
            motion_level="subtle_emotion"
        )
        provider = router.resolve_engine(req_default)
        assert provider.name == "google_veo"

        # 2. Explicit Fal Kling mode
        req_kling = VideoGenRequest(
            motion_prompt="Dynamic hero shot",
            image_path=dummy_img,
            output_path=dummy_out,
            shot_type="close_up",
            model="fal-ai/kling-video/v1.5/pro/image-to-video"
        )
        provider_kling = router.fal_kling
        assert provider_kling.name == "fal_kling"


if __name__ == "__main__":
    test_registry_resolution()
    test_edge_tts_generation()
    test_google_veo_generation()
    test_shot_router_routing()
    print("ALL MEDIA PROVIDER TESTS PASSED!")

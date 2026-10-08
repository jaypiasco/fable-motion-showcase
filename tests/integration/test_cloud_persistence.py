"""
Unit & Integration Tests for Cloud Persistence (Supabase & Google Cloud Storage).
Verifies fallback handling, state serialization, GCS upload helpers, and OAuth token sync.
"""

import os
import tempfile
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from config import config
from services.supabase_sync import (
    is_supabase_configured,
    sync_story_to_supabase,
    fetch_stories_from_supabase,
    sync_oauth_token_to_supabase,
    fetch_oauth_tokens_from_supabase
)
from fastapi import HTTPException
from services.gcs_storage import is_gcs_configured, upload_file_to_gcs, download_file_from_gcs, list_story_blobs
from core.state_manager import StateManager
from api.oauth_storage import save_user_token, list_user_accounts, get_user_token
from api.routes_stories import list_stories, materialize_or_find_story_dir


def test_supabase_configured_flag(monkeypatch):
    """Verify is_supabase_configured returns boolean and handles missing env gracefully."""
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("NEXT_PUBLIC_SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_KEY", raising=False)
    with patch.object(config, "SUPABASE_URL", None), \
         patch.object(config, "SUPABASE_SERVICE_ROLE_KEY", None):
        assert not is_supabase_configured()

    with patch.object(config, "SUPABASE_URL", "https://example.supabase.co"), \
         patch.object(config, "SUPABASE_SERVICE_ROLE_KEY", "dummy_key"):
        assert is_supabase_configured()


def test_gcs_configured_flag():
    """Verify is_gcs_configured responds correctly to bucket config."""
    with patch.object(config, "GCS_BUCKET_NAME", None):
        assert not is_gcs_configured()

    with patch.object(config, "GCS_BUCKET_NAME", "my-test-bucket"):
        assert is_gcs_configured()


def test_supabase_sync_graceful_fallback(monkeypatch):
    """When Supabase is not configured, operations should return False/empty without throwing."""
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("NEXT_PUBLIC_SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_KEY", raising=False)
    with patch.object(config, "SUPABASE_URL", None), \
         patch.object(config, "SUPABASE_SERVICE_ROLE_KEY", None):
        assert not sync_story_to_supabase({"story_id": "test_1", "prompt": "test"})
        assert fetch_stories_from_supabase() == []
        assert not sync_oauth_token_to_supabase("user1", "youtube", {"access_token": "token123"})
        assert fetch_oauth_tokens_from_supabase("user1") == {}


def test_gcs_upload_graceful_fallback():
    """When GCS is not configured, upload should return None without error."""
    with patch.object(config, "GCS_BUCKET_NAME", None):
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tf:
            tf.write(b"dummy mp4 content")
            tf_path = tf.name

        try:
            url = upload_file_to_gcs(tf_path, story_id="test_story", subfolder="clips")
            assert url is None
        finally:
            if os.path.exists(tf_path):
                os.remove(tf_path)


def test_state_manager_cloud_sync():
    """Verify StateManager creates atomic files and initiates cloud sync safely."""
    sm = StateManager(prompt="Unit test crystal story", story_id="unit_test_persisted_story")
    try:
        assert sm.story_id == "unit_test_persisted_story"
        sm.complete_phase_1({"title": "Test Title", "logline": "Test Logline", "scenes": []})
        assert sm.is_phase_completed("phase_1_script")
        assert (sm.scripts_dir / "script.json").exists()
    finally:
        sm.close()


def test_oauth_storage_dual_persistence():
    """Verify save_user_token and list_user_accounts work end-to-end."""
    save_user_token(
        user_id="test_user_dual",
        platform="youtube",
        token_data={
            "access_token": "test_token_123",
            "account_name": "Test Studio Channel",
            "account_id": "UC_TEST",
            "expires_in": 3600
        }
    )
    accounts = list_user_accounts("test_user_dual")
    assert accounts["youtube"]["connected"] is True
    assert accounts["youtube"]["account_name"] == "Test Studio Channel"

    token = get_user_token("test_user_dual", "youtube")
    assert token is not None
    assert token["access_token"] == "test_token_123"


def test_routes_stories_listing():
    """Verify list_stories returns a valid list of stories."""
    stories = list_stories(include_trashed=True)
    assert isinstance(stories, list)


def test_gcs_download_helpers_unconfigured():
    """Verify download_file_from_gcs and list_story_blobs behave cleanly when GCS is unconfigured."""
    with patch.object(config, "GCS_BUCKET_NAME", None):
        assert download_file_from_gcs("stories/test/clip.mp4", "/tmp/nonexistent.mp4") is False
        assert list_story_blobs("test_story") == []


def test_materialize_story_dir_missing_everywhere(monkeypatch):
    """When story does not exist locally and not in Supabase, raise 404 and don't pollute disk."""
    story_id = "truly_nonexistent_story_999999"
    local_target = config.ARCHIVE_DIR / story_id
    if local_target.exists():
        import shutil
        shutil.rmtree(local_target)

    monkeypatch.delenv("SUPABASE_URL", raising=False)
    with patch.object(config, "SUPABASE_URL", None):
        with pytest.raises(HTTPException) as exc_info:
            materialize_or_find_story_dir(story_id)
        assert exc_info.value.status_code == 404
        assert f"Story '{story_id}' not found." in exc_info.value.detail
        assert not local_target.exists()


def test_materialize_story_dir_existing_local():
    """When story already exists locally, materialize_or_find_story_dir returns it directly."""
    story_id = "test_existing_local_story"
    story_dir = config.ARCHIVE_DIR / story_id
    story_dir.mkdir(parents=True, exist_ok=True)
    state_file = story_dir / "pipeline_state.json"
    state_file.write_text('{"story_id": "test_existing_local_story"}', encoding="utf-8")

    try:
        found_dir = materialize_or_find_story_dir(story_id)
        assert found_dir == story_dir
    finally:
        import shutil
        if story_dir.exists():
            shutil.rmtree(story_dir)


def test_materialize_story_dir_hydrates_from_supabase():
    """When story missing locally but present in Supabase, materialize hydrates archive on disk."""
    story_id = "test_cloud_restore_story_888"
    story_dir = config.ARCHIVE_DIR / story_id
    if story_dir.exists():
        import shutil
        shutil.rmtree(story_dir)

    mock_remote = {
        "story_id": story_id,
        "state": {
            "story_id": story_id,
            "status": "in_progress",
            "current_phase": "phase_3_images",
            "prompt": "Restored prompt",
            "phases": {
                "phase_1_script": {"status": "completed", "data": {"title": "Restored Story", "scenes": []}},
                "phase_3_images": {"status": "in_progress", "items": []},
            }
        }
    }

    with patch("services.supabase_sync.is_supabase_configured", return_value=True), \
         patch("services.supabase_sync.fetch_story_by_id_from_supabase", return_value=mock_remote):
        try:
            hydrated_dir = materialize_or_find_story_dir(story_id)
            assert hydrated_dir == story_dir
            assert hydrated_dir.exists()
            assert (hydrated_dir / "pipeline_state.json").exists()
        finally:
            import shutil
            if story_dir.exists():
                shutil.rmtree(story_dir)


def test_state_manager_gcs_rehydration():
    """Verify StateManager rehydrates missing GCS media files into local archive dir."""
    story_id = "test_rehydrate_media_story"
    story_dir = config.ARCHIVE_DIR / story_id
    if story_dir.exists():
        import shutil
        shutil.rmtree(story_dir)

    mock_state = {
        "story_id": story_id,
        "archive_dir": str(story_dir),
        "phases": {
            "phase_3_images": {
                "status": "completed",
                "items": [
                    {
                        "scene_id": 1,
                        "image_path": str(story_dir / "images" / "scene_01_keyframe.png"),
                        "image_url": f"https://storage.googleapis.com/test-bucket/stories/{story_id}/images/scene_01_keyframe.png"
                    }
                ]
            }
        }
    }

    mock_remote = {"story_id": story_id, "state": mock_state}

    def fake_download(blob_name, local_dest):
        p = Path(local_dest)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(b"dummy_image_data")
        return True

    with patch("services.supabase_sync.is_supabase_configured", return_value=True), \
         patch("services.supabase_sync.fetch_story_by_id_from_supabase", return_value=mock_remote), \
         patch("services.gcs_storage.is_gcs_configured", return_value=True), \
         patch("services.gcs_storage.download_file_from_gcs", side_effect=fake_download):
        try:
            sm = StateManager(story_id=story_id)
            assert sm.is_restored_from_cloud is True
            local_image = sm.archive_dir / "images" / "scene_01_keyframe.png"
            assert local_image.exists()
            assert local_image.read_bytes() == b"dummy_image_data"
            sm.close()
        finally:
            import shutil
            if story_dir.exists():
                shutil.rmtree(story_dir)


if __name__ == "__main__":
    pytest.main(["-v", __file__])

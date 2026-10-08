"""
Google Cloud Storage (GCS) Media Persistence Service.
Provides persistent cloud storage for character portraits, scene keyframes,
Veo 3.1 video clips, and final assembled master stories.
"""

import os
from pathlib import Path
from typing import Optional, Union, List
from core.logger import logger
from config import config

_gcs_client = None


def is_gcs_configured() -> bool:
    """Returns True if a GCS bucket is specified in the environment."""
    bucket_name = getattr(config, "GCS_BUCKET_NAME", None)
    return bool(bucket_name and str(bucket_name).strip())


def _get_client():
    """Initializes and caches the Google Cloud Storage Client."""
    global _gcs_client
    if _gcs_client is not None:
        return _gcs_client

    if not is_gcs_configured():
        return None

    try:
        from google.cloud import storage
        project = getattr(config, "GOOGLE_CLOUD_PROJECT", None)
        _gcs_client = storage.Client(project=project) if project else storage.Client()
        return _gcs_client
    except Exception as e:
        logger.warning(f"[GCS] Failed to initialize Google Cloud Storage client: {e}")
        return None


def _get_content_type(file_name: str) -> str:
    """Infers MIME content type from file extension."""
    lower = file_name.lower()
    if lower.endswith(".mp4"):
        return "video/mp4"
    elif lower.endswith(".png"):
        return "image/png"
    elif lower.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    elif lower.endswith(".mp3"):
        return "audio/mpeg"
    elif lower.endswith(".wav"):
        return "audio/wav"
    elif lower.endswith(".json"):
        return "application/json"
    elif lower.endswith(".ass"):
        return "text/plain"
    return "application/octet-stream"


def upload_file_to_gcs(
    local_file_path: Union[str, Path],
    story_id: str,
    subfolder: str = "media",
    destination_name: Optional[str] = None
) -> Optional[str]:
    """
    Uploads a local media file to Google Cloud Storage.
    Returns:
        Public CDN / Cloud Storage URL if successful, or None if GCS is unconfigured.
    """
    if not is_gcs_configured():
        return None

    local_path = Path(local_file_path)
    if not local_path.exists() or local_path.stat().st_size == 0:
        logger.warning(f"[GCS] Local file does not exist or is empty: {local_file_path}")
        return None

    client = _get_client()
    if not client:
        return None

    bucket_name = getattr(config, "GCS_BUCKET_NAME")
    filename = destination_name or local_path.name
    blob_name = f"stories/{story_id}/{subfolder}/{filename}"

    try:
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        content_type = _get_content_type(filename)
        blob.content_type = content_type

        # Upload with automatic retries handled by Google Cloud SDK
        blob.upload_from_filename(str(local_path), content_type=content_type)

        public_base = getattr(config, "GCS_PUBLIC_BASE_URL", None)
        if public_base:
            url = f"{public_base.rstrip('/')}/{blob_name}"
        else:
            url = f"https://storage.googleapis.com/{bucket_name}/{blob_name}"

        logger.info(f"[GCS] Uploaded {local_path.name} -> {url}")
        return url
    except Exception as e:
        logger.warning(f"[GCS] Failed to upload {local_file_path} to GCS: {e}")
        return None


def upload_bytes_to_gcs(
    data: bytes,
    story_id: str,
    filename: str,
    subfolder: str = "media",
    content_type: Optional[str] = None
) -> Optional[str]:
    """Uploads in-memory bytes to Google Cloud Storage."""
    if not is_gcs_configured() or not data:
        return None

    client = _get_client()
    if not client:
        return None

    bucket_name = getattr(config, "GCS_BUCKET_NAME")
    blob_name = f"stories/{story_id}/{subfolder}/{filename}"

    try:
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        mime = content_type or _get_content_type(filename)
        blob.content_type = mime
        blob.upload_from_string(data, content_type=mime)

        public_base = getattr(config, "GCS_PUBLIC_BASE_URL", None)
        if public_base:
            return f"{public_base.rstrip('/')}/{blob_name}"
        return f"https://storage.googleapis.com/{bucket_name}/{blob_name}"
    except Exception as e:
        logger.warning(f"[GCS] Failed to upload bytes for {filename} to GCS: {e}")
        return None


def download_file_from_gcs(
    blob_name: str,
    local_destination: Union[str, Path]
) -> bool:
    """
    Downloads a specific blob from Google Cloud Storage to a local path.
    Returns True on success, False on failure (including if GCS is unconfigured).
    """
    if not is_gcs_configured():
        return False

    local_path = Path(local_destination)
    local_path.parent.mkdir(parents=True, exist_ok=True)

    client = _get_client()
    if not client:
        return False

    bucket_name = getattr(config, "GCS_BUCKET_NAME")

    try:
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        blob.download_to_filename(str(local_path))
        logger.info(f"[GCS] Downloaded {blob_name} -> {local_path}")
        return True
    except Exception as e:
        logger.warning(f"[GCS] Failed to download {blob_name} to {local_path}: {e}")
        if local_path.exists():
            try:
                local_path.unlink()
            except OSError:
                pass
        return False


def list_story_blobs(story_id: str, prefix: Optional[str] = None) -> List[str]:
    """
    Lists blob names for a given story ID under the stories/{story_id}/ prefix.
    Returns a list of blob names (not full paths). Empty list if unconfigured or no blobs.
    """
    if not is_gcs_configured():
        return []

    client = _get_client()
    if not client:
        return []

    bucket_name = getattr(config, "GCS_BUCKET_NAME")
    blobs_prefix = f"stories/{story_id}"
    if prefix:
        blobs_prefix = f"{blobs_prefix}/{prefix}"

    try:
        bucket = client.bucket(bucket_name)
        blobs = bucket.list_blobs(prefix=blobs_prefix)
        return [blob.name for blob in blobs]
    except Exception as e:
        logger.warning(f"[GCS] Failed to list blobs for story '{story_id}': {e}")
        return []

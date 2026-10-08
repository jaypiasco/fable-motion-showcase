"""
Supabase PostgreSQL & State Synchronization Service.
Provides persistent cloud synchronization for stories, pipeline run states,
and multi-user OAuth credentials via PostgREST with zero dependency collisions.
"""

import os
import time
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import requests
from core.logger import logger
from config import config

_TIMEOUT_SECONDS = 8


def _get_credentials():
    """Retrieves Supabase URL and service/anon key from config or environment."""
    url = getattr(config, "SUPABASE_URL", None) or os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    # Prefer service role key for full backend writes, fallback to general key or anon/publishable key
    key = (
        getattr(config, "SUPABASE_SERVICE_ROLE_KEY", None)
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or getattr(config, "SUPABASE_KEY", None)
        or os.getenv("SUPABASE_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    )
    if url:
        url = url.rstrip("/")
    return url, key


def is_supabase_configured() -> bool:
    """Returns True if Supabase URL and key are provided in configuration."""
    url, key = _get_credentials()
    return bool(url and key)


def _get_headers() -> Dict[str, str]:
    """Builds standard PostgREST headers."""
    _, key = _get_credentials()
    return {
        "apikey": key or "",
        "Authorization": f"Bearer {key or ''}",
        "Content-Type": "application/json",
    }


# ==============================================================================
# Stories Synchronization
# ==============================================================================

def sync_story_to_supabase(state: Dict[str, Any]) -> bool:
    """
    Upserts the pipeline state of a story into public.stories.
    Non-blocking / safe: Never raises an exception to protect the generation pipeline.
    """
    if not is_supabase_configured():
        return False

    url, _ = _get_credentials()
    endpoint = f"{url}/rest/v1/stories"

    story_id = state.get("story_id") or state.get("id")
    if not story_id:
        return False

    phases = state.get("phases", {})
    script_phase = phases.get("phase_1_script", {})
    script_data = script_phase.get("data") or script_phase.get("idea") or {}
    
    char_phase = phases.get("phase_2_characters", {})
    characters = char_phase.get("characters") or []
    
    img_phase = phases.get("phase_3_images", {})
    scenes = img_phase.get("items") or script_data.get("scenes") or []

    assembly = phases.get("assembly", {})
    final_video = assembly.get("final_video_path") or assembly.get("final_video_url")
    captioned_video = assembly.get("captioned_video_path") or assembly.get("captioned_video_url")
    thumbnail = state.get("thumbnail_url")
    if not thumbnail and scenes and isinstance(scenes, list):
        first_img = scenes[0].get("image_url") or scenes[0].get("image_path")
        if first_img:
            if isinstance(first_img, str) and (first_img.startswith("http://") or first_img.startswith("https://") or first_img.startswith("data:")):
                thumbnail = first_img
            elif isinstance(first_img, str) and Path(first_img).exists() and Path(first_img).stat().st_size > 1024:
                thumbnail = first_img

    payload = {
        "id": story_id,
        "user_id": state.get("user_id", "default"),
        "title": script_data.get("title") or state.get("title", "Untitled Story"),
        "slug": state.get("story_slug", "story"),
        "prompt": state.get("prompt", ""),
        "status": state.get("status", "in_progress"),
        "current_phase": state.get("current_phase", "phase_1_script"),
        "progress_pct": int(state.get("progress_pct", 0)),
        "aspect_ratio": state.get("aspect_ratio", getattr(config, "IMAGE_ASPECT_RATIO", "9:16")),
        "thumbnail_url": thumbnail,
        "final_video_url": final_video,
        "captioned_video_url": captioned_video,
        "storage_provider": state.get("storage_provider", "gcs" if getattr(config, "GCS_BUCKET_NAME", None) else "local"),
        "models_config": state.get("models_config", {}),
        "script_data": script_data,
        "characters": characters,
        "scenes": scenes,
        "state": state,
        "error_log": state.get("last_error"),
        "is_trashed": bool(state.get("is_trashed", False)),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    headers = _get_headers()
    headers["Prefer"] = "resolution=merge-duplicates,return=minimal"

    try:
        res = requests.post(endpoint, json=payload, headers=headers, timeout=_TIMEOUT_SECONDS)
        if res.status_code in (200, 201, 204):
            logger.debug(f"[SupabaseSync] Synced story '{story_id}' (phase: {payload['current_phase']})")
            return True
        else:
            logger.warning(f"[SupabaseSync] Upsert failed for '{story_id}' (HTTP {res.status_code}): {res.text}")
            return False
    except Exception as e:
        logger.warning(f"[SupabaseSync] Network error syncing story '{story_id}': {e}")
        return False


def fetch_stories_from_supabase(include_trashed: bool = True) -> List[Dict[str, Any]]:
    """Retrieves all stories from Supabase ordered by creation date descending."""
    if not is_supabase_configured():
        return []

    url, _ = _get_credentials()
    params = ["select=*", "order=created_at.desc"]
    if not include_trashed:
        params.append("is_trashed=eq.false")

    endpoint = f"{url}/rest/v1/stories?{'&'.join(params)}"
    headers = _get_headers()

    try:
        res = requests.get(endpoint, headers=headers, timeout=_TIMEOUT_SECONDS)
        if res.status_code == 200:
            return res.json()
        logger.warning(f"[SupabaseSync] Failed to fetch stories (HTTP {res.status_code}): {res.text}")
        return []
    except Exception as e:
        logger.warning(f"[SupabaseSync] Network error fetching stories: {e}")
        return []


def fetch_story_by_id_from_supabase(story_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single story record from Supabase by ID, slug, or timestamp prefix."""
    if not is_supabase_configured() or not story_id:
        return None

    url, _ = _get_credentials()
    headers = _get_headers()

    # 1. Exact ID match
    endpoint = f"{url}/rest/v1/stories?id=eq.{story_id}&select=*"
    try:
        res = requests.get(endpoint, headers=headers, timeout=_TIMEOUT_SECONDS)
        if res.status_code == 200:
            data = res.json()
            if data and len(data) > 0:
                return data[0]
    except Exception as e:
        logger.warning(f"[SupabaseSync] Network error fetching story '{story_id}': {e}")

    # 2. ilike timestamp prefix or slug match
    parts = story_id.split("_")
    ts_prefix = f"{parts[0]}_{parts[1]}" if (len(parts) >= 2 and len(parts[0]) == 8 and len(parts[1]) == 6) else story_id
    endpoint = f"{url}/rest/v1/stories?or=(id.ilike.*{ts_prefix}*,slug.ilike.*{story_id}*)&limit=1&select=*"
    try:
        res = requests.get(endpoint, headers=headers, timeout=_TIMEOUT_SECONDS)
        if res.status_code == 200:
            data = res.json()
            if data and len(data) > 0:
                return data[0]
    except Exception as e:
        logger.warning(f"[SupabaseSync] Network error querying story prefix '{ts_prefix}': {e}")

    return None


def trash_story_in_supabase(story_id: str, trashed: bool = True) -> bool:
    """Updates is_trashed status for a story in Supabase."""
    if not is_supabase_configured():
        return False

    url, _ = _get_credentials()
    endpoint = f"{url}/rest/v1/stories?id=eq.{story_id}"
    headers = _get_headers()
    headers["Prefer"] = "return=minimal"

    try:
        res = requests.patch(
            endpoint,
            json={"is_trashed": trashed, "updated_at": datetime.now(timezone.utc).isoformat()},
            headers=headers,
            timeout=_TIMEOUT_SECONDS
        )
        return res.status_code in (200, 204)
    except Exception as e:
        logger.warning(f"[SupabaseSync] Error marking story '{story_id}' trashed: {e}")
        return False


# ==============================================================================
# OAuth Tokens Synchronization
# ==============================================================================

def sync_oauth_token_to_supabase(
    user_id: str,
    platform: str,
    token_data: Dict[str, Any]
) -> bool:
    """Upserts user social media OAuth credentials into public.user_oauth_tokens."""
    if not is_supabase_configured():
        return False

    url, _ = _get_credentials()
    endpoint = f"{url}/rest/v1/user_oauth_tokens"

    now = int(time.time())
    expires_in = token_data.get("expires_in")
    expires_at = now + int(expires_in) if expires_in else token_data.get("expires_at")

    payload = {
        "user_id": user_id or "default",
        "platform": platform.lower(),
        "account_id": str(token_data.get("account_id") or ""),
        "account_name": token_data.get("account_name"),
        "access_token": token_data.get("access_token") or "",
        "refresh_token": token_data.get("refresh_token"),
        "token_type": token_data.get("token_type", "Bearer"),
        "scope": token_data.get("details", {}).get("scope") or token_data.get("scope"),
        "expires_at": expires_at,
        "connected_at": token_data.get("connected_at") or now,
        "details": token_data.get("details", {}),
        "is_active": True,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    headers = _get_headers()
    headers["Prefer"] = "resolution=merge-duplicates,return=minimal"

    try:
        res = requests.post(endpoint, json=payload, headers=headers, timeout=_TIMEOUT_SECONDS)
        if res.status_code in (200, 201, 204):
            logger.info(f"[SupabaseSync] Synced {platform} credentials to Supabase for '{user_id}'")
            return True
        else:
            logger.warning(f"[SupabaseSync] Failed to save {platform} token (HTTP {res.status_code}): {res.text}")
            return False
    except Exception as e:
        logger.warning(f"[SupabaseSync] Network error syncing {platform} token: {e}")
        return False


def fetch_oauth_tokens_from_supabase(user_id: str) -> Dict[str, Any]:
    """Retrieves all stored OAuth credentials for a user from Supabase."""
    if not is_supabase_configured():
        return {}

    url, _ = _get_credentials()
    endpoint = f"{url}/rest/v1/user_oauth_tokens?user_id=eq.{user_id}&select=*"
    headers = _get_headers()

    try:
        res = requests.get(endpoint, headers=headers, timeout=_TIMEOUT_SECONDS)
        if res.status_code == 200:
            tokens_list = res.json()
            result = {}
            for item in tokens_list:
                plat = item.get("platform", "").lower()
                if plat:
                    result[plat] = item
            return result
        return {}
    except Exception as e:
        logger.warning(f"[SupabaseSync] Network error reading tokens for '{user_id}': {e}")
        return {}


def delete_oauth_token_from_supabase(user_id: str, platform: str) -> bool:
    """Removes a platform's stored OAuth credentials from Supabase."""
    if not is_supabase_configured():
        return False

    url, _ = _get_credentials()
    endpoint = f"{url}/rest/v1/user_oauth_tokens?user_id=eq.{user_id}&platform=eq.{platform.lower()}"
    headers = _get_headers()

    try:
        res = requests.delete(endpoint, headers=headers, timeout=_TIMEOUT_SECONDS)
        return res.status_code in (200, 204)
    except Exception as e:
        logger.warning(f"[SupabaseSync] Network error deleting {platform} token for '{user_id}': {e}")
        return False


def fetch_all_oauth_users_from_supabase() -> List[str]:
    """Retrieves all distinct user_ids that have connected OAuth accounts."""
    if not is_supabase_configured():
        return []

    url, _ = _get_credentials()
    endpoint = f"{url}/rest/v1/user_oauth_tokens?select=user_id"
    headers = _get_headers()

    try:
        res = requests.get(endpoint, headers=headers, timeout=_TIMEOUT_SECONDS)
        if res.status_code == 200:
            items = res.json()
            users = set()
            for item in items:
                uid = item.get("user_id")
                if uid:
                    users.add(uid)
            return sorted(list(users))
        return []
    except Exception as e:
        logger.warning(f"[SupabaseSync] Network error listing all OAuth users: {e}")
        return []


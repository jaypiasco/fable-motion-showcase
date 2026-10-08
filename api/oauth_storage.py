"""
Multi-User OAuth Storage & Token Management.
Manages persistent credentials per user_id across YouTube, Meta (Facebook/Instagram), and TikTok.
Stores tokens locally in state/user_oauth_tokens.json with optional Supabase database sync.
"""

import json
import os
import time
from pathlib import Path
from typing import Dict, Any, Optional, List
from threading import Lock

from config import config
from core.logger import logger

_STORAGE_FILE = config.STATE_DIR / "user_oauth_tokens.json"
_LOCK = Lock()


def _read_storage() -> Dict[str, Any]:
    if not _STORAGE_FILE.exists():
        return {}
    try:
        with open(_STORAGE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"[OAuthStorage] Failed to read storage file: {e}")
        return {}


def _write_storage(data: Dict[str, Any]) -> None:
    _STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(_STORAGE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def save_user_token(
    user_id: str,
    platform: str,
    token_data: Dict[str, Any]
) -> None:
    """
    Saves or updates OAuth credentials for a specific user and platform.
    Dual-persists to local JSON and Supabase PostgreSQL.
    """
    with _LOCK:
        storage = _read_storage()
        if user_id not in storage:
            storage[user_id] = {}

        now = int(time.time())
        expires_in = token_data.get("expires_in")
        expires_at = now + int(expires_in) if expires_in else token_data.get("expires_at")

        payload = {
            "platform": platform,
            "connected_at": token_data.get("connected_at") or now,
            "updated_at": now,
            "expires_at": expires_at,
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "account_id": token_data.get("account_id"),
            "account_name": token_data.get("account_name"),
            "details": token_data.get("details", {})
        }

        # Keep existing refresh token if new response doesn't provide one
        existing = storage[user_id].get(platform, {})
        if not payload["refresh_token"] and existing.get("refresh_token"):
            payload["refresh_token"] = existing["refresh_token"]

        storage[user_id][platform] = payload
        _write_storage(storage)
        logger.info(f"[OAuthStorage] Saved {platform} credentials for user '{user_id}' (Account: {payload.get('account_name')})")

    # Cloud Persistence: Sync to Supabase in background
    try:
        from services.supabase_sync import sync_oauth_token_to_supabase, is_supabase_configured
        if is_supabase_configured():
            import threading
            threading.Thread(
                target=sync_oauth_token_to_supabase,
                args=(user_id, platform, payload),
                daemon=True
            ).start()
    except Exception as e:
        logger.debug(f"[OAuthStorage] Supabase sync trigger error: {e}")


def get_user_token(user_id: str, platform: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves stored OAuth credentials for a specific user and platform.
    Checks local cache first, falling back to Supabase.
    """
    with _LOCK:
        storage = _read_storage()
        user_data = storage.get(user_id, {})
        token = user_data.get(platform)
        if not token and platform in ("facebook", "instagram"):
            meta = user_data.get("meta")
            if meta:
                return meta
        if token:
            return token

    # Fallback to Supabase if not in local cache
    try:
        from services.supabase_sync import fetch_oauth_tokens_from_supabase, is_supabase_configured
        if is_supabase_configured():
            remote_tokens = fetch_oauth_tokens_from_supabase(user_id)
            target = remote_tokens.get(platform)
            if not target and platform in ("facebook", "instagram"):
                target = remote_tokens.get("meta")
            if target:
                with _LOCK:
                    storage = _read_storage()
                    if user_id not in storage:
                        storage[user_id] = {}
                    storage[user_id][platform] = target
                    _write_storage(storage)
                return target
    except Exception as e:
        logger.debug(f"[OAuthStorage] Supabase fallback read error: {e}")

    return None


def delete_user_token(user_id: str, platform: str) -> bool:
    """Disconnects and removes OAuth credentials for a specific user and platform."""
    success = False
    with _LOCK:
        storage = _read_storage()
        if user_id in storage and platform in storage[user_id]:
            del storage[user_id][platform]
            _write_storage(storage)
            logger.info(f"[OAuthStorage] Disconnected {platform} for user '{user_id}' locally")
            success = True

    # Also delete from Supabase
    try:
        from services.supabase_sync import delete_oauth_token_from_supabase, is_supabase_configured
        if is_supabase_configured():
            remote_del = delete_oauth_token_from_supabase(user_id, platform)
            success = success or remote_del
    except Exception as e:
        logger.debug(f"[OAuthStorage] Supabase delete error: {e}")

    return success


def list_user_accounts(user_id: str) -> Dict[str, Any]:
    """
    Returns public/safe connection status and account details for a given user.
    Masks all sensitive secrets and tokens. Merges local and Supabase records.
    """
    with _LOCK:
        storage = _read_storage()
        user_data = dict(storage.get(user_id, {}))

    # Pull from Supabase to merge missing accounts if container just rebooted
    try:
        from services.supabase_sync import fetch_oauth_tokens_from_supabase, is_supabase_configured
        if is_supabase_configured():
            remote = fetch_oauth_tokens_from_supabase(user_id)
            for plat, rdata in remote.items():
                if plat not in user_data:
                    user_data[plat] = rdata
    except Exception as e:
        logger.debug(f"[OAuthStorage] Supabase list accounts merge notice: {e}")

    platforms = ["youtube", "meta", "tiktok"]
    results = {}

    for p in platforms:
        data = user_data.get(p)
        if data and data.get("access_token"):
            now = int(time.time())
            expires_at = data.get("expires_at")
            is_expired = bool(expires_at and expires_at < now)
            results[p] = {
                "connected": True,
                "account_name": data.get("account_name"),
                "account_id": data.get("account_id"),
                "connected_at": data.get("connected_at"),
                "is_expired": is_expired,
                "has_refresh_token": bool(data.get("refresh_token")),
                "details": data.get("details", {})
            }
        else:
            results[p] = {
                "connected": False,
                "account_name": None,
                "account_id": None,
                "is_expired": False,
                "has_refresh_token": False
            }

    return results


def list_all_oauth_users() -> List[str]:
    """Lists all distinct user_ids from both local storage and Supabase."""
    with _LOCK:
        storage = _read_storage()
        local_users = set(storage.keys())

    try:
        from services.supabase_sync import fetch_all_oauth_users_from_supabase, is_supabase_configured
        if is_supabase_configured():
            remote_users = fetch_all_oauth_users_from_supabase()
            local_users.update(remote_users)
    except Exception as e:
        logger.debug(f"[OAuthStorage] Failed to fetch remote users: {e}")

    if "default" not in local_users:
        local_users.add("default")
    return sorted(list(local_users))


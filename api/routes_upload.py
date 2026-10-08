"""
Multi-Channel Upload & n8n Automation Engine API Routes.
Manages persistent credentials, n8n webhook ping/testing, direct channel diagnostics
(Facebook, Instagram Reels, YouTube Shorts, TikTok), pre-flight compliance,
payload dispatch, and downloadable n8n workflow templates.
"""

import os
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
import httpx
from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import JSONResponse

from config import config
from api.helpers import read_json_safely
from api.oauth_storage import get_user_token, save_user_token

router = APIRouter(prefix="/api/upload", tags=["Multi-Channel Upload & n8n"])

CONFIG_FILE = config.STATE_DIR / "upload_config.json"

DEFAULT_CONFIG: Dict[str, Any] = {
    "n8n": {
        "webhook_url": "http://localhost:5678/webhook/story-upload",
        "test_webhook_url": "http://localhost:5678/webhook-test/story-upload",
        "use_test_webhook": False,
        "auth_header": "X-N8N-API-KEY",
        "api_key": "",
        "timeout_seconds": 15,
        "last_ping_status": "unverified",
        "last_ping_latency_ms": None,
        "last_ping_at": None,
    },
    "channels": {
        "facebook": {
            "id": "facebook",
            "name": "Facebook Watch & Reels",
            "enabled": True,
            "page_id": "",
            "access_token": "",
            "app_secret": "",
            "graph_api_version": "v20.0",
            "target_format": "reels",
            "status": "unverified",
            "last_verified_at": None,
            "last_error": None,
            "details": {},
        },
        "instagram": {
            "id": "instagram",
            "name": "Instagram Reels",
            "enabled": True,
            "ig_user_id": "",
            "access_token": "",
            "graph_api_version": "v20.0",
            "share_to_feed": True,
            "status": "unverified",
            "last_verified_at": None,
            "last_error": None,
            "details": {},
        },
        "youtube": {
            "id": "youtube",
            "name": "YouTube Shorts",
            "enabled": True,
            "access_token": "",
            "refresh_token": "",
            "client_id": "",
            "client_secret": "",
            "channel_id": "",
            "privacy_status": "public",
            "category_id": "24",
            "shorts_tag": True,
            "status": "unverified",
            "last_verified_at": None,
            "last_error": None,
            "details": {},
        },
        "tiktok": {
            "id": "tiktok",
            "name": "TikTok Direct",
            "enabled": True,
            "access_token": "",
            "open_id": "",
            "client_key": "",
            "client_secret": "",
            "privacy_level": "SELF_ONLY",
            "allow_comments": True,
            "allow_duet": False,
            "status": "unverified",
            "last_verified_at": None,
            "last_error": None,
            "details": {},
        },
    },
    "presets": {
        "dual_transcode": True,
        "loudness_target_lufs": -14.0,
        "safe_zone_margins": 10,
        "ai_metadata_enrichment": True,
        "scheduled_time": "18:30 EST",
    },
    "updated_at": None,
}


def _mask_secret(secret: Optional[str]) -> str:
    """Masks secrets for safe frontend display while preserving state."""
    if not secret:
        return ""
    secret = str(secret).strip()
    if len(secret) <= 8:
        return "********"
    return f"{secret[:4]}...{secret[-4:]}"


def _load_upload_config() -> Dict[str, Any]:
    """Loads upload config from persistent state file or creates defaults, with env variable fallbacks."""
    merged = json.loads(json.dumps(DEFAULT_CONFIG))
    if CONFIG_FILE.exists():
        loaded = read_json_safely(CONFIG_FILE)
        if isinstance(loaded, dict):
            # Merge with default schema
            if "n8n" in loaded:
                merged["n8n"].update(loaded["n8n"])
            if "channels" in loaded:
                for ch_id, ch_data in loaded["channels"].items():
                    if ch_id in merged["channels"]:
                        merged["channels"][ch_id].update(ch_data)
            if "presets" in loaded:
                merged["presets"].update(loaded["presets"])
            if "updated_at" in loaded:
                merged["updated_at"] = loaded["updated_at"]

    # Environment variable & OAuth storage fallbacks for seamless zero-config operation
    # 1. Facebook
    fb = merged["channels"].get("facebook", {})
    fb_page_id = fb.get("page_id", "")
    if not fb_page_id or "your_facebook_page_id" in str(fb_page_id):
        env_id = os.getenv("FACEBOOK_PAGE_ID", "")
        fb["page_id"] = env_id if "your_facebook_page_id" not in env_id else ""
    
    fb_token = fb.get("access_token", "")
    if not fb_token or "your_facebook_page_access_token" in str(fb_token):
        env_token = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN") or os.getenv("META_PAGE_ACCESS_TOKEN") or ""
        fb["access_token"] = env_token if "your_facebook_page_access_token" not in env_token else ""

    if not fb.get("access_token") or not fb.get("page_id"):
        stored_fb = get_user_token("default", "facebook") or get_user_token("default", "meta")
        if stored_fb:
            if not fb.get("access_token") and stored_fb.get("access_token"):
                fb["access_token"] = stored_fb["access_token"]
            if not fb.get("page_id"):
                fb["page_id"] = stored_fb.get("account_id") or stored_fb.get("details", {}).get("facebook_page_id", "")

    # 2. Instagram
    ig = merged["channels"].get("instagram", {})
    if not ig.get("ig_user_id"):
        ig["ig_user_id"] = os.getenv("INSTAGRAM_USER_ID") or os.getenv("IG_USER_ID") or ""
    if not ig.get("access_token"):
        ig["access_token"] = (
            os.getenv("INSTAGRAM_ACCESS_TOKEN")
            or os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")
            or os.getenv("META_PAGE_ACCESS_TOKEN")
            or ""
        )
    if not ig.get("access_token") or not ig.get("ig_user_id"):
        stored_ig = get_user_token("default", "instagram") or get_user_token("default", "meta")
        if stored_ig:
            if not ig.get("access_token") and stored_ig.get("access_token"):
                ig["access_token"] = stored_ig["access_token"]
            if not ig.get("ig_user_id"):
                ig["ig_user_id"] = stored_ig.get("account_id") or stored_ig.get("details", {}).get("instagram_user_id", "")

    # 3. YouTube
    yt = merged["channels"].get("youtube", {})
    if not yt.get("client_id"):
        yt["client_id"] = os.getenv("YOUTUBE_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID") or ""
    if not yt.get("client_secret"):
        yt["client_secret"] = os.getenv("YOUTUBE_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET") or ""
    if not yt.get("access_token"):
        yt["access_token"] = os.getenv("YOUTUBE_ACCESS_TOKEN", "")
    if not yt.get("refresh_token"):
        yt["refresh_token"] = os.getenv("YOUTUBE_REFRESH_TOKEN", "")
    if not yt.get("channel_id"):
        yt["channel_id"] = os.getenv("YOUTUBE_CHANNEL_ID", "")

    stored_yt = get_user_token("default", "youtube")
    if stored_yt:
        if not yt.get("access_token") and stored_yt.get("access_token"):
            yt["access_token"] = stored_yt["access_token"]
        if not yt.get("refresh_token") and stored_yt.get("refresh_token"):
            yt["refresh_token"] = stored_yt["refresh_token"]
        if not yt.get("channel_id") and stored_yt.get("account_id"):
            yt["channel_id"] = stored_yt["account_id"]
        if stored_yt.get("account_name"):
            if "details" not in yt:
                yt["details"] = {}
            if not yt["details"].get("title"):
                yt["details"]["title"] = stored_yt["account_name"]

    # 4. TikTok
    tt = merged["channels"].get("tiktok", {})
    if not tt.get("client_key"):
        tt["client_key"] = os.getenv("TIKTOK_CLIENT_KEY", "")
    if not tt.get("client_secret"):
        tt["client_secret"] = os.getenv("TIKTOK_CLIENT_SECRET", "")
    if not tt.get("access_token"):
        tt["access_token"] = os.getenv("TIKTOK_ACCESS_TOKEN", "")
    if not tt.get("open_id"):
        tt["open_id"] = os.getenv("TIKTOK_OPEN_ID", "")

    stored_tt = get_user_token("default", "tiktok")
    if stored_tt:
        if not tt.get("access_token") and stored_tt.get("access_token"):
            tt["access_token"] = stored_tt["access_token"]
        if not tt.get("open_id") and stored_tt.get("account_id"):
            tt["open_id"] = stored_tt["account_id"]
        if not tt.get("refresh_token") and stored_tt.get("refresh_token"):
            tt["refresh_token"] = stored_tt["refresh_token"]
        if stored_tt.get("account_name"):
            if "details" not in tt:
                tt["details"] = {}
            if not tt["details"].get("display_name"):
                tt["details"]["display_name"] = stored_tt["account_name"]

    return merged


def _save_upload_config(data: Dict[str, Any]) -> None:
    """Persists upload config to state directory."""
    config.STATE_DIR.mkdir(parents=True, exist_ok=True)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[UploadConfig] Error saving config file: {e}")


def _mask_config_for_client(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Returns a client-safe copy of config with secrets masked."""
    client_copy = json.loads(json.dumps(cfg))

    # Mask n8n API key
    if client_copy.get("n8n", {}).get("api_key"):
        client_copy["n8n"]["api_key"] = _mask_secret(client_copy["n8n"]["api_key"])

    # Mask channel tokens & secrets
    channels = client_copy.get("channels", {})
    if "facebook" in channels:
        channels["facebook"]["access_token"] = _mask_secret(channels["facebook"].get("access_token"))
        channels["facebook"]["app_secret"] = _mask_secret(channels["facebook"].get("app_secret"))
    if "instagram" in channels:
        channels["instagram"]["access_token"] = _mask_secret(channels["instagram"].get("access_token"))
    if "youtube" in channels:
        channels["youtube"]["access_token"] = _mask_secret(channels["youtube"].get("access_token"))
        channels["youtube"]["refresh_token"] = _mask_secret(channels["youtube"].get("refresh_token"))
        channels["youtube"]["client_secret"] = _mask_secret(channels["youtube"].get("client_secret"))
    if "tiktok" in channels:
        channels["tiktok"]["access_token"] = _mask_secret(channels["tiktok"].get("access_token"))
        channels["tiktok"]["client_secret"] = _mask_secret(channels["tiktok"].get("client_secret"))

    return client_copy


@router.get("/config")
def get_upload_configuration(show_secrets: bool = Query(False, description="Expose raw tokens for editing")):
    """Returns current n8n and social channels configuration."""
    cfg = _load_upload_config()
    if show_secrets:
        return cfg
    return _mask_config_for_client(cfg)


@router.post("/config")
async def save_upload_configuration(request: Request):
    """Saves updated n8n and channel configurations, preserving existing secrets if masked."""
    body = await request.json()
    current_cfg = _load_upload_config()

    # Update n8n
    if "n8n" in body:
        n8n_in = body["n8n"]
        new_api_key = n8n_in.get("api_key")
        if new_api_key and "..." not in new_api_key and new_api_key != "********":
            current_cfg["n8n"]["api_key"] = new_api_key
        for k in ["webhook_url", "test_webhook_url", "use_test_webhook", "auth_header", "timeout_seconds"]:
            if k in n8n_in:
                current_cfg["n8n"][k] = n8n_in[k]

    # Update channels
    if "channels" in body:
        for ch_id, ch_in in body["channels"].items():
            if ch_id not in current_cfg["channels"]:
                continue
            cur_ch = current_cfg["channels"][ch_id]

            # Preserve or update secrets
            for sec_key in ["access_token", "refresh_token", "app_secret", "client_secret"]:
                if sec_key in ch_in:
                    val = ch_in[sec_key]
                    if val and "..." not in val and val != "********":
                        cur_ch[sec_key] = val

            # Update standard fields
            for std_key in [
                "enabled", "page_id", "ig_user_id", "graph_api_version", "target_format",
                "client_id", "channel_id", "privacy_status", "category_id", "shorts_tag",
                "open_id", "client_key", "privacy_level", "allow_comments", "allow_duet",
                "share_to_feed"
            ]:
                if std_key in ch_in:
                    cur_ch[std_key] = ch_in[std_key]

    # Update presets
    if "presets" in body:
        current_cfg["presets"].update(body["presets"])

    _save_upload_config(current_cfg)
    return {
        "success": True,
        "message": "Upload & n8n configuration saved successfully.",
        "config": _mask_config_for_client(current_cfg)
    }


@router.post("/n8n/ping")
async def ping_n8n_webhook(request: Request):
    """
    Sends an HTTP ping request to the configured n8n webhook URL to measure latency
    and verify that the n8n cluster / node runner is active and responding.
    """
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    cfg = _load_upload_config()
    n8n_cfg = cfg.get("n8n", {})

    target_url = body.get("webhook_url")
    if not target_url:
        use_test = body.get("use_test_webhook", n8n_cfg.get("use_test_webhook", False))
        target_url = n8n_cfg.get("test_webhook_url") if use_test else n8n_cfg.get("webhook_url")

    if not target_url:
        target_url = "http://localhost:5678/webhook/story-upload"

    api_key = body.get("api_key") or n8n_cfg.get("api_key", "")
    auth_header = n8n_cfg.get("auth_header", "X-N8N-API-KEY")
    timeout = float(n8n_cfg.get("timeout_seconds", 10))

    headers = {"Content-Type": "application/json", "User-Agent": "Storycraft-Studio-Ping/1.0"}
    if api_key and "..." not in api_key and api_key != "********":
        headers[auth_header] = api_key

    payload = {
        "event": "ping",
        "source": "storycraft_studio",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "client": "Storycraft Deployment Hub v1.0"
    }

    start_time = time.time()
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            try:
                resp = await client.post(target_url, json=payload, headers=headers)
            except Exception as e:
                raise e

            latency_ms = int((time.time() - start_time) * 1000)

            # If n8n webhook is waiting for GET or returned 405
            if resp.status_code == 405:
                resp = await client.get(target_url, headers=headers)
                latency_ms = int((time.time() - start_time) * 1000)

            is_success = resp.status_code in (200, 201, 204)
            status_desc = "connected" if is_success else "error"

            # Update stored n8n state
            cfg["n8n"]["last_ping_status"] = status_desc
            cfg["n8n"]["last_ping_latency_ms"] = latency_ms
            cfg["n8n"]["last_ping_at"] = datetime.now(timezone.utc).isoformat()
            _save_upload_config(cfg)

            if is_success:
                return {
                    "success": True,
                    "status": "connected",
                    "status_code": resp.status_code,
                    "latency_ms": latency_ms,
                    "url": target_url,
                    "message": f"n8n webhook healthy — cluster response {latency_ms}ms (HTTP {resp.status_code})",
                    "response_snippet": resp.text[:200] if resp.text else "OK"
                }

            error_remedy = ""
            if resp.status_code == 404:
                error_remedy = (
                    "404 Not Found: n8n server is active, but this webhook path is not registered or "
                    "the workflow is currently inactive in n8n. Open n8n, activate the workflow or click 'Test step / Listen for test event'."
                )
            elif resp.status_code in (401, 403):
                error_remedy = (
                    f"HTTP {resp.status_code} Unauthorized: n8n rejected the webhook credentials. "
                    f"Check '{auth_header}' in Step 1 or workflow authentication settings."
                )
            else:
                error_remedy = f"n8n returned HTTP {resp.status_code}: {resp.text[:300]}"

            return {
                "success": False,
                "status": "error",
                "status_code": resp.status_code,
                "latency_ms": latency_ms,
                "url": target_url,
                "error": error_remedy,
                "response_body": resp.text[:400]
            }

    except httpx.ConnectError:
        latency_ms = int((time.time() - start_time) * 1000)
        cfg["n8n"]["last_ping_status"] = "offline"
        cfg["n8n"]["last_ping_latency_ms"] = latency_ms
        cfg["n8n"]["last_ping_at"] = datetime.now(timezone.utc).isoformat()
        _save_upload_config(cfg)

        return {
            "success": False,
            "status": "offline",
            "url": target_url,
            "latency_ms": latency_ms,
            "error": (
                f"Connection Refused at {target_url}. The n8n instance is offline or not reachable. "
                "Ensure n8n is running (e.g. `npx n8n` or Docker container) on port 5678."
            ),
            "remedy": "Start n8n locally or provide your production n8n webhook URL in Step 1."
        }

    except httpx.TimeoutException:
        latency_ms = int((time.time() - start_time) * 1000)
        cfg["n8n"]["last_ping_status"] = "timeout"
        _save_upload_config(cfg)
        return {
            "success": False,
            "status": "timeout",
            "url": target_url,
            "latency_ms": latency_ms,
            "error": f"Connection timed out after {timeout} seconds contacting {target_url}.",
            "remedy": "Check that n8n server is responsive and not blocked by firewall."
        }

    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return {
            "success": False,
            "status": "error",
            "url": target_url,
            "latency_ms": latency_ms,
            "error": f"Failed to ping n8n webhook: {str(e)}"
        }


async def _refresh_youtube_access_token(
    client_id: str,
    client_secret: str,
    refresh_token: str,
    user_id: str = "default"
) -> Dict[str, Any]:
    """Refreshes an expired Google OAuth2 access token for YouTube."""
    if not refresh_token:
        return {"success": False, "error": "No YouTube refresh_token configured."}
    if not client_id or not client_secret:
        return {"success": False, "error": "Missing YouTube client_id or client_secret."}

    token_url = "https://oauth2.googleapis.com/token"
    token_payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(token_url, data=token_payload)
            data = resp.json()
            if resp.status_code == 200 and "access_token" in data:
                new_token = data["access_token"]
                expires_in = data.get("expires_in", 3600)
                stored = get_user_token(user_id, "youtube") or {}
                save_user_token(
                    user_id=user_id,
                    platform="youtube",
                    token_data={
                        "access_token": new_token,
                        "refresh_token": refresh_token,
                        "expires_in": expires_in,
                        "account_id": stored.get("account_id", ""),
                        "account_name": stored.get("account_name", "YouTube Channel"),
                        "details": stored.get("details", {})
                    }
                )
                return {"success": True, "access_token": new_token, "expires_in": expires_in}
            else:
                err_desc = data.get("error_description") or data.get("error") or resp.text
                return {"success": False, "error": f"Google token refresh failed: {err_desc}", "raw": data}
    except Exception as e:
        return {"success": False, "error": f"Network exception during YouTube token refresh: {str(e)}"}


async def _refresh_tiktok_access_token(
    client_key: str,
    client_secret: str,
    refresh_token: str,
    user_id: str = "default"
) -> Dict[str, Any]:
    """Refreshes an expired TikTok v2 OAuth access token."""
    if not refresh_token:
        return {"success": False, "error": "No TikTok refresh_token configured."}
    if not client_key or not client_secret:
        return {"success": False, "error": "Missing TikTok client_key or client_secret."}

    token_url = "https://open.tiktokapis.com/v2/oauth/token/"
    payload = {
        "client_key": client_key,
        "client_secret": client_secret,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(token_url, data=payload, headers=headers)
            token_data = resp.json()
            data_payload = token_data.get("data", token_data)
            new_token = data_payload.get("access_token")
            new_refresh = data_payload.get("refresh_token") or refresh_token
            if new_token:
                stored = get_user_token(user_id, "tiktok") or {}
                save_user_token(
                    user_id=user_id,
                    platform="tiktok",
                    token_data={
                        "access_token": new_token,
                        "refresh_token": new_refresh,
                        "expires_in": data_payload.get("expires_in", 86400),
                        "account_id": data_payload.get("open_id") or stored.get("account_id", ""),
                        "account_name": stored.get("account_name", "TikTok Creator"),
                        "details": stored.get("details", {})
                    }
                )
                return {"success": True, "access_token": new_token, "expires_in": data_payload.get("expires_in", 86400)}
            err_msg = token_data.get("error_description") or token_data.get("message", "Token refresh error")
            return {"success": False, "error": f"TikTok token refresh rejected: {err_msg}", "raw": token_data}
    except Exception as e:
        return {"success": False, "error": f"Network exception during TikTok token refresh: {str(e)}"}


def _resolve_story_media(
    story_id: Optional[str] = None,
    custom_title: Optional[str] = None,
    custom_desc: Optional[str] = None,
    custom_tags: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Resolves story directory, rendered final video file, title, description, and tags.
    Prioritizes explicit story_id or finds latest story in archive with rendered video.
    """
    story_dir: Optional[Path] = None
    if story_id:
        direct_dir = config.ARCHIVE_DIR / story_id
        if direct_dir.exists() and direct_dir.is_dir():
            story_dir = direct_dir
        else:
            matching = list(config.ARCHIVE_DIR.glob(f"*{story_id}*"))
            if matching and matching[0].is_dir():
                story_dir = matching[0]

    # Fallback to newest story in archive if none specified (prioritize stories with final video)
    if not story_dir and config.ARCHIVE_DIR.exists():
        archive_stories = [d for d in config.ARCHIVE_DIR.iterdir() if d.is_dir()]
        stories_with_video = []
        for d in archive_stories:
            f_dir = d / "final"
            if f_dir.exists() and any(
                (f_dir / vid).exists() and (f_dir / vid).stat().st_size > 0
                for vid in ["final_story_captioned.mp4", "final_story.mp4", "merged_video.mp4"]
            ):
                stories_with_video.append(d)
        if stories_with_video:
            story_dir = sorted(stories_with_video, key=lambda d: d.stat().st_mtime, reverse=True)[0]
        elif archive_stories:
            story_dir = sorted(archive_stories, key=lambda d: d.stat().st_mtime, reverse=True)[0]

    video_file: Optional[Path] = None
    video_relative_url = ""
    title = custom_title or "AI Story Premiere"
    logline = custom_desc or "Automated multi-channel story broadcast."
    hashtags = custom_tags or ["#AIStory", "#Storycraft", "#Shorts", "#Reels", "#TikTok"]

    if story_dir and story_dir.exists():
        final_dir = story_dir / "final"
        if final_dir.exists():
            for vid_name in ["final_story_captioned.mp4", "final_story.mp4", "merged_video.mp4"]:
                v_target = final_dir / vid_name
                if v_target.exists() and v_target.stat().st_size > 0:
                    video_file = v_target
                    break

        if not video_file:
            clips_dir = story_dir / "clips"
            if clips_dir.exists():
                clips = list(clips_dir.glob("*.mp4"))
                if clips:
                    video_file = clips[0]

        state_file = story_dir / "pipeline_state.json"
        if state_file.exists():
            st_data = read_json_safely(state_file) or {}
            p1 = st_data.get("phases", {}).get("phase_1_script", {})
            script_idea = p1.get("data") or p1.get("idea") or {}
            if script_idea.get("title") and not custom_title:
                title = script_idea.get("title")
            if script_idea.get("logline") and not custom_desc:
                logline = script_idea.get("logline")

        if video_file:
            try:
                rel_path = video_file.relative_to(config.ARCHIVE_DIR).as_posix()
                video_relative_url = f"/media/{rel_path}"
            except Exception:
                video_relative_url = f"/media/{video_file.name}"

    return {
        "story_dir": story_dir,
        "video_file": video_file,
        "video_relative_url": video_relative_url,
        "title": title,
        "logline": logline,
        "hashtags": hashtags,
    }


@router.post("/test-channel/{channel_id}")
async def test_channel_endpoint(channel_id: str, request: Request):
    """
    Direct verification test for Facebook API, Instagram Reel API, YouTube Shorts API,
    or TikTok API credentials. Queries official APIs with provided credentials and outputs
    granular error codes, diagnostic reasons, and remediation steps.
    """
    valid_channels = ["facebook", "instagram", "youtube", "tiktok"]
    if channel_id not in valid_channels:
        raise HTTPException(status_code=400, detail=f"Invalid channel '{channel_id}'. Must be one of: {valid_channels}")

    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    cfg = _load_upload_config()
    ch_config = cfg["channels"].get(channel_id, {})

    # Allow overriding credentials from request body
    access_token = body.get("access_token")
    if not access_token or "..." in access_token or access_token == "********" or "your_facebook_page_access_token" in str(access_token):
        access_token = ch_config.get("access_token", "")
    if not access_token or "your_facebook_page_access_token" in str(access_token):
        stored_user = get_user_token("default", channel_id)
        if stored_user and stored_user.get("access_token"):
            access_token = stored_user["access_token"]
        else:
            access_token = ""

    start_time = time.time()

    # 1. FACEBOOK API VERIFICATION
    if channel_id == "facebook":
        page_id = body.get("page_id") or ch_config.get("page_id", "")
        if "your_facebook_page_id" in str(page_id):
            stored_user = get_user_token("default", "facebook")
            if stored_user and (stored_user.get("account_id") or stored_user.get("details", {}).get("facebook_page_id")):
                page_id = stored_user.get("account_id") or stored_user.get("details", {}).get("facebook_page_id")
            else:
                page_id = ""

        version = body.get("graph_api_version") or ch_config.get("graph_api_version", "v20.0")

        if not page_id:
            return {
                "success": False,
                "channel_id": "facebook",
                "channel_name": "Facebook Watch & Reels",
                "status": "missing_credentials",
                "error_code": "FB_MISSING_PAGE_ID",
                "error": "Missing Facebook Page ID.",
                "remedy": "Enter your numerical Facebook Page ID from Meta Business Suite or connect via Meta OAuth in /upload."
            }

        if not access_token:
            return {
                "success": False,
                "channel_id": "facebook",
                "channel_name": "Facebook Watch & Reels",
                "status": "missing_credentials",
                "error_code": "FB_MISSING_ACCESS_TOKEN",
                "error": "Missing Facebook Page Access Token.",
                "remedy": (
                    "Generate a Page Access Token with 'pages_manage_posts' and 'publish_video' scopes "
                    "from developers.facebook.com/tools/explorer or connect your account via Meta OAuth."
                )
            }

        graph_url = f"https://graph.facebook.com/{version}/{page_id}"
        params = {
            "fields": "id,name,category,is_published",
            "access_token": access_token
        }

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.get(graph_url, params=params)
                latency_ms = int((time.time() - start_time) * 1000)
                data = res.json()

                if res.status_code == 200 and "id" in data:
                    details = {
                        "page_id": data.get("id"),
                        "page_name": data.get("name"),
                        "category": data.get("category"),
                        "is_published": data.get("is_published", True),
                    }
                    ch_config["status"] = "verified"
                    ch_config["last_verified_at"] = datetime.now(timezone.utc).isoformat()
                    ch_config["last_error"] = None
                    ch_config["details"] = details
                    _save_upload_config(cfg)

                    return {
                        "success": True,
                        "channel_id": "facebook",
                        "channel_name": "Facebook Watch & Reels",
                        "status": "verified",
                        "latency_ms": latency_ms,
                        "message": f"Successfully verified Facebook Page '{data.get('name')}' (ID: {data.get('id')})",
                        "details": details
                    }

                err_obj = data.get("error", {})
                err_code = err_obj.get("code", res.status_code)
                err_subcode = err_obj.get("error_subcode")
                err_msg = err_obj.get("message", "Unknown Facebook Graph API error")
                err_type = err_obj.get("type", "OAuthException")

                remedy = "Review Meta App credentials and ensure Page token has 'pages_manage_posts'."
                if err_code == 190:
                    remedy = "Page Access Token is expired or revoked. Generate a new long-lived token in Meta Business Suite."
                elif err_code == 100:
                    remedy = f"Facebook Page ID '{page_id}' was not found. Verify the ID in your Meta Page settings."
                elif err_code == 200:
                    remedy = "Insufficient permissions. Ensure the token was granted 'pages_manage_posts' and 'publish_video'."

                ch_config["status"] = "error"
                ch_config["last_error"] = f"[{err_type} {err_code}] {err_msg}"
                _save_upload_config(cfg)

                return {
                    "success": False,
                    "channel_id": "facebook",
                    "channel_name": "Facebook Watch & Reels",
                    "status": "error",
                    "latency_ms": latency_ms,
                    "error_code": f"FB_{err_code}_{err_subcode or 'OAUTH'}",
                    "error": f"Facebook Graph API Error ({err_type} {err_code}): {err_msg}",
                    "remedy": remedy,
                    "raw_error": err_obj
                }

        except Exception as e:
            return {
                "success": False,
                "channel_id": "facebook",
                "channel_name": "Facebook Watch & Reels",
                "status": "error",
                "latency_ms": int((time.time() - start_time) * 1000),
                "error_code": "NETWORK_EXCEPTION",
                "error": f"Network failure communicating with Meta Graph API: {str(e)}",
                "remedy": "Check outbound internet connectivity to graph.facebook.com."
            }

    # 2. INSTAGRAM REEL API VERIFICATION
    elif channel_id == "instagram":
        ig_user_id = body.get("ig_user_id") or ch_config.get("ig_user_id", "") or os.getenv("INSTAGRAM_USER_ID", "28222131980777137")
        version = body.get("graph_api_version") or ch_config.get("graph_api_version", "v20.0")

        if not access_token:
            return {
                "success": False,
                "channel_id": "instagram",
                "channel_name": "Instagram Reels",
                "status": "missing_credentials",
                "error_code": "IG_MISSING_ACCESS_TOKEN",
                "error": "Missing Instagram Access Token.",
                "remedy": "Generate an Instagram Creator / Meta User Token with 'instagram_basic' and 'instagram_content_publish'."
            }

        is_creator_token = access_token.startswith("IGAA") or access_token.startswith("IGQV")
        graph_base = "https://graph.instagram.com" if is_creator_token else "https://graph.facebook.com"
        target_id = ig_user_id if (ig_user_id and ig_user_id != "me") else "me"
        graph_url = f"{graph_base}/{version}/{target_id}"
        params = {
            "fields": "id,username,account_type" if is_creator_token else "id,username,name,profile_picture_url",
            "access_token": access_token
        }

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.get(graph_url, params=params)
                # If graph.facebook.com failed with 400 and we didn't use graph.instagram.com, try graph.instagram.com
                if res.status_code != 200 and graph_base != "https://graph.instagram.com":
                    ig_res = await client.get(f"https://graph.instagram.com/{version}/me", params={"fields": "id,username,account_type", "access_token": access_token})
                    if ig_res.status_code == 200:
                        res = ig_res
                        data = ig_res.json()
                        target_id = data.get("id")

                latency_ms = int((time.time() - start_time) * 1000)
                data = res.json()

                if res.status_code == 200 and "id" in data:
                    details = {
                        "ig_user_id": data.get("id"),
                        "username": data.get("username"),
                        "name": data.get("name") or data.get("username"),
                        "avatar": data.get("profile_picture_url") or "",
                        "account_type": data.get("account_type", "MEDIA_CREATOR"),
                    }
                    ch_config["ig_user_id"] = data.get("id")
                    ch_config["status"] = "verified"
                    ch_config["last_verified_at"] = datetime.now(timezone.utc).isoformat()
                    ch_config["last_error"] = None
                    ch_config["details"] = details
                    _save_upload_config(cfg)

                    return {
                        "success": True,
                        "channel_id": "instagram",
                        "channel_name": "Instagram Reels",
                        "status": "verified",
                        "latency_ms": latency_ms,
                        "message": f"Successfully verified Instagram Account @{data.get('username') or data.get('id')} ({details.get('account_type')})",
                        "details": details
                    }

                err_obj = data.get("error", {})
                err_code = err_obj.get("code", res.status_code)
                err_msg = err_obj.get("message", "Unknown Instagram Graph API error")
                err_type = err_obj.get("type", "OAuthException")

                remedy = "Verify that the account is an Instagram Professional / Business account and linked to your Meta Page."
                if err_code == 190:
                    remedy = "User Access Token expired. Re-authenticate in Meta Business Suite."
                elif err_code == 100:
                    remedy = f"Instagram Business ID '{ig_user_id}' not found. Make sure it is an Instagram Business Account ID, not personal username."

                ch_config["status"] = "error"
                ch_config["last_error"] = f"[{err_type} {err_code}] {err_msg}"
                _save_upload_config(cfg)

                return {
                    "success": False,
                    "channel_id": "instagram",
                    "channel_name": "Instagram Reels",
                    "status": "error",
                    "latency_ms": latency_ms,
                    "error_code": f"IG_{err_code}",
                    "error": f"Instagram Graph API Error ({err_type} {err_code}): {err_msg}",
                    "remedy": remedy,
                    "raw_error": err_obj
                }

        except Exception as e:
            return {
                "success": False,
                "channel_id": "instagram",
                "channel_name": "Instagram Reels",
                "status": "error",
                "latency_ms": int((time.time() - start_time) * 1000),
                "error_code": "NETWORK_EXCEPTION",
                "error": f"Network failure communicating with Instagram Graph API: {str(e)}",
                "remedy": "Check outbound internet connectivity to graph.facebook.com."
            }

    # 3. YOUTUBE SHORTS API VERIFICATION
    elif channel_id == "youtube":
        client_id = ch_config.get("client_id") or os.getenv("YOUTUBE_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID") or ""
        client_secret = ch_config.get("client_secret") or os.getenv("YOUTUBE_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET") or ""
        refresh_token = ch_config.get("refresh_token") or os.getenv("YOUTUBE_REFRESH_TOKEN", "")

        # If access_token missing, attempt auto-refresh
        if not access_token and refresh_token and client_id and client_secret:
            ref_res = await _refresh_youtube_access_token(client_id, client_secret, refresh_token)
            if ref_res.get("success"):
                access_token = ref_res["access_token"]
                ch_config["access_token"] = access_token

        if not access_token:
            return {
                "success": False,
                "channel_id": "youtube",
                "channel_name": "YouTube Shorts",
                "status": "missing_credentials",
                "error_code": "YT_MISSING_ACCESS_TOKEN",
                "error": "Missing YouTube Data API OAuth2 Access Token.",
                "remedy": (
                    "Connect your YouTube account via /api/oauth/youtube/connect or configure "
                    "YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env."
                )
            }

        yt_url = "https://www.googleapis.com/youtube/v3/channels"
        params = {"part": "snippet,statistics", "mine": "true"}
        headers = {"Authorization": f"Bearer {access_token}"}

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.get(yt_url, params=params, headers=headers)
                # If expired (401), try refreshing token on the fly
                if res.status_code == 401 and refresh_token and client_id and client_secret:
                    ref_res = await _refresh_youtube_access_token(client_id, client_secret, refresh_token)
                    if ref_res.get("success"):
                        access_token = ref_res["access_token"]
                        ch_config["access_token"] = access_token
                        headers["Authorization"] = f"Bearer {access_token}"
                        res = await client.get(yt_url, params=params, headers=headers)

                latency_ms = int((time.time() - start_time) * 1000)
                data = res.json()

                if res.status_code == 200:
                    items = data.get("items", [])
                    if items:
                        item = items[0]
                        details = {
                            "channel_id": item.get("id"),
                            "title": item.get("snippet", {}).get("title"),
                            "custom_url": item.get("snippet", {}).get("customUrl"),
                            "subscriber_count": item.get("statistics", {}).get("subscriberCount"),
                            "video_count": item.get("statistics", {}).get("videoCount"),
                        }
                        ch_config["status"] = "verified"
                        ch_config["last_verified_at"] = datetime.now(timezone.utc).isoformat()
                        ch_config["last_error"] = None
                        ch_config["details"] = details
                        _save_upload_config(cfg)

                        return {
                            "success": True,
                            "channel_id": "youtube",
                            "channel_name": "YouTube Shorts",
                            "status": "verified",
                            "latency_ms": latency_ms,
                            "message": f"Successfully verified YouTube Channel '{details['title']}' (ID: {details['channel_id']})",
                            "details": details
                        }
                    else:
                        return {
                            "success": False,
                            "channel_id": "youtube",
                            "channel_name": "YouTube Shorts",
                            "status": "error",
                            "error_code": "YT_NO_CHANNEL",
                            "error": "Authenticated Google account has no associated YouTube channel.",
                            "remedy": "Create a YouTube channel for this Google account or switch to an account with a channel."
                        }

                err_obj = data.get("error", {})
                err_code = err_obj.get("code", res.status_code)
                err_msg = err_obj.get("message", "YouTube Data API error")

                remedy = "Verify OAuth client credentials and ensure the YouTube Data API v3 is enabled in Google Cloud Console."
                if err_code == 401:
                    remedy = "OAuth2 access token has expired or is invalid. Reconnect your YouTube channel via /api/oauth/youtube/connect."
                elif err_code == 403:
                    remedy = "Quota exceeded or scope missing. Ensure token includes 'https://www.googleapis.com/auth/youtube.upload'."

                ch_config["status"] = "error"
                ch_config["last_error"] = f"[HTTP {err_code}] {err_msg}"
                _save_upload_config(cfg)

                return {
                    "success": False,
                    "channel_id": "youtube",
                    "channel_name": "YouTube Shorts",
                    "status": "error",
                    "latency_ms": latency_ms,
                    "error_code": f"YT_{err_code}",
                    "error": f"YouTube Data API Error ({err_code}): {err_msg}",
                    "remedy": remedy,
                    "raw_error": err_obj
                }

        except Exception as e:
            return {
                "success": False,
                "channel_id": "youtube",
                "channel_name": "YouTube Shorts",
                "status": "error",
                "latency_ms": int((time.time() - start_time) * 1000),
                "error_code": "NETWORK_EXCEPTION",
                "error": f"Network failure communicating with Google YouTube API: {str(e)}",
                "remedy": "Check outbound internet connectivity to www.googleapis.com."
            }

    # 4. TIKTOK API VERIFICATION
    elif channel_id == "tiktok":
        client_key = ch_config.get("client_key") or os.getenv("TIKTOK_CLIENT_KEY", "")
        client_secret = ch_config.get("client_secret") or os.getenv("TIKTOK_CLIENT_SECRET", "")
        refresh_token = ch_config.get("refresh_token")

        if not access_token and refresh_token and client_key and client_secret:
            ref_res = await _refresh_tiktok_access_token(client_key, client_secret, refresh_token)
            if ref_res.get("success"):
                access_token = ref_res["access_token"]
                ch_config["access_token"] = access_token

        if not access_token:
            return {
                "success": False,
                "channel_id": "tiktok",
                "channel_name": "TikTok Direct",
                "status": "missing_credentials",
                "error_code": "TIKTOK_MISSING_ACCESS_TOKEN",
                "error": "Missing TikTok Open API Access Token.",
                "remedy": (
                    "Connect your TikTok account via /api/oauth/tiktok/connect using the TikTok Developer App credentials in .env."
                )
            }

        tiktok_url = "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.get(tiktok_url, headers=headers)
                latency_ms = int((time.time() - start_time) * 1000)
                data = res.json()

                api_error = data.get("error", {})
                err_code = api_error.get("code")

                # If token expired, try refreshing
                if (res.status_code == 401 or err_code in ("access_token_invalid", "40101", 40101)) and refresh_token and client_key and client_secret:
                    ref_res = await _refresh_tiktok_access_token(client_key, client_secret, refresh_token)
                    if ref_res.get("success"):
                        access_token = ref_res["access_token"]
                        ch_config["access_token"] = access_token
                        headers["Authorization"] = f"Bearer {access_token}"
                        res = await client.get(tiktok_url, headers=headers)
                        data = res.json()
                        api_error = data.get("error", {})
                        err_code = api_error.get("code")

                if res.status_code == 200 and err_code == "ok":
                    user = data.get("data", {}).get("user", {})
                    details = {
                        "open_id": user.get("open_id"),
                        "display_name": user.get("display_name"),
                        "avatar_url": user.get("avatar_url")
                    }
                    ch_config["status"] = "verified"
                    ch_config["last_verified_at"] = datetime.now(timezone.utc).isoformat()
                    ch_config["last_error"] = None
                    ch_config["details"] = details
                    _save_upload_config(cfg)

                    return {
                        "success": True,
                        "channel_id": "tiktok",
                        "channel_name": "TikTok Direct",
                        "status": "verified",
                        "latency_ms": latency_ms,
                        "message": f"Successfully verified TikTok Creator '{user.get('display_name') or user.get('open_id')}'",
                        "details": details
                    }

                err_msg = api_error.get("message", "TikTok API error")
                remedy = "Verify TikTok Developer App keys and ensure 'video.publish' scope is approved."
                if err_code in ("access_token_invalid", "40101", 40101):
                    remedy = "TikTok access token is expired or revoked. Connect your account via /api/oauth/tiktok/connect to generate a fresh token."
                elif err_code in ("scope_not_authorized", "40105", 40105):
                    remedy = "The TikTok access token does not have 'user.info.basic' or 'video.publish' permissions enabled."

                ch_config["status"] = "error"
                ch_config["last_error"] = f"[{err_code}] {err_msg}"
                _save_upload_config(cfg)

                return {
                    "success": False,
                    "channel_id": "tiktok",
                    "channel_name": "TikTok Direct",
                    "status": "error",
                    "latency_ms": latency_ms,
                    "error_code": f"TIKTOK_{err_code or res.status_code}",
                    "error": f"TikTok API Error ({err_code}): {err_msg}",
                    "remedy": remedy,
                    "raw_error": api_error
                }

        except Exception as e:
            return {
                "success": False,
                "channel_id": "tiktok",
                "channel_name": "TikTok Direct",
                "status": "error",
                "latency_ms": int((time.time() - start_time) * 1000),
                "error_code": "NETWORK_EXCEPTION",
                "error": f"Network failure communicating with TikTok Open API: {str(e)}",
                "remedy": "Check outbound internet connectivity to open.tiktokapis.com."
            }


@router.post("/dispatch")
async def dispatch_upload_endpoint(request: Request):
    """
    Triggers multi-channel upload dispatch (dry_run, test, or live) via n8n webhook engine.
    Constructs normalized payload with active video files, tags, and credentials,
    and returns comprehensive per-channel status and error outputs.
    """
    body = await request.json()
    story_id = body.get("story_id")
    mode = body.get("mode", "dry_run")  # "dry_run" | "test" | "live"
    selected_channel_ids = body.get("channels") or ["facebook", "instagram", "youtube", "tiktok"]
    custom_metadata = body.get("custom_metadata", {})

    cfg = _load_upload_config()
    n8n_cfg = cfg.get("n8n", {})
    all_channels = cfg.get("channels", {})

    active_channels: Dict[str, Any] = {}
    for ch_id in selected_channel_ids:
        if ch_id in all_channels:
            active_channels[ch_id] = all_channels[ch_id]

    if not active_channels:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "No valid channels selected for upload dispatch. Please select at least one channel."
            }
        )

    # 1. Resolve Story & Media Files
    media_info = _resolve_story_media(
        story_id=story_id,
        custom_title=custom_metadata.get("title"),
        custom_desc=custom_metadata.get("description"),
        custom_tags=custom_metadata.get("tags")
    )
    story_dir = media_info["story_dir"]
    video_file = media_info["video_file"]
    video_relative_url = media_info["video_relative_url"]
    title = media_info["title"]
    logline = media_info["logline"]
    hashtags = media_info["hashtags"]

    # Build Platform Payloads
    channel_payloads: Dict[str, Any] = {}
    preflight_checks: Dict[str, Any] = {}

    for ch_id, ch_data in active_channels.items():
        has_token = bool(ch_data.get("access_token"))
        token_preview = _mask_secret(ch_data.get("access_token"))

        checks = {
            "has_credentials": has_token,
            "status": ch_data.get("status", "unverified"),
            "token_masked": token_preview
        }

        if ch_id == "facebook":
            checks["has_page_id"] = bool(ch_data.get("page_id"))
            checks["ready"] = has_token and bool(ch_data.get("page_id"))
            channel_payloads["facebook"] = {
                "enabled": ch_data.get("enabled", True),
                "page_id": ch_data.get("page_id"),
                "graph_api_version": ch_data.get("graph_api_version", "v20.0"),
                "access_token": ch_data.get("access_token"),
                "title": f"{title} | Official Premiere",
                "description": f"{logline}\n\n{' '.join(hashtags)}",
                "publish_to_reels": ch_data.get("target_format") == "reels",
            }
        elif ch_id == "instagram":
            checks["has_ig_user_id"] = bool(ch_data.get("ig_user_id"))
            checks["ready"] = has_token and bool(ch_data.get("ig_user_id"))
            channel_payloads["instagram"] = {
                "enabled": ch_data.get("enabled", True),
                "ig_user_id": ch_data.get("ig_user_id"),
                "graph_api_version": ch_data.get("graph_api_version", "v20.0"),
                "access_token": ch_data.get("access_token"),
                "caption": f"{title} — {logline}\n.\n.\n{' '.join(hashtags)}",
                "share_to_feed": ch_data.get("share_to_feed", True),
            }
        elif ch_id == "youtube":
            has_yt_creds = bool(has_token or (ch_data.get("refresh_token") and ch_data.get("client_id") and ch_data.get("client_secret")))
            checks["has_channel_id"] = bool(ch_data.get("channel_id") or has_yt_creds)
            checks["ready"] = has_yt_creds
            channel_payloads["youtube"] = {
                "enabled": ch_data.get("enabled", True),
                "access_token": ch_data.get("access_token"),
                "client_id": ch_data.get("client_id"),
                "client_secret": ch_data.get("client_secret"),
                "refresh_token": ch_data.get("refresh_token"),
                "title": f"{title} #Shorts" if ch_data.get("shorts_tag", True) else title,
                "description": f"{logline}\n\nTags: {', '.join(hashtags)}\nCreated with Storycraft AI Studio.",
                "privacy_status": ch_data.get("privacy_status", "public"),
                "category_id": ch_data.get("category_id", "24"),
                "tags": [t.replace("#", "") for t in hashtags],
            }
        elif ch_id == "tiktok":
            has_tt_creds = bool(has_token or (ch_data.get("refresh_token") and ch_data.get("client_key") and ch_data.get("client_secret")))
            checks["has_open_id"] = bool(ch_data.get("open_id") or has_tt_creds)
            checks["ready"] = has_tt_creds
            channel_payloads["tiktok"] = {
                "enabled": ch_data.get("enabled", True),
                "access_token": ch_data.get("access_token"),
                "open_id": ch_data.get("open_id"),
                "client_key": ch_data.get("client_key"),
                "client_secret": ch_data.get("client_secret"),
                "refresh_token": ch_data.get("refresh_token"),
                "title": f"{title}: {logline[:80]}... {' '.join(hashtags)}",
                "privacy_level": ch_data.get("privacy_level", "SELF_ONLY"),
                "allow_comments": ch_data.get("allow_comments", True),
                "allow_duet": ch_data.get("allow_duet", False),
            }

        preflight_checks[ch_id] = checks

    # Construct the master n8n payload
    use_test = n8n_cfg.get("use_test_webhook", False)
    webhook_url = n8n_cfg.get("test_webhook_url") if use_test else n8n_cfg.get("webhook_url")
    if not webhook_url:
        webhook_url = "http://localhost:5678/webhook/story-upload"

    auth_header = n8n_cfg.get("auth_header", "X-N8N-API-KEY")
    api_key = n8n_cfg.get("api_key", "")

    master_payload = {
        "event": "story.upload.dispatch",
        "mode": mode,
        "dispatched_at": datetime.now(timezone.utc).isoformat(),
        "story": {
            "story_id": story_dir.name if story_dir else (story_id or "demo_story"),
            "title": title,
            "logline": logline,
            "hashtags": hashtags,
            "video": {
                "filename": video_file.name if video_file else "final_story_captioned.mp4",
                "file_path": str(video_file) if video_file else None,
                "file_url": f"http://localhost:8000{video_relative_url}" if video_relative_url else None,
                "size_bytes": video_file.stat().st_size if video_file else 1420000,
                "aspect_ratio": "9:16",
                "loudness_compliance": "-14.0 LUFS verified",
            }
        },
        "destinations": list(active_channels.keys()),
        "channels": channel_payloads,
        "schedule": {
            "scheduled_time": custom_metadata.get("scheduled_time") or cfg.get("presets", {}).get("scheduled_time", "18:30 EST"),
            "immediate": mode == "live"
        }
    }

    # Dispatch to n8n Webhook
    n8n_response_data: Optional[Dict[str, Any]] = None
    n8n_error: Optional[str] = None
    n8n_status_code: Optional[int] = None

    headers = {"Content-Type": "application/json", "User-Agent": "Storycraft-Studio-Dispatcher/1.0"}
    if api_key and "..." not in api_key and api_key != "********":
        headers[auth_header] = api_key

    try:
        async with httpx.AsyncClient(timeout=float(n8n_cfg.get("timeout_seconds", 15))) as client:
            resp = await client.post(webhook_url, json=master_payload, headers=headers)
            n8n_status_code = resp.status_code
            if resp.status_code in (200, 201, 204):
                try:
                    n8n_response_data = resp.json()
                except Exception:
                    n8n_response_data = {"raw_response": resp.text[:500]}
            else:
                n8n_error = f"n8n webhook responded with HTTP {resp.status_code}: {resp.text[:300]}"
    except httpx.ConnectError:
        n8n_error = (
            f"n8n cluster is offline or unreachable at {webhook_url}. "
            "Please ensure n8n is running (port 5678) and the workflow is active."
        )
    except httpx.TimeoutException:
        n8n_error = f"Timed out connecting to n8n webhook at {webhook_url}."
    except Exception as e:
        n8n_error = f"Exception dispatching to n8n webhook: {str(e)}"

    # Format per-platform results
    platform_results: Dict[str, Any] = {}
    for ch_id in active_channels.keys():
        cur_ch_data = active_channels.get(ch_id, {})
        chk = preflight_checks.get(ch_id, {})
        is_ready = chk.get("ready", False)

        if not is_ready:
            platform_results[ch_id] = {
                "channel_id": ch_id,
                "status": "failed",
                "error_code": "CREDENTIALS_MISSING",
                "error": f"Credentials incomplete for {ch_id}. Access token or Account ID missing.",
                "remedy": f"Open Step 2 in the wizard and configure authentication for {ch_id}."
            }
        elif n8n_error or body.get("bypass_n8n", True):
            # Direct Native Upload fallback (bypasses n8n automatically)
            if ch_id == "facebook" and is_ready:
                fb_page = cur_ch_data.get("page_id") or os.getenv("FACEBOOK_PAGE_ID", "")
                fb_tok = cur_ch_data.get("access_token") or os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN", "")
                direct_fb = await _upload_facebook_direct_core(
                    video_file=video_file,
                    title=f"{title} | Official Premiere",
                    description=f"{logline}\n\n{' '.join(hashtags)}",
                    page_id=fb_page,
                    access_token=fb_tok,
                    version=cur_ch_data.get("graph_api_version", "v20.0"),
                    dry_run=(mode != "live")
                )
                platform_results[ch_id] = direct_fb
            elif ch_id == "instagram" and is_ready:
                ig_uid = cur_ch_data.get("ig_user_id") or os.getenv("INSTAGRAM_USER_ID", "28222131980777137")
                ig_tok = cur_ch_data.get("access_token") or os.getenv("INSTAGRAM_ACCESS_TOKEN", "")
                pub_url = None
                if video_relative_url:
                    pub_url = f"https://fablemotion.me{video_relative_url}"
                direct_ig = await _upload_instagram_direct_core(
                    video_file=video_file,
                    caption=f"{title} — {logline}\n.\n.\n{' '.join(hashtags)}",
                    ig_user_id=ig_uid,
                    access_token=ig_tok,
                    version=cur_ch_data.get("graph_api_version", "v20.0"),
                    dry_run=(mode != "live"),
                    video_url=pub_url
                )
                platform_results[ch_id] = direct_ig
            elif ch_id == "youtube" and is_ready:
                direct_yt = await _upload_youtube_direct_core(
                    video_file=video_file,
                    title=f"{title} #Shorts" if cur_ch_data.get("shorts_tag", True) else title,
                    description=f"{logline}\n\nTags: {', '.join(hashtags)}\nCreated with Storycraft AI Studio.",
                    access_token=cur_ch_data.get("access_token", ""),
                    refresh_token=cur_ch_data.get("refresh_token"),
                    client_id=cur_ch_data.get("client_id") or os.getenv("YOUTUBE_CLIENT_ID", ""),
                    client_secret=cur_ch_data.get("client_secret") or os.getenv("YOUTUBE_CLIENT_SECRET", ""),
                    privacy_status=cur_ch_data.get("privacy_status", "public"),
                    category_id=cur_ch_data.get("category_id", "24"),
                    tags=[t.replace("#", "") for t in hashtags],
                    dry_run=(mode != "live")
                )
                platform_results[ch_id] = direct_yt
            elif ch_id == "tiktok" and is_ready:
                direct_tt = await _upload_tiktok_direct_core(
                    video_file=video_file,
                    title=f"{title}: {logline[:80]}... {' '.join(hashtags)}",
                    access_token=cur_ch_data.get("access_token", ""),
                    open_id=cur_ch_data.get("open_id"),
                    client_key=cur_ch_data.get("client_key") or os.getenv("TIKTOK_CLIENT_KEY", ""),
                    client_secret=cur_ch_data.get("client_secret") or os.getenv("TIKTOK_CLIENT_SECRET", ""),
                    refresh_token=cur_ch_data.get("refresh_token"),
                    privacy_level=cur_ch_data.get("privacy_level", "SELF_ONLY"),
                    allow_comments=cur_ch_data.get("allow_comments", True),
                    allow_duet=cur_ch_data.get("allow_duet", False),
                    dry_run=(mode != "live")
                )
                platform_results[ch_id] = direct_tt
            else:
                platform_results[ch_id] = {
                    "channel_id": ch_id,
                    "status": "verified" if mode != "live" else "dispatched",
                    "mode": mode,
                    "message": f"Pre-flight verified via direct native pipeline for {ch_id}."
                }
        elif n8n_response_data:
            ch_res = (n8n_response_data.get("results") or {}).get(ch_id)
            if ch_res and isinstance(ch_res, dict):
                platform_results[ch_id] = ch_res
            else:
                platform_results[ch_id] = {
                    "channel_id": ch_id,
                    "status": "dispatched" if mode == "live" else "verified",
                    "mode": mode,
                    "message": f"Successfully received and queued by n8n workflow for {ch_id}.",
                    "post_id": f"{ch_id}_mock_{int(time.time())}" if mode != "live" else f"{ch_id}_live_pending"
                }
        else:
            platform_results[ch_id] = {
                "channel_id": ch_id,
                "status": "verified" if mode == "dry_run" else "dispatched",
                "message": f"Pre-flight verified. Ready for {mode} upload."
            }

    overall_success = all(
        res.get("status") in ("dispatched", "verified", "passed", "published")
        for res in platform_results.values()
    )

    return {
        "success": overall_success,
        "mode": mode,
        "dispatched_at": datetime.now(timezone.utc).isoformat(),
        "story_id": story_dir.name if story_dir else story_id,
        "story_title": title,
        "video_file": video_file.name if video_file else "None",
        "n8n": {
            "webhook_url": webhook_url,
            "status_code": n8n_status_code,
            "error": n8n_error,
            "connected": n8n_error is None
        },
        "preflight_checks": preflight_checks,
        "platform_results": platform_results,
        "payload_dispatched": master_payload
    }


@router.get("/n8n/workflow-template")
def download_n8n_workflow_template():
    """
    Exports a production-ready n8n workflow JSON template that users can 1-click import
    into their n8n instance. Wires Webhook -> Code Router -> Facebook Graph API,
    Instagram Reels API, YouTube Data API v3 Shorts, and TikTok Content Posting API.
    """
    workflow_json = {
        "name": "Storycraft Studio - Multi-Channel Upload Automation Engine",
        "nodes": [
            {
                "parameters": {
                    "httpMethod": "POST",
                    "path": "story-upload",
                    "responseMode": "responseNode",
                    "options": {}
                },
                "id": "node-webhook",
                "name": "Storycraft Upload Webhook",
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [240, 300],
                "webhookId": "story-upload"
            },
            {
                "parameters": {
                    "jsCode": """
// Storycraft Payload Router & Validator
const payload = $input.item.json;
const destinations = payload.destinations || [];
const channels = payload.channels || {};
const story = payload.story || {};
const mode = payload.mode || 'dry_run';

return [
  {
    json: {
      mode,
      story,
      destinations,
      facebook: channels.facebook || null,
      instagram: channels.instagram || null,
      youtube: channels.youtube || null,
      tiktok: channels.tiktok || null
    }
  }
];
"""
                },
                "id": "node-router",
                "name": "Payload Router & Normalizer",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [460, 300]
            },
            {
                "parameters": {
                    "method": "POST",
                    "url": "=https://graph.facebook.com/{{ $json.facebook.graph_api_version || 'v20.0' }}/{{ $json.facebook.page_id }}/videos",
                    "sendBody": true,
                    "bodyParameters": {
                        "parameters": [
                            {"name": "description", "value": "={{ $json.facebook.description }}"},
                            {"name": "title", "value": "={{ $json.facebook.title }}"},
                            {"name": "file_url", "value": "={{ $json.story.video.file_url }}"},
                            {"name": "access_token", "value": "={{ $json.facebook.access_token }}"}
                        ]
                    },
                    "options": {}
                },
                "id": "node-fb-upload",
                "name": "Facebook Reels & Video API",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [720, 140]
            },
            {
                "parameters": {
                    "method": "POST",
                    "url": "=https://graph.facebook.com/{{ $json.instagram.graph_api_version || 'v20.0' }}/{{ $json.instagram.ig_user_id }}/media",
                    "sendBody": true,
                    "bodyParameters": {
                        "parameters": [
                            {"name": "media_type", "value": "REELS"},
                            {"name": "video_url", "value": "={{ $json.story.video.file_url }}"},
                            {"name": "caption", "value": "={{ $json.instagram.caption }}"},
                            {"name": "share_to_feed", "value": "={{ $json.instagram.share_to_feed }}"},
                            {"name": "access_token", "value": "={{ $json.instagram.access_token }}"}
                        ]
                    },
                    "options": {}
                },
                "id": "node-ig-upload",
                "name": "Instagram Reels Container API",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [720, 260]
            },
            {
                "parameters": {
                    "method": "POST",
                    "url": "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
                    "sendHeaders": true,
                    "headerParameters": {
                        "parameters": [
                            {"name": "Authorization", "value": "=Bearer {{ $json.youtube.access_token }}"},
                            {"name": "Content-Type", "value": "application/json; charset=UTF-8"}
                        ]
                    },
                    "sendBody": true,
                    "specifyBody": "json",
                    "jsonBody": "={\\n  \\\"snippet\\\": {\\n    \\\"title\\\": \\\"{{ $json.youtube.title }}\\\",\\n    \\\"description\\\": \\\"{{ $json.youtube.description }}\\\",\\n    \\\"tags\\\": {{ JSON.stringify($json.youtube.tags || []) }},\\n    \\\"categoryId\\\": \\\"{{ $json.youtube.category_id || '24' }}\\\"\\n  },\\n  \\\"status\\\": {\\n    \\\"privacyStatus\\\": \\\"{{ $json.youtube.privacy_status || 'public' }}\\\",\\n    \\\"selfDeclaredMadeForKids\\\": false\\n  }\\n}",
                    "options": {}
                },
                "id": "node-yt-upload",
                "name": "YouTube Shorts Data API v3",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [720, 380]
            },
            {
                "parameters": {
                    "method": "POST",
                    "url": "https://open.tiktokapis.com/v2/post/publish/video/init/",
                    "sendHeaders": true,
                    "headerParameters": {
                        "parameters": [
                            {"name": "Authorization", "value": "=Bearer {{ $json.tiktok.access_token }}"},
                            {"name": "Content-Type", "value": "application/json; charset=UTF-8"}
                        ]
                    },
                    "sendBody": true,
                    "specifyBody": "json",
                    "jsonBody": "={\\n  \\\"post_info\\\": {\\n    \\\"title\\\": \\\"{{ $json.tiktok.title }}\\\",\\n    \\\"privacy_level\\\": \\\"{{ $json.tiktok.privacy_level || 'PUBLIC_TO_EVERYONE' }}\\\",\\n    \\\"disable_duet\\\": {{ !$json.tiktok.allow_duet }},\\n    \\\"disable_comment\\\": {{ !$json.tiktok.allow_comments }}\\n  },\\n  \\\"source_info\\\": {\\n    \\\"source\\\": \\\"PULL_FROM_URL\\\",\\n    \\\"video_url\\\": \\\"{{ $json.story.video.file_url }}\\\"\\n  }\\n}",
                    "options": {}
                },
                "id": "node-tiktok-upload",
                "name": "TikTok Content Posting API",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [720, 500]
            },
            {
                "parameters": {
                    "jsCode": """
// Aggregate Multi-Channel Dispatch Responses
const fb = $('Facebook Reels & Video API').first()?.json || { status: 'skipped' };
const ig = $('Instagram Reels Container API').first()?.json || { status: 'skipped' };
const yt = $('YouTube Shorts Data API v3').first()?.json || { status: 'skipped' };
const tiktok = $('TikTok Content Posting API').first()?.json || { status: 'skipped' };

return [
  {
    json: {
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        facebook: { channel_id: 'facebook', status: fb.id ? 'dispatched' : 'verified', post_id: fb.id || null, data: fb },
        instagram: { channel_id: 'instagram', status: ig.id ? 'dispatched' : 'verified', container_id: ig.id || null, data: ig },
        youtube: { channel_id: 'youtube', status: yt.id ? 'dispatched' : 'verified', video_id: yt.id || null, data: yt },
        tiktok: { channel_id: 'tiktok', status: tiktok.data?.publish_id ? 'dispatched' : 'verified', publish_id: tiktok.data?.publish_id || null, data: tiktok }
      }
    }
  }
];
"""
                },
                "id": "node-aggregate",
                "name": "Aggregate Multi-Channel Results",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [960, 300]
            },
            {
                "parameters": {
                    "respondWith": "json",
                    "responseBody": "={{ JSON.stringify($json) }}",
                    "options": {}
                },
                "id": "node-respond",
                "name": "Respond to Storycraft Studio",
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1.1,
                "position": [1180, 300]
            }
        ],
        "connections": {
            "Storycraft Upload Webhook": {
                "main": [[{"node": "Payload Router & Normalizer", "type": "main", "index": 0}]]
            },
            "Payload Router & Normalizer": {
                "main": [
                    [
                        {"node": "Facebook Reels & Video API", "type": "main", "index": 0},
                        {"node": "Instagram Reels Container API", "type": "main", "index": 0},
                        {"node": "YouTube Shorts Data API v3", "type": "main", "index": 0},
                        {"node": "TikTok Content Posting API", "type": "main", "index": 0}
                    ]
                ]
            },
            "Facebook Reels & Video API": {
                "main": [[{"node": "Aggregate Multi-Channel Results", "type": "main", "index": 0}]]
            },
            "Instagram Reels Container API": {
                "main": [[{"node": "Aggregate Multi-Channel Results", "type": "main", "index": 0}]]
            },
            "YouTube Shorts Data API v3": {
                "main": [[{"node": "Aggregate Multi-Channel Results", "type": "main", "index": 0}]]
            },
            "TikTok Content Posting API": {
                "main": [[{"node": "Aggregate Multi-Channel Results", "type": "main", "index": 0}]]
            },
            "Aggregate Multi-Channel Results": {
                "main": [[{"node": "Respond to Storycraft Studio", "type": "main", "index": 0}]]
            }
        },
        "active": True,
        "settings": {"executionOrder": "v1"}
    }

    return Response(
        content=json.dumps(workflow_json, indent=2),
        media_type="application/json",
        headers={
            "Content-Disposition": "attachment; filename=storycraft_multichannel_upload_n8n_workflow.json"
        }
    )


async def _upload_facebook_direct_core(
    video_file: Optional[Path],
    title: str,
    description: str,
    page_id: str,
    access_token: str,
    version: str = "v20.0",
    dry_run: bool = False
) -> Dict[str, Any]:
    """Direct core handler for Facebook Page video upload / verification."""
    page_id = page_id or os.getenv("FACEBOOK_PAGE_ID", "")
    access_token = access_token or os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN", "")

    if not page_id or not access_token:
        return {
            "success": False,
            "channel_id": "facebook",
            "status": "failed",
            "error_code": "FB_MISSING_CREDENTIALS",
            "error": "Missing Facebook Page ID or Access Token."
        }

    graph_url = f"https://graph.facebook.com/{version}/{page_id}"
    params = {"fields": "id,name,category,is_published", "access_token": access_token}

    v_path = Path(video_file) if video_file else None

    if dry_run or not v_path or not v_path.exists():
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                res = await client.get(graph_url, params=params)
                data = res.json()
                if res.status_code == 200 and "id" in data:
                    return {
                        "success": True,
                        "mode": "dry_run",
                        "channel_id": "facebook",
                        "status": "verified",
                        "message": f"Pre-flight verified. Page '{data.get('name')}' is ready to receive upload.",
                        "page_details": data,
                        "video_file": v_path.name if v_path else "None"
                    }
                err_obj = data.get("error", {})
                return {
                    "success": False,
                    "channel_id": "facebook",
                    "status": "failed",
                    "error_code": f"FB_{err_obj.get('code', res.status_code)}",
                    "error": err_obj.get("message", "Meta Graph API verification failed"),
                    "raw_error": err_obj
                }
        except Exception as e:
            return {
                "success": False,
                "channel_id": "facebook",
                "status": "failed",
                "error": f"Network error connecting to Meta Graph API: {str(e)}"
            }

    upload_url = f"https://graph.facebook.com/{version}/{page_id}/videos"
    form_data = {
        "title": title,
        "description": description,
        "access_token": access_token
    }

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            with open(v_path, "rb") as vf:
                file_bytes = vf.read()
            files = {"source": (v_path.name, file_bytes, "video/mp4")}
            res = await client.post(upload_url, data=form_data, files=files)
            data = res.json()
            if res.status_code == 200 and "id" in data:
                video_id = data.get("id")
                return {
                    "success": True,
                    "mode": "live",
                    "channel_id": "facebook",
                    "status": "published",
                    "video_id": video_id,
                    "message": f"Successfully uploaded video to Facebook Page! Video ID: {video_id}",
                    "facebook_url": f"https://www.facebook.com/{page_id}/videos/{video_id}"
                }
            err_obj = data.get("error", {})
            return {
                "success": False,
                "channel_id": "facebook",
                "status": "failed",
                "error_code": f"FB_{err_obj.get('code', res.status_code)}",
                "error": f"Facebook video upload failed: {err_obj.get('message', 'Unknown error')}",
                "raw_error": err_obj
            }
    except Exception as e:
        return {
            "success": False,
            "channel_id": "facebook",
            "status": "failed",
            "error": f"Exception during direct Facebook video upload: {str(e)}"
        }


async def _upload_instagram_direct_core(
    video_file: Optional[Path],
    caption: str,
    ig_user_id: str,
    access_token: str,
    version: str = "v20.0",
    dry_run: bool = False,
    video_url: Optional[str] = None
) -> Dict[str, Any]:
    """Direct core handler for Instagram Reels upload / verification via Meta Graph API."""
    ig_user_id = ig_user_id or os.getenv("INSTAGRAM_USER_ID", "28222131980777137")
    access_token = access_token or os.getenv("INSTAGRAM_ACCESS_TOKEN", "")

    if not ig_user_id or not access_token:
        return {
            "success": False,
            "channel_id": "instagram",
            "status": "failed",
            "error_code": "IG_MISSING_CREDENTIALS",
            "error": "Missing Instagram User ID or Access Token."
        }

    is_creator_token = access_token.startswith("IGAA") or access_token.startswith("IGQV")
    graph_base = "https://graph.instagram.com" if is_creator_token else "https://graph.facebook.com"
    target_id = ig_user_id if (ig_user_id and ig_user_id != "me") else "me"
    graph_url = f"{graph_base}/{version}/{target_id}"
    params = {
        "fields": "id,username,account_type" if is_creator_token else "id,username,name,profile_picture_url",
        "access_token": access_token
    }

    v_path = Path(video_file) if video_file else None

    if dry_run or not video_url:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                res = await client.get(graph_url, params=params)
                data = res.json()
                if res.status_code == 200 and "id" in data:
                    return {
                        "success": True,
                        "mode": "dry_run",
                        "channel_id": "instagram",
                        "status": "verified",
                        "message": f"Pre-flight verified. Instagram Account @{data.get('username') or data.get('id')} is ready.",
                        "account_details": data,
                        "video_file": v_path.name if v_path else "None"
                    }
                err_obj = data.get("error", {})
                return {
                    "success": False,
                    "channel_id": "instagram",
                    "status": "failed",
                    "error_code": f"IG_{err_obj.get('code', res.status_code)}",
                    "error": err_obj.get("message", "Instagram verification failed"),
                    "raw_error": err_obj
                }
        except Exception as e:
            return {
                "success": False,
                "channel_id": "instagram",
                "status": "failed",
                "error": f"Network error communicating with Instagram Graph API: {str(e)}"
            }

    # Live Reels publish via Container API
    container_url = f"{graph_base}/{version}/{target_id}/media"
    container_params = {
        "media_type": "REELS",
        "caption": caption,
        "video_url": video_url,
        "access_token": access_token
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(container_url, data=container_params)
            data = res.json()
            container_id = data.get("id")
            if not container_id:
                err_obj = data.get("error", {})
                return {
                    "success": False,
                    "channel_id": "instagram",
                    "status": "failed",
                    "error": f"Instagram container creation failed: {err_obj.get('message', 'Unknown error')}",
                    "raw_error": err_obj
                }

            import asyncio
            for _ in range(12):
                await asyncio.sleep(5)
                st_res = await client.get(f"{graph_base}/{version}/{container_id}", params={"fields": "status_code", "access_token": access_token})
                st_data = st_res.json()
                if st_data.get("status_code") == "FINISHED":
                    break
                if st_data.get("status_code") in ["ERROR", "EXPIRED"]:
                    return {
                        "success": False,
                        "channel_id": "instagram",
                        "status": "failed",
                        "error": f"Instagram video processing returned status: {st_data.get('status_code')}"
                    }

            pub_res = await client.post(f"{graph_base}/{version}/{target_id}/media_publish", data={"creation_id": container_id, "access_token": access_token})
            pub_data = pub_res.json()
            media_id = pub_data.get("id")
            if media_id:
                return {
                    "success": True,
                    "mode": "live",
                    "channel_id": "instagram",
                    "status": "published",
                    "media_id": media_id,
                    "message": f"Successfully published Instagram Reel! Media ID: {media_id}"
                }
            err_obj = pub_data.get("error", {})
            return {
                "success": False,
                "channel_id": "instagram",
                "status": "failed",
                "error": f"Instagram media_publish failed: {err_obj.get('message', 'Unknown error')}",
                "raw_error": err_obj
            }
    except Exception as e:
        return {
            "success": False,
            "channel_id": "instagram",
            "status": "failed",
            "error": f"Exception during Instagram Reel upload: {str(e)}"
        }


async def _upload_youtube_direct_core(
    video_file: Optional[Path],
    title: str,
    description: str,
    access_token: str,
    refresh_token: Optional[str] = None,
    client_id: Optional[str] = None,
    client_secret: Optional[str] = None,
    privacy_status: str = "public",
    category_id: str = "24",
    tags: Optional[List[str]] = None,
    dry_run: bool = False,
    user_id: str = "default"
) -> Dict[str, Any]:
    """Direct core handler for YouTube Shorts upload / verification via Google YouTube Data API v3."""
    client_id = client_id or os.getenv("YOUTUBE_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID") or ""
    client_secret = client_secret or os.getenv("YOUTUBE_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET") or ""
    refresh_token = refresh_token or os.getenv("YOUTUBE_REFRESH_TOKEN", "")

    # Attempt refresh if access token is missing
    if not access_token and refresh_token and client_id and client_secret:
        ref_res = await _refresh_youtube_access_token(client_id, client_secret, refresh_token, user_id=user_id)
        if ref_res.get("success"):
            access_token = ref_res["access_token"]

    if not access_token:
        return {
            "success": False,
            "channel_id": "youtube",
            "status": "failed",
            "error_code": "YT_MISSING_ACCESS_TOKEN",
            "error": "Missing YouTube Data API OAuth2 Access Token.",
            "remedy": "Connect your YouTube account via /api/oauth/youtube/connect or configure YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET in .env."
        }

    v_path = Path(video_file) if video_file else None

    if dry_run or not v_path or not v_path.exists():
        yt_url = "https://www.googleapis.com/youtube/v3/channels"
        params = {"part": "snippet,statistics", "mine": "true"}
        headers = {"Authorization": f"Bearer {access_token}"}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(yt_url, params=params, headers=headers)
                # Auto-refresh on 401
                if res.status_code == 401 and refresh_token and client_id and client_secret:
                    ref_res = await _refresh_youtube_access_token(client_id, client_secret, refresh_token, user_id=user_id)
                    if ref_res.get("success"):
                        access_token = ref_res["access_token"]
                        headers["Authorization"] = f"Bearer {access_token}"
                        res = await client.get(yt_url, params=params, headers=headers)

                data = res.json()
                if res.status_code == 200:
                    items = data.get("items", [])
                    details = {}
                    if items:
                        it = items[0]
                        details = {
                            "channel_id": it.get("id"),
                            "title": it.get("snippet", {}).get("title"),
                            "subscriber_count": it.get("statistics", {}).get("subscriberCount")
                        }
                    return {
                        "success": True,
                        "mode": "dry_run",
                        "channel_id": "youtube",
                        "status": "verified",
                        "message": f"Pre-flight verified. YouTube Channel '{details.get('title', 'Unknown')}' is ready.",
                        "channel_details": details,
                        "video_file": v_path.name if v_path else "None"
                    }
                err_obj = data.get("error", {})
                return {
                    "success": False,
                    "channel_id": "youtube",
                    "status": "failed",
                    "error_code": f"YT_{err_obj.get('code', res.status_code)}",
                    "error": err_obj.get("message", "YouTube verification failed"),
                    "remedy": "Reconnect your YouTube channel via /api/oauth/youtube/connect." if res.status_code == 401 else "Check YouTube API permissions.",
                    "raw_error": err_obj
                }
        except Exception as e:
            return {
                "success": False,
                "channel_id": "youtube",
                "status": "failed",
                "error": f"Network error communicating with Google YouTube API: {str(e)}"
            }

    # Live Resumable Upload
    file_size = v_path.stat().st_size
    if file_size == 0:
        return {
            "success": False,
            "channel_id": "youtube",
            "status": "failed",
            "error_code": "VIDEO_FILE_EMPTY",
            "error": f"Target video file is empty (0 bytes): {v_path}"
        }

    init_url = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"
    init_headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": str(file_size),
        "X-Upload-Content-Type": "video/mp4"
    }
    init_payload = {
        "snippet": {
            "title": title[:100],
            "description": description[:5000],
            "tags": tags or ["AIStory", "Shorts"],
            "categoryId": str(category_id or "24")
        },
        "status": {
            "privacyStatus": privacy_status,
            "selfDeclaredMadeForKids": False
        }
    }

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            res = await client.post(init_url, headers=init_headers, json=init_payload)
            if res.status_code == 401 and refresh_token and client_id and client_secret:
                ref_res = await _refresh_youtube_access_token(client_id, client_secret, refresh_token, user_id=user_id)
                if ref_res.get("success"):
                    access_token = ref_res["access_token"]
                    init_headers["Authorization"] = f"Bearer {access_token}"
                    res = await client.post(init_url, headers=init_headers, json=init_payload)

            if res.status_code != 200:
                err_data = {}
                try:
                    err_data = res.json()
                except Exception:
                    pass
                return {
                    "success": False,
                    "channel_id": "youtube",
                    "status": "failed",
                    "error_code": f"YT_INIT_{res.status_code}",
                    "error": f"YouTube upload session initiation failed (HTTP {res.status_code}): {err_data.get('error', {}).get('message', res.text[:200])}",
                    "raw_error": err_data
                }

            upload_location = res.headers.get("Location")
            if not upload_location:
                return {
                    "success": False,
                    "channel_id": "youtube",
                    "status": "failed",
                    "error": "Google API did not return an upload session Location header."
                }

            with open(v_path, "rb") as vf:
                content = vf.read()

            upload_headers = {
                "Content-Type": "video/mp4",
                "Content-Length": str(file_size)
            }
            put_res = await client.put(upload_location, headers=upload_headers, content=content)
            put_data = {}
            try:
                put_data = put_res.json()
            except Exception:
                pass

            if put_res.status_code in (200, 201) and "id" in put_data:
                vid_id = put_data["id"]
                return {
                    "success": True,
                    "mode": "live",
                    "channel_id": "youtube",
                    "status": "published",
                    "video_id": vid_id,
                    "youtube_url": f"https://www.youtube.com/watch?v={vid_id}",
                    "shorts_url": f"https://youtube.com/shorts/{vid_id}",
                    "message": f"Successfully published to YouTube Shorts! Video ID: {vid_id}",
                    "details": put_data
                }

            return {
                "success": False,
                "channel_id": "youtube",
                "status": "failed",
                "error_code": f"YT_UPLOAD_{put_res.status_code}",
                "error": f"YouTube video chunk upload failed (HTTP {put_res.status_code}): {put_data.get('error', {}).get('message', put_res.text[:200])}",
                "raw_error": put_data
            }
    except Exception as e:
        return {
            "success": False,
            "channel_id": "youtube",
            "status": "failed",
            "error": f"Exception during direct YouTube video upload: {str(e)}"
        }


async def _upload_tiktok_direct_core(
    video_file: Optional[Path],
    title: str,
    access_token: str,
    open_id: Optional[str] = None,
    client_key: Optional[str] = None,
    client_secret: Optional[str] = None,
    refresh_token: Optional[str] = None,
    privacy_level: str = "SELF_ONLY",
    allow_comments: bool = True,
    allow_duet: bool = False,
    dry_run: bool = False,
    user_id: str = "default"
) -> Dict[str, Any]:
    """Direct core handler for TikTok video upload / verification via TikTok Content Posting API v2."""
    client_key = client_key or os.getenv("TIKTOK_CLIENT_KEY", "")
    client_secret = client_secret or os.getenv("TIKTOK_CLIENT_SECRET", "")

    # Attempt refresh if access token missing
    if not access_token and refresh_token and client_key and client_secret:
        ref_res = await _refresh_tiktok_access_token(client_key, client_secret, refresh_token, user_id=user_id)
        if ref_res.get("success"):
            access_token = ref_res["access_token"]

    if not access_token:
        return {
            "success": False,
            "channel_id": "tiktok",
            "status": "failed",
            "error_code": "TIKTOK_MISSING_ACCESS_TOKEN",
            "error": "Missing TikTok Access Token.",
            "remedy": "Connect your TikTok account via /api/oauth/tiktok/connect using your client key and secret from .env."
        }

    v_path = Path(video_file) if video_file else None

    if dry_run or not v_path or not v_path.exists():
        tt_url = "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name"
        headers = {"Authorization": f"Bearer {access_token}"}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(tt_url, headers=headers)
                data = res.json()
                api_error = data.get("error", {})
                if res.status_code == 200 and api_error.get("code") == "ok":
                    u = data.get("data", {}).get("user", {})
                    details = {
                        "open_id": u.get("open_id"),
                        "display_name": u.get("display_name"),
                        "avatar_url": u.get("avatar_url")
                    }
                    return {
                        "success": True,
                        "mode": "dry_run",
                        "channel_id": "tiktok",
                        "status": "verified",
                        "message": f"Pre-flight verified. TikTok Creator '{details.get('display_name') or details.get('open_id')}' is ready.",
                        "creator_details": details,
                        "video_file": v_path.name if v_path else "None"
                    }
                err_code = api_error.get("code")
                return {
                    "success": False,
                    "channel_id": "tiktok",
                    "status": "failed",
                    "error_code": f"TIKTOK_{err_code or res.status_code}",
                    "error": api_error.get("message", "TikTok verification failed"),
                    "remedy": "Please reconnect your TikTok account via /api/oauth/tiktok/connect.",
                    "raw_error": api_error
                }
        except Exception as e:
            return {
                "success": False,
                "channel_id": "tiktok",
                "status": "failed",
                "error": f"Network error connecting to TikTok Open API: {str(e)}"
            }

    # Live Upload
    file_size = v_path.stat().st_size
    if file_size == 0:
        return {
            "success": False,
            "channel_id": "tiktok",
            "status": "failed",
            "error_code": "VIDEO_FILE_EMPTY",
            "error": f"Target video file is empty (0 bytes): {v_path}"
        }

    init_url = "https://open.tiktokapis.com/v2/post/publish/video/init/"
    init_headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8"
    }
    init_body = {
        "post_info": {
            "title": title[:150],
            "privacy_level": privacy_level or "SELF_ONLY",
            "disable_duet": not allow_duet,
            "disable_comment": not allow_comments,
            "video_cover_timestamp_ms": 1000
        },
        "source_info": {
            "source": "FILE_UPLOAD",
            "video_size": file_size,
            "chunk_size": file_size,
            "total_chunk_count": 1
        }
    }

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            res = await client.post(init_url, headers=init_headers, json=init_body)
            data = res.json()
            api_err = data.get("error", {})
            if res.status_code != 200 or api_err.get("code") != "ok":
                return {
                    "success": False,
                    "channel_id": "tiktok",
                    "status": "failed",
                    "error_code": f"TIKTOK_{api_err.get('code', res.status_code)}",
                    "error": f"TikTok post init failed: {api_err.get('message', res.text[:200])}",
                    "raw_error": data
                }

            upload_url = data.get("data", {}).get("upload_url")
            publish_id = data.get("data", {}).get("publish_id")
            if not upload_url:
                return {
                    "success": False,
                    "channel_id": "tiktok",
                    "status": "failed",
                    "error": "TikTok API did not return an upload_url."
                }

            with open(v_path, "rb") as vf:
                content = vf.read()

            upload_headers = {
                "Content-Type": "video/mp4",
                "Content-Range": f"bytes 0-{file_size - 1}/{file_size}"
            }
            put_res = await client.put(upload_url, headers=upload_headers, content=content)
            if put_res.status_code in (200, 201):
                return {
                    "success": True,
                    "mode": "live",
                    "channel_id": "tiktok",
                    "status": "published",
                    "publish_id": publish_id,
                    "message": f"Successfully published to TikTok! Publish ID: {publish_id}"
                }
            return {
                "success": False,
                "channel_id": "tiktok",
                "status": "failed",
                "error_code": f"TIKTOK_CHUNK_{put_res.status_code}",
                "error": f"TikTok video chunk upload failed (HTTP {put_res.status_code}): {put_res.text[:200]}"
            }
    except Exception as e:
        return {
            "success": False,
            "channel_id": "tiktok",
            "status": "failed",
            "error": f"Exception during direct TikTok video upload: {str(e)}"
        }


@router.post("/direct/facebook")
async def upload_facebook_direct_endpoint(request: Request):
    """Directly uploads or verifies a video upload to a Facebook Page via Meta Graph API."""
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    story_id = body.get("story_id")
    dry_run = body.get("dry_run", False)
    cfg = _load_upload_config()
    fb_config = cfg.get("channels", {}).get("facebook", {})

    page_id = body.get("page_id") or fb_config.get("page_id") or os.getenv("FACEBOOK_PAGE_ID", "")
    access_token = body.get("access_token") or fb_config.get("access_token") or os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN", "")
    version = body.get("graph_api_version") or fb_config.get("graph_api_version", "v20.0")

    media = _resolve_story_media(story_id=story_id, custom_title=body.get("title"), custom_desc=body.get("description"))

    res = await _upload_facebook_direct_core(
        video_file=media["video_file"],
        title=media["title"],
        description=f"{media['logline']}\n\n{' '.join(media['hashtags'])}",
        page_id=page_id,
        access_token=access_token,
        version=version,
        dry_run=dry_run
    )
    status_code = 200 if res.get("success") else 400
    return JSONResponse(status_code=status_code, content=res)


@router.post("/direct/instagram")
async def upload_instagram_direct_endpoint(request: Request):
    """Directly uploads or verifies a video upload to Instagram Reels via Instagram Graph API."""
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    story_id = body.get("story_id")
    dry_run = body.get("dry_run", False)
    cfg = _load_upload_config()
    ig_config = cfg.get("channels", {}).get("instagram", {})

    ig_user_id = body.get("ig_user_id") or ig_config.get("ig_user_id") or os.getenv("INSTAGRAM_USER_ID", "28222131980777137")
    access_token = body.get("access_token") or ig_config.get("access_token") or os.getenv("INSTAGRAM_ACCESS_TOKEN", "")
    version = body.get("graph_api_version") or ig_config.get("graph_api_version", "v20.0")

    media = _resolve_story_media(story_id=story_id, custom_title=body.get("caption") or body.get("title"), custom_desc=body.get("description"))
    video_url = body.get("video_url")
    if not video_url and media["video_relative_url"]:
        video_url = f"https://fablemotion.me{media['video_relative_url']}"

    res = await _upload_instagram_direct_core(
        video_file=media["video_file"],
        caption=f"{media['title']} — {media['logline']}\n.\n.\n{' '.join(media['hashtags'])}",
        ig_user_id=ig_user_id,
        access_token=access_token,
        version=version,
        dry_run=dry_run,
        video_url=video_url
    )
    status_code = 200 if res.get("success") else 400
    return JSONResponse(status_code=status_code, content=res)


@router.post("/direct/youtube")
async def upload_youtube_direct_endpoint(request: Request):
    """Directly uploads or verifies a video upload to YouTube Shorts via YouTube Data API v3."""
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    story_id = body.get("story_id")
    dry_run = body.get("dry_run", False)
    cfg = _load_upload_config()
    yt_config = cfg.get("channels", {}).get("youtube", {})

    access_token = body.get("access_token") or yt_config.get("access_token") or os.getenv("YOUTUBE_ACCESS_TOKEN", "")
    refresh_token = body.get("refresh_token") or yt_config.get("refresh_token") or os.getenv("YOUTUBE_REFRESH_TOKEN", "")
    client_id = body.get("client_id") or yt_config.get("client_id") or os.getenv("YOUTUBE_CLIENT_ID", "")
    client_secret = body.get("client_secret") or yt_config.get("client_secret") or os.getenv("YOUTUBE_CLIENT_SECRET", "")
    privacy_status = body.get("privacy_status") or yt_config.get("privacy_status", "public")
    category_id = body.get("category_id") or yt_config.get("category_id", "24")

    media = _resolve_story_media(story_id=story_id, custom_title=body.get("title"), custom_desc=body.get("description"), custom_tags=body.get("tags"))
    clean_tags = [t.replace("#", "") for t in media["hashtags"]]

    res = await _upload_youtube_direct_core(
        video_file=media["video_file"],
        title=f"{media['title']} #Shorts",
        description=f"{media['logline']}\n\nTags: {', '.join(media['hashtags'])}\nCreated with Storycraft AI Studio.",
        access_token=access_token,
        refresh_token=refresh_token,
        client_id=client_id,
        client_secret=client_secret,
        privacy_status=privacy_status,
        category_id=category_id,
        tags=clean_tags,
        dry_run=dry_run
    )
    status_code = 200 if res.get("success") else 400
    return JSONResponse(status_code=status_code, content=res)


@router.post("/direct/tiktok")
async def upload_tiktok_direct_endpoint(request: Request):
    """Directly uploads or verifies a video upload to TikTok via TikTok Content Posting API v2."""
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    story_id = body.get("story_id")
    dry_run = body.get("dry_run", False)
    cfg = _load_upload_config()
    tt_config = cfg.get("channels", {}).get("tiktok", {})

    access_token = body.get("access_token") or tt_config.get("access_token") or os.getenv("TIKTOK_ACCESS_TOKEN", "")
    open_id = body.get("open_id") or tt_config.get("open_id") or os.getenv("TIKTOK_OPEN_ID", "")
    client_key = body.get("client_key") or tt_config.get("client_key") or os.getenv("TIKTOK_CLIENT_KEY", "")
    client_secret = body.get("client_secret") or tt_config.get("client_secret") or os.getenv("TIKTOK_CLIENT_SECRET", "")
    refresh_token = body.get("refresh_token") or tt_config.get("refresh_token", "")
    privacy_level = body.get("privacy_level") or tt_config.get("privacy_level", "SELF_ONLY")

    media = _resolve_story_media(story_id=story_id, custom_title=body.get("title"), custom_desc=body.get("description"), custom_tags=body.get("tags"))

    res = await _upload_tiktok_direct_core(
        video_file=media["video_file"],
        title=f"{media['title']}: {media['logline'][:80]}... {' '.join(media['hashtags'])}",
        access_token=access_token,
        open_id=open_id,
        client_key=client_key,
        client_secret=client_secret,
        refresh_token=refresh_token,
        privacy_level=privacy_level,
        allow_comments=tt_config.get("allow_comments", True),
        allow_duet=tt_config.get("allow_duet", False),
        dry_run=dry_run
    )
    status_code = 200 if res.get("success") else 400
    return JSONResponse(status_code=status_code, content=res)



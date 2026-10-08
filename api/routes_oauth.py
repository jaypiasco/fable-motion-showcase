"""
Multi-User OAuth Connect & Callback API Routes for Social Media.
Supports:
1. YouTube Shorts (Google OAuth 2.0)
2. Meta (Facebook Pages & Instagram Reels via Meta Graph API)
3. TikTok (TikTok Content Posting API v2)

Handles multi-user token persistence, token exchange, and account status.
"""

import os
import json
import base64
import urllib.parse
import secrets
import hashlib
from typing import Optional, Dict, Any
import requests
from fastapi import APIRouter, Query, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel

from core.logger import logger
from api.oauth_storage import (
    save_user_token,
    get_user_token,
    delete_user_token,
    list_user_accounts,
    list_all_oauth_users,
)

router = APIRouter(prefix="/api/oauth", tags=["Social Media Multi-User OAuth"])


def _generate_pkce_pair():
    """Generates a high-entropy code_verifier and S256 code_challenge for PKCE."""
    # code_verifier must be between 43 and 128 characters
    code_verifier = secrets.token_urlsafe(64)
    hashed = hashlib.sha256(code_verifier.encode("ascii")).digest()
    code_challenge = base64.urlsafe_b64encode(hashed).decode("ascii").rstrip("=")
    return code_verifier, code_challenge


def _encode_state(user_id: str, redirect_to: str, extra: Optional[Dict[str, Any]] = None) -> str:
    """Encodes user_id, target redirect URL, and optional metadata into an OAuth state parameter."""
    payload = {"user_id": user_id, "redirect_to": redirect_to}
    if extra:
        payload.update(extra)
    return base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")


def _decode_state(state: Optional[str]) -> Dict[str, Any]:
    """Decodes user_id and metadata from an OAuth state parameter."""
    default = {"user_id": "default", "redirect_to": "/upload"}
    if not state:
        return default
    try:
        decoded = base64.urlsafe_b64decode(state.encode("utf-8")).decode("utf-8")
        parsed = json.loads(decoded)
        if isinstance(parsed, dict):
            if "user_id" not in parsed:
                parsed["user_id"] = "default"
            if "redirect_to" not in parsed:
                parsed["redirect_to"] = "/upload"
            return parsed
        return default
    except Exception:
        # If state is a raw user_id string
        return {"user_id": state, "redirect_to": "/upload"}


def _get_redirect_uri(request: Request, platform: str) -> str:
    """
    Safely resolves the OAuth redirect URI for a given platform.
    Priority:
    1. Explicit platform env var (e.g. YOUTUBE_REDIRECT_URI, META_REDIRECT_URI, TIKTOK_REDIRECT_URI)
    2. Global public base URL env var (API_BASE_URL, PUBLIC_BASE_URL, BACKEND_URL)
    3. Dynamic request inspection respecting reverse proxies (Cloudflare, Cloud Run)
       - Always forces HTTPS for remote hosts to comply with Google/Meta/TikTok OAuth policy.
    """
    env_key = f"{platform.upper()}_REDIRECT_URI"
    explicit_uri = os.getenv(env_key)
    if explicit_uri and explicit_uri.strip():
        return explicit_uri.strip()

    base_env = os.getenv("API_BASE_URL") or os.getenv("PUBLIC_BASE_URL") or os.getenv("BACKEND_URL")
    if base_env and base_env.strip():
        return f"{base_env.strip().rstrip('/')}/api/oauth/{platform}/callback"

    forwarded_host = request.headers.get("x-forwarded-host")
    host = forwarded_host.split(",")[0].strip() if forwarded_host else (request.headers.get("host") or request.url.netloc)

    forwarded_proto = request.headers.get("x-forwarded-proto")
    proto = forwarded_proto.split(",")[0].strip() if forwarded_proto else request.url.scheme

    # Google and major OAuth providers strictly disallow HTTP for non-localhost
    is_local = any(h in host.lower() for h in ("localhost", "127.0.0.1", "0.0.0.0"))
    if not is_local:
        proto = "https"

    return f"{proto}://{host}/api/oauth/{platform}/callback"


# =====================================================================
# 1. YOUTUBE SHORTS (Google OAuth 2.0)
# =====================================================================

@router.get("/youtube/connect")
def connect_youtube(
    request: Request,
    user_id: str = Query("default", description="User ID or email connecting the account"),
    redirect_to: str = Query("/upload", description="URL to return to in the frontend"),
):
    """Redirects user to Google OAuth consent screen for YouTube upload scopes."""
    client_id = os.getenv("YOUTUBE_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(
            status_code=400,
            detail="YOUTUBE_CLIENT_ID or GOOGLE_CLIENT_ID environment variable is not configured."
        )

    redirect_uri = _get_redirect_uri(request, "youtube")
    state = _encode_state(user_id, redirect_to)

    scopes = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly"

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": scopes,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    return RedirectResponse(auth_url)


@router.get("/youtube/callback")
def youtube_callback(
    request: Request,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
):
    """Handles Google OAuth redirect, exchanges code for tokens, and records channel details."""
    context = _decode_state(state)
    user_id = context["user_id"]
    return_url = context["redirect_to"]

    if error:
        logger.warning(f"[YouTube OAuth] Authorization denied by user {user_id}: {error}")
        return RedirectResponse(f"{return_url}?oauth_error={urllib.parse.quote(error)}&platform=youtube")

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code from Google.")

    client_id = os.getenv("YOUTUBE_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("YOUTUBE_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = _get_redirect_uri(request, "youtube")

    # Exchange code for access & refresh token
    token_url = "https://oauth2.googleapis.com/token"
    token_payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }

    try:
        token_res = requests.post(token_url, data=token_payload, timeout=20)
        token_data = token_res.json()
    except Exception as e:
        logger.error(f"[YouTube OAuth] Token exchange request failed: {e}")
        return RedirectResponse(f"{return_url}?oauth_error=Token+exchange+failed&platform=youtube")

    if "error" in token_data:
        err_msg = token_data.get("error_description") or token_data.get("error")
        logger.error(f"[YouTube OAuth] Google rejected token exchange: {err_msg}")
        return RedirectResponse(f"{return_url}?oauth_error={urllib.parse.quote(err_msg)}&platform=youtube")

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 3600)

    # Fetch YouTube channel info
    channel_name = "YouTube Channel"
    channel_id = ""
    thumbnail = ""
    try:
        ch_res = requests.get(
            "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15
        )
        if ch_res.status_code == 200:
            ch_data = ch_res.json()
            items = ch_data.get("items", [])
            if items:
                snippet = items[0].get("snippet", {})
                channel_id = items[0].get("id", "")
                channel_name = snippet.get("title", "YouTube Channel")
                thumbnail = snippet.get("thumbnails", {}).get("default", {}).get("url", "")
    except Exception as e:
        logger.warning(f"[YouTube OAuth] Failed to fetch channel details: {e}")

    save_user_token(
        user_id=user_id,
        platform="youtube",
        token_data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": expires_in,
            "account_id": channel_id,
            "account_name": channel_name,
            "details": {
                "thumbnail_url": thumbnail,
                "scope": token_data.get("scope", ""),
                "token_type": token_data.get("token_type", "Bearer"),
            }
        }
    )

    return RedirectResponse(f"{return_url}?connected=youtube&account_name={urllib.parse.quote(channel_name)}")


# =====================================================================
# 2. META (Facebook Pages & Instagram Reels via Meta Graph API)
# =====================================================================

@router.get("/meta/connect")
def connect_meta(
    request: Request,
    user_id: str = Query("default", description="User ID connecting the account"),
    redirect_to: str = Query("/upload", description="URL to return to in the frontend"),
):
    """Redirects user to Meta/Facebook OAuth for Facebook Pages & Instagram Reels permissions."""
    app_id = os.getenv("META_APP_ID") or os.getenv("FACEBOOK_APP_ID")
    if not app_id:
        raise HTTPException(
            status_code=400,
            detail="META_APP_ID or FACEBOOK_APP_ID environment variable is not configured."
        )

    redirect_uri = _get_redirect_uri(request, "meta")
    state = _encode_state(user_id, redirect_to)

    # Scopes needed for publishing Reels to Facebook Pages & linked Instagram Professional accounts
    # Note: pages_manage_posts strictly requires pages_read_engagement and pages_show_list
    scopes = "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish"

    params = {
        "client_id": app_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": scopes,
        "state": state,
    }
    auth_url = f"https://www.facebook.com/v20.0/dialog/oauth?{urllib.parse.urlencode(params)}"
    return RedirectResponse(auth_url)


@router.get("/meta/callback")
def meta_callback(
    request: Request,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
):
    """Handles Meta OAuth redirect, exchanges code for long-lived page/IG tokens, and records details."""
    context = _decode_state(state)
    user_id = context["user_id"]
    return_url = context["redirect_to"]

    if error:
        err_text = error_description or error
        logger.warning(f"[Meta OAuth] Authorization denied by user {user_id}: {err_text}")
        return RedirectResponse(f"{return_url}?oauth_error={urllib.parse.quote(err_text)}&platform=meta")

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code from Meta.")

    app_id = os.getenv("META_APP_ID") or os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("META_APP_SECRET") or os.getenv("FACEBOOK_APP_SECRET")
    redirect_uri = _get_redirect_uri(request, "meta")

    # 1. Exchange code for short-lived user token
    token_url = "https://graph.facebook.com/v20.0/oauth/access_token"
    params = {
        "client_id": app_id,
        "client_secret": app_secret,
        "redirect_uri": redirect_uri,
        "code": code,
    }

    try:
        res = requests.get(token_url, params=params, timeout=20)
        token_data = res.json()
    except Exception as e:
        logger.error(f"[Meta OAuth] Short-lived token request failed: {e}")
        return RedirectResponse(f"{return_url}?oauth_error=Meta+token+request+failed&platform=meta")

    if "error" in token_data:
        err_msg = token_data["error"].get("message", "Token error")
        logger.error(f"[Meta OAuth] Meta token error: {err_msg}")
        return RedirectResponse(f"{return_url}?oauth_error={urllib.parse.quote(err_msg)}&platform=meta")

    short_token = token_data.get("access_token")

    # 2. Exchange short-lived token for 60-day long-lived user token
    long_params = {
        "grant_type": "fb_exchange_token",
        "client_id": app_id,
        "client_secret": app_secret,
        "fb_exchange_token": short_token,
    }
    long_user_token = short_token
    expires_in = token_data.get("expires_in", 5184000)
    try:
        long_res = requests.get(token_url, params=long_params, timeout=20)
        long_data = long_res.json()
        if "access_token" in long_data:
            long_user_token = long_data["access_token"]
            expires_in = long_data.get("expires_in", 5184000)
    except Exception as e:
        logger.warning(f"[Meta OAuth] Could not exchange for long-lived token: {e}")

    # 3. Retrieve user's Facebook Pages and linked Instagram accounts
    page_id = ""
    page_name = "Meta Creator Account"
    page_token = long_user_token
    ig_user_id = ""
    ig_username = ""

    try:
        pages_res = requests.get(
            "https://graph.facebook.com/v20.0/me/accounts",
            params={
                "fields": "id,name,access_token,instagram_business_account{id,username,profile_picture_url}",
                "access_token": long_user_token,
            },
            timeout=15,
        )
        if pages_res.status_code == 200:
            accounts_data = pages_res.json().get("data", [])
            if accounts_data:
                first_page = accounts_data[0]
                page_id = first_page.get("id", "")
                page_name = first_page.get("name", "Facebook Page")
                page_token = first_page.get("access_token", long_user_token)

                # Check linked Instagram account
                ig_account = first_page.get("instagram_business_account")
                if ig_account:
                    ig_user_id = ig_account.get("id", "")
                    ig_username = ig_account.get("username", "")
    except Exception as e:
        logger.warning(f"[Meta OAuth] Error reading user pages: {e}")

    account_display = f"{page_name}" + (f" / @{ig_username}" if ig_username else "")

    save_user_token(
        user_id=user_id,
        platform="meta",
        token_data={
            "access_token": page_token,
            "refresh_token": long_user_token,
            "expires_in": expires_in,
            "account_id": page_id,
            "account_name": account_display,
            "details": {
                "facebook_page_id": page_id,
                "facebook_page_name": page_name,
                "instagram_user_id": ig_user_id,
                "instagram_username": ig_username,
            }
        }
    )

    return RedirectResponse(f"{return_url}?connected=meta&account_name={urllib.parse.quote(account_display)}")


# =====================================================================
# 3. TIKTOK (Content Posting API v2 / Login Kit)
# =====================================================================

@router.get("/tiktok/connect")
def connect_tiktok(
    request: Request,
    user_id: str = Query("default", description="User ID connecting the account"),
    redirect_to: str = Query("/upload", description="URL to return to in the frontend"),
):
    """Redirects user to TikTok OAuth consent for video.upload and video.publish permissions."""
    client_key = os.getenv("TIKTOK_CLIENT_KEY")
    if not client_key:
        raise HTTPException(
            status_code=400,
            detail="TIKTOK_CLIENT_KEY environment variable is not configured."
        )

    redirect_uri = _get_redirect_uri(request, "tiktok")
    logger.info(f"[TikTok OAuth] Initiating connect with redirect_uri: {redirect_uri}")
    code_verifier, code_challenge = _generate_pkce_pair()
    state = _encode_state(user_id, redirect_to, extra={"code_verifier": code_verifier})

    # Scopes needed for uploading and publishing direct videos
    scopes = "user.info.basic,video.upload,video.publish"

    params = {
        "client_key": client_key,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": scopes,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    auth_url = f"https://www.tiktok.com/v2/auth/authorize/?{urllib.parse.urlencode(params)}"
    return RedirectResponse(auth_url)


@router.get("/tiktok/callback")
def tiktok_callback(
    request: Request,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
):
    """Handles TikTok OAuth redirect, exchanges code for tokens, and records account profile."""
    context = _decode_state(state)
    user_id = context.get("user_id", "default")
    return_url = context.get("redirect_to", "/upload")
    code_verifier = context.get("code_verifier")

    if error:
        err_text = error_description or error
        logger.warning(f"[TikTok OAuth] Authorization denied by user {user_id}: {err_text}")
        return RedirectResponse(f"{return_url}?oauth_error={urllib.parse.quote(err_text)}&platform=tiktok")

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code from TikTok.")

    client_key = os.getenv("TIKTOK_CLIENT_KEY")
    client_secret = os.getenv("TIKTOK_CLIENT_SECRET")
    redirect_uri = _get_redirect_uri(request, "tiktok")

    # Exchange code for access & refresh token
    token_url = "https://open.tiktokapis.com/v2/oauth/token/"
    payload = {
        "client_key": client_key,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }
    if code_verifier:
        payload["code_verifier"] = code_verifier
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    try:
        token_res = requests.post(token_url, data=payload, headers=headers, timeout=20)
        token_data = token_res.json()
    except Exception as e:
        logger.error(f"[TikTok OAuth] Token request failed: {e}")
        return RedirectResponse(f"{return_url}?oauth_error=TikTok+token+request+failed&platform=tiktok")

    if "error" in token_data or token_data.get("message") == "error":
        err_msg = token_data.get("error_description") or token_data.get("message", "Token error")
        logger.error(f"[TikTok OAuth] TikTok token error: {err_msg}")
        return RedirectResponse(f"{return_url}?oauth_error={urllib.parse.quote(err_msg)}&platform=tiktok")

    data_payload = token_data.get("data", token_data)
    access_token = data_payload.get("access_token")
    refresh_token = data_payload.get("refresh_token")
    open_id = data_payload.get("open_id", "")
    expires_in = data_payload.get("expires_in", 86400)

    # Fetch TikTok user profile details
    display_name = f"TikTok User ({open_id[:6]}...)"
    avatar_url = ""
    try:
        user_res = requests.get(
            "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )
        if user_res.status_code == 200:
            user_info = user_res.json().get("data", {}).get("user", {})
            if user_info.get("display_name"):
                display_name = user_info["display_name"]
            if user_info.get("avatar_url"):
                avatar_url = user_info["avatar_url"]
    except Exception as e:
        logger.warning(f"[TikTok OAuth] Error reading user profile: {e}")

    save_user_token(
        user_id=user_id,
        platform="tiktok",
        token_data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": expires_in,
            "account_id": open_id,
            "account_name": display_name,
            "details": {
                "open_id": open_id,
                "avatar_url": avatar_url,
                "scope": data_payload.get("scope", ""),
            }
        }
    )

    return RedirectResponse(f"{return_url}?connected=tiktok&account_name={urllib.parse.quote(display_name)}")


# =====================================================================
# 4. ACCOUNT STATUS & DISCONNECT MANAGEMENT
# =====================================================================

class DisconnectRequest(BaseModel):
    user_id: str
    platform: str  # 'youtube', 'meta', 'tiktok'


@router.get("/status")
def get_oauth_status(user_id: str = Query("default", description="User ID to check accounts for")):
    """Returns the connection status and public account info for each social platform for a user."""
    accounts = list_user_accounts(user_id)
    return {
        "user_id": user_id,
        "accounts": accounts,
    }


@router.post("/disconnect")
def disconnect_oauth_account(req: DisconnectRequest):
    """Disconnects and removes stored OAuth credentials for a specific platform and user."""
    success = delete_user_token(user_id=req.user_id, platform=req.platform.lower())
    return {
        "success": success,
        "user_id": req.user_id,
        "platform": req.platform,
        "message": f"Successfully disconnected {req.platform}" if success else f"No active {req.platform} connection found.",
    }


@router.get("/users")
def get_all_connected_users():
    """Returns a list of all user_ids that currently have social connections stored."""
    users = list_all_oauth_users()
    return {"users": users}


@router.get("/client-config")
def get_oauth_client_config():
    """Returns whether the server environment has API credentials configured for each platform."""
    from services.supabase_sync import is_supabase_configured
    has_meta_app = bool(os.getenv("META_APP_ID") or os.getenv("FACEBOOK_APP_ID"))
    has_fb_token = bool(os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN") or os.getenv("META_PAGE_ACCESS_TOKEN"))
    has_ig_token = bool(os.getenv("INSTAGRAM_ACCESS_TOKEN") or has_fb_token)

    return {
        "youtube": bool(os.getenv("YOUTUBE_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID")),
        "meta": has_meta_app or has_fb_token,
        "facebook": has_meta_app or has_fb_token,
        "instagram": has_meta_app or has_ig_token,
        "tiktok": bool(os.getenv("TIKTOK_CLIENT_KEY")),
        "supabase": is_supabase_configured(),
        "details": {
            "youtube": {
                "configured": bool(os.getenv("YOUTUBE_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID")),
                "env_vars": ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"],
                "missing": [k for k in ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"] if not (os.getenv(k) or (k == "YOUTUBE_CLIENT_ID" and os.getenv("GOOGLE_CLIENT_ID")) or (k == "YOUTUBE_CLIENT_SECRET" and os.getenv("GOOGLE_CLIENT_SECRET")))]
            },
            "meta": {
                "configured": has_meta_app or has_fb_token,
                "env_vars": ["META_APP_ID", "META_APP_SECRET"],
                "missing": [k for k in ["META_APP_ID", "META_APP_SECRET"] if not (os.getenv(k) or (k == "META_APP_ID" and os.getenv("FACEBOOK_APP_ID")) or (k == "META_APP_SECRET" and os.getenv("FACEBOOK_APP_SECRET")))] if not has_fb_token else []
            },
            "facebook": {
                "configured": has_meta_app or has_fb_token,
                "env_vars": ["FACEBOOK_PAGE_ID", "FACEBOOK_PAGE_ACCESS_TOKEN"],
                "missing": [k for k in ["FACEBOOK_PAGE_ID", "FACEBOOK_PAGE_ACCESS_TOKEN"] if not os.getenv(k)] if not has_meta_app else []
            },
            "instagram": {
                "configured": has_meta_app or has_ig_token,
                "env_vars": ["INSTAGRAM_USER_ID", "INSTAGRAM_ACCESS_TOKEN"],
                "missing": [k for k in ["INSTAGRAM_USER_ID", "INSTAGRAM_ACCESS_TOKEN"] if not os.getenv(k)] if not has_meta_app else []
            },
            "tiktok": {
                "configured": bool(os.getenv("TIKTOK_CLIENT_KEY")),
                "env_vars": ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
                "missing": [k for k in ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"] if not os.getenv(k)]
            },
            "supabase": {
                "configured": is_supabase_configured(),
                "env_vars": ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
                "missing": [k for k in ["SUPABASE_URL", "SUPABASE_KEY"] if not os.getenv(k) and not os.getenv(f"NEXT_PUBLIC_{k}")]
            }
        }
    }


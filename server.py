"""
AI Video Stories Dashboard - FastAPI Backend Server.
Clean, lightweight server entry point mounting modular API routers and static UI assets.
"""

import argparse
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
from monitoring.metrics import metrics_payload

from config import config
from api import (
    stories_router,
    queue_router,
    system_router,
    media_router,
    upload_router,
    oauth_router
)

app = FastAPI(
    title="AI Stories Studio Dashboard",
    description="Clean, Modern Interface for AI Video Story Pipeline",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular API routers
app.include_router(system_router)
app.include_router(stories_router)
app.include_router(queue_router)
app.include_router(media_router)
app.include_router(upload_router)
app.include_router(oauth_router)

import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

metrics_security = HTTPBasic()

def verify_metrics_credentials(credentials: HTTPBasicCredentials = Depends(metrics_security)):
    # If no password is set in config (e.g. local development), allow request
    if not config.METRICS_PASSWORD:
        return True

    correct_username = secrets.compare_digest(credentials.username, config.METRICS_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, config.METRICS_PASSWORD)

    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid metrics authentication credentials",
            headers={"WWW-Authenticate": 'Basic realm="Metrics"'},
        )
    return True

@app.get("/metrics", dependencies=[Depends(verify_metrics_credentials)], include_in_schema=False)
def prometheus_metrics():
    payload, content_type = metrics_payload()
    return Response(content=payload, media_type=content_type)

# Mount static UI & Landing Page
FRONTEND_OUT = config.BASE_DIR / "frontend" / "out"
if FRONTEND_OUT.exists() and (FRONTEND_OUT / "index.html").exists():
    UI_DIR = FRONTEND_OUT
else:
    UI_DIR = config.BASE_DIR / "ui"
UI_DIR.mkdir(parents=True, exist_ok=True)

from fastapi.responses import FileResponse, RedirectResponse, Response

def _resolve_html(page_name: str) -> FileResponse:
    target = UI_DIR / f"{page_name}.html"
    if target.exists():
        return FileResponse(str(target))
    target_idx = UI_DIR / page_name / "index.html"
    if target_idx.exists():
        return FileResponse(str(target_idx))
    return FileResponse(str(UI_DIR / "index.html"))

@app.get("/landing")
@app.get("/landing/")
@app.get("/landing.html")
def get_landing_page():
    return _resolve_html("landing")

@app.get("/create")
@app.get("/create/")
@app.get("/create.html")
def get_create_page():
    return _resolve_html("create")

@app.get("/library")
@app.get("/library/")
@app.get("/library.html")
def get_library_page():
    return _resolve_html("library")

@app.get("/editor")
@app.get("/editor/")
@app.get("/editor.html")
@app.get("/studio")
@app.get("/studio/")
@app.get("/studio.html")
def redirect_editor_page():
    return RedirectResponse(url="/library", status_code=307)

@app.get("/upload")
@app.get("/upload/")
@app.get("/upload.html")
def get_upload_page():
    return _resolve_html("upload")

@app.get("/terms")
@app.get("/terms/")
@app.get("/terms.html")
@app.get("/terms-of-service")
@app.get("/terms-of-service/")
@app.get("/terms-of-service.html")
def get_terms_page():
    return _resolve_html("terms")

@app.get("/privacy")
@app.get("/privacy/")
@app.get("/privacy.html")
@app.get("/privacy-policy")
@app.get("/privacy-policy/")
@app.get("/privacy-policy.html")
def get_privacy_page():
    return _resolve_html("privacy")

@app.get("/oembed-preview")
@app.get("/oembed-preview/")
@app.get("/oembed-preview.html")
def get_oembed_preview_page():
    return _resolve_html("oembed-preview")

@app.get("/script.js")
@app.get("/_vercel/insights/script.js")
@app.get("/_vercel/speed-insights/script.js")
def get_vercel_insights_stub():
    return Response(content="// script stub", media_type="application/javascript")

app.mount("/", StaticFiles(directory=str(UI_DIR), html=True), name="ui")



def main():
    parser = argparse.ArgumentParser(description="AI Stories Web Studio Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to run server on")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host address")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    args = parser.parse_args()
    print(f"AI Stories Studio running at http://{args.host}:{args.port}")
    if args.reload:
        uvicorn.run("server:app", host=args.host, port=args.port, reload=True)
    else:
        uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()

"""
Media File Streaming API Routes with HTTP Byte-Range Support.
Serves video, audio, image, and subtitle files cleanly from the story archive.
"""

from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse

from config import config

router = APIRouter(tags=["Media Streaming"])


@router.api_route("/media/{file_path:path}", methods=["GET", "HEAD"])
async def serve_media(file_path: str, request: Request):
    """Serves media files (PNG, JPG, MP4, MP3, ASS) from archive with full RFC 7233 byte-range support."""
    target = config.ARCHIVE_DIR / file_path
    if not target.exists() or not target.is_file():
        # 1. Try matching by story prefix/slug in ARCHIVE_DIR
        parts = Path(file_path).parts
        if parts:
            first = parts[0]
            rest = Path(*parts[1:]) if len(parts) > 1 else Path("")
            matching = list(config.ARCHIVE_DIR.glob(f"*{first}*"))
            if matching and (matching[0] / rest).is_file():
                target = matching[0] / rest

        # 2. Check candidate directories
        if not target.exists() or not target.is_file():
            candidates = [
                config.ARCHIVE_DIR / "stories" / file_path,
                config.BASE_DIR / file_path,
                config.BASE_DIR / "media" / file_path,
                config.TEMP_DIR / file_path,
                config.BASE_DIR / "assets" / file_path,
                config.TEMP_DIR / "test_outputs" / Path(file_path).name,
            ]
            for cand in candidates:
                if cand.exists() and cand.is_file():
                    target = cand
                    break

    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Media file not found")

    file_size = target.stat().st_size
    range_header = request.headers.get("Range")

    content_type = "application/octet-stream"
    suffix = target.suffix.lower()
    if suffix in [".png"]:
        content_type = "image/png"
    elif suffix in [".jpg", ".jpeg"]:
        content_type = "image/jpeg"
    elif suffix in [".mp4"]:
        content_type = "video/mp4"
    elif suffix in [".mp3"]:
        content_type = "audio/mpeg"
    elif suffix in [".ass", ".txt", ".json", ".md"]:
        content_type = "text/plain; charset=utf-8"

    if range_header and range_header.startswith("bytes="):
        raw_range = range_header.replace("bytes=", "").strip()
        # Handle multiple ranges if comma separated - take first range
        if "," in raw_range:
            raw_range = raw_range.split(",")[0].strip()

        parts = raw_range.split("-")
        try:
            if parts[0] == "":
                # Suffix byte range: e.g. bytes=-131072 (last 131072 bytes)
                suffix_len = int(parts[1])
                start = max(0, file_size - suffix_len)
                end = file_size - 1
            elif len(parts) > 1 and parts[1] != "":
                # Closed range: e.g. bytes=0-1024
                start = int(parts[0])
                end = int(parts[1])
            else:
                # Open-ended range: e.g. bytes=1024-
                start = int(parts[0])
                end = file_size - 1

            if start > end or start >= file_size or file_size == 0:
                raise HTTPException(
                    status_code=416,
                    detail="Range Not Satisfiable",
                    headers={"Content-Range": f"bytes */{file_size}"}
                )

            end = min(file_size - 1, end)
            content_length = end - start + 1

            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
                "Content-Type": content_type,
            }

            if request.method == "HEAD":
                from fastapi import Response
                return Response(status_code=206, headers=headers)

            def iterfile():
                with open(target, "rb") as f:
                    f.seek(start)
                    bytes_remaining = content_length
                    chunk_size = 1024 * 1024  # 1MB chunks
                    while bytes_remaining > 0:
                        read_len = min(chunk_size, bytes_remaining)
                        data = f.read(read_len)
                        if not data:
                            break
                        bytes_remaining -= len(data)
                        yield data

            return StreamingResponse(iterfile(), status_code=206, headers=headers)
        except HTTPException:
            raise
        except Exception:
            pass

    response_headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
    }
    return FileResponse(target, media_type=content_type, headers=response_headers)

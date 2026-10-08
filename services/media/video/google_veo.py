"""
Google Veo 3.1 Fast AI Video Generation Adapter.
Integrates Google Cloud Vertex AI & Google Gemini Veo Video generation
(models: veo-3.1-generate-preview, veo-2.0-generate-001, veo-3.0-fast-generate-preview).
Synthesizes cinematic 9:16 vertical video clips from keyframe images and motion directives.
"""

import os
import time
import base64
import requests
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any, List

from core.logger import logger
from core.retry import retry_with_backoff
from config import config
from services.media.base import BaseVideoProvider, VideoGenRequest, VideoGenResult
from services.gemini_direct_client import GeminiDirectClient


def _encode_image_base64(image_path: Path) -> str:
    """Reads and base64 encodes an image file."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def get_video_file_duration(video_path: Path) -> Optional[float]:
    """Inspects a video file using ffprobe to extract its exact duration in seconds."""
    try:
        if not video_path.exists() or video_path.stat().st_size == 0:
            return None
        import shutil
        import json
        probe_bin = shutil.which("ffprobe")
        if not probe_bin:
            return None
        cmd = [
            probe_bin, "-v", "error",
            "-show_entries", "format=duration",
            "-of", "json",
            str(video_path)
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(res.stdout)
        dur = float(data.get("format", {}).get("duration", 0))
        return round(dur, 2) if dur > 0 else None
    except Exception as e:
        logger.debug(f"[VideoProbe] Could not probe duration of {video_path}: {e}")
        return None


def optimize_mp4_faststart(video_path: Path) -> bool:
    """
    Optimizes an MP4 file with FFmpeg -movflags +faststart.
    Moves the moov atom (index) to the beginning of the file so web browsers
    can demux and stream the video immediately without suffix byte-range seeking.
    Also verifies container integrity.
    """
    import shutil
    if not video_path.exists() or video_path.stat().st_size <= 1024:
        return False

    ffmpeg_bin = None
    if config.FFMPEG_PATH and Path(config.FFMPEG_PATH).exists():
        ffmpeg_bin = str(config.FFMPEG_PATH)
    else:
        ffmpeg_bin = shutil.which(config.FFMPEG_PATH) or shutil.which("ffmpeg")

    if not ffmpeg_bin:
        return True

    temp_out = video_path.with_name(f"{video_path.stem}_faststart{video_path.suffix}")
    cmd = [
        ffmpeg_bin, "-y",
        "-i", str(video_path),
        "-c", "copy",
        "-movflags", "+faststart",
        str(temp_out)
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if res.returncode == 0 and temp_out.exists() and temp_out.stat().st_size > 1024:
            temp_out.replace(video_path)
            logger.debug(f"[GoogleVeo] Applied +faststart to {video_path.name}")
            return True
        else:
            logger.warning(f"[GoogleVeo] +faststart stream copy failed: {res.stderr[:200]}")
            if temp_out.exists():
                temp_out.unlink(missing_ok=True)
            return False
    except Exception as e:
        logger.warning(f"[GoogleVeo] Could not apply +faststart to {video_path}: {e}")
        if temp_out.exists():
            temp_out.unlink(missing_ok=True)
        return False


def _normalize_veo_duration(duration: Optional[int | float]) -> int:
    """
    Google Veo image-to-video on Vertex AI strictly accepts durations [4, 6, 8] seconds.
    Normalizes requested duration to the closest supported value, defaulting to 4s.
    """
    if not duration or int(duration) <= 0:
        return 4
    d = int(duration)
    if d <= 4:
        return 4
    elif d <= 6:
        return 6
    else:
        return 8


class GoogleVeoAdapter(BaseVideoProvider):
    """
    Google Cloud Vertex AI & Gemini Veo 3.1 Fast Video Provider.
    Generates fluid 9:16 vertical video from keyframe images and prompt directives.
    """

    VEO_MODELS_POOL = [
        "veo-3.1-fast-generate-001",
        "veo-3.1-generate-001",
        "veo-3.1-lite-generate-001",
    ]

    def __init__(self):
        pass

    @property
    def name(self) -> str:
        return "google_veo"

    def _resolve_vertex_project(self) -> str:
        """Resolves GCP project from config, env, google.auth.default(), metadata server, or default."""
        proj = (
            getattr(config, "GOOGLE_CLOUD_PROJECT", None)
            or os.getenv("GOOGLE_CLOUD_PROJECT")
            or os.getenv("AI_STORY_GOOGLE_CLOUD_PROJECT")
            or os.getenv("GCP_PROJECT")
            or os.getenv("PROJECT_ID")
        )
        if proj:
            return str(proj).strip()

        try:
            import google.auth
            _, default_proj = google.auth.default()
            if default_proj:
                return str(default_proj).strip()
        except Exception as e:
            logger.debug(f"[GoogleVeo] google.auth.default() project resolution: {e}")

        try:
            resp = requests.get(
                "http://metadata.google.internal/computeMetadata/v1/project/project-id",
                headers={"Metadata-Flavor": "Google"},
                timeout=1.5
            )
            if resp.status_code == 200 and resp.text.strip():
                return resp.text.strip()
        except Exception:
            pass

        # Production Cloud Run project number fallback
        return "581866038534"

    def _resolve_vertex_location(self) -> str:
        return (
            getattr(config, "GOOGLE_CLOUD_LOCATION", None)
            or os.getenv("GOOGLE_CLOUD_LOCATION")
            or os.getenv("AI_STORY_GOOGLE_CLOUD_LOCATION")
            or "us-central1"
        )

    def _generate_via_genai_sdk(self, req: VideoGenRequest) -> Optional[VideoGenResult]:
        """Attempts video generation using the official Google Gen AI SDK on Vertex AI."""
        vertex_project = self._resolve_vertex_project()
        vertex_location = self._resolve_vertex_location()

        try:
            from google import genai
            from google.genai import types

            logger.info(f"[GoogleVeo] Initializing Google GenAI Client on Vertex AI (project: {vertex_project}, location: {vertex_location})")
            client_kwargs = {
                "vertexai": True,
                "project": vertex_project,
                "location": vertex_location,
            }
            if getattr(config, "VERTEX_API_KEY", None):
                client_kwargs["api_key"] = config.VERTEX_API_KEY

            client = genai.Client(**client_kwargs)

            primary_model = req.model or getattr(config, "VEO_MODEL", "veo-3.1-fast-generate-001")
            if "preview" in primary_model:
                primary_model = "veo-3.1-fast-generate-001"

            # Model fallback sequence: primary -> fast -> standard -> lite -> v2
            models_to_try = [primary_model]
            for fallback_m in self.VEO_MODELS_POOL:
                if fallback_m not in models_to_try:
                    models_to_try.append(fallback_m)

            aspect_ratio = req.aspect_ratio or getattr(config, "VIDEO_ASPECT_RATIO", "9:16")
            norm_duration = _normalize_veo_duration(req.duration)
            img_ref = types.Image.from_file(location=str(req.image_path))

            for model_name in models_to_try:
                for retry_attempt in range(2):
                    try:
                        logger.info(
                            f"[GoogleVeo] Launching Vertex AI Veo ({model_name}, {norm_duration}s, {aspect_ratio}, attempt {retry_attempt + 1}) -> {req.output_path.name}"
                        )

                        gen_kwargs = {
                            "aspect_ratio": aspect_ratio,
                            "fps": 24,
                            "duration_seconds": norm_duration,
                        }

                        operation = client.models.generate_videos(
                            model=model_name,
                            prompt=req.motion_prompt,
                            image=img_ref,
                            config=types.GenerateVideosConfig(**gen_kwargs)
                        )

                        logger.info(f"[GoogleVeo] Vertex AI operation started: {operation.name}. Polling status...")
                        for attempt in range(60):  # up to 10 minutes
                            time.sleep(10)
                            logger.info(f"[GoogleVeo] Polling SDK operation {attempt + 1}/60 (elapsed: {(attempt + 1) * 10}s)...")
                            operation = client.operations.get(operation)
                            if operation.done:
                                break

                        if not operation.done:
                            logger.warning(f"[GoogleVeo] Video generation operation timed out for {model_name}: {operation.name}")
                            break

                        if getattr(operation, "error", None):
                            err_str = str(operation.error)
                            logger.warning(f"[GoogleVeo] Model {model_name} returned error: {err_str}")
                            if any(code in err_str for code in ["RESOURCE_EXHAUSTED", "429", "503", "quota"]):
                                time.sleep(15 * (retry_attempt + 1))
                                continue
                            break  # Try next model

                        if operation.response:
                            gen_video = None
                            if getattr(operation.response, "generated_videos", None):
                                gen_video = operation.response.generated_videos[0]
                            elif getattr(operation.response, "videos", None):
                                gen_video = operation.response.videos[0]

                            if gen_video:
                                v_obj = getattr(gen_video, "video", gen_video)
                                raw_bytes = getattr(v_obj, "video_bytes", None) or getattr(v_obj, "bytes_base64_encoded", None)
                                if raw_bytes:
                                    if isinstance(raw_bytes, str):
                                        raw_bytes = base64.b64decode(raw_bytes)
                                    with open(req.output_path, "wb") as f_out:
                                        f_out.write(raw_bytes)
                                elif hasattr(v_obj, "save"):
                                    v_obj.save(str(req.output_path))
                                elif getattr(v_obj, "uri", None):
                                    v_uri = v_obj.uri
                                    if v_uri.startswith("http"):
                                        dl_resp = requests.get(v_uri, timeout=60)
                                        with open(req.output_path, "wb") as f_out:
                                            f_out.write(dl_resp.content)
                                    elif v_uri.startswith("gs://"):
                                        from google.cloud import storage
                                        parts = v_uri[5:].split("/", 1)
                                        storage_client = storage.Client(project=vertex_project)
                                        blob = storage_client.bucket(parts[0]).blob(parts[1])
                                        blob.download_to_filename(str(req.output_path))
                                    else:
                                        client.files.download(file=v_obj, destination=str(req.output_path))
                                else:
                                    client.files.download(file=v_obj, destination=str(req.output_path))

                                optimize_mp4_faststart(req.output_path)
                                actual_dur = get_video_file_duration(req.output_path)
                                logger.info(f"[GoogleVeo] Successfully saved & faststart-optimized Veo video ({model_name}, actual length: {actual_dur}s) -> {req.output_path}")
                                return VideoGenResult(
                                    video_path=req.output_path,
                                    duration=actual_dur,
                                    provider=self.name,
                                    metadata={"engine": "genai_sdk", "model": model_name, "operation": operation.name, "actual_duration": actual_dur}
                                )

                        logger.warning(f"[GoogleVeo] No generated videos found in operation response for {model_name}.")
                        break

                    except Exception as sdk_err:
                        err_msg = str(sdk_err)
                        logger.warning(f"[GoogleVeo] Vertex AI call failed with {model_name} (attempt {retry_attempt + 1}): {err_msg}")
                        if any(code in err_msg for code in ["429", "503", "RESOURCE_EXHAUSTED", "quota"]):
                            time.sleep(15 * (retry_attempt + 1))
                            continue
                        break  # Try next fallback model

            logger.warning("[GoogleVeo] All Vertex AI SDK Veo models in pool exhausted. Attempting REST endpoints...")
            return None

        except Exception as e:
            logger.warning(f"[GoogleVeo] Vertex AI SDK video generation exception: {e}. Attempting REST endpoints...")
            return None

    def generate(self, req: VideoGenRequest) -> VideoGenResult:
        if not req.image_path.exists():
            raise FileNotFoundError(f"Keyframe image not found for Veo generation: {req.image_path}")

        req.output_path.parent.mkdir(parents=True, exist_ok=True)
        model_name = req.model or getattr(config, "VEO_MODEL", "veo-3.1-fast-generate-001")
        if "preview" in model_name or "2.0" in model_name:
            model_name = "veo-3.1-fast-generate-001"

        # 1. Try Google GenAI SDK via Vertex AI ADC
        sdk_result = self._generate_via_genai_sdk(req)
        if sdk_result:
            return sdk_result

        # 2. REST fallback directly to Vertex AI endpoints
        vertex_project = self._resolve_vertex_project()
        vertex_location = self._resolve_vertex_location()

        image_b64 = _encode_image_base64(req.image_path)
        mime_type = "image/png" if req.image_path.suffix.lower() == ".png" else "image/jpeg"
        norm_duration = _normalize_veo_duration(req.duration)

        params: Dict[str, Any] = {
            "aspectRatio": req.aspect_ratio or "9:16",
            "personGeneration": "allow_adult",
            "fps": 24,
            "durationSeconds": norm_duration,
        }

        payload = {
            "instances": [
                {
                    "prompt": req.motion_prompt,
                    "image": {
                        "bytesBase64Encoded": image_b64,
                        "mimeType": mime_type
                    }
                }
            ],
            "parameters": params
        }

        # Obtain Vertex AI bearer token using Google Cloud credentials
        token = None
        try:
            import google.auth
            from google.auth.transport.requests import Request
            creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
            creds.refresh(Request())
            token = creds.token
        except Exception as auth_err:
            logger.warning(f"[GoogleVeo] Could not refresh Google Cloud token for Vertex AI REST: {auth_err}")

        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        elif getattr(config, "VERTEX_API_KEY", None):
            headers["x-goog-api-key"] = config.VERTEX_API_KEY
        else:
            raise RuntimeError(f"Google Veo video generation failed: No Vertex AI credentials available to call {model_name}.")

        rest_models_to_try = [model_name]
        for m in self.VEO_MODELS_POOL:
            if m not in rest_models_to_try:
                rest_models_to_try.append(m)

        last_error = "No endpoints succeeded"

        for current_model in rest_models_to_try:
            logger.info(f"[GoogleVeo] Requesting Veo video generation via Vertex AI REST ({current_model}) -> {req.output_path.name}")
            url = f"https://{vertex_location}-aiplatform.googleapis.com/v1/projects/{vertex_project}/locations/{vertex_location}/publishers/google/models/{current_model}:predictLongRunning"

            try:
                resp = requests.post(url, json=payload, headers=headers, timeout=60)
                if resp.status_code in [200, 201, 202]:
                    data = resp.json()

                    # Handle immediate video bytes / data
                    if "video" in data and "videoBytes" in data["video"]:
                        vid_bytes = base64.b64decode(data["video"]["videoBytes"])
                        with open(req.output_path, "wb") as f_out:
                            f_out.write(vid_bytes)
                        optimize_mp4_faststart(req.output_path)
                        actual_dur = get_video_file_duration(req.output_path)
                        logger.info(f"[GoogleVeo] Successfully saved & faststart-optimized Veo video -> {req.output_path} ({actual_dur}s)")
                        return VideoGenResult(
                            video_path=req.output_path,
                            duration=actual_dur,
                            provider=self.name,
                            metadata={"model": current_model, "status": "completed", "actual_duration": actual_dur}
                        )

                    # Handle Long-Running Operation (LRO) polling on Vertex AI
                    operation_name = data.get("name")
                    if operation_name:
                        logger.info(f"[GoogleVeo] Vertex AI operation started: {operation_name}. Polling status...")
                        resource_name = operation_name.rpartition("/operations/")[0]
                        poll_url = f"https://{vertex_location}-aiplatform.googleapis.com/v1/{resource_name}:fetchPredictOperation"
                        poll_payload = {"operationName": operation_name}
                        for poll_idx in range(60):  # Poll up to 6 minutes
                            time.sleep(6)
                            logger.info(f"[GoogleVeo] Polling REST operation {poll_idx + 1}/60 (elapsed: {(poll_idx + 1) * 6}s)...")
                            poll_resp = requests.post(poll_url, json=poll_payload, headers=headers, timeout=30)
                            if poll_resp.status_code == 200:
                                poll_data = poll_resp.json()
                                if poll_data.get("done"):
                                    if poll_data.get("error"):
                                        last_error = f"Operation error: {poll_data['error']}"
                                        logger.warning(f"[GoogleVeo] Operation failed for {current_model}: {poll_data['error']}")
                                        break

                                    res_response = poll_data.get("response", {})
                                    video_uri = None
                                    vid_bytes = None

                                    if res_response.get("videoUri"):
                                        video_uri = res_response.get("videoUri")
                                    elif res_response.get("video", {}).get("uri"):
                                        video_uri = res_response["video"]["uri"]
                                    elif res_response.get("generated_videos"):
                                        gv = res_response["generated_videos"][0]
                                        video_uri = gv.get("video", {}).get("uri") or gv.get("uri")
                                        if not video_uri and gv.get("video", {}).get("bytesBase64Encoded"):
                                            vid_bytes = base64.b64decode(gv["video"]["bytesBase64Encoded"])
                                    elif res_response.get("generateVideoResponse", {}).get("generatedSamples"):
                                        sample = res_response["generateVideoResponse"]["generatedSamples"][0]
                                        video_uri = sample.get("video", {}).get("uri")
                                        if not video_uri and sample.get("video", {}).get("bytesBase64Encoded"):
                                            vid_bytes = base64.b64decode(sample["video"]["bytesBase64Encoded"])
                                    elif res_response.get("videos"):
                                        v_item = res_response["videos"][0]
                                        video_uri = v_item.get("uri")
                                        if not video_uri and v_item.get("bytesBase64Encoded"):
                                            vid_bytes = base64.b64decode(v_item["bytesBase64Encoded"])

                                    if vid_bytes:
                                        with open(req.output_path, "wb") as f_out:
                                            f_out.write(vid_bytes)
                                        optimize_mp4_faststart(req.output_path)
                                        actual_dur = get_video_file_duration(req.output_path)
                                        logger.info(f"[GoogleVeo] Veo video decoded & faststart-optimized -> {req.output_path} ({actual_dur}s)")
                                        return VideoGenResult(
                                            video_path=req.output_path,
                                            duration=actual_dur,
                                            provider=self.name,
                                            metadata={"model": current_model, "operation": operation_name, "actual_duration": actual_dur}
                                        )
                                    elif video_uri:
                                        if video_uri.startswith("http"):
                                            vid_dl = requests.get(video_uri, timeout=60)
                                            with open(req.output_path, "wb") as f_out:
                                                f_out.write(vid_dl.content)
                                        elif video_uri.startswith("gs://"):
                                            from google.cloud import storage
                                            parts = video_uri[5:].split("/", 1)
                                            storage_client = storage.Client(project=vertex_project)
                                            blob = storage_client.bucket(parts[0]).blob(parts[1])
                                            blob.download_to_filename(str(req.output_path))
                                        else:
                                            vid_dl = requests.get(video_uri, headers=headers, timeout=60)
                                            with open(req.output_path, "wb") as f_out:
                                                f_out.write(vid_dl.content)

                                        optimize_mp4_faststart(req.output_path)
                                        actual_dur = get_video_file_duration(req.output_path)
                                        logger.info(f"[GoogleVeo] Veo video downloaded & faststart-optimized -> {req.output_path} ({actual_dur}s)")
                                        return VideoGenResult(
                                            video_path=req.output_path,
                                            duration=actual_dur,
                                            provider=self.name,
                                            metadata={"model": current_model, "operation": operation_name, "actual_duration": actual_dur}
                                        )
                                    break
                else:
                    last_error = f"Status {resp.status_code}: {resp.text[:200]}"
                    logger.debug(f"[GoogleVeo] Vertex AI endpoint status {resp.status_code}: {resp.text[:200]}")
            except Exception as e:
                last_error = str(e)
                logger.debug(f"[GoogleVeo] Vertex AI request exception: {e}")

        # NEVER generate a fake looped video! Raise an error so user/system is properly alerted.
        raise RuntimeError(f"Google Veo video generation failed for {req.output_path.name}: {last_error}. All Vertex AI models and endpoints exhausted.")

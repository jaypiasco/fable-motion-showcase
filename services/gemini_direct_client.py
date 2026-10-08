"""
Direct Google Gemini Multi-Account API Client for AI Video Story Pipeline.
Bypasses CLI subprocess overhead and routes directly to Google Gemini REST API.
Loads API keys automatically from .env (multi-account pool) or auth.json.
Features automatic account/key rotation and model fallback on quota limits (429).
"""

import os
import re
import json
import base64
import requests
from pathlib import Path
from typing import Dict, Any, Optional, List

from core.logger import logger
from core.retry import retry_with_backoff, RateLimitError, ServiceUnavailableError
from config import config


class GeminiDirectClient:
    """High-speed direct client for Google Gemini REST API with multi-account key cycling."""

    MODEL_FALLBACK_POOL = [
        "gemini-3.5-flash-lite",
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-3.7-flash"
    ]

    IMAGE_MODEL_POOL = [
        "gemini-2.5-flash-image",
        "gemini-3.1-flash-image",
        "gemini-3.1-flash-lite-image",
        "gemini-3-pro-image",
    ]


    def __init__(self, api_key: Optional[str] = None):
        if api_key:
            self.api_keys: List[str] = [api_key]
        else:
            self.api_keys = self._discover_all_api_keys()

        self.current_key_idx = 0
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self.last_usage_metadata: Dict[str, int] = {}
        self.last_model_used: Optional[str] = None

    @property
    def api_key(self) -> str:
        if not self.api_keys:
            return ""
        return self.api_keys[self.current_key_idx % len(self.api_keys)]

    def rotate_key(self) -> str:
        """Rotates to the next API key in the account pool."""
        if not self.api_keys:
            return ""
        self.current_key_idx = (self.current_key_idx + 1) % len(self.api_keys)
        new_key = self.api_key
        logger.info(f"[Gemini Key Pool] Rotated to Account/Key #{self.current_key_idx + 1} ({new_key[:8]}...)")
        return new_key

    def _discover_all_api_keys(self) -> List[str]:
        """Discovers and pools all available Google API keys from .env, environment, and auth.json."""
        keys = []

        # 1. Project .env file
        env_file = config.BASE_DIR / ".env"
        if env_file.exists():
            try:
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if line.startswith("GEMINI_API_KEYS="):
                            val = line.split("=", 1)[1].strip().strip('"\'')
                            for k in val.split(","):
                                k_clean = k.strip()
                                if k_clean and "your_" not in k_clean.lower():
                                    keys.append(k_clean)
                        elif any(line.startswith(prefix) for prefix in ["GEMINI_API_KEY", "GOOGLE_API_KEY"]):
                            val = line.split("=", 1)[1].strip().strip('"\'')
                            if val and "your_" not in val.lower():
                                keys.append(val)
            except Exception as e:
                logger.debug(f"[GeminiDirect] Error reading .env: {e}")

        # 2. Environment variables
        for env_var in ["GEMINI_API_KEYS", "GEMINI_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY_1", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3"]:
            val = os.environ.get(env_var)
            if val:
                for k in val.split(","):
                    k_clean = k.strip()
                    if k_clean and "your_" not in k_clean.lower():
                        keys.append(k_clean)

        # 3. Check ~/.local/share/opencode/auth.json
        auth_file = Path.home() / ".local" / "share" / "opencode" / "auth.json"
        if auth_file.exists():
            try:
                with open(auth_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    google_data = data.get("google")
                    if isinstance(google_data, dict) and google_data.get("key"):
                        k_val = google_data.get("key").strip()
                        if k_val:
                            keys.append(k_val)
            except Exception:
                pass

        # Deduplicate while preserving order
        unique_keys = []
        for k in keys:
            if k not in unique_keys:
                unique_keys.append(k)

        if unique_keys:
            logger.info(f"[Gemini Key Pool] Loaded {len(unique_keys)} API account key(s) into rotation pool.")
        else:
            logger.warning("[Gemini Key Pool] No Gemini API keys found. Please add your keys to .env")

        return unique_keys

    def is_available(self) -> bool:
        """Returns True if at least one valid Google API key is available."""
        return len(self.api_keys) > 0

    def _clean_model_name(self, model_identifier: str) -> str:
        """Normalizes model identifier (e.g., 'google/gemini-3.7-flash' -> 'gemini-3.7-flash')."""
        if not model_identifier:
            return self.MODEL_FALLBACK_POOL[0]
        cleaned = model_identifier.replace("google/", "").replace("models/", "")
        return cleaned

    def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes structured JSON generation directly against Gemini API with automatic key & model rotation on 429.
        """
        if not self.api_keys:
            raise RuntimeError("No Google API Key found. Please add your keys to d:/Projects/ai-stories/.env")

        preferred_model = self._clean_model_name(model or config.SCRIPT_MODEL)
        models_to_try = [preferred_model] + [m for m in self.MODEL_FALLBACK_POOL if m != preferred_model]

        contents = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": f"System Instructions:\n{system_prompt}\n\nUser Request:\n{prompt}"}]})
        else:
            contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload = {
            "contents": contents,
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.7,
            }
        }

        # Try across all available keys in pool
        num_keys = max(1, len(self.api_keys))
        for key_attempt in range(num_keys):
            current_key = self.api_key

            for target_model in models_to_try:
                url = f"{self.base_url}/models/{target_model}:generateContent?key={current_key}"
                try:
                    logger.debug(f"[Gemini Direct] Calling {target_model} (Account #{self.current_key_idx + 1})...")
                    resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=45)

                    if resp.status_code == 200:
                        res_json = resp.json()
                        text_parts = []
                        for cand in res_json.get("candidates", []):
                            for part in cand.get("content", {}).get("parts", []):
                                if "text" in part:
                                    text_parts.append(part["text"])

                        raw_text = "".join(text_parts).strip()
                        raw_text = re.sub(r"^```json\s*", "", raw_text)
                        raw_text = re.sub(r"^```\s*", "", raw_text)
                        raw_text = re.sub(r"\s*```$", "", raw_text)

                        parsed = json.loads(raw_text)
                        # Extract token usage metadata for Langfuse and observability
                        usage_meta = res_json.get("usageMetadata", {})
                        self.last_usage_metadata = {
                            "input": usage_meta.get("promptTokenCount", 0),
                            "output": usage_meta.get("candidatesTokenCount", 0),
                            "total": usage_meta.get("totalTokenCount", 0),
                        }
                        self.last_model_used = target_model
                        logger.debug(
                            f"[Gemini Direct] Generated JSON with {target_model} "
                            f"(tokens: {self.last_usage_metadata.get('total', 0)})"
                        )
                        return parsed

                    elif resp.status_code == 429:
                        logger.warning(f"[Gemini Direct] Account #{self.current_key_idx + 1} hit 429 Quota Exceeded on {target_model}.")
                        break # Break model loop to rotate key

                    elif resp.status_code in [500, 502, 503, 504]:
                        logger.warning(f"[Gemini Direct] Model {target_model} returned {resp.status_code}. Trying fallback model...")
                        continue

                    else:
                        logger.debug(f"[Gemini Direct] Model {target_model} error ({resp.status_code}): {resp.text[:200]}")
                        continue

                except Exception as e:
                    logger.debug(f"[Gemini Direct] Request exception on {target_model}: {e}")
                    continue

            # Rotate to next key in pool
            self.rotate_key()

        raise RuntimeError("All Gemini API keys and models in pool exceeded quota or failed.")

    def generate_image(
        self,
        prompt: str,
        output_path: Path,
        aspect_ratio: str = "9:16",
        character_references: Optional[List[Any]] = None
    ) -> Path:
        """
        Generates high-resolution images with QuotaTracker rate-limiting,
        multi-account key rotation, exponential backoff, and Langfuse telemetry.
        """
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if not self.api_keys:
            raise RuntimeError("No Google API Key available for image generation.")

        from services.quota_tracker import quota_tracker
        from services.langfuse_tracer import langfuse_tracer

        parts: List[Dict[str, Any]] = []
        ref_mappings: List[str] = []
        if character_references:
            for idx, ref_path in enumerate(character_references):
                try:
                    p = Path(ref_path)
                    if p.exists() and p.stat().st_size > 0:
                        with open(p, "rb") as f_img:
                            b64_img = base64.b64encode(f_img.read()).decode("utf-8")
                        parts.append({
                            "inline_data": {
                                "mime_type": "image/png",
                                "data": b64_img
                            }
                        })
                        char_label = p.stem.replace("_", " ")
                        ref_mappings.append(f"Reference image {idx + 1} is '{char_label}'")
                        logger.info(f"[Gemini Image] Included Phase 2 character reference portrait: {p.name} ('{char_label}')")
                except Exception as e:
                    logger.warning(f"[Gemini Image] Failed to load character reference {ref_path}: {e}")

        if ref_mappings:
            mapping_header = ". ".join(ref_mappings) + ". "
            final_prompt = (
                f"Generate a {aspect_ratio or '9:16'} cinematic scene. {mapping_header}"
                f"Maintain identical facial features, carved produce peel textures, and signature wardrobe matching each respective attached reference portrait. "
                f"Strictly textless image, clean visual composition, absolutely NO captions, NO subtitles, NO speech bubbles, NO words, NO typography on image: {prompt}"
            )
        else:
            final_prompt = f"Strictly textless image, clean visual composition, absolutely NO captions, NO subtitles, NO speech bubbles, NO words, NO typography on image: {prompt}"

        parts.append({"text": final_prompt})

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "responseModalities": ["IMAGE"]
            }
        }

        # Quick retry rounds across keys before gracefully falling back
        total_keys = len(self.api_keys)
        max_attempts = max(total_keys * 2, 3)
        last_error = None

        primary_model = getattr(config, "IMAGEN_MODEL", self.IMAGE_MODEL_POOL[0])
        models_to_try = [primary_model] + [m for m in self.IMAGE_MODEL_POOL if m != primary_model]

        for attempt in range(max_attempts):
            try:
                current_key, key_state = quota_tracker.acquire_key()
            except RuntimeError as q_err:
                logger.error(f"[Gemini Image] Key acquisition failed: {q_err}")
                raise q_err

            key_exhausted_429 = False

            for model_name in models_to_try:
                if key_exhausted_429:
                    break

                is_gemini_image_model = "gemini" in model_name.lower()
                if is_gemini_image_model:
                    url = f"{self.base_url}/models/{model_name}:generateContent?key={current_key}"
                    req_body = payload
                else:
                    url = f"{self.base_url}/models/{model_name}:predict?key={current_key}"
                    req_body = {
                        "instances": [{"prompt": prompt}],
                        "parameters": {
                            "sampleCount": 1,
                            "aspectRatio": aspect_ratio or "9:16",
                            "outputMimeType": "image/png",
                            "personGeneration": "ALLOW_ADULT"
                        }
                    }

                try:
                    logger.info(
                        f"[Gemini Image] Requesting image via {model_name} "
                        f"({key_state.key_id}, attempt {attempt + 1}/{max_attempts})..."
                    )
                    resp = requests.post(url, json=req_body, headers={"Content-Type": "application/json"}, timeout=60)

                    if resp.status_code == 200:
                        res = resp.json()
                        quota_tracker.record_success(current_key)
                        
                        # Handle gemini multimodal generateContent image output
                        if is_gemini_image_model:
                            candidates = res.get("candidates", [])
                            for cand in candidates:
                                for part in cand.get("content", {}).get("parts", []):
                                    inline_data = part.get("inline_data") or part.get("inlineData")
                                    if inline_data and "data" in inline_data:
                                        img_bytes = base64.b64decode(inline_data["data"])
                                        with open(output_path, "wb") as f_out:
                                            f_out.write(img_bytes)
                                        logger.info(f"[Gemini Image] Successfully saved generated image from {model_name} -> {output_path}")
                                        return output_path
                        else:
                            predictions = res.get("predictions", [])
                            if predictions and "bytesBase64Encoded" in predictions[0]:
                                img_bytes = base64.b64decode(predictions[0]["bytesBase64Encoded"])
                                with open(output_path, "wb") as f_out:
                                    f_out.write(img_bytes)
                                logger.info(f"[Gemini Image] Successfully saved generated Imagen image from {model_name} -> {output_path}")
                                return output_path

                    elif resp.status_code == 429:
                        cooldown = quota_tracker.record_429(current_key, retry_attempt=attempt + 1)
                        key_exhausted_429 = True
                        last_error = f"429 Quota Exhausted on {key_state.key_id} ({model_name})"
                        logger.warning(
                            f"[Gemini Image] {key_state.key_id} rate-limited (429) on {model_name}. "
                            f"Cooling down {cooldown:.1f}s. Rotating to next key..."
                        )
                        langfuse_tracer.log_generation(
                            name="gemini_imagen_quota_429",
                            model=model_name,
                            input_data=prompt,
                            metadata={
                                "key_id": key_state.key_id,
                                "consecutive_429": key_state.consecutive_429,
                                "cooldown_seconds": cooldown,
                                "attempt": attempt + 1,
                                "error": resp.text[:200]
                            }
                        )
                        break  # Stop trying other models on this same rate-limited key! Rotate key immediately!

                    elif resp.status_code in [401, 403]:
                        cooldown = quota_tracker.record_429(current_key, retry_attempt=attempt + 1)
                        key_exhausted_429 = True
                        last_error = f"HTTP {resp.status_code} Auth/Permission error on {key_state.key_id}: {resp.text[:150]}"
                        logger.error(f"[Gemini Image] {last_error}. Cooling down and rotating...")
                        break

                    else:
                        last_error = f"HTTP {resp.status_code} on {model_name}: {resp.text[:150]}"
                        logger.debug(f"[Gemini Image] {model_name} error ({resp.status_code}): {resp.text[:150]}")
                        continue

                except Exception as e:
                    last_error = str(e)
                    logger.debug(f"[Gemini Image] Request error on {model_name}: {e}")
                    continue

        pool_status = quota_tracker.get_pool_status()
        raise RuntimeError(
            f"All Google API accounts in pool exceeded image generation quota (429) after {max_attempts} attempts. "
            f"Active keys: {pool_status.get('active_keys')}/{pool_status.get('total_keys')}. Last error: {last_error}"
        )


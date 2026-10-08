"""
GenAI Gateway Client for AI Stories Pipeline.
Connects pipeline phases to the GenAI Inference Gateway & Semantic Cache for
two-tier semantic caching, dynamic model routing, and phase-level MLOps telemetry.
"""

import json
import re
import requests
from typing import Dict, Any, Optional

from core.logger import logger
from config import config


class GatewayClient:
    """Client for communicating with GenAI Gateway."""

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or getattr(config, "GATEWAY_URL", "http://localhost:8080/api/v1")).rstrip("/")
        self.health_url = self.base_url.replace("/api/v1", "") + "/health"

    def is_available(self) -> bool:
        """Checks whether the GenAI Gateway service is online and healthy."""
        try:
            resp = requests.get(self.health_url, timeout=1.5)
            return resp.status_code == 200
        except Exception:
            return False

    def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        namespace: str = "ai_stories:default",
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends generation request to GenAI Gateway with namespace partitioning
        and returns parsed JSON response.
        """
        url = f"{self.base_url}/chat/completions"
        payload = {
            "prompt": prompt,
            "system_prompt": system_prompt,
            "namespace": namespace,
            "stream": False,
            "response_format": "json",
            "temperature": 0.2,
        }

        logger.info(f"[GatewayClient] Dispatching request to Gateway [ns: {namespace}]...")
        resp = requests.post(url, json=payload, timeout=getattr(config, "REQUEST_TIMEOUT_SECONDS", 180))
        resp.raise_for_status()
        data = resp.json()

        cached = data.get("cached", False)
        tier = data.get("tier", "miss")
        latency_ms = data.get("latency_ms", 0.0)
        served_model = data.get("model", "unknown")

        logger.info(
            f"[GatewayClient Telemetry] Phase [{namespace}] -> "
            f"Cached: {cached} (Tier: {tier}) | Served by: {served_model} | Latency: {latency_ms}ms"
        )

        content = data.get("content", "")
        return self._extract_json(content)

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Cleans and extracts valid JSON dictionary from raw model text."""
        cleaned = text.strip()
        # Remove markdown codeblock fences if present
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned)
            cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            # Fallback: regex search for outer braces
            match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError:
                    pass
            logger.error(f"[GatewayClient] Failed to parse JSON response: {text}")
            raise ValueError(f"Gateway returned non-JSON payload: {e}") from e

"""
Quota Tracker & Multi-Key Rotator for Google Gemini & Imagen APIs.
Implements exponential backoff, per-key rate limiting, cooldown tracking,
and Langfuse telemetry for quota management across multiple Google API accounts.
"""

import os
import time
import random
import threading
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass

from core.logger import logger
from services.langfuse_tracer import langfuse_tracer


@dataclass
class KeyState:
    """Represents the quota and health state of an individual API key."""
    key: str
    key_id: str
    account_num: int
    is_cooling_down: bool = False
    cooling_down_until: float = 0.0
    requests_count: int = 0
    consecutive_429: int = 0
    last_used_timestamp: float = 0.0

    def mask(self) -> str:
        if len(self.key) <= 10:
            return f"Key#{self.account_num} (***)"
        return f"Key#{self.account_num} ({self.key[:6]}...{self.key[-4:]})"

    def is_available(self, now: Optional[float] = None) -> bool:
        t = now if now is not None else time.time()
        if self.is_cooling_down:
            if t >= self.cooling_down_until:
                self.is_cooling_down = False
                self.cooling_down_until = 0.0
                return True
            return False
        return True


class QuotaTracker:
    """
    Thread-safe Quota Tracker and Key Rotator for Google Imagen & Gemini APIs.
    - Manages key state: active, cooling down, requests count, reset timestamps.
    - Enforces rate-limiting spacing between requests.
    - Applies exponential backoff on 429 quota exhaustion.
    - Emits Langfuse trace spans capturing retry attempts and selected key IDs.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(QuotaTracker, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(
        self,
        base_cooldown_seconds: float = 12.0,
        max_cooldown_seconds: float = 45.0,
        min_request_interval_seconds: float = 2.5,
    ):
        if getattr(self, "_initialized", False):
            return

        self.base_cooldown = base_cooldown_seconds
        self.max_cooldown = max_cooldown_seconds
        self.min_interval = min_request_interval_seconds

        self._keys: Dict[str, KeyState] = {}
        self._key_lock = threading.Lock()
        self._load_keys()
        self._initialized = True

    def _load_keys(self):
        keys = []
        from config import config
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
                logger.debug(f"[QuotaTracker] Error reading .env: {e}")

        for env_var in ["GEMINI_API_KEYS", "GEMINI_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY_1", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3"]:
            val = os.environ.get(env_var)
            if val:
                for k in val.split(","):
                    k_clean = k.strip()
                    if k_clean and "your_" not in k_clean.lower():
                        keys.append(k_clean)

        unique_keys = []
        for k in keys:
            if k not in unique_keys:
                unique_keys.append(k)

        for idx, k in enumerate(unique_keys):
            masked = f"Key#{idx + 1} ({k[:6]}...{k[-4:]})" if len(k) > 10 else f"Key#{idx + 1}"
            self._keys[k] = KeyState(
                key=k,
                key_id=masked,
                account_num=idx + 1
            )

        logger.info(f"[QuotaTracker] Initialized with {len(self._keys)} account key(s) in rotation pool.")

    def add_key(self, key: str):
        with self._key_lock:
            if key and key not in self._keys:
                idx = len(self._keys) + 1
                masked = f"Key#{idx} ({key[:6]}...{key[-4:]})" if len(key) > 10 else f"Key#{idx}"
                self._keys[key] = KeyState(key=key, key_id=masked, account_num=idx)

    def get_active_keys_count(self) -> int:
        now = time.time()
        with self._key_lock:
            return sum(1 for state in self._keys.values() if state.is_available(now))

    def acquire_key(self) -> Tuple[str, KeyState]:
        now = time.time()
        with self._key_lock:
            available_states = [s for s in self._keys.values() if s.is_available(now)]

            if not available_states and not self._keys:
                raise RuntimeError("No Google API Keys available in QuotaTracker pool.")

            if not available_states:
                soonest_state = min(self._keys.values(), key=lambda s: s.cooling_down_until)
                wait_time = max(0.0, soonest_state.cooling_down_until - now)
                
                logger.warning(
                    f"[QuotaTracker] All {len(self._keys)} account keys in cooldown. "
                    f"Soonest key {soonest_state.key_id} recovers in {wait_time:.1f}s. Waiting..."
                )

                if wait_time > 75.0:
                    raise RuntimeError(
                        f"All Google API keys in pool exceeded quota (429). Soonest recovery in {wait_time:.1f}s."
                    )

                time.sleep(wait_time + 0.5)
                soonest_state.is_cooling_down = False
                selected = soonest_state
            else:
                selected = min(available_states, key=lambda s: (s.last_used_timestamp, s.requests_count))

            elapsed_since_last = time.time() - selected.last_used_timestamp
            if elapsed_since_last < self.min_interval:
                sleep_needed = self.min_interval - elapsed_since_last
                time.sleep(sleep_needed)

            selected.last_used_timestamp = time.time()
            selected.requests_count += 1
            return selected.key, selected

    def acquire_available_key(self, wait_if_needed: bool = True, max_wait_seconds: float = 30.0) -> Optional[KeyState]:
        """Acquires the next available KeyState for video/media providers."""
        try:
            _, key_state = self.acquire_key()
            return key_state
        except Exception as e:
            logger.warning(f"[QuotaTracker] acquire_available_key notice: {e}")
            return None

    def enforce_rate_limit(self, key: str):
        """Enforces rate limiting delay for a given key if needed."""
        with self._key_lock:
            state = self._keys.get(key)
            if not state:
                return
            elapsed = time.time() - state.last_used_timestamp
            if elapsed < self.min_interval:
                time.sleep(self.min_interval - elapsed)
            state.last_used_timestamp = time.time()

    def record_success(self, key: str):
        with self._key_lock:
            state = self._keys.get(key)
            if state:
                state.consecutive_429 = 0
                state.is_cooling_down = False
                state.cooling_down_until = 0.0

    def record_429(self, key: str, retry_attempt: int = 1) -> float:
        with self._key_lock:
            state = self._keys.get(key)
            if not state:
                return self.base_cooldown

            state.consecutive_429 += 1
            exponent = min(state.consecutive_429 - 1, 4)
            jitter = random.uniform(1.0, 3.0)
            cooldown = min(self.base_cooldown * (2 ** exponent) + jitter, self.max_cooldown)

            state.is_cooling_down = True
            state.cooling_down_until = time.time() + cooldown

            logger.warning(
                f"[QuotaTracker] {state.key_id} hit 429 (strike #{state.consecutive_429}). "
                f"Cooling down for {cooldown:.1f}s (until {time.strftime('%H:%M:%S', time.localtime(state.cooling_down_until))})."
            )
            return cooldown

    def get_pool_status(self) -> Dict[str, Any]:
        now = time.time()
        with self._key_lock:
            return {
                "total_keys": len(self._keys),
                "active_keys": sum(1 for s in self._keys.values() if s.is_available(now)),
                "keys": [
                    {
                        "key_id": s.key_id,
                        "account_num": s.account_num,
                        "available": s.is_available(now),
                        "cooling_down": s.is_cooling_down,
                        "cooldown_remaining_sec": max(0.0, round(s.cooling_down_until - now, 1)),
                        "requests_count": s.requests_count,
                        "consecutive_429": s.consecutive_429,
                    }
                    for s in self._keys.values()
                ]
            }


quota_tracker = QuotaTracker()

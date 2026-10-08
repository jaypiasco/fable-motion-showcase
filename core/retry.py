"""
Resilience and Exponential Backoff Retry Module.
Handles 429 Rate Limits, Quota Exhaustion, and Transient Network / API Failures.
"""

import time
import random
import functools
from typing import Callable, Any, Type, Tuple
from core.logger import logger
from config import config


class RateLimitError(Exception):
    """Raised when an API or CLI indicates a rate limit or quota exhaustion (429)."""
    pass


class ServiceUnavailableError(Exception):
    """Raised when an API or CLI returns a 503 / 502 / timeout error."""
    pass


def is_rate_limit_or_retryable(error: Exception) -> bool:
    """Inspects exception message or response codes to detect rate limits and transient errors."""
    err_str = str(error).lower()
    retryable_keywords = [
        "429",
        "rate limit",
        "quota",
        "resource_exhausted",
        "too many requests",
        "overloaded",
        "temporarily unavailable",
        "503",
        "502",
        "504",
        "gateway timeout",
        "timeout",
        "connection reset",
        "socket hang up"
    ]
    return any(keyword in err_str for keyword in retryable_keywords)


def retry_with_backoff(
    max_retries: int = config.MAX_RETRIES,
    initial_delay: float = config.INITIAL_BACKOFF_SECONDS,
    max_delay: float = config.MAX_BACKOFF_SECONDS,
    multiplier: float = config.BACKOFF_MULTIPLIER,
    retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,)
):
    """
    Decorator for automatic exponential backoff retry on transient errors and rate limits.
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            attempt = 0
            current_delay = initial_delay

            while True:
                try:
                    return func(*args, **kwargs)
                except retryable_exceptions as e:
                    attempt += 1
                    if attempt > max_retries:
                        logger.error(
                            f"[{func.__name__}] Exhausted all {max_retries} retries. Failing permanently with error: {e}"
                        )
                        raise

                    # Check if error is rate limit or transient
                    is_rate_limit = "429" in str(e) or "quota" in str(e).lower() or "resource_exhausted" in str(e).lower()
                    
                    # Add jitter (±15%)
                    jitter = random.uniform(0.85, 1.15)
                    wait_time = min(max_delay, current_delay * jitter)
                    
                    if is_rate_limit:
                        logger.warning(
                            f"[{func.__name__}] Rate limit / 429 detected on attempt {attempt}/{max_retries}. "
                            f"Entering backoff sleep for {wait_time:.1f}s before retry... Error: {e}"
                        )
                    else:
                        logger.warning(
                            f"[{func.__name__}] Transient error on attempt {attempt}/{max_retries}. "
                            f"Retrying in {wait_time:.1f}s... Error: {e}"
                        )

                    time.sleep(wait_time)
                    current_delay = min(max_delay, current_delay * multiplier)

        return wrapper
    return decorator

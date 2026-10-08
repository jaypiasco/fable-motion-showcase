"""
Langfuse LLMOps Observability & Tracing Service.
Provides end-to-end tracing, per-phase span instrumentation, token accounting,
and latency profiling with fail-safe degradation (no-ops cleanly when unconfigured).
"""

from typing import Optional, Dict, Any, List, Tuple
from contextlib import contextmanager
import time

from config import config
from core.logger import logger

# Try importing Langfuse client
try:
    from langfuse import Langfuse
    _LANGFUSE_AVAILABLE = True
except ImportError:
    _LANGFUSE_AVAILABLE = False
    Langfuse = None  # type: ignore


def estimate_cost_and_usage(
    model: str,
    usage: Optional[Dict[str, Any]] = None,
    cost_details: Optional[Dict[str, float]] = None,
    duration_seconds: Optional[float] = None
) -> Tuple[Dict[str, int], Dict[str, float]]:
    """
    Computes exact usage_details and cost_details for Vertex AI / Gemini models
    (including gemini-2.5-flash-image, imagen-3, and veo-3.1-fast-generate-001).
    """
    m = (model or "").lower()

    # 1. Video Models (Google Veo 3.1 Fast / Veo 2.0)
    if "veo" in m:
        dur = int(duration_seconds) if duration_seconds else 1
        # Google Vertex AI Veo 3.1 Fast rate (SKU A9F8-76D1-003D): $0.10 flat per generation
        total_cost = 0.10
        u = usage or {"input": 0, "output": dur, "total": dur}
        c = cost_details or {"input": 0.0, "output": total_cost, "total": total_cost}
        return u, c

    # 2. Image Models (Gemini 2.5 Flash Image / Imagen 3)
    if "flash-image" in m or "imagen" in m or "image" in m:
        # Vertex AI predictions: 1296 tokens per image @ $30.00 / 1M tokens ($0.00003/token) = $0.03888
        img_tokens = 1296
        total_cost = 0.03888
        u = usage or {"input": 0, "output": img_tokens, "total": img_tokens}
        c = cost_details or {"input": 0.0, "output": total_cost, "total": total_cost}
        return u, c

    # 3. LLM Text Models
    u = usage or {}
    inp_tokens = int(u.get("input", 0) or u.get("prompt_tokens", 0) or 0)
    out_tokens = int(u.get("output", 0) or u.get("completion_tokens", 0) or 0)
    tot_tokens = int(u.get("total", 0) or u.get("total_tokens", inp_tokens + out_tokens) or 0)
    clean_u = {"input": inp_tokens, "output": out_tokens, "total": tot_tokens}

    if cost_details:
        return clean_u, cost_details

    if "flash-lite" in m:
        c_in = (inp_tokens / 1_000_000.0) * 0.0375
        c_out = (out_tokens / 1_000_000.0) * 0.15
        total_cost = round(c_in + c_out, 6)
        return clean_u, {"input": round(c_in, 6), "output": round(c_out, 6), "total": total_cost}
    elif "flash" in m:
        c_in = (inp_tokens / 1_000_000.0) * 0.075
        c_out = (out_tokens / 1_000_000.0) * 0.30
        total_cost = round(c_in + c_out, 6)
        return clean_u, {"input": round(c_in, 6), "output": round(c_out, 6), "total": total_cost}
    elif "pro" in m:
        c_in = (inp_tokens / 1_000_000.0) * 1.25
        c_out = (out_tokens / 1_000_000.0) * 5.00
        total_cost = round(c_in + c_out, 6)
        return clean_u, {"input": round(c_in, 6), "output": round(c_out, 6), "total": total_cost}

    return clean_u, {"input": 0.0, "output": 0.0, "total": 0.0}


class LangfuseTracer:
    """
    Singleton tracer wrapping Langfuse client.
    Guaranteed fail-safe: Any initialization or network failure degrades to silent no-op.
    """

    def __init__(self):
        self._client: Optional[Any] = None
        self._active_trace: Optional[Any] = None
        self._active_spans: Dict[str, Any] = {}
        self._span_stack: List[Any] = []
        self._is_enabled: bool = False
        self._initialize()

    def _initialize(self):
        """Initializes the Langfuse client if enabled and credentials are present."""
        import os
        os.environ.setdefault("OTEL_SERVICE_NAME", "fable-motion")

        if not getattr(config, "ENABLE_LANGFUSE", True):
            logger.debug("[LangfuseTracer] Tracing disabled via configuration.")
            self._is_enabled = False
            return

        if not _LANGFUSE_AVAILABLE:
            logger.debug("[LangfuseTracer] 'langfuse' package not installed; running in no-op mode.")
            self._is_enabled = False
            return

        public_key = getattr(config, "LANGFUSE_PUBLIC_KEY", None)
        secret_key = getattr(config, "LANGFUSE_SECRET_KEY", None)
        host = getattr(config, "LANGFUSE_HOST", "https://cloud.langfuse.com")

        if not public_key or not secret_key:
            logger.debug("[LangfuseTracer] Langfuse credentials not set in .env; running in no-op mode.")
            self._is_enabled = False
            return

        try:
            self._client = Langfuse(
                public_key=public_key,
                secret_key=secret_key,
                host=host,
                environment=getattr(config, "ENVIRONMENT", "production"),
                release="fablemotion-2.0"
            )
            self._is_enabled = True
            logger.info(f"[LangfuseTracer] Initialized successfully with host: {host} (service: fable-motion)")
        except Exception as e:
            logger.warning(f"[LangfuseTracer] Failed to initialize Langfuse client: {e}. Running in no-op mode.")
            self._client = None
            self._is_enabled = False

    @property
    def is_enabled(self) -> bool:
        return self._is_enabled and self._client is not None

    def auth_check(self) -> bool:
        """Verifies active authentication with the Langfuse host."""
        if not self.is_enabled:
            return False
        try:
            if hasattr(self._client, "auth_check"):
                return bool(self._client.auth_check())
            return True
        except Exception as e:
            logger.debug(f"[LangfuseTracer] Auth check failed: {e}")
            return False

    def start_trace(
        self,
        name: str,
        story_id: str,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None
    ) -> Optional[Any]:
        """Starts a top-level execution trace for a story pipeline."""
        if not self.is_enabled:
            return None

        self._span_stack.clear()
        try:
            meta = metadata.copy() if metadata else {}
            if tags:
                meta["tags"] = tags
            if story_id:
                meta["story_id"] = story_id

            if hasattr(self._client, "trace"):
                self._active_trace = self._client.trace(
                    name=name,
                    id=story_id,
                    metadata=meta,
                    tags=tags or ["fable-motion", "video-pipeline"]
                )
            elif hasattr(self._client, "start_observation"):
                self._active_trace = self._client.start_observation(
                    name=name,
                    input={"story_id": story_id},
                    metadata=meta,
                    as_type="chain"
                )
            logger.debug(f"[LangfuseTracer] Started trace '{name}' (ID: {story_id})")
            return self._active_trace
        except Exception as e:
            logger.debug(f"[LangfuseTracer] Error starting trace: {e}")
            return None

    def create_span(
        self,
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
        input_data: Optional[Any] = None
    ) -> Optional[Any]:
        """Creates a child span within the active story trace or current enclosing span."""
        if not self.is_enabled:
            return None

        try:
            if self._span_stack:
                parent = self._span_stack[-1]
            elif self._active_trace:
                parent = self._active_trace
            else:
                story_id = (metadata or {}).get("story_id", f"story_{int(time.time())}")
                parent = self.start_trace(name="story_pipeline", story_id=story_id)

            if not parent:
                return None

            if hasattr(parent, "span"):
                span = parent.span(
                    name=name,
                    metadata=metadata or {},
                    input=input_data
                )
            elif hasattr(parent, "start_observation"):
                span = parent.start_observation(
                    name=name,
                    metadata=metadata or {},
                    input=input_data,
                    as_type="span"
                )
            else:
                span = None

            if span:
                self._span_stack.append(span)
            self._active_spans[name] = span
            logger.debug(f"[LangfuseTracer] Started span '{name}'")
            return span
        except Exception as e:
            logger.debug(f"[LangfuseTracer] Error creating span '{name}': {e}")
            return None

    def end_span(
        self,
        name: str,
        output_data: Optional[Any] = None,
        error: Optional[str] = None
    ):
        """Ends an active child span with optional outputs or error status."""
        if not self.is_enabled:
            return

        span = self._active_spans.pop(name, None)
        if span and span in self._span_stack:
            self._span_stack.remove(span)
        if not span:
            return

        try:
            level = "ERROR" if error else "DEFAULT"
            if hasattr(span, "update"):
                span.update(
                    output=output_data,
                    level=level,
                    status_message=error
                )
            if hasattr(span, "end"):
                span.end()
            self.flush()
            logger.debug(f"[LangfuseTracer] Ended span '{name}'")
        except Exception as e:
            logger.debug(f"[LangfuseTracer] Error ending span '{name}': {e}")

    @contextmanager
    def span(
        self,
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
        input_data: Optional[Any] = None
    ):
        """Context manager for automatic span start, timing, and error capture."""
        span_obj = self.create_span(name, metadata=metadata, input_data=input_data)
        start_time = time.time()
        err_msg = None
        try:
            yield span_obj
        except Exception as e:
            err_msg = str(e)
            raise
        finally:
            elapsed = round(time.time() - start_time, 3)
            current_out = getattr(span_obj, "output", None) or {}
            if isinstance(current_out, dict):
                out_meta = {**current_out, "duration_seconds": elapsed}
            else:
                out_meta = {"duration_seconds": elapsed}
            if err_msg:
                out_meta["error"] = err_msg
            self.end_span(name, output_data=out_meta, error=err_msg)

    def log_generation(
        self,
        name: str,
        model: str,
        input_data: Any,
        output_data: Optional[Any] = None,
        usage: Optional[Dict[str, int]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        level: str = "DEFAULT",
        status_message: Optional[str] = None,
        cost_details: Optional[Dict[str, float]] = None
    ) -> Optional[Any]:
        """Logs a model inference generation event (LLM prompt/output, diffusion, etc.)."""
        if not self.is_enabled:
            return None

        try:
            # Extract duration if passed in input_data or metadata
            duration_s = None
            if isinstance(input_data, dict):
                duration_s = input_data.get("duration_seconds") or input_data.get("duration")
            if duration_s is None and isinstance(metadata, dict):
                duration_s = metadata.get("duration_seconds")

            usage_details, final_cost = estimate_cost_and_usage(
                model=model,
                usage=usage,
                cost_details=cost_details,
                duration_seconds=duration_s
            )

            enriched_meta = metadata.copy() if metadata else {}
            if "cost_usd" not in enriched_meta and "total" in final_cost:
                enriched_meta["cost_usd"] = final_cost["total"]

            if self._span_stack:
                parent = self._span_stack[-1]
            elif self._active_trace:
                parent = self._active_trace
            else:
                story_id = enriched_meta.get("story_id", f"media_{int(time.time())}")
                parent = self.start_trace(name="story_pipeline_media", story_id=story_id)

            if not parent:
                return None

            if hasattr(parent, "generation"):
                gen_usage = usage_details.copy() if usage_details else {}
                if "total" in final_cost:
                    gen_usage["total_cost"] = final_cost["total"]
                generation = parent.generation(
                    name=name,
                    model=model,
                    input=input_data,
                    output=output_data,
                    usage=gen_usage,
                    metadata=enriched_meta,
                    level=level,
                    status_message=status_message
                )
                if hasattr(generation, "end"):
                    generation.end()
            elif hasattr(parent, "start_observation"):
                generation = parent.start_observation(
                    name=name,
                    as_type="generation",
                    model=model,
                    input=input_data,
                    output=output_data,
                    usage_details=usage_details,
                    cost_details=final_cost,
                    metadata=enriched_meta,
                    level=level,
                    status_message=status_message
                )
                if hasattr(generation, "update"):
                    generation.update(
                        output=output_data,
                        usage_details=usage_details,
                        cost_details=final_cost
                    )
                if hasattr(generation, "end"):
                    generation.end()
            else:
                generation = None

            self.flush()
            logger.debug(f"[LangfuseTracer] Logged generation '{name}' (model: {model}, cost: ${final_cost.get('total', 0.0)})")
            return generation
        except Exception as e:
            logger.debug(f"[LangfuseTracer] Error logging generation '{name}': {e}")
            return None

    def get_trace_url(self) -> Optional[str]:
        """Returns the web URL to view the active trace in the Langfuse dashboard."""
        if not self.is_enabled or not self._active_trace:
            return None
        try:
            trace_id = getattr(self._active_trace, "trace_id", None) or getattr(self._active_trace, "id", None)
            if trace_id and hasattr(self._client, "get_trace_url"):
                return self._client.get_trace_url(trace_id=trace_id)
            host = getattr(config, "LANGFUSE_HOST", "https://cloud.langfuse.com")
            if trace_id:
                return f"{host}/trace/{trace_id}"
        except Exception as e:
            logger.debug(f"[LangfuseTracer] Error getting trace URL: {e}")
        return None

    def end_trace(
        self,
        output_data: Optional[Any] = None,
        error: Optional[str] = None
    ):
        """Finalizes the active trace and flushes pending events."""
        if not self.is_enabled or not self._active_trace:
            return

        try:
            # End any dangling spans
            for span_name in list(self._active_spans.keys()):
                self.end_span(span_name, error="Trace ended before span completion")

            level = "ERROR" if error else "DEFAULT"
            if hasattr(self._active_trace, "update"):
                self._active_trace.update(
                    output=output_data,
                    level=level,
                    status_message=error
                )
            if hasattr(self._active_trace, "end"):
                self._active_trace.end()
            self._client.flush()
            trace_id = getattr(self._active_trace, "trace_id", None) or getattr(self._active_trace, "id", "unknown")
            logger.debug(f"[LangfuseTracer] Finalized and flushed trace '{trace_id}'")
        except Exception as e:
            logger.debug(f"[LangfuseTracer] Error finalizing trace: {e}")
        finally:
            self._active_trace = None
            self._active_spans.clear()
            self._span_stack.clear()

    def flush(self):
        """Forces immediate event dispatch."""
        if self.is_enabled and self._client:
            try:
                self._client.flush()
            except Exception as e:
                logger.debug(f"[LangfuseTracer] Error flushing: {e}")


# Singleton instance exported for application-wide use
langfuse_tracer = LangfuseTracer()

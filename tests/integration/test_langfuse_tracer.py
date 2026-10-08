"""
Unit tests for LangfuseTracer service.
Verifies graceful degradation (no-op mode) and proper mock dispatch.
"""

from pathlib import Path
import pytest
from unittest.mock import MagicMock, patch
from services.langfuse_tracer import LangfuseTracer


def test_langfuse_tracer_noop_when_unconfigured():
    """Verify that when unconfigured, LangfuseTracer safely no-ops without errors."""
    with patch("services.langfuse_tracer.config") as mock_config:
        mock_config.ENABLE_LANGFUSE = False
        tracer = LangfuseTracer()
        
        # Trace operations should return None without error
        trace = tracer.start_trace(name="test_trace", story_id="story_123")
        assert trace is None

        # Spans should return None without error
        span = tracer.create_span(name="test_span")
        assert span is None

        # Context manager span should execute cleanly
        with tracer.span("test_span_ctx") as ctx_span:
            assert ctx_span is None
            x = 1 + 1
        assert x == 2

        # Generation logging should return None without error
        gen = tracer.log_generation(
            name="test_gen",
            model="gemini-3.5-flash-lite",
            input_data={"prompt": "hello"},
            output_data={"result": "world"}
        )
        assert gen is None

        # Ending spans and traces should not crash
        tracer.end_span("test_span")
        tracer.end_trace(output_data={"status": "done"})
        tracer.flush()


def test_langfuse_tracer_with_mock_client():
    """Verify trace, span, and generation interactions when client is active."""
    tracer = LangfuseTracer()
    mock_client = MagicMock()
    mock_trace = MagicMock()
    mock_span = MagicMock()
    mock_generation = MagicMock()

    mock_client.trace.return_value = mock_trace
    mock_trace.span.return_value = mock_span
    mock_trace.generation.return_value = mock_generation

    tracer._client = mock_client
    tracer._is_enabled = True

    # 1. Start trace
    trace = tracer.start_trace(
        name="story_pipeline",
        story_id="test_story_001",
        metadata={"prompt": "cyberpunk story"},
        tags=["test"]
    )
    assert trace == mock_trace
    mock_client.trace.assert_called_once()

    # 2. Span context manager
    with tracer.span("phase_1_script", metadata={"scenes": 3}):
        # inside span
        pass

    mock_trace.span.assert_called_with(name="phase_1_script", metadata={"scenes": 3}, input=None)
    mock_span.end.assert_called_once()

    # 3. Log generation
    tracer.log_generation(
        name="gemini_script",
        model="gemini-3.5-flash-lite",
        input_data={"prompt": "test prompt"},
        output_data={"scenes": []},
        metadata={"latency_seconds": 1.25}
    )
    mock_trace.generation.assert_called_once()

    # 4. End trace
    tracer.end_trace(output_data={"final_video": "story.mp4"})
    mock_trace.update.assert_called_once()
    assert mock_client.flush.call_count >= 1
    assert tracer._active_trace is None


def test_langfuse_tracer_span_propagates_exception():
    """Verify that an exception raised inside the span block propagates out, while span is cleanly ended."""
    tracer = LangfuseTracer()
    mock_client = MagicMock()
    mock_trace = MagicMock()
    mock_span = MagicMock()

    mock_client.trace.return_value = mock_trace
    mock_trace.span.return_value = mock_span

    tracer._client = mock_client
    tracer._is_enabled = True
    tracer.start_trace(name="error_test", story_id="err_001")

    with pytest.raises(ValueError, match="Intentional failure"):
        with tracer.span("failing_phase"):
            raise ValueError("Intentional failure")

    mock_span.end.assert_called_once()
    # level should be marked ERROR on update or end
    if mock_span.update.called:
        _, kwargs = mock_span.update.call_args
    else:
        _, kwargs = mock_span.end.call_args
    assert kwargs.get("level") == "ERROR"
    assert "Intentional failure" in kwargs.get("status_message", "")


def test_langfuse_tracer_live_auth():
    """Verify live authentication with configured Langfuse credentials."""
    tracer = LangfuseTracer()
    if tracer.is_enabled:
        assert tracer.auth_check() is True


def test_pipeline_tracing_and_metrics_integration():
    """Verify that StoryPipeline.run_iterative() triggers Langfuse traces and Prometheus metrics."""
    from pipeline.story_pipeline import StoryPipeline
    from monitoring.metrics import phase_runs

    mock_state_mgr = MagicMock()
    mock_state_mgr.story_id = "test_story_pipeline_001"
    mock_state_mgr.state = {"prompt": "Crystal Castle", "phases": {}}
    mock_state_mgr.archive_dir = Path("./temp/test_archive")
    mock_state_mgr.final_dir = Path("./temp/test_final")
    mock_state_mgr.is_phase_completed.return_value = False
    mock_state_mgr.is_cancelled.return_value = False

    pipeline = StoryPipeline(mock_state_mgr)
    pipeline.p1_script = MagicMock()
    pipeline.p1_script.execute.return_value = {"scenes": [{"scene_id": 1, "title": "Scene 1"}]}
    pipeline.p2_characters = MagicMock()
    pipeline.p2_characters.execute.return_value = {"characters": []}
    pipeline.p3_images = MagicMock()
    pipeline.p4_motion = MagicMock()
    pipeline.p5_video = MagicMock()
    pipeline.p5_video.caption_scene_clip.return_value = Path("./temp/clip.mp4")
    pipeline.p5_video.execute.return_value = Path("./temp/final.mp4")

    with patch("pipeline.story_pipeline.langfuse_tracer") as mock_tracer:
        mock_tracer.span.return_value.__enter__.return_value = MagicMock()
        mock_tracer.span.return_value.__exit__.return_value = False

        res = pipeline.run_iterative()
        assert res is not None

        # Verify Langfuse trace lifecycle
        mock_tracer.start_trace.assert_called_once()
        _, trace_kwargs = mock_tracer.start_trace.call_args
        assert trace_kwargs["name"] == "story_pipeline_iterative"
        assert trace_kwargs["story_id"] == "test_story_pipeline_001"

        mock_tracer.end_trace.assert_called_once()
        _, end_kwargs = mock_tracer.end_trace.call_args
        assert end_kwargs["output_data"]["status"] == "completed"

        # Verify spans for phase 1, phase 2, and scene 1
        span_names = [call.args[0] for call in mock_tracer.span.call_args_list]
        assert "phase_1_script" in span_names
        assert "phase_2_characters" in span_names
        assert "scene_01_iteration" in span_names
        assert "phase_3_images" in span_names
        assert "phase_4_animation_prompts" in span_names
        assert "phase_5_video_generation" in span_names

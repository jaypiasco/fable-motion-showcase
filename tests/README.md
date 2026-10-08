# FableMotion Test Suite (`tests/`)

Comprehensive test suite covering deterministic state recovery, multimodal prompt generation, media rendering pipelines, and API integrations.

## 📁 Test Architecture

```text
tests/
├── unit/                               # Fast in-memory unit tests (< 1s)
│   ├── test_character_reuse.py         # Character styling inheritance and uniqueness
│   ├── test_content_sanitizer.py       # Prompt sanitization, safety guardrails & regex filters
│   ├── test_cta_strategies.py          # Platform-aware Call-To-Action (CTA) strategies
│   ├── test_master_prompts.py          # Character Style DNA and preset registries
│   ├── test_scene1_viral_hook.py       # 3-second hook synchronization logic
│   └── test_story_archetypes.py        # Archetype sampling, exclusion & schema validation
│
├── integration/                        # Subsystem & service integration tests
│   ├── test_cancellation_resume.py    # Mid-pipeline cancellation & idempotent resumption
│   ├── test_cloud_persistence.py      # Dual-write sync (Supabase PostgreSQL + Google Cloud Storage)
│   ├── test_gateway_integration.py    # Third-party model gateway & JSON parser resilience
│   ├── test_langfuse_tracer.py        # Latency tracing, cost estimation, & telemetry
│   ├── test_media_providers.py        # Edge-TTS audio & Veo video provider registry routing
│   ├── test_phases_integration.py     # 5-Phase production workflow integration
│   ├── test_pipeline.py               # State machine, FFmpeg concatenation & ASS subtitles
│   ├── test_scene_storage_and_character_consistency.py # Multi-scene asset storage & Gemini image pool
│   └── test_server_ui.py              # FastAPI endpoints, system diagnostics & OAuth routes
│
├── conftest.py                         # Shared fixtures, mock clients & test configurations
└── pytest.ini                          # Root test discovery and execution configuration
```

## 🧪 Running Tests

```bash
# Run all unit tests (instant execution)
pytest tests/unit

# Run full integration suite
pytest tests/integration

# Run entire test suite with concise traceback
pytest -v

# Run with coverage report
pytest --cov=core --cov=phases --cov=prompts tests/
```

## 🛡️ CI/CD Integration

All unit and integration tests are executed automatically on GitHub Actions on every pull request and push to `main` via `.github/workflows/ci.yml`.

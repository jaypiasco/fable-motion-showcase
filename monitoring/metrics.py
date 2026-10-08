from prometheus_client import Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST

# Phase-level metrics
phase_runs = Counter("story_phase_runs_total", "Phase executions", ["phase", "status"])
phase_duration = Histogram("story_phase_duration_seconds", "Phase duration", ["phase"])
active_stories = Gauge("story_pipeline_active", "Stories currently running")

# Scene-level media generation metrics (Imagen 3 & Veo 3.1)
scene_imagen_runs = Counter(
    "story_scene_imagen_runs_total",
    "Imagen keyframe generations per scene",
    ["model", "status"]
)
scene_imagen_duration = Histogram(
    "story_scene_imagen_duration_seconds",
    "Imagen keyframe generation duration per scene",
    ["model"],
    buckets=[1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120]
)

scene_veo_runs = Counter(
    "story_scene_veo_runs_total",
    "Veo video clip generations per scene",
    ["model", "status"]
)
scene_veo_duration = Histogram(
    "story_scene_veo_duration_seconds",
    "Veo video clip generation duration per scene",
    ["model"],
    buckets=[5, 10, 20, 30, 45, 60, 90, 120, 180, 240, 300, 450, 600]
)

active_media_renders = Gauge(
    "story_media_renders_active",
    "Active media synthesis jobs running",
    ["media_type"]
)


def metrics_payload():
    return generate_latest(), CONTENT_TYPE_LATEST

"""
Automated test suite for AI Stories Studio Dashboard Backend & Media APIs.
"""

from fastapi.testclient import TestClient
from server import app


def test_server_ui_endpoints():
    client = TestClient(app)

    print("--- 1. Testing Static UI Assets & Landing Page ---")
    r_ui = client.get("/")
    assert r_ui.status_code == 200, f"UI status code: {r_ui.status_code}"
    assert "Fable Motion" in r_ui.text or "fable motion" in r_ui.text or "fablemotion" in r_ui.text, "Title/Brand missing"
    
    r_landing = client.get("/landing")
    assert r_landing.status_code == 200, f"Landing status code: {r_landing.status_code}"
    assert "fable motion" in r_landing.text or "fablemotion" in r_landing.text or "Ideas in" in r_landing.text, "Landing page content missing"
    print("[PASS] Next.js Fable Motion AI UI & Landing Page served correctly on FastAPI server")

    print("\n--- 1b. Testing Terms of Service & Privacy Policy URLs ---")
    for term_path in ["/terms", "/terms/", "/terms-of-service"]:
        r_terms = client.get(term_path)
        assert r_terms.status_code == 200, f"Terms status on {term_path}: {r_terms.status_code}"
        assert "Terms of Service" in r_terms.text, f"Terms text missing on {term_path}"
    print("[PASS] Terms of Service endpoints verified")

    for priv_path in ["/privacy", "/privacy/", "/privacy-policy"]:
        r_priv = client.get(priv_path)
        assert r_priv.status_code == 200, f"Privacy status on {priv_path}: {r_priv.status_code}"
        assert "Privacy Policy" in r_priv.text, f"Privacy text missing on {priv_path}"
    print("\n--- 1c. Testing Library Endpoint & Editor Redirects ---")
    r_lib = client.get("/library")
    assert r_lib.status_code == 200, f"Library status: {r_lib.status_code}"
    print("[PASS] Library endpoint verified")

    for old_editor_path in ["/editor", "/editor/", "/studio", "/studio/"]:
        r_redir = client.get(old_editor_path, follow_redirects=False)
        assert r_redir.status_code == 307, f"Redirect status on {old_editor_path}: {r_redir.status_code}"
        assert r_redir.headers.get("location") == "/library", f"Unexpected redirect target: {r_redir.headers.get('location')}"
    print("[PASS] Editor & Studio routes gracefully redirect to /library")

    r_vercel = client.get("/_vercel/insights/script.js")
    assert r_vercel.status_code == 200, f"Vercel insights status: {r_vercel.status_code}"
    print("[PASS] Vercel insights analytics stub returns 200")



    print("\n--- 2. Testing Models Configuration Endpoint ---")
    r_models = client.get("/api/models")
    assert r_models.status_code == 200
    models = r_models.json()
    print("[PASS] Models Config:")
    print(" - Script Model:", models.get("script_model"))
    print(" - Image Model Display:", models.get("image_model_display"))
    print(" - Video Model Display:", models.get("video_model_display"))

    print("\n--- 3. Testing Stories List Endpoint ---")
    r_stories = client.get("/api/stories")
    assert r_stories.status_code == 200
    stories = r_stories.json()
    assert len(stories) > 0, "No stories found in archive"
    print(f"[PASS] Stories returned: {len(stories)} stories. Latest: '{stories[0].get('title')}'")

    completed_stories = [s for s in stories if s.get("status") == "completed"]
    target_story = completed_stories[0] if completed_stories else stories[0]
    story_id = target_story["story_id"]
    print(f"Testing Story ID: {story_id} ('{target_story.get('title')}')")
    r_detail = client.get(f"/api/stories/{story_id}")
    assert r_detail.status_code == 200, f"Story detail status code: {r_detail.status_code}"
    data = r_detail.json()

    phases = data.get("phases", {})

    # Phase 1
    p1 = phases.get("phase_1_script", {})
    print("\nPhase 1 (Script & Storyboard):")
    print(" - Title:", p1.get("idea", {}).get("title"))
    print(" - 3s Hook:", p1.get("idea", {}).get("hook_3s"))
    print(" - Scenes Count:", len(p1.get("scenes", [])))
    print(" - Model Used:", p1.get("agent_model_used"))
    assert len(p1.get("scenes", [])) > 0

    # Phase 2
    p2 = phases.get("phase_2_characters", {})
    chars = p2.get("characters", [])
    print("\nPhase 2 (Characters):")
    print(" - Characters Count:", len(chars))
    if chars:
        print(" - Character 1 Name:", chars[0].get("name"))
        print(" - Model Used:", p2.get("agent_model_used"))
        print(" - Prompt Sent (sample):", str(chars[0].get("image_prompt_sent", ""))[:80] + "...")
        assert chars[0].get("image_prompt_sent")

    # Phase 3
    p3 = phases.get("phase_3_images", {})
    items_p3 = p3.get("items", [])
    print("\nPhase 3 (Keyframe Images):")
    print(" - Keyframes Count:", len(items_p3))
    print(" - Model Used:", p3.get("agent_model_used"))
    if items_p3:
        print(" - Keyframe 1 Prompt (sample):", str(items_p3[0].get("image_prompt_sent", ""))[:80] + "...")
        print(" - Keyframe 1 URL:", items_p3[0].get("image_url"))

    # Phase 4
    p4 = phases.get("phase_4_animation_prompts", {})
    items_p4 = p4.get("items", [])
    print("\nPhase 4 (Animation Motion Prompts):")
    print(" - Motion Prompts Count:", len(items_p4))
    print(" - Model Used:", p4.get("agent_model_used"))
    if items_p4:
        print(" - Motion Prompt 1 (sample):", str(items_p4[0].get("animation_prompt_generated", ""))[:80] + "...")

    # Phase 5
    p5 = phases.get("phase_5_video_generation", {})
    clips = p5.get("clips", [])
    print("\nPhase 5 (AI Video Generation & Assembly):")
    print(" - Video Clips Count:", len(clips))
    print(" - Model Used:", p5.get("agent_model_used"))
    if clips:
        print(" - Video Clip 1 URL:", clips[0].get("video_url"))
        print(" - Video Prompt Sent (sample):", str(clips[0].get("video_prompt_sent", ""))[:80] + "...")
    print(" - Captioned Video URL:", p5.get("assembly", {}).get("captioned_video_url"))

    print("\n--- 5. Testing Media Streaming (Range Header Support) ---")
    if items_p3 and items_p3[0].get("image_url"):
        keyframe_url = items_p3[0].get("image_url")
        r_img = client.get(keyframe_url)
        assert r_img.status_code == 200
        print(f"[PASS] Image streamed: {keyframe_url} (Content-Type: {r_img.headers.get('content-type')}, {len(r_img.content)} bytes)")

    if clips and clips[0].get("video_url"):
        vid_url = clips[0].get("video_url")
        r_vid = client.get(vid_url, headers={"Range": "bytes=0-1024"})
        assert r_vid.status_code in [200, 206]
        print(f"[PASS] Video streamed: {vid_url} (Content-Type: {r_vid.headers.get('content-type')}, Status: {r_vid.status_code})")

    print("\n--- 6. Testing Pipeline Status & Execution Logs ---")
    r_status = client.get("/api/status")
    assert r_status.status_code == 200
    print("[PASS] Status endpoint active:", r_status.json().get("updated_at"))

    r_logs = client.get(f"/api/logs/story/{story_id}")
    assert r_logs.status_code == 200
    log_lines = r_logs.json().get("logs", [])
    print(f"[PASS] Story logs loaded: {len(log_lines)} lines")

    print("\n--- 7. Testing Story Trash / Hide & Restore Endpoints ---")
    r_trash = client.post(f"/api/stories/{story_id}/trash")
    assert r_trash.status_code == 200
    trash_res = r_trash.json()
    assert trash_res.get("is_trashed") is True
    print(f"[PASS] Trashed story: {story_id}")

    # Verify story is flagged as trashed in details & list
    r_check = client.get(f"/api/stories/{story_id}")
    assert r_check.status_code == 200
    assert r_check.json().get("is_trashed") is True

    r_without_trashed = client.get("/api/stories?include_trashed=false")
    assert r_without_trashed.status_code == 200
    trashed_in_active = [s for s in r_without_trashed.json() if s["story_id"] == story_id]
    assert len(trashed_in_active) == 0, "Trashed story should be excluded when include_trashed=false"

    # Restore the story
    r_restore = client.post(f"/api/stories/{story_id}/restore")
    assert r_restore.status_code == 200
    restore_res = r_restore.json()
    assert restore_res.get("is_trashed") is False
    print(f"[PASS] Restored story: {story_id}")

    r_check_restored = client.get(f"/api/stories/{story_id}")
    assert r_check_restored.status_code == 200
    assert r_check_restored.json().get("is_trashed") is False
    print(f"[PASS] Verified story restored and untrashed in archive")

    print("\n=======================================================")
    print("  ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!  ")
    print("=======================================================")


def test_tools_diagnostics_endpoints():
    """Verify /api/tools/diagnostics and /api/tools/test/{tool_id} return proper tool status and task steps."""
    client = TestClient(app)

    print("\n--- Testing /api/tools/diagnostics ---")
    r_diag = client.get("/api/tools/diagnostics")
    assert r_diag.status_code == 200, f"Diagnostics status code: {r_diag.status_code}"
    diag_data = r_diag.json()

    assert diag_data.get("status") == "healthy"
    assert diag_data.get("operational_count") == 8
    assert diag_data.get("total_tools") == 8
    assert "tools" in diag_data
    assert len(diag_data["tools"]) == 8

    # Verify each tool has granular task steps
    for tool in diag_data["tools"]:
        assert "id" in tool
        assert "name" in tool
        assert "task_steps" in tool
        assert len(tool["task_steps"]) >= 4, f"Tool {tool['id']} should have at least 4 task steps"
        for step in tool["task_steps"]:
            assert "step_number" in step
            assert "title" in step
            assert "description" in step
            assert "status" in step
    print(f"[PASS] Verified 8 studio tools and task steps schema ({len(diag_data['tools'])} tools)")

    # Verify isolated tool test endpoint
    print("\n--- Testing /api/tools/test/script_llm ---")
    r_test = client.post("/api/tools/test/script_llm")
    assert r_test.status_code == 200
    test_res = r_test.json()
    assert test_res.get("success") is True
    assert test_res.get("status") == "passed"
    assert test_res.get("tool_id") == "script_llm"
    print(f"[PASS] Tool test execution passed: {test_res.get('message')}")


def test_oauth_multi_user_endpoints():
    """Verify /api/oauth endpoints for YouTube, Meta, and TikTok multi-user accounts."""
    import os
    os.environ["YOUTUBE_CLIENT_ID"] = "mock-yt-client-id"
    os.environ["META_APP_ID"] = "mock-meta-app-id"
    os.environ["TIKTOK_CLIENT_KEY"] = "mock-tiktok-client-key"

    client = TestClient(app)

    print("\n--- Testing /api/oauth/status & /api/oauth/client-config ---")
    r_status = client.get("/api/oauth/status?user_id=user_creator_01")
    assert r_status.status_code == 200
    data = r_status.json()
    assert data["user_id"] == "user_creator_01"
    assert "youtube" in data["accounts"]
    assert "meta" in data["accounts"]
    assert "tiktok" in data["accounts"]
    print("[PASS] Multi-user OAuth status verified for YouTube, Meta, TikTok")

    r_cfg = client.get("/api/oauth/client-config")
    assert r_cfg.status_code == 200
    cfg = r_cfg.json()
    assert cfg["youtube"] is True
    assert cfg["meta"] is True
    assert cfg["tiktok"] is True
    print("[PASS] Client configuration report verified")

    print("\n--- Testing OAuth Connect 307 Redirects ---")
    for platform in ["youtube", "meta", "tiktok"]:
        r_conn = client.get(f"/api/oauth/{platform}/connect?user_id=user_creator_01", follow_redirects=False)
        assert r_conn.status_code == 307
        loc = r_conn.headers.get("location")
        assert loc is not None
        print(f"[PASS] {platform.capitalize()} redirect verified: {loc[:45]}...")


if __name__ == "__main__":
    test_server_ui_endpoints()
    test_tools_diagnostics_endpoints()
    test_oauth_multi_user_endpoints()

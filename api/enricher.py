"""
Story Detail & Metadata Enrichment Service.
Serializes completed phase outputs, image keyframes, video clips, and prompts for the Studio Dashboard.
"""

from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from config import config
from api.helpers import get_agent_models_info, normalize_media_url, read_json_safely
from core.sanitizer import sanitize_visual_description, sanitize_dialogue


def get_story_summary(story_dir: Path) -> Optional[Dict[str, Any]]:
    """Reads basic metadata and preview image for story list cards."""
    state_file = story_dir / "pipeline_state.json"
    manifest_file = story_dir / "manifest.json"

    data = read_json_safely(state_file) or read_json_safely(manifest_file)
    is_trashed = (story_dir / ".trashed").exists() or bool(data.get("is_trashed", False) if data else False)
    is_test_dir = story_dir.name.startswith("test_") or "_test_" in story_dir.name.lower() or (data and bool(data.get("is_test_run", False)))

    if not data:
        return {
            "story_id": story_dir.name,
            "story_slug": story_dir.name,
            "title": story_dir.name.replace("_", " ").title(),
            "prompt": story_dir.name,
            "status": "unknown",
            "current_phase": "unknown",
            "created_at": datetime.fromtimestamp(story_dir.stat().st_ctime, timezone.utc).isoformat(),
            "updated_at": datetime.fromtimestamp(story_dir.stat().st_mtime, timezone.utc).isoformat(),
            "scenes_count": 0,
            "thumbnail_url": None,
            "has_final_video": False,
            "is_trashed": is_trashed,
            "is_test_run": is_test_dir,
        }

    story_id = data.get("story_id", story_dir.name)
    story_slug = data.get("story_slug", story_dir.name)
    prompt = data.get("prompt", "")
    status = data.get("status", "unknown")
    current_phase = data.get("current_phase", "unknown")
    created_at = data.get("created_at") or datetime.fromtimestamp(story_dir.stat().st_ctime, timezone.utc).isoformat()
    updated_at = data.get("updated_at") or datetime.fromtimestamp(story_dir.stat().st_mtime, timezone.utc).isoformat()

    p1 = data.get("phases", {}).get("phase_1_script", {}).get("data", {}) or {}
    title = p1.get("title") or prompt or story_slug.replace("_", " ").title()
    logline = p1.get("logline", "")
    scenes = p1.get("scenes", [])
    scenes_count = len(scenes)

    # Find a thumbnail (first character or first scene keyframe)
    thumbnail_url = None
    images_dir = story_dir / "images"
    characters_dir = story_dir / "characters"
    final_dir = story_dir / "final"

    if images_dir.exists():
        keyframes = sorted([f for f in (list(images_dir.glob("*.png")) + list(images_dir.glob("*.jpg"))) if f.is_file() and f.stat().st_size > 1024])
        if keyframes:
            thumbnail_url = normalize_media_url(str(keyframes[0]))

    if not thumbnail_url and characters_dir.exists():
        char_imgs = sorted([f for f in (list(characters_dir.glob("*.png")) + list(characters_dir.glob("*.jpg"))) if f.is_file() and f.stat().st_size > 1024])
        if char_imgs:
            thumbnail_url = normalize_media_url(str(char_imgs[0]))

    # Real assembled video must exist in final_dir and have valid size (>1KB)
    final_video = False
    final_video_url = None
    if final_dir.exists():
        for candidate in ["final_story_captioned.mp4", "final_story.mp4", "merged_video.mp4"]:
            candidate_path = final_dir / candidate
            if candidate_path.exists() and candidate_path.stat().st_size > 1024:
                final_video = True
                final_video_url = normalize_media_url(str(candidate_path))
                break

    return {
        "story_id": story_id,
        "story_slug": story_slug,
        "title": title,
        "logline": logline,
        "prompt": prompt,
        "status": status,
        "current_phase": current_phase,
        "created_at": created_at,
        "updated_at": updated_at,
        "scenes_count": scenes_count,
        "thumbnail_url": thumbnail_url,
        "has_final_video": final_video,
        "final_video_url": final_video_url,
        "is_trashed": is_trashed,
        "is_test_run": is_test_dir,
        "parent_story_id": data.get("parent_story_id"),
    }


def enrich_story_details(story_dir: Path) -> Dict[str, Any]:
    """Builds a rich, complete response for all 5 phases, models, and prompts."""
    state_file = story_dir / "pipeline_state.json"
    manifest_file = story_dir / "manifest.json"
    state = read_json_safely(state_file) or {}
    manifest = read_json_safely(manifest_file) or {}

    models_info = get_agent_models_info()
    phases_raw = state.get("phases", {})
    manifest_phases = manifest.get("phases", {})

    # =========================================================================
    # Phase 1: Script & Storyboard
    # =========================================================================
    p1_raw = phases_raw.get("phase_1_script", {})
    p1_data = p1_raw.get("data") or manifest_phases.get("phase_1_script", {}).get("data") or read_json_safely(story_dir / "scripts" / "script.json") or {}
    raw_scenes = p1_data.get("scenes", [])

    formatted_scenes = []
    concept_hook_3s = p1_data.get("hook_3s") or (state.get("selected_concept") or {}).get("hook_3s") or ""
    for sc in raw_scenes:
        sid = sc.get("scene_id", 1)
        scene_hook = sc.get("hook_3s") or (concept_hook_3s if sid == 1 else "")
        vo = sc.get("voiceover") or sc.get("narration") or (sc.get("dialogue") if isinstance(sc.get("dialogue"), str) else "")

        if not vo and sc.get("visual_description"):
            chars = sc.get("characters") or []
            if chars:
                vo = f"{chars[0]}: \"{sc['visual_description']}\""
            else:
                vo = f"Narrator: {sc['visual_description']}"

        v_desc = sanitize_visual_description(sc.get("visual_description") or sc.get("visual_action", ""))
        diag_val = sc.get("dialogue", "")
        if isinstance(diag_val, str):
            diag_val = sanitize_dialogue(diag_val)
        sanitized_vo = sanitize_dialogue(vo or "Emotional scene dialogue.")

        formatted_scenes.append({
            "scene_id": sid,
            "timestamp": sc.get("timestamp", ""),
            "shot_type": sc.get("shot_type", ""),
            "setting": sc.get("setting", ""),
            "visual_description": v_desc,
            "characters": sc.get("characters", []),
            "dialogue": diag_val,
            "narration": sanitize_dialogue(sc.get("narration", "")),
            "voiceover": sanitized_vo,
            "sfx_cue": sc.get("sfx_cue") or sc.get("audio_cues", ""),
            "duration_seconds": sc.get("duration_seconds", 5),
            "hook_3s": scene_hook if sid == 1 else None,
        })

    phase_1 = {
        "status": p1_raw.get("status") or manifest_phases.get("phase_1_script", {}).get("status", "completed" if raw_scenes else "pending"),
        "completed_at": p1_raw.get("completed_at") or manifest_phases.get("phase_1_script", {}).get("completed_at"),
        "agent_model_used": models_info["script_model"],
        "agent_model_display": f"{models_info['script_model']} (Gemini Script Agent)",
        "idea": {
            "title": p1_data.get("title", state.get("prompt", manifest.get("prompt", story_dir.name))),
            "logline": p1_data.get("logline", ""),
            "hook_3s": p1_data.get("hook_3s", ""),
            "genre": p1_data.get("genre", "Viral 3D Crystal Soap-Opera Drama"),
            "aspect_ratio": p1_data.get("aspect_ratio", "9:16"),
        },
        "scenes": formatted_scenes,
    }

    # =========================================================================
    # Phase 2: Characters Consistency
    # =========================================================================
    p2_raw = phases_raw.get("phase_2_characters", {})
    p2_data = p2_raw.get("data") or manifest_phases.get("phase_2_characters", {}).get("data") or read_json_safely(story_dir / "scripts" / "characters.json") or {}
    characters_list = []

    gemstone_fallback_map = {
        "obsidian": "Julian Corvus",
        "sapphire": "Elena Vance",
        "emerald": "Marcus Sterling",
        "diamond": "Victoria Chen",
        "gold": "Damian Cross",
        "ruby": "Scarlett Vance",
        "quartz": "Seraphina Reed",
        "crystal": "Aria Sterling",
        "character": "Alexander Knight",
    }

    current_generating_char = p2_raw.get("current_character")

    for char in p2_data.get("characters", []):
        raw_name = char.get("name", "Character").strip()
        char_name = gemstone_fallback_map.get(raw_name.lower(), raw_name)
        img_path = char.get("image_path")
        if not img_path or not Path(img_path).exists():
            candidate = story_dir / "characters" / f"{char_name}.png"
            if not candidate.exists() and (story_dir / "characters" / f"{raw_name}.png").exists():
                candidate = story_dir / "characters" / f"{raw_name}.png"
            if candidate.exists():
                img_path = str(candidate)

        c_shader = char.get("surface_shader") or char.get("material_shader") or char.get("fruit_shader") or char.get("crystal_shader", "")
        image_prompt_sent = char.get("style_seed_prompt")
        if not image_prompt_sent:
            image_prompt_sent = (
                f"Full body cinematic 3D character portrait of {char_name}, an anthropomorphic character "
                f"with {c_shader or 'rich organic surface texture'}, head fused into shoulders with no neck, "
                f"wearing {char.get('signature_wardrobe', 'fitted navy-blue blazer, crisp white shirt, black tie')}. "
                f"Facial & physical anchor: {char.get('visual_anchor', '')}. "
                f"Ultra-detailed Pixar-style 3D rendering, large glossy expressive eyes, pure white background, Octane Render 8k, 9:16 vertical composition."
            )

        char_is_generating = bool(current_generating_char and current_generating_char.strip().lower() == char_name.strip().lower())
        char_img_url = char.get("image_url") or normalize_media_url(img_path)
        char_status = "generating" if char_is_generating else ("completed" if char_img_url else "pending")

        characters_list.append({
            "name": char_name,
            "role": char.get("role") or char.get("archetype") or "Cast",
            "archetype": char.get("archetype", ""),
            "surface_shader": c_shader,
            "fruit_shader": c_shader,
            "crystal_shader": c_shader,
            "signature_wardrobe": char.get("signature_wardrobe", ""),
            "vocal_tone": char.get("vocal_tone", ""),
            "hidden_motivation": char.get("hidden_motivation", ""),
            "visual_anchor": char.get("visual_anchor", ""),
            "style_prompt": image_prompt_sent,
            "style_seed_prompt": char.get("style_seed_prompt", ""),
            "image_url": char_img_url,
            "status": char_status,
            "agent_model_used": models_info["image_model_display"],
            "image_prompt_sent": image_prompt_sent,
        })

    if not characters_list and formatted_scenes:
        extracted_names = []
        for sc in formatted_scenes:
            for c in sc.get("characters", []):
                if isinstance(c, str) and c.strip() and c.strip() not in extracted_names:
                    extracted_names.append(c.strip())
        for idx, c_name in enumerate(extracted_names):
            norm_name = gemstone_fallback_map.get(c_name.lower(), c_name)
            candidate = story_dir / "characters" / f"{norm_name}.png"
            img_path = str(candidate) if candidate.exists() else None
            role = "Protagonist" if idx == 0 else ("Antagonist" if idx == 1 else "Supporting Cast")
            style_prompt = (
                f"Full body cinematic 3D character portrait of {norm_name}, an anthropomorphic fruit character "
                f"with naturally textured organic peel surface, head fused into shoulders with no neck, large glossy expressive eyes, "
                f"wearing bespoke luxury tailored attire. Centered on a pure white background, Octane Render 8k, 9:16 vertical composition."
            )
            char_is_generating = bool(current_generating_char and current_generating_char.strip().lower() == norm_name.strip().lower())
            char_img_url = normalize_media_url(img_path) if img_path else None
            characters_list.append({
                "name": norm_name,
                "role": role,
                "archetype": role,
                "crystal_shader": "ripe organic peel",
                "fruit_shader": "ripe organic peel",
                "signature_wardrobe": "bespoke luxury tailored attire",
                "vocal_tone": "Warm, confident, natural",
                "hidden_motivation": "Protecting family legacy",
                "visual_anchor": "Naturally textured organic peel, large expressive glossy eyes, bespoke attire.",
                "style_prompt": style_prompt,
                "style_seed_prompt": style_prompt,
                "image_url": char_img_url,
                "status": "generating" if char_is_generating else ("completed" if char_img_url else "pending"),
                "agent_model_used": models_info["image_model_display"],
                "image_prompt_sent": style_prompt,
            })

    phase_2 = {
        "status": p2_raw.get("status", "pending"),
        "current_character": current_generating_char,
        "completed_at": p2_raw.get("completed_at"),
        "agent_model_used": models_info["image_model_display"],
        "script_model_used": models_info["script_model"],
        "story_summary": p2_data.get("story_summary", ""),
        "characters": characters_list,
    }

    # =========================================================================
    # Phase 3: Scene Keyframe Images
    # =========================================================================
    p3_raw = phases_raw.get("phase_3_images", {})
    p3_items = p3_raw.get("items") or manifest_phases.get("phase_3_images", {}).get("items") or []
    p3_current_scene = p3_raw.get("current_scene")
    keyframes_list = []
    p3_map = {item.get("scene_id", i + 1): item for i, item in enumerate(p3_items)}

    for idx, sc in enumerate(formatted_scenes, start=1):
        scene_id = sc.get("scene_id", idx)
        item = p3_map.get(scene_id, {})
        img_path = item.get("image_path")
        candidate = story_dir / "images" / f"scene_{scene_id:02d}_keyframe.png"
        cand_exists = candidate.exists() and candidate.stat().st_size > 1024
        if cand_exists:
            img_path = str(candidate)
        elif img_path and Path(img_path).exists() and Path(img_path).stat().st_size > 1024:
            img_path = str(img_path)
        else:
            img_path = None

        raw_item_status = item.get("status")
        raw_url = item.get("image_url")
        is_cloud_url = bool(raw_url and (raw_url.startswith("http://") or raw_url.startswith("https://") or raw_url.startswith("data:")))

        if raw_item_status == "generating" or p3_current_scene == scene_id:
            kf_status = "generating"
        elif cand_exists or is_cloud_url or (img_path and raw_item_status == "completed"):
            kf_status = "completed"
        elif raw_item_status == "error":
            kf_status = "error"
        else:
            kf_status = "pending"

        final_img_url = raw_url if is_cloud_url else (normalize_media_url(img_path) if img_path else None)

        keyframes_list.append({
            "scene_id": scene_id,
            "shot_type": sc.get("shot_type", ""),
            "setting": sc.get("setting", ""),
            "image_url": final_img_url,
            "status": kf_status,
            "error": item.get("error"),
            "completed_at": item.get("completed_at"),
            "agent_model_used": models_info["image_model_display"],
            "image_prompt_sent": item.get("prompt") or f"{sc.get('visual_description')}",
            "hook_3s": item.get("hook_3s") or (sc.get("hook_3s") if scene_id == 1 else None),
        })

    phase_3 = {
        "status": p3_raw.get("status") or manifest_phases.get("phase_3_images", {}).get("status", "pending"),
        "current_scene": p3_current_scene,
        "error": p3_raw.get("error") or (state.get("last_error") if p3_raw.get("status") == "error" else None),
        "completed_at": p3_raw.get("completed_at") or manifest_phases.get("phase_3_images", {}).get("completed_at"),
        "agent_model_used": models_info["image_model_display"],
        "items": keyframes_list,
    }

    # =========================================================================
    # Phase 4: Animation Prompts
    # =========================================================================
    p4_raw = phases_raw.get("phase_4_animation_prompts", {})
    p4_items = p4_raw.get("items") or manifest_phases.get("phase_4_animation_prompts", {}).get("items") or read_json_safely(story_dir / "scripts" / "motion_prompts.json") or []
    if isinstance(p4_items, dict) and "items" in p4_items:
        p4_items = p4_items["items"]
    elif not isinstance(p4_items, list):
        p4_items = [p4_items]

    # Pre-map phase 5 items for cross-referencing video clips
    p5_raw = phases_raw.get("phase_5_video_generation", {})
    p5_items = p5_raw.get("items") or manifest_phases.get("phase_5_video_generation", {}).get("items") or []
    p5_map = {item.get("scene_id", i + 1): item for i, item in enumerate(p5_items)}

    p4_current_scene = p4_raw.get("current_scene") or p5_raw.get("current_scene")
    motion_list = []
    p4_map = {item.get("scene_id", i + 1): item for i, item in enumerate(p4_items) if isinstance(item, dict)}

    for idx, sc in enumerate(formatted_scenes, start=1):
        scene_id = sc.get("scene_id", idx)
        item = p4_map.get(scene_id, {})
        matching_clip = p5_map.get(scene_id, {})

        motion_prompt = item.get("motion_prompt") or f"Cinematic push-in on character, {sc.get('visual_description')}"
        camera_dyn = item.get("camera_dynamics") or item.get("camera_movement") or "Medium eye-level shot"
        action_desc = item.get("action_description") or sc.get("visual_description")
        dialogue = item.get("dialogue") or sc.get("dialogue")
        audio_cues = item.get("audio_cues") or sc.get("sfx_cue")

        cand_clip_path = story_dir / "clips" / f"scene_{scene_id:02d}.mp4"
        cand_exists = cand_clip_path.exists() and cand_clip_path.stat().st_size > 1024
        raw_clip_status = matching_clip.get("status") or item.get("status")

        clip_vid_url = None
        if cand_exists and raw_clip_status != "error":
            clip_vid_url = f"/media/{story_dir.name}/clips/scene_{scene_id:02d}.mp4"
        else:
            cand_url = item.get("video_url") or matching_clip.get("video_url")
            if cand_url and str(cand_url).startswith(("http://", "https://")) and raw_clip_status != "error":
                clip_vid_url = cand_url

        if raw_clip_status == "error" or matching_clip.get("error"):
            clip_status = "error"
        elif raw_clip_status == "generating" or p4_current_scene == scene_id:
            clip_status = "generating"
        elif (cand_exists or (clip_vid_url and clip_vid_url.startswith(("http://", "https://")))) and (raw_clip_status == "completed" or matching_clip.get("status") == "completed"):
            clip_status = "completed"
        else:
            clip_status = "pending"

        motion_list.append({
            "scene_id": scene_id,
            "animation_prompt_generated": motion_prompt,
            "camera_dynamics": camera_dyn,
            "camera_movement": camera_dyn,
            "action_description": action_desc,
            "dialogue": dialogue,
            "audio_cues": audio_cues,
            "duration": item.get("duration", sc.get("duration_seconds", 5)),
            "video_url": clip_vid_url,
            "status": clip_status,
            "hook_3s": item.get("hook_3s") or (sc.get("hook_3s") if scene_id == 1 else None),
            "agent_model_used": models_info["script_model"],
            "agent_model_display": f"{models_info['script_model']} (Motion Engineering Agent)",
        })

    phase_4 = {
        "status": p4_raw.get("status") or manifest_phases.get("phase_4_animation_prompts", {}).get("status", "pending"),
        "current_scene": p4_current_scene,
        "error": p4_raw.get("error") or (state.get("last_error") if p4_raw.get("status") == "error" else None),
        "completed_at": p4_raw.get("completed_at") or manifest_phases.get("phase_4_animation_prompts", {}).get("completed_at"),
        "agent_model_used": models_info["script_model"],
        "items": motion_list,
    }

    # =========================================================================
    # Phase 5: AI Video Generation & Assembly
    # =========================================================================
    video_clips_list = []

    for idx, sc in enumerate(formatted_scenes, start=1):
        scene_id = sc.get("scene_id", idx)
        item = p5_map.get(scene_id, {})
        cand = story_dir / "clips" / f"scene_{scene_id:02d}.mp4"
        cand_exists = cand.exists() and cand.stat().st_size > 1024

        raw_status = item.get("status")
        vid_path = item.get("video_path")
        if cand_exists and raw_status != "error":
            vid_path = str(cand)

        m_item = p4_map.get(scene_id, {})
        video_prompt_sent = m_item.get("motion_prompt", sc.get("visual_description", ""))

        vid_url = None
        if cand_exists and raw_status != "error":
            vid_url = f"/media/{story_dir.name}/clips/scene_{scene_id:02d}.mp4"
        else:
            cand_u = item.get("video_url")
            if cand_u and str(cand_u).startswith(("http://", "https://")) and raw_status != "error":
                vid_url = cand_u

        if raw_status == "error" or item.get("error"):
            c_status = "error"
        elif raw_status == "generating":
            c_status = "generating"
        elif (cand_exists or (vid_url and vid_url.startswith(("http://", "https://")))) and raw_status == "completed":
            c_status = "completed"
        else:
            c_status = "pending"

        video_clips_list.append({
            "scene_id": scene_id,
            "video_url": vid_url,
            "status": c_status,
            "error": item.get("error") or m_item.get("error"),
            "completed_at": item.get("completed_at"),
            "agent_model_used": models_info["video_model_display"],
            "video_prompt_sent": video_prompt_sent,
        })

    # Assembly files & subtitles
    assembly_raw = phases_raw.get("assembly", {})
    final_dir = story_dir / "final"

    merged_vid = final_dir / "merged_video.mp4"
    final_vid = final_dir / "final_story.mp4"
    captioned_vid = final_dir / "final_story_captioned.mp4"
    subtitles_file = final_dir / "subtitles.ass"
    voiceover_file = final_dir / "voiceover.mp3"

    subtitles_content = None
    if subtitles_file.exists():
        try:
            with open(subtitles_file, "r", encoding="utf-8") as sf:
                subtitles_content = sf.read()
        except Exception:
            pass

    has_real_final_vid = (
        (captioned_vid.exists() and captioned_vid.stat().st_size > 1024) or
        (final_vid.exists() and final_vid.stat().st_size > 1024) or
        (merged_vid.exists() and merged_vid.stat().st_size > 1024)
    )

    real_final_url = None
    if captioned_vid.exists() and captioned_vid.stat().st_size > 1024:
        real_final_url = normalize_media_url(str(captioned_vid))
    elif final_vid.exists() and final_vid.stat().st_size > 1024:
        real_final_url = normalize_media_url(str(final_vid))
    elif merged_vid.exists() and merged_vid.stat().st_size > 1024:
        real_final_url = normalize_media_url(str(merged_vid))

    assembly_data = {
        "status": assembly_raw.get("status", "completed" if has_real_final_vid else "pending"),
        "completed_at": assembly_raw.get("completed_at"),
        "merged_video_url": normalize_media_url(str(merged_vid)) if (merged_vid.exists() and merged_vid.stat().st_size > 1024) else None,
        "final_video_url": real_final_url,
        "captioned_video_url": normalize_media_url(str(captioned_vid)) if (captioned_vid.exists() and captioned_vid.stat().st_size > 1024) else None,
        "subtitles_url": normalize_media_url(str(subtitles_file)) if subtitles_file.exists() else None,
        "voiceover_url": normalize_media_url(str(voiceover_file)) if voiceover_file.exists() else None,
        "subtitles_content": subtitles_content,
    }

    phase_5 = {
        "status": p5_raw.get("status", "pending"),
        "error": p5_raw.get("error") or (state.get("last_error") if p5_raw.get("status") == "error" else None),
        "completed_at": p5_raw.get("completed_at"),
        "agent_model_used": models_info["video_model_display"],
        "items": video_clips_list,
        "clips": video_clips_list,
        "assembly": assembly_data,
    }

    log_file = story_dir / "story_execution.log"
    has_log = log_file.exists()
    is_trashed = (story_dir / ".trashed").exists() or bool(state.get("is_trashed", False))

    return {
        "story_id": state.get("story_id", story_dir.name),
        "story_slug": state.get("story_slug", story_dir.name),
        "parent_story_id": state.get("parent_story_id"),
        "prompt": state.get("prompt", ""),
        "created_at": state.get("created_at"),
        "updated_at": state.get("updated_at"),
        "status": state.get("status", "completed"),
        "error": state.get("error") or state.get("last_error"),
        "last_error": state.get("last_error"),
        "current_phase": state.get("current_phase", "completed"),
        "archive_dir": str(story_dir),
        "models_config": models_info,
        "has_log": has_log,
        "is_trashed": is_trashed,
        "is_test_run": bool(state.get("is_test_run", False)),
        "concepts": state.get("concepts"),
        "selected_concept": state.get("selected_concept"),
        "call_to_action": state.get("call_to_action") or "Choose a concept (1, 2, or 3) or provide custom modifications to proceed to Phase 2.",
        "phases": {
            "phase_1_script": phase_1,
            "phase_2_characters": phase_2,
            "phase_3_images": phase_3,
            "phase_4_animation_prompts": phase_4,
            "phase_5_video_generation": phase_5,
        }
    }


def enrich_story_state_dict(state: Dict[str, Any], remote_story: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Enriches a raw state dictionary from Supabase so that all media URLs,
    scenes, and phase data adhere to the Studio Dashboard API contract.
    """
    story_id = state.get("story_id") or (remote_story.get("id") if remote_story else "story")
    story_slug = state.get("story_slug") or (remote_story.get("slug") if remote_story else story_id)
    models_info = get_agent_models_info()
    phases_raw = state.get("phases", {})

    # Phase 1
    p1_raw = phases_raw.get("phase_1_script", {})
    p1_data = p1_raw.get("data") or p1_raw.get("idea") or (remote_story.get("script_data") if remote_story else {}) or {}
    raw_scenes = p1_data.get("scenes", [])
    formatted_scenes = []
    for sc in raw_scenes:
        vo = sc.get("voiceover") or sc.get("narration") or (sc.get("dialogue") if isinstance(sc.get("dialogue"), str) else "")
        if not vo and sc.get("visual_description"):
            chars = sc.get("characters") or []
            vo = f"{chars[0]}: \"{sc['visual_description']}\"" if chars else f"Narrator: {sc['visual_description']}"
        formatted_scenes.append({
            "scene_id": sc.get("scene_id", 1),
            "timestamp": sc.get("timestamp", ""),
            "shot_type": sc.get("shot_type", ""),
            "setting": sc.get("setting", ""),
            "visual_description": sc.get("visual_description") or sc.get("visual_action", ""),
            "characters": sc.get("characters", []),
            "dialogue": sc.get("dialogue", ""),
            "narration": sc.get("narration", ""),
            "voiceover": vo or "Emotional scene dialogue.",
            "sfx_cue": sc.get("sfx_cue") or sc.get("audio_cues", ""),
            "duration_seconds": sc.get("duration_seconds", 5),
        })

    phase_1 = {
        "status": p1_raw.get("status", "completed" if raw_scenes else "pending"),
        "completed_at": p1_raw.get("completed_at"),
        "agent_model_used": models_info["script_model"],
        "agent_model_display": f"{models_info['script_model']} (Gemini Script Agent)",
        "idea": {
            "title": p1_data.get("title", state.get("prompt", story_slug)),
            "logline": p1_data.get("logline", ""),
            "hook_3s": p1_data.get("hook_3s", ""),
            "genre": p1_data.get("genre", "Viral 3D Anthropomorphic Produce Drama"),
            "aspect_ratio": p1_data.get("aspect_ratio", "9:16"),
        },
        "scenes": formatted_scenes,
    }

    # Phase 2
    p2_raw = phases_raw.get("phase_2_characters", {})
    chars = p2_raw.get("characters") or (remote_story.get("characters") if remote_story else []) or []
    current_generating_char = p2_raw.get("current_character")
    archive_dir_path = Path(archive_dir) if archive_dir else None
    for c in chars:
        c_name = c.get("name", "character").lower().replace(" ", "_")
        c_url = c.get("image_url")
        is_cloud_c = bool(c_url and (c_url.startswith("http://") or c_url.startswith("https://") or c_url.startswith("data:")))
        c_p = c.get("image_path")
        c_cand = (archive_dir_path / story_id / "characters" / f"{c_name}.png") if archive_dir_path else None
        c_cand_exists = bool(c_cand and c_cand.exists() and c_cand.stat().st_size > 1024)

        if is_cloud_c:
            c_img = c_url
        elif c_cand_exists:
            c_img = f"/media/{story_id}/characters/{c_name}.png"
        elif c_p and Path(c_p).exists() and Path(c_p).stat().st_size > 1024:
            c_img = normalize_media_url(c_p)
        else:
            c_img = None

        c["image_url"] = c_img
        c["agent_model_used"] = models_info["image_model_display"]
        if current_generating_char and current_generating_char.strip().lower() == c.get("name", "").strip().lower():
            c["status"] = "generating"
        elif c_img and (c.get("status") == "completed" or c_cand_exists or is_cloud_c):
            c["status"] = "completed"
        else:
            c["status"] = "pending"

    phase_2 = {
        "status": p2_raw.get("status", "completed" if chars else "pending"),
        "current_character": current_generating_char,
        "completed_at": p2_raw.get("completed_at"),
        "agent_model_used": models_info["image_model_display"],
        "characters": chars,
    }

    # Phase 3
    p3_raw = phases_raw.get("phase_3_images", {})
    p3_items = p3_raw.get("items") or []
    p3_current_scene = p3_raw.get("current_scene")
    p3_map = {item.get("scene_id", i + 1): item for i, item in enumerate(p3_items)}
    keyframes = []
    for idx, sc in enumerate(formatted_scenes, start=1):
        sid = sc.get("scene_id", idx)
        it = p3_map.get(sid, {})
        it_url = it.get("image_url")
        is_cloud = bool(it_url and (it_url.startswith("http://") or it_url.startswith("https://") or it_url.startswith("data:")))
        p = it.get("image_path")
        cand = (archive_dir_path / story_id / "images" / f"scene_{sid:02d}_keyframe.png") if archive_dir_path else None
        cand_exists = bool(cand and cand.exists() and cand.stat().st_size > 1024)

        if is_cloud:
            img_url = it_url
        elif cand_exists:
            img_url = f"/media/{story_id}/images/scene_{sid:02d}_keyframe.png"
        elif p and Path(p).exists() and Path(p).stat().st_size > 1024:
            img_url = normalize_media_url(p)
        else:
            img_url = None

        raw_item_status = it.get("status")
        if raw_item_status == "generating" or p3_current_scene == sid:
            kf_status = "generating"
        elif img_url and (raw_item_status == "completed" or cand_exists or is_cloud):
            kf_status = "completed"
        elif raw_item_status == "error":
            kf_status = "error"
        else:
            kf_status = "pending"

        keyframes.append({
            "scene_id": sid,
            "shot_type": sc.get("shot_type", ""),
            "setting": sc.get("setting", ""),
            "image_url": img_url,
            "status": kf_status,
            "completed_at": it.get("completed_at"),
            "agent_model_used": models_info["image_model_display"],
            "image_prompt_sent": it.get("prompt") or sc.get("visual_description", ""),
        })

    phase_3 = {
        "status": p3_raw.get("status", "pending"),
        "current_scene": p3_current_scene,
        "error": p3_raw.get("error"),
        "completed_at": p3_raw.get("completed_at"),
        "agent_model_used": models_info["image_model_display"],
        "items": keyframes,
    }

    # Phase 4 & 5
    p4_raw = phases_raw.get("phase_4_animation_prompts", {})
    p4_items = p4_raw.get("items") or []
    p4_current_scene = p4_raw.get("current_scene") or phases_raw.get("phase_5_video_generation", {}).get("current_scene")
    p4_map = {item.get("scene_id", i + 1): item for i, item in enumerate(p4_items)}

    p5_raw = phases_raw.get("phase_5_video_generation", {})
    p5_items = p5_raw.get("items") or p5_raw.get("clips") or []
    p5_map = {item.get("scene_id", i + 1): item for i, item in enumerate(p5_items)}

    motion_list = []
    video_clips_list = []

    for idx, sc in enumerate(formatted_scenes, start=1):
        sid = sc.get("scene_id", idx)
        m_it = p4_map.get(sid, {})
        v_it = p5_map.get(sid, {})

        raw_clip_status = v_it.get("status")
        vid_url = v_it.get("video_url") or normalize_media_url(v_it.get("video_path"))
        if not vid_url and v_it.get("status") == "completed":
            vid_url = f"/media/{story_id}/clips/scene_{sid:02d}.mp4"
        elif raw_clip_status == "error":
            vid_url = None

        if raw_clip_status == "error" or v_it.get("error"):
            clip_status = "error"
        elif raw_clip_status == "generating" or p4_current_scene == sid:
            clip_status = "generating"
        elif vid_url and raw_clip_status == "completed":
            clip_status = "completed"
        else:
            clip_status = "pending"

        motion_prompt = m_it.get("motion_prompt") or f"Cinematic push-in, {sc.get('visual_description')}"
        motion_list.append({
            "scene_id": sid,
            "animation_prompt_generated": motion_prompt,
            "camera_dynamics": m_it.get("camera_dynamics") or "Medium eye-level shot",
            "camera_movement": m_it.get("camera_movement") or "Medium eye-level shot",
            "action_description": m_it.get("action_description") or sc.get("visual_description"),
            "dialogue": m_it.get("dialogue") or sc.get("dialogue"),
            "audio_cues": m_it.get("audio_cues") or sc.get("sfx_cue"),
            "duration": m_it.get("duration", sc.get("duration_seconds", 5)),
            "video_url": vid_url,
            "status": clip_status,
            "agent_model_used": models_info["script_model"],
            "agent_model_display": f"{models_info['script_model']} (Motion Engineering Agent)",
        })

        video_clips_list.append({
            "scene_id": sid,
            "video_url": vid_url,
            "status": clip_status,
            "error": v_it.get("error") or m_it.get("error"),
            "completed_at": v_it.get("completed_at"),
            "agent_model_used": models_info["video_model_display"],
            "video_prompt_sent": motion_prompt,
        })

    phase_4 = {
        "status": p4_raw.get("status", "pending"),
        "current_scene": p4_current_scene,
        "error": p4_raw.get("error"),
        "completed_at": p4_raw.get("completed_at"),
        "agent_model_used": models_info["script_model"],
        "items": motion_list,
    }

    assembly_raw = phases_raw.get("assembly", {})
    captioned_url_val = normalize_media_url(
        assembly_raw.get("captioned_video_url")
        or assembly_raw.get("captioned_video_path")
        or state.get("captioned_video_url")
    )
    final_video_url_val = captioned_url_val or normalize_media_url(
        assembly_raw.get("final_video_url")
        or assembly_raw.get("final_video_path")
        or state.get("final_video_url")
    )
    assembly_data = {
        "status": assembly_raw.get("status", "completed" if final_video_url_val else ("skipped" if not getattr(config, "ENABLE_ASSEMBLY", False) else "pending")),
        "completed_at": assembly_raw.get("completed_at"),
        "merged_video_url": normalize_media_url(assembly_raw.get("merged_video_url") or assembly_raw.get("merged_video_path")),
        "final_video_url": final_video_url_val,
        "captioned_video_url": captioned_url_val or final_video_url_val,
        "subtitles_url": normalize_media_url(assembly_raw.get("subtitles_url") or assembly_raw.get("subtitles_path")),
        "voiceover_url": normalize_media_url(assembly_raw.get("voiceover_url") or assembly_raw.get("voiceover_path")),
        "subtitles_content": assembly_raw.get("subtitles_content"),
    }

    phase_5 = {
        "status": p5_raw.get("status", "pending"),
        "error": p5_raw.get("error"),
        "completed_at": p5_raw.get("completed_at"),
        "agent_model_used": models_info["video_model_display"],
        "items": video_clips_list,
        "clips": video_clips_list,
        "assembly": assembly_data,
    }

    return {
        "story_id": story_id,
        "story_slug": story_slug,
        "parent_story_id": state.get("parent_story_id"),
        "prompt": state.get("prompt", ""),
        "created_at": state.get("created_at"),
        "updated_at": state.get("updated_at"),
        "status": state.get("status", "completed"),
        "error": state.get("error") or state.get("last_error"),
        "last_error": state.get("last_error"),
        "current_phase": state.get("current_phase", "completed"),
        "archive_dir": state.get("archive_dir", f"/app/archive/{story_id}"),
        "models_config": models_info,
        "has_log": bool(state.get("has_log", False)),
        "is_trashed": bool(state.get("is_trashed", False)),
        "is_test_run": bool(state.get("is_test_run", False)),
        "concepts": state.get("concepts"),
        "selected_concept": state.get("selected_concept"),
        "call_to_action": state.get("call_to_action") or "Choose a concept (1, 2, or 3) or provide custom modifications to proceed to Phase 2.",
        "phases": {
            "phase_1_script": phase_1,
            "phase_2_characters": phase_2,
            "phase_3_images": phase_3,
            "phase_4_animation_prompts": phase_4,
            "phase_5_video_generation": phase_5,
        }
    }

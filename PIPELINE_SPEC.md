# AI Video Story Generation Pipeline — Project Specification & Reference Guide

**Version**: 2.2 (Streamlined Architecture)  
**Updated**: September 2026  
**Primary Engine**: Google Cloud Vertex AI & Google Gemini REST API  

---

## 1. Executive Summary & Model Matrix

The pipeline is organized into a clean, 5-phase generative sequence designed to move from high-level concept to finished 9:16 vertical video with minimal moving parts.

| Pipeline Phase | Primary Function | Model / Engine (Production) | Outputs & Deliverables |
| :--- | :--- | :--- | :--- |
| **Phase 1: Script & Scene Beats** | **Treatment, hook & dialogue (10-14 Scenes)** | **Google Gemini 3.5 Flash-Lite** / `gemini-2.5-flash` | Vertical 9:16 treatment, 3s viral hook, 10-14 scene pacing, dialogue & audio cues (`scripts/script.json`, `scripts/script.md`) |
| **Phase 2: Character Bibles & assets** | **Global cast anchors stored in assets** | **Google Imagen 3** (`imagen-3.0-generate-002`) / Gemini | Character visual styling, shaders, acoustic audio profile, and 9:16 reference portraits (`assets/characters/{name}.png`, `scripts/characters.json`) |
| **Phase 3: Scene Keyframe Generation** | **Keyframes from assets reference** | **Google Imagen 3** (`imagen-3.0-generate-002`) | Scene keyframe stills using scene scripts and character portraits from assets for video generation (`images/scene_{id:02d}_keyframe.png`) |
| **Phase 4: Motion Dynamics & Video Clips** | **Applies dialogue scripts & renders video clips** | **Google Veo 3.1 Fast** / AI Video Generator | Single-pass cinematic video clips with native audio/dialogue (`clips/scene_{id:02d}.mp4`, `scripts/motion_prompts.json`) |
| **Phase 5: Caption & Final Clip Merge** | **Dynamic captions & final clip merge** | **Faster-Whisper** · **FFmpeg Concatenation** | Dynamic word-level captions per clip, concatenated master delivery (`final/final_story.mp4`) |

---

## 2. 5-Phase Collaborative Workflow

```
[Phase 1: Script & Scene Beats]
       │  Generates 9:16 treatment, 3s viral hook, 10-14 scene pacing, dialogue, and cues
       ▼
[Phase 2: Character Bibles & assets]
       │  Synthesizes visual styling, shaders, acoustic audio profile,
       │  and renders 9:16 reference portraits stored in assets
       ▼
[Phase 3: Scene Keyframe Generation]
       │  Generates scene keyframe stills using scene scripts
       │  and character portraits from assets for video generation
       ▼
[Phase 4: Motion Dynamics & Video Clips]
       │  Applies character dialogue scripts and renders
       │  single-pass cinematic video clips with audio
       ▼
[Phase 5: Caption & Final Clip Merge]
          Applies dynamic word-level captions per clip and merges
          all scene clips into the complete story master
```

---

## 3. Standardized Folder Architecture & Inter-Phase Asset Flow

All story artifacts are stored in `./archive/{timestamp}_{story_slug}/` with an intuitive, isolated directory structure:

```
archive/{timestamp}_{story_slug}/
│
├── pipeline_state.json        # Atomic state file (progress, checkpoints, errors)
├── manifest.json              # Top-level story package manifest
│
├── scripts/                   # Phase 1 & 4 text deliverables
│   ├── script.json            # Phase 1: 10-14 scene breakdown, dialogue, hook
│   ├── script.md              # Phase 1: Human-readable markdown script
│   ├── characters.json        # Phase 2: Character visual bibles & prompts
│   └── motion_prompts.json    # Phase 4: Motion dynamics & dialogue blueprints
│
├── characters/                # Phase 2 visual assets (stored in assets/characters)
│   ├── Arthur_Bananier.png    # Generated via Imagen 3 from character bibles
│   └── Elena_Vance.png
│
├── images/                    # Phase 3 visual assets (Keyframes)
│   ├── scene_01_keyframe.png  # Generated via Imagen 3 referencing assets
│   ├── scene_02_keyframe.png
│   └── scene_03_keyframe.png
│
├── clips/                     # Phase 4 video clips
│   ├── scene_01.mp4           # Rendered using scene keyframe & dialogue scripts
│   ├── scene_02.mp4
│   └── scene_03.mp4
│
└── final/                     # Phase 5 master delivery
    └── final_story.mp4        # Stitched master video with dynamic captions
```

### Inter-Phase Asset Dependencies
1. **Phase 1 $\rightarrow$ Phase 2**:
   * Output: `scripts/script.json` (scene breakdown, characters, dialogue).
   * Ingestion: Phase 2 parses character definitions to formulate visual DNA and audio profiles.
2. **Phase 2 $\rightarrow$ Phase 3**:
   * Output: `characters/{character_name}.png` (anchored in assets).
   * Ingestion: When Phase 3 generates `images/scene_{id:02d}_keyframe.png`, it retrieves character portraits from assets via `StateManager.get_character_image_path()`.
3. **Phase 3 $\rightarrow$ Phase 4**:
   * Output: `images/scene_{id:02d}_keyframe.png`.
   * Ingestion: Phase 4 loads the keyframe directly, applies character dialogue scripts, and renders single-pass video clips.
4. **Phase 4 $\rightarrow$ Phase 5**:
   * Output: `clips/scene_{id:02d}.mp4`.
   * Ingestion: Phase 5 applies dynamic word-level captions per clip and merges all scene clips into the complete story master.

---

## 4. Execution Commands

### Immediate Run
```bash
python orchestrator.py run --prompt "A dramatic corporate drama between produce executives"
```

### Single-Scene Test Run
```bash
python orchestrator.py run --prompt "A test confrontation" --scenes 1
```

### Resume Interrupted Story
```bash
python orchestrator.py resume
```

### Run Background Daemon (AFK Batching)
```bash
python orchestrator.py daemon
```


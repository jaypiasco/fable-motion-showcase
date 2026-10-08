"""
Automated Word-Level Auto-Caption Pipeline (caption_pipeline.py).
Transcribes stitched 9:16 vertical drama videos at word-level accuracy using faster-whisper,
generates styled SubStation Alpha (.ass) subtitles, and burns animated dynamic captions directly onto the frame.
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path
from typing import Optional, List

try:
    from faster_whisper import WhisperModel
except ImportError:
    WhisperModel = None

from core.logger import logger
from config import config


def generate_viral_ass_subtitles(
    video_path: str,
    ass_output_path: str,
    model_size: str = config.WHISPER_MODEL_SIZE if hasattr(config, "WHISPER_MODEL_SIZE") else "base",
    device: str = config.WHISPER_DEVICE if hasattr(config, "WHISPER_DEVICE") else "cpu",
    compute_type: str = config.WHISPER_COMPUTE_TYPE if hasattr(config, "WHISPER_COMPUTE_TYPE") else "int8",
    font_name: str = getattr(config, "CAPTION_FONT", "Impact"),
    font_size: int = getattr(config, "CAPTION_FONT_SIZE", 75),
    spacing: int = getattr(config, "CAPTION_SPACING", 2),
    style_mode: str = getattr(config, "CAPTION_STYLE", "karaoke"),
    max_chunk_words: int = 4
) -> str:
    """
    Transcribes audio from video with word-level timestamps and produces
    styled .ass subtitles formatted with viral Karaoke dynamic active-word highlighting.
    """
    if WhisperModel is None:
        raise ImportError("faster-whisper is not installed. Please run: pip install faster-whisper")

    video_p = Path(video_path)
    if not video_p.exists():
        raise FileNotFoundError(f"Input video file not found: {video_path}")

    ass_p = Path(ass_output_path)
    ass_p.parent.mkdir(parents=True, exist_ok=True)

    logger.info(f"[Captions] Loading WhisperModel({model_size}, device={device}, compute_type={compute_type})...")
    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    logger.info(f"[Captions] Transcribing '{video_p.name}' with word_timestamps=True...")
    all_words = []
    try:
        segments, info = model.transcribe(str(video_p), word_timestamps=True)
        for segment in segments:
            if not segment.words:
                continue
            for word in segment.words:
                clean = word.word.strip().upper()
                if clean:
                    all_words.append(word)
    except Exception as e:
        logger.warning(f"[Captions] Audio transcription note: {e}")

    # SubStation Alpha (.ass) styling: Primary=White, Outline=Black, Highlight=Yellow (&H0000FFFF)
    ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ViralDrama,{font_name},{font_size},&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,{spacing},0,1,6,2,2,40,40,200,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    def format_timestamp(seconds: float) -> str:
        hrs = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        msecs = int(round((seconds - int(seconds)) * 100))
        return f"{hrs:01d}:{mins:02d}:{secs:02d}.{msecs:02d}"

    events = []
    word_count = 0

    if style_mode == "karaoke" and all_words:
        # Group words into visual phrase chunks with active word highlighted in Yellow
        for i in range(0, len(all_words), max_chunk_words):
            chunk = all_words[i:i + max_chunk_words]
            for active_idx, active_word in enumerate(chunk):
                start = format_timestamp(active_word.start)
                end = format_timestamp(active_word.end)

                line_parts = []
                for j, w in enumerate(chunk):
                    cleaned = w.word.strip().upper()
                    if j == active_idx:
                        # Highlight active word in luminous yellow &H0000FFFF
                        line_parts.append(f"{{\\c&H0000FFFF&}}{cleaned}{{\\c&H00FFFFFF&}}")
                    else:
                        line_parts.append(cleaned)

                line_text = " ".join(line_parts)
                events.append(f"Dialogue: 0,{start},{end},ViralDrama,,0,0,0,,{line_text}")
                word_count += 1
    else:
        # 1-Word Flash mode
        for word in all_words:
            clean_word = word.word.strip().upper()
            start = format_timestamp(word.start)
            end = format_timestamp(word.end)
            events.append(f"Dialogue: 0,{start},{end},ViralDrama,,0,0,0,,{{\\c&H0000FFFF&}}{clean_word}")
            word_count += 1

    with open(ass_p, "w", encoding="utf-8") as f:
        f.write(ass_header)
        if events:
            f.write("\n".join(events) + "\n")

    logger.info(f"[Captions] Generated {word_count} dynamic Karaoke caption events ({font_name}, spacing: {spacing}) -> {ass_p}")
    return str(ass_p)


def burn_subtitles(
    input_video: str,
    ass_file: str,
    output_video: str,
    ffmpeg_cmd: str = config.FFMPEG_PATH if hasattr(config, "FFMPEG_PATH") else "ffmpeg"
) -> str:
    """
    Burns styled SubStation Alpha (.ass) subtitles into 9:16 vertical video using FFmpeg.
    Handles cross-platform path resolution seamlessly for Windows and Linux.
    """
    input_p = Path(input_video).resolve()
    ass_p = Path(ass_file).resolve()
    out_p = Path(output_video).resolve()

    if not input_p.exists():
        raise FileNotFoundError(f"Input video not found: {input_video}")
    if not ass_p.exists():
        raise FileNotFoundError(f"Subtitle file not found: {ass_file}")

    out_p.parent.mkdir(parents=True, exist_ok=True)

    # Check if subtitle file has events
    with open(ass_p, "r", encoding="utf-8") as f:
        ass_content = f.read()

    if "Dialogue:" not in ass_content:
        logger.info("[Captions] No dialogue events in subtitle file. Copying original video...")
        import shutil
        shutil.copyfile(input_p, out_p)
        return str(out_p)

    # Resolve subtitle path for FFmpeg filter
    try:
        rel_ass = str(ass_p.relative_to(Path.cwd())).replace("\\", "/")
        filter_str = f"ass={rel_ass}"
        run_cwd = None
    except ValueError:
        filter_str = f"ass={ass_p.name}"
        run_cwd = str(ass_p.parent)

    logger.info(f"[Captions] Burning subtitles into '{out_p.name}'...")
    cmd = [
        ffmpeg_cmd, "-y",
        "-i", str(input_p),
        "-vf", filter_str,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-threads", "0",
        "-crf", "18",
        "-c:a", "copy",
        str(out_p)
    ]

    logger.debug(f"[Captions] FFmpeg command: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, check=False, cwd=run_cwd)

    if result.returncode != 0 or not out_p.exists() or out_p.stat().st_size == 0:
        err = f"{result.stdout}\n{result.stderr}"
        logger.error(f"[Captions] FFmpeg burn_subtitles failed: {err}")
        raise RuntimeError(f"FFmpeg subtitle burning failed: {err}")

    logger.info(f"[Captions] Subtitles successfully burned -> {out_p}")
    return str(out_p)


def process_video_captions(
    input_video: str,
    output_video: Optional[str] = None,
    ass_output_path: Optional[str] = None
) -> str:
    """
    High-level helper: transcribes video, creates .ass subtitle file, and burns word-level captions.
    """
    in_p = Path(input_video)
    if not output_video:
        out_p = in_p.parent / f"{in_p.stem}_captioned{in_p.suffix}"
    else:
        out_p = Path(output_video)

    if not ass_output_path:
        ass_p = in_p.parent / f"{in_p.stem}_subs.ass"
    else:
        ass_p = Path(ass_output_path)

    generate_viral_ass_subtitles(str(in_p), str(ass_p))
    return burn_subtitles(str(in_p), str(ass_p), str(out_p))


def main():
    parser = argparse.ArgumentParser(description="Automated Word-Level Dynamic Captioning Pipeline")
    parser.add_argument("input_video", nargs="?", default="final_merged_drama.mp4", help="Path to input video file")
    parser.add_argument("output_video", nargs="?", default=None, help="Path to output captioned video file")
    parser.add_argument("--ass", "-a", default=None, help="Optional output path for generated .ass subtitle file")
    parser.add_argument("--model", "-m", default="base", help="Whisper model size (base, small, medium, large-v3)")
    parser.add_argument("--device", "-d", default="cpu", help="Computation device (cpu, cuda)")

    args = parser.parse_args()

    input_vid = args.input_video
    final_output = args.output_video or (
        "final_drama_captioned.mp4" if input_vid == "final_merged_drama.mp4"
        else str(Path(input_vid).parent / f"{Path(input_vid).stem}_captioned{Path(input_vid).suffix}")
    )
    ass_sub = args.ass or str(Path(final_output).parent / f"{Path(final_output).stem}_subs.ass")

    print(f"=== Starting Auto-Captioning Pipeline ===")
    print(f"Input Video : {input_vid}")
    print(f"Subtitles   : {ass_sub}")
    print(f"Output Video: {final_output}")

    if not Path(input_vid).exists():
        print(f"Error: Input video '{input_vid}' does not exist.")
        sys.exit(1)

    generate_viral_ass_subtitles(input_vid, ass_sub, model_size=args.model, device=args.device)
    burn_subtitles(input_vid, ass_sub, final_output)
    print("Auto-captioning complete: " + final_output)


if __name__ == "__main__":
    main()

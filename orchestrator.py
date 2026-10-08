"""
AI Video Story Generation Pipeline - Main Orchestrator & CLI.
Coordinates immediate runs, story resumption, background queue processing, and daemon loops.
"""

import sys
import time
import json
import argparse
from pathlib import Path

from config import config
from core.logger import logger
from core.state_manager import StateManager
from core.queue import load_queue, save_queue, add_to_queue, clear_queue
from pipeline.story_pipeline import StoryPipeline
from pipeline.assembly import assemble_story


def run_daemon():
    """
    Continuous background daemon.
    Processes queued stories while the user is idle or sleeping.
    """
    logger.info("=== Starting AI Video Story Background Daemon ===")
    logger.info(f"Watching queue at: {config.QUEUE_FILE}")

    while True:
        try:
            # Check for active paused or incomplete run first
            if config.CURRENT_STATE_FILE.exists():
                with open(config.CURRENT_STATE_FILE, "r", encoding="utf-8") as f:
                    cur_info = json.load(f)
                if (
                    cur_info.get("status") in ["in_progress", "paused"]
                    and not cur_info.get("manual_approval_required", False)
                ):
                    state_path = Path(cur_info.get("state_path"))
                    if state_path.exists():
                        logger.info(f"[Daemon] Resuming active incomplete story: {cur_info.get('active_story_id')}")
                        state_mgr = StateManager(state_file_path=state_path)
                        pipeline = StoryPipeline(state_mgr)
                        pipeline.run()

            # Process next item from queue
            q = load_queue()
            pending_items = [item for item in q if item.get("status") == "pending"]

            if pending_items:
                next_item = pending_items[0]
                logger.info(f"[Daemon] Dequeuing story: '{next_item.get('title')}'")
                next_item["status"] = "processing"
                save_queue(q)

                state_mgr = StateManager(
                    prompt=next_item["prompt"],
                    parent_story_id=next_item.get("parent_story_id")
                )
                pipeline = StoryPipeline(state_mgr, max_scenes=next_item.get("max_scenes"))
                try:
                    pipeline.run()
                    next_item["status"] = "completed"
                    next_item["story_id"] = state_mgr.story_id
                except Exception as e:
                    logger.error(f"[Daemon] Failed processing queue item: {e}")
                    next_item["status"] = "failed"
                    next_item["error"] = str(e)
                finally:
                    save_queue(q)
            else:
                logger.debug(f"[Daemon] Queue empty. Sleeping for {config.DAEMON_POLL_INTERVAL_SECONDS}s...")
                time.sleep(config.DAEMON_POLL_INTERVAL_SECONDS)

        except KeyboardInterrupt:
            logger.info("[Daemon] Received KeyboardInterrupt. Stopping background daemon gracefully.")
            break
        except Exception as e:
            logger.error(f"[Daemon] Unexpected error in daemon loop: {e}")
            time.sleep(config.DAEMON_POLL_INTERVAL_SECONDS)


def main():
    parser = argparse.ArgumentParser(description="AI Video Story Automated Pipeline Orchestrator")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Command: run
    run_parser = subparsers.add_parser("run", help="Run story creation pipeline immediately")
    run_parser.add_argument("--prompt", "-p", default=None, help="Story concept or premise")
    run_parser.add_argument("--story-id", "-s", default=None, help="Existing story ID to run")
    run_parser.add_argument("--parent-story-id", "--parent", dest="parent_story_id", default=None, help="Parent story ID to inherit and reuse characters from")
    run_parser.add_argument("--scenes", "-n", "--max-scenes", dest="scenes", type=int, default=None, help="Number of scenes to generate/render (e.g. 1 for testing)")

    # Command: resume
    resume_parser = subparsers.add_parser("resume", help="Resume an interrupted or paused story run")
    resume_parser.add_argument("--story-id", "-s", help="Specific story ID to resume (defaults to last active)")
    resume_parser.add_argument("--scenes", "-n", "--max-scenes", dest="scenes", type=int, default=None, help="Number of scenes to generate/render")

    # Command: daemon
    subparsers.add_parser("daemon", help="Run as background daemon processing story queue")

    # Command: queue
    queue_parser = subparsers.add_parser("queue", help="Manage story backlog queue")
    queue_parser.add_argument("action", choices=["add", "list", "clear"], help="Queue action")
    queue_parser.add_argument("--prompt", "-p", help="Story concept to add to queue")
    queue_parser.add_argument("--title", "-t", help="Optional short title for queue item")
    queue_parser.add_argument("--parent-story-id", "--parent", dest="parent_story_id", default=None, help="Parent story ID to inherit and reuse characters from")

    # Command: status
    subparsers.add_parser("status", help="Show pipeline and archive status")

    args = parser.parse_args()

    if args.command == "run":
        if args.story_id:
            state_mgr = StateManager(story_id=args.story_id, parent_story_id=args.parent_story_id)
        elif args.prompt:
            state_mgr = StateManager(prompt=args.prompt, parent_story_id=args.parent_story_id)
        else:
            logger.error("Please provide --prompt or --story-id to run.")
            sys.exit(1)
        pipeline = StoryPipeline(state_mgr, max_scenes=args.scenes)
        pipeline.run()

    elif args.command == "resume":
        if args.story_id:
            state_mgr = StateManager(story_id=args.story_id)
        elif config.CURRENT_STATE_FILE.exists():
            with open(config.CURRENT_STATE_FILE, "r", encoding="utf-8") as f:
                cur_info = json.load(f)
            state_mgr = StateManager(state_file_path=Path(cur_info["state_path"]))
        else:
            logger.error("No active story found to resume. Specify --story-id.")
            sys.exit(1)
        pipeline = StoryPipeline(state_mgr, max_scenes=args.scenes)
        pipeline.run()

    elif args.command == "daemon":
        run_daemon()

    elif args.command == "queue":
        if args.action == "add":
            if not args.prompt:
                logger.error("Please provide --prompt to add to queue.")
                sys.exit(1)
            add_to_queue(args.prompt, args.title, parent_story_id=args.parent_story_id)
        elif args.action == "list":
            q = load_queue()
            print(f"\n--- Story Queue ({len(q)} items) ---")
            for i, item in enumerate(q, 1):
                status_icon = "[DONE]" if item.get('status') == 'completed' else ("[BUSY]" if item.get('status') == 'processing' else "[WAIT]")
                print(f"{i}. {status_icon} {item.get('title')} (ID: {item.get('id')})")
            print("")
        elif args.action == "clear":
            clear_queue()

    elif args.command == "status":
        print("\n=== AI Video Story Pipeline Status ===")
        if config.CURRENT_STATE_FILE.exists():
            with open(config.CURRENT_STATE_FILE, "r", encoding="utf-8") as f:
                cur = json.load(f)
            print(f"Active Story ID : {cur.get('active_story_id')}")
            print(f"Current Phase   : {cur.get('current_phase')}")
            print(f"Status          : {cur.get('status')}")
            print(f"Last Updated    : {cur.get('updated_at')}")
        else:
            print("No active run.")

        stories = list(config.ARCHIVE_DIR.glob("*"))
        print(f"\nTotal Archived Stories: {len(stories)}")
        for s in sorted(stories, reverse=True)[:5]:
            print(f" - {s.name}")
        print("")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()

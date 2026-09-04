"""Minimal local memo app.

Lets the user jot down research topics ("memos") through a small web UI.
Data is stored as JSON directly in this repo (data/memos.json) so that a
Claude Code routine can read it after a git pull, without any external
service or database.
"""
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, abort, jsonify, render_template, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent
OUTPUT_DIR = REPO_ROOT / "output"
DATA_FILE = BASE_DIR / "data" / "memos.json"

VALID_STATUSES = {"pending", "researching", "drafted", "done", "archived"}
VALID_PRIORITIES = {"low", "normal", "high"}

app = Flask(__name__)


def load_memos():
    if not DATA_FILE.exists():
        return []
    with DATA_FILE.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("memos", [])


def save_memos(memos):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with DATA_FILE.open("w", encoding="utf-8") as f:
        json.dump({"memos": memos}, f, ensure_ascii=False, indent=2)
        f.write("\n")


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/output-file/<path:filepath>")
def output_file(filepath):
    """Serve generated pipeline output (research/article/video-structure .md files)
    for convenience when reviewing memos in the browser. Paths are relative to
    the repo's output/ directory, e.g. output/<slug>/article.md is served as
    /output-file/<slug>/article.md."""
    full_path = (OUTPUT_DIR / filepath).resolve()
    if OUTPUT_DIR.resolve() not in full_path.parents or not full_path.is_file():
        abort(404)
    return send_from_directory(OUTPUT_DIR, filepath)


@app.get("/api/memos")
def list_memos():
    return jsonify(load_memos())


@app.post("/api/memos")
def create_memo():
    payload = request.get_json(force=True, silent=True) or {}
    title = (payload.get("title") or "").strip()
    brief = (payload.get("brief") or "").strip()
    if not title or not brief:
        return jsonify({"error": "title and brief are required"}), 400

    priority = payload.get("priority") or "normal"
    if priority not in VALID_PRIORITIES:
        return jsonify({"error": f"priority must be one of {sorted(VALID_PRIORITIES)}"}), 400

    tags_raw = payload.get("tags") or []
    if isinstance(tags_raw, str):
        tags = [t.strip() for t in tags_raw.split(",") if t.strip()]
    else:
        tags = [str(t).strip() for t in tags_raw if str(t).strip()]

    memo = {
        "id": uuid.uuid4().hex[:12],
        "title": title,
        "brief": brief,
        "tags": tags,
        "priority": priority,
        "status": "pending",
        "notes": (payload.get("notes") or "").strip(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "outputs": {},
    }
    memos = load_memos()
    memos.insert(0, memo)
    save_memos(memos)
    return jsonify(memo), 201


@app.put("/api/memos/<memo_id>")
def update_memo(memo_id):
    payload = request.get_json(force=True, silent=True) or {}

    if "status" in payload and payload["status"] not in VALID_STATUSES:
        return jsonify({"error": f"status must be one of {sorted(VALID_STATUSES)}"}), 400
    if "priority" in payload and payload["priority"] not in VALID_PRIORITIES:
        return jsonify({"error": f"priority must be one of {sorted(VALID_PRIORITIES)}"}), 400

    memos = load_memos()
    for memo in memos:
        if memo["id"] == memo_id:
            for key in ("title", "brief", "tags", "priority", "status", "notes", "outputs"):
                if key in payload:
                    memo[key] = payload[key]
            memo["updated_at"] = now_iso()
            save_memos(memos)
            return jsonify(memo)
    return jsonify({"error": "not found"}), 404


@app.delete("/api/memos/<memo_id>")
def delete_memo(memo_id):
    memos = load_memos()
    remaining = [m for m in memos if m["id"] != memo_id]
    if len(remaining) == len(memos):
        return jsonify({"error": "not found"}), 404
    save_memos(remaining)
    return "", 204


if __name__ == "__main__":
    app.run(debug=True, port=5050)

"""Record verified geometry for test.html from public YouTube playback metadata."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]


def extract_geometry(page):
    match = re.search(r"(?:var\s+)?ytInitialPlayerResponse\s*=\s*", page)
    if not match:
        raise ValueError("Public playback metadata unavailable")
    data, _ = json.JSONDecoder().raw_decode(page[match.end():])
    if data.get("playabilityStatus", {}).get("status") != "OK":
        raise ValueError("Video playback is unavailable")
    streaming = data.get("streamingData", {})
    sizes = [(f.get("width"), f.get("height")) for f in
             streaming.get("adaptiveFormats", []) + streaming.get("formats", [])]
    sizes = [(w, h) for w, h in sizes if isinstance(w, int) and isinstance(h, int) and w > 0 and h > 0]
    if not sizes:
        raise ValueError("No verified video dimensions")
    width, height = max(sizes, key=lambda size: size[0] * size[1])
    if any(abs(w / h - width / height) > 0.05 for w, h in sizes):
        raise ValueError("Video streams have conflicting aspect ratios")
    return {"width": width, "height": height}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video_ids", nargs="+")
    args = parser.parse_args()
    target = ROOT / "test-video-geometry.json"
    payload = json.loads(target.read_text(encoding="utf-8")) if target.exists() else {"version": 1, "videos": {}}
    for video_id in args.video_ids:
        if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
            raise ValueError("Invalid video ID")
        request = Request("https://www.youtube.com/watch?v=" + video_id,
                          headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(request, timeout=20) as response:
            geometry = extract_geometry(response.read().decode("utf-8"))
        payload["videos"][video_id] = {**geometry, "source": "youtube-watch",
            "checkedAt": datetime.now(timezone.utc).isoformat()}
        print(video_id, geometry["width"], geometry["height"])
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

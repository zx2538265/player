"""Build a public-only Pages artifact and compare it with the live release."""
import argparse
import hashlib
from html import escape
from http.client import HTTPException
import json
import os
from pathlib import Path
import shutil
import re
from urllib.parse import urlsplit, parse_qs
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://allenka.com/"


def share_video_id(work):
    """Only publish share routes for recognized local player links."""
    url = urlsplit(work.get("url", ""))
    local = (url.hostname == "allenka.com" and url.path.rstrip("/") in ("", "/index.html")) or (
        url.hostname == "zx2538265.github.io" and url.path.rstrip("/") in ("/player", "/player/index.html"))
    vid = parse_qs(url.query).get("v", [""])[0]
    return vid if local and url.scheme == "https" and not url.username and not url.password and re.fullmatch(r"[A-Za-z0-9_-]{11}", vid) else ""


def build_share_pages(payload, site):
    videos = {}
    for work in payload["works"]:
        vid = share_video_id(work)
        if not vid:
            continue
        if vid in videos:
            raise ValueError(f"Duplicate share video: {vid}")
        if not (site / "srt" / f"{vid}.srt").is_file():
            raise ValueError(f"Missing share subtitle: {vid}")
        title = work["title"].strip()
        if not title:
            raise ValueError("Empty share title")
        description = " · ".join(value for value in (work.get("artist"), work.get("type"), "中文字幕｜翻譯收藏室") if value)
        image = work.get("shareImage", "")
        image_tags, image_body = "", ""
        if image:
            if not re.fullmatch(r"data/covers/[a-f0-9]{64}\.(jpg|png|webp|gif)", image) or not (site / image).is_file():
                raise ValueError("Invalid share image")
            width, height = work.get("shareImageWidth"), work.get("shareImageHeight")
            if not isinstance(width, int) or not isinstance(height, int) or width <= 0 or height <= 0:
                raise ValueError("Invalid share image dimensions")
            image = SITE + image
            mime = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp", "gif": "image/gif"}[image.rsplit(".", 1)[1]]
            image_tags = f'''<meta property="og:image" content="{image}">
  <meta property="og:image:secure_url" content="{image}">
  <meta property="og:image:width" content="{width}">
  <meta property="og:image:height" content="{height}">
  <meta property="og:image:type" content="{mime}">
  <meta property="og:image:alt" content="{escape(title, quote=True)}">
  <meta name="twitter:image" content="{image}">'''
            image_body = f'<img src="{image}" alt="{escape(title, quote=True)}">'
        share_url = SITE + f"share/{vid}/"
        player_url = SITE + f"?v={vid}"
        values = {key: escape(value, quote=True) for key, value in {
            "title": title, "description": description, "image": image,
            "share": share_url, "player": player_url}.items()}
        page = '''<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}｜翻譯收藏室</title>
  <meta name="description" content="{description}">
  <link rel="canonical" href="{share}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="zh_TW">
  <meta property="og:site_name" content="翻譯收藏室">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{share}">
  {image_tags}
  <meta name="twitter:card" content="{card}">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{description}">
  <style>body {{ margin: 40px auto; padding: 0 20px; max-width: 720px; background: #111; color: #fff; font-family: system-ui, sans-serif; }} img {{ max-width: 100%; border-radius: 12px; }} a {{ color: #9ecbff; }}</style>
</head>
<body>
  {image_body}
  <h1>{title}</h1>
  <p>{description}</p>
  <p><a href="{player}">觀看中文字幕影片 →</a></p>
  <script>window.location.replace("../../?v={video_id}");</script>
</body>
</html>
'''.format(**values, video_id=vid, image_tags=image_tags, image_body=image_body, card="summary_large_image" if image else "summary")
        destination = site / "share" / vid
        destination.mkdir(parents=True)
        (destination / "index.html").write_text(page, encoding="utf-8")
        videos[vid] = share_url
    (site / "data/share.json").write_text(json.dumps({"version": 1, "videos": videos}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return len(videos)


def fingerprint(site):
    hashes = {}
    for path in sorted(site.rglob("*")):
        if not path.is_file() or path.name == "release.json":
            continue
        relative = path.relative_to(site).as_posix()
        content = path.read_bytes()
        if relative == "data/library.json":
            payload = json.loads(content)
            payload.pop("syncedAt", None)
            payload.pop("classificationSource", None)
            content = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode()
        hashes[relative] = hashlib.sha256(content).hexdigest()
    return hashlib.sha256(json.dumps(hashes, sort_keys=True).encode()).hexdigest()


def prepare(root, catalog, site):
    if site.exists():
        raise ValueError("Output must be a new directory")
    site.mkdir(parents=True)
    for name in ("index.html", "test.html", "library.html", "library.css", "library.js", "share.js", ".nojekyll"):
        shutil.copy2(root / name, site / name)
    shutil.copytree(root / "srt", site / "srt")
    if (root / "bigbang").is_dir():
        (site / "bigbang").mkdir()
        for name in ("index.html", "practice.css", "practice.js", "chant.js", "songs.json", "share-cover.png"):
            shutil.copy2(root / "bigbang" / name, site / "bigbang" / name)
    if (root / "babymonster").is_dir():
        (site / "babymonster").mkdir()
        for name in ("index.html", "practice.css", "practice.js", "chant.js", "songs.json", "share-cover.png"):
            shutil.copy2(root / "babymonster" / name, site / "babymonster" / name)
    if (root / "ateez").is_dir():
        (site / "ateez").mkdir()
        for name in ("index.html", "practice.css", "practice.js", "chant.js", "songs.json", "share-cover.png"):
            shutil.copy2(root / "ateez" / name, site / "ateez" / name)
    (site / "data/covers").mkdir(parents=True)
    payload = json.loads(catalog.read_text(encoding="utf-8"))
    if not payload.get("works"):
        raise ValueError("Empty catalog")
    shutil.copy2(catalog, site / "data/library.json")
    for work in payload["works"]:
        for field in ("image", "shareImage"):
            image = work.get(field, "")
            if image.startswith("data/covers/"):
                if not re.fullmatch(r"data/covers/[a-f0-9]{64}\.(jpg|png|webp|gif)", image):
                    raise ValueError("Invalid cover")
                filename = Path(image).name
                source = catalog.parent / "covers" / filename
                if hashlib.sha256(source.read_bytes()).hexdigest() != Path(filename).stem:
                    raise ValueError("Invalid cover")
                shutil.copy2(source, site / image)
    build_share_pages(payload, site)
    digest = fingerprint(site)
    (site / "release.json").write_text(json.dumps({"version": 1, "digest": digest}) + "\n", encoding="utf-8")
    return digest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", type=Path, required=True)
    parser.add_argument("--site", type=Path, required=True)
    args = parser.parse_args()
    digest = prepare(ROOT, args.catalog, args.site)
    previous = None
    try:
        request = Request(SITE + "release.json", headers={"Cache-Control": "no-cache"})
        with urlopen(request, timeout=30) as response:
            previous = json.load(response)["digest"]
            if (not isinstance(previous, str) or len(previous) != 64
                    or any(char not in "0123456789abcdef" for char in previous)):
                raise ValueError("Invalid release digest")
    except (HTTPError, URLError, OSError, HTTPException, ValueError, KeyError, TypeError) as error:
        previous = None
        reason = f"HTTP {error.code}" if isinstance(error, HTTPError) else type(error).__name__
        print(f"::warning::無法讀取線上版本（{reason}），將繼續發布。")
    changed = digest != previous
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
        output.write("changed=" + str(changed).lower() + "\n")
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as output:
        if previous is None:
            output.write("無法取得有效線上版本，略過比較並繼續發布。\n")
        else:
            output.write("內容有變更，準備發布。\n" if changed else "內容未變更，略過發布。\n")
    print("changed=" + str(changed).lower())


if __name__ == "__main__":
    main()

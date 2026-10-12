"""Read the authorized Notion database; write only the public catalog projection."""
import argparse
import hashlib
import io
from http.client import HTTPException
import json
import os
from pathlib import Path
import re
import sys
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, parse_qs, quote
from urllib.request import Request, urlopen, build_opener, HTTPRedirectHandler

from PIL import Image, ImageOps

DATABASE_ID = "358f1640416380ce9943cb914b0409f1"
VIEW_ID = "372f16404163804c947b000c5be27931"
ROOT = Path(__file__).resolve().parents[1]


class SyncError(Exception):
    pass


def https_url(value):
    if not isinstance(value, str) or not value.strip():
        return ""
    value = value.strip()
    try:
        parsed = urlsplit(value)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError()
        if any(ord(c) < 32 for c in value):
            raise ValueError()
    except ValueError:
        raise SyncError("作品連結必須是無帳密的 HTTPS 網址。") from None
    return value


def text_value(prop):
    kind = prop.get("type")
    if kind == "url":
        return prop.get("url") or ""
    if kind in ("title", "rich_text"):
        return "".join(part.get("plain_text", part.get("text", {}).get("content", "")) for part in prop.get(kind, []))
    return ""


def is_local_player(url):
    parsed = urlsplit(url)
    return (
        parsed.hostname == "zx2538265.github.io" and parsed.path.rstrip("/") in ("/player", "/player/index.html")
    ) or (
        parsed.hostname == "allenka.com" and parsed.path.rstrip("/") in ("", "/index.html")
    )


def video_id(url):
    parsed = urlsplit(url)
    if is_local_player(url):
        value = parse_qs(parsed.query).get("v", [""])[0]
    elif parsed.hostname in ("www.youtube.com", "youtube.com", "m.youtube.com"):
        value = parse_qs(parsed.query).get("v", [""])[0]
    elif parsed.hostname == "youtu.be":
        value = parsed.path.strip("/")
    else:
        return ""
    return value if re.fullmatch(r"[A-Za-z0-9_-]{11}", value) else ""


def convert_page(page, subtitle_dir):
    if page.get("archived") or page.get("in_trash"):
        return None
    props = page.get("properties", {})
    public = props.get("公開")
    if public is not None:
        if public.get("type") != "checkbox":
            raise SyncError("「公開」欄位必須是核取方塊。")
        if not public.get("checkbox"):
            return None
    title = next((text_value(p).strip() for p in props.values() if p.get("type") == "title"), "")
    translation = https_url(text_value(props.get("翻譯連結", {})))
    if not title or not translation:
        raise SyncError("公開作品缺少標題或翻譯連結；未輸出不完整清單。")
    source = https_url(text_value(props.get("來源連結", {})))
    tags_prop = props.get("藝人／團體", props.get("標籤", {}))
    if tags_prop.get("type") == "multi_select":
        tags = [t["name"] for t in tags_prop.get("multi_select", [])]
    elif tags_prop.get("type") == "select":
        tags = [tags_prop["select"]["name"]] if tags_prop.get("select") else []
    elif tags_prop:
        raise SyncError("「藝人／團體」欄位必須是選取或多選。")
    else:
        tags = []
    type_prop = props.get("內容類型", {})
    if type_prop and type_prop.get("type") != "select":
        raise SyncError("「內容類型」欄位必須是單選。")
    content_type = (type_prop.get("select") or {}).get("name", "")
    vid = video_id(translation)
    local_player = is_local_player(translation)
    if local_player and (not vid or not (subtitle_dir / f"{vid}.srt").is_file()):
        raise SyncError("作品指向本站播放器，但缺少有效影片 ID 或對應 SRT。")
    vid = vid or video_id(source)
    if not source and vid:
        source = f"https://www.youtube.com/watch?v={vid}"
    # Notion-hosted cover URLs expire. Use stable YouTube thumbnails when available;
    # other works keep a text cover, rather than publishing signed asset URLs.
    image = f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg" if vid else ""
    created = page.get("created_time", "")
    try:
        datetime.fromisoformat(created.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        raise SyncError("作品缺少有效的 Notion 建立日期。") from None
    return {"id": page["id"], "title": title, "tags": tags, "artist": " · ".join(tags) or "未分類",
            "type": content_type, "date": created[:10], "dateLabel": "加入", "keywords": " ".join(tags + [content_type]).strip(),
            "url": translation, "sourceUrl": source, "image": image}


def request_api(token, endpoint, body=None):
    data = json.dumps(body).encode() if body is not None else None
    # Log only the API path; never tokens, response bodies or query cursors.
    step = endpoint.split("?", 1)[0]
    for attempt in range(4):
        request = Request("https://api.notion.com/v1/" + endpoint, data=data, headers={
            "Authorization": "Bearer " + token, "Notion-Version": "2025-09-03", "Content-Type": "application/json"})
        try:
            with urlopen(request, timeout=30) as response:
                result = json.load(response)
                if not isinstance(result, dict):
                    raise json.JSONDecodeError("Expected object", "", 0)
                return result
        except HTTPError as error:
            reason = f"HTTP {error.code}"
            if error.code != 429 and error.code < 500:
                raise SyncError(f"Notion {step}：{reason}；請檢查連線授權或資料來源設定。") from None
            retry_after = (error.headers or {}).get("Retry-After", "")
            delay = min(30, max(1, int(retry_after))) if retry_after.isdigit() and len(retry_after) < 6 else 2 ** attempt
        except (OSError, HTTPException, json.JSONDecodeError, UnicodeDecodeError) as error:
            reason = type(error).__name__
            delay = 2 ** attempt
        if attempt == 3:
            raise SyncError(f"Notion {step}：{reason}，已嘗試 4 次；未更新清單。") from None
        print(f"Notion {step}：{reason}，{delay} 秒後重試（{attempt + 2}/4）。", file=sys.stderr)
        time.sleep(delay)


def collect_pages(api):
    view = api(f"views/{VIEW_ID}")
    if view.get("parent", {}).get("database_id", "").replace("-", "") != DATABASE_ID:
        raise SyncError("Gallery 不屬於指定資料庫；未更新清單。")
    pages, seen, cursors = [], set(), set()
    result = api(f"views/{VIEW_ID}/queries", {"page_size": 100})
    query_id = result.get("id", "")
    total = result.get("total_count")
    while True:
        if not isinstance(result.get("results"), list) or not isinstance(result.get("has_more"), bool):
            raise SyncError("Notion 分頁回應不完整。")
        if result.get("request_status", {}).get("type", "complete") != "complete":
            raise SyncError("Notion 檢視查詢尚未完整；保留原清單。")
        for page in result["results"]:
            if page.get("object") != "page" or not page.get("id") or page["id"] in seen:
                raise SyncError("Notion 回傳非作品資料或重複作品；請重試。")
            seen.add(page["id"])
            pages.append(page)
        if not result["has_more"]:
            break
        cursor = result.get("next_cursor")
        if not cursor or cursor in cursors or len(pages) >= 10000:
            raise SyncError("Notion 分頁未完整結束；未更新清單。")
        cursors.add(cursor)
        if not re.fullmatch(r"[0-9a-fA-F-]{32,36}", query_id):
            raise SyncError("無效檢視查詢 ID。")
        result = api(f"views/{VIEW_ID}/queries/{query_id}?start_cursor={quote(cursor, safe='')}&page_size=100")
    if not isinstance(total, int) or total != len(pages):
        raise SyncError("Notion 檢視筆數不完整；保留原清單。")
    # View queries return page references. Hydrate in exactly the saved view order.
    for index, reference in enumerate(pages):
        identifier = reference["id"]
        if not re.fullmatch(r"[0-9a-fA-F-]{32,36}", identifier):
            raise SyncError("無效作品 ID。")
        page = api(f"pages/{identifier}")
        if page.get("object") != "page" or page.get("id") != identifier or "properties" not in page:
            raise SyncError("Notion 作品回應不完整；保留原清單。")
        pages[index] = page
    return pages


def uploaded_image_url(api, page):
    """Use the first uploaded body image, then an uploaded page cover."""
    def uploaded(file):
        return file.get("file", {}).get("url", "") if file and file.get("type") == "file" else ""

    visited = set()
    def walk(identifier, depth=0):
        if depth > 8 or identifier in visited or len(visited) >= 200:
            raise SyncError("Notion 圖片區塊超過搜尋範圍；未更新清單。")
        visited.add(identifier)
        cursor, cursors = "", set()
        while True:
            endpoint = f"blocks/{identifier}/children?page_size=100"
            if cursor:
                endpoint += "&start_cursor=" + quote(cursor, safe="")
            result = api(endpoint)
            if not isinstance(result.get("results"), list) or not isinstance(result.get("has_more"), bool):
                raise SyncError("Notion 圖片區塊回應不完整。")
            for block in result["results"]:
                if block.get("archived") or block.get("in_trash"):
                    continue
                if block.get("type") == "image":
                    url = uploaded(block.get("image"))
                    if url:
                        return url
                if block.get("has_children") and block.get("type") not in ("child_page", "child_database"):
                    child_id = block.get("id", "")
                    if not re.fullmatch(r"[0-9a-fA-F-]{32,36}", child_id):
                        raise SyncError("無效圖片區塊 ID。")
                    url = walk(child_id, depth + 1)
                    if url:
                        return url
            if not result["has_more"]:
                return ""
            cursor = result.get("next_cursor")
            if not cursor or cursor in cursors or len(cursors) >= 100:
                raise SyncError("Notion 圖片分頁未完整結束。")
            cursors.add(cursor)

    return walk(page["id"]) or uploaded(page.get("cover"))


def download_uploaded_image(url):
    # No Notion authorization header is sent to file storage; reject redirects.
    parsed = urlsplit(https_url(url))
    if parsed.hostname not in ("prod-files-secure.s3.us-west-2.amazonaws.com", "s3.us-west-2.amazonaws.com") or parsed.port not in (None, 443):
        raise SyncError("Notion 上傳圖片主機尚未支援；未更新清單。")

    class NoRedirect(HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None

    try:
        with build_opener(NoRedirect()).open(Request(url), timeout=30) as response:
            content = response.read(10 * 1024 * 1024 + 1)
        if len(content) > 10 * 1024 * 1024:
            raise ValueError()
        return content
    except (OSError, ValueError):
        raise SyncError("Notion 圖片下載失敗或超過 10 MB；保留原清單。") from None


def save_share_image(content, folder):
    try:
        with Image.open(io.BytesIO(content)) as image:
            if image.format not in ("JPEG", "PNG", "WEBP", "GIF"):
                raise ValueError()
            width, height = image.size
            if width * height > 40_000_000:
                raise ValueError()
            image.verify()
        # Keep the complete image within a safe area even when a 1200x630
        # card is centre-cropped to 2:1 (15 pixels removed at each edge).
        with Image.open(io.BytesIO(content)) as source:
            source.seek(0)
            oriented = ImageOps.exif_transpose(source).convert("RGBA")
            fitted = ImageOps.contain(oriented, (1080, 540), Image.Resampling.LANCZOS)
            canvas = Image.new("RGB", (1200, 630), (24, 24, 24))
            canvas.paste(fitted, ((1200 - fitted.width) // 2, (630 - fitted.height) // 2), fitted)
            encoded = io.BytesIO()
            canvas.save(encoded, format="JPEG", quality=95, subsampling=0)
            content = encoded.getvalue()
            width, height = canvas.size
            ext, mime = "jpg", "image/jpeg"
    except (OSError, ValueError, Image.DecompressionBombError):
        raise SyncError("Notion 圖片格式或內容無效；保留原清單。") from None
    filename = hashlib.sha256(content).hexdigest() + "." + ext
    folder.mkdir(parents=True, exist_ok=True)
    (folder / filename).write_bytes(content)
    return {"shareImage": "data/covers/" + filename, "shareImageWidth": width,
            "shareImageHeight": height, "shareImageType": mime, "shareImageSource": "notion"}


def sync(api, output, subtitle_dir, download=download_uploaded_image):
    pages = collect_pages(api)
    works = []
    for page in pages:
        work = convert_page(page, subtitle_dir)
        if work is None:
            continue
        work["imageSource"] = "youtube" if work["image"] else "none"
        work["shareImage"] = ""
        work["shareImageSource"] = "none"
        if is_local_player(work["url"]):
            image_url = uploaded_image_url(api, page)
            if image_url:
                work.update(save_share_image(download(image_url), output.parent / "covers"))
        works.append(work)
    if not works:
        raise SyncError("未取得可公開作品；保留原清單。")
    payload = {"version": 1, "source": "notion", "orderSource": "notion-view", "viewId": VIEW_ID, "syncedAt": datetime.now(timezone.utc).isoformat(), "works": works}
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(output)
    return len(pages), len(works)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "data/library.json")
    args = parser.parse_args()
    token = os.environ.get("NOTION_TOKEN", "").strip()
    if not token:
        raise SyncError("缺少 NOTION_TOKEN；不會修改原清單。")
    def api(endpoint, body=None):
        time.sleep(0.35)
        return request_api(token, endpoint, body)
    total, published = sync(api, args.output, ROOT / "srt")
    print(f"已讀取 {total} 筆，輸出 {published} 筆作品。未修改 Notion 或發布網站。")


if __name__ == "__main__":
    try:
        main()
    except SyncError as error:
        print(f"同步失敗：{error}", file=sys.stderr)
        sys.exit(1)

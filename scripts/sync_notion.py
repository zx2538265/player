"""Read the authorized Notion database; write only the public catalog projection."""
import argparse
import json
import os
from pathlib import Path
import re
import sys
import time
import hashlib
import ipaddress
import socket
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, parse_qs, quote
from urllib.request import Request, urlopen, build_opener, HTTPRedirectHandler

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


def video_id(url):
    parsed = urlsplit(url)
    if parsed.hostname == "zx2538265.github.io" and parsed.path.rstrip("/") in ("/player", "/player/index.html"):
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
    tags_prop = props.get("標籤", {})
    if tags_prop.get("type") == "multi_select":
        tags = [t["name"] for t in tags_prop.get("multi_select", [])]
    elif tags_prop.get("type") == "select":
        tags = [tags_prop["select"]["name"]] if tags_prop.get("select") else []
    elif tags_prop:
        raise SyncError("「標籤」欄位必須是選取或多選。")
    else:
        tags = []
    vid = video_id(translation)
    local_player = urlsplit(translation).hostname == "zx2538265.github.io" and urlsplit(translation).path.rstrip("/") in ("/player", "/player/index.html")
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
            "type": "", "date": created[:10], "dateLabel": "加入", "keywords": " ".join(tags),
            "url": translation, "sourceUrl": source, "image": image}


def notion_image(page, api):
    """Page cover, otherwise the first image in page content (document order)."""
    def file_url(file):
        if not file:
            return ""
        kind = file.get("type")
        url = file.get(kind, {}).get("url") if kind in ("file", "external") else None
        if not url:
            raise SyncError("Notion 圖片格式無法讀取；保留原清單。")
        return https_url(url)

    if page.get("cover"):
        return file_url(page["cover"])
    visited = set()

    def walk(block_id, depth=0):
        if block_id in visited or depth > 10 or len(visited) >= 200:
            raise SyncError("Notion 圖片搜尋超出範圍；未更新清單。")
        visited.add(block_id)
        cursor, cursors = None, set()
        while True:
            endpoint = f"blocks/{quote(block_id, safe='')}/children?page_size=100"
            if cursor:
                endpoint += "&start_cursor=" + quote(cursor, safe="")
            result = api(endpoint)
            if not isinstance(result.get("results"), list) or not isinstance(result.get("has_more"), bool):
                raise SyncError("Notion 圖片分頁回應不完整。")
            for block in result["results"]:
                if block.get("archived") or block.get("in_trash"):
                    continue
                if block.get("type") == "image":
                    return file_url(block.get("image"))
                if block.get("has_children") and block.get("type") not in ("child_page", "child_database", "synced_block"):
                    image = walk(block["id"], depth + 1)
                    if image:
                        return image
            if not result["has_more"]:
                return ""
            cursor = result.get("next_cursor")
            if not cursor or cursor in cursors:
                raise SyncError("Notion 圖片分頁未完整結束。")
            cursors.add(cursor)
    return walk(page["id"])


def download_image(url):
    """Public HTTPS only, bounded raster downloads; never forward Notion credentials."""
    class NoRedirect(HTTPRedirectHandler):
        def redirect_request(self, *args):
            return None
    opener = build_opener(NoRedirect)
    try:
        for _ in range(6):
            parsed = urlsplit(https_url(url))
            if parsed.port not in (None, 443):
                raise SyncError("封面圖片須使用標準 HTTPS 連接埠。")
            addresses = socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)
            if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
                raise SyncError("封面圖片不可使用內部網路位址。")
            try:
                with opener.open(Request(url, headers={"User-Agent": "NotionCatalog/1.0"}), timeout=30) as response:
                    data = response.read(20 * 1024 * 1024 + 1)
                if len(data) > 20 * 1024 * 1024:
                    raise SyncError("Notion 封面超過 20 MB；未更新清單。")
                if data.startswith(b"\x89PNG\r\n\x1a\n"):
                    ext = "png"
                elif data.startswith(b"\xff\xd8\xff"):
                    ext = "jpg"
                elif data.startswith((b"GIF87a", b"GIF89a")):
                    ext = "gif"
                elif data.startswith(b"RIFF") and data[8:12] == b"WEBP":
                    ext = "webp"
                else:
                    raise SyncError("Notion 封面不是支援的 PNG、JPEG、GIF 或 WebP 圖片。")
                return data, ext
            except HTTPError as error:
                if error.code in (301, 302, 303, 307, 308) and error.headers.get("Location"):
                    from urllib.parse import urljoin
                    url = urljoin(url, error.headers["Location"])
                    continue
                raise SyncError(f"Notion 封面下載失敗（HTTP {error.code}）；保留原清單。") from None
        raise SyncError("Notion 封面重新導向過多。")
    except (URLError, OSError, ValueError):
        raise SyncError("Notion 封面下載失敗；保留原清單，不輸出暫時性圖片網址。") from None


def request_api(token, endpoint, body=None):
    data = json.dumps(body).encode() if body is not None else None
    for attempt in range(4):
        request = Request("https://api.notion.com/v1/" + endpoint, data=data, headers={
            "Authorization": "Bearer " + token, "Notion-Version": "2025-09-03", "Content-Type": "application/json"})
        try:
            with urlopen(request, timeout=30) as response:
                return json.load(response)
        except HTTPError as error:
            if (error.code == 429 or error.code >= 500) and attempt < 3:
                delay = error.headers.get("Retry-After", "2")
                time.sleep(min(30, max(1, int(delay) if delay.isdigit() else 2 ** attempt)))
                continue
            raise SyncError(f"Notion HTTP {error.code}；請檢查連線授權、資料庫 ID 或稍後重試。") from None
        except (URLError, TimeoutError, json.JSONDecodeError):
            raise SyncError("Notion 連線或回應格式異常；未更新清單。") from None


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


def sync(api, output, subtitle_dir, image_loader=download_image):
    pages = collect_pages(api)
    works = []
    for page in pages:
        work = convert_page(page, subtitle_dir)
        if work is None:
            continue
        image_url = notion_image(page, api)
        work["imageSource"] = "youtube" if work["image"] else "none"
        if image_url:
            content, extension = image_loader(image_url)
            filename = hashlib.sha256(content).hexdigest() + "." + extension
            cover_dir = output.parent / "covers"
            cover_dir.mkdir(parents=True, exist_ok=True)
            cover_path = cover_dir / filename
            if not cover_path.exists():
                cover_path.write_bytes(content)
            work["image"] = "data/covers/" + filename
            work["imageSource"] = "notion"
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

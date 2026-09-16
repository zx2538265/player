"""Read the authorized Notion database; write only the public catalog projection."""
import argparse
import json
import os
from pathlib import Path
import re
import sys
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, parse_qs
from urllib.request import Request, urlopen

DATABASE_ID = "358f1640416380ce9943cb914b0409f1"
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
    database = api(f"databases/{DATABASE_ID}")
    sources = database.get("data_sources", [])
    if len(sources) != 1:
        raise SyncError("預期指定資料庫只有一個資料來源；請確認資料來源設定。")
    source_id = sources[0]["id"]
    if not re.fullmatch(r"[0-9a-fA-F-]{32,36}", source_id):
        raise SyncError("無效資料來源 ID。")
    pages, seen, cursors = [], set(), set()
    cursor = None
    while True:
        body = {"page_size": 100, "sorts": [{"timestamp": "created_time", "direction": "descending"}]}
        if cursor:
            body["start_cursor"] = cursor
        result = api(f"data_sources/{source_id}/query", body)
        if not isinstance(result.get("results"), list) or not isinstance(result.get("has_more"), bool):
            raise SyncError("Notion 分頁回應不完整。")
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
    return pages


def sync(api, output, subtitle_dir):
    pages = collect_pages(api)
    works = [work for page in pages if (work := convert_page(page, subtitle_dir)) is not None]
    if not works:
        raise SyncError("未取得可公開作品；保留原清單。")
    works.sort(key=lambda w: (w["date"], w["id"]), reverse=True)
    payload = {"version": 1, "source": "notion", "syncedAt": datetime.now(timezone.utc).isoformat(), "works": works}
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
    total, published = sync(lambda endpoint, body=None: request_api(token, endpoint, body), args.output, ROOT / "srt")
    print(f"已讀取 {total} 筆，輸出 {published} 筆作品。未修改 Notion 或發布網站。")


if __name__ == "__main__":
    try:
        main()
    except SyncError as error:
        print(f"同步失敗：{error}", file=sys.stderr)
        sys.exit(1)

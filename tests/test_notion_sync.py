import copy
import importlib.util
import json
import io
from PIL import Image
from pathlib import Path
import shutil
import uuid
import unittest

spec = importlib.util.spec_from_file_location("sync_notion", Path(__file__).resolve().parents[1] / "scripts/sync_notion.py")
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


def page(identifier="a" * 32):
    return {"object": "page", "id": identifier, "created_time": "2026-09-16T08:00:00Z", "properties": {
        "名稱": {"type": "title", "title": [{"plain_text": "中文測試 <script>"}]},
        "翻譯連結": {"type": "url", "url": "https://zx2538265.github.io/player/?v=r0aBwvfiNjY"},
        "標籤": {"type": "multi_select", "multi_select": [{"name": "RESCENE"}, {"name": "WONI"}]}}}


class SyncTests(unittest.TestCase):
    def setUp(self):
        scratch = Path(__file__).resolve().parents[1] / ".notion-preview"
        scratch.mkdir(exist_ok=True)
        self.root = scratch / ("test-" + uuid.uuid4().hex)
        self.root.mkdir()
        assert self.root.resolve().is_relative_to(scratch.resolve())
        self.addCleanup(shutil.rmtree, self.root)
        (self.root / "r0aBwvfiNjY.srt").write_text("test", encoding="utf-8")

    def api(self, batches):
        self.calls = []
        records = {p["id"]: p for batch in batches for p in batch["results"]}
        batches = [dict(batch, id="c" * 32, total_count=sum(len(b["results"]) for b in batches)) for batch in batches]
        remaining = iter(batches)
        def request(endpoint, body=None):
            self.calls.append((endpoint, body))
            if endpoint == f"views/{sync.VIEW_ID}":
                return {"parent": {"database_id": sync.DATABASE_ID}}
            if endpoint.startswith("pages/"):
                return records[endpoint.split("/")[1]]
            if endpoint.startswith("blocks/"):
                return {"results": [], "has_more": False}
            result = next(remaining)
            return dict(result, results=[{"object": p["object"], "id": p["id"]} for p in result["results"]])
        return request

    def test_projection_and_multiple_tags(self):
        source = page()
        source["secret"] = "must-not-appear"
        work = sync.convert_page(source, self.root)
        self.assertEqual(work["tags"], ["RESCENE", "WONI"])
        self.assertEqual(work["dateLabel"], "加入")
        self.assertNotIn("must-not-appear", json.dumps(work))
        self.assertEqual(work["sourceUrl"], "https://www.youtube.com/watch?v=r0aBwvfiNjY")

    def test_missing_subtitle_stops_sync(self):
        (self.root / "r0aBwvfiNjY.srt").unlink()
        with self.assertRaises(sync.SyncError):
            sync.convert_page(page(), self.root)

    def test_custom_domain_restores_cover_without_youtube_source(self):
        for path in ("/", "/index.html"):
            for source_url in ("", "https://weverse.io/hyeri/live/0-176571789"):
                with self.subTest(path=path, source_url=source_url):
                    source = page()
                    source["properties"]["翻譯連結"]["url"] = f"https://allenka.com{path}?v=r0aBwvfiNjY"
                    source["properties"]["來源連結"] = {"type": "url", "url": source_url}
                    work = sync.convert_page(source, self.root)
                    self.assertEqual(work["image"], "https://i.ytimg.com/vi/r0aBwvfiNjY/hqdefault.jpg")
                    self.assertEqual(work["sourceUrl"], source_url or "https://www.youtube.com/watch?v=r0aBwvfiNjY")

    def test_custom_domain_requires_valid_id_and_subtitle(self):
        for suffix in ("", "?v=invalid", "?v=abcdefghijk"):
            with self.subTest(suffix=suffix), self.assertRaises(sync.SyncError):
                source = page()
                source["properties"]["翻譯連結"]["url"] = "https://allenka.com/" + suffix
                sync.convert_page(source, self.root)

    def test_unrelated_domains_and_paths_are_not_local_players(self):
        for url in ("https://allenka.com.example.org/?v=r0aBwvfiNjY", "https://allenka.com/library.html?v=r0aBwvfiNjY"):
            with self.subTest(url=url):
                self.assertFalse(sync.is_local_player(url))
                self.assertEqual(sync.video_id(url), "")

    def test_new_classifications_override_legacy_tags(self):
        source = page()
        source["properties"]["藝人／團體"] = {"type": "multi_select", "multi_select": [{"name": "薇娟"}, {"name": "Sana"}]}
        source["properties"]["內容類型"] = {"type": "select", "select": {"name": "訪談／Q&A"}}
        work = sync.convert_page(source, self.root)
        self.assertEqual(work["tags"], ["薇娟", "Sana"])
        self.assertEqual(work["type"], "訪談／Q&A")
        self.assertNotIn("RESCENE", work["keywords"])

    def test_intentionally_empty_classifications_remain_empty(self):
        source = page()
        source["properties"]["藝人／團體"] = {"type": "multi_select", "multi_select": []}
        source["properties"]["內容類型"] = {"type": "select", "select": None}
        work = sync.convert_page(source, self.root)
        self.assertEqual(work["tags"], [])
        self.assertEqual(work["type"], "")

    def test_wrong_content_type_rejected(self):
        source = page()
        source["properties"]["內容類型"] = {"type": "rich_text", "rich_text": []}
        with self.assertRaises(sync.SyncError):
            sync.convert_page(source, self.root)

    def test_external_translation_is_preserved(self):
        source = page()
        source["properties"]["翻譯連結"]["url"] = "https://example.com/translation"
        work = sync.convert_page(source, self.root)
        self.assertEqual(work["url"], "https://example.com/translation")
        self.assertEqual(work["image"], "")

    def test_unsafe_links_rejected(self):
        for url in ("javascript:alert(1)", "http://example.com", "https://user:pass@example.com", "https://exam\nple.com"):
            with self.subTest(url=url), self.assertRaises(sync.SyncError):
                sync.https_url(url)

    def test_opt_out_and_archived(self):
        source = page()
        source["properties"]["公開"] = {"type": "checkbox", "checkbox": False}
        self.assertIsNone(sync.convert_page(source, self.root))
        source = page()
        source["archived"] = True
        self.assertIsNone(sync.convert_page(source, self.root))

    def test_complete_pagination(self):
        api = self.api([
            {"results": [page()], "has_more": True, "next_cursor": "next"},
            {"results": [page("b" * 32)], "has_more": False, "next_cursor": None}])
        self.assertEqual(len(sync.collect_pages(api)), 2)
        self.assertIn((f"views/{sync.VIEW_ID}/queries/{'c' * 32}?start_cursor=next&page_size=100", None), self.calls)

    def test_view_order_survives_same_day_and_different_dates(self):
        first, second, third = page("a" * 32), page("f" * 32), page("b" * 32)
        third["created_time"] = "2026-09-17T08:00:00Z"
        output = self.root / "library.json"
        sync.sync(self.api([{"results": [first, second, third], "has_more": False}]), output, self.root)
        data = json.loads(output.read_text(encoding="utf-8"))
        self.assertEqual([p["id"] for p in data["works"]], [first["id"], second["id"], third["id"]])
        self.assertEqual(data["orderSource"], "notion-view")

    def test_wrong_view_database_is_rejected(self):
        with self.assertRaises(sync.SyncError):
            sync.collect_pages(lambda *args: {"parent": {"database_id": "f" * 32}})

    def test_incomplete_view_preserves_previous_file(self):
        output = self.root / "library.json"
        output.write_text("previous")
        with self.assertRaises(sync.SyncError):
            sync.sync(self.api([{"results": [page()], "has_more": False,
                                 "request_status": {"type": "incomplete"}}]), output, self.root)
        self.assertEqual(output.read_text(), "previous")

    def test_missing_cursor_fails(self):
        with self.assertRaises(sync.SyncError):
            sync.collect_pages(self.api([{"results": [page()], "has_more": True}]))

    def test_duplicate_page_fails(self):
        with self.assertRaises(sync.SyncError):
            sync.collect_pages(self.api([{"results": [page(), page()], "has_more": False}]))

    def test_empty_and_invalid_preserve_previous_file(self):
        output = self.root / "library.json"
        invalid = copy.deepcopy(page())
        invalid["properties"].pop("翻譯連結")
        for records in ([], [invalid]):
            output.write_text("previous", encoding="utf-8")
            with self.assertRaises(sync.SyncError):
                sync.sync(self.api([{"results": records, "has_more": False}]), output, self.root)
            self.assertEqual(output.read_text(), "previous")

    def test_success_writes_only_projection(self):
        output = self.root / "library.json"
        self.assertEqual(sync.sync(self.api([{"results": [page()], "has_more": False}]), output, self.root), (1, 1))
        data = json.loads(output.read_text(encoding="utf-8"))
        self.assertEqual(data["source"], "notion")
        self.assertEqual(len(data["works"]), 1)

    def test_library_thumbnail_unchanged_but_share_uses_uploaded_cover(self):
        for cover in (None, {"type": "file", "file": {"url": "https://example.com/cover?secret=temporary"}}):
            with self.subTest(cover=cover):
                source = page()
                source["cover"] = cover
                output = self.root / "library.json"
                api = self.api([{"results": [source], "has_more": False}])
                content = io.BytesIO()
                Image.new("RGB", (1280, 720)).save(content, format="JPEG")
                sync.sync(api, output, self.root, download=lambda url: content.getvalue())
                text = output.read_text(encoding="utf-8")
                work = json.loads(text)["works"][0]
                self.assertEqual(work["image"], "https://i.ytimg.com/vi/r0aBwvfiNjY/hqdefault.jpg")
                self.assertEqual(work["imageSource"], "youtube")
                self.assertNotIn("temporary", text)
                self.assertEqual(work["shareImageSource"], "notion" if cover else "none")
                if cover:
                    self.assertEqual(work["shareImageWidth"], 1200)
                    self.assertEqual(work["shareImageHeight"], 630)
                    self.assertTrue((self.root / "covers" / Path(work["shareImage"]).name).is_file())

    def test_body_upload_wins_over_page_cover_with_pagination(self):
        source = page()
        source["cover"] = {"type": "file", "file": {"url": "cover"}}
        def api(endpoint):
            if "start_cursor=" not in endpoint:
                return {"results": [{"type": "image", "image": {"type": "external", "external": {"url": "ignored"}}}], "has_more": True, "next_cursor": "next"}
            return {"results": [{"type": "image", "image": {"type": "file", "file": {"url": "body"}}}], "has_more": False}
        self.assertEqual(sync.uploaded_image_url(api, source), "body")

    def test_bad_image_or_download_failure_preserves_catalog(self):
        source = page()
        source["cover"] = {"type": "file", "file": {"url": "https://example.com/image"}}
        output = self.root / "library.json"
        output.write_text("previous")
        with self.assertRaises(sync.SyncError):
            sync.sync(self.api([{"results": [source], "has_more": False}]), output, self.root, download=lambda url: b"not an image")
        self.assertEqual(output.read_text(), "previous")

    def test_signed_url_changes_do_not_change_saved_image(self):
        data = io.BytesIO()
        Image.new("RGB", (20, 10)).save(data, format="PNG")
        first = sync.save_share_image(data.getvalue(), self.root / "covers")
        self.assertEqual(first, sync.save_share_image(data.getvalue(), self.root / "covers"))

    def test_untrusted_download_host_rejected(self):
        with self.assertRaises(sync.SyncError):
            sync.download_uploaded_image("https://127.0.0.1/image")

    def test_share_canvas_preserves_edges_in_two_to_one_crop(self):
        for size in ((1672, 941), (600, 1200), (1800, 400)):
            with self.subTest(size=size):
                source = Image.new("RGB", size, "white")
                # Distinct top and bottom bands expose accidental cropping.
                source.paste((255, 0, 0), (0, 0, size[0], size[1] // 5))
                source.paste((0, 0, 255), (0, size[1] * 4 // 5, size[0], size[1]))
                data = io.BytesIO()
                source.save(data, format="PNG")
                result = sync.save_share_image(data.getvalue(), self.root / "covers")
                with Image.open(self.root / "covers" / Path(result["shareImage"]).name) as image:
                    self.assertEqual(image.size, (1200, 630))
                    cropped = image.crop((0, 15, 1200, 615))
                    colors = list(cropped.getdata())
                    self.assertTrue(any(r > 220 and b < 30 for r, g, b in colors))
                    self.assertTrue(any(b > 220 and r < 30 for r, g, b in colors))
                    self.assertLess(max(image.getpixel((600, 30))), 30)
                    self.assertLess(max(image.getpixel((600, 600))), 30)

    def test_external_translation_uses_youtube_source_cover(self):
        source = page()
        source["properties"]["翻譯連結"]["url"] = "https://example.com/translation"
        source["properties"]["來源連結"] = {"type": "url", "url": "https://youtu.be/r0aBwvfiNjY"}
        work = sync.convert_page(source, self.root)
        self.assertEqual(work["image"], "https://i.ytimg.com/vi/r0aBwvfiNjY/hqdefault.jpg")

    def test_no_youtube_id_keeps_text_cover(self):
        source = page()
        source["properties"]["翻譯連結"]["url"] = "https://example.com/translation"
        source["cover"] = {"type": "external", "external": {"url": "https://example.com/cover.jpg"}}
        output = self.root / "library.json"
        sync.sync(self.api([{"results": [source], "has_more": False}]), output, self.root)
        work = json.loads(output.read_text(encoding="utf-8"))["works"][0]
        self.assertEqual(work["image"], "")
        self.assertEqual(work["imageSource"], "none")


if __name__ == "__main__":
    unittest.main()

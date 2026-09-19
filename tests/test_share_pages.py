import importlib.util
import json
from html.parser import HTMLParser
from pathlib import Path
import shutil
import uuid
import unittest


spec = importlib.util.spec_from_file_location("prepare", Path(__file__).resolve().parents[1] / "scripts/prepare_pages.py")
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


class Metadata(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.meta = {}
        self.scripts = 0
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta":
            self.meta[attrs.get("property", attrs.get("name"))] = attrs.get("content")
        if tag == "script":
            self.scripts += 1


class SharePagesTests(unittest.TestCase):
    def setUp(self):
        preview = Path(__file__).resolve().parents[1] / ".notion-preview"
        self.site = (preview / ("share-test-" + uuid.uuid4().hex)).resolve()
        self.assertEqual(self.site.parent, preview.resolve())
        self.site.mkdir(parents=True)
        self.addCleanup(shutil.rmtree, self.site)
        (self.site / "srt").mkdir()
        (self.site / "data").mkdir()
        self.vid = "x8EU50FVB1k"
        (self.site / "srt" / f"{self.vid}.srt").write_text("subtitle")
        self.work = {"title": '中文 "標題" & <script>alert(1)</script> VIDEO_ID',
                     "url": f"https://allenka.com/?v={self.vid}", "artist": "RESCENE", "type": "綜藝",
                     "image": f"https://i.ytimg.com/vi/{self.vid}/hqdefault.jpg"}
        self.work.update(shareImage="data/covers/" + "a" * 64 + ".jpg", shareImageWidth=1280, shareImageHeight=720)
        (self.site / "data/covers").mkdir()
        (self.site / self.work["shareImage"]).write_bytes(b"fixture")

    def build(self, works=None):
        prepare.build_share_pages({"works": works if works is not None else [self.work]}, self.site)

    def test_metadata_without_javascript_and_safe_title(self):
        self.build()
        html = (self.site / "share" / self.vid / "index.html").read_text(encoding="utf-8")
        parsed = Metadata(html)
        self.assertEqual(parsed.meta["og:title"], self.work["title"])
        self.assertEqual(parsed.meta["og:image"], prepare.SITE + self.work["shareImage"])
        self.assertEqual(parsed.meta["og:image:width"], "1280")
        self.assertEqual(parsed.meta["og:image:height"], "720")
        self.assertNotIn("ytimg.com", html)
        self.assertEqual(parsed.meta["og:url"], f"https://allenka.com/share/{self.vid}/")
        self.assertEqual(parsed.meta["twitter:card"], "summary_large_image")
        self.assertIn("RESCENE · 綜藝", parsed.meta["og:description"])
        self.assertEqual(parsed.scripts, 1)
        self.assertIn(f'window.location.replace("../../?v={self.vid}")', html)
        manifest = json.loads((self.site / "data/share.json").read_text())
        self.assertEqual(manifest["videos"][self.vid], parsed.meta["og:url"])

    def test_external_and_invalid_links_do_not_create_routes(self):
        for url in ("https://example.com/?v=" + self.vid, "https://allenka.com/?v=../../bad",
                    "https://allenka.com.evil.test/?v=" + self.vid, "http://allenka.com/?v=" + self.vid,
                    "https://user:pass@allenka.com/?v=" + self.vid):
            self.assertEqual(prepare.share_video_id({"url": url}), "")
        self.build([{**self.work, "url": "https://example.com/"}])
        self.assertFalse((self.site / "share").exists())

    def test_legacy_player_links_supported(self):
        self.assertEqual(prepare.share_video_id({"url": f"https://zx2538265.github.io/player/?v={self.vid}"}), self.vid)

    def test_duplicate_video_fails_instead_of_overwriting(self):
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            self.build([self.work, self.work])

    def test_missing_subtitle_fails(self):
        (self.site / "srt" / f"{self.vid}.srt").unlink()
        with self.assertRaisesRegex(ValueError, "Missing share subtitle"):
            self.build()

    def test_unsafe_image_fails(self):
        self.work["shareImage"] = "javascript:alert(1)"
        with self.assertRaisesRegex(ValueError, "Invalid share image"):
            self.build()

    def test_no_uploaded_image_does_not_fall_back_to_youtube(self):
        self.work.pop("shareImage")
        self.build()
        html = (self.site / "share" / self.vid / "index.html").read_text(encoding="utf-8")
        self.assertNotIn("og:image", html)
        self.assertNotIn("ytimg.com", html)

    def test_generated_metadata_participates_in_release_digest(self):
        self.build()
        before = prepare.fingerprint(self.site)
        path = self.site / "share" / self.vid / "index.html"
        path.write_text(path.read_text(encoding="utf-8").replace("RESCENE", "新標題"), encoding="utf-8")
        self.assertNotEqual(before, prepare.fingerprint(self.site))

    def test_build_includes_manifest_script_and_deterministic_pages(self):
        root = Path(__file__).resolve().parents[1]
        first, second = self.site / "first", self.site / "second"
        self.assertEqual(prepare.prepare(root, root / "data/library.json", first),
                         prepare.prepare(root, root / "data/library.json", second))
        manifest = json.loads((first / "data/share.json").read_text())
        self.assertGreater(len(manifest["videos"]), 0)
        self.assertTrue((first / "share.js").is_file())
        for vid in manifest["videos"]:
            self.assertTrue((first / "share" / vid / "index.html").is_file())

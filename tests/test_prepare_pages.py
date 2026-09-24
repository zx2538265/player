import importlib.util
import io
import json
from pathlib import Path
import shutil
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError
import uuid

spec = importlib.util.spec_from_file_location("prepare", Path(__file__).resolve().parents[1] / "scripts/prepare_pages.py")
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


class CompareTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(__file__).resolve().parents[1] / ".notion-preview" / ("compare-" + uuid.uuid4().hex)
        self.root.mkdir(parents=True)
        self.addCleanup(shutil.rmtree, self.root)
        (self.root / "data").mkdir()
        self.payload = {"works": [{"id": "a", "title": "one"}, {"id": "b", "title": "two"}], "syncedAt": "first"}
        self.write()

    def write(self):
        (self.root / "data/library.json").write_text(json.dumps(self.payload), encoding="utf-8")

    def test_timestamp_does_not_redeploy(self):
        before = prepare.fingerprint(self.root)
        self.payload["syncedAt"] = "later"
        self.write()
        self.assertEqual(before, prepare.fingerprint(self.root))

    def test_content_and_order_changes_redeploy(self):
        before = prepare.fingerprint(self.root)
        self.payload["works"].reverse()
        self.write()
        after_order = prepare.fingerprint(self.root)
        self.assertNotEqual(before, after_order)
        self.payload["works"][0]["title"] = "changed"
        self.write()
        self.assertNotEqual(after_order, prepare.fingerprint(self.root))

    def test_player_and_subtitle_changes_redeploy(self):
        before = prepare.fingerprint(self.root)
        (self.root / "index.html").write_text("player")
        self.assertNotEqual(before, prepare.fingerprint(self.root))

    def test_bigbang_chant_runtime_is_in_public_artifact(self):
        source = self.root / "source"
        source.mkdir()
        for name in ("index.html", "test.html", "library.html", "library.css", "library.js", "share.js", ".nojekyll"):
            (source / name).write_text("")
        (source / "srt").mkdir()
        shutil.copytree(prepare.ROOT / "bigbang", source / "bigbang")
        shutil.copytree(prepare.ROOT / "ateez", source / "ateez")
        shutil.copytree(prepare.ROOT / "babymonster", source / "babymonster")
        site = self.root / "site"
        prepare.prepare(source, self.root / "data/library.json", site)
        self.assertEqual((site / "bigbang/chant.js").read_bytes(), (source / "bigbang/chant.js").read_bytes())
        html = (site / "bigbang/index.html").read_text(encoding="utf-8")
        self.assertLess(html.index('src="chant.js'), html.index('src="practice.js'))
        self.assertFalse((site / "bigbang/README.md").exists())
        for name in ("index.html", "practice.css", "practice.js", "chant.js", "songs.json", "share-cover.png"):
            self.assertEqual((site / "ateez" / name).read_bytes(), (source / "ateez" / name).read_bytes())
        self.assertFalse((site / "ateez/README.md").exists())
        for name in ("index.html", "practice.css", "practice.js", "chant.js", "songs.json", "share-cover.png", "share-cover-wide.png"):
            self.assertEqual((site / "babymonster" / name).read_bytes(), (source / "babymonster" / name).read_bytes())
        self.assertFalse((site / "babymonster/README.md").exists())
        track = json.loads((site / "bigbang/songs.json").read_text(encoding="utf-8"))[0]["chant"]
        self.assertEqual(track["videoId"], "5eiytN0_YR8")
        self.assertEqual(len(track["cues"]), 37)

    def test_release_metadata_not_part_of_digest(self):
        before = prepare.fingerprint(self.root)
        (self.root / "release.json").write_text("{}")
        self.assertEqual(before, prepare.fingerprint(self.root))

    def run_main(self, response=None, error=None, build_error=None):
        output = self.root / "output"
        summary = self.root / "summary"
        output.write_text("")
        summary.write_text("")
        with patch.object(prepare, "prepare", return_value="a" * 64, side_effect=build_error), \
                patch.object(prepare, "urlopen", side_effect=error,
                             return_value=io.BytesIO(response or b"")), \
                patch.dict(prepare.os.environ, GITHUB_OUTPUT=str(output), GITHUB_STEP_SUMMARY=str(summary)), \
                patch("sys.argv", ["prepare_pages.py", "--catalog", "catalog.json", "--site", "site"]), \
                patch("sys.stdout", new_callable=io.StringIO) as stdout:
            prepare.main()
        return output.read_text(), summary.read_text(encoding="utf-8"), stdout.getvalue()

    def test_remote_failures_continue_deployment(self):
        for error in (HTTPError(prepare.SITE, 403, "Forbidden", {}, None),
                      HTTPError(prepare.SITE, 404, "Not Found", {}, None),
                      HTTPError(prepare.SITE, 503, "Unavailable", {}, None),
                      URLError("DNS failure"), TimeoutError()):
            with self.subTest(error=error):
                output, summary, log = self.run_main(error=error)
                self.assertEqual(output, "changed=true\n")
                self.assertIn("略過比較", summary)
                self.assertIn("::warning::", log)

    def test_invalid_release_continues_deployment(self):
        for response in (b"<html>blocked</html>", b"{}", b"[]", b"null",
                         b'{"digest": null}', b'{"digest": "invalid"}', b"\xff"):
            with self.subTest(response=response):
                output, _, log = self.run_main(response=response)
                self.assertEqual(output, "changed=true\n")
                self.assertIn("::warning::", log)

    def test_valid_release_controls_deployment(self):
        for digest, changed in (("a" * 64, "false"), ("b" * 64, "true")):
            with self.subTest(digest=digest):
                output, _, log = self.run_main(response=json.dumps({"digest": digest}).encode())
                self.assertEqual(output, f"changed={changed}\n")
                self.assertNotIn("::warning::", log)

    def test_local_build_failure_still_fails(self):
        with self.assertRaisesRegex(ValueError, "Invalid cover"):
            self.run_main(build_error=ValueError("Invalid cover"))

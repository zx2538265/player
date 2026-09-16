import importlib.util
import json
from pathlib import Path
import shutil
import unittest
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

    def test_release_metadata_not_part_of_digest(self):
        before = prepare.fingerprint(self.root)
        (self.root / "release.json").write_text("{}")
        self.assertEqual(before, prepare.fingerprint(self.root))

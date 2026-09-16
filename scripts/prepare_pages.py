"""Build a public-only Pages artifact and compare it with the live release."""
import argparse
import hashlib
from http.client import HTTPException
import json
import os
from pathlib import Path
import shutil
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://allenka.com/"


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
    for name in ("index.html", "test.html", "library.html", "library.css", "library.js", ".nojekyll"):
        shutil.copy2(root / name, site / name)
    shutil.copytree(root / "srt", site / "srt")
    (site / "data/covers").mkdir(parents=True)
    payload = json.loads(catalog.read_text(encoding="utf-8"))
    if not payload.get("works"):
        raise ValueError("Empty catalog")
    shutil.copy2(catalog, site / "data/library.json")
    for work in payload["works"]:
        image = work.get("image", "")
        if image.startswith("data/covers/"):
            filename = Path(image).name
            source = catalog.parent / "covers" / filename
            if image != "data/covers/" + filename or hashlib.sha256(source.read_bytes()).hexdigest() != Path(filename).stem:
                raise ValueError("Invalid cover")
            shutil.copy2(source, site / image)
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

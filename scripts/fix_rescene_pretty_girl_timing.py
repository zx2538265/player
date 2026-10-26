"""Reapply reviewed caption tails without requiring the original OCR inventory."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def apply_corrections(catalog):
    decisions = json.loads((ROOT / 'rescene/pretty-girl-timing-corrections.json').read_text(encoding='utf-8'))
    song = next(s for s in catalog if s['chant']['videoId'] == decisions['videoId'])
    cues = song['chant']['cues']
    for decision in decisions['corrections']:
        cue = next(c for c in cues if decision['sourceId'] in c['sourceIds'])
        assert cue['text'] == decision['text'] and cue['start'] == decision['start']
        cue['end'] = decision['end']
    assert all(c['end'] > c['start'] and (i == 0 or c['start'] >= cues[i-1]['end']) for i, c in enumerate(cues))


if __name__ == '__main__':
    path = ROOT / 'rescene/songs.json'
    catalog = json.loads(path.read_text(encoding='utf-8'))
    apply_corrections(catalog)
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

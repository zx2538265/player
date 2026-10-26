"""Restore visually reviewed UhUh responses without the old local OCR inventory."""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def apply_corrections(catalog):
    decisions = json.loads((ROOT / 'rescene/uhuh-omission-corrections.json').read_text(encoding='utf-8'))
    song = next(s for s in catalog if s['chant']['videoId'] == decisions['videoId'])
    additions = copy.deepcopy(decisions['cues'])
    ids = {source for cue in additions for source in cue['sourceIds']}
    cues = [c for c in song['chant']['cues'] if not ids.intersection(c['sourceIds'])]
    cues = sorted(cues + additions, key=lambda c: c['start'])
    assert all(c['end'] > c['start'] and (i == 0 or c['start'] >= cues[i-1]['end']) for i, c in enumerate(cues))
    song['chant']['cues'] = cues
    song['note'] = f'官方應援教學 · {len(cues)} 張提示卡 · 依畫面定位，聽校待完成'


if __name__ == '__main__':
    path = ROOT / 'rescene/songs.json'
    catalog = json.loads(path.read_text(encoding='utf-8'))
    apply_corrections(catalog)
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

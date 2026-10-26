"""Apply manually reviewed caption display ends, preserving entries and wording."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def apply_corrections(catalog):
    decisions = json.loads((ROOT / 'rescene/cue-end-review.json').read_text(encoding='utf-8'))
    tracks = {song['chant']['videoId']: song['chant'] for song in catalog}
    for song in decisions['songs']:
        track = tracks[song['videoId']]
        cues = {tuple(cue['sourceIds']): cue for cue in track['cues']}
        for decision in song['cues']:
            cue = cues[tuple(decision['sourceIds'])]
            assert cue['text'] == decision['text'] and cue['start'] == decision['start']
            assert decision['end'] >= decision['previousEnd']
            cue['end'] = decision['end']
        ordered = track['cues']
        assert all(c['end'] > c['start'] and (i == 0 or c['start'] >= ordered[i-1]['end']) for i, c in enumerate(ordered))
        track['displayEndBasis'] = 'reviewed-source-caption'


if __name__ == '__main__':
    path = ROOT / 'rescene/songs.json'
    catalog = json.loads(path.read_text(encoding='utf-8'))
    apply_corrections(catalog)
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

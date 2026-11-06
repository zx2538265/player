"""Apply the reviewed With repeat to catalogs, including future rebuilds."""
import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def apply_corrections(catalog):
    decision = json.loads((ROOT / 'rescene/with-repeat-corrections.json').read_text(encoding='utf-8'))
    song = next((s for s in catalog if s.get('chant', {}).get('videoId') == decision['videoId']), None)
    if song is None:
        return
    additions = deepcopy(decision['cues'])
    ids = {source for cue in additions for source in cue['sourceIds']}
    cues = sorted([c for c in song['chant']['cues'] if not ids.intersection(c['sourceIds'])] + additions,
                  key=lambda c: c['start'])
    assert all(c['end'] > c['start'] and (i == 0 or c['start'] >= cues[i-1]['end']) for i, c in enumerate(cues))
    song['chant']['cues'] = cues
    song['note'] = f'官方應援教學 · {len(cues)} 張提示卡 · 依畫面校時，聽校待完成'


def save_reviewed_track(catalog):
    """Keep a revision separate from the original OCR ledger/SRT."""
    song = next((s for s in catalog if s.get('slug') == 'with'), None)
    folder = ROOT / 'video/cLtl2aFq_6M'
    if song is None or not folder.exists():
        return
    track = song['chant']
    def timestamp(seconds):
        ms = round(seconds * 1000)
        return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
    (folder / 'chant.with-repeat-v2.json').write_text(json.dumps(dict(
        track=track, decision='rescene/with-repeat-corrections.json',
        visual_review='72 caption groups plus all chant temporal sheets; changed boundaries at 0.1s',
        listening='pending', normal_speed_playback='pending'), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    blocks = []
    for i, cue in enumerate(track['cues'], 1):
        original = '함성' if cue['text'] == '（歡呼）' else cue['text']
        blocks.append(f"{i}\n{timestamp(cue['start'])} --> {timestamp(cue['end'])}\n{original}")
    (folder / 'chant.with-repeat-v2.srt').write_text('\n\n'.join(blocks) + '\n', encoding='utf-8')


if __name__ == '__main__':
    from finalize_rescene_chants import read, write
    path = ROOT / 'rescene/songs.json'
    catalog = read(path)
    apply_corrections(catalog)
    write(path, catalog)

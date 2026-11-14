"""Attach the user-requested Inside Out live version using reviewed audio alignment."""
from copy import deepcopy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE_ID = '_hvATW8DixU'
GUIDE_ID = 'cL_B5W4gBRU'
# Full-song waveform correlation: guide 28–234 seconds maps to live -23.100s.
# Evidence: video/_hvATW8DixU/alignment-{probe,per-cue}.json.
OFFSET = -23.100


def apply_live_version(catalog):
    song = next((s for s in catalog if s.get('slug') == 'inside-out'), None)
    if not song:
        return
    guide = song.get('chant', {})
    if guide.get('videoId') != GUIDE_ID or not guide.get('cues'):
        raise ValueError('Inside Out guide source changed; review live alignment before rebuilding')
    track = deepcopy(guide)
    track.update(videoId=LIVE_ID, status='audio_aligned_listening_pending',
        timingBasis='audio_cross_correlation_transfer',
        derivedFrom={'videoId': GUIDE_ID, 'offsetSeconds': OFFSET},
        note='沿用官方教學應援，依整曲音訊比對平移 -23.100 秒；非現場觀眾喊聲轉錄。已核對主體音訊及代表畫面，完整直接聽校待完成。')
    for cue in track['cues']:
        cue['start'] = round(cue['start'] + OFFSET, 3)
        cue['end'] = round(cue['end'] + OFFSET, 3)
        if cue['start'] < 0 or cue['end'] <= cue['start']:
            raise ValueError('Invalid live cue boundary')
    source = dict(kind='現場版 · Show Champion', slug='live',
        title='[쇼챔직캠 4K] RESCENE (리센느) - 백화요란 (Inside Out) | Show Champion | EP.618 | 261111',
        url=f'https://www.youtube.com/watch?v={LIVE_ID}', videoId=LIVE_ID,
        startSeconds=0, endSeconds=213.9, chant=track)
    song['sources'] = [s for s in song['sources'] if s.get('videoId') != LIVE_ID] + [source]


if __name__ == '__main__':
    path = ROOT / 'rescene/songs.json'
    catalog = json.loads(path.read_text(encoding='utf-8'))
    apply_live_version(catalog)
    path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

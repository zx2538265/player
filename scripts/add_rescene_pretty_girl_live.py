"""Attach the user-requested Pretty Girl live version using reviewed audio alignment."""
from copy import deepcopy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE_ID = 'pEreGS1gwls'
GUIDE_ID = 'RX592yMx7P0'
# Full-song waveform correlation: guide 30–229 seconds maps to live -22.870s.
# Evidence: video/pEreGS1gwls/alignment-{probe,per-cue}.json.
OFFSET = -22.870


def apply_live_version(catalog):
    song = next((s for s in catalog if s.get('slug') == 'pretty-girl'), None)
    if not song:
        return
    guide = song.get('chant', {})
    if guide.get('videoId') != GUIDE_ID or not guide.get('cues'):
        raise ValueError('Pretty Girl guide source changed; review live alignment before rebuilding')
    track = deepcopy(guide)
    track.update(videoId=LIVE_ID, status='audio_aligned_listening_pending',
        timingBasis='audio_cross_correlation_transfer',
        derivedFrom={'videoId': GUIDE_ID, 'offsetSeconds': OFFSET},
        note='沿用官方教學應援，依整曲音訊比對平移 -22.870 秒；非現場觀眾喊聲轉錄。已核對主體音訊及代表畫面，完整直接聽校待完成。')
    for cue in track['cues']:
        cue['start'] = round(cue['start'] + OFFSET, 3)
        cue['end'] = round(cue['end'] + OFFSET, 3)
        if cue['start'] < 0 or cue['end'] <= cue['start']:
            raise ValueError('Invalid live cue boundary')
    source = dict(kind='現場版 · 音樂中心', slug='live',
        title='[#음중풀캠8K] RESCENE (리센느) – Pretty Girl FullCam | 쇼! 음악중심 | MBC260711',
        url=f'https://www.youtube.com/watch?v={LIVE_ID}', videoId=LIVE_ID,
        startSeconds=0, endSeconds=211.33, chant=track)
    song['sources'] = [s for s in song['sources'] if s.get('videoId') != LIVE_ID] + [source]


if __name__ == '__main__':
    path = ROOT / 'rescene/songs.json'
    catalog = json.loads(path.read_text(encoding='utf-8'))
    apply_live_version(catalog)
    path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

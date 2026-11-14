"""Attach the user-requested With live version using reviewed audio alignment."""
from copy import deepcopy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE_ID = 'pUNac5ECLeg'
GUIDE_ID = 'cLtl2aFq_6M'
# Full-song waveform correlation: guide 42–212 seconds maps to live -31.437s.
# Evidence: video/pUNac5ECLeg/alignment-{probe,boundaries}.json.
OFFSET = -31.437


def apply_live_version(catalog):
    song = next((s for s in catalog if s.get('slug') == 'with'), None)
    if not song:
        return
    guide = song.get('chant', {})
    if guide.get('videoId') != GUIDE_ID or not guide.get('cues'):
        raise ValueError('With guide source changed; review live alignment before rebuilding')
    track = deepcopy(guide)
    track.update(videoId=LIVE_ID, status='audio_aligned_listening_pending',
        timingBasis='audio_cross_correlation_transfer',
        derivedFrom={'videoId': GUIDE_ID, 'offsetSeconds': OFFSET},
        note='沿用官方教學應援，依整曲音訊比對平移 -31.437 秒；非現場觀眾喊聲轉錄。已核對主體音訊及代表畫面，完整直接聽校待完成。')
    for cue in track['cues']:
        cue['start'] = round(cue['start'] + OFFSET, 3)
        cue['end'] = round(cue['end'] + OFFSET, 3)
        if cue['start'] < 0 or cue['end'] <= cue['start']:
            raise ValueError('Invalid live cue boundary')
    source = dict(kind='現場版 · Music Bank', slug='live',
        title="[K-Choreo 8K] 리센느 직캠 'With' (RESCENE Choreography) @MusicBank 261106",
        url=f'https://www.youtube.com/watch?v={LIVE_ID}', videoId=LIVE_ID,
        startSeconds=0, endSeconds=189.563, chant=track)
    song['sources'] = [s for s in song['sources'] if s.get('videoId') != LIVE_ID] + [source]


if __name__ == '__main__':
    path = ROOT / 'rescene/songs.json'
    catalog = json.loads(path.read_text(encoding='utf-8'))
    apply_live_version(catalog)
    path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

"""Add the requested live stages without modifying guide tracks.
Timing evidence: video/<live-id>/alignment-{probe,per-cue,spectral}.json.
"""
from copy import deepcopy
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
VERSIONS=[
 (1,'x4b_9YdhT8M','R_Zn4YqvQ1o',-21.9175,'現場版 · M COUNTDOWN',9.0825,198.0825),
 (2,'9DlDGxKQsDg','c1jLt0EarG4',-28.1555,'現場版 · 音樂中心',1.8445,176.8445),
 (3,'CRSVJA-dKWo','Y4BxIn0jpOU',1.083,'現場版 · HELLO MONSTER',0,193.083),
 (4,'X2GfGkH-3hg','nvMzXCBoiEQ',-51.7595,'現場版 · 音樂中心',0.2405,180.2405),
 (5,'jfqBPlcBGtE','fuVaqtSfYvE',4.6527,'現場版 · 音樂中心',0,187.6527),
 (21,'6qGzeS2zfOk','Yb2m3FkIR_g',1.7975,'現場版 · 人氣歌謠',0,217.7975),
 (23,'wBHKLsujSNA','QQQLDjLufNo',17.2108,'現場版 · M COUNTDOWN',45.2108,190.2108),
 (24,'xN3X_tl4zlQ','ISJForNHmA0',-16.7105,'現場版 · M COUNTDOWN',13.2895,188.2895),
]
def apply_live_versions(catalog):
 for number,guide_id,live_id,offset,kind,start,end in VERSIONS:
  song=next(s for s in catalog if s['number']==number)
  start,end=round(start,3),round(end,3)
  guide=song['chant']
  if guide['videoId']!=guide_id: raise ValueError('Guide changed; review alignment first')
  track=deepcopy(guide)
  track.update(videoId=live_id,status='audio_aligned_listening_pending',timingBasis='audio_cross_correlation_transfer',derivedFrom={'videoId':guide_id,'offsetSeconds':offset},note=f'沿用教學版應援，依音訊比對平移 {offset:+.4f} 秒；非現場觀眾喊聲轉錄。完整直接聽校與實播同步待確認，片尾歡呼沿用音樂時間映射。')
  for cue in track['cues']:
   cue['start']=round(cue['start']+offset,3);cue['end']=round(cue['end']+offset,3)
   if not 0<=cue['start']<cue['end']<=end: raise ValueError('Invalid live boundary')
  source={'kind':kind,'slug':'live','title':song['title']+' 現場版','url':f'https://www.youtube.com/watch?v={live_id}','videoId':live_id,'startSeconds':round(start,3),'endSeconds':round(end,3),'chant':track}
  if song.get('subtitles',{}).get('videoId')==guide_id:
   subtitles=deepcopy(song['subtitles'])
   subtitles.update(videoId=live_id,sourceUrl=source['url'],derivedFrom={'videoId':guide_id,'offsetSeconds':offset},status='audio_aligned_listening_pending')
   for cue in subtitles['cues']:
    cue['start']=round(cue['start']+offset,3);cue['end']=round(cue['end']+offset,3)
    if not 0<=cue['start']<cue['end']<=end: raise ValueError('Invalid live subtitle boundary')
   source['subtitles']=subtitles
  song['sources']=[s for s in song['sources'] if s.get('videoId')!=live_id]+[source]
if __name__=='__main__':
 path=ROOT/'babymonster/songs.json';catalog=json.loads(path.read_text(encoding='utf8'));apply_live_versions(catalog);path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

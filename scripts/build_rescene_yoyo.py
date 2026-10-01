"""Rebuild only YoYo from visually reviewed blue captions in the requested source."""
import argparse
import json
from pathlib import Path
from finalize_rescene_chants import sha, timestamp, write, read

ROOT = Path(__file__).resolve().parents[1]
VID = 'ykVJo0wFlQ4'
FOLDER = ROOT / 'video' / VID
URL = f'https://www.youtube.com/watch?v={VID}'
# Each entry was checked against all five source review sheets. Black lyrics
# are excluded; blue text is a response. These are caption intervals, not audio.
REVIEW = {
    1: '원이 리브 미나미 메이 제나 리센느!',
    3: '찾아내', 5: '집중해', 8: '리센느!', 10: '날리면',
    13: '이건 One and only', 16: "Let's play Go!",
    19: 'Up down, up down, up down', 24: 'Up down, up down, up down',
    28: 'Up down, up down, up down', 32: 'Up down, up down',
    34: '（歡呼）', 35: 'yeah', 42: 'C-R-A-Z-Y', 47: 'Oh Yeah',
    48: '소나기', 52: '내 정체는 Secret', 56: "Let's play Go!",
    59: 'Up down, up down, up down', 63: 'Up down, up down, up down',
    67: 'Up down, up down, up down', 71: 'Up down, up down',
    73: '（歡呼）', 81: '우린 환상적인 Chemistry',
    85: 'Up down, up down, up down', 87: 'I like you',
    90: 'Up down, up down, up down', 94: 'Up down, up down', 97: '（歡呼）',
}


def prepare():
    tasks = read(FOLDER / 'chant-ocr-tasks.json')['tasks']
    events = []
    for index, text in REVIEW.items():
        task = tasks[index]
        events.append(dict(id=f'{VID}-{index}', task_index=index,
                           original=text, source_original='(歓声)' if text=='（歡呼）' else text,
                           card_text='원이 리브 미나미\n메이 제나 리센느!' if index==1 else text,
                           start=task['start'], end=task['end'],
                           caption_start=task['start'], caption_end=task['end'],
                           timing_basis='caption', evidence=[task['image']],
                           visual_review='accepted', listening_review='pending'))
        if index==97:
            # End the readable card before the final near-black fade; leave
            # a full +0.2s evidence window within the decoded video frames.
            events[-1]['end']=217.4
            events[-1]['timing_note']='Card ends before near-black final fade; caption continues faintly to source end'
    decisions = dict(videoId=VID, events=events,
                     rejected=[dict(task_index=t['task_index'], start=t['start'], end=t['end'],
                                    reason='Black ordinary lyrics, absent captions, or final fade; no new blue response')
                               for t in tasks if t['task_index'] not in REVIEW],
                     reviewed_sheets=[f'chant-review-{i:02}.jpg' for i in range(5)])
    write(FOLDER / 'chant-refined.json', decisions)
    print(f'{len(events)} accepted captions; {len(decisions["rejected"])} excluded spans')


def finalize():
    info = read(FOLDER / 'source.info.json')
    assert info['id']==VID and info['channel']=='ゆっぴー'
    decisions = read(FOLDER / 'chant-refined.json')
    events = decisions['events']
    tasks = read(FOLDER / 'chant-ocr-tasks.json')['tasks']
    rows = [json.loads(l) for l in (FOLDER / 'chant-ocr-results.jsonl').read_text(encoding='utf-8').splitlines()]
    assert [r['task_index'] for r in rows]==list(range(len(tasks)))
    assert all(r['device']=='gpu:0' and not r.get('error') for r in rows)
    boundaries = read(FOLDER / 'chant-boundary-tasks-yoyo-v2.json')
    assert boundaries['videoId']==VID and boundaries['step']==.1 and boundaries['full_frame']
    assert {t['target_id'] for t in boundaries['tasks']}=={e['id'] for e in events}
    previous = 0
    for e in events:
        assert previous<=e['start']<e['end']<=info['duration']
        e['boundary_evidence']=[t for t in boundaries['tasks'] if t['target_id']==e['id']]
        for edge in ('start', 'end'):
            assert sorted(t['time'] for t in e['boundary_evidence'] if t['edge']==edge)==[round(e[edge]+d,1) for d in (-.2,-.1,0,.1,.2)]
        assert all((FOLDER / t['image']).is_file() for t in e['boundary_evidence'])
        assert all((FOLDER / p).is_file() for p in e['evidence'])
        e.update(review_status='visual_checked_listening_pending', audio_start=None, audio_end=None)
        previous=e['end']
    ledger=dict(videoId=VID, source_url=URL, source_title=info['title'], channel=info['channel'],
                official_source=False, source_sha256=sha(FOLDER / 'source.mp4'), duration=info['duration'],
                status='visual_checked_listening_pending',
                timing_note='Absolute caption intervals only. Blue response text; black ordinary lyrics excluded. No measured audio onset or karaoke fill.',
                practice_range=dict(startSeconds=None, endSeconds=None, reason='Preserve full requested source; no listening-verified trim'),
                primary_manifest='chant-ocr-tasks.json', boundary_manifest='chant-boundary-tasks-yoyo-v2.json',
                events=events, rejected=decisions['rejected'], reviewed_sheets=decisions['reviewed_sheets'])
    write(FOLDER / 'chant-ledger.json', ledger)
    ledger=read(FOLDER / 'chant-ledger.json')
    cues=[dict(start=e['start'], end=e['end'], text=e['card_text'], sourceIds=[e['id']]) for e in ledger['events']]
    track=dict(videoId=VID, status=ledger['status'], timingBasis='caption',
               note='指定來源為ゆっぴー頻道；只收錄藍色應援標記，時間依字幕顯示區間，尚未逐句聽校。', cues=cues)
    catalog=read(ROOT / 'rescene/songs.json')
    existing=next((s for s in catalog if s['title']=='YoYo'), None)
    song=dict(number=existing['number'] if existing else max(s['number'] for s in catalog)+1,
              title='YoYo', artist='RESCENE', section='YoYo', hasChant=True,
              note=f'指定應援教學 · {len(cues)} 張提示卡 · 依畫面定位，聽校待完成',
              sources=[dict(kind='應援教學（ゆっぴー）', title=info['title'], url=URL, videoId=VID)], chant=track)
    if existing: catalog[catalog.index(existing)]=song
    else: catalog.append(song)
    write(ROOT / 'rescene/songs.json', catalog)
    write(FOLDER / 'chant-timeline.json', track)
    (FOLDER / 'chant.gpu-rescan.srt').write_text('\n\n'.join(f"{i}\n{timestamp(e['start'])} --> {timestamp(e['end'])}\n{e['source_original']}" for i,e in enumerate(ledger['events'],1))+'\n',encoding='utf-8')
    write(FOLDER / 'chant.gpu-rescan.qa.json', dict(videoId=VID, cue_count=len(cues),
          primary_tasks=len(tasks), ocr_rows=len(rows), ocr_errors=0, contiguous_indices=True,
          runtime_devices=sorted({r['device'] for r in rows}), boundary_references=len(boundaries['tasks']),
          boundary_step=.1, overlaps=0, source_sha256=ledger['source_sha256'],
          ledger_sha256=sha(FOLDER/'chant-ledger.json'), srt_sha256=sha(FOLDER/'chant.gpu-rescan.srt'),
          source_srt_present=False, original_ocr_preserved=True, official_source=False,
          reviewed_sheet_count=5, listening_complete=False, live_youtube_sync_verified=False,
          visual_review='All 99 candidate spans and all accepted captions reviewed; separate full-frame boundary references inspected',
          runtime_warning='Paddle compiled with cuDNN 9.9; runtime cuDNN 9.5; OCR completed without row errors'))
    (FOLDER/'chant.gpu-rescan.diff.md').write_text(f'# YoYo 應援擷取\n\n新增 {len(cues)} 個藍色畫面應援事件；黑色普通歌詞排除，歡呼依日文「歓声」顯示\n沒有覆寫原始 SRT，沒有加入猜測諧音\n', encoding='utf-8')
    (FOLDER/'UNRESOLVED.md').write_text('# 待驗證項目\n\n- 全曲逐句聽校、實際 YouTube 同步尚未驗收\n- 提示起訖為畫面字幕區間，部分標記可能早於喊聲；0.1 秒取樣不等於喊聲準確度\n- 指定影片由ゆっぴー發布，不是 RESCENE 官方頻道；不宣稱官方來源或官方應援詞認證\n- 未加入中文諧音或整首歌詞翻譯；不設定未聽校的播放裁切\n', encoding='utf-8')
    (FOLDER/'PROCESSING.md').write_text(f'# YoYo 應援製作（2026-10-01）\n\n來源：{URL}\n\n發布者：ゆっぴー，非 RESCENE 官方頻道，依使用者指定來源製作\n\n- {len(cues)} 張提示，只收錄藍色應援文字；黑色普通歌詞排除\n- 原片 SHA-256：`{ledger["source_sha256"]}`\n- 全片 0.1 秒畫面取樣，99 個候選區間，5 張 review sheets 全部檢視\n- GPU OCR 99/99，gpu:0，0 錯誤，JSONL 只追加；cuDNN 版本警告保留於 QA\n- 每個事件起訖各保存 ±0.2 秒的全幅畫面，0.1 秒間距，共 290 筆邊界參照；另檢視 3 張邊界裁切對照表，片尾歡呼卡止於淡出前 217.4 秒\n- 以字幕出現／消失時間定位，非音訊喊聲量測；保留完整影片\n- ledger、timeline、原文 SRT、QA、diff 與待驗證項目均留在本資料夾\n- 全曲聽校與實際 YouTube 同步未驗收\n\n重建：`python scripts/build_rescene_yoyo.py --prepare` 建立已審核事件，`python scripts/rescene_chant_boundaries.py --id {VID} --revision=-yoyo-v2` 建立邊界，再執行 `python scripts/build_rescene_yoyo.py` 產生資料\n',encoding='utf-8')
    print(f'YoYo: {len(cues)} cards; other songs preserved')


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--prepare', action='store_true')
    args=parser.parse_args()
    prepare() if args.prepare else finalize()

"""Rebuild Busy Boy only from visually accepted pink source captions."""
import argparse, json
from pathlib import Path
from finalize_rescene_chants import read, write, sha, timestamp
ROOT=Path(__file__).resolve().parents[1]
VID='hc1HS71j6oY'
FOLDER=ROOT/'video'/VID
URL=f'https://www.youtube.com/watch?v={VID}'
REVIEW={
    1:'정원이 진경은 미나미 이예빈 김가영 리센느', 2:'비! 지! 보! 이!',
    4:'behind', 6:'바빠', 8:'치', 9:'dream', 11:'지', 12:'emoji',
    14:'（歡呼）', 16:'busy busy', 17:'busy busy', 18:'Busy boy',
    20:'busy busy', 21:'busy busy', 22:'Busy boy', 24:'이럴거면 왜',
    25:'（歡呼）', 27:'시험해', 28:'늘어놔 왜',
    30:'busy busy', 31:'busy busy', 32:'Busy boy',
    34:'busy busy', 35:'busy busy', 36:'Busy boy', 37:'（歡呼）',
    39:'내 머리 속은 Dizzy', 41:'busy busy', 42:'busy busy', 43:'Busy boy',
    45:'busy busy', 46:'busy busy', 47:'Busy boy', 49:'Busy boy',
    50:'（歡呼）', 51:'네! 가! 좋! 아! 리! 센! 느!',
}
def prepare():
    tasks=read(FOLDER/'pink-ocr-tasks.json')['tasks']
    events=[]
    for index,text in REVIEW.items():
        task=tasks[index]
        card='정원이 진경은 미나미\n이예빈 김가영 리센느' if index==1 else text
        if index==51:card='네! 가! 좋! 아!\n리! 센! 느!'
        events.append(dict(id=f'{VID}-{index}',task_index=index,original=text,
            source_original='(함성)' if text=='（歡呼）' else text,card_text=card,
            start=task['start'],end=task['end'],caption_start=task['start'],caption_end=task['end'],
            timing_basis='caption',evidence=[task['image']],visual_review='accepted',listening_review='pending'))
        if text=='busy busy':events[-1]['timing_note']='Two pink response words on one static caption; intervening black busy excluded. Individual audio onsets unmeasured.'
    decisions=dict(videoId=VID,events=events,
        rejected=[dict(task_index=t['task_index'],start=t['start'],end=t['end'],reason='No pink response; ordinary black/white lyric or empty caption') for t in tasks if t['task_index'] not in REVIEW],
        reviewed_sheets=[f'pink-review-{i:02}.jpg' for i in range(3)])
    timing_path=FOLDER/'entry-timing-reviewed.v3.json'
    if timing_path.exists():
        timing=read(timing_path)
        assert timing['source_sha256']==sha(FOLDER/'source.mp4')
        by_id={e['id']:e for e in events}; aligned=[]
        assert {d['source_event_id'] for d in timing['decisions']}==set(by_id)
        for d in timing['decisions']:
            base=by_id[d['source_event_id']]
            for output in d['outputs']:
                e={**base, 'id':output['id'],'source_event_id':base['id'],
                   'start':output['start'],'end':output['end'],'card_text':output['text'],
                   'original':output['text'],'source_original':'(함성)' if output['text']=='（歡呼）' else output['text'],
                   'timing_basis':'word-aligned' if d['disposition']!='retain' else 'caption',
                   'timing_review':d,'timing_note':d['reason'],'audio_start':output['start'] if d['disposition']!='retain' else None}
                aligned.append(e)
        decisions['events']=aligned
        write(FOLDER/'chant-refined.v3.json',decisions)
        print(len(aligned),'aligned events')
        return
    write(FOLDER/'chant-refined.json',decisions)
    print(len(events),'accepted events')
def finalize():
    info=read(FOLDER/'source.info.json')
    assert info['id']==VID and info['channel']=='농담곰탕탕후루'
    aligned=(FOLDER/'entry-timing-reviewed.v3.json').exists()
    decisions=read(FOLDER/('chant-refined.v3.json' if aligned else 'chant-refined.json'))
    events=decisions['events']; tasks=read(FOLDER/'pink-ocr-tasks.json')['tasks']
    rows=[json.loads(line) for line in (FOLDER/'pink-ocr-results.jsonl').read_text(encoding='utf-8').splitlines()]
    assert [r['task_index'] for r in rows]==list(range(len(tasks)))
    assert all(r['device']=='gpu:0' and not r.get('error') for r in rows)
    boundary_file='chant-boundary-tasks-busy-boy-v3.json' if aligned else 'chant-boundary-tasks-busy-boy-v2.json'
    boundaries=read(FOLDER/boundary_file)
    assert boundaries['full_frame'] and boundaries['step']==.1
    previous=0
    for e in events:
        assert previous<=e['start']<e['end']<=info['duration']
        e['boundary_evidence']=[t for t in boundaries['tasks'] if t['target_id']==e['id']]
        assert len(e['boundary_evidence'])>=7
        assert all((FOLDER/t['image']).exists() for t in e['boundary_evidence'])
        e.update(review_status='model_aligned_listening_pending' if aligned else 'visual_checked_listening_pending',audio_end=None)
        e.setdefault('audio_start',None)
        previous=e['end']
    ledger=dict(videoId=VID,source_url=URL,source_title=info['title'],channel=info['channel'],official_source=False,
        source_sha256=sha(FOLDER/'source.mp4'),duration=info['duration'],status='model_aligned_listening_pending' if aligned else 'visual_checked_listening_pending',
        timing_note='Pink text authority; local word alignment for entrances, provisional short syllables and cheers; direct listening pending.' if aligned else 'Pink response layer only; static caption intervals, no measured audio onset.',
        practice_range=dict(startSeconds=None,endSeconds=None,reason='Full requested source; no listening-verified trim'),
        primary_manifest='pink-ocr-tasks.json',boundary_manifest=boundary_file,
        events=events,rejected=decisions['rejected'],reviewed_sheets=decisions['reviewed_sheets'])
    write(FOLDER/'chant-ledger.json',ledger)
    ledger=read(FOLDER/'chant-ledger.json')
    cues=[dict(start=e['start'],end=e['end'],text=e['card_text'],sourceIds=[e['id']]) for e in ledger['events']]
    track=dict(videoId=VID,status=ledger['status'],timingBasis='word-aligned' if aligned else 'caption',
        note='指定來源為농담곰탕탕후루頻道；粉紅應援依逐句詞位置校時，短音節／歡呼仍屬候選，完整聽校待完成。' if aligned else '指定來源為농담곰탕탕후루頻道；僅粉紅應援文字，時間依字幕顯示，逐句聽校待完成。',cues=cues)
    catalog=read(ROOT/'rescene/songs.json')
    existing=next((s for s in catalog if s['title']=='Busy Boy'),None)
    song=dict(number=existing['number'] if existing else max(s['number'] for s in catalog)+1,
        title='Busy Boy',artist='RESCENE',section='Busy Boy',hasChant=True,
        note=f'指定應援教學 · {len(cues)} 張提示卡 · '+('進入時間已逐句校時，聽校待完成' if aligned else '依畫面定位，聽校待完成'),
        sources=[dict(kind='應援教學（농담곰탕탕후루）',title=info['title'],url=URL,videoId=VID)],chant=track)
    if existing:catalog[catalog.index(existing)]=song
    else:catalog.append(song)
    write(ROOT/'rescene/songs.json',catalog)
    write(FOLDER/'chant-timeline.json',track)
    (FOLDER/'chant.gpu-rescan.srt').write_text('\n\n'.join(f"{i}\n{timestamp(e['start'])} --> {timestamp(e['end'])}\n{e['source_original']}" for i,e in enumerate(events,1))+'\n',encoding='utf-8')
    write(FOLDER/'chant.gpu-rescan.qa.json',dict(videoId=VID,cue_count=len(cues),primary_tasks=len(tasks),ocr_rows=len(rows),ocr_errors=0,
        contiguous_indices=True,runtime_devices=sorted({r['device'] for r in rows}),boundary_references=len(boundaries['tasks']),boundary_step=.1,
        overlaps=0,source_sha256=ledger['source_sha256'],ledger_sha256=sha(FOLDER/'chant-ledger.json'),srt_sha256=sha(FOLDER/'chant.gpu-rescan.srt'),
        source_srt_present=False,original_ocr_preserved=True,official_source=False,reviewed_sheet_count=3,
        listening_complete=False,live_youtube_sync_verified=False,visual_review='All 52 pink-layer spans and all accepted texts checked; boundary sheets checked separately',
        runtime_warning='Paddle cuDNN 9.9 vs runtime 9.5; completed without row errors'))
    (FOLDER/'chant.gpu-rescan.diff.md').write_text(f'# Busy Boy 應援擷取\n\n新增 {len(cues)} 個粉紅應援事件；排除黑白普通歌詞\n歡呼原文 (함성)；未覆寫來源 SRT，未加入猜測諧音\n',encoding='utf-8')
    (FOLDER/'UNRESOLVED.md').write_text('# 待驗證項目\n\n- 全曲逐句聽校與實際 YouTube 同步待完成\n- 字幕區間可能早於喊聲；同卡 busy busy 的兩次喊聲起點未量測，不宣稱逐字同步\n- 非官方頻道來源，未宣稱官方應援詞認證；人名保留影片韓文，不推測漢字或讀音\n- 未設定播放裁切，未加入中文諧音或整首歌詞翻譯\n',encoding='utf-8')
    (FOLDER/'PROCESSING.md').write_text(f'# Busy Boy 應援製作（2026-10-01）\n\n來源：{URL}\n發布者：농담곰탕탕후루，非官方來源\n\n- {len(cues)} 張提示，只收錄粉紅文字；第 8、11 候選僅收錄粉紅「치」「지」，排除鄰近普通歌詞\n- 1007 個初步全字幕候選保留；移動背景造成過多候選，另建 pink-ocr-tasks.json，以粉紅文字層全片 0.1 秒取樣得到 52 個候選\n- 全部 3 張候選對照表人工檢視，GPU OCR 52/52，gpu:0，0 錯誤；cuDNN 版本警告保留\n- {len(boundaries['tasks'])} 筆全幅邊界參照，起訖附近 0.1 秒取樣；解碼影片 150.816667 秒，fps=10 最後取樣為 150.7 秒；片尾超出取樣範圍的參照不建立。v1 保留，v2 為最終清單\n- 每句的畫面區間為提示顯示區間，並非喊聲時間；同卡兩個粉紅 busy 保留為 busy busy\n- 原片 SHA-256：`{ledger['source_sha256']}`\n- ledger、timeline、原文 SRT、QA 與 diff 均由已審核事件產生\n- 尚未全曲聽校與實際 YouTube 播放同步驗收\n\n重建：`python scripts/build_rescene_busy_boy.py --prepare`，`python scripts/rescene_chant_boundaries.py --id {VID} --revision=-busy-boy-v2`，`python scripts/build_rescene_busy_boy.py`\n',encoding='utf-8')
    if aligned:
        timing=read(FOLDER/'entry-timing-reviewed.v3.json')
        qa=read(FOLDER/'chant.gpu-rescan.qa.json')
        qa.update(timing_basis='word-aligned',timing_review='entry-timing-reviewed.v3.json',
                  original_event_count=36,output_event_count=len(cues),boundary_review_sheets=4,
                  original_caption_srt_sha256=sha(FOLDER/'chant.caption-v2.srt'),
                  original_caption_ledger_sha256=sha(FOLDER/'chant-ledger.caption-v2.json'),
                  visual_review='48 revised displays checked in four boundary sheets; pixels confirm content, not audible onsets',
                  timing_limitations=timing['cautions'])
        write(FOLDER/'chant.gpu-rescan.qa.json',qa)
        (FOLDER/'UNRESOLVED.md').write_text('# 校時驗證限制\n\n- 使用兩組 Whisper 全曲 ASR／逐句 forced alignment、英韓 CTC 與重複段落波形比對；不等於直接人工聽校\n- 短音節 치／지、歡呼及模型分歧事件保留候選標記，詳見 entry-timing-reviewed.v3.json\n- ASR 的重複幻覺、零長度詞及 CTC 錯誤詞匹配已排除，不改寫原應援文字\n- 全曲逐句聽校與全曲 YouTube 同步待完成；保留完整來源，非官方認證\n',encoding='utf-8')
        (FOLDER/'chant.gpu-rescan.diff.md').write_text('# Busy Boy 進入時間 v3\n\n原 36 張 caption 卡修訂為 48 張：12 個 busy busy 分成第二／第四個 busy 的獨立提示\n19 個其他事件調整進入時間，5 個事件保留；沒有全曲固定平移\n保留 chant.caption-v2.srt、chant-ledger.caption-v2.json 與全部原始辨識證據\n新時間為模型輔助校時，直接聽校待完成\n',encoding='utf-8')
        (FOLDER/'PROCESSING.md').write_text(f'# Busy Boy 進入時間修正 v3（2026-10-01）\n\n來源：{URL}\n發布者：농담곰탕탕후루，非官方\n\n- 問題：整句字幕先顯示，但粉紅應援在後半句；大字區於等待期間預覽下一句\n- 36 個原事件全部有修訂決策；新增輸出 48 張，12 個 busy busy 拆成第二、第四次回應；19 個事件改時，5 個保留\n- behind 16.7 → 19.0、dream 29.0 → 30.1、Busy boy 56.5 → 58.1 秒；不是整首固定平移\n- Whisper large-v3／medium 全曲無 VAD ASR及 32 個局部 forced-alignment 視窗；英文 CTC 24 個、韓文 CTC 17 個局部視窗\n- 重複副歌以局部波形相關性對照，保留分數；ASR 幻覺及不合上下文的 CTC 匹配不採用\n- 477 筆新全幅邊界參照，4 張對照表全部檢視；用來確認原應援文字及畫面位置，不代表人工聽校\n- 原片 SHA-256：`{ledger['source_sha256']}`；原 caption ledger／SRT 以 caption-v2 名稱保留\n- entry-timing-reviewed.v3.json 為校時決策來源；chant-refined.v3.json、ledger、timeline、SRT 及網站卡片由同一決策生成\n- 恢復原本大字預告：未進場時顯示下一句，進入前 3 秒倒數，到達校正時間才切換正式應援狀態\n- 直接人工聽校及全曲 YouTube 同步待完成，短音節與歡呼明確列為候選\n\n重建：`python scripts/build_rescene_busy_boy.py --prepare`，`python scripts/rescene_chant_boundaries.py --id {VID} --revision=-busy-boy-v3 --events chant-refined.v3.json`，`python scripts/build_rescene_busy_boy.py`\n',encoding='utf-8')
    print('Busy Boy:',len(cues),'cards')
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--prepare',action='store_true');args=parser.parse_args()
    prepare() if args.prepare else finalize()

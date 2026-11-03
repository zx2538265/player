"""Rebuild the two official blue-to-black guides from visually reviewed captions."""
import argparse
import json
import subprocess
import cv2
import numpy as np
from finalize_rescene_chants import ROOT, read, write, sha, timestamp

GUIDES = {
    'cLtl2aFq_6M': dict(title='With', slug='with', review={
        1:'（歡呼）', 2:'리! 센! 느!', 4:'oh oh oh nah', 5:'（歡呼）',
        6:'oh oh yeah', 8:'맘을 던져', 15:'리센느', 19:"It's all", 20:'You',
        22:'네게 난', 26:'우릴 부를 때', 27:'감정', 28:'함성', 30:'맘을 던져',
        36:'리센느', 40:"It's all", 41:'You', 43:'네게 난',
        48:"Nothin’ b-b-breaks", 49:'（歡呼）',
        54:'정원이 진경은 미나미\n이예빈 김가영', 55:'리마인 함! 께! 해! 줘!',
        57:'네게 난', 65:'네게 난', 72:'（歡呼）'}, merge={49:50}),
    'cL_B5W4gBRU': dict(title='백화요란 (Inside Out)', slug='inside-out', review={
        4:'백! 화! 요! 란! Inside out!', 6:'너!', 11:'나!', 16:'꽃처럼',
        17:'눈부셔', 20:'Do you?', 23:'Flower, flower', 25:'higher, higher',
        28:'oh my', 30:'Inside out', 32:'더 더', 37:'더 더', 40:'Yeah yeah',
        43:'Oh la la', 45:'Fall in love', 51:'보여줘', 54:'순간',
        55:'my scent', 58:'Do you?', 61:'Flower, flower', 63:'higher, higher',
        65:'oh my', 67:'Inside out', 72:'이', 73:'me', 74:'right now',
        78:'Flower, flower', 80:'higher, higher', 82:'oh my', 84:'Inside out',
        86:'더 더', 92:'더 더', 96:'（歡呼）'}, merge={43:44,45:46}),
}


def prepare(vid):
    guide = GUIDES[vid]
    folder = ROOT/'video'/vid
    tasks = read(folder/'chant-ocr-tasks-v2.json')['tasks']
    # Same 10 fps grid as the inventory, with full caption area for masks.
    proc = subprocess.Popen(['ffmpeg','-v','error','-i',str(folder/'source.mp4'),
        '-vf','fps=10,crop=1280:160:0:20','-f','rawvideo','-pix_fmt','bgr24','-'], stdout=subprocess.PIPE)
    frames = []
    while True:
        raw = proc.stdout.read(1280*160*3)
        if not raw: break
        assert len(raw) == 1280*160*3
        frames.append(np.frombuffer(raw,np.uint8).reshape(160,1280,3).copy())
    assert proc.wait() == 0
    events = []
    for index, text in guide['review'].items():
        task = tasks[index]
        end = tasks[guide['merge'].get(index,index)]['end']
        a,b = round(task['start']*10),round(end*10)
        segment = frames[a:b]
        masks = []
        for frame in segment:
            hsv = cv2.cvtColor(frame,cv2.COLOR_BGR2HSV)
            masks.append((hsv[:,:,0]>75)&(hsv[:,:,0]<110)&(hsv[:,:,1]>25)&(hsv[:,:,2]>90))
        mask = np.any(masks,axis=0) if vid=='cL_B5W4gBRU' else np.mean(masks,axis=0)>.12
        # Exclude the wall, black outline and thin compression/color fringes.
        mask = cv2.erode(mask.astype('uint8'),np.ones((3,3),np.uint8)) > 0
        assert mask.sum()>30, (vid,index)
        ratios = [float((cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)[mask]<75).mean()) for f in segment]
        onset = next((i for i,r in enumerate(ratios) if r>.015),None)
        start = round(task['start']+(onset or 0)/10,1)
        # Consecutive 0.1s source frames resolve mask drift on these entrances.
        if vid=='cLtl2aFq_6M':
            start = {8:60.2,26:107.2,48:170.5,54:184.8}.get(index,start)
        assert start < end
        events.append(dict(id=f'{vid}-{index}',task_index=index,original=text,
            source_original='함성' if text=='（歡呼）' else text,
            card_text=text,start=start,end=end,caption_start=task['start'],caption_end=end,
            timing_basis='visual_karaoke_fill' if onset is not None else 'caption',fill_mask_pixels=int(mask.sum()),
            evidence=[tasks[j]['image'] for j in range(index,guide['merge'].get(index,index)+1)],
            visual_review='accepted',listening_review='pending',
            note='노래 부르듯이 is an instruction to sing this line, excluded from response text' if vid=='cLtl2aFq_6M' and index==26 else 'Blue response only; black fill entrance, caption end'))
    accepted = set(guide['review']) | set(guide['merge'].values())
    write(folder/'chant-refined.json',dict(videoId=vid,events=events,
        rejected=[dict(task_index=t['task_index'],reason='Ordinary lyric, continuation, blank or post-song conversation') for t in tasks if t['task_index'] not in accepted],
        reviewed_sheets=[f'chant-review-v2-{i:02d}.jpg' for i in range((len(tasks)+23)//24)]))
    print(vid,len(events),'reviewed events',flush=True)


def finalize(vid):
    folder = ROOT/'video'/vid
    guide = GUIDES[vid]
    info = read(folder/'source.info.json')
    assert info['id']==vid and info['channel']=='RESCENE'
    reviewed = read(folder/'chant-refined.json')
    boundary_file='chant-boundary-tasks-blue-v3.json' if vid=='cLtl2aFq_6M' else 'chant-boundary-tasks-blue-v2.json'
    boundaries = read(folder/boundary_file)
    tasks = read(folder/'chant-ocr-tasks-v2.json')['tasks']
    rows = [json.loads(l) for l in (folder/'chant-ocr-results-v2.jsonl').read_text(encoding='utf-8').splitlines()]
    assert [r['task_index'] for r in rows]==list(range(len(tasks)))
    assert all(r['device']=='gpu:0' and not r.get('error') for r in rows)
    assert boundaries['full_frame'] and boundaries['step']==.1
    previous = 0
    for event in reviewed['events']:
        assert previous<=event['start']<event['end']<=info['duration']
        event['boundary_evidence']=[t for t in boundaries['tasks'] if t['target_id']==event['id']]
        assert len(event['boundary_evidence'])==10
        assert all((folder/t['image']).is_file() for t in event['boundary_evidence'])
        previous=event['end']
    source_hash=sha(folder/'source.mp4')
    if (folder/'chant-ledger.json').exists():
        assert read(folder/'chant-ledger.json')['source_sha256']==source_hash
    ledger = dict(**reviewed,source_url=info['webpage_url'],source_title=info['title'],
        source_sha256=source_hash,official_source=True,
        primary_manifest='chant-ocr-tasks-v2.json',boundary_manifest=boundary_file,
        status='visual_checked_listening_pending',
        excluded_inventory='Unversioned inventory has odd-height YUV420 crop corruption; preserved, not used')
    write(folder/'chant-ledger.json',ledger)
    track = dict(videoId=vid,status=ledger['status'],timingBasis='visual_karaoke_fill',
        note='官方應援教學；僅收錄藍色應援文字，起點依變黑畫面，無變黑時依字幕出現；句尾依字幕切換，約 0.1 秒取樣；逐句聽校及正常速度同步驗收待完成。',
        cues=[dict(start=e['start'],end=e['end'],text=e['card_text'],sourceIds=[e['id']]) for e in ledger['events']])
    catalog = read(ROOT/'rescene/songs.json')
    existing = next((s for s in catalog if s['slug']==guide['slug']),None)
    song = dict(number=existing['number'] if existing else max(s['number'] for s in catalog)+1,
        title=guide['title'],slug=guide['slug'],artist='RESCENE',section=guide['title'],hasChant=True,
        note=f"官方應援教學 · {len(track['cues'])} 張提示卡 · 依畫面校時，聽校待完成",
        sources=[dict(kind='官方應援教學',title=info['title'],url=info['webpage_url'],videoId=vid)],chant=track)
    if existing: catalog[catalog.index(existing)]=song
    else: catalog.append(song)
    write(ROOT/'rescene/songs.json',catalog)
    track=next(s for s in catalog if s['slug']==guide['slug'])['chant']
    write(folder/'chant-timeline.json',track)
    srt=folder/'chant.gpu-rescan.srt'
    srt.write_text('\n\n'.join(f"{i}\n{timestamp(e['start'])} --> {timestamp(e['end'])}\n{e['source_original']}" for i,e in enumerate(ledger['events'],1))+'\n',encoding='utf-8')
    write(folder/'chant.gpu-rescan.qa.json',dict(videoId=vid,cue_count=len(track['cues']),
        primary_tasks=len(tasks),ocr_rows=len(rows),ocr_errors=0,runtime_devices=['gpu:0'],
        runtime_warning='Paddle cuDNN 9.9 vs installed 9.5; OCR completed without row errors',
        boundary_references=len(boundaries['tasks']),boundary_step=.1,overlaps=0,blank_blocks=0,
        continuous_numbering=True,source_sha256=ledger['source_sha256'],source_preserved=True,
        srt_sha256=sha(srt),manual_visual_review='All accepted responses and 0.1s entrance/end sheets',
        direct_listening='pending',normal_speed_playback='pending'))
    (folder/'chant.gpu-rescan.diff.md').write_text(f"# {guide['title']} 應援擷取\n\n新增 {len(track['cues'])} 張應援卡；未修改來源影片\n\n僅藍色應援文字，白色歌詞與片尾聊天排除；來源含韓文、英文及歡呼標記\n\n起點依畫面變黑，句尾依字幕切換；0.1 秒完整畫面邊界證據另存\n\n原未標版本裁切高度造成錯位，未採用；有效辨識使用 v2\n\n聽校、正常速度播放及實際 YouTube 同步驗收待完成\n",encoding='utf-8')
    print(vid,len(track['cues']),'published to local catalog',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--prepare',action='store_true');args=parser.parse_args()
    for vid in GUIDES:
        (prepare if args.prepare else finalize)(vid)

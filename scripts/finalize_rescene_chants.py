"""Build source-bound RESCENE cards and local evidence reports from reviewed events."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def timestamp(seconds):
    ms = round(seconds * 1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'


def display(text):
    # These are continuous phrases; line breaks only improve reading, not timing.
    replacements = {
        '원이 리브 미나미 메이 제나 리센느': '원이 리브 미나미\n메이 제나 리센느',
        '원이 리브 미나미 메이 제나': '원이 리브 미나미\n메이 제나',
        '원이 리브 미나미 메이 제나 Glow Up!': '원이 리브 미나미\n메이 제나 Glow Up!',
        'You gonna shout it out Uh Uh': 'You gonna shout it out\nUh Uh',
        'Bararam bararam bararam (hey!)': 'Bararam bararam\nbararam (hey!)',
        'Uh Uh Uh Uh Uh Uh Uh Uh Uh Uh': 'Uh Uh Uh Uh Uh\nUh Uh Uh Uh Uh',
    }
    return replacements.get(text, text)


def reviewed_events(folder):
    events = read(folder / 'chant-refined.json')['events']
    for event in events:
        event.setdefault('measured_fill_start', event['start'])
        event.setdefault('measured_fill_end', event['end'])
        event['start'] = event['measured_fill_start']
        event['end'] = event['measured_fill_end']
        if event['id'] == 'RX592yMx7P0-143':
            event['start'] = 39.3
            event['timing_note'] = 'First word already dark at caption entrance'
        if folder.name == 's1S-lnU-yMI' and not event['id'].endswith('-repeat'):
            overrides = {1: 28.0, 10: 49.0, 20: 73.5, 53: 139.2, 35: 104.3}
            if event['task_index'] in overrides:
                event['start'] = overrides[event['task_index']]
                event['timing_note'] = 'Manual sequential-frame correction; uh-timing-check sheets'
            if event['task_index'] in (20, 53):
                event['timing_basis'] = 'caption'
                # The next caption repeats the phrase without Uh Uh: do not
                # silently keep the old extra words over that next caption.
                event['end'] = 75.7 if event['task_index'] == 20 else 141.4
        event.setdefault('caption_start', event['start'])
        event.setdefault('caption_end', event['end'])
    if folder.name == 's1S-lnU-yMI':
        for index, start, end in [(20, 75.7, 77.3), (53, 141.4, 142.7)]:
            original = next(e for e in events if e['task_index'] == index and not e['id'].endswith('-repeat'))
            if not any(e['id'] == original['id'] + '-repeat' for e in events):
                events.append({**original, 'id': original['id'] + '-repeat',
                               'original': 'You gonna shout it out', 'start': start, 'end': end,
                               'measured_fill_start': start, 'measured_fill_end': end,
                               'caption_start': start, 'caption_end': end,
                               'timing_basis': 'caption', 'timing_note': 'Separate repeated black caption without Uh Uh; sequential frame review'})
        events.sort(key=lambda e: e['start'])
    for i, event in enumerate(events):
        limit = min(event['caption_end'], events[i+1]['start'] if i+1 < len(events) else event['caption_end'])
        event['end'] = round(min(limit, max(event['end'], event['start'] + .6)), 1)
        if event['original'] == '（歡呼）':
            event['end'] = limit
        event['card_text'] = display(event['original'])
        event['source_original'] = ('환호' if folder.name == '-55bUrG1qjg' else '함성') if event['original'] == '（歡呼）' else event['original']
    return events


def prepare():
    """Freeze reviewed times before generating the matching boundary manifest."""
    for song in read(ROOT / 'rescene/songs.json'):
        folder = ROOT / 'video' / song['sources'][0]['videoId']
        write(folder / 'chant-refined.json', {'videoId': folder.name, 'events': reviewed_events(folder)})


def finalize():
    catalog = read(ROOT / 'rescene/songs.json')
    for song in catalog:
        video_id = song['sources'][0]['videoId']
        folder = ROOT / 'video' / video_id
        events = read(folder / 'chant-refined.json')['events']
        info = read(folder / 'source.info.json')
        assert info['id'] == video_id
        tasks = read(folder / 'chant-ocr-tasks.json')['tasks']
        rows = [json.loads(line) for line in (folder / 'chant-ocr-results.jsonl').read_text(encoding='utf-8').splitlines()]
        assert [r['task_index'] for r in rows] == list(range(len(tasks)))
        assert not any('error' in r for r in rows)
        assert all(r['device'] == 'gpu:0' for r in rows)
        boundaries = read(folder / 'chant-boundary-tasks-final2.json')
        assert boundaries['videoId'] == video_id
        boundary_ids = {t['target_id'] for t in boundaries['tasks']}
        assert boundary_ids == {e['id'] for e in events}
        previous = 0
        for event in events:
            assert previous <= event['start'] < event['end'] <= info['duration'], event
            assert ' / ' not in event['original'] and not event['needs_split']
            assert all((folder / image).is_file() for image in event['evidence'])
            event['review_status'] = 'visual_checked_listening_pending'
            event['audio_start'] = None
            event['audio_end'] = None
            event['boundary_evidence'] = [t for t in boundaries['tasks'] if t['target_id'] == event['id']]
            assert all((folder / t['image']).is_file() for t in event['boundary_evidence'])
            for edge in ('start', 'end'):
                actual = sorted(t['time'] for t in event['boundary_evidence'] if t['edge'] == edge)
                assert actual == [round(event[edge] + d, 1) for d in (-.2, -.1, 0, .1, .2)], event['id']
            previous = event['end']
        source_hash = sha(folder / 'source.mp4')
        ledger = dict(videoId=video_id, source_url=song['sources'][0]['url'], source_sha256=source_hash,
                      duration=info['duration'], status='visual_checked_listening_pending',
                      timing_note='Absolute source seconds; visual fill or caption onset. Card hold is at least 0.6s where caption and next cue permit. Cheers follow caption end. Not measured audio duration.',
                      practice_range=dict(startSeconds=None, endSeconds=None, reason='Music boundaries not listening-verified; preserve complete official guide'),
                      primary_manifest='chant-ocr-tasks.json', boundary_manifest='chant-boundary-tasks-final2.json', events=events)
        write(folder / 'chant-ledger.json', ledger)
        # Re-read the ledger: generated outputs must use the saved decisions.
        ledger = read(folder / 'chant-ledger.json')
        cues = [dict(start=e['start'], end=e['end'], text=e['card_text'], sourceIds=[e['id']]) for e in ledger['events']]
        song['hasChant'] = True
        song['note'] = f"官方應援教學 · {len(cues)} 張提示卡 · 依畫面定位，聽校待完成"
        song['chant'] = dict(videoId=video_id, status=ledger['status'], timingBasis='caption',
                             note='只收錄官方畫面標記的應援文字；依變色或字幕出現定位，尚未逐句聽校。', cues=cues)
        write(folder / 'chant-timeline.json', song['chant'])
        srt = '\n\n'.join(f"{i}\n{timestamp(e['start'])} --> {timestamp(e['end'])}\n{e['source_original']}" for i, e in enumerate(ledger['events'], 1)) + '\n'
        (folder / 'chant.gpu-rescan.srt').write_text(srt, encoding='utf-8')
        qa = dict(videoId=video_id, cue_count=len(cues), primary_tasks=len(tasks), ocr_rows=len(rows),
                  ocr_errors=0, contiguous_indices=True, runtime_devices=sorted({r['device'] for r in rows}),
                  boundary_references=len(boundaries['tasks']), boundary_step=.1, overlaps=0,
                  source_sha256=source_hash, ledger_sha256=sha(folder/'chant-ledger.json'),
                  srt_sha256=sha(folder/'chant.gpu-rescan.srt'),
                  source_srt_present=False, original_ocr_preserved=True,
                  visual_review='Every accepted text checked in source review sheets; boundary contact sheets and selected sequential frames inspected',
                  listening_complete=False, live_youtube_sync_verified=False)
        write(folder / 'chant.gpu-rescan.qa.json', qa)
        (folder / 'chant.gpu-rescan.diff.md').write_text(f"# {song['title']} 應援擷取\n\n新增 {len(cues)} 個畫面應援事件；沒有覆寫既有來源 SRT\n\n排除白色一般歌詞與片尾談話；多段應援依畫面變色分開，重複事件保留各自時間\n\n文字以官方畫面為準，未完成聽校；原文、卡片文字、畫面區間與時間修訂記錄見 chant-ledger.json\n", encoding='utf-8')
        (folder / 'UNRESOLVED.md').write_text('# 待驗證項目\n\n- 全曲逐句聽校及實際 YouTube 播放同步尚未驗收\n- 0.1 秒為取樣間距，不代表喊聲時間已達 0.1 秒準確度\n- 音樂段落起訖未經聽校，因此保留完整教學影片，不設定猜測的播放裁切\n- 僅擷取官方可見應援標記；未製作中文諧音或整首歌詞翻譯\n', encoding='utf-8')
        (folder / 'PROCESSING.md').write_text(f"# {song['title']} 官方應援製作\n\n來源：{song['sources'][0]['url']}\n\n## 產物\n\n- chant-ledger.json：{len(cues)} 個逐一看圖確認的應援事件、原文、卡片、畫面證據及時間修訂\n- chant-timeline.json：從 ledger 產生的播放器資料\n- chant.gpu-rescan.srt：應援原文，非整首歌詞或中文字幕\n- chant.gpu-rescan.qa.json、chant.gpu-rescan.diff.md：結構檢查與新增紀錄\n\n## 驗證範圍\n\n- 原片 source.mp4 SHA-256：`{source_hash}`\n- 全片以 0.1 秒畫面取樣建立候選；GPU OCR {len(rows)} 筆，執行裝置 gpu:0，JSONL 只追加\n- 已逐一檢視接受文字的 review sheets，另檢查 0.1 秒邊界圖與必要的連續畫面\n- 官方淺色轉深色／黑色定位起點；沒有可辨識變色的事件使用字幕出現時間\n- 最短顯示 0.6 秒，受字幕消失及下一卡限制；歡呼到字幕結束，這是閱讀區間，不是量測喊聲尾音\n- 保留原始與 v2 邊界清單；最終使用 chant-boundary-tasks-final2.json，共 {len(boundaries['tasks'])} 筆邊界參照\n- 結構檢查：來源綁定、有效起訖、排序、無重疊、所有證據檔案存在\n- 尚未全曲聽校或完成實際 YouTube 同步驗收，詳見 UNRESOLVED.md\n\n## 重建\n\n在專案根目錄執行 `python scripts/finalize_rescene_chants.py`，由保存的 reviewed events 重建 ledger 與網站資料\n修改時間後先用 `--prepare` 固定顯示區間，再建立不同版本的邊界清單；不得覆寫原始 OCR 或邊界 manifest\n", encoding='utf-8')
        print(song['title'], len(cues), flush=True)
    write(ROOT / 'rescene/songs.json', catalog)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--prepare', action='store_true')
    args = parser.parse_args()
    prepare() if args.prepare else finalize()

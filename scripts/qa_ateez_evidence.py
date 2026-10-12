"""Reproducible evidence inventory; explicit limits on visual/audio acceptance."""
import hashlib,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
for vid,sheets in [('bnGARWNOuRw',6),('HlINJYsRw3U',7)]:
    root=ROOT/'video'/vid
    ledger=json.loads((root/'chant-ledger.json').read_text(encoding='utf-8'))
    primary=[json.loads(l) for l in (root/'ocr-results.jsonl').read_text(encoding='utf-8').splitlines()]
    tasks=json.loads((root/'ocr-tasks.json').read_text())['tasks']
    boundary=json.loads((root/'boundary-tasks.json').read_text())['tasks']
    assert [r['task_index'] for r in primary]==list(range(len(tasks)))
    assert not any('error' in r for r in primary)
    assert all((root/t['image']).is_file() for t in boundary)
    ko=root/'source.ko.gpu-rescan.srt';zh=root/'phonetic.zh.srt'
    result=subprocess.run([sys.executable,str(ROOT/'.agents/skills/vlog-subtitle-workflow/scripts/qa_srt.py'),str(ko),str(zh)],capture_output=True)
    assert result.returncode==0
    audit=subprocess.run([sys.executable,str(ROOT/'.agents/skills/korean-hardsub-gpu-rescan/scripts/audit_rescan.py'),'--output-srt',str(ko),'--ocr-tasks',str(root/'ocr-tasks.json'),'--ocr-results',str(root/'ocr-results.jsonl')],capture_output=True)
    assert audit.returncode==0
    qa={'videoId':vid,'source_sha256':sha(root/'source.mp4'),'original_source_retained':True,
        'source_baseline_note':'First source hash recorded at QA; no pre-processing hash was recorded. Source.mp4 was never an output target.',
        'output_sha256':sha(ko),'phonetic_sha256':sha(zh),'source_events':len(ledger['events']),'cards':len(ledger['cards']),
        'ocr':{'rows':len(primary),'expected':len(tasks),'errors':0,'continuous_indices':True,'recognized_strings':sum(len(r['texts']) for r in primary),'device':'gpu:0',
               'warning':'Paddle compiled cuDNN 9.9; runtime 9.5 warning retained; run completed with zero row errors',
               'schema_note':'Raw recognized text stored as texts/scores; generic audit detections field is not this schema'},
        'visual_review':{'whole_video_change_scan_step_seconds':.1,'reviewed_change_sheets':4,'reviewed_change_candidates':len(tasks),
                         'reviewed_boundary_sheets':sheets,'reviewed_boundary_events':len(ledger['events']),
                         'boundary_full_frames_saved':len(boundary),'boundary_step_seconds':.1,'boundary_ocr_performed':False,
                         'scope':'All detected right-bubble changes and all selected event boundary strips reviewed. Full-frame files retained. Not original-frame-by-frame viewing or independent full-playthrough acceptance.',
                         'timing_note':'Working cue bounds use clear text / transition boundaries; faint fade-in/out may extend by about 0.1 seconds. This is not audio timing.'},
        'structural_qa':{'passed':True,'blocks':len(ledger['events']),'matching_times':True,'blank_blocks':0,'overlaps':0,'korean_residue':0,'gendered_pronouns':0,'chinese_full_stops':0},
        'listening_review':{'completed':False,'seconds_directly_listened':0,'reason':'No direct audio listening interface available to the agent. Browser playback is not listening acceptance.'},
        'runtime_checks':{'automated_control_tests':'5/5 pass; node tests/test_ateez_chant.cjs',
                          'browser':'Local source-MP4 adapter only; next/previous/repeat/countdown/loop and favorites sampled',
                          'layout':'390x844 BAD member card; 320x844 Adrenaline member and long-English cards at 1.5x font, visually checked',
                          'youtube_embed':'BAD timed out in in-app browser; Adrenaline YouTube playback not verified'},
        'unresolved':'UNRESOLVED.md','release_ready':False}
    (root/'source.ko.gpu-rescan.qa.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (root/'srt-audit.json').write_bytes(audit.stdout)
    (root/'PROCESSING.md').write_text(f'''# {vid} 本機應援校對版

來源為使用者指定 MBCkpop 影片，保留 source.mp4 / source.info.json。右側 ATINY 氣泡是唯一文字依據；左側 ATEEZ 歌詞及片頭片尾標語排除。

- 全片 0.1 秒 ROI 變化掃描，{len(tasks)} 筆 GPU OCR，4 張變化圖逐項核對
- {len(ledger['events'])} 個原文事件；{len(ledger['cards'])} 張大字卡
- 每個事件起迄前後 0.2 秒、每 0.1 秒留存全畫面，共 {len(boundary)} 張；已核對 {sheets} 張邊界彙整圖
- 畫面文字與邊界核對不是實際喊聲校時；所有事件 listening_review 均為 pending
- 韓國人名空耳不是官方漢字姓名；專案詞表已閱讀，未把未聽校草稿寫回詞表
- 原文：source.ko.gpu-rescan.srt；空耳：phonetic.zh.srt；逐项對照：phonetic-comparison.md
- 帳本：chant-ledger.json；展示時間軸：timeline.json；未確認：UNRESOLVED.md
- 來源 SHA-256：{qa['source_sha256']}

重建：`python scripts/build_ateez_chants.py`；QA：`python scripts/qa_ateez_evidence.py`

只有本機修改，未提交、未推送。完整聽校與 YouTube 實播驗收仍未完成。
''',encoding='utf-8')
    print(vid,'QA PASS; listening pending')

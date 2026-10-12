"""Append-only GPU OCR and 0.1s visual inventory of the ATINY bubble."""
import argparse, json, os
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
IDS = ['bnGARWNOuRw', 'HlINJYsRw3U']

def prepare(vid):
    root = ROOT / 'video' / vid
    (root/'frames').mkdir(exist_ok=True)
    cap = cv2.VideoCapture(str(root/'roi.mp4'))
    spans=[]; prev=None; idx=0
    while True:
        ok, frame=cap.read()
        if not ok: break
        gray=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY)
        mask=gray < 145
        # Static bubble: text changes dominate thresholded pixel differences.
        changed=prev is None or np.count_nonzero(mask != prev) > 180
        if changed:
            if spans: spans[-1]['end']=round(idx/10,1)
            spans.append({'start':round(idx/10,1),'end':None,'pixels':int(mask.sum())})
            prev=mask
            cv2.imwrite(str(root/'frames'/f'{len(spans)-1:04d}.png'),frame)
        idx+=1
    cap.release()
    spans[-1]['end']=round(idx/10,1)
    tasks=[{'task_index':i,'time':s['start'],'crop':[975,135,1525,230], 'image':f'frames/{i:04d}.png',**s} for i,s in enumerate(spans)]
    path=root/'ocr-tasks.json'
    if path.exists(): assert json.loads(path.read_text())['tasks']==tasks
    else: path.write_text(json.dumps({'step':0.1,'tasks':tasks},indent=2),encoding='utf-8')
    for base in range(0,len(tasks),32):
        sheet=Image.new('RGB',(1160,16*120),'#ddd'); draw=ImageDraw.Draw(sheet)
        for j,t in enumerate(tasks[base:base+32]):
            x=(j%2)*580;y=(j//2)*120
            draw.text((x+5,y+2),f"{t['task_index']:03d}  {t['start']:.1f} - {t['end']:.1f}",fill='black')
            sheet.paste(Image.open(root/t['image']),(x,y+22))
        sheet.save(root/f'review-{base//32:02d}.jpg')
    print(vid,len(tasks),'spans',idx/10,'seconds',flush=True)

def ocr():
    os.environ['PADDLE_PDX_MODEL_SOURCE']='bos'
    # PaddleX imports ModelScope even for cached Paddle models; its optional
    # Torch dependency has an incompatible cuDNN DLL on this machine.
    # Keep this compatibility shim process-local and prohibit its downloads.
    import sys, types
    shim=types.ModuleType('modelscope')
    def no_download(*args,**kwargs): raise RuntimeError('Use cached Paddle models only')
    shim.snapshot_download=no_download
    sys.modules['modelscope']=shim
    import paddle
    from paddleocr import PaddleOCR
    paddle.set_device('gpu:0')
    engine=PaddleOCR(lang='korean',device='gpu:0',use_doc_orientation_classify=False,use_doc_unwarping=False,use_textline_orientation=False,text_recognition_batch_size=32,text_rec_score_thresh=0.0)
    for vid in IDS:
        root=ROOT/'video'/vid
        tasks=json.loads((root/'ocr-tasks.json').read_text())['tasks']
        output=root/'ocr-results.jsonl'
        done=[json.loads(l) for l in output.read_text(encoding='utf-8').splitlines()] if output.exists() else []
        assert [r['task_index'] for r in done]==list(range(len(done)))
        assert not any('error' in r for r in done)
        with output.open('a',encoding='utf-8') as out:
            for task in tasks[len(done):]:
                predictions=list(engine.predict(str(root/task['image'])))
                payload=predictions[0].json
                if isinstance(payload,str): payload=json.loads(payload)
                payload=payload.get('res',payload)
                out.write(json.dumps({**task,'device':paddle.get_device(),'texts':payload.get('rec_texts',[]),'scores':payload.get('rec_scores',[])},ensure_ascii=False)+'\n');out.flush()
                if task['task_index']%20==0: print(vid,task['task_index'],len(tasks),'device='+paddle.get_device(),flush=True)

def boundaries(vid):
    root=ROOT/'video'/vid
    ledger=json.loads((root/'chant-ledger.json').read_text(encoding='utf-8'))
    output=root/'boundaries';output.mkdir(exist_ok=True)
    cap=cv2.VideoCapture(str(root/'visual-proxy.mp4'))
    tasks=[]
    for event in ledger['events']:
        strip=Image.new('RGB',(1500,240),'#ddd');draw=ImageDraw.Draw(strip)
        for side,edge in enumerate(['start','end']):
            for j,delta in enumerate([-.2,-.1,0,.1,.2]):
                time=round(event[edge]+delta,1)
                cap.set(cv2.CAP_PROP_POS_MSEC,time*1000);ok,frame=cap.read();assert ok
                path=output/f"{event['id']}-{edge}-{j}.jpg"
                cv2.imwrite(str(path),frame)
                crop=frame[67:116,487:763]
                image=Image.fromarray(cv2.cvtColor(crop,cv2.COLOR_BGR2RGB)).resize((300,70))
                x=j*300;y=side*120
                draw.text((x+3,y+3),f'{edge} {time:.1f}',fill='black');strip.paste(image,(x,y+25))
                tasks.append(dict(task_index=len(tasks),target_id=event['id'],time=time,edge=edge,image=str(path.relative_to(root))))
        strip.save(output/f"{event['id']}-review.jpg")
    cap.release()
    (root/'boundary-tasks.json').write_text(json.dumps({'step':.1,'full_frame':True,'tasks':tasks},indent=2),encoding='utf-8')
    print(vid,'boundary frames',len(tasks),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('mode',choices=['prepare','ocr','boundaries']);a=p.parse_args()
    if a.mode=='prepare':
        for vid in IDS: prepare(vid)
    elif a.mode=='boundaries':
        for vid in IDS: boundaries(vid)
    else: ocr()

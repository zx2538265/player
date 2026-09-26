"""Source-frame inventories and append-only GPU OCR for RESCENE chant review."""
import argparse, json, os, subprocess, sys, types
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SONGS = json.loads((ROOT/'rescene/songs.json').read_text(encoding='utf-8'))

def dump(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def prepare(song):
    vid=song['sources'][0]['videoId']; root=ROOT/'video'/vid
    if (root/'chant-ocr-tasks.json').exists(): return
    bottom=vid=='s1S-lnU-yMI'
    crop=(120,510,1040,160) if bottom else (60,40,1080,90)
    x,y,w,h=crop
    frames=root/'chant-frames';frames.mkdir(exist_ok=True)
    cmd=['ffmpeg','-v','error','-i',str(root/'source.mp4'),'-vf',f'fps=10,crop={w}:{h}:{x}:{y}', '-f','rawvideo','-pix_fmt','bgr24','-']
    proc=subprocess.Popen(cmd,stdout=subprocess.PIPE)
    spans=[]; previous=None; best=None; bestscore=0; index=0
    def finish(end):
        if not spans:return
        spans[-1]['end']=round(end,1)
        cv2.imwrite(str(root/spans[-1]['image']),best)
    while True:
        raw=proc.stdout.read(w*h*3)
        if len(raw)!=w*h*3:break
        frame=np.frombuffer(raw,np.uint8).reshape(h,w,3)
        gray=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY)
        edges=cv2.Canny(gray,90,180)
        edges=cv2.dilate(edges,np.ones((3,3),np.uint8))
        small=cv2.resize(edges,(w//4,h//2),interpolation=cv2.INTER_AREA)>80
        changed=previous is None or np.count_nonzero(small!=previous)>max(100,np.count_nonzero(previous)*.27)
        hsv=cv2.cvtColor(frame,cv2.COLOR_BGR2HSV)
        score=np.count_nonzero((hsv[:,:,1]>65)&(hsv[:,:,2]>110))
        if changed:
            finish(index/10)
            spans.append(dict(task_index=len(spans),start=round(index/10,1),end=None,time=round(index/10,1),image=f'chant-frames/{len(spans):04d}.png',crop=list(crop)))
            previous=small;best=frame.copy();bestscore=score
        elif score>bestscore:
            best=frame.copy();bestscore=score;spans[-1]['time']=round(index/10,1)
        index+=1
    finish(index/10);proc.wait();assert proc.returncode==0
    dump(root/'chant-ocr-tasks.json',dict(step=.1,videoId=vid,tasks=spans))
    for base in range(0,len(spans),24):
        height=110 if not bottom else 170
        sheet=Image.new('RGB',(1080,24*height),'#ddd');draw=ImageDraw.Draw(sheet)
        for i,t in enumerate(spans[base:base+24]):
            draw.text((4,i*height+2),f"{t['task_index']:03d} {t['start']:.1f}-{t['end']:.1f} sample={t['time']:.1f}",fill='black')
            sheet.paste(Image.open(root/t['image']),(0,i*height+20))
        sheet.save(root/f'chant-review-{base//24:02d}.jpg')
    print(vid,len(spans),'spans',flush=True)

def ocr():
    os.environ['PADDLE_PDX_MODEL_SOURCE']='bos'
    shim=types.ModuleType('modelscope')
    def no_download(*args,**kwargs): raise RuntimeError('Use cached Paddle models only')
    shim.snapshot_download=no_download;sys.modules['modelscope']=shim
    import paddle
    from paddleocr import PaddleOCR
    paddle.set_device('gpu:0')
    engine=PaddleOCR(lang='korean',device='gpu:0',use_doc_orientation_classify=False,use_doc_unwarping=False,use_textline_orientation=False,text_recognition_batch_size=32,text_rec_score_thresh=0.0)
    for song in SONGS:
        root=ROOT/'video'/song['sources'][0]['videoId']
        tasks=json.loads((root/'chant-ocr-tasks.json').read_text())['tasks']
        path=root/'chant-ocr-results.jsonl'
        done=[json.loads(l) for l in path.read_text(encoding='utf-8').splitlines()] if path.exists() else []
        assert [r['task_index'] for r in done]==list(range(len(done))) and len(done)<=len(tasks)
        assert not any('error' in r for r in done)
        with path.open('a',encoding='utf-8') as out:
            for task in tasks[len(done):]:
                payload=list(engine.predict(str(root/task['image'])))[0].json
                if isinstance(payload,str):payload=json.loads(payload)
                payload=payload.get('res',payload)
                out.write(json.dumps({**task,'device':paddle.get_device(),'texts':payload.get('rec_texts',[]),'scores':payload.get('rec_scores',[]),'boxes':np.asarray(payload.get('rec_polys',[])).tolist()},ensure_ascii=False)+'\n');out.flush()
                if task['task_index']%50==0: print(root.name,task['task_index'],len(tasks),'device='+paddle.get_device(),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('mode',choices=['prepare','ocr']);p.add_argument('--id');args=p.parse_args()
    if args.id:SONGS=[s for s in SONGS if s['sources'][0]['videoId']==args.id]
    if args.mode=='prepare':
        for song in SONGS:prepare(song)
    else:ocr()

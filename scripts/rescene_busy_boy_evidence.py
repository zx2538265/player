"""Inventory only the pink response layer; retain exploratory full-caption scan."""
import cv2, json, subprocess
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]/'video/hc1HS71j6oY'
def main():
    dest=ROOT/'pink-frames'; dest.mkdir(exist_ok=True)
    proc=subprocess.Popen(['ffmpeg','-v','error','-i',str(ROOT/'source.mp4'),'-vf','fps=10','-f','rawvideo','-pix_fmt','bgr24','-'],stdout=subprocess.PIPE)
    spans=[]; previous=None; best=None; score=0; index=0
    def finish():
        if spans:
            spans[-1]['end']=round(index/10,1)
            cv2.imwrite(str(ROOT/spans[-1]['image']),best)
    while True:
        raw=proc.stdout.read(1280*720*3)
        if len(raw)!=1280*720*3:break
        full=np.frombuffer(raw,np.uint8).reshape(720,1280,3)
        frame=full[632:704,60:1220].copy()
        hsv=cv2.cvtColor(frame,cv2.COLOR_BGR2HSV)
        mask=((hsv[:,:,0]>=140)&(hsv[:,:,0]<=175)&(hsv[:,:,1]>75)&(hsv[:,:,2]>170)).astype(np.uint8)*255
        n,labels,stats,_=cv2.connectedComponentsWithStats(mask)
        clean=np.zeros_like(mask)
        for i in range(1,n):
            if stats[i,cv2.CC_STAT_AREA]>=18 and stats[i,cv2.CC_STAT_HEIGHT]>=8:clean[labels==i]=255
        small=cv2.resize(clean,(580,36))>80
        changed=previous is None or np.count_nonzero(small!=previous)>max(45,np.count_nonzero(previous)*.20)
        current=np.count_nonzero(clean)
        if changed:
            finish()
            spans.append(dict(task_index=len(spans),start=round(index/10,1),time=round(index/10,1),end=None,image=f'pink-frames/{len(spans):04d}.png',crop=[60,632,1160,72],pink_pixels=current))
            previous=small; best=frame; score=current
        elif current>score:
            best=frame;score=current;spans[-1]['time']=round(index/10,1);spans[-1]['pink_pixels']=current
        index+=1
    finish();proc.wait();assert proc.returncode==0
    path=ROOT/'pink-ocr-tasks.json'
    assert not path.exists(), 'Preserve existing inventory'
    path.write_text(json.dumps(dict(videoId='hc1HS71j6oY',step=.1,tasks=spans),indent=2)+'\n',encoding='utf-8')
    for base in range(0,len(spans),24):
        sheet=Image.new('RGB',(1160,24*100),'#ddd');draw=ImageDraw.Draw(sheet)
        for j,t in enumerate(spans[base:base+24]):
            draw.text((4,j*100+2),f"{t['task_index']} {t['start']}-{t['end']} pink={t['pink_pixels']}",fill='black')
            sheet.paste(Image.open(ROOT/t['image']),(0,j*100+22))
        sheet.save(ROOT/f'pink-review-{base//24:02d}.jpg')
    print(len(spans),'pink-layer spans')
if __name__=='__main__':main()

"""Measure on-video karaoke fills; keep caption bounds when no fill is present."""
import json, subprocess, re, argparse
from pathlib import Path
import cv2, numpy as np
from difflib import SequenceMatcher
ROOT=Path(__file__).resolve().parents[1]
SONGS=json.loads((ROOT/'rescene/songs.json').read_text(encoding='utf-8'))

def color(frame,vid):
    hsv=cv2.cvtColor(frame,cv2.COLOR_BGR2HSV);h,s,v=cv2.split(hsv)
    if vid=='-55bUrG1qjg':m=(h>80)&(h<110)&(s>50)&(v>150)
    elif vid=='9FlQOv6-Mjc':m=(h>55)&(h<90)&(s>45)&(v>110)
    elif vid in ['VKlrVbgJG-g','Ma6IENHO584']:m=(h>125)&(h<160)&(s>40)&(v>100)
    else:m=((h>155)|(h<8))&(s>65)&(v>120)
    return cv2.erode(m.astype('uint8'),np.ones((3,3),np.uint8))>0

def norm(text):return re.sub(r'[^a-z0-9가-힣]','',text.lower())
def dump(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def main(song):
    vid=song['sources'][0]['videoId'];root=ROOT/'video'/vid
    decisions=json.loads((root/'chant-decisions.json').read_text(encoding='utf-8'))['events']
    rows=[json.loads(l) for l in (root/'chant-ocr-results.jsonl').read_text(encoding='utf-8').splitlines()]
    if vid=='s1S-lnU-yMI':
        groups=json.loads((root/'uhuh-groups.json').read_text(encoding='utf-8'))
        merges={1:2,17:18,28:29,72:73,84:85,94:95}
        for event in decisions:
            idx=event['task_index']
            if idx in merges:event['end']=groups[merges[idx]]['end']
            if idx==26:event['evidence']=['chant-frames/0423.png']
        proc=subprocess.Popen(['ffmpeg','-v','error','-i',str(root/'source.mp4'),'-vf','fps=10,crop=1040:160:120:510','-f','rawvideo','-pix_fmt','bgr24','-'],stdout=subprocess.PIPE)
        frames=[]
        while True:
            raw=proc.stdout.read(1040*160*3)
            if len(raw)!=1040*160*3:break
            frames.append(np.frombuffer(raw,np.uint8).reshape(160,1040,3).copy())
        proc.wait();assert proc.returncode==0
        for event in decisions:
            a=round(event['start']*10);b=round(event['end']*10)
            gray=cv2.cvtColor(frames[min(a+2,b-1)],cv2.COLOR_BGR2GRAY)
            dark=(gray<85).astype('uint8')*255
            contours,hierarchy=cv2.findContours(dark,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
            mask=np.zeros_like(gray)
            if hierarchy is not None:
                for j,c in enumerate(contours):
                    x,y,w,h=cv2.boundingRect(c)
                    if hierarchy[0,j,3]>=0 and 5<w<160 and 15<h<105 and cv2.contourArea(c)>35:
                        cv2.drawContours(mask,contours,j,255,-1)
            mask=cv2.erode(mask,np.ones((3,3),np.uint8))>0
            inside=np.zeros_like(gray)
            source_index=groups[event['task_index']]['indices'][0]
            for box in rows[source_index]['boxes']:
                box=np.asarray(box,dtype=np.int32)
                if box[:,1].max()-box[:,1].min()>30:
                    cv2.fillPoly(inside,[box],255)
            mask &= inside>0
            if event['task_index']==1:mask[:50]=False
            if event['task_index']!=1:
                # In UhUh, ordinary lyrics are white; upcoming response glyphs
                # are gray. Background motion and white lyrics are excluded.
                mask &= (gray>105)&(gray<215)
            # Only glyph interiors that turn dark while this caption is still
            # present count; fixed white lyrics therefore cannot enter the cue.
            if mask.sum()>30:
                profiles=np.stack([(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)<75)[mask] for f in frames[a:b]])
                changing=(profiles.mean(axis=0)>.12)&(profiles.mean(axis=0)<.95)
                ratios=profiles[:,changing].mean(axis=1) if changing.sum()>40 else []
                if len(ratios) and max(ratios)>.65:
                    first=next((i for i,r in enumerate(ratios) if r>.07),None)
                    complete=next((i for i,r in enumerate(ratios) if r>.92),None)
                    event['caption_start']=event['start'];event['caption_end']=event['end']
                    event['start']=round(a/10+first/10,1)
                    if complete is not None:event['end']=min(event['end'],round(a/10+complete/10+.2,1))
                    event['timing_basis']='visual_karaoke_fill'
                    event['fill_mask_pixels']=int(changing.sum())
        dump(root/'chant-refined.json',dict(videoId=vid,events=decisions));print(vid,len(decisions),'gray-fill reviewed candidates',flush=True);return
    for event in decisions:
        idx=event['task_index'];key=norm(' '.join(rows[idx]['texts']))
        for row in rows[idx+1:]:
            if row['start']>event['end']+.11:break
            other=norm(' '.join(row['texts']))
            if not key or SequenceMatcher(None,key,other).ratio()<.83:break
            event['end']=row['end'];event['evidence'].append(row['image'])
    # Read the exact same 0.1 second frame grid as the primary inventory.
    proc=subprocess.Popen(['ffmpeg','-v','error','-i',str(root/'source.mp4'),'-vf','fps=10,crop=1080:90:60:40','-f','rawvideo','-pix_fmt','bgr24','-'],stdout=subprocess.PIPE)
    frames=[]
    while True:
        b=proc.stdout.read(1080*90*3)
        if len(b)!=1080*90*3:break
        frames.append(np.frombuffer(b,np.uint8).reshape(90,1080,3).copy())
    proc.wait();assert proc.returncode==0
    refined=[]
    for event in decisions:
        a=round(event['start']*10);b=round(event['end']*10)
        colorful=vid in ['xn12KH78Dx4','YyixhiYpkkY','-55bUrG1qjg']
        template=cv2.imread(str(root/event['evidence'][0])) if colorful else frames[a]
        # The primary inventory chose a frame with a raised pink glove. Use the
        # unobscured text frame instead, and restrict the mask to the reply.
        if vid=='RX592yMx7P0' and event['task_index'] in [185,194]:
            template=frames[1510 if event['task_index']==185 else 1710]
        if vid=='RX592yMx7P0' and event['task_index']==198:
            template=cv2.imread(str(root/event['evidence'][0]))
        mask=color(template,vid)
        if vid=='RX592yMx7P0' and event['task_index'] in [185,194]:mask[:,:800]=False
        parts=event['original'].split(' / ')
        cut=540
        if vid=='RX592yMx7P0':cut=750 if event['task_index']==156 else 530
        elif vid=='VKlrVbgJG-g':cut=520
        elif vid=='-55bUrG1qjg':cut=795
        elif vid=='9FlQOv6-Mjc':cut=640
        elif vid=='7DZlkZ4bMpU':cut=650
        for n,part in enumerate(parts):
            m=mask.copy()
            if len(parts)>1:
                if n==0:m[:,cut:]=False
                else:m[:,:cut]=False
            ratios=[]
            if colorful and m.sum()>30:
                sats=np.stack([cv2.cvtColor(f,cv2.COLOR_BGR2HSV)[:,:,1][m] for f in frames[a:b]])
                lo=np.min(sats,axis=0).astype(float);hi=np.max(sats,axis=0).astype(float)
                changing=(hi-lo)>35
                ratios=[float(np.mean(row[changing]>(lo[changing]+.55*(hi[changing]-lo[changing])))) for row in sats] if changing.sum()>30 else []
            else:
                for f in frames[a:b]:
                    dark=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)<75
                    ratios.append(float(np.count_nonzero(m&dark)/max(1,m.sum())))
            start,end=event['start'],event['end'];basis='caption'
            if m.sum()>30 and max(ratios,default=0)>.35:
                active=[i for i,r in enumerate(ratios) if r>.045]
                if active:
                    start=round(event['start']+active[0]/10,1)
                    complete=next((i for i in active if ratios[i]>.9),None)
                    if complete is not None:end=min(end,round(event['start']+complete/10+.2,1))
                    basis='visual_karaoke_fill'
            item={**event,'id':event['id']+(f'-{n+1}' if len(parts)>1 else ''),'original':part,'start':start,'end':end,'caption_start':event['start'],'caption_end':event['end'],'timing_basis':basis,'needs_split':False,'fill_mask_pixels':int(m.sum()),'fill_max':round(max(ratios,default=0),3)}
            if len(parts)>1:item['split_x']=cut
            refined.append(item)
    dump(root/'chant-refined.json',dict(videoId=vid,events=refined))
    print(vid,len(refined),sum(e['timing_basis']=='visual_karaoke_fill' for e in refined),'filled',flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--id');args=p.parse_args()
    if args.id:SONGS=[s for s in SONGS if s['sources'][0]['videoId']==args.id]
    for song in SONGS:main(song)

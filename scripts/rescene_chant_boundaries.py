"""Separate full-frame 0.1s boundary inventory and readable review sheets."""
import json,subprocess,argparse
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,cv2
ROOT=Path(__file__).resolve().parents[1]
SONGS=json.loads((ROOT/'rescene/songs.json').read_text(encoding='utf-8'))
def main(song, revision='', events_file='chant-refined.json'):
    vid=song['sources'][0]['videoId'];root=ROOT/'video'/vid
    events=json.loads((root/events_file).read_text(encoding='utf-8'))['events']
    dest=root/'chant-boundaries';dest.mkdir(exist_ok=True)
    tasks=[];wanted=set()
    duration=json.loads((root/'source.info.json').read_text(encoding='utf-8'))['duration']
    if vid=='hc1HS71j6oY':duration=150.8 # 150.816667s decoded stream; fps=10 ends at 150.7
    for event in events:
        for edge in ['start','end']:
            for delta in [-.2,-.1,0,.1,.2]:
                t=round(event[edge]+delta,1)
                if not 0<=t<duration:continue
                wanted.add(round(t*10))
                tasks.append(dict(task_index=len(tasks),target_id=event['id'],edge=edge,time=t,image=f'chant-boundaries/{round(t*10):05}.jpg'))
    manifest=dict(step=.1,full_frame=True,videoId=vid,tasks=tasks)
    path=root/f'chant-boundary-tasks{revision}.json'
    if path.exists():
        old=json.loads(path.read_text())
        if old!=manifest:raise RuntimeError(f'{vid}: preserve existing manifest; use a revision')
    else:path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    missing={i for i in wanted if not (dest/f'{i:05}.jpg').exists()}
    if missing:
        proc=subprocess.Popen(['ffmpeg','-v','error','-i',str(root/'source.mp4'),'-vf','fps=10,scale=1280:720','-f','rawvideo','-pix_fmt','bgr24','-'],stdout=subprocess.PIPE)
        i=0
        while True:
            data=proc.stdout.read(1280*720*3)
            if len(data)!=1280*720*3:break
            if i in missing:cv2.imwrite(str(dest/f'{i:05}.jpg'),np.frombuffer(data,np.uint8).reshape(720,1280,3),[cv2.IMWRITE_JPEG_QUALITY,92])
            i+=1
        proc.wait();assert proc.returncode==0
    assert all((root/t['image']).exists() for t in tasks)
    crop=(60,610,1220,710) if vid in ('ykVJo0wFlQ4','hc1HS71j6oY') else ((100,505,1180,675) if vid=='s1S-lnU-yMI' else (0,35,1280,135))
    thumbh=85 if vid=='s1S-lnU-yMI' else 50
    rowh=thumbh+42
    for base in range(0,len(events),12):
        sheet=Image.new('RGB',(1920,12*rowh),'#ddd');draw=ImageDraw.Draw(sheet)
        for j,event in enumerate(events[base:base+12]):
            draw.text((5,j*rowh+2),f"{event['id']}  {event['start']:.1f}-{event['end']:.1f}",fill='black')
            times=[round(event['start']-.1,1),event['start'],round(event['start']+.1,1),round(event['end']-.1,1),event['end'],round(event['end']+.1,1)]
            for k,t in enumerate(times):
                if not 0<=t<duration:
                    draw.text((k*320+3,j*rowh+20),f'{t} outside decoded sampling',fill='black')
                    continue
                image=Image.open(dest/f'{round(t*10):05}.jpg').crop(crop).resize((320,thumbh))
                sheet.paste(image,(k*320,j*rowh+38));draw.text((k*320+3,j*rowh+20),str(t),fill='black')
        sheet.save(root/f'boundary-review{revision}-{base//12:02}.jpg')
    print(vid,len(tasks),'full-frame boundary references',flush=True)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--id');parser.add_argument('--revision',default='');parser.add_argument('--events',default='chant-refined.json');args=parser.parse_args()
    if args.id and not any(s['sources'][0]['videoId']==args.id for s in SONGS):
        info=json.loads((ROOT/'video'/args.id/'source.info.json').read_text(encoding='utf-8'))
        assert info['id']==args.id
        SONGS=[{'sources':[{'videoId':args.id}]}]
    for song in SONGS:
        if not args.id or song['sources'][0]['videoId']==args.id:main(song,args.revision,args.events)

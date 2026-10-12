"""Reviewed visual decisions. Regenerate ledgers, SRTs and local catalog together.

Times are source-absolute visual timings, NOT claimed audio alignment.
Phonetics are Korean-reading drafts pending direct listening.
"""
import hashlib, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BAD=[
 (7,8.8,'에이티즈','艾伊踢茲'),(8.8,10.6,'골든아워','勾登阿窩'),
 (18.5,18.8,'YUP','YUP'),(20.5,21.1,'미소','米搜'),(22.4,22.7,'halo','halo'),
 (29.1,30,'photoshop','photoshop'),(32.9,34.1,"She don’t stop","She don’t stop"),
 (35.5,36,'해','嘿'),(37.4,37.9,'해','嘿'),
 (39.3,39.7,'대','堆'),(40.3,40.6,'대','堆'),(41.2,41.6,'대','堆'),
 (41.8,43.2,'BAD BAD BAD','BAD BAD BAD'),(43.2,44.9,'BAD BAD BAD BAD','BAD BAD BAD BAD'),(45.6,46.1,'BAD','BAD'),
 (49.4,50.9,'BAD BAD BAD','BAD BAD BAD'),(50.9,52.7,'BAD BAD BAD BAD','BAD BAD BAD BAD'),(53.3,54,'BAD','BAD'),
 (60.6,61.1,'tigo','tigo'),(64.5,64.9,'roso','roso'),(68.1,68.8,'뭐라고~?','摸拉勾～？'),
 (71.4,73.1,'Olé, mi Dios, so BAD','Olé, mi Dios,\nso BAD'),(76,76.9,'member','member'),(80.1,80.7,'Cuban','Cuban'),
 (89,89.7,'Fuego','Fuego'),(90.1,91.6,'BAD BAD BAD','BAD BAD BAD'),(91.6,93.4,'BAD BAD BAD BAD','BAD BAD BAD BAD'),(94,94.6,'BAD','BAD'),
 (97.9,99.3,'BAD BAD BAD','BAD BAD BAD'),(99.3,101.2,'BAD BAD BAD BAD','BAD BAD BAD BAD'),(101.8,102.2,'BAD','BAD'),
 (105.8,107.9,'(함성)','（歡呼）'),(121.1,123,'에 이 티 즈','艾 伊 踢 茲'),
 (124.3,125.5,'She’s so BAD','She’s so BAD'),(128.2,129.7,'She’s so BAD','She’s so BAD'),
 (134.1,134.7,'YEAH~','YEAH～'),(138.1,138.6,'GOOD~','GOOD～'),
 (140.5,142.3,'홍중 성화 윤호 여상','紅中 松花\n允齁 優桑'),(142.3,144.3,'산이 민기 우영 종호','撒尼 敏基\n屋永 鍾齁'),
 (144.3,146.4,'에 이 티 즈','艾 伊 踢 茲'),(149.9,151.2,'YUP','YUP'),
 (152.1,154,'BAD BAD BAD BAD','BAD BAD BAD BAD'),(154,155.7,'에 이 티 즈','艾 伊 踢 茲')]
AD=[
 (16.4,17,'Garage','Garage'),(18.2,19.8,'Guarantee','Guarantee'),(20.8,21.7,'Ok!','Ok!'),
 (27.5,28.1,'Whoa!','Whoa!'),(31.4,32,'Whoa!','Whoa!'),(44,44.5,'go!','go!'),(47.7,48.4,'활활','華爾 華爾'),
 (51.6,52.2,'go!','go!'),(57.1,57.7,'활활','華爾 華爾'),(59.2,59.8,'go!','go!'),(62.9,63.6,'활활','華爾 華爾'),
 (66.8,67.4,'go!','go!'),(70.6,72.9,"pumpin’ Adrenaline","pumpin’\nAdrenaline"),
 (76,76.7,'Whoa-uh','Whoa-uh'),(80.2,80.8,'Whoa!','Whoa!'),(83.7,84.5,'Whoa-uh','Whoa-uh'),(87.9,90,'에이티즈','艾伊踢茲'),
 (122.1,122.6,'go!','go!'),(125.8,126.5,'활활','華爾 華爾'),(129.7,130.2,'go!','go!'),(135.1,135.8,'Whoa-uh','Whoa-uh'),
 (137.3,137.8,'go!','go!'),(141,141.7,'활활','華爾 華爾'),(144.9,145.4,'go!','go!'),
 (148.6,151.7,"pumpin’ Adrenaline","pumpin’\nAdrenaline"),(156.1,156.8,'Whoa-uh','Whoa-uh'),(160.2,160.9,'Whoa!','Whoa!'),(163.8,164.6,'Whoa-uh','Whoa-uh'),
 (184.3,185.8,'(함성)','（歡呼）'),
 (187,187.8,'김홍중','金紅中'),(187.8,188.7,'박성화','朴松花'),(188.7,189.7,'정윤호','鄭允齁'),(189.7,190.6,'강여상','康優桑'),
 (190.6,191.6,'최산','崔傘'),(191.6,192.5,'송민기','松敏基'),(192.5,193.5,'정우영','鄭屋永'),(193.5,194.4,'최종호','崔鍾齁'),
 (194.4,196.3,'골든아워','勾登阿窩'),(196.3,198.2,'아드레날린','阿德雷那林'),(198.2,200.1,'에이티즈','艾伊踢茲'),
 (200.1,202,"pumpin’ Adrenaline","pumpin’\nAdrenaline"),
 (202,202.9,'Whoa whoa','Whoa whoa'),(203.9,204.7,'Whoa whoa','Whoa whoa'),(205.8,206.7,'Whoa whoa','Whoa whoa'),
 (207.7,208.6,'Whoa whoa','Whoa whoa'),(209.7,210.5,'Whoa whoa','Whoa whoa'),(211.5,212.4,'Whoa whoa','Whoa whoa'),(213.4,214.3,'Whoa whoa','Whoa whoa'),
 (217.9,219.9,'(함성)','（歡呼）')]

def tc(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
def dump(p,data): p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def srt(rows,key): return '\n'.join(f"{i}\n{tc(r['start'])} --> {tc(r['end'])}\n{r[key]}\n" for i,r in enumerate(rows,1))

def main():
    songs=json.loads((ROOT/'ateez/songs.json').read_text(encoding='utf-8-sig'))
    for song,vid,entries in zip(songs,['bnGARWNOuRw','HlINJYsRw3U'],[BAD,AD]):
        root=ROOT/'video'/vid
        tasks=json.loads((root/'ocr-tasks.json').read_text())['tasks']
        rows=[]
        for i,(a,b,ko,zh) in enumerate(entries,1):
            evidence=[t['image'] for t in tasks if a<=t['start']<b]
            rows.append(dict(id=f'{vid}-{i:03}',start=a,end=b,original=ko,phonetic=zh,evidence=evidence,
                category='instruction' if ko=='(함성)' else 'fan_chant',visual_review='accepted',
                timing_basis='right ATINY bubble; 0.1s grid; direct listening pending',listening_review='pending',
                phonetic_review='instruction, not spoken Korean' if ko=='(함성)' else 'Korean reading draft; listening pending' if any('\uac00'<=c<='\ud7a3' for c in ko) else 'Latin text retained'))
        cards=[];i=0
        while i<len(rows):
            group=[rows[i]]
            # Adjacent rapid member names: two names per readable card.
            if vid=='HlINJYsRw3U' and 187<=rows[i]['start']<194.4: group=rows[i:i+2]
            # Three quick repeated Korean responses as a single rhythmic card.
            if vid=='bnGARWNOuRw' and rows[i]['start']==39.3: group=rows[i:i+3]
            text='\n'.join(r['phonetic'] for r in group)
            if text=='BAD BAD BAD BAD': text='BAD BAD\nBAD BAD'
            if len(group)==3: text=' '.join(r['phonetic'] for r in group)
            cards.append(dict(start=group[0]['start'],end=group[-1]['end'],text=text,sourceIds=[r['id'] for r in group]))
            i+=len(group)
        assert all(c['end']>c['start'] and (i==0 or c['start']>=cards[i-1]['end']) for i,c in enumerate(cards))
        dump(root/'chant-ledger.json',dict(videoId=vid,status='visual_checked_listening_pending',events=rows,cards=cards,
             exclusions=['left ATEEZ lyrics','Focus on ATINY title/end cards','fade remnants and empty bubble'],
             glossary='video/專有名詞表.md; ATEEZ section read; phonetic spellings are not Chinese legal/stage names'))
        (root/'source.ko.gpu-rescan.srt').write_text(srt(rows,'original'),encoding='utf-8')
        (root/'phonetic.zh.srt').write_text(srt(rows,'phonetic'),encoding='utf-8')
        (root/'phonetic-comparison.md').write_text('# 應援原文與空耳草稿\n\n韓文依文字讀音轉寫，尚未逐句直接聽校；不是中文姓名或意譯。英文及西班牙文字保留原文。\n\n|秒數|右側原文|空耳／提示|\n|---|---|---|\n'+'\n'.join(f"|{r['start']}–{r['end']}|{r['original']}|{r['phonetic'].replace(chr(10),'<br>')}|" for r in rows)+'\n',encoding='utf-8')
        dump(root/'timeline.json',cards)
        (root/'source.ko.gpu-rescan.diff.md').write_text(f'# 右側應援擷取\n\n無既有 SRT；新建 {len(rows)} 個來源事件，合併為 {len(cards)} 張手機卡片。原始 MP4 保留，左側歌詞排除。\n',encoding='utf-8')
        (root/'UNRESOLVED.md').write_text('# 待確認\n\n- 全部事件的實際喊聲起迄尚未直接聽校；目前採右側字幕時間，精度約 0.1 秒，不能宣稱聲音已對齊\n- 全部韓文空耳為原文讀音草稿，連音、收音及現場喊法待聽校；逐項時間與圖檔見 chant-ledger.json 及 phonetic-comparison.md\n- 人名空耳不是官方漢字姓名；詞表僅列部分成員的字幕譯名，未將新空耳寫回共用詞表\n- 歡呼是動作指示，不將 함성 空耳化當作要喊的詞\n- 變化偵測可能漏掉低於門檻的極短變化；不是逐一觀看原始影片每一影格的驗收\n',encoding='utf-8')
        song['hasChant']=True
        song['note']='右側 ATINY 應援畫面核對版；實際喊聲校時與韓文空耳聽校待完成。'
        song['chant']=dict(videoId=vid,status='visual_checked_listening_pending',note='本機校對版：僅擷取右側 ATINY 應援；韓文為空耳草稿，英文保留。時間依画面，實際喊聲與發音仍待聽校。',cues=[{k:c[k] for k in ['start','end','text']} for c in cards])
        song['chant']['note']=song['chant']['note'].replace('画面','畫面')
        print(vid,len(rows),'events',len(cards),'cards')
    dump(ROOT/'ateez/songs.json',songs)

if __name__=='__main__':main()

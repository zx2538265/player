"""Human-reviewed visual chant decisions; original text, no invented phonetics."""
import json, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
# Entries map source-frame span IDs to chant text only. Slash separates distinct
# responses on one caption line, whose individual bounds are reviewed separately.
REVIEW={
's1S-lnU-yMI': '''
1|원이 리브 미나미 메이 제나 리센느
5|attention
6|ya
9|tension
10|ya
17|woo baby
20|You gonna shout it out Uh Uh
22|Do you wanna follow me
23|Uh! Uh!
26|Uh! Uh!
28|빛 빛 빛
30|scent of scene
34|Flower
35|Bararam bararam bararam (hey!)
36|ride
37|wow
40|me
41|Uh! Uh!
44|UhUh
45|UhUh
48|Burning flower
49|리! 센! 느!
51|woo baby
53|You gonna shout it out Uh Uh
55|Do you wanna follow me
56|Uh! Uh!
58|Uh! Uh!
60|빛 빛 빛
61|scent of scene
65|Flower
66|Bararam bararam bararam (hey!)
67|ride
68|wow
69|Oh!
71|me
72|Uh! Uh!
84|리! 센! 느!
86|Uh Uh Uh Uh Uh Uh Uh Uh Uh Uh
88|Bararam bararam bararam (hey!)
89|ride
90|wow
91|Oh!
93|me
94|Uh Uh Uh Uh Uh Uh Uh Uh Uh Uh
''',
'VKlrVbgJG-g': '''
6|heart drop
10|heart drop
11|리센느!
13|Melt away, melt away
15|Slip away, slip away
16|Hypersonic
18|느껴진 Delight
21|heart drop
25|heart drop
29|빠져들어 리센느 사랑해!
32|Can't stop, won't stop
38|레 / 끝도 없이
39|게 / Melody에
40|한 번 더 Delight
43|heart drop
47|heart drop
51|빠져들어 리센느 사랑해!
54|Can't stop, won't stop
56|（歡呼）
61|잊지 못할 Heart drop
63|빠져들어 리센느 사랑해!
66|Can't stop, won't stop
69|We can make your heart
72|We can make your heart
75|We can make your heart
85|（歡呼）
''',
'Ma6IENHO584': '''
5|아
6|난
7|리센느!
8|이젠
9|내게
15|날 깨워내
20|ah ah
21|ah ah
22|ah ah
25|no
26|slow
31|널 위한 거야
33|리센느!
34|이젠
35|내게
41|날 깨워내
46|ah ah
47|ah ah
48|ah ah
50|（歡呼）
56|너를 믿어 리센느!
60|날 깨워내
64|더 아름답게 피어나지
65|ah ah
66|ah ah
67|ah ah
69|ah ah
70|ah ah
71|ah ah
73|（歡呼）
''',
'7DZlkZ4bMpU': '''
266|원이 리브 미나미 메이 제나
268|리센느 런!어!웨!이!
270|Neverland
272|Everyday
273|갈 수 없게
274|맴돌게 해
276|쳇바퀴
277|메아리
279|Heart
280|런!어!웨!이!
282|리!센!느!
287|I run away / （歡呼）
289|끌!어!당!겨! 리!센!느!
293|날 두렵게 해
296|You and me
299|All night
303|가자～～
306|I run away
308|Hold my hand
313|I run away / （歡呼）
316|I run, I run away
318|run away
325|（歡呼）
326|I run away
328|I run I run
333|I run away
342|끌어당겨 넌 Now I run away
344|（歡呼）
345|I run I run I runaway!
''',
'YyixhiYpkkY': '''
178|빠져들어 RESCENE!
181|떨려
182|Pinball
183|Play!
184|Wait!
187|down to play
188|（歡呼）
192|nah nah
198|RESCENE!
203|종일!
204|Pinball!
207|Oh oh!
208|Oh oh!
211|Flash yeah!
213|pass yeah!
216|Just like that babe
217|（歡呼）
221|nah nah
227|RESCENE!
232|종일!
233|Pinball!
237|RESCENE!
239|Heartbeat
240|이지
242|Closer
244|（歡呼）
250|RESCENE!
255|RESCENE!
256|Pinball!
257|원이! 리브! 미나미!
261|또!
264|메이! 제나! 리마인!
267|종일!
268|Pinball!
269|（歡呼）
''',
'-55bUrG1qjg': '''
22|원이 리브 미나미 메이 제나 Glow Up!
24|yeah!
27|like like like
30|리마인!
33|가득해!
35|I
36|Baby
37|Lately
38|멀리
39|Keep up keep up keep up
40|더
41|I'm so curious
43|리센느!
44|Glow Up
45|Glow Up
46|Glow Up
47|너와 나
49|그 순간
51|Like it
52|Vibin’
58|뺏겼어!
61|Baby
62|Lately
63|멀리
64|Keep up keep up keep up
65|더
66|I'm so curious
68|리센느!
69|Glow Up
70|Glow Up
71|Glow Up
72|Glow Up
73|Glow Up / （歡呼）
''',
'9FlQOv6-Mjc': '''
1|원이 리브 미나미 메이 제나
3|리센느 짱
5|I
6|light
7|그 향기에
8|Oh It's so bright
10|Deja vu!
12|after all
13|기억해줘
14|deja vu
15|WAH～
16|YEAH～
17|deja vu
18|Oh oh oh ha
20|deja vu
22|WAH～
23|YEAH～
24|deja vu
25|Oh oh oh ha
29|귀 기울여 봐
32|Deja vu!
34|after all
35|기억해줘
36|deja vu
37|WAH～
38|YEAH～
39|deja vu
40|Oh oh oh ha
42|deja vu
44|WAH～
45|YEAH～
46|deja vu
47|Oh oh oh ha
49|기억할게!
51|기억해줘!
54|deja vu
55|WAH～
56|YEAH～
57|deja vu
58|Oh oh oh ha
60|deja vu
62|WAH～
63|YEAH～
64|deja vu
65|Oh oh oh ha / （歡呼）
''',
'RX592yMx7P0': '''
138|정원이 진경은 미나미
140|이예빈 김가영 리센느
142|프리티걸 나야 나
143|one twe three yeah
145|every wanna pretty
147|no no no no
149|every wanna pretty
152|리센느!
156|기본 / 선택
158|girl! / Pretty Girl
159|넌
161|yeah yeah yeah yeah
162|girl! / Pretty Girl
163|넌
165|Yeah yeah yeah yeah
167|리마인
170|every wanna pretty
172|no no no no
174|every wanna pretty
180|girl! / Pretty Girl
181|넌
183|yeah yeah yeah yeah
184|girl! / Pretty Girl
185|넌
187|Yeah yeah yeah yeah
189|리
190|센
191|느
192|짱
194|（歡呼）
195|girl! / Pretty Girl
196|넌
198|yeah yeah yeah yeah
199|girl!
200|넌
202|（歡呼）
204|If you wanna pretty
205|every wanna pretty
206|안된다는 맘은
207|no no no no
209|If you wanna pretty
210|every wanna pretty
211|어디서나 당당하게 걷기
214|눈부셔 빛난다 리센느
216|고마워 영원해 리마인
218|우리 모두 프리티걸
''',
'xn12KH78Dx4': '''
133|Feeling love attack!
135|RESCENE!
137|LOVE ATTACK!
139|너!
140|started
143|않지
145|waiting for
146|스친
147|끌림
155|1234
158|RESCENE!
161|LOVE ATTACK!
162|SCENE!
163|RESCENE!
166|With me, With me
169|Feeling love attack!
178|Ambergris
179|드러내
180|Beautiful
182|Fabulous
184|On and on
186|1234
189|RESCENE!
192|LOVE ATTACK!
193|SCENE!
194|RESCENE!
197|With me, With me
200|Feeling love attack!
201|I am all you need
203|I am all you need
205|（歡呼）
208|RESCENE!
211|LOVE ATTACK!
212|장면에
214|황홀해
216|잡을 땐
217|어우러질 땐
218|With me, With me
220|완벽하게 어울려
221|Feeling love attack!
''',
}

def dump(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':
    for vid,text in REVIEW.items():
        root=ROOT/'video'/vid
        tasks=json.loads((root/'chant-ocr-tasks.json').read_text())['tasks']
        if vid=='s1S-lnU-yMI':tasks=json.loads((root/'uhuh-groups.json').read_text(encoding='utf-8'))
        events=[]
        for line in text.strip().splitlines():
            index,original=line.split('|',1);task=tasks[int(index)]
            events.append(dict(id=f'{vid}-{index}',task_index=int(index),original=original,start=task['start'],end=task['end'],evidence=[task['image']],visual_review='accepted',listening_review='pending',timing_basis='caption',needs_split=' / ' in original))
        dump(root/'chant-decisions.json',dict(videoId=vid,events=events))

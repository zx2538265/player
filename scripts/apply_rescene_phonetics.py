"""Apply reviewed text-to-reading decisions without changing source text or times."""
import json
import re
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def apply_phonetics(catalog):
    decisions = json.loads((ROOT / 'rescene/phonetics.zh.json').read_text(encoding='utf-8'))
    for song in catalog:
        track = song.get('chant')
        if not track:
            continue
        for cue in track['cues']:
            if re.search('[가-힣]', cue['text']):
                cue['phoneticZh'] = decisions['cards'][cue['text']]
            else:
                cue.pop('phoneticZh', None)
        track['phoneticStatus'] = decisions['status']
        track['phoneticNote'] = decisions['note']
    return catalog


if __name__ == '__main__':
    path = ROOT / 'rescene/songs.json'
    catalog = apply_phonetics(json.loads(path.read_text(encoding='utf-8')))
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    with (ROOT / 'rescene/phonetic-review.tsv').open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.writer(stream, delimiter='\t')
        writer.writerow(['歌曲', '卡片編號', '開始秒數', '結束秒數', '韓文原文', '英文名字／空耳初稿', '狀態'])
        for song in catalog:
            for index, cue in enumerate(song['chant']['cues'], 1):
                if 'phoneticZh' in cue:
                    writer.writerow([song['title'], index, cue['start'], cue['end'], cue['text'], cue['phoneticZh'], '待逐句聽校'])

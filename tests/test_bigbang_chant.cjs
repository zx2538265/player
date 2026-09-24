const {test} = require('node:test');
const assert = require('node:assert/strict');
const Chant = require('../bigbang/chant.js');
const songs = require('../bigbang/songs.json');
const track = songs[0].chant;

test('track is specific to the embedded video, sorted and within its duration', () => {
  assert.equal(Chant.validTrack(track, songs[0].sources[0].videoId), true);
  assert.equal(Chant.validTrack(track, 'different-version'), false);
  assert.equal(track.cues.length, 37);
  assert.ok(track.cues.every(c => c.end <= 230));
  assert.ok(songs.filter(s => ![1,2,3,4,5,7,8,9,10,11,13,16,17,18,19,20,21,22,24,26,28,29].includes(s.number)).every(s => !s.chant));
  assert.equal(Chant.validTrack({...track, cues:[{start:1,end:2,text:'a'},{start:1.5,end:3,text:'b'}]},track.videoId),false);
});
test('songs 2 through 5 bind chant data to the specified sources', () => {
  for (const [index, videoId, count, duration] of [[1,'0o7qE6pCxI0',12,232.2],[2,'pJGOF3l2_88',38,220.053],[3,'BaZAcJYawPI',14,251],[4,'d-y_er6QS1k',13,218]]) {
    const song = songs[index], t = song.chant;
    assert.equal(song.sources[0].videoId, videoId);
    assert.equal(Chant.validTrack(t, videoId), true);
    assert.equal(t.cues.length, count);
    assert.ok(t.cues.every(c => c.end <= duration));
    for (const other of songs.filter(s => s.chant && s !== song)) {
      assert.equal(Chant.validTrack(t, other.chant.videoId), false);
    }
    for (const cue of [...t.cues].reverse()) {
      for (const rate of [0.5,1,2]) {
        assert.equal(Chant.state(t,cue.start,1,rate).text,cue.text);
        assert.equal(Chant.state(t,cue.start,1,rate).mode,'active');
        assert.equal(Chant.state(t,cue.start,2,rate).mode,'paused');
        assert.equal(Chant.state(t,cue.start,2,rate).count,'');
      }
      assert.equal(Chant.state(t,cue.end,1).mode === 'active',t.cues.some(c => c.start === cue.end));
    }
  }
  assert.deepEqual([...new Set(songs[1].chant.cues.map(c => c.text))],['HEY HO HEY HO','HANDS UP HIGH HIGH & LOW']);
  assert.equal(songs[2].chant.cues.find(c => c.start === 109.5).text,'娜 娜 娜');
  assert.ok(!songs[2].chant.cues.some(c => /去找尋|我依然|GO GO/.test(c.text)));
  assert.deepEqual([...new Set(songs[3].chant.cues.map(c => c.text))],['Blues','麥摟','買豆','每摟','諾哇娜','內莎郎','瓦搭咖搭']);
  assert.deepEqual([...new Set(songs[4].chant.cues.map(c => c.text))],['LOSER 威偷利','喔嗽','剖嗽','I’M COMING HOME','西素','西贈','I’M GOING HOME']);
  assert.match(songs[4].chant.note,/暫定/);
  assert.ok(!songs[4].chant.cues.some(c => /JUST A|상처|머저리|GOOD.?BYE/.test(c.text)));
});
test('preview, 3/2/1, exact start and exclusive end', () => {
  const t = {cues:[{start:10,end:12,text:'GO'},{start:20,end:22,text:'NEXT'}]};
  assert.equal(Chant.state(t,6,1).mode,'waiting');
  for (const [time,count] of [[7,'3'],[8,'2'],[9,'1']]) assert.equal(Chant.state(t,time,1).count,count);
  assert.equal(Chant.state(t,10,1).mode,'active');
  assert.equal(Chant.state(t,10,1).next,'下一句：NEXT');
  assert.equal(Chant.state(t,12,1).text,'NEXT');
  assert.equal(Chant.state(t,12,1).mode,'waiting');
});
test('songs 7 and 8 use absolute source clocks and isolate all provisional cues', () => {
  assert.equal(songs[3].sources[0].startSeconds,17);
  for (const [index,id,count] of [[6,'-PCCobymTas',26],[7,'6iF7adiEHVk',12]]) {
    const song=songs[index], track=song.chant;
    assert.equal(song.sources[0].videoId,id);
    assert.equal(song.sources[0].startSeconds,undefined);
    assert.equal(Chant.validTrack(track,id),true);
    assert.equal(track.cues.length,count);
    assert.match(track.note,/暫定/);
    for (const other of songs.filter(s=>s.chant && s!==song)) assert.equal(Chant.validTrack(track,other.chant.videoId),false);
    // Reverse order models repeated backwards seeks without retaining prior state.
    for (const cue of [...track.cues].reverse()) for (const rate of [0.5,1,2]) {
      assert.equal(Chant.state(track,cue.start,1,rate).text,cue.text);
      assert.equal(Chant.state(track,cue.start,1,rate).mode,'active');
      assert.notEqual(Chant.state(track,cue.end,1,rate).mode,'active');
      for (const state of [-1,2,3,5]) {
        assert.equal(Chant.state(track,cue.start,state,rate).mode,'paused');
        assert.equal(Chant.state(track,cue.start-0.1,state,rate).count,'');
      }
      const previous=track.cues.filter(c=>c.end<=cue.start).at(-1);
      const time=Math.max(previous?.end||0,cue.start-3*rate);
      assert.equal(Chant.state(track,time,1,rate).count,String(Math.ceil((cue.start-time)/rate)));
    }
  }
  assert.equal(songs[6].chant.cues[0].start,59.8);
  assert.equal(songs[7].chant.cues[0].start,7.3);
  assert.ok(!songs[6].chant.cues.some(c=>/EVERYDAY|MY LAY|니가/.test(c.text)));
  assert.ok(!songs[7].chant.cues.some(c=>/JESUS|SUNGLASS|5 X 5|찹쌀떡/.test(c.text)));
  assert.deepEqual(songs[7].chant.cues.find(c=>c.text==='喔扣趴gi喔'),{start:84.8,end:86.3,text:'喔扣趴gi喔'});
});
test('HARU HARU and LIES use only confirmed pink chants from replacement videos', () => {
  for (const [index,id,count,duration] of [[8,'MYVg4jl4AXk',3,121],[9,'kppPmFtBB70',11,149.534]]) {
    const song=songs[index], t=song.chant;
    assert.equal(song.sources[0].videoId,id);
    assert.equal(Chant.validTrack(t,id),true);
    assert.equal(Chant.validTrack(t,'KBTJI9oxcI8'),false);
    assert.equal(t.cues.length,count);
    assert.ok(t.cues.every(c=>c.start>=0 && c.end<=duration));
    assert.match(t.note,/暫定/);
    for(const cue of [...t.cues].reverse()) for(const rate of [.5,1,2]) {
      assert.equal(Chant.state(t,cue.start,1,rate).text,cue.text);
      assert.equal(Chant.state(t,cue.start,1,rate).mode,'active');
      assert.equal(Chant.state(t,cue.end,1,rate).mode==='active',t.cues.some(c=>c.start===cue.end));
      for(const state of [-1,2,3,5]) {
        assert.equal(Chant.state(t,cue.start,state,rate).mode,'paused');
        assert.equal(Chant.state(t,cue.start-.1,state,rate).count,'');
      }
    }
    assert.equal(Chant.state(t,t.cues[0].start-1.5,1,.5).count,'3');
    assert.equal(Chant.state(t,duration,0).mode,'ended');
  }
  assert.deepEqual(songs[8].chant.cues.map(c=>c.text),["Don't cry cry",'Bye bye','Lie Lie']);
  const lies=songs[9].chant;
  assert.equal(lies.cues[0].text,'款基永\n東永北\n扛爹送');
  assert.equal(lies.cues[5].text,'搜哩\nI love you\nmore more');
  assert.ok(!lies.cues.some(c=>c.start<90.8 && c.end>88.9));
  assert.ok(!lies.cues.some(c=>/Im so sorry|No 歐嫩/.test(c.text)));
  assert.equal(songs[9].sources.length,2);
});

test('countdown uses actual seconds at slower and faster rates', () => {
  const t = {cues:[{start:10,end:12,text:'GO'}]};
  assert.equal(Chant.state(t,8.5,1,0.5).count,'3');
  assert.equal(Chant.state(t,7,1,0.5).count,'');
  assert.equal(Chant.state(t,4,1,2).count,'3');
});
test('pause, buffering and unstarted states never urge the user to shout', () => {
  for (const state of [-1,2,3,5]) {
    assert.equal(Chant.state(track,29, state).count,'');
    assert.equal(Chant.state(track,30, state).mode,'paused');
  }
});
test('seeking backwards and repeated passages derive state from the current clock', () => {
  for (const time of [200,30,150,30]) {
    const expected = track.cues.find(c => c.start <= time && time < c.end) || track.cues.find(c => c.start > time);
    assert.equal(Chant.state(track,time,1).text,expected.text);
  }
  assert.equal(Chant.state(track,230,0).mode,'ended');
  assert.equal(Chant.state(track,230,1).count,'');
  assert.equal(Chant.state(track,0,1).text,track.cues[0].text);
});
test('every cue enters and exits correctly including adjacent repeated phrases', () => {
  for (const cue of track.cues) {
    assert.equal(Chant.state(track,cue.start,1).mode,'active');
    assert.equal(Chant.state(track,cue.start,1).text,cue.text);
    const atEnd = Chant.state(track,cue.end,1);
    assert.equal(atEnd.mode === 'active',track.cues.some(c=>c.start === cue.end));
  }
});

test('Universe binds the complete replacement source and excludes the former excerpt',()=>{
 const song=songs[10],t=song.chant;
 assert.equal(song.sources[0].videoId,'DxlZVaEO9B4');
 assert.equal(song.sources[0].startSeconds,undefined);assert.equal(song.sources[0].endSeconds,undefined);
 assert.equal(Chant.validTrack(t,'DxlZVaEO9B4'),true);
 assert.equal(Chant.validTrack(t,'Su2kSDRdy5s'),false);
 assert.equal(t.cues.length,19);assert.equal(t.cues[0].start,32.2);
 assert.ok(t.cues.some(c=>c.text==='Last forever'));
 assert.equal(t.cues.at(-1).end,218);
 assert.equal(songs[3].sources[0].startSeconds,17);
 for(const cue of [...t.cues].reverse()) for(const rate of [.5,1,2]) {
  assert.ok(cue.start>=0 && cue.end<=221);
  assert.equal(Chant.state(t,cue.start,1,rate).text,cue.text);
  assert.equal(Chant.state(t,cue.end,1,rate).mode==='active',t.cues.some(c=>c.start===cue.end));
  for(const state of [-1,2,3,5]) assert.equal(Chant.state(t,cue.start-.1,state,rate).count,'');
 }
});

test('RINGA LINGA keeps its source and isolates all 32 timed chant cards', () => {
  const song=songs.find(s=>s.number===16), t=song.chant;
  assert.equal(song.sources[0].videoId,'EojU8B2DEL0');
  assert.equal(Chant.validTrack(t,song.sources[0].videoId),true);
  assert.equal(t.cues.length,32);
  assert.ok(t.cues.every(c=>c.end<=229));
  assert.match(t.note,/暫定/);
  assert.match(t.note,/bulgeum/);
  assert.deepEqual(t.cues.filter(c=>c.start>=63&&c.start<65),[{start:63.4,end:64,text:'left'},{start:64.2,end:64.9,text:'right'}]);
  assert.equal(t.cues.find(c=>c.start===100.8).text,'噗棍');
  assert.ok(!t.cues.some(c=>c.text==='bulgeum'));
  for (const other of songs.filter(s=>s.chant && s!==song)) assert.equal(Chant.validTrack(t,other.chant.videoId),false);
  for (const c of [...t.cues].reverse()) {
    for (const rate of [0.5,1,2]) {
      assert.equal(Chant.state(t,c.start,1,rate).text,c.text);
      assert.equal(Chant.state(t,c.start,1,rate).mode,'active');
      assert.equal(Chant.state(t,c.start,2,rate).mode,'paused');
      assert.equal(Chant.state(t,c.start,2,rate).count,'');
    }
    assert.equal(Chant.state(t,c.end,1).mode==='active',t.cues.some(next=>next.start===c.end));
  }
  assert.equal(t.cues.filter(c=>c.text==='like').length,6);
  assert.equal(t.cues.filter(c=>c.text==='RINGA LINGA').length,6);
  assert.ok(!t.cues.some(c=>/火熱|星期五|高舉雙手|女孩們/.test(c.text)));
});


test('HANDO-CHOGUA binds only source-marked responses and uses its absolute video clock',()=>{
 const song=songs.find(s=>s.number===13),t=song.chant;
 assert.equal(song.sources[0].videoId,'KWWcRGfm5SQ');
 assert.equal(Chant.validTrack(t,song.sources[0].videoId),true);
 assert.equal(t.cues.length,24);
 assert.equal(t.cues[0].start,49.2);assert.equal(t.cues.at(-1).end,187.1);
 assert.match(t.note,/暫定/);
 for(const other of songs.filter(s=>s.number!==13&&s.chant)) assert.equal(Chant.validTrack(t,other.chant.videoId),false);
 assert.deepEqual(t.cues.filter(c=>c.start>=146&&c.start<160).map(c=>c.text),['馬西猛','又在爽','no','韓豆湊瓜']);
 assert.ok(!t.cues.some(c=>/安妞|心臟|空中|沙拉|為何|約翰|韓黑/.test(c.text)));
 // Source yellow remains visible at 75s/190s, but the completed response must not stay active.
 for(const time of [75,190]) assert.notEqual(Chant.state(t,time,1).mode,'active');
 for(const cue of [...t.cues].reverse()) for(const rate of [.5,1,2]) {
  assert.ok(cue.start>=0&&cue.end<=195.334);
  assert.equal(Chant.state(t,cue.start,1,rate).text,cue.text);
  assert.equal(Chant.state(t,cue.end,1,rate).mode==='active',t.cues.some(c=>c.start===cue.end));
  for(const state of [-1,2,3,5]) assert.equal(Chant.state(t,cue.start-.1,state,rate).count,'');
  const previous=t.cues.filter(c=>c.end<=cue.start).at(-1);
  const time=Math.max(previous?.end||0,cue.start-3*rate);
  const remaining=(cue.start-time)/rate;
  assert.equal(Chant.state(t,time,1,rate).count,String(Math.ceil(remaining)));
 }
});


test('POWER uses only source-marked chants, absolute timing and readable grouped cards', () => {
  const song=songs[17], t=song.chant;
  assert.equal(song.title,'POWER');
  assert.equal(song.sources[0].videoId,'LO2yJopvMH0');
  assert.equal(song.sources[1].title,'Threads');
  assert.equal(song.sources[0].startSeconds,undefined);
  assert.equal(Chant.validTrack(t,'LO2yJopvMH0'),true);
  assert.equal(t.cues.length,23);
  assert.match(t.note,/暫定.*聽校/);
  assert.ok(!t.cues.some(c=>/Now I got|Prove|power-up|現在我/.test(c.text)));
  assert.equal(t.cues.find(c=>c.start===45).text,'Called\nlegend\nK 他喜');
  assert.equal(t.cues.find(c=>c.start===87.6).text,'BANG\n‘G’ thang');
  for (const other of songs.filter(s=>s!==song && s.chant)) assert.equal(Chant.validTrack(t,other.chant.videoId),false);
  for (const c of [...t.cues].reverse()) for (const rate of [.5,1,2]) {
    assert.ok(c.end<=143.921);
    assert.equal(Chant.state(t,c.start,1,rate).text,c.text);
    assert.equal(Chant.state(t,c.start,1,rate).mode,'active');
    assert.equal(Chant.state(t,c.end,1,rate).mode==='active',t.cues.some(n=>n.start===c.end));
    for(const state of [-1,2,3,5]) assert.equal(Chant.state(t,c.start,state,rate).count,'');
  }
  for(const rate of [.5,1,2]) {
    assert.equal(Chant.state(t,40-3*rate,1,rate).count,'3');
  }
  assert.equal(Chant.state(t,45,1).next,'下一句：ㄇ喜　我喜');
  assert.equal(Chant.state(t,0,1).text,'Übermensch');
});


test('SUNSET GLOW and LAST FAREWELL keep source-bound absolute clocks and grouped cards', () => {
  for (const [number,id,count,duration] of [[28,'KJ6SwQ6megg',16,157.991],[29,'5O7rTtvejmg',27,201.135]]) {
    const song=songs.find(s=>s.number===number), t=song.chant;
    assert.equal(song.sources[0].videoId,id);
    assert.equal(Chant.validTrack(t,id),true);
    assert.equal(t.cues.length,count);
    assert.ok(t.cues.every(c=>c.end<=duration));
    for(const other of songs.filter(s=>s.chant && s!==song)) assert.equal(Chant.validTrack(t,other.chant.videoId),false);
    for(const cue of [...t.cues].reverse()) for(const rate of [0.5,1,2]) {
      assert.equal(Chant.state(t,cue.start,1,rate).text,cue.text);
      assert.equal(Chant.state(t,cue.start,1,rate).mode,'active');
      assert.equal(Chant.state(t,cue.end,1,rate).mode==='active',t.cues.some(c=>c.start===cue.end));
      for(const state of [2,3,-1]) {
        assert.equal(Chant.state(t,cue.start,state,rate).mode,'paused');
        assert.equal(Chant.state(t,cue.start,state,rate).count,'');
      }
    }
    const first=t.cues[0];
    for(const count of [3,2,1]) assert.equal(Chant.state(t,first.start-count,1).count,String(count));
  }
  const a=songs.find(s=>s.number===28).chant,b=songs.find(s=>s.number===29).chant;
  assert.equal(a.cues.at(-1).text,'Bigbang');
  assert.equal(a.cues.find(c=>c.start===50.2).text,'I love you girl');
  assert.equal(b.cues[0].text,'權志龍\n東永裴\n崔勝鉉');
  assert.equal(b.cues.find(c=>c.start===103.4).text,'槍趕\n松沙趟');
  assert.equal(b.cues.find(c=>c.start===158.1).text,'Hey Hey');
  assert.ok(!b.cues.some(c=>/棉花糖|短暫|I don.t wanna/.test(c.text)));
});

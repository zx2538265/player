'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Chant=require('../rescene/chant.js');
const songs=require('../rescene/songs.json');

test('all reviewed caption tails stay active without changing entry times or crossing the next card',()=>{
  const review=require('../rescene/cue-end-review.json');
  assert.equal(review.songs.reduce((n,s)=>n+s.cues.length,0),424);
  for(const reviewedSong of review.songs){
    const track=songs.find(s=>s.chant.videoId===reviewedSong.videoId).chant;
    for(const decision of reviewedSong.cues){
      const cue=track.cues.find(c=>c.sourceIds.join('|')===decision.sourceIds.join('|'));
      assert.equal(cue.start,decision.start);
      assert.equal(cue.text,decision.text);
      if(decision.status!=='extended_to_caption_boundary') continue;
      const time=(decision.previousEnd+decision.end)/2;
      for(const state of [Chant.state(track,time,1),Chant.state(track,time,1,0.5),Chant.state(track,time,1,2)]){
        assert.equal(state.mode,'active',`${reviewedSong.title} #${decision.index} at ${time}`);
        assert.equal(state.text,decision.text);
      }
      assert.equal(Chant.state(track,time,2).text,decision.text);
    }
    assert.equal(Chant.validTrack(track,track.videoId),true);
  }
});

test('UhUh retains both even know that responses and the reported Oh fill',()=>{
  const track=songs.find(s=>s.title==='UhUh').chant;
  const repeats=track.cues.filter(c=>c.text==='even know that');
  assert.equal(repeats.length,2);
  for(const time of [57,58.8,60,57]){
    const state=Chant.state(track,time,1);
    assert.equal(state.mode,'active');
    assert.equal(state.text,'even know that');
  }
  assert.equal(track.cues.filter(c=>c.sourceIds.includes('s1S-lnU-yMI-omission-oh-1122')).length,1);
  for(const time of [112.3,113,112.3]){
    assert.equal(Chant.state(track,time,1).mode,'active');
    assert.equal(Chant.state(track,time,1).text,'Oh!');
  }
  for(const time of [56.4,60.8,111.5,113.2]) assert.notEqual(Chant.state(track,time,1).mode,'active');
});

test('Pretty Girl keeps both reported phrases visible through their official caption tails',()=>{
  const track=songs.find(s=>s.title==='Pretty Girl').chant;
  for(const [text, times] of [['안된다는 맘은',[206.8,207.6,206.8]],['어디서나 당당하게 걷기',[216.4,217.8,216.4]]]){
    for(const time of times){
      const state=Chant.state(track,time,1);
      assert.equal(state.mode,'active',`${text} at ${time}`);
      assert.equal(state.text,text);
    }
  }
  assert.equal(Chant.state(track,207.7,1).text,'no no no no');
  assert.notEqual(Chant.state(track,217.9,1).mode,'active');
});

test('424 source-bound cards have unique provenance and valid boundaries',()=>{
  assert.deepEqual(songs.map(s=>s.chant.cues.length),[42,31,46,35,52,49,34,28,30,29,48]);
  const ids=new Set();
  for(const song of songs){
    const track=song.chant,id=song.sources[0].videoId;
    assert.equal(Chant.validTrack(track,id),true);
    assert.equal(Chant.validTrack(track,'unrelated-video'),false);
    assert.equal(track.status,['Busy Boy','YoYo'].includes(song.title)?'model_aligned_listening_pending':'visual_checked_listening_pending');
    assert.equal(track.timingBasis,['Busy Boy','YoYo'].includes(song.title)?'word-aligned':'caption');
    for(const cue of track.cues){
      assert.ok(cue.sourceIds.length);
      for(const source of cue.sourceIds){assert.ok(source.startsWith(id+'-'));assert.ok(!ids.has(source));ids.add(source);}
      assert.ok(!cue.text.includes(' / '));
    }
  }
  assert.equal(ids.size,424);
});

test('LOVE ATTACK retains both fills of each repeated phrase, including replay',()=>{
  const track=songs.find(s=>s.title==='LOVE ATTACK').chant;
  assert.equal(track.cues.filter(c=>c.text==='I am all you need').length,4);
  for(const t of [152.5,154.5,157,159,154.5]){
    assert.equal(Chant.state(track,t,1).mode,'active');
    assert.equal(Chant.state(track,t,1).text,'I am all you need');
  }
  for(const t of [155.5,159.8]) assert.notEqual(Chant.state(track,t,1).mode,'active');
});

test('Busy Boy binds only pink responses to the requested fan source',()=>{
  const song=songs.find(s=>s.title==='Busy Boy');
  assert.equal(song.number,11);
  assert.equal(song.sources[0].videoId,'hc1HS71j6oY');
  assert.match(song.sources[0].kind,/농담곰탕탕후루/);
  assert.ok(!song.sources[0].kind.includes('官方'));
  assert.equal(song.sources[0].startSeconds,undefined);
  assert.equal(song.sources[0].endSeconds,undefined);
  const cues=song.chant.cues;
  const cue=index=>cues.find(c=>c.sourceIds[0]===`hc1HS71j6oY-${index}`);
  assert.equal(cue(8).text,'치');
  assert.equal(cue(11).text,'지');
  assert.equal(cues.filter(c=>c.text==='busy busy').length,0);
  assert.equal(cues.filter(c=>c.text==='busy').length,24);
  assert.equal(cues.filter(c=>c.text==='（歡呼）').length,4);
  assert.ok(!cues.some(c=>/I wanna know|난 네가 싫어|please make sure|the ocean/.test(c.text)));
  assert.equal(cue(1).start,8.5);
  assert.equal(cue(51).end,150.8);
});

test('Busy Boy previews the next cue with countdown while retaining corrected active bounds',()=>{
  const track=songs.find(s=>s.title==='Busy Boy').chant;
  assert.equal(track.previewPolicy,undefined);
  assert.equal(Chant.state(track,0,1).text,track.cues[0].text);
  assert.equal(Chant.state(track,0,1).mode,'waiting');
  assert.equal(Chant.state(track,16.7,1).text,'behind');
  assert.equal(Chant.state(track,16.7,1).mode,'countdown');
  assert.equal(Chant.state(track,16.7,1).count,'3');
  assert.equal(Chant.state(track,16.7,1,2).count,'2');
  assert.equal(Chant.state(track,18.9,1).mode,'countdown');
  assert.equal(Chant.state(track,19,1).text,'behind');
  assert.equal(Chant.state(track,19,1).mode,'active');
  assert.equal(Chant.state(track,53.2,1).text,'busy');
  assert.equal(Chant.state(track,53.6,1).text,'busy');
  assert.equal(Chant.state(track,54.2,1).text,'busy');
  assert.equal(Chant.state(track,54.2,1).mode,'active');
  assert.equal(Chant.state(track,54.5,1).text,'busy');
  assert.equal(Chant.state(track,56.5,1).text,'Busy boy');
  assert.equal(Chant.state(track,56.5,1).mode,'countdown');
  assert.equal(Chant.state(track,58.1,1).text,'Busy boy');
  const ordinary=songs[0].chant;
  assert.equal(Chant.state(ordinary,0,1).text,ordinary.cues[0].text);
});

test('YoYo retains requested fan source and excludes ordinary lyrics',()=>{
  const song=songs.find(s=>s.title==='YoYo');
  assert.equal(song.number,10);
  assert.equal(song.sources[0].videoId,'ykVJo0wFlQ4');
  assert.match(song.sources[0].kind,/ゆっぴー/);
  assert.ok(!song.sources[0].kind.includes('官方'));
  assert.equal(song.sources[0].startSeconds,undefined);
  const cues=song.chant.cues;
  assert.ok(!cues.some(c=>/We're going|Swing me like|Lead me|Find/.test(c.text)));
  assert.equal(cues.filter(c=>c.text==='Up down, up down, up down').length,8);
  assert.equal(cues.filter(c=>c.text==='（歡呼）').length,3);
  assert.equal(cues.find(c=>c.sourceIds[0]==='ykVJo0wFlQ4-3').text,'찾아내');
  assert.equal(cues.find(c=>c.sourceIds[0]==='ykVJo0wFlQ4-48').text,'소나기');
});

test('YoYo waits through the preceding lyrics before the response words enter',()=>{
  const track=songs.find(s=>s.title==='YoYo').chant;
  // Source says "Find 자 어서 날 찾아내": only the final word is blue.
  assert.notEqual(Chant.state(track,11,1).mode,'active');
  assert.equal(Chant.state(track,13.4,1).mode,'active');
  assert.equal(Chant.state(track,13.4,1).text,'찾아내');
  // "눈 가린 다음 그 감각에" must not activate 집중해 yet.
  assert.notEqual(Chant.state(track,15,1).mode,'active');
  assert.equal(Chant.state(track,18,1).mode,'active');
  assert.equal(Chant.state(track,18,1).text,'집중해');
  // Each "We're going" remains a preview, even in later repeated choruses.
  for (const [before,entry] of [[51.6,52],[60.7,61.2],[127,127.4],[136.1,136.6],[183.1,183.5]]) {
    assert.notEqual(Chant.state(track,before,1).mode,'active');
    assert.equal(Chant.state(track,entry,1).mode,'active');
    assert.equal(Chant.state(track,entry,1).text,'Up down, up down, up down');
  }
});

test('every cue has half-open active bounds and survives backward seeking',()=>{
  for(const {chant} of songs)for(const cue of chant.cues){
    assert.equal(Chant.state(chant,cue.start,1).text,cue.text);
    assert.equal(Chant.state(chant,cue.start,1).mode,'active');
    assert.equal(Chant.state(chant,cue.end-.001,1).text,cue.text);
    const after=Chant.state(chant,cue.end,1);
    if(!chant.cues.some(c=>c.start===cue.end))assert.notEqual(after.mode,'active');
    assert.equal(Chant.state(chant,cue.start,2).label,'已暫停');
    assert.equal(Chant.state(chant,cue.start,1).text,cue.text);
  }
});

test('visual source corrections retain ordinary-lyric exclusions and repeated phrases',()=>{
  const pretty=songs.find(song=>song.title==='Pretty Girl').chant.cues;
  assert.ok(!pretty.some(c=>c.text.includes('카라선배')));
  const finalGirl=pretty.filter(c=>c.sourceIds.some(id=>id.startsWith('RX592yMx7P0-199')));
  assert.ok(finalGirl.length);assert.ok(finalGirl.every(c=>!c.text.includes('Pretty Girl')));
  const uh=songs.find(song=>song.title==='UhUh').chant.cues;
  assert.equal(uh.filter(c=>c.text==='You gonna shout it out').length,2);
  assert.equal(uh.find(c=>c.sourceIds[0]==='s1S-lnU-yMI-1').start,28);
  const heart=songs.find(song=>song.title==='Heart Drop').chant.cues.filter(c=>c.sourceIds[0].startsWith('VKlrVbgJG-g-38-'));
  assert.equal(heart.length,2);assert.equal(heart[0].text,'레');assert.ok(heart[0].end<=heart[1].start);
  assert.equal(songs.find(song=>song.title==='Glow Up').chant.cues.find(c=>c.sourceIds[0]==='-55bUrG1qjg-35').text,'I');
});

test('invalid and overlapping tracks remain disabled',()=>{
  const base=songs[0].chant;
  assert.equal(Chant.validTrack({...base,cues:[{start:1,end:2,text:'x'},{start:1.5,end:3,text:'y'}]},base.videoId),false);
  assert.equal(Chant.validTrack({...base,cues:[{start:2,end:2,text:'x'}]},base.videoId),false);
  assert.equal(Chant.validTrack({...base,cues:[]},base.videoId),false);
});

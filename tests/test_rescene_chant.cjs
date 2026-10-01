'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Chant=require('../rescene/chant.js');
const songs=require('../rescene/songs.json');

test('419 source-bound cards have unique provenance and valid boundaries',()=>{
  assert.deepEqual(songs.map(s=>s.chant.cues.length),[52,40,46,35,34,46,28,30,31,29,48]);
  const ids=new Set();
  for(const song of songs){
    const track=song.chant,id=song.sources[0].videoId;
    assert.equal(Chant.validTrack(track,id),true);
    assert.equal(Chant.validTrack(track,'unrelated-video'),false);
    assert.equal(track.status,song.title==='Busy Boy'?'model_aligned_listening_pending':'visual_checked_listening_pending');
    assert.equal(track.timingBasis,song.title==='Busy Boy'?'word-aligned':'caption');
    for(const cue of track.cues){
      assert.ok(cue.sourceIds.length);
      for(const source of cue.sourceIds){assert.ok(source.startsWith(id+'-'));assert.ok(!ids.has(source));ids.add(source);}
      assert.ok(!cue.text.includes(' / '));
    }
  }
  assert.equal(ids.size,419);
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
  assert.equal(Chant.state(track,54.2,1).mode,'countdown');
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
  const pretty=songs[0].chant.cues;
  assert.ok(!pretty.some(c=>c.text.includes('카라선배')));
  const finalGirl=pretty.filter(c=>c.sourceIds.some(id=>id.startsWith('RX592yMx7P0-199')));
  assert.ok(finalGirl.length);assert.ok(finalGirl.every(c=>!c.text.includes('Pretty Girl')));
  const uh=songs[2].chant.cues;
  assert.equal(uh.filter(c=>c.text==='You gonna shout it out').length,2);
  assert.equal(uh.find(c=>c.sourceIds[0]==='s1S-lnU-yMI-1').start,28);
  const heart=songs[6].chant.cues.filter(c=>c.sourceIds[0].startsWith('VKlrVbgJG-g-38-'));
  assert.equal(heart.length,2);assert.equal(heart[0].text,'레');assert.ok(heart[0].end<heart[1].start);
  assert.equal(songs[4].chant.cues.find(c=>c.sourceIds[0]==='-55bUrG1qjg-35').text,'I');
});

test('invalid and overlapping tracks remain disabled',()=>{
  const base=songs[0].chant;
  assert.equal(Chant.validTrack({...base,cues:[{start:1,end:2,text:'x'},{start:1.5,end:3,text:'y'}]},base.videoId),false);
  assert.equal(Chant.validTrack({...base,cues:[{start:2,end:2,text:'x'}]},base.videoId),false);
  assert.equal(Chant.validTrack({...base,cues:[]},base.videoId),false);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Chant=require('../rescene/chant.js');
const songs=require('../rescene/songs.json');

test('342 source-bound cards have unique provenance and valid boundaries',()=>{
  assert.deepEqual(songs.map(s=>s.chant.cues.length),[52,40,46,35,34,46,28,30,31]);
  const ids=new Set();
  for(const song of songs){
    const track=song.chant,id=song.sources[0].videoId;
    assert.equal(Chant.validTrack(track,id),true);
    assert.equal(Chant.validTrack(track,'unrelated-video'),false);
    assert.equal(track.status,'visual_checked_listening_pending');
    assert.equal(track.timingBasis,'caption');
    for(const cue of track.cues){
      assert.ok(cue.sourceIds.length);
      for(const source of cue.sourceIds){assert.ok(source.startsWith(id+'-'));assert.ok(!ids.has(source));ids.add(source);}
      assert.ok(!cue.text.includes(' / '));
    }
  }
  assert.equal(ids.size,342);
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

const {test}=require('node:test');
const assert=require('node:assert/strict');
const songs=require('../babymonster/songs.json');
const Chant=require('../babymonster/chant.js');
const Subtitles=require('../babymonster/subtitles.js');
const song=songs.find(s=>s.number===15);

test('Stuck binds both tracks to the requested stage and marks only the final chorus',()=>{
  assert.equal(song.sources[0].videoId,'KaM7ZxoGQuE');
  assert.ok(Chant.validTrack(song.chant,'KaM7ZxoGQuE'));
  assert.ok(Subtitles.validTrack(song.subtitles,'KaM7ZxoGQuE'));
  assert.equal(song.subtitles.cues.length,86);
  assert.equal(song.chant.cues.length,10);
  assert.ok(song.subtitles.cues.slice(0,76).every(c=>c.parts.every(p=>!p.chant)));
  assert.ok(song.subtitles.cues.slice(76).every(c=>c.parts.every(p=>p.chant)));
  assert.ok(!/[\u3040-\u30ff]/.test(JSON.stringify([song.chant,song.subtitles])));
  assert.equal(Subtitles.at(song.subtitles,0,1),null);
  for(const cue of song.chant.cues){
    assert.equal(Chant.state(song.chant,cue.start,1).mode,'active');
    assert.equal(Chant.state(song.chant,cue.start,2).mode,'paused');
    assert.equal(Chant.state(song.chant,cue.end-.001,1).text,cue.text);
    assert.notEqual(song.chant.cues.find(c=>c.start<=cue.end && cue.end<c.end),cue);
  }
  assert.equal(Subtitles.at(song.subtitles,255,1),null);
});

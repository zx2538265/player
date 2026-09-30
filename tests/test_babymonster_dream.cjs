const {test}=require('node:test');
const assert=require('node:assert/strict');
const Chant=require('../babymonster/chant.js');
const Subtitles=require('../babymonster/subtitles.js');
const song=require('../babymonster/songs.json').find(s=>s.number===17);
test('DREAM binds both tracks to the requested video and keeps Japanese out of display',()=>{
  assert.equal(song.title,'DREAM');
  assert.equal(song.sources[0].videoId,'ynOtYmpZxak');
  assert.ok(Chant.validTrack(song.chant,'ynOtYmpZxak'));
  assert.ok(Subtitles.validTrack(song.subtitles,'ynOtYmpZxak'));
  assert.equal(Chant.validTrack(song.chant,'other'),false);
  const text=JSON.stringify([song.chant.cues,song.subtitles.cues]);
  assert.doesNotMatch(text,/[\u3040-\u30ff]/);
  assert.match(song.note,/尚未完成/);
});
test('DREAM chants only the marked calls and translated actions in the final section',()=>{
  assert.deepEqual(song.chant.cues.map(c=>c.text),[
    '（跟著節奏拍手）','（跟著節奏拍手）','（跟著節奏拍手）',
    'hey!','say!','game!','yeah! yeah! yeah!','（歡呼）'
  ]);
  for(const t of [6,60,90,124,136]) assert.notEqual(Chant.state(song.chant,t,1).mode,'active');
  const response=song.subtitles.cues.find(c=>c.parts.some(p=>p.text.includes('(say!)')));
  assert.equal(response.parts.find(p=>p.text==='say').chant,false);
  assert.equal(response.parts.find(p=>p.text===' (say!)').chant,true);
  for(const cue of song.chant.cues){
    assert.equal(Chant.state(song.chant,cue.start,1).text,cue.text);
    assert.equal(Chant.state(song.chant,cue.start,2).mode,'paused');
    const next=song.chant.cues.find(c=>c.start===cue.end);
    assert.equal(Chant.state(song.chant,cue.end,1).mode==='active',!!next);
  }
});

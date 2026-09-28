const {test}=require('node:test');
const assert=require('node:assert/strict');
const songs=require('../babymonster/songs.json');
const C=require('../babymonster/chant.js');
const S=require('../babymonster/subtitles.js');
const song=songs.find(s=>s.number===20), id='MN2RlOy8y8k';
test('BILLIONAIRE binds both timelines to the requested video',()=>{
 assert.equal(song.sources[0].videoId,id);
 assert.ok(C.validTrack(song.chant,id));assert.ok(S.validTrack(song.subtitles,id));
 assert.equal(C.validTrack(song.chant,'other'),false);
 assert.equal(S.validTrack(song.subtitles,'other'),false);
 assert.equal(song.subtitles.cues.length,54);assert.equal(song.chant.cues.length,33);
});
test('Sheet red spans are retained while Japanese is omitted',()=>{
 const captions=song.subtitles.cues;
 const text=captions.flatMap(c=>c.parts.map(p=>p.text)).join('\n');
 assert.ok(!/[\u3040-\u30ff]|Arigato|歡呼/.test(text));
 for(const word of ['woah','unfair','compare'])assert.equal(song.chant.cues.filter(c=>c.text===word).length,3);
 for(const word of ['click','rich']) {
  const caption=captions.find(c=>c.parts.some(p=>p.chant&&p.text===word));
  const chant=song.chant.cues.find(c=>c.text===word);
  assert.ok(chant.start>caption.start);
 }
});
test('Seek, pause, rate and ending use source clock',()=>{
 for(const cue of song.chant.cues) {
  assert.ok(cue.end<=165);
  for(const rate of [.5,1,2])assert.equal(C.state(song.chant,cue.start,1,rate).text,cue.text);
  assert.equal(C.state(song.chant,cue.start,2).mode,'paused');
 }
 for(const cue of song.subtitles.cues) {
  assert.equal(S.at(song.subtitles,cue.start,2),cue);
  assert.notEqual(S.at(song.subtitles,cue.end,1),cue);
 }
 assert.equal(S.at(song.subtitles,165,1),null);
});

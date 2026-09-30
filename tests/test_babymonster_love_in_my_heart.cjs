const {test}=require('node:test');
const assert=require('node:assert/strict');
const songs=require('../babymonster/songs.json');
const C=require('../babymonster/chant.js');
const S=require('../babymonster/subtitles.js');
const song=songs.find(s=>s.number===27), id='XtaFQ31C7OU';
test('Love In My Heart binds lyrics and chants to the requested concert',()=>{
 assert.equal(song.sources[0].videoId,id);
 assert.ok(C.validTrack(song.chant,id));assert.ok(S.validTrack(song.subtitles,id));
 assert.equal(C.validTrack(song.chant,'other'),false);
 assert.equal(S.validTrack(song.subtitles,'other'),false);
 assert.equal(song.subtitles.cues.length,69);assert.equal(song.chant.cues.length,33);
});
test('Sheet red spans are highlighted and Japanese annotations are excluded',()=>{
 const captions=song.subtitles.cues;
 const text=captions.flatMap(c=>c.parts.map(p=>p.text)).join('\n');
 assert.ok(!/[\u3040-\u30ff]|Arigato|아리가|歡呼|揮燈/.test(text));
 for(const word of ['처럼','없어','질러','있어','day and night','매일매일','down bad','into you']) {
  const caption=captions.find(c=>c.parts.some(p=>p.chant&&p.text===word));
  const chant=song.chant.cues.find(c=>c.text===word);
  assert.ok(caption&&chant,word);assert.ok(chant.start>=caption.start);
 }
 assert.equal(song.chant.cues.filter(c=>c.text==='Ay ay ay ay ay ay ay ay').length,8);
 assert.equal(song.chant.cues.filter(c=>c.text==='Give you all of the love in my heart').length,14);
});
test('Clock-driven lyric and chant boundaries support seek, pause and rate changes',()=>{
 for(const cue of song.chant.cues) {
  assert.ok(cue.end<=205);
  for(const rate of [.5,1,2])assert.equal(C.state(song.chant,cue.start,1,rate).text,cue.text);
  assert.equal(C.state(song.chant,cue.start,2).mode,'paused');
 }
 for(const cue of song.subtitles.cues) {
  assert.equal(S.at(song.subtitles,cue.start,2),cue);
  assert.notEqual(S.at(song.subtitles,cue.end,1),cue);
 }
 assert.equal(S.at(song.subtitles,219,1),null);
});

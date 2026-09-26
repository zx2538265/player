const {test} = require('node:test');
const assert = require('node:assert/strict');
const songs = require('../babymonster/songs.json');
const Chant = require('../babymonster/chant.js');
const Subtitles = require('../babymonster/subtitles.js');
const song = songs.find(s => s.number === 17);
test('Really Like You binds supplied video and validates both tracks', () => {
 assert.equal(song.sources[0].videoId,'x5iLrIZ7YPY');
 assert.equal(song.sources[0].url,'https://www.youtube.com/watch?v=x5iLrIZ7YPY');
 assert.equal(song.hasChant,true);
 assert.equal(Chant.validTrack(song.chant,'x5iLrIZ7YPY'),true);
 assert.equal(Subtitles.validTrack(song.subtitles,'x5iLrIZ7YPY'),true);
 assert.equal(Subtitles.validTrack(song.subtitles,'other-video'),false);
 assert.equal(song.subtitles.cues.length,75);
 assert.equal(song.chant.cues.length,36);
});
test('Sheet color boundaries, all repeats and Japanese exclusion are preserved', () => {
 const captions=song.subtitles.cues;
 const text=captions.flatMap(c=>c.parts.map(p=>p.text)).join('\n');
 assert.ok(!/[\u3040-\u30ff]/u.test(text));
 assert.ok(captions.slice(0,4).every(c=>c.parts.every(p=>!p.chant)));
 assert.equal(song.chant.cues.filter(c=>c.text==='Really really like you').length,7);
 for(const word of ['light','highs','싶어','love you','Okay okay','(Hey)']) assert.equal(song.chant.cues.filter(c=>c.text===word).length,3);
 const moon=captions.filter(c=>c.parts[0].text==='And in this moon');
 assert.equal(moon.length,3);
 for(const c of moon)assert.deepEqual(c.parts,[{text:'And in this moon',chant:false},{text:'light',chant:true}]);
 const call=captions.find(c=>c.parts.some(p=>p.text==='Call back, uh'));
 const cue=song.chant.cues.find(c=>c.text==='Call back, uh');
 assert.ok(cue.start>call.start);
 assert.equal(Chant.state(song.chant,cue.start,1).text,cue.text);
 assert.equal(Chant.state(song.chant,call.start,1).mode,'countdown');
 assert.ok(!text.includes('歡呼'));
});
test('All cues support seeking, pause, speed changes and end clearing', () => {
 for(const c of song.subtitles.cues) {
  for(const state of [1,2,3])assert.equal(Subtitles.at(song.subtitles,c.start,state),c);
  assert.notEqual(Subtitles.at(song.subtitles,c.end,1),c);
  assert.equal(Subtitles.at(song.subtitles,c.start,0),null);
 }
 for(const c of song.chant.cues) {
  for(const rate of [.5,1,2])assert.equal(Chant.state(song.chant,c.start,1,rate).text,c.text);
 }
 assert.equal(Subtitles.at(song.subtitles,210,1),null);
});

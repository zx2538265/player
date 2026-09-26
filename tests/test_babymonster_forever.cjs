const {test} = require('node:test');
const assert = require('node:assert/strict');
const Chant = require('../babymonster/chant.js');
const song = require('../babymonster/songs.json').find(s => s.title === 'FOREVER');
const track = song.chant;

test('FOREVER uses the selected source and caption timing honestly', () => {
  assert.equal(song.sources[0].videoId, '6qGzeS2zfOk');
  assert.equal(Chant.validTrack(track, '6qGzeS2zfOk'), true);
  assert.equal(Chant.validTrack(track, 'another-video'), false);
  assert.equal(track.cues.length, 28);
  assert.equal(track.timingBasis, 'caption');
  assert.equal(Chant.state(track, 17.5, 1).label, '本句應援');
});

test('FOREVER preserves blue text, separate repetitions and explicit actions', () => {
  assert.equal(track.cues.filter(c => c.text.split('\n')[0] === 'Forever').length, 9);
  assert.equal(track.cues.filter(c => c.text.includes('拍手')).length, 7);
  assert.equal(track.cues[0].text, 'ok ok ok');
  assert.equal(track.cues.at(-1).text, '（歡呼）');
  const text = track.cues.map(c => c.text).join('\n');
  for (const rejected of ['Alright','So you can say goodbye','Pull up on me','그러니까','아니','멋대로','언니','Like I’m gonna live'])
    assert.ok(!text.includes(rejected), rejected);
  for (const expected of ['bye bye bye','예뻐 / 바빠 / 나빠','B A B Y M O N','money in the bag','착각하지는 마'])
    assert.ok(text.includes(expected), expected);
  for (const gap of [10,14,22,30,40,55,90,107,130,160,181,190,208])
    assert.notEqual(Chant.state(track,gap,1).mode,'active');
});

test('FOREVER supports seeking, repeat playback, pause, rates and exclusive ends', () => {
  for (const cue of [...track.cues].reverse()) for (const rate of [.5,1,2]) {
    assert.equal(Chant.state(track,cue.start,1,rate).text,cue.text);
    assert.equal(Chant.state(track,cue.start,2,rate).mode,'paused');
    assert.equal(Chant.state(track,cue.end,1,rate).mode === 'active',track.cues.some(c => c.start === cue.end));
  }
  assert.equal(Chant.state(track,212.8,0).mode,'ended');
});

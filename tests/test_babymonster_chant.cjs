const {test} = require('node:test');
const assert = require('node:assert/strict');
const Chant = require('../babymonster/chant.js');
const songs = require('../babymonster/songs.json');
const song = songs[0], track = song.chant;

test('WE GO UP is bound to the requested source and segment', () => {
  assert.equal(song.title, 'WE GO UP');
  assert.equal(song.hasChant, true);
  assert.equal(song.sources[0].videoId, 'x4b_9YdhT8M');
  assert.deepEqual([song.sources[0].startSeconds, song.sources[0].endSeconds], [31,216]);
  assert.equal(Chant.validTrack(track, 'x4b_9YdhT8M'), true);
  assert.equal(Chant.validTrack(track, 'other-source'), false);
  assert.equal(track.cues.length, 50);
  assert.ok(track.cues.every(c => c.start >= 31 && c.end <= 216));
  assert.ok(songs.slice(1).every(s => !s.hasChant && !s.chant));
});

test('source-marked chants retain rapid phrases and exclude unmarked lyrics', () => {
  const text = track.cues.map(c => c.text).join('\n');
  for (const phrase of ['Lookin’ good', 'Lookin’ fly', 'Lookin’ brand new', 'B.A.B.Y.M.O.N', 'Copy copy copy copy', '（接著歡呼）']) assert.ok(text.includes(phrase));
  for (const lyric of ['like whoa','Up high for me baby','This is how we do it','Unbelievable','till the error pop up']) assert.ok(!text.includes(lyric));
  assert.equal(track.cues.filter(c => c.text.includes('Lookin’ good')).length, 2);
});

test('every cue supports replay, exclusive ends, speed and paused states', () => {
  for (const cue of [...track.cues].reverse()) for (const rate of [.5,1,2]) {
    assert.equal(Chant.state(track,cue.start,1,rate).text,cue.text);
    assert.equal(Chant.state(track,cue.start,1,rate).mode,'active');
    assert.equal(Chant.state(track,cue.end,1,rate).mode === 'active',track.cues.some(c => c.start === cue.end));
    for (const state of [-1,2,3,5]) {
      assert.equal(Chant.state(track,cue.start,state,rate).mode,'paused');
      assert.equal(Chant.state(track,cue.start,state,rate).count,'');
    }
  }
  assert.equal(Chant.state(track,track.cues[0].start-1.5,1,.5).count,'3');
});

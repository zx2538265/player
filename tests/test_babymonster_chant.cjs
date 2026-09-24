const {test} = require('node:test');
const assert = require('node:assert/strict');
const Chant = require('../babymonster/chant.js');
const songs = require('../babymonster/songs.json');
const song = songs[0], track = song.chant;

test('WE GO UP is bound to the requested source and segment', () => {
  assert.equal(song.title, 'WE GO UP');
  assert.equal(song.hasChant, true);
  assert.equal(song.sources[0].videoId, 'x4b_9YdhT8M');
  assert.deepEqual([song.sources[0].startSeconds, song.sources[0].endSeconds], [31,220]);
  assert.equal(Chant.validTrack(track, 'x4b_9YdhT8M'), true);
  assert.equal(Chant.validTrack(track, 'other-source'), false);
  assert.equal(track.cues.length, 50);
  assert.ok(track.cues.every(c => c.start >= 31 && c.end <= 220));
  assert.ok(songs.slice(3).every(s => !s.hasChant && !s.chant));
});

test('CHOOM uses the requested segment and highlighted chants only', () => {
  const song = songs[1], track = song.chant;
  assert.equal(song.title, 'CHOOM');
  assert.equal(song.hasChant, true);
  assert.equal(song.sources[0].videoId, '9DlDGxKQsDg');
  assert.deepEqual([song.sources[0].startSeconds, song.sources[0].endSeconds], [30,205]);
  assert.equal(Chant.validTrack(track, '9DlDGxKQsDg'), true);
  assert.equal(Chant.validTrack(track, 'x4b_9YdhT8M'), false);
  assert.equal(track.cues.length, 37);
  const text = track.cues.map(c => c.text).join('\n');
  for (const phrase of ['1, 2 heat is on', '3, 4 BABYMON', 'I’m a MONSTER queen', 'Na na na', 'Watch out watch out']) assert.ok(text.includes(phrase));
  for (const lyric of ['Own it', 'Let’s choom', 'watch me set the mood', 'We wanna ride this vibe']) assert.ok(!text.includes(lyric));
  assert.equal(track.cues.filter(c => c.text.includes('Choom /')).length, 4);
  for (const [i, cue] of track.cues.entries()) {
    assert.ok(30 <= cue.start && cue.start < cue.end && cue.end <= 205);
    assert.ok(i === 0 || track.cues[i-1].end <= cue.start);
    for (const rate of [.5,1,2]) {
      assert.equal(Chant.state(track,cue.start,1,rate).text,cue.text);
      assert.equal(Chant.state(track,cue.start,2,rate).mode,'paused');
    }
  }
  assert.notEqual(Chant.state(track,205,1,1).mode,'active');
});

test('source-marked chants retain rapid phrases and exclude unmarked lyrics', () => {
  const text = track.cues.map(c => c.text).join('\n');
  for (const phrase of ['Lookin’ good', 'Lookin’ fly', 'Lookin’ brand new', 'B.A.B.Y.M.O.N', 'Copy copy copy copy', '（接著歡呼）']) assert.ok(text.includes(phrase));
  for (const lyric of ['like whoa','Up high for me baby','This is how we do it','Unbelievable','till the error pop up']) assert.ok(!text.includes(lyric));
  assert.equal(track.cues.filter(c => c.text.includes('Lookin’ good')).length, 2);
});

test('every cue supports replay, exclusive ends, speed and paused states', () => {
  for (const track of songs.filter(s => s.chant).map(s => s.chant))
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

test('BATTER UP uses the confirmed source and only its red chant text', () => {
  const song = songs.find(s => s.number === 3), track = song.chant;
  assert.equal(song.hasChant, true);
  assert.equal(song.sources[0].videoId, 'CRSVJA-dKWo');
  assert.equal(Chant.validTrack(track, 'CRSVJA-dKWo'), true);
  assert.equal(Chant.validTrack(track, '9DlDGxKQsDg'), false);
  assert.equal(track.cues.length, 34);
  assert.ok(track.cues.every(c => c.start >= 0 && c.end <= 192));
  const text = track.cues.map(c => c.text).join('\n');
  for (const phrase of ['RUKA PHARITA ASA', 'AHYEON RAMI RORA CHIQUITA', 'Going going gone (gone)', '비켜', '어디든', 'Batter up up up up']) assert.ok(text.includes(phrase));
  for (const lyric of ["I'm on a mission", 'Remember Me', 'Sting like a bee', 'We are the', 'Let me show you who we are']) assert.ok(!text.includes(lyric));
  assert.equal(track.cues.filter(c => c.text === '（歡呼）').length, 5);
  assert.equal(track.cues.filter(c => c.text === 'BABYMONSTER Batter Up').length, 4);
  assert.deepEqual(track.cues.at(-1), {start:186.7,end:189,text:'（歡呼）'});
  const encore = songs.find(s => s.number === 26);
  assert.equal(encore.hasChant, false);
  assert.deepEqual(encore.sources, []);
  assert.equal(encore.chant, undefined);
});

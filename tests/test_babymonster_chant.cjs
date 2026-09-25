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
  assert.ok(songs.slice(4).every(s => !s.hasChant && !s.chant));
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

test('BATTER UP inline responses wait for their own entrance and retain source phonetics', () => {
  const track = songs.find(s => s.number === 3).chant;
  for (const [index, captionStart, entrance] of [
    [3,30.8,32.15], [4,32.5,34], [11,75.5,76.99], [12,77.2,78.73],
    [13,84.6,85.24], [14,88.4,88.94], [15,90,92.65], [16,93.4,96.33],
    [17,104.6,106.01], [18,106.6,107.82],
    [25,158.3,160], [26,160.8,161.87], [27,163.2,167.21],
    [29,172.8,174.79], [30,175.5,176.63], [31,178.1,181.95],
  ]) {
    const cue = track.cues[index];
    assert.equal(cue.start, entrance);
    const early = Chant.state(track, captionStart, 1);
    assert.ok(early.mode !== 'active' || early.text !== cue.text);
    assert.equal(Chant.state(track, entrance, 1).text, cue.text);
    assert.equal(Chant.state(track, entrance, 1).mode, 'active');
  }
  assert.equal(track.cues[15].text, '비켜 · bi-kyeo\n逼ㄎㄧㄜ');
  for (const i of [27,31]) assert.equal(track.cues[i].text, '어디든 · eo-di-deun\n歐滴蹬');
});

test('DRIP binds its pink-only prompts to the requested 00:52–03:52 source', () => {
  const song = songs[3], track = song.chant;
  assert.equal(song.title, 'DRIP');
  assert.equal(song.sources[0].videoId, 'X2GfGkH-3hg');
  assert.deepEqual([song.sources[0].startSeconds, song.sources[0].endSeconds], [52,232]);
  assert.equal(Chant.validTrack(track, 'X2GfGkH-3hg'), true);
  assert.equal(Chant.validTrack(track, 'CRSVJA-dKWo'), false);
  assert.equal(track.cues.length, 42);
  assert.ok(track.cues.every(c => c.start >= 52 && c.end <= 232));
  assert.equal(track.cues.filter(c => c.text.includes('第 1、3、5、7 聲')).length, 4);
  assert.ok(track.cues.some(c => c.text === '（握拳高舉）MONSTIEZ'));
  const text = track.cues.map(c => c.text).join('\n');
  for (const lyric of ['passion', 'ambition', 'came to conquer', 'You know we got', 'ice cream']) assert.ok(!text.includes(lyric));
  assert.equal(Chant.state(track, 60, 1).mode, 'countdown');
  assert.equal(Chant.state(track, 232, 1).mode, 'waiting');
});

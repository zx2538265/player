const {test} = require('node:test');
const assert = require('node:assert/strict');
const Chant = require('../bigbang/chant.js');
const songs = require('../bigbang/songs.json');
const track = songs[0].chant;

test('track is specific to the embedded video, sorted and within its duration', () => {
  assert.equal(Chant.validTrack(track, songs[0].sources[0].videoId), true);
  assert.equal(Chant.validTrack(track, 'different-version'), false);
  assert.equal(track.cues.length, 37);
  assert.ok(track.cues.every(c => c.end <= 230));
  assert.ok(songs.slice(3).every(s => !s.chant));
  assert.equal(Chant.validTrack({...track, cues:[{start:1,end:2,text:'a'},{start:1.5,end:3,text:'b'}]},track.videoId),false);
});
test('HANDS UP and TONIGHT bind reviewed chants to the specified sources', () => {
  for (const [index, videoId, count, duration] of [[1,'0o7qE6pCxI0',12,232.2],[2,'pJGOF3l2_88',38,220.053]]) {
    const song = songs[index], t = song.chant;
    assert.equal(song.sources[0].videoId, videoId);
    assert.equal(Chant.validTrack(t, videoId), true);
    assert.equal(t.cues.length, count);
    assert.ok(t.cues.every(c => c.end <= duration));
    for (const other of songs.filter(s => s.chant && s !== song)) {
      assert.equal(Chant.validTrack(t, other.chant.videoId), false);
    }
    for (const cue of [...t.cues].reverse()) {
      for (const rate of [0.5,1,2]) {
        assert.equal(Chant.state(t,cue.start,1,rate).text,cue.text);
        assert.equal(Chant.state(t,cue.start,1,rate).mode,'active');
        assert.equal(Chant.state(t,cue.start,2,rate).mode,'paused');
        assert.equal(Chant.state(t,cue.start,2,rate).count,'');
      }
      assert.equal(Chant.state(t,cue.end,1).mode === 'active',t.cues.some(c => c.start === cue.end));
    }
  }
  assert.deepEqual([...new Set(songs[1].chant.cues.map(c => c.text))],['HEY HO HEY HO','HANDS UP HIGH HIGH & LOW']);
  assert.equal(songs[2].chant.cues.find(c => c.start === 109.5).text,'娜 娜 娜');
  assert.ok(!songs[2].chant.cues.some(c => /去找尋|我依然|GO GO/.test(c.text)));
});
test('preview, 3/2/1, exact start and exclusive end', () => {
  const t = {cues:[{start:10,end:12,text:'GO'},{start:20,end:22,text:'NEXT'}]};
  assert.equal(Chant.state(t,6,1).mode,'waiting');
  for (const [time,count] of [[7,'3'],[8,'2'],[9,'1']]) assert.equal(Chant.state(t,time,1).count,count);
  assert.equal(Chant.state(t,10,1).mode,'active');
  assert.equal(Chant.state(t,10,1).next,'下一句：NEXT');
  assert.equal(Chant.state(t,12,1).text,'NEXT');
  assert.equal(Chant.state(t,12,1).mode,'waiting');
});
test('countdown uses actual seconds at slower and faster rates', () => {
  const t = {cues:[{start:10,end:12,text:'GO'}]};
  assert.equal(Chant.state(t,8.5,1,0.5).count,'3');
  assert.equal(Chant.state(t,7,1,0.5).count,'');
  assert.equal(Chant.state(t,4,1,2).count,'3');
});
test('pause, buffering and unstarted states never urge the user to shout', () => {
  for (const state of [-1,2,3,5]) {
    assert.equal(Chant.state(track,29, state).count,'');
    assert.equal(Chant.state(track,30, state).mode,'paused');
  }
});
test('seeking backwards and repeated passages derive state from the current clock', () => {
  for (const time of [200,30,150,30]) {
    const expected = track.cues.find(c => c.start <= time && time < c.end) || track.cues.find(c => c.start > time);
    assert.equal(Chant.state(track,time,1).text,expected.text);
  }
  assert.equal(Chant.state(track,230,0).mode,'ended');
  assert.equal(Chant.state(track,230,1).count,'');
  assert.equal(Chant.state(track,0,1).text,track.cues[0].text);
});
test('every cue enters and exits correctly including adjacent repeated phrases', () => {
  for (const cue of track.cues) {
    assert.equal(Chant.state(track,cue.start,1).mode,'active');
    assert.equal(Chant.state(track,cue.start,1).text,cue.text);
    const atEnd = Chant.state(track,cue.end,1);
    assert.equal(atEnd.mode === 'active',track.cues.some(c=>c.start === cue.end));
  }
});

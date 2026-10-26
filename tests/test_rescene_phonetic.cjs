'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Chant = require('../rescene/chant.js');
const songs = require('../rescene/songs.json');

test('all Korean chant cards have phonetics while sources and raw text remain available', () => {
  const tracks = songs.filter(s => s.chant?.phoneticStatus);
  assert.equal(tracks.length, 11);
  let count = 0;
  for (const song of tracks) {
    assert.equal(Chant.validTrack(song.chant, song.chant.videoId), true);
    for (const cue of song.chant.cues) {
      if (!/[가-힣]/u.test(cue.text)) {assert.equal(cue.phoneticZh, undefined);continue;}
      count++;
      assert.ok(cue.phoneticZh.trim());
      assert.ok(!/[가-힣]/u.test(cue.phoneticZh));
    }
  }
  assert.equal(count, 122);
  assert.ok(tracks.every(s => s.chant.phoneticStatus === 'draft'));
});

test('clock selects phonetics on countdown, entry, pause, rewind and next cue', () => {
  const track = {videoId:'demo',cues:[
    {start:5,end:6,text:'예뻐',phoneticZh:'耶波'},
    {start:8,end:9,text:'바빠',phoneticZh:'巴爸'},
    {start:12,end:13,text:'Hey'}
  ]};
  for (const rate of [.5,1,2]) {
    assert.equal(Chant.state(track,4,1,rate).phoneticZh,'耶波');
    assert.equal(Chant.state(track,5,1,rate).text,'예뻐');
    assert.equal(Chant.state(track,5,1,rate).next,'下一句：巴爸');
    assert.equal(Chant.state(track,5,2,rate).phoneticZh,'耶波');
    assert.equal(Chant.state(track,6,1,rate).phoneticZh,'巴爸');
    assert.equal(Chant.state(track,12,1,rate).phoneticZh,'');
    assert.equal(Chant.state(track,5,1,rate).phoneticZh,'耶波');
  }
  assert.equal(Chant.state(track,5,0).phoneticZh,undefined);
  assert.equal(Chant.validTrack({...track,cues:[{...track.cues[0],phoneticZh:42}]},'demo'),false);
});

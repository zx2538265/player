const {test} = require('node:test');
const assert = require('node:assert/strict');
const Chant = require('../bigbang/chant.js');
const songs = require('../bigbang/songs.json');

test('three requested sources keep absolute, ordered cue clocks across seek and rate changes', () => {
  for (const [number,id,count,duration] of [[17,'SUIk41CrzoY',26,186.767],[24,'TAzEIscz-8g',21,198.399],[26,'RneSiB721hM',22,210.48]]) {
    const song = songs.find(s => s.number === number), track = song.chant;
    assert.equal(song.sources[0].videoId,id);
    assert.equal(song.sources[0].startSeconds,undefined);
    assert.equal(Chant.validTrack(track,id),true);
    assert.equal(track.cues.length,count);
    assert.match(track.note,/暫定/);
    assert.match(track.note,/聽校/);
    for (const other of songs.filter(s => s.chant && s !== song)) assert.equal(Chant.validTrack(track,other.chant.videoId),false);
    // Reverse traversal exercises backwards seeks, not just a forward playthrough.
    for (const cue of [...track.cues].reverse()) {
      assert.ok(cue.end <= duration);
      assert.ok(cue.text.split('\n').length <= 4);
      for (const rate of [.25,.5,1,1.5,2]) {
        const active = Chant.state(track,cue.start,1,rate);
        assert.equal(active.mode,'active'); assert.equal(active.text,cue.text);
        for (const state of [-1,2,3,5]) {
          assert.equal(Chant.state(track,cue.start,state,rate).mode,'paused');
          assert.equal(Chant.state(track,cue.start-.1,state,rate).count,'');
        }
        assert.equal(Chant.state(track,cue.end,1,rate).mode==='active',track.cues.some(c => c.start===cue.end));
      }
    }
    for (const rate of [.5,1,2]) {
      const start = track.cues[0].start;
      for (const count of [3,2,1]) assert.equal(Chant.state(track,start-count*rate,1,rate).count,String(count));
    }
  }
});

test('cards distinguish chants from blue/white lyrics and unresolved source marks', () => {
  const lf=songs[16].chant,party=songs[23].chant,home=songs[25].chant;
  assert.ok(!lf.cues.some(c => /給我走|Play the game|安娜|爬欄|Life is/.test(c.text)));
  assert.ok(!lf.cues.some(c => c.start>=149.7 && c.start<153.3)); // This Okay let's go is blue, not yellow.
  assert.ok(lf.cues.some(c => c.text==='key打留守'));
  assert.equal(lf.cues.filter(c => c.text==='game → pain\ncup → love').length,4);
  assert.ok(!party.cues.some(c => /拍手|尖叫|DJ PLAY|MAN HOW|너 없인/.test(c.text)));
  // All six formerly withheld source-marked chants must remain represented.
  for (const [time,text] of [[14.5,'哇嗽'],[17.3,'WHATS UP!'],[52.5,'One Two Three Four'],[81.3,'拿嘎勒'],[142.5,'YEAH'],[154,'波勾 西剖\n啾給嗽']]) {
    assert.equal(Chant.state(party,time,1).text,text);
    assert.equal(Chant.state(party,time,1).mode,'active');
  }
  assert.equal(party.cues.filter(c => c.text==='One Two Three Four').length,2);
  assert.match(party.note,/先補入原先保留的 6 段/);
  assert.equal(party.cues.filter(c => c.text.startsWith('WE LIKE 2 PARTY')).length,12);
  assert.ok(!home.cues.some(c => /尖叫|甜蜜|想念|Home sick home/.test(c.text)));
  assert.equal(home.cues.filter(c => /重複 2 次/.test(c.text)).length,3);
  assert.equal(home.cues.at(-1).end,205.3); // Stop before the non-spoken scream instruction.
});

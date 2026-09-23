const {test} = require('node:test');
const assert = require('node:assert/strict');
const Chant = require('../bigbang/chant.js');
const songs = require('../bigbang/songs.json');

test('songs 19–22 use only their specified video clocks and valid mobile cards', () => {
  for (const [number,id,count,duration] of [
    [19,'FbIaV8DBl4c',27,198.567], [20,'H_eKri5ENwk',29,226.327],
    [21,'05LkUTqWiP4',17,221.922], [22,'hLRkRxx1cM4',22,229.467]
  ]) {
    const song = songs.find(s => s.number === number), t = song.chant;
    assert.equal(song.sources[0].videoId,id);
    assert.equal(Chant.validTrack(t,id),true);
    assert.equal(t.cues.length,count);
    assert.match(t.note,/暫定/);
    assert.match(t.note,/聽校/);
    for (const other of songs.filter(s => s.chant && s !== song)) assert.equal(Chant.validTrack(t,other.chant.videoId),false);
    for (const cue of [...t.cues].reverse()) {
      assert.ok(cue.end <= duration);
      assert.ok(cue.text.split('\n').length <= 4);
      for (const rate of [.5,1,2]) {
        assert.equal(Chant.state(t,cue.start,1,rate).text,cue.text);
        assert.equal(Chant.state(t,cue.start,1,rate).mode,'active');
        assert.equal(Chant.state(t,cue.end,1,rate).mode === 'active',t.cues.some(c => c.start === cue.end));
        for (const state of [-1,2,3,5]) {
          assert.equal(Chant.state(t,cue.start,state,rate).mode,'paused');
          assert.equal(Chant.state(t,cue.start-.1,state,rate).count,'');
        }
      }
    }
  }
});

test('source colors exclude lyrics and instructions; advance display does not trigger early shouting', () => {
  const cr=songs[18].chant, cro=songs[19].chant, bb=songs[20].chant, st=songs[21].chant;
  assert.ok(!cr.cues.some(c=>/尖叫|Swag|Come on/.test(c.text)));
  assert.ok(!cro.cues.some(c=>/今晚我要|別管我|鬼吼|引導我/.test(c.text)));
  assert.ok(!bb.cues.some(c=>/拍手|꼼짝|Yea|남자|여자/.test(c.text)));
  assert.ok(!st.cues.some(c=>/Monday|oh no|I am stupid|stupid liar/i.test(c.text)));
  assert.equal(bb.cues.find(c=>c.text==='전환해').start,30.6);
  assert.equal(bb.cues.find(c=>c.text==='菩曼內').start,35.9);
  assert.equal(bb.cues.find(c=>c.text==='木蹦記').start,42.9);
  assert.notEqual(Chant.state(bb,33.5,1).mode,'active');
  assert.equal(Chant.state(bb,34.9,1).count,'1');
  assert.equal(Chant.state(bb,35.9,1).text,'菩曼內');
  assert.ok(!bb.cues.some(c=>/HEY/.test(c.text)));
  assert.ok(bb.cues.every(c=>c.end<187)); // White outro lyrics are not chants.
  assert.ok(cro.cues.some(c=>c.text==='deoreobgedojoa')); // Unclear phonetic glyph is not guessed.
  assert.ok(cr.cues.some(c=>c.text==='咪！欸！\n之勇事\nkwi喲咪'));
  assert.ok(st.cues.some(c=>c.text==='啊pull打妙\n巴bull打妙'));
});

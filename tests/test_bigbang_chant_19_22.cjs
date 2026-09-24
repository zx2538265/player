const {test} = require('node:test');
const assert = require('node:assert/strict');
const Chant = require('../bigbang/chant.js');
const songs = require('../bigbang/songs.json');

test('songs 19–22 use only their specified video clocks and valid mobile cards', () => {
  for (const [number,id,count,duration] of [
    [19,'FbIaV8DBl4c',39,198.567], [20,'H_eKri5ENwk',30,226.327],
    [21,'sBjGoMjWppg',26,221.1209], [22,'hLRkRxx1cM4',22,229.467]
  ]) {
    const song = songs.find(s => s.number === number), t = song.chant;
    assert.equal(song.sources[0].videoId,id);
    assert.equal(Chant.validTrack(t,song.sources[0].videoId),true);
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
  assert.equal(bb.cues.find(c=>c.text==='窮納內').start,29.9);
  assert.equal(bb.cues.find(c=>c.text==='布曼內').start,35.3);
  assert.equal(bb.cues.find(c=>c.text==='姆波基').start,42.4);
  assert.notEqual(Chant.state(bb,33.5,1).mode,'active');
  assert.equal(Chant.state(bb,34.3,1).count,'1');
  assert.equal(Chant.state(bb,35.9,1).text,'布曼內');
  assert.deepEqual(bb.cues.filter(c=>c.text==='Hey').map(c=>c.start),[16.9,20.4,89.8,93.3]);
  assert.equal(Chant.validTrack(bb,'05LkUTqWiP4'),false);
  for (const time of [18,21.4,31,36.2,44,52,59,66,90.6,94.2,125,132,139,175.5,177.3,184.5,187]) {
    assert.notEqual(Chant.state(bb,time,1).mode,'active');
  }
  assert.equal(Chant.state(bb,176.5,1).text,'威摟');
  assert.equal(Chant.state(bb,178.5,1).text,'Get low');
  assert.ok(bb.cues.every(c=>c.end<187)); // White outro lyrics are not chants.
  assert.equal(Chant.state(cro,72.8,1).text,'柔摟給豆糾阿'); // Phonetic text verified against the source frame.
  assert.equal(Chant.state(cro,48,1).text,'兄唧近');
  assert.equal(Chant.state(cro,119.2,1).text,'虧勾');
  for (const time of [121,125]) {
    assert.equal(Chant.state(cro,time,1).text,'蘇勾');
    assert.equal(Chant.state(cro,time,1).mode,'active');
  }
  for (const time of [121.6,122,124.4,125.3]) {
    assert.notEqual(Chant.state(cro,time,1).mode,'active');
  }
  assert.equal(Chant.state(cr,27,1).text,'G');
  assert.equal(Chant.state(cr,27.7,1).text,'D');
  assert.equal(Chant.state(cr,36,1).text,'咪！欸！');
  assert.equal(Chant.state(cr,39.6,1).text,'之勇事');
  assert.equal(Chant.state(cr,42,1).text,'kwi喲咪');
  for (const time of [37,38,40.5,106,107]) assert.notEqual(Chant.state(cr,time,1).mode,'active');
  assert.equal(Chant.state(cr,43.1,1).text,'kwi喲咪');
  assert.equal(Chant.state(cr,43.2,1).text,'之麼咪');
  assert.notEqual(Chant.state(cr,43.6,1).mode,'active');
  assert.ok(!cr.cues.some(c=>/Kim Tae Hee|Kim Hee Sun|Jun Jihyun/.test(c.text)));
  assert.notEqual(Chant.state(cr,49,1).mode,'active');
  assert.equal(Chant.state(cr,112.5,1).text,'Four!');
  assert.equal(Chant.state(cr,112.6,1).text,'高！');
  for (const time of [112.9,114.8,124.2]) assert.notEqual(Chant.state(cr,time,1).mode,'active');
  assert.equal(Chant.state(cr,71,1).text,'girls!');
  assert.equal(Chant.state(cr,72.6,1).text,'boys!');
  assert.ok(st.cues.some(c=>c.text==='啊pull打妙\n巴bull打妙'));
});

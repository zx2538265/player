const {test} = require('node:test');
const assert = require('node:assert/strict');
const songs = require('../babymonster/songs.json');
const Chant = require('../babymonster/chant.js');
const Subtitles = require('../babymonster/subtitles.js');
const song = songs.find(s => s.number === 5);

test('MOON binds the specified video and clean official source URLs', () => {
  assert.equal(song.sources[0].url,'https://www.youtube.com/watch?v=jfqBPlcBGtE');
  assert.equal(song.sources[1].url,'https://babymonster-official.jp/s/ygbm/diary/detail/453459?cd=cheer');
  assert.equal(song.hasChant,true);
  assert.equal(Chant.validTrack(song.chant,'jfqBPlcBGtE'),true);
  assert.equal(Subtitles.validTrack(song.subtitles,'jfqBPlcBGtE'),true);
  assert.equal(Subtitles.validTrack(song.subtitles,'other-video'),false);
  assert.equal(song.chant.cues.length,38);
  assert.equal(song.subtitles.cues.length,94);
});

test('MOON preserves sheet colors, Korean, separate repeats and excludes Japanese', () => {
  const captions=song.subtitles.cues;
  const text=captions.flatMap(c=>c.parts.map(p=>p.text)).join('\n');
  assert.ok(!/[\u3040-\u30ff]/u.test(text));
  for(const phrase of ['보름달 뜨는 밤','더 빨리 더 높이','까만 밤 빛이나','진짜가 나타나','세상을 불태워라','거울아 거울아','말해봐 알잖아','하늘을 봐','내 길을 가']) assert.ok(text.includes(phrase));
  for(const [prefix,response] of [['Fog ','thickens'],['Night ','vision'],['Grave ','digger'],['Go ','figure']]) {
    const c=captions.find(c=>c.parts[0].text===prefix);
    assert.deepEqual(c.parts,[{text:prefix,chant:false},{text:response,chant:true}]);
    const chant=song.chant.cues.find(x=>x.text===response);
    assert.ok(chant.start>c.start);
    assert.notEqual(Chant.state(song.chant,c.start,1).mode,'active');
    assert.equal(Chant.state(song.chant,chant.start,1).text,response);
  }
  assert.equal(song.chant.cues.filter(c=>c.text==='If you wanna ride').length,3);
  assert.equal(song.chant.cues.filter(c=>c.text==="If you wanna ride, let's ride").length,1);
  assert.equal(song.chant.cues.filter(c=>c.text==='Zalabim zalabam zalaboom').length,5);
  assert.equal(captions.some(c=>c.parts.some(p=>p.text.includes('歡呼'))),false);
  assert.equal(song.chant.cues.at(-1).text,'（歡呼）');
});

test('MOON captions recalculate on seeking and remain visible on pause', () => {
  for(const c of [...song.subtitles.cues].reverse()) {
    for(const state of [1,2,3]) assert.equal(Subtitles.at(song.subtitles,c.start,state),c);
    assert.notEqual(Subtitles.at(song.subtitles,c.end,1),c);
    assert.equal(Subtitles.at(song.subtitles,c.start,0),null);
  }
  assert.equal(Subtitles.at(song.subtitles,0,1),null);
  assert.equal(Subtitles.at(song.subtitles,183,1),null);
});

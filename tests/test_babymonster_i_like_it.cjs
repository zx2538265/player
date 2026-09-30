const {test}=require('node:test');
const assert=require('node:assert/strict');
const songs=require('../babymonster/songs.json');
const Chant=require('../babymonster/chant.js');
const Subtitles=require('../babymonster/subtitles.js');
const song=songs.find(s=>s.number===25);
test('I LIKE IT binds the requested source and preserves the encore placeholder',()=>{
  assert.equal(song.sources[0].videoId,'lFtCnJNlGnk');
  assert.equal(Chant.validTrack(song.chant,'lFtCnJNlGnk'),true);
  assert.equal(Subtitles.validTrack(song.subtitles,'lFtCnJNlGnk'),true);
  assert.equal(Subtitles.validTrack(song.subtitles,'other'),false);
  assert.equal(songs.find(s=>s.number===30).hasChant,false);
});
test('sheet red spans, repetitions and Japanese exclusion remain distinct',()=>{
  const captions=song.subtitles.cues, chants=song.chant.cues;
  assert.equal(captions.length,75);assert.equal(chants.length,31);
  const text=captions.flatMap(c=>c.parts.map(p=>p.text)).join('\n');
  assert.ok(!/[\u3040-\u30ff]/u.test(text));
  assert.equal(chants.filter(c=>c.text==='next to you').length,3);
  assert.equal(chants.filter(c=>c.text==='I la-la-like it').length,8);
  assert.equal(chants.filter(c=>c.text==='Woo woo woo').length,8);
  assert.equal(chants.filter(c=>c.text==='Woo woo woo woo woo woo').length,4);
  const mixed=captions.filter(c=>c.parts.some(p=>p.text==='next to you'));
  for(const c of mixed){assert.equal(c.parts.find(p=>p.text==='next to you').chant,true);assert.equal(c.parts[0].chant,false);}
  assert.ok(!chants.some(c=>c.text.includes('Crazy for you')||c.text.includes('歡呼')));
});
test('clock seeking, pause, speed and ending work for every new cue',()=>{
  for(const c of song.subtitles.cues){
    assert.equal(Subtitles.at(song.subtitles,c.start,2),c);
    assert.notEqual(Subtitles.at(song.subtitles,c.end,1),c);
  }
  for(const c of song.chant.cues)for(const rate of [.5,1,2]){
    assert.equal(Chant.state(song.chant,c.start,1,rate).text,c.text);
    assert.equal(Chant.state(song.chant,c.start,2,rate).mode,'paused');
  }
  assert.equal(Subtitles.at(song.subtitles,219,1),null);
});

test('chorus entrances exclude the lead-in and mixed next-to-you waits for its own words',()=>{
  const chorus=song.chant.cues.filter(c=>c.text==='I la-la-like it');
  assert.notEqual(Chant.state(song.chant,172,1).mode,'active');
  assert.equal(Chant.state(song.chant,174.5,1).text,'I la-la-like it');
  assert.notEqual(Chant.state(song.chant,180.8,1).mode,'active');
  assert.equal(Chant.state(song.chant,181.5,1).text,'I la-la-like it');
  const mixed=song.subtitles.cues.find(c=>c.parts.some(p=>p.text==='next to you'));
  const response=song.chant.cues.find(c=>c.text==='next to you');
  assert.ok(response.start>mixed.start);
  assert.notEqual(Chant.state(song.chant,179.3,1).mode,'active');
  assert.equal(Chant.state(song.chant,179.65,1).text,'next to you');
  for(const c of chorus){
    const caption=song.subtitles.cues.find(s=>s.start<=c.start && c.start<s.end);
    assert.ok(caption?.parts.some(p=>p.chant && p.text===c.text));
    assert.ok(c.end<=caption.end);
  }
});

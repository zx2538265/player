const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
async function setup(catalog = null, hash = '') {
  const elements = new Map(), players = [], timers = new Map(), intervals = [];
  const element = () => ({style:{setProperty(){}}, focus(){}, dataset:{}, checked:false, children:[], append(...items){this.children.push(...items)}, replaceChildren(...items){this.children=items}, setAttribute(){}, removeAttribute(){}, scrollIntoView(){}});
  const get = id => {if(!elements.has(id)) elements.set(id,element());return elements.get(id)};
  const songs = catalog || [true,false,true,true].map((video,i)=>({number:i+1,title:`Song ${i+1}`,artist:'RESCENE',section:'Main',note:'',sources:video?[{videoId:`id${i}`,kind:'影片'}]:[]}));
  const location = {hash,origin:'http://localhost'}, listeners = {};
  const context = {document:{getElementById:get,createElement:element,querySelectorAll:()=>[],head:element()},location,history:{replaceState(a,b,hash){location.hash=hash;}},fetch:async()=>({ok:true,json:async()=>songs}),setTimeout:fn=>{const id=timers.size+1;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id),setInterval(fn){intervals.push(fn)},addEventListener(name,fn){listeners[name]=fn;}};
  context.window=context;
  if(catalog) { context.Chant=require('../rescene/chant.js'); get('chantEnabled').checked=true; }
  context.YT={Player:function(id,options){const p={options,state:-1,time:0,rate:1,plays:0,destroy(){},getDuration(){return 183},getCurrentTime(){return this.time},seekTo(t){this.time=t},setPlaybackRate(r){this.rate=r;options.events.onPlaybackRateChange({data:r})},getAvailablePlaybackRates:()=>[0.5,1,2],getPlaybackRate(){return this.rate},getPlayerState(){return this.state},playVideo(){this.plays++;this.state=1},pauseVideo(){this.state=2},emit(data){this.state=data;options.events.onStateChange({data})},ready(){options.events.onReady({target:this})}};players.push(p);return p}};
  vm.runInNewContext(fs.readFileSync('rescene/practice.js','utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  return {get,players,timers,location,navigate:hash=>{location.hash=hash;listeners.hashchange();},tick:()=>intervals.forEach(fn=>fn()),select:i=>{get('songSelect').value=i;get('songSelect').onchange()},enable:()=>{get('continuous').checked=true;get('continuous').onchange()}};
}

test('song URLs and legacy links survive catalog reordering and renumbering',async()=>{
  const catalog=JSON.parse(JSON.stringify(require('../rescene/songs.json'))).reverse();
  catalog.forEach((song,i)=>song.number=i+1);
  const s=await setup(catalog,'#pretty-girl');
  assert.equal(s.get('songTitle').textContent,'Pretty Girl');
  s.navigate('#song-1');
  assert.equal(s.get('songTitle').textContent,'LOVE ATTACK');
  assert.equal(s.location.hash,'#love-attack');
  s.select(catalog.findIndex(song=>song.title==='Busy Boy'));
  assert.equal(s.location.hash,'#busy-boy');
  for(const hash of ['#no-such-song','#%E0%A4%A','#song-999']) {
    s.navigate(hash);assert.equal(s.get('songTitle').textContent,catalog[0].title);
  }
  s.navigate('#%70retty-girl');assert.equal(s.get('songTitle').textContent,'Pretty Girl');
  const count=s.players.length;s.navigate('#practice');assert.equal(s.players.length,count);
});
test('off by default; ended stays on current song',async()=>{const s=await setup();s.players[0].ready();s.players[0].emit(0);assert.equal(s.players.length,1);assert.equal(s.get('continuous').checked,false)});
test('advance skips missing videos, autoplays and stops at end',async()=>{const s=await setup();s.enable();s.players[0].ready();s.players[0].emit(0);assert.equal(s.players[1].options.videoId,'id2');s.players[1].ready();assert.equal(s.players[1].plays,1);s.players[1].emit(0);s.players[2].ready();s.players[2].emit(0);assert.equal(s.players.length,3);assert.match(s.get('continuousStatus').textContent,/歌單播放完畢/)});
test('manual selection preserves playing or paused intent',async()=>{const s=await setup();s.enable();s.players[0].ready();s.players[0].state=1;s.select(2);s.players[1].ready();assert.equal(s.players[1].plays,1);s.players[1].state=2;s.select(3);s.players[2].ready();assert.equal(s.players[2].plays,0)});
test('explicit error advances; slow loading and blocked autoplay do not',async()=>{const s=await setup();s.enable();for(const fn of [...s.timers.values()])fn();assert.equal(s.players.length,1);s.players[0].options.events.onError();assert.equal(s.players.length,2);s.players[1].ready();s.players[1].options.events.onAutoplayBlocked();assert.equal(s.players.length,2);assert.match(s.get('status').textContent,/請點一下播放/)});
test('disable during loading cancels autoplay and stale callbacks cannot advance',async()=>{const s=await setup();s.enable();s.players[0].ready();s.players[0].emit(0);s.get('continuous').checked=false;s.get('continuous').onchange();s.players[1].ready();assert.equal(s.players[1].plays,0);s.players[0].options.events.onError();assert.equal(s.players.length,2)});


test('RESCENE catalog binds all thirteen guides to their visual chant tracks', async()=>{
  const catalog=require('../rescene/songs.json');
  assert.deepEqual(catalog.slice(0,5).map(song=>song.title),['LOVE ATTACK','Runaway','Deja Vu','Pinball','Pretty Girl']);
  assert.equal(catalog.length,13);
  assert.equal(new Set(catalog.map(song=>song.slug)).size,13);
  assert.ok(catalog.every(song=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(song.slug)));
  assert.deepEqual(catalog.map(song=>song.sources[0].videoId),['xn12KH78Dx4','7DZlkZ4bMpU','9FlQOv6-Mjc','YyixhiYpkkY','RX592yMx7P0','s1S-lnU-yMI','-55bUrG1qjg','VKlrVbgJG-g','Ma6IENHO584','ykVJo0wFlQ4','hc1HS71j6oY','cLtl2aFq_6M','cL_B5W4gBRU']);
  const s=await setup(catalog);s.players[0].ready();
  assert.equal(s.get('chantEnabled').disabled,false);
  assert.equal(s.get('chantDisplay').hidden,false);
  assert.equal(s.get('loopCue').disabled,false);
  assert.equal(s.players[0].options.videoId,'xn12KH78Dx4');
  s.enable();s.players[0].emit(0);s.players[1].ready();
  assert.equal(s.players[1].options.videoId,'7DZlkZ4bMpU');
  assert.equal(s.players[1].plays,1);
  const chant=require('../rescene/chant.js');
  assert.ok(catalog.every(song=>song.hasChant && chant.validTrack(song.chant,song.sources[0].videoId)));
});

test('YoYo switches its own video, captions and replay without carrying old cues',async()=>{
  const catalog=require('../rescene/songs.json'),s=await setup(catalog);
  s.players[0].ready();s.select(9);
  const p=s.players[1],cue=catalog[9].chant.cues[1];p.ready();
  assert.equal(p.options.videoId,'ykVJo0wFlQ4');
  p.time=cue.start;p.emit(1);s.tick();
  assert.equal(s.get('chantText').textContent,'叉加內');
  assert.equal(s.get('chantLabel').textContent,'現在喊！');
  p.emit(2);s.tick();assert.equal(s.get('chantLabel').textContent,'已暫停');
  s.get('repeatCue').onclick();assert.equal(p.time,cue.start-3);
  s.select(0);s.players[2].ready();
  assert.equal(s.get('chantText').textContent,catalog[0].chant.cues[0].text);
});

test('Busy Boy selection and replay use its absolute captions and clear them on switching',async()=>{
  const catalog=require('../rescene/songs.json'),s=await setup(catalog);
  s.players[0].ready();s.select(catalog.findIndex(song=>song.title==='Busy Boy'));
  const p=s.players.at(-1);
  assert.equal(s.get('chantText').textContent,catalog.find(song=>song.title==='Busy Boy').chant.cues[0].phoneticZh);
  p.ready();
  assert.equal(p.options.videoId,'hc1HS71j6oY');
  p.time=26.7;p.state=1;s.tick();
  assert.equal(s.get('chantText').textContent,'七');
  assert.equal(s.get('chantDisplay').dataset.mode,'countdown');
  p.time=28.7;s.tick();
  assert.equal(s.get('chantText').textContent,'七');
  s.get('repeatCue').onclick();
  assert.ok(p.time<28.6);
  s.select(0);s.players.at(-1).ready();s.tick();
  assert.notEqual(s.get('chantText').textContent,'七');
});

test('new official guides load by song name and use their own response cards',async()=>{
  const catalog=require('../rescene/songs.json');
  for(const [slug,id,count] of [['with','cLtl2aFq_6M',25],['inside-out','cL_B5W4gBRU',33]]) {
    const song=catalog.find(s=>s.slug===slug),s=await setup(catalog,`#${slug}`),p=s.players[0];
    assert.equal(p.options.videoId,id);assert.equal(song.chant.cues.length,count);
    p.ready();const cue=song.chant.cues.find(c=>c.phoneticZh);
    p.time=cue.start;p.emit(1);s.tick();assert.equal(s.get('chantText').textContent,cue.phoneticZh);
    assert.equal(s.get('chantOriginal').textContent,cue.text);
    s.get('repeatCue').onclick();assert.equal(p.time,cue.start-3);
    s.select(0);assert.equal(s.location.hash,'#love-attack');
  }
});

test('With and Inside Out start at music and stop after the final response',async()=>{
  const catalog=require('../rescene/songs.json');
  for(const [slug,start,end] of [['with',32,221],['inside-out',24,237]]) {
    const song=catalog.find(s=>s.slug===slug),source=song.sources[0];
    assert.equal(source.startSeconds,start);assert.equal(source.endSeconds,end);
    assert.ok(song.chant.cues.every(c=>c.start>=start && c.end<=end));
    const s=await setup(catalog,`#${slug}`),p=s.players[0];
    assert.equal(p.options.playerVars.start,start);assert.equal(p.options.playerVars.end,end);
    p.ready();p.time=end;p.state=1;s.tick();
    assert.equal(p.state,2);assert.equal(s.get('chantLabel').textContent,'本首練習結束');
    assert.equal(s.players.length,1);
    s.get('play').onclick();assert.equal(p.time,start);assert.equal(p.state,1);
  }
});

test('real cards follow seek, pause, speed, repeat and source switching',async()=>{
  const catalog=require('../rescene/songs.json'), s=await setup(catalog), p=s.players[0];
  p.ready(); const cue=catalog[0].chant.cues[0];
  p.time=cue.start;p.emit(1);s.tick();
  assert.equal(s.get('chantText').textContent,cue.text);
  assert.equal(s.get('chantDisplay').dataset.mode,'active');
  p.emit(2);s.tick();assert.equal(s.get('chantLabel').textContent,'已暫停');
  p.time=cue.start-4;p.rate=2;p.emit(1);s.tick();
  assert.equal(s.get('chantCount').textContent,'2');
  s.get('repeatCue').onclick();assert.equal(p.time,cue.start-3);
  s.get('loopCue').checked=true;s.get('loopCue').onchange();
  p.time=cue.end+.1;s.tick();assert.equal(p.time,cue.start-3);
  const nextIndex=catalog.findIndex(song=>song.title==='UhUh');
  s.select(nextIndex);const next=s.players[1];next.ready();
  assert.equal(next.options.videoId,'s1S-lnU-yMI');
  assert.equal(s.get('chantText').textContent,(catalog[nextIndex].chant.cues[0].phoneticZh || catalog[nextIndex].chant.cues[0].text));
});

test('phonetics show original Korean and clear it on Latin cards, switching and end',async()=>{
  const catalog=require('../rescene/songs.json'),s=await setup(catalog);
  s.select(9);const p=s.players.at(-1);p.ready();
  const cue=catalog[9].chant.cues[1];p.time=cue.start;p.emit(1);s.tick();
  assert.equal(s.get('chantText').textContent,'叉加內');
  assert.equal(s.get('chantOriginal').textContent,'찾아내');
  assert.equal(s.get('chantOriginal').hidden,false);
  p.emit(2);s.tick();assert.equal(s.get('chantOriginal').textContent,'찾아내');
  p.time=catalog[9].chant.cues.find(c=>!c.phoneticZh).start;p.emit(1);s.tick();
  assert.equal(s.get('chantOriginal').textContent,'');
  assert.equal(s.get('chantOriginal').hidden,true);
  s.select(10);
  assert.match(s.get('chantText').textContent,/衝丸妮 金ㄍㄧㄛ恩 Minami\n伊耶彬 金嘎勇 RESCENE/);
  assert.equal(s.get('chantOriginal').hidden,false);
  const last=s.players.at(-1);last.ready();last.emit(0);s.tick();
  assert.equal(s.get('chantOriginal').textContent,'');
  assert.equal(s.get('chantOriginal').hidden,true);
});

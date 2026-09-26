const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
async function setup(catalog = null) {
  const elements = new Map(), players = [], timers = new Map(), intervals = [];
  const element = () => ({style:{setProperty(){}}, focus(){}, dataset:{}, checked:false, children:[], append(...items){this.children.push(...items)}, replaceChildren(...items){this.children=items}, setAttribute(){}, removeAttribute(){}, scrollIntoView(){}});
  const get = id => {if(!elements.has(id)) elements.set(id,element());return elements.get(id)};
  const songs = catalog || [true,false,true,true].map((video,i)=>({number:i+1,title:`Song ${i+1}`,artist:'RESCENE',section:'Main',note:'',sources:video?[{videoId:`id${i}`,kind:'影片'}]:[]}));
  const context = {document:{getElementById:get,createElement:element,querySelectorAll:()=>[],head:element()},location:{hash:'',origin:'http://localhost'},history:{replaceState(){}},fetch:async()=>({ok:true,json:async()=>songs}),setTimeout:fn=>{const id=timers.size+1;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id),setInterval(fn){intervals.push(fn)},addEventListener(){}};
  context.window=context;
  if(catalog) { context.Chant=require('../rescene/chant.js'); get('chantEnabled').checked=true; }
  context.YT={Player:function(id,options){const p={options,state:-1,time:0,rate:1,plays:0,destroy(){},getDuration(){return 183},getCurrentTime(){return this.time},seekTo(t){this.time=t},setPlaybackRate(r){this.rate=r;options.events.onPlaybackRateChange({data:r})},getAvailablePlaybackRates:()=>[0.5,1,2],getPlaybackRate(){return this.rate},getPlayerState(){return this.state},playVideo(){this.plays++;this.state=1},pauseVideo(){this.state=2},emit(data){this.state=data;options.events.onStateChange({data})},ready(){options.events.onReady({target:this})}};players.push(p);return p}};
  vm.runInNewContext(fs.readFileSync('rescene/practice.js','utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  return {get,players,timers,tick:()=>intervals.forEach(fn=>fn()),select:i=>{get('songSelect').value=i;get('songSelect').onchange()},enable:()=>{get('continuous').checked=true;get('continuous').onchange()}};
}
test('off by default; ended stays on current song',async()=>{const s=await setup();s.players[0].ready();s.players[0].emit(0);assert.equal(s.players.length,1);assert.equal(s.get('continuous').checked,false)});
test('advance skips missing videos, autoplays and stops at end',async()=>{const s=await setup();s.enable();s.players[0].ready();s.players[0].emit(0);assert.equal(s.players[1].options.videoId,'id2');s.players[1].ready();assert.equal(s.players[1].plays,1);s.players[1].emit(0);s.players[2].ready();s.players[2].emit(0);assert.equal(s.players.length,3);assert.match(s.get('continuousStatus').textContent,/歌單播放完畢/)});
test('manual selection preserves playing or paused intent',async()=>{const s=await setup();s.enable();s.players[0].ready();s.players[0].state=1;s.select(2);s.players[1].ready();assert.equal(s.players[1].plays,1);s.players[1].state=2;s.select(3);s.players[2].ready();assert.equal(s.players[2].plays,0)});
test('explicit error advances; slow loading and blocked autoplay do not',async()=>{const s=await setup();s.enable();for(const fn of [...s.timers.values()])fn();assert.equal(s.players.length,1);s.players[0].options.events.onError();assert.equal(s.players.length,2);s.players[1].ready();s.players[1].options.events.onAutoplayBlocked();assert.equal(s.players.length,2);assert.match(s.get('status').textContent,/請點一下播放/)});
test('disable during loading cancels autoplay and stale callbacks cannot advance',async()=>{const s=await setup();s.enable();s.players[0].ready();s.players[0].emit(0);s.get('continuous').checked=false;s.get('continuous').onchange();s.players[1].ready();assert.equal(s.players[1].plays,0);s.players[0].options.events.onError();assert.equal(s.players.length,2)});


test('RESCENE catalog binds all nine guides to their visual chant tracks', async()=>{
  const catalog=require('../rescene/songs.json');
  assert.equal(catalog[0].title,'Pretty Girl');
  assert.equal(catalog.length,9);
  assert.deepEqual(catalog.map(song=>song.sources[0].videoId),['RX592yMx7P0','xn12KH78Dx4','s1S-lnU-yMI','YyixhiYpkkY','-55bUrG1qjg','9FlQOv6-Mjc','VKlrVbgJG-g','Ma6IENHO584','7DZlkZ4bMpU']);
  const s=await setup(catalog);s.players[0].ready();
  assert.equal(s.get('chantEnabled').disabled,false);
  assert.equal(s.get('chantDisplay').hidden,false);
  assert.equal(s.get('loopCue').disabled,false);
  assert.equal(s.players[0].options.videoId,'RX592yMx7P0');
  s.enable();s.players[0].emit(0);s.players[1].ready();
  assert.equal(s.players[1].options.videoId,'xn12KH78Dx4');
  assert.equal(s.players[1].plays,1);
  const chant=require('../rescene/chant.js');
  assert.ok(catalog.every(song=>song.hasChant && chant.validTrack(song.chant,song.sources[0].videoId)));
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
  s.select(2);const next=s.players[1];next.ready();
  assert.equal(next.options.videoId,'s1S-lnU-yMI');
  assert.equal(s.get('chantText').textContent,catalog[2].chant.cues[0].text);
});

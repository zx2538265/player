const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
async function setup(catalog = null) {
  const elements = new Map(), players = [], timers = new Map(), intervals = [];
  const element = () => ({style:{setProperty(){}}, focus(){}, dataset:{}, checked:false, children:[], append(...items){this.children.push(...items)}, replaceChildren(...items){this.children=items}, setAttribute(){}, removeAttribute(){}, scrollIntoView(){}});
  const get = id => {if(!elements.has(id)) elements.set(id,element());return elements.get(id)};
  const songs = catalog || [true,false,true,true].map((video,i)=>({number:i+1,title:`Song ${i+1}`,artist:'BIGBANG',section:'Main',note:'',sources:video?[{videoId:`id${i}`,kind:'影片'}]:[]}));
  const context = {document:{getElementById:get,createElement:element,querySelectorAll:()=>[],head:element()},location:{hash:'',origin:'http://localhost'},history:{replaceState(){}},fetch:async()=>({ok:true,json:async()=>songs}),setTimeout:fn=>{const id=timers.size+1;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id),setInterval(fn){intervals.push(fn)},addEventListener(){}};
  context.window=context;
  if(catalog) { context.Chant=require('../bigbang/chant.js'); get('chantEnabled').checked=true; }
  context.YT={Player:function(id,options){const p={options,state:-1,time:0,rate:1,plays:0,destroy(){},getDuration(){return 183},getCurrentTime(){return this.time},seekTo(t){this.time=t},setPlaybackRate(r){this.rate=r;options.events.onPlaybackRateChange({data:r})},getAvailablePlaybackRates:()=>[0.5,1,2],getPlaybackRate(){return this.rate},getPlayerState(){return this.state},playVideo(){this.plays++;this.state=1},pauseVideo(){this.state=2},emit(data){this.state=data;options.events.onStateChange({data})},ready(){options.events.onReady({target:this})}};players.push(p);return p}};
  vm.runInNewContext(fs.readFileSync('bigbang/practice.js','utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  return {get,players,timers,tick:()=>intervals.forEach(fn=>fn()),select:i=>{get('songSelect').value=i;get('songSelect').onchange()},enable:()=>{get('continuous').checked=true;get('continuous').onchange()}};
}
test('off by default; ended stays on current song',async()=>{const s=await setup();s.players[0].ready();s.players[0].emit(0);assert.equal(s.players.length,1);assert.equal(s.get('continuous').checked,false)});
test('advance skips missing videos, autoplays and stops at end',async()=>{const s=await setup();s.enable();s.players[0].ready();s.players[0].emit(0);assert.equal(s.players[1].options.videoId,'id2');s.players[1].ready();assert.equal(s.players[1].plays,1);s.players[1].emit(0);s.players[2].ready();s.players[2].emit(0);assert.equal(s.players.length,3);assert.match(s.get('continuousStatus').textContent,/歌單播放完畢/)});
test('manual selection preserves playing or paused intent',async()=>{const s=await setup();s.enable();s.players[0].ready();s.players[0].state=1;s.select(2);s.players[1].ready();assert.equal(s.players[1].plays,1);s.players[1].state=2;s.select(3);s.players[2].ready();assert.equal(s.players[2].plays,0)});
test('explicit error advances; slow loading and blocked autoplay do not',async()=>{const s=await setup();s.enable();for(const fn of [...s.timers.values()])fn();assert.equal(s.players.length,1);s.players[0].options.events.onError();assert.equal(s.players.length,2);s.players[1].ready();s.players[1].options.events.onAutoplayBlocked();assert.equal(s.players.length,2);assert.match(s.get('status').textContent,/請點一下播放/)});
test('disable during loading cancels autoplay and stale callbacks cannot advance',async()=>{const s=await setup();s.enable();s.players[0].ready();s.players[0].emit(0);s.get('continuous').checked=false;s.get('continuous').onchange();s.players[1].ready();assert.equal(s.players[1].plays,0);s.players[0].options.events.onError();assert.equal(s.players.length,2)});

test('actual chant catalog switches cleanly and controls use the current player clock',async()=>{
  const catalog=require('../bigbang/songs.json'),s=await setup(catalog);
  s.players[0].ready(); s.players[0].time=30;s.players[0].emit(1);
  assert.equal(s.get('chantText').textContent,'NA NA NA NA NA');
  for(const index of [1,2,3,4,6,7,10,12,16,18,19,20,21,23,25]) {
    const old=s.players.at(-1);s.select(index);
    assert.equal(s.get('chantLabel').textContent,'等待影片就緒');
    assert.equal(s.get('chantCount').textContent,'');
    const p=s.players.at(-1),cue=catalog[index].chant.cues[0];p.ready();
    assert.equal(p.options.videoId,catalog[index].chant.videoId);
    assert.equal(p.options.playerVars.start,index===3?17:0);
    s.get('speed').value='0.5';s.get('speed').onchange();p.time=cue.start-1.5;p.emit(1);
    assert.equal(s.get('chantCount').textContent,'3');
    p.time=cue.start;p.emit(1);assert.equal(s.get('chantLabel').textContent,'現在喊！');
    assert.equal(s.get('chantText').textContent,cue.text);
    s.get('play').onclick();s.get('chantEnabled').onchange();
    assert.equal(s.get('chantLabel').textContent,'已暫停');assert.equal(s.get('chantCount').textContent,'');
    s.get('back').onclick();s.get('chantEnabled').onchange();
    assert.equal(p.time,cue.start-5);assert.equal(s.get('chantCount').textContent,'');
    old.emit(1);assert.equal(s.get('chantLabel').textContent,'已暫停');
    s.get('speed').value='2';s.get('speed').onchange();
    s.get('seek').value=cue.start-6;s.get('seek').oninput();p.emit(1);
    assert.equal(s.get('chantCount').textContent,'3');
    s.get('seek').value=cue.end;s.get('seek').oninput();p.emit(1);
    assert.equal(s.get('chantLabel').textContent==='現在喊！',catalog[index].chant.cues.some(c=>c.start===cue.end));
  }
  s.select(5);assert.equal(s.get('chantDisplay').hidden,true);assert.equal(s.get('chantEnabled').disabled,true);
  s.select(0);assert.equal(s.get('chantText').textContent,'NA NA NA NA NA');
});

test('bounded excerpt stops, replays, clamps seeking and advances once',async()=>{
 const catalog=structuredClone(require('../bigbang/songs.json'));
 catalog[10].sources[0].startSeconds=25;catalog[10].sources[0].endSeconds=81;
 const s=await setup(catalog);s.select(10);const p=s.players.at(-1);p.ready();
 assert.equal(p.options.playerVars.end,81);
 p.time=26;s.get('back').onclick();assert.equal(p.time,25);
 p.time=80.9;p.emit(1);s.tick();assert.equal(p.state,1);
 p.time=81;s.tick();assert.equal(p.state,2);assert.equal(s.get('chantLabel').textContent,'本首練習結束');
 s.get('play').onclick();assert.equal(p.time,25);assert.equal(p.state,1);
 s.get('seek').value=100;s.get('seek').oninput();assert.equal(p.time,81);
 s.enable();s.tick();assert.equal(s.players.at(-1).options.videoId,'KWWcRGfm5SQ');
 const count=s.players.length;p.emit(0);assert.equal(s.players.length,count);
});

test('Universe replacement starts at zero and has no former 81-second cutoff',async()=>{
 const s=await setup(require('../bigbang/songs.json'));s.select(10);const p=s.players.at(-1);p.ready();
 assert.equal(p.options.videoId,'DxlZVaEO9B4');
 assert.ok(!p.options.playerVars.end);
 p.time=3;s.get('back').onclick();assert.equal(p.time,0);
 p.time=81;p.emit(1);s.tick();assert.equal(p.state,1);
});

test('cue navigation retains its target during lead-in and repeat starts playback',async()=>{
 const s=await setup(require('../bigbang/songs.json')),p=s.players[0];p.ready();p.time=30;
 s.get('nextCue').onclick();assert.equal(p.time,31.6-3);
 s.get('repeatCue').onclick();assert.equal(p.time,31.6-3);assert.equal(p.state,1);
 s.get('nextCue').onclick();assert.equal(p.time,33.6-3);
 s.get('previousCue').onclick();assert.equal(p.time,31.6-3);
});

test('single cue loop takes priority over continuous playback and clears on song change or scrub',async()=>{
 const s=await setup(require('../bigbang/songs.json')),p=s.players[0];p.ready();p.time=30;p.emit(1);s.enable();
 s.get('loopCue').checked=true;s.get('loopCue').onchange();
 p.time=31.6;s.tick();assert.equal(p.time,29.8-3);assert.equal(s.players.length,1);
 p.emit(0);assert.equal(s.players.length,1);assert.equal(p.state,1);
 s.get('seek').value=50;s.get('seek').oninput();assert.equal(s.get('loopCue').checked,false);
 s.get('loopCue').checked=true;s.get('loopCue').onchange();s.select(1);
 assert.equal(s.get('loopCue').checked,false);
});

test('cue controls are disabled before readiness, on failure and for missing tracks',async()=>{
 const s=await setup(require('../bigbang/songs.json'));
 assert.equal(s.get('repeatCue').disabled,true);s.players[0].ready();assert.equal(s.get('repeatCue').disabled,false);
 s.players[0].options.events.onError();assert.equal(s.get('repeatCue').disabled,true);assert.equal(s.get('retry').hidden,false);
 s.select(5);assert.equal(s.get('repeatCue').disabled,true);assert.equal(s.get('retry').hidden,true);
});

test('cue lead-in respects bounded source start',async()=>{
 const catalog=structuredClone(require('../bigbang/songs.json'));
 catalog[0].sources[0].startSeconds=29;catalog[0].sources[0].endSeconds=40;
 const s=await setup(catalog);s.players[0].ready();s.get('repeatCue').onclick();assert.equal(s.players[0].time,29);
});


test('POWER controls, replay and continuous entry/exit bind the specified video',async()=>{
 const catalog=require('../bigbang/songs.json'),s=await setup(catalog);
 s.select(16);s.enable();s.players.at(-1).ready();s.players.at(-1).emit(0);
 const p=s.players.at(-1);assert.equal(p.options.videoId,'LO2yJopvMH0');p.ready();assert.equal(p.plays,1);
 for(const rate of [.5,1,2]) {
   s.get('speed').value=String(rate);s.get('speed').onchange();
   p.time=40-3*rate;p.emit(1);assert.equal(s.get('chantCount').textContent,'3');
   s.get('seek').value=45;s.get('seek').oninput();assert.equal(s.get('chantText').textContent,'Called\nlegend\nK 他喜');
   s.get('play').onclick();s.tick();assert.equal(s.get('chantLabel').textContent,'已暫停');
   s.get('seek').value=0;s.get('seek').oninput();p.emit(1);assert.equal(s.get('chantText').textContent,'Übermensch');
 }
 s.get('continuous').checked=false;p.emit(0);assert.equal(s.get('chantLabel').textContent,'本首練習結束');
 s.get('seek').value=0;s.get('seek').oninput();s.get('play').onclick();s.tick();assert.equal(s.get('chantText').textContent,'Übermensch');
 s.enable();p.emit(0);assert.equal(s.players.at(-1).options.videoId,catalog[18].sources[0].videoId);
 s.players.at(-1).ready();p.emit(1);assert.notEqual(s.get('chantText').textContent,'Übermensch');
});

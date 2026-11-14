const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
async function setup(catalog = null, hash = '') {
  const elements = new Map(), players = [], timers = new Map(), intervals = [];
  const element = () => ({style:{setProperty(){}}, focus(){}, dataset:{}, checked:false, children:[], append(...items){this.children.push(...items)}, replaceChildren(...items){this.children=items}, attributes:{}, setAttribute(name,value){this.attributes[name]=value}, removeAttribute(){}, scrollIntoView(){}});
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

test('off by default; ended stays on current song',async()=>{const s=await setup();s.players[0].ready();s.players[0].emit(0);assert.equal(s.players.length,1);assert.equal(s.get('continuous').checked,false)});
test('advance skips missing videos, autoplays and stops at end',async()=>{const s=await setup();s.enable();s.players[0].ready();s.players[0].emit(0);assert.equal(s.players[1].options.videoId,'id2');s.players[1].ready();assert.equal(s.players[1].plays,1);s.players[1].emit(0);s.players[2].ready();s.players[2].emit(0);assert.equal(s.players.length,3);assert.match(s.get('continuousStatus').textContent,/歌單播放完畢/)});
test('manual selection preserves playing or paused intent',async()=>{const s=await setup();s.enable();s.players[0].ready();s.players[0].state=1;s.select(2);s.players[1].ready();assert.equal(s.players[1].plays,1);s.players[1].state=2;s.select(3);s.players[2].ready();assert.equal(s.players[2].plays,0)});
test('explicit error advances; slow loading and blocked autoplay do not',async()=>{const s=await setup();s.enable();for(const fn of [...s.timers.values()])fn();assert.equal(s.players.length,1);s.players[0].options.events.onError();assert.equal(s.players.length,2);s.players[1].ready();s.players[1].options.events.onAutoplayBlocked();assert.equal(s.players.length,2);assert.match(s.get('status').textContent,/請點一下播放/)});
test('disable during loading cancels autoplay and stale callbacks cannot advance',async()=>{const s=await setup();s.enable();s.players[0].ready();s.players[0].emit(0);s.get('continuous').checked=false;s.get('continuous').onchange();s.players[1].ready();assert.equal(s.players[1].plays,0);s.players[0].options.events.onError();assert.equal(s.players.length,2)});


test('KTV follows playback, retains loop target, and restores follow after manual browsing',async()=>{
  const song=require('../rescene/songs.json').find(s=>s.slug==='inside-out');
  const s=await setup([song]);const p=s.players[0];p.ready();
  const rows=s.get('ktvList').children,marks=s.get('ktvMarkers').children;
  assert.equal(rows.length,song.chant.cues.length);assert.equal(marks.length,rows.length);

  const cue=song.chant.cues[3];rows[3].onclick();assert.equal(p.time,cue.start-3);assert.equal(p.state,1);
  p.time=cue.start;s.tick();assert.equal(rows[3].dataset.state,'active');
  s.get('loopCue').checked=true;s.get('loopCue').onchange();
  marks[4].onclick();assert.equal(p.time,song.chant.cues[4].start-3);
  p.time=song.chant.cues[4].end;s.tick();assert.equal(p.time,song.chant.cues[4].start-3);
  s.get('ktvList').onwheel();assert.equal(s.get('ktvFollow').textContent,'回到目前句');
  s.get('ktvFollow').onclick();assert.equal(s.get('ktvFollow').textContent,'自動跟隨：開');

});
test('KTV clears old cues on song changes and disables seeking after player failure',async()=>{
  const catalog=require('../rescene/songs.json');const s=await setup(catalog,'#inside-out');
  s.players[0].ready();s.navigate('#with');
  assert.equal(s.get('ktvList').children.length,catalog.find(s=>s.slug==='with').chant.cues.length);
  assert.ok(s.get('ktvList').children.every(row=>row.disabled));
  s.players.at(-1).ready();assert.ok(s.get('ktvList').children.every(row=>!row.disabled));
  s.players.at(-1).options.events.onError();assert.ok(s.get('ktvList').children.every(row=>row.disabled));
});

test('song identity and legacy links survive ordering; With leads the practice list',async()=>{
 const catalog=JSON.parse(JSON.stringify(require('../rescene/songs.json'))).reverse();
 const s=await setup(catalog,'#inside-out');
 assert.equal(s.players[0].options.videoId,'cL_B5W4gBRU');
 s.navigate('#song-1');assert.equal(s.location.hash,'#love-attack');
 assert.equal(s.players.at(-1).options.videoId,'xn12KH78Dx4');
 s.navigate('#unknown');assert.equal(s.get('songTitle').textContent,'With');
 for(const song of catalog){s.navigate('#'+song.slug);assert.equal(s.players.at(-1).options.videoId,song.sources[0].videoId);assert.equal(s.get('ktvList').children.length,song.chant.cues.length);}
});
test('wording settings preserve original text and source timing',async()=>{
 const song=require('../rescene/songs.json').find(s=>s.slug==='inside-out'),s=await setup([song]);
 const p=s.players[0];p.ready();
 const words=()=>s.get('ktvList').children[0].children[1].children;
 assert.equal(words().length,2);assert.equal(words()[0].textContent,song.chant.cues[0].phoneticZh);
 s.get('wordingMode').value='original';s.get('wordingMode').onchange();
 assert.equal(words().length,1);assert.equal(words()[0].textContent,song.chant.cues[0].text);
 s.get('ktvList').children[0].onclick();assert.equal(p.time,Math.max(song.sources[0].startSeconds,song.chant.cues[0].start-3));
 s.get('wordingMode').value='phonetic';s.get('wordingMode').onchange();assert.equal(words().length,1);assert.equal(words()[0].textContent,song.chant.cues[0].phoneticZh);
});
test('KTV clock handles pause, speed, end and backward seek without losing source bounds',async()=>{
 const song=require('../rescene/songs.json').find(s=>s.slug==='inside-out'),s=await setup([song]);const p=s.players[0];p.ready();
 const cue=song.chant.cues[3];p.time=cue.start-4;p.rate=2;p.state=1;s.tick();assert.match(s.get('ktvStatus').textContent,/2 秒/);
 p.time=cue.start;s.tick();assert.equal(s.get('ktvList').children[3].dataset.state,'active');
 p.emit(2);assert.match(s.get('ktvStatus').textContent,/按播放/);
 p.time=song.sources[0].endSeconds;p.state=1;s.tick();assert.equal(p.state,2);assert.match(s.get('ktvStatus').textContent,/練習結束/);
 s.get('ktvList').children[0].onclick();s.tick();assert.equal(p.time,song.chant.cues[0].start-3);assert.doesNotMatch(s.get('ktvStatus').textContent,/練習結束/);
});
test('removed card UI has no dangling JavaScript element references',()=>{
 const html=fs.readFileSync('rescene/index.html','utf8'),js=fs.readFileSync('rescene/practice.js','utf8');
 const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
 for(const m of js.matchAll(/\$\('([^']+)'\)/g)) assert.ok(ids.has(m[1]),m[1]);
 assert.doesNotMatch(html,/id="(?:cardView|ktvView|chantDisplay)"|大字提示/);
});

test('next chant counts down during current chant, pauses, changes speed and clears on entry/end',async()=>{
 const song=require('../rescene/songs.json').find(s=>s.slug==='inside-out'),s=await setup([song]),p=s.players[0];
 const cues=song.chant.cues,rows=s.get('ktvList').children;
 assert.ok(rows.every(row=>! /下一句 \d+ 秒/.test(row.children[0].textContent)));
 p.ready();p.time=cues[0].start;p.state=1;s.tick();
 assert.match(rows[0].children[0].textContent,/目前句/);
 assert.ok(rows[1].children[0].textContent.includes(`下一句 ${Math.ceil(cues[1].start-p.time)} 秒`));
 p.time=cues[3].start-4;p.rate=2;s.tick();assert.match(rows[3].children[0].textContent,/下一句 2 秒/);
 p.emit(2);const paused=rows[3].children[0].textContent;s.tick();assert.equal(rows[3].children[0].textContent,paused);assert.match(paused,/暫停/);
 p.state=3;s.tick();assert.match(rows[3].children[0].textContent,/緩衝中/);
 p.state=1;p.rate=1;s.tick();assert.match(rows[3].children[0].textContent,/下一句 4 秒/);
 p.time=cues[3].start;s.tick();assert.match(rows[3].children[0].textContent,/目前句/);assert.doesNotMatch(rows[3].children[0].textContent,/下一句/);
 rows[3].onclick();s.tick();assert.match(rows[3].children[0].textContent,/下一句 3 秒/);
 p.time=song.sources[0].endSeconds;s.tick();assert.ok(rows.every(row=>!row.children[0].textContent.includes('下一句')));
});

test('With live version uses its own player, cues, countdown and bounds; guide remains intact',async()=>{
 const song=require('../rescene/songs.json').find(s=>s.slug==='with');
 const live=song.sources.find(source=>source.slug==='live');
 const s=await setup([song],'#with/live');let p=s.players[0];p.ready();
 assert.equal(p.options.videoId,'pUNac5ECLeg');assert.equal(s.get('sourceChoice').hidden,false);
 assert.equal(s.get('sourceButtons').children.length,2);
 assert.equal(s.get('sourceButtons').children[1].attributes['aria-pressed'],'true');
 const playerCount=s.players.length;s.get('sourceButtons').children[1].onclick();assert.equal(s.players.length,playerCount);
 assert.equal(s.get('ktvList').children.length,27);assert.equal(live.chant.videoId,live.videoId);
 assert.equal(s.get('ktvDuration').textContent,'3:09');
 for(let i=0;i<live.chant.cues.length;i++){
   const cue=live.chant.cues[i],original=song.chant.cues[i];
   assert.equal(cue.text,original.text);assert.equal(cue.phoneticZh,original.phoneticZh);
   assert.ok(Math.abs(cue.start-original.start+31.437)<0.001);
   assert.ok(cue.start>=live.startSeconds && cue.end<=live.endSeconds);
   p.time=cue.start;p.state=1;s.tick();assert.equal(s.get('ktvList').children[i].dataset.state,'active');
 }
 const cue=live.chant.cues[2];p.time=cue.start-2;p.state=1;s.tick();assert.match(s.get('ktvList').children[2].children[0].textContent,/下一句 2 秒/);
 s.get('ktvList').children[2].onclick();assert.equal(p.time,cue.start-3);
 s.get('loopCue').checked=true;s.get('loopCue').onchange();p.time=cue.end;s.tick();assert.equal(p.time,cue.start-3);
 s.get('sourceButtons').children[0].onclick();p=s.players.at(-1);p.ready();
 assert.equal(p.options.videoId,'cLtl2aFq_6M');assert.equal(s.location.hash,'#with');
 assert.equal(s.get('sourceButtons').children[0].attributes['aria-pressed'],'true');
 assert.equal(s.get('sourceButtons').children[1].attributes['aria-pressed'],'false');assert.equal(s.get('loopCue').checked,false);
 assert.equal(s.get('ktvDuration').textContent,'3:41');
 s.get('sourceButtons').children[1].onclick();p=s.players.at(-1);p.ready();assert.equal(s.location.hash,'#with');
 p.options.events.onError();s.get('retry').onclick();p=s.players.at(-1);p.ready();assert.equal(p.options.videoId,live.videoId);
 p.time=live.endSeconds;p.state=1;s.tick();assert.equal(p.state,2);assert.match(s.get('ktvStatus').textContent,/練習結束/);
 s.navigate('#with/missing');assert.equal(s.players.at(-1).options.videoId,'cLtl2aFq_6M');
});

test('Inside Out live version retains all 34 cues and switches independently from With',async()=>{
 const catalog=require('../rescene/songs.json'),song=catalog.find(s=>s.slug==='inside-out');
 const live=song.sources.find(source=>source.slug==='live');
 const s=await setup(catalog,'#inside-out/live');let p=s.players[0];p.ready();
 assert.equal(p.options.videoId,'_hvATW8DixU');assert.equal(s.location.hash,'#inside-out');assert.equal(s.get('sourceButtons').children.length,2);
 assert.equal(s.get('ktvList').children.length,34);assert.equal(live.chant.videoId,live.videoId);
 for(let i=0;i<live.chant.cues.length;i++){
  const cue=live.chant.cues[i],original=song.chant.cues[i];
  assert.equal(cue.text,original.text);assert.equal(cue.phoneticZh,original.phoneticZh);
  assert.ok(Math.abs(cue.start-original.start+23.1)<0.001);
  assert.ok(cue.start>=0&&cue.end<=live.endSeconds);
  p.time=cue.start;p.state=1;s.tick();assert.equal(s.get('ktvList').children[i].dataset.state,'active');
 }
 s.get('ktvList').children[2].onclick();s.tick();assert.match(s.get('ktvList').children[2].children[0].textContent,/下一句 3 秒/);
 s.get('loopCue').checked=true;s.get('loopCue').onchange();p.time=live.chant.cues[2].end;s.tick();assert.equal(p.time,live.chant.cues[2].start-3);
 s.get('loopCue').checked=false;s.get('loopCue').onchange();p.time=live.endSeconds;p.state=1;s.tick();assert.equal(p.state,2);
 s.get('sourceButtons').children[0].onclick();p=s.players.at(-1);p.ready();assert.equal(p.options.videoId,'cL_B5W4gBRU');assert.equal(s.location.hash,'#inside-out');
 s.navigate('#with/live');assert.equal(s.players.at(-1).options.videoId,'pUNac5ECLeg');
 s.navigate('#inside-out/live');assert.equal(s.players.at(-1).options.videoId,'_hvATW8DixU');
});

test('LOVE ATTACK live starts at nine seconds and retains correct version indices past an external MV',async()=>{
 const song=require('../rescene/songs.json').find(s=>s.slug==='love-attack'),live=song.sources.find(s=>s.slug==='live');
 const s=await setup([song],'#love-attack/live');let p=s.players[0];p.ready();
 assert.equal(p.options.videoId,'ajhEFz1zNMQ');assert.equal(p.options.playerVars.start,9);
 assert.equal(live.startSeconds,9);assert.equal(s.get('sourceButtons').children.length,2);
 assert.equal(s.get('sourceButtons').children[1].dataset.source,2);
 assert.equal(s.get('ktvList').children.length,42);
 for(let i=0;i<live.chant.cues.length;i++){
  const cue=live.chant.cues[i],original=song.chant.cues[i];
  assert.equal(cue.text,original.text);assert.equal(cue.phoneticZh,original.phoneticZh);
  assert.ok(Math.abs(cue.start-original.start+6.061)<0.001);
  assert.ok(cue.start>=9&&cue.end<=live.endSeconds);
  p.time=cue.start;p.state=1;s.tick();assert.equal(s.get('ktvList').children[i].dataset.state,'active');
 }
 p.time=9;s.get('back').onclick();assert.equal(p.time,9);
 s.get('ktvList').children[0].onclick();s.tick();assert.match(s.get('ktvList').children[0].children[0].textContent,/下一句 3 秒/);
 s.get('loopCue').checked=true;s.get('loopCue').onchange();p.time=live.chant.cues[0].end;s.tick();assert.equal(p.time,live.chant.cues[0].start-3);
 s.get('loopCue').checked=false;s.get('loopCue').onchange();p.time=live.endSeconds;p.state=1;s.tick();assert.equal(p.state,2);
 s.get('sourceButtons').children[0].onclick();p=s.players.at(-1);p.ready();assert.equal(p.options.videoId,'xn12KH78Dx4');
 s.get('sourceButtons').children[1].onclick();p=s.players.at(-1);p.ready();assert.equal(p.options.videoId,'ajhEFz1zNMQ');assert.equal(s.location.hash,'#love-attack');
});

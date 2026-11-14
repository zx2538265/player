const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
async function setup(project, catalog = null, hash = '') {
  let now = 0;
  const elements = new Map(), players = [], timers = new Map(), intervals = [];
  const element = () => ({scrollTop:0,offsetTop:0,clientHeight:400,offsetHeight:80,style:{setProperty(){}}, focus(){}, dataset:{}, checked:false, children:[], append(...items){this.children.push(...items)}, replaceChildren(...items){this.children=items}, attributes:{}, setAttribute(name,value){this.attributes[name]=value}, removeAttribute(){}, scrollIntoView(){}});
  const get = id => {if(!elements.has(id)) elements.set(id,element());return elements.get(id)};
  const songs = catalog || [true,false,true,true].map((video,i)=>({number:i+1,title:`Song ${i+1}`,artist:'RESCENE',section:'Main',note:'',sources:video?[{videoId:`id${i}`,kind:'影片'}]:[]}));
  const location = {hash,origin:'http://localhost'}, listeners = {};
  const context = {Date:{now:()=>now},document:{getElementById:get,createElement:element,querySelectorAll:()=>[],head:element()},location,history:{replaceState(a,b,hash){location.hash=hash;}},fetch:async()=>({ok:true,json:async()=>songs}),setTimeout:fn=>{const id=timers.size+1;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id),setInterval(fn){intervals.push(fn)},addEventListener(name,fn){listeners[name]=fn;}};
  context.window=context;
  if(catalog) { context.Chant=require('../'+project+'/chant.js'); get('chantEnabled').checked=true; }
  context.YT={Player:function(id,options){const p={options,state:-1,time:0,rate:1,plays:0,destroy(){},getDuration(){return 183},getCurrentTime(){return this.time},seekTo(t){this.time=t},setPlaybackRate(r){this.rate=r;options.events.onPlaybackRateChange({data:r})},getAvailablePlaybackRates:()=>[0.5,1,2],getPlaybackRate(){return this.rate},getPlayerState(){return this.state},playVideo(){this.plays++;this.state=1},pauseVideo(){this.state=2},emit(data){this.state=data;options.events.onStateChange({data})},ready(){options.events.onReady({target:this})}};players.push(p);return p}};
  vm.runInNewContext(fs.readFileSync(project+'/practice.js','utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  return {following:()=>String(vm.runInNewContext("ktvFollow",context)),get,players,timers,location,advance:ms=>{now+=ms},dispatch:(name,event)=>listeners[name](event),navigate:hash=>{location.hash=hash;listeners.hashchange();},tick:()=>intervals.forEach(fn=>fn()),select:i=>{get('songSelect').value=i;get('songSelect').onchange()},enable:()=>{get('continuous').checked=true;get('continuous').onchange()}};
}


for(const project of ['rescene','babymonster']) {
 test(project+' single click does not seek',async()=>{
  const songs=require('../'+project+'/songs.json'),s=await setup(project,songs),p=s.players[0];p.ready();
  const row=s.get('ktvList').children[0];p.time=0;row.onclick({detail:1});assert.equal(p.time,0);
 });
 test(project+' double tap seeks, drag cancels taps and suspends follow',async()=>{
  const songs=require('../'+project+'/songs.json'),s=await setup(project,songs),p=s.players[0];p.ready();
  const row=s.get('ktvList').children[0];
  const event=(x,y,t)=>({pointerId:1,pointerType:'touch',button:0,clientX:x,clientY:y,timeStamp:t});
  row.onpointerdown(event(10,10,100));row.onpointerup(event(10,10,140));assert.equal(p.plays,0);
  row.onpointerdown(event(10,10,220));row.onpointerup(event(10,10,260));assert.equal(p.plays,1);
  assert.equal(p.time,Math.max(0,songs.find(song=>song.sources[0]?.videoId===p.options.videoId).chant.cues[0].start-3));
  row.onpointerdown(event(10,10,300));row.onpointermove(event(10,60,330));row.onpointerup(event(10,60,360));
  row.onclick({detail:1});assert.equal(p.plays,1);assert.equal(s.following(),'false');
  row.onpointerdown(event(10,10,400));row.onpointerup(event(10,10,440));assert.equal(p.plays,1);
 });
}

for(const project of ['rescene','babymonster']) {
 test(project+' resumes after three quiet seconds only while playing',async()=>{
  const s=await setup(project,require('../'+project+'/songs.json')),p=s.players[0];p.ready();p.state=1;
  const list=s.get('ktvList'),following=()=>s.following();
  list.onwheel();s.advance(2999);s.tick();assert.equal(following(),'false');
  s.advance(1);s.tick();assert.equal(following(),'true');
  list.onscroll();s.advance(4000);s.tick();assert.equal(following(),'true','automatic scroll does not disable follow');
  for(const state of [2,3,0]){list.onwheel();p.state=state;s.advance(4000);s.tick();assert.equal(following(),'false');}
  p.state=1;s.tick();assert.equal(following(),'true');
 });
 test(project+' finger hold and momentum postpone recovery',async()=>{
  const s=await setup(project,require('../'+project+'/songs.json')),p=s.players[0];p.ready();p.state=1;
  const list=s.get('ktvList'),following=()=>s.following();
  list.ontouchstart({touches:[{}]});s.advance(5000);s.tick();assert.equal(following(),'false');
  s.dispatch('touchend',{touches:[]});s.advance(2000);list.onscroll();s.advance(2000);list.onscroll();s.tick();assert.equal(following(),'false');
  s.advance(2999);s.tick();assert.equal(following(),'false');s.advance(1);s.tick();assert.equal(following(),'true');
  list.onpointerdown({pointerId:7,pointerType:'mouse',button:0});s.advance(4000);s.tick();assert.equal(following(),'false');
  s.dispatch('pointerup',{pointerId:7});s.advance(3000);s.tick();assert.equal(following(),'true');
  list.ontouchstart({touches:[{},{}]});s.dispatch('touchend',{touches:[{}]});s.advance(4000);s.tick();assert.equal(following(),'false');
  s.dispatch('touchcancel',{touches:[]});s.advance(3000);s.tick();assert.equal(following(),'true');
 });
}

 test('both rooms omit the manual follow button and its DOM handlers',()=>{
  for(const project of ['rescene','babymonster']){
   assert.doesNotMatch(fs.readFileSync(project+'/index.html','utf8'),/id="ktvFollow"|回到目前句/);
   assert.doesNotMatch(fs.readFileSync(project+'/practice.js','utf8'),/\$\('ktvFollow'\)/);
  }
 });

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
  return {motion:reduce=>{context.matchMedia=()=>({matches:reduce})},following:()=>String(vm.runInNewContext("ktvFollow",context)),get,players,timers,location,advance:ms=>{now+=ms},dispatch:(name,event)=>listeners[name](event),navigate:hash=>{location.hash=hash;listeners.hashchange();},tick:()=>intervals.forEach(fn=>fn()),select:i=>{get('songSelect').value=i;get('songSelect').onchange()},enable:()=>{get('continuous').checked=true;get('continuous').onchange()}};
}



for(const number of [1,2,3,4,5,21,23,24]) test('BABYMONSTER live source '+number+' keeps separate cues and restores guide',async()=>{
 const catalog=require('../babymonster/songs.json'),song=catalog.find(s=>s.number===number),s=await setup('babymonster',catalog,'#song-'+number);
 const live=song.sources.find(source=>source.slug==='live');
 s.players[0].ready();s.get('sourceButtons').children[1].onclick();const p=s.players.at(-1);p.ready();
 assert.equal(p.options.videoId,live.videoId);assert.equal(s.get('ktvList').children.length,song.chant.cues.length);
 const cue=live.chant.cues[3];s.get('ktvList').children[3].onclick({detail:0});assert.equal(p.time,Math.max(live.startSeconds,cue.start-3));
 s.get('sourceButtons').children[0].onclick();assert.equal(s.players.at(-1).options.videoId,song.sources[0].videoId);
});

test('MOON live subtitles keep every lyric and chant highlight',()=>{
 const song=require('../babymonster/songs.json').find(s=>s.number===5),live=song.sources.find(s=>s.slug==='live');
 assert.equal(live.subtitles.cues.length,94);assert.equal(live.subtitles.videoId,'fuVaqtSfYvE');
 song.subtitles.cues.forEach((cue,i)=>{const actual=live.subtitles.cues[i];assert.deepEqual(actual.parts,cue.parts);assert.ok(Math.abs(actual.start-cue.start-4.6527)<.001);assert.ok(actual.end<=live.endSeconds);});
});

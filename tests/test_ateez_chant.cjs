const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const Chant=require('../ateez/chant.js'),songs=require('../ateez/songs.json');
test('both catalogs bind exact source IDs and valid nonoverlapping cards',()=>{
  for(const [i,id] of ['bnGARWNOuRw','HlINJYsRw3U'].entries()){
    const song=songs[i];
    assert.equal(song.sources[0].videoId,id);assert.ok(Chant.validTrack(song.chant,id));
    assert.equal(Chant.validTrack(song.chant,songs[1-i].sources[0].videoId),false);
    assert.equal(song.chant.status,'visual_checked_listening_pending');
    for(const c of song.chant.cues){assert.ok(!/[\uac00-\ud7a3。妳她]/.test(c.text));assert.ok(c.end<= (i?232.9:171.8));}
  }
});
test('local evidence ledgers match published cards', {skip: !songs.every(s=>fs.existsSync(`video/${s.chant.videoId}/chant-ledger.json`))},()=>{
  for(const song of songs){
    const ledger=JSON.parse(fs.readFileSync(`video/${song.chant.videoId}/chant-ledger.json`));
    assert.deepEqual(song.chant.cues,ledger.cards.map(({start,end,text})=>({start,end,text})));
  }
});
test('every cue: exact boundary, backwards seek, rate, pause and buffering',()=>{
  for(const song of songs) for(const c of [...song.chant.cues].reverse())for(const rate of [.5,1,2]){
    assert.equal(Chant.state(song.chant,c.start,1,rate).text,c.text);
    assert.equal(Chant.state(song.chant,c.start,1,rate).mode,'active');
    assert.equal(Chant.state(song.chant,c.end,1,rate).mode==='active',song.chant.cues.some(n=>n.start===c.end));
    for(const s of [-1,2,3,5]){assert.equal(Chant.state(song.chant,c.start,s,rate).mode,'paused');assert.equal(Chant.state(song.chant,c.start,s,rate).count,'');}
  }
});
test('waiting shows the next card directly; short gaps have no countdown',()=>{
  const t={cues:[{start:10,end:11,text:'A'},{start:12,end:13,text:'B'},{start:20,end:21,text:'C'}]};
  assert.equal(Chant.state(t,11.5,1).mode,'gap');assert.equal(Chant.state(t,11.5,1).count,'');
  assert.equal(Chant.state(t,11.5,1).text,'B');assert.equal(Chant.state(t,14,1).text,'C');
  assert.equal(Chant.state(t,14,1).next,'');
  for(const [time,count]of [[17,'3'],[18,'2'],[19,'1']])assert.equal(Chant.state(t,time,1).count,count);
});
async function setup(){
 const elements=new Map(),players=[],intervals=[],store={};
 const element=()=>({style:{setProperty(){}},dataset:{},checked:false,children:[],focus(){},scrollIntoView(){},setAttribute(k,v){this[k]=v},removeAttribute(){},append(...a){this.children.push(...a)},replaceChildren(...a){this.children=a}});
 const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
 const ctx={document:{getElementById:get,createElement:element,querySelectorAll:()=>[],querySelector:()=>element(),head:element()},location:{hash:'',origin:'http://localhost'},history:{replaceState(){}},localStorage:{getItem:k=>store[k],setItem:(k,v)=>store[k]=v},fetch:async()=>({ok:true,json:async()=>songs}),setTimeout:()=>1,clearTimeout(){},setInterval:fn=>intervals.push(fn),addEventListener(){},Chant};ctx.window=ctx;
 ctx.YT={Player:function(id,options){const p={options,time:0,state:-1,rate:1,destroy(){},getCurrentTime(){return this.time},getDuration:()=>233,getPlayerState(){return this.state},getPlaybackRate(){return this.rate},getAvailablePlaybackRates:()=>[.5,1,2],setPlaybackRate(r){this.rate=r},seekTo(t){this.time=t},playVideo(){this.state=1},pauseVideo(){this.state=2},ready(){options.events.onReady({target:this})},emit(s){this.state=s;options.events.onStateChange({data:s})}};players.push(p);return p}};
 vm.runInNewContext(fs.readFileSync('ateez/practice.js','utf8'),ctx);await new Promise(r=>setImmediate(r));
 return {get,players,store,tick:()=>intervals.forEach(fn=>fn()),select:i=>{get('songSelect').value=i;get('songSelect').onchange()}};
}
test('previous/next, repeat, single cue loop and scrub on both songs',async()=>{
 const s=await setup();for(let i=0;i<2;i++){
  if(i)s.select(i);const p=s.players.at(-1),c=songs[i].chant.cues;p.ready();p.time=c[0].start;
  s.get('nextCue').onclick();assert.equal(p.time,Math.max(0,c[1].start-3,c[0].end));
  s.get('repeatCue').onclick();assert.equal(p.state,1);assert.equal(p.time,Math.max(0,c[1].start-3,c[0].end));
  s.get('previousCue').onclick();assert.equal(p.time,Math.max(0,c[0].start-3));
  s.get('loopCue').checked=true;s.get('loopCue').onchange();p.time=c[0].end;s.tick();assert.equal(p.time,Math.max(0,c[0].start-3));
  s.get('seek').value=30;s.get('seek').oninput();assert.equal(s.get('loopCue').checked,false);assert.equal(p.time,30);
 }
});
test('switch resets cue/loop, ignores old player callbacks; favorites use ATEEZ storage',async()=>{
 const s=await setup(),old=s.players[0];old.ready();s.get('loopCue').checked=true;s.get('loopCue').onchange();
 const row=s.get('songList').children[0];row.children[1].onclick();assert.ok(JSON.parse(s.store['ateez-practice']).favorites.includes(1));
 s.select(1);assert.equal(s.get('loopCue').checked,false);assert.equal(s.get('chantCount').textContent,'');
 const p=s.players.at(-1);p.ready();p.time=songs[1].chant.cues[0].start;p.emit(1);old.emit(1);
 assert.equal(s.get('chantText').textContent,'Garage');assert.equal(p.options.videoId,'HlINJYsRw3U');
});

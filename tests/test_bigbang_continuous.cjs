const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
async function setup() {
  const elements = new Map(), players = [], timers = new Map();
  const element = () => ({dataset:{}, checked:false, children:[], append(...items){this.children.push(...items)}, replaceChildren(...items){this.children=items}, setAttribute(){}, removeAttribute(){}, scrollIntoView(){}});
  const get = id => {if(!elements.has(id)) elements.set(id,element());return elements.get(id)};
  const songs = [true,false,true,true].map((video,i)=>({number:i+1,title:`Song ${i+1}`,artist:'BIGBANG',section:'Main',note:'',sources:video?[{videoId:`id${i}`,kind:'影片'}]:[]}));
  const context = {document:{getElementById:get,createElement:element,querySelectorAll:()=>[],head:element()},location:{hash:'',origin:'http://localhost'},history:{replaceState(){}},fetch:async()=>({ok:true,json:async()=>songs}),setTimeout:fn=>{const id=timers.size+1;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id),setInterval(){},addEventListener(){}};
  context.window=context;
  context.YT={Player:function(id,options){const p={options,state:-1,plays:0,destroy(){},getAvailablePlaybackRates:()=>[1],getPlaybackRate:()=>1,getPlayerState(){return this.state},playVideo(){this.plays++;this.state=1},pauseVideo(){this.state=2},emit(data){this.state=data;options.events.onStateChange({data})},ready(){options.events.onReady({target:this})}};players.push(p);return p}};
  vm.runInNewContext(fs.readFileSync('bigbang/practice.js','utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  return {get,players,timers,select:i=>{get('songSelect').value=i;get('songSelect').onchange()},enable:()=>{get('continuous').checked=true;get('continuous').onchange()}};
}
test('off by default; ended stays on current song',async()=>{const s=await setup();s.players[0].ready();s.players[0].emit(0);assert.equal(s.players.length,1);assert.equal(s.get('continuous').checked,false)});
test('advance skips missing videos, autoplays and stops at end',async()=>{const s=await setup();s.enable();s.players[0].ready();s.players[0].emit(0);assert.equal(s.players[1].options.videoId,'id2');s.players[1].ready();assert.equal(s.players[1].plays,1);s.players[1].emit(0);s.players[2].ready();s.players[2].emit(0);assert.equal(s.players.length,3);assert.match(s.get('continuousStatus').textContent,/歌單播放完畢/)});
test('manual selection preserves playing or paused intent',async()=>{const s=await setup();s.enable();s.players[0].ready();s.players[0].state=1;s.select(2);s.players[1].ready();assert.equal(s.players[1].plays,1);s.players[1].state=2;s.select(3);s.players[2].ready();assert.equal(s.players[2].plays,0)});
test('explicit error advances; slow loading and blocked autoplay do not',async()=>{const s=await setup();s.enable();for(const fn of [...s.timers.values()])fn();assert.equal(s.players.length,1);s.players[0].options.events.onError();assert.equal(s.players.length,2);s.players[1].ready();s.players[1].options.events.onAutoplayBlocked();assert.equal(s.players.length,2);assert.match(s.get('status').textContent,/請點一下播放/)});
test('disable during loading cancels autoplay and stale callbacks cannot advance',async()=>{const s=await setup();s.enable();s.players[0].ready();s.players[0].emit(0);s.get('continuous').checked=false;s.get('continuous').onchange();s.players[1].ready();assert.equal(s.players[1].plays,0);s.players[0].options.events.onError();assert.equal(s.players.length,2)});

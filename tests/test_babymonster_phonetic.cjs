'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Chant = require('../babymonster/chant.js');
const songs = require('../babymonster/songs.json');

test('all Korean chant cards have phonetics while sources and raw text remain available', () => {
  const tracks = songs.filter(s => s.chant?.phoneticStatus);
  assert.equal(tracks.length, 8);
  let count = 0;
  for (const song of tracks) {
    assert.equal(Chant.validTrack(song.chant, song.chant.videoId), true);
    for (const cue of song.chant.cues) {
      if (!/[가-힣]/u.test(cue.text)) {assert.equal(cue.phoneticZh, undefined);continue;}
      count++;
      assert.ok(cue.phoneticZh.trim());
      assert.ok(!/[가-힣]/u.test(cue.phoneticZh));
    }
  }
  assert.equal(count, 40);
  assert.equal(tracks.find(s => s.number === 3).chant.phoneticStatus, 'source');
  assert.ok(tracks.filter(s => s.number !== 3).every(s => s.chant.phoneticStatus === 'draft'));
});

test('clock selects phonetics on countdown, entry, pause, rewind and next cue', () => {
  const track = {videoId:'demo',cues:[
    {start:5,end:6,text:'예뻐',phoneticZh:'耶波'},
    {start:8,end:9,text:'바빠',phoneticZh:'巴爸'},
    {start:12,end:13,text:'Hey'}
  ]};
  for (const rate of [.5,1,2]) {
    assert.equal(Chant.state(track,4,1,rate).phoneticZh,'耶波');
    assert.equal(Chant.state(track,5,1,rate).text,'예뻐');
    assert.equal(Chant.state(track,5,1,rate).next,'下一句：巴爸');
    assert.equal(Chant.state(track,5,2,rate).phoneticZh,'耶波');
    assert.equal(Chant.state(track,6,1,rate).phoneticZh,'巴爸');
    assert.equal(Chant.state(track,12,1,rate).phoneticZh,'');
    assert.equal(Chant.state(track,5,1,rate).phoneticZh,'耶波');
  }
  assert.equal(Chant.state(track,5,0).phoneticZh,undefined);
  assert.equal(Chant.validTrack({...track,cues:[{...track.cues[0],phoneticZh:42}]},'demo'),false);
});

function element() {
  return {dataset:{},style:{setProperty(){}},checked:false,children:[],textContent:'',
    append(...items){this.children.push(...items)},replaceChildren(...items){this.children=items},
    setAttribute(){},removeAttribute(){},focus(){},scrollIntoView(){}};
}
test('player renders phonetics and original in KTV rows and refreshes them on song changes', async () => {
  const elements = new Map(), players = [], intervals = [];
  const get = id => {if (!elements.has(id)) elements.set(id,element());return elements.get(id)};
  const context = {document:{getElementById:get,createElement:element,querySelectorAll:()=>[],head:element()},
    location:{hash:'#song-3',origin:'http://localhost'},history:{replaceState(){}},
    fetch:async()=>({ok:true,json:async()=>songs}),setTimeout:()=>1,clearTimeout(){},
    setInterval(fn){intervals.push(fn)},addEventListener(){},localStorage:{getItem:()=>null,setItem(){}}};
  context.window = context;
  context.YT = {Player:function(id,options){const p={state:-1,time:0,destroy(){},
    getDuration:()=>240,getCurrentTime(){return this.time},getPlaybackRate:()=>1,getPlayerState(){return this.state},
    seekTo(t){this.time=t},getAvailablePlaybackRates:()=>[1],pauseVideo(){this.state=2},
    ready(){options.events.onReady({target:this})}};players.push(p);return p}};
  vm.createContext(context);
  for (const file of ['chant.js','subtitles.js','practice.js']) vm.runInContext(fs.readFileSync('babymonster/'+file,'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  const rows = () => get('ktvList').children;
  assert.equal(rows().length,songs[2].chant.cues.length);
  context.onYouTubeIframeAPIReady();
  const p=players.at(-1);p.ready();p.time=92.65;p.state=1;
  const tick=()=>intervals.forEach(fn=>fn());tick();
  const active=()=>rows().find(row=>row.dataset.state==='active');
  assert.equal(active().children[1].children[0].textContent,'逼ㄎㄧㄜ');
  assert.equal(active().children[1].children[1].textContent,'비켜 · bi-kyeo\n逼ㄎㄧㄜ');
  p.state=2;tick();assert.ok(active());
  get('wordingMode').value='original';get('wordingMode').onchange();tick();
  assert.equal(active().children[1].children.length,1);
  assert.equal(active().children[1].children[0].textContent,'비켜 · bi-kyeo\n逼ㄎㄧㄜ');
  vm.runInContext('selectSong(6)',context);
  assert.equal(rows().length,songs[6].chant.cues.length);
  const sheesh=players.at(-1);sheesh.ready();sheesh.time=56.45;sheesh.state=1;tick();
  assert.equal(active().children[1].children[0].textContent,'축복');
  vm.runInContext('selectSong(0)',context);
  assert.equal(rows().length,songs[0].chant.cues.length);
});

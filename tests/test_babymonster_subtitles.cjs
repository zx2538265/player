const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Subtitles = require('../babymonster/subtitles.js');
const Chant = require('../babymonster/chant.js');
const songs = require('../babymonster/songs.json');
const song = songs.find(s => s.number === 6), track = song.subtitles;
const marked = track.cues.filter(c => c.parts.some(p => p.chant));

test('CLIK CLAK plays the stage video and credits the separate chant source', () => {
  assert.equal(song.sources.find(s => s.videoId).videoId, 'S9JKTaTRQ1w');
  assert.equal(song.sources[1].url, 'https://www.youtube.com/watch?v=X8XeiElkI34');
  assert.equal(track.sourceVideoId, 'X8XeiElkI34');
  assert.equal(Subtitles.validTrack(track, 'S9JKTaTRQ1w'), true);
  assert.equal(Subtitles.validTrack(track, 'X8XeiElkI34'), false);
  assert.equal(Chant.validTrack(song.chant, 'S9JKTaTRQ1w'), true);
  assert.equal(track.cues.length, 76);
  assert.equal(song.chant.cues.length, 57);
  assert.equal(marked.length,48);
  assert.equal(track.cues.filter(c => c.parts.every(p => !p.chant)).length,28);
  assert.equal(Subtitles.at(track,30,1).parts[0].text,'I need a van to hold all my bags');
  assert.equal(Chant.state(song.chant,30,1).mode,'waiting');
  assert.equal(song.chant.cues.at(-1).text, '（歡呼聲）');
  assert.equal(track.cues.some(c => c.parts.some(p => p.text.includes('歡呼'))), false);
  assert.equal(songs[3].sources[0].videoId, 'X2GfGkH-3hg');
});

test('highlight only the marked occurrence, including two separated responses', () => {
  assert.deepEqual(marked[2].parts, [
    {text:'CLIK CLAK ',chant:false}, {text:'CLIK CLAK',chant:true}, {text:' CLIK CLAK',chant:false}
  ]);
  assert.equal(marked[7].parts.filter(p => p.chant).length, 2);
  assert.equal(marked[7].parts.map(p => p.text).join(''), 'You say both (both) both (both)');
  assert.equal(marked[37].parts.filter(p => p.chant).length, 2);
  assert.equal(marked[32].parts.at(-1).text, ' heels tap ×3');
  assert.equal(song.chant.cues.filter(c => c.start > 121 && c.start < 126).length, 3);
});

test('all captions follow the clock, remain on pause, and clear at exclusive ends', () => {
  for (const cue of [...track.cues].reverse()) {
    for (const state of [1,2,3,-1]) {
      assert.equal(Subtitles.at(track, cue.start, state), cue);
      assert.equal(Subtitles.at(track, cue.end - .001, state), cue);
    }
    assert.notEqual(Subtitles.at(track, cue.end, 1), cue);
    assert.equal(Subtitles.at(track, cue.start, 0), null);
    assert.ok(cue.parts.every(p => typeof p.chant === 'boolean'));
  }
  assert.equal(Subtitles.at(track, 0, 1), null);
  assert.equal(Subtitles.at(track, 170, 1), null);
  assert.equal(Subtitles.at(track, NaN, 1), null);
  assert.equal(Chant.state(song.chant, 12.5, 1).mode, 'countdown');
  assert.equal(Chant.state(song.chant, song.chant.cues[2].start, 1).label, '現在喊！');
});

test('invalid subtitle shapes fail closed', () => {
  for (const mutate of [t=>t.cues[0].parts=[], t=>t.cues[0].parts[0].chant='yes',
    t=>t.cues[1].start=0, t=>t.cues[0].end=-1, t=>t.cues[0].parts[0].text=null]) {
    const t = structuredClone(track); mutate(t);
    assert.equal(Subtitles.validTrack(t, t.videoId), false);
  }
});

function element(tagName='div') {
  return {tagName, dataset:{}, style:{setProperty(){}}, checked:false, children:[],
    _text:'', get textContent(){return this.children.length ? this.children.map(c=>c.textContent).join('') : this._text},
    set textContent(value){this._text=value;this.children=[]},
    append(...items){this.children.push(...items)}, replaceChildren(...items){this.children=items;this._text=''},
    setAttribute(){}, removeAttribute(){}, focus(){}, scrollIntoView(){}};
}

test('caption renderer preserves literal text and does not inject HTML', () => {
  const context = {document:{createElement:element}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('babymonster/subtitles.js','utf8'), context);
  const container=element();context.container=container;
  context.cue={parts:[{text:'<img src=x onerror=alert(1)>',chant:false},{text:'& <b>chant</b>',chant:true}]};
  vm.runInContext('Subtitles.render(container, cue)',context);
  assert.deepEqual(container.children.map(c=>c.tagName),['span','strong']);
  assert.equal(container.children[0].textContent, '<img src=x onerror=alert(1)>');
  const first=container.children[0];
  vm.runInContext('Subtitles.render(container, cue)',context);
  assert.equal(container.children[0],first);
  vm.runInContext('Subtitles.render(container, null)',context);
  assert.equal(container.textContent,'');
});

async function setup() {
  const elements=new Map(),players=[],intervals=[];
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
  const context={document:{getElementById:get,createElement:element,querySelectorAll:()=>[],head:element()},
    location:{hash:'#song-6',origin:'http://localhost'},history:{replaceState(){}},
    fetch:async()=>({ok:true,json:async()=>songs}),setTimeout:()=>1,clearTimeout(){},setInterval(fn){intervals.push(fn)},addEventListener(){},
    localStorage:{getItem:()=>'{"subtitleEnabled":false}',setItem(){}}};
  context.window=context;
  context.YT={Player:function(id,options){const p={options,state:-1,time:0,rate:1,destroy(){},
    getDuration:()=>190,getCurrentTime(){return this.time},getPlaybackRate(){return this.rate},getPlayerState(){return this.state},
    seekTo(t){this.time=t},getAvailablePlaybackRates:()=>[.5,1,2],setPlaybackRate(r){this.rate=r},
    playVideo(){this.state=1},pauseVideo(){this.state=2},ready(){options.events.onReady({target:this})}};players.push(p);return p}};
  vm.createContext(context);
  for(const file of ['chant.js','subtitles.js','practice.js'])vm.runInContext(fs.readFileSync('babymonster/'+file,'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  context.onYouTubeIframeAPIReady();
  return {get,players,tick(){intervals.forEach(fn=>fn())},select(i){vm.runInContext(`selectSong(${i})`,context)}};
}

test('player integration: automatic overlay, seeking, pause, rate, song changes and stale events', async () => {
  const s=await setup(),p=s.players.at(-1);p.ready();
  assert.equal(p.options.videoId,'S9JKTaTRQ1w');
  assert.equal(p.options.playerVars.end,174);
  assert.ok(s.get('videoContainer').children.includes(s.get('subtitleDisplay')));
  p.time=marked[2].start;p.state=1;s.tick();
  assert.equal(s.get('subtitleText').textContent,'CLIK CLAK CLIK CLAK CLIK CLAK');
  assert.deepEqual(s.get('subtitleText').children.map(c=>c.className),['subtitle-lyric','subtitle-chant','subtitle-lyric']);
  p.state=2;s.tick();assert.equal(s.get('subtitleText').children[1].tagName,'strong');
  p.rate=.5;s.tick();assert.equal(s.get('subtitleText').children[1].tagName,'strong');
  s.get('chantEnabled').checked=false;s.get('chantEnabled').onchange();
  assert.equal(s.get('subtitleDisplay').hidden,false);assert.equal(s.get('chantDisplay').hidden,true);
  s.get('seek').value='0';s.get('seek').oninput();s.tick();assert.equal(s.get('subtitleText').textContent,'');
  s.get('seek').value=String(marked[7].start);s.get('seek').oninput();s.tick();
  assert.equal(s.get('subtitleText').textContent,'You say both (both) both (both)');
  s.get('seek').value='30';s.get('seek').oninput();s.tick();
  assert.equal(s.get('subtitleText').textContent,'I need a van to hold all my bags');
  assert.ok(s.get('subtitleText').children.every(c=>c.className==='subtitle-lyric'));
  s.select(3);assert.equal(s.get('subtitlePanel').hidden,true);assert.equal(s.get('subtitleText').textContent,'');
  p.options.events.onStateChange({data:1});assert.equal(s.get('subtitlePanel').hidden,true);
  s.select(5);const next=s.players.at(-1);next.ready();s.tick();assert.equal(s.get('subtitleText').textContent,'');
  assert.ok(s.get('videoContainer').children.includes(s.get('subtitleDisplay')));
  next.time=marked[0].start;next.state=1;s.tick();assert.ok(s.get('subtitleText').textContent);
  next.state=0;s.tick();assert.equal(s.get('subtitleText').textContent,'');
  next.state=1;next.time=173.9;s.tick();assert.equal(next.state,1);
  next.time=174;s.tick();assert.equal(next.state,2);
  assert.equal(s.get('chantLabel').textContent,'本首練習結束');
});

 test('CLIK CLAK response entrances exclude preceding lyrics and gaps between responses', () => {
  for (const time of [10.9,12.5,16,20,23,26.5,37.5,38.65,41.2,42.3,122.3,124,125.8,140.5]) {
    assert.notEqual(Chant.state(song.chant,time,1).mode,'active',`unexpected chant at ${time}`);
  }
  for (const time of [11.4,13.2,17.2,20.8,24.35,27.9,38.2,39,41.8,42.65,121.2,123,124.8,139.5,141.3]) {
    assert.equal(Chant.state(song.chant,time,1).mode,'active',`missing chant at ${time}`);
  }
  for (const cue of song.chant.cues) {
    assert.equal(Chant.state(song.chant,cue.start,1).mode,'active');
    assert.equal(Chant.state(song.chant,cue.start,2).mode,'paused');
    assert.notEqual(Chant.state(song.chant,cue.end,1).mode,'active');
  }
});

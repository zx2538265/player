const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const songs=require('../bigbang/songs.json');
const Subtitles=require('../bigbang/subtitles.js');
function element(tagName='div') {
  return {tagName, dataset:{}, style:{setProperty(){}}, checked:false, children:[],
    _text:'', get textContent(){return this.children.length ? this.children.map(c=>c.textContent).join('') : this._text},
    set textContent(value){this._text=value;this.children=[]},
    append(...items){this.children.push(...items)}, replaceChildren(...items){this.children=items;this._text=''},
    setAttribute(){}, removeAttribute(){}, focus(){}, scrollIntoView(){}};
}

async function setup() {
  const elements=new Map(),players=[],intervals=[];
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
  const context={document:{getElementById:get,createElement:element,querySelectorAll:()=>[],head:element()},
    location:{hash:'#song-10',origin:'http://localhost'},history:{replaceState(){}},
    fetch:async()=>({ok:true,json:async()=>songs}),setTimeout:()=>1,clearTimeout(){},setInterval(fn){intervals.push(fn)},addEventListener(){},
    localStorage:{getItem:()=>'{"subtitleEnabled":false}',setItem(){}}};
  context.window=context;
  context.YT={Player:function(id,options){const p={options,state:-1,time:0,rate:1,destroy(){},
    getDuration:()=>149.581,getCurrentTime(){return this.time},getPlaybackRate(){return this.rate},getPlayerState(){return this.state},
    seekTo(t){this.time=t},getAvailablePlaybackRates:()=>[.5,1,2],setPlaybackRate(r){this.rate=r},
    playVideo(){this.state=1},pauseVideo(){this.state=2},ready(){options.events.onReady({target:this})}};players.push(p);return p}};
  vm.createContext(context);
  for(const file of ['chant.js','subtitles.js','practice.js'])vm.runInContext(fs.readFileSync('bigbang/'+file,'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  context.onYouTubeIframeAPIReady();
  return {get,players,tick(){intervals.forEach(fn=>fn())},select(i){vm.runInContext(`selectSong(${i})`,context)}};
}

test('LIES keeps only chant overlays on the original video', () => {
  const song=songs[9];
  assert.equal(song.sources[0].videoId,'kppPmFtBB70');
  assert.equal(song.sources[0].startSeconds,0);
  assert.equal(song.chantOverlay,true);
  assert.equal(song.subtitles,undefined);
  assert.equal(song.chant.cues.length,13);
});

test('LIES overlay survives seek, pause, speed and switches without stale captions',async()=>{
  const s=await setup(),p=s.players.at(-1),cue=songs[9].chant.cues[0];
  p.ready();
  s.get('chantEnabled').checked=true;
  assert.equal(p.options.playerVars.start,0);
  assert.match(s.get('watchLink').href,/kppPmFtBB70/);
  assert.ok(s.get('videoContainer').children.includes(s.get('subtitleDisplay')));
  p.time=0;p.state=1;s.tick();assert.equal(s.get('subtitleDisplay').hidden,true);
  p.time=cue.start;s.tick();assert.equal(s.get('subtitleText').textContent,cue.text);
  p.state=2;p.rate=.5;s.tick();assert.equal(s.get('subtitleText').textContent,cue.text);
  s.get('seek').value='0';s.get('seek').oninput();s.tick();
  assert.equal(p.time,0);assert.equal(s.get('subtitleText').textContent,'');
  p.time=cue.start;p.state=1;s.tick();
  s.select(0);assert.equal(s.get('subtitlePanel').hidden,true);assert.equal(s.get('subtitleText').textContent,'');
  p.options.events.onStateChange({data:1});assert.equal(s.get('subtitleText').textContent,'');
  s.select(9);const next=s.players.at(-1);next.ready();
  next.time=cue.start;next.state=1;s.tick();assert.ok(s.get('subtitleText').textContent);
  next.state=0;s.tick();assert.equal(s.get('subtitleText').textContent,'');
});

test('HTML and Pages package include the subtitle runtime and overlay controls',()=>{
  const html=fs.readFileSync('bigbang/index.html','utf8');
  assert.ok(html.indexOf('src="subtitles.js')<html.indexOf('src="practice.js'));
  for(const id of ['subtitleDisplay','subtitleText','subtitlePanel','subtitleFullscreen','exitVideoFullscreen']) assert.ok(html.includes(`id="${id}"`));
  const build=fs.readFileSync('scripts/prepare_pages.py','utf8').split('if (root / "bigbang").is_dir():')[1].split('if (root / "babymonster").is_dir():')[0];
  assert.ok(build.includes('"subtitles.js"'));
});

test('LIES retains the three-person intro and original bridge on the original video clock',()=>{
  const Chant=require('../bigbang/chant.js'),track=songs[9].chant;
  assert.equal(Chant.validTrack(track,'kppPmFtBB70'),true);
  assert.equal(Chant.validTrack(track,'-3VANu3agYE'),false);
  assert.equal(track.cues.length,13);
  assert.deepEqual(track.cues.slice(0,3).map(c=>c.text),[
    '寬基勇\n東永培\n康爹送','VIP\n擁吻你\n撒朗嘿','屋哩 BIGBANG！'
  ]);
  assert.equal(track.cues[0].start,12);
  assert.equal(track.cues[0].end,14.7);
  assert.equal(track.cues[8].text,'ㄏㄤˋ 喪\nHam Gay 嘿');
  assert.equal(track.cues[8].start,88.9);
  assert.equal(track.cues.at(-1).end,140.2);
  assert.equal(track.cues.filter(c=>c.text==='搜哩').length,2);
  assert.equal(track.cues.filter(c=>c.text==='I love you\nmore more').length,2);
  for(const c of track.cues) {
    assert.equal(Chant.state(track,c.start,1).text,c.text);
    assert.equal(Chant.state(track,c.start,2).count,'');
  }
  assert.equal(Chant.state(track,11,1,.5).count,'2');
  assert.equal(Chant.state(track,71.167,1).mode,'countdown');
  assert.equal(Chant.state(track,138.267,1).mode,'countdown');
  assert.ok(songs[9].sources.some(s=>s.url.endsWith('LeY0M83P7zg')));
});

 test('LIES displays only yellow chants and hides gaps and disabled overlays',async()=>{
  const s=await setup(),p=s.players.at(-1);p.ready();
  s.get('chantEnabled').checked=true;
  p.state=1;p.time=12;s.tick();
  assert.equal(s.get('subtitleText').textContent,'寬基勇\n東永培\n康爹送');
  assert.equal(s.get('subtitleText').children[0].className,'subtitle-chant');
  p.time=57.067;s.tick();
  const combined=s.get('subtitleText').textContent;
  assert.ok(combined.includes('你嘎 批溜嘿'));
  assert.ok(s.get('subtitleText').children.every(c=>c.className==='subtitle-chant'));
  p.state=2;s.tick();assert.equal(s.get('subtitleText').textContent,combined);
  s.get('chantEnabled').checked=false;s.tick();
  assert.ok(!s.get('subtitleText').textContent.includes('你嘎 批溜嘿'));
  assert.equal(s.get('subtitleText').textContent,'');
  assert.equal(s.get('subtitleDisplay').hidden,true);
  s.get('chantEnabled').checked=true;p.state=1;p.time=25;s.tick();
  assert.equal(s.get('subtitleText').textContent,'');
  assert.equal(s.get('subtitleDisplay').hidden,true);
  p.state=0;s.tick();assert.equal(s.get('subtitleText').textContent,'');
});

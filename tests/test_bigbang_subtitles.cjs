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
    getDuration:()=>272,getCurrentTime(){return this.time},getPlaybackRate(){return this.rate},getPlayerState(){return this.state},
    seekTo(t){this.time=t},getAvailablePlaybackRates:()=>[.5,1,2],setPlaybackRate(r){this.rate=r},
    playVideo(){this.state=1},pauseVideo(){this.state=2},ready(){options.events.onReady({target:this})}};players.push(p);return p}};
  vm.createContext(context);
  for(const file of ['chant.js','subtitles.js','practice.js'])vm.runInContext(fs.readFileSync('bigbang/'+file,'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  context.onYouTubeIframeAPIReady();
  return {get,players,tick(){intervals.forEach(fn=>fn())},select(i){vm.runInContext(`selectSong(${i})`,context)}};
}

test('LIES uses concert lyrics on its absolute clock and excludes the omitted verse', () => {
  const song=songs[9],track=song.subtitles;
  assert.equal(song.sources[0].videoId,'-3VANu3agYE');
  assert.equal(song.sources[0].startSeconds,126);
  assert.equal(song.chant.videoId,'-3VANu3agYE');
  assert.equal(Subtitles.validTrack(track,'-3VANu3agYE'),true);
  assert.equal(Subtitles.validTrack(track,'kppPmFtBB70'),false);
  assert.equal(Subtitles.at(track,126,1),null);
  const text=track.cues.map(c=>c.parts.map(p=>p.text).join('')).join('\n');
  assert.ok(!text.includes('그댈 위해서'));
  assert.ok(!text.includes('love is pain'));
  assert.equal(track.cues.filter(c=>c.parts[0].text.includes('나를 떠나')).length,2);
  for(const cue of track.cues) {
    assert.ok(cue.start>=126 && cue.end<=272);
    assert.ok(cue.parts.every(p=>p.chant===false));
    for(const state of [1,2,3]) assert.equal(Subtitles.at(track,cue.start,state),cue);
    assert.notEqual(Subtitles.at(track,cue.end,1),cue);
    assert.equal(Subtitles.at(track,cue.start,0),null);
  }
});

test('LIES overlay survives seek, pause, speed and switches without stale captions',async()=>{
  const s=await setup(),p=s.players.at(-1),cue=songs[9].subtitles.cues[0];
  p.ready();
  assert.equal(p.options.playerVars.start,126);
  assert.match(s.get('watchLink').href,/t=126s/);
  assert.ok(s.get('videoContainer').children.includes(s.get('subtitleDisplay')));
  p.time=126;p.state=1;s.tick();assert.equal(s.get('subtitleDisplay').hidden,true);
  p.time=cue.start;s.tick();assert.equal(s.get('subtitleText').textContent,cue.parts[0].text);
  p.state=2;p.rate=.5;s.tick();assert.equal(s.get('subtitleText').textContent,cue.parts[0].text);
  s.get('seek').value='0';s.get('seek').oninput();s.tick();
  assert.equal(p.time,126);assert.equal(s.get('subtitleText').textContent,'');
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

test('LIES retains the three-person intro and original bridge on the concert clock',()=>{
  const Chant=require('../bigbang/chant.js'),track=songs[9].chant;
  assert.equal(Chant.validTrack(track,'-3VANu3agYE'),true);
  assert.equal(Chant.validTrack(track,'kppPmFtBB70'),false);
  assert.equal(track.cues.length,13);
  assert.deepEqual(track.cues.slice(0,3).map(c=>c.text),[
    '寬基勇\n東永培\n康爹送','VIP\n永碗逆\n撒朗嘿','屋哩 BIGBANG！'
  ]);
  assert.equal(track.cues[0].start,133.633);
  assert.equal(track.cues[0].end,136.333);
  assert.equal(track.cues[8].text,'ㄏㄤˋ 喪\nHam Gay 嘿');
  assert.equal(track.cues[8].start,210.533);
  assert.equal(track.cues.at(-1).end,261.833);
  assert.equal(track.cues.filter(c=>c.text==='搜哩').length,2);
  assert.equal(track.cues.filter(c=>c.text==='I love you\nmore more').length,2);
  for(const c of track.cues) {
    assert.equal(Chant.state(track,c.start,1).text,c.text);
    assert.equal(Chant.state(track,c.start,2).count,'');
  }
  assert.equal(Chant.state(track,132.633,1,.5).count,'2');
  assert.equal(Chant.state(track,192.8,1).mode,'countdown');
  assert.equal(Chant.state(track,259.9,1).mode,'countdown');
  assert.ok(songs[9].sources.some(s=>s.url.endsWith('LeY0M83P7zg')));
});

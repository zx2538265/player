const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const srt = fs.readFileSync(path.join(root, 'srt/8e0FfuwOI9M.srt'), 'utf8');
const layout = JSON.parse(fs.readFileSync(path.join(root, 'srt/8e0FfuwOI9M.layout.json'), 'utf8'));
function section(start, end) { return html.slice(html.indexOf(start), html.indexOf(end)); }
function setup() {
  const context = { subtitles: [], currentSubtitleIndex: -1, subtitleSearchHintIndex: -1,
    subtitleEl: { textContent: '' }, subtitleTopEl: { textContent: '' },
    subtitleItemElements: [], renderSubtitleList() {} };
  vm.createContext(context);
  vm.runInContext(section('    function srtTimeToSeconds(', '    function formatTime(')
    + section('    function updateActiveSubtitle(', '    function syncSubtitle(')
    + section('    function setSubtitles(', '    function getFullscreenElement('), context);
  return context;
}
test('scene label is above while the simultaneous dialogue stays below', () => {
  const app = setup();
  const cues = app.parseSrt(srt, layout);
  const mixed = cues.find(c => c.text.includes('你去那邊啦\n抵達環球城站'));
  assert.ok(mixed);
  app.setSubtitles(cues);
  app.updateActiveSubtitle(cues.indexOf(mixed));
  assert.equal(app.subtitleTopEl.textContent, '抵達環球城站');
  assert.equal(app.subtitleEl.textContent, '你去那邊啦');
});
test('all delivered cues keep their content and timing; every declared label is present', () => {
  const app = setup();
  const original = app.parseSrt(srt);
  const positioned = app.parseSrt(srt, layout);
  assert.ok(positioned.length > 750);
  positioned.forEach((cue, i) => {
    assert.equal(cue.text, original[i].text);
    assert.equal(cue.start, original[i].start);
    assert.equal(cue.end, original[i].end);
    assert.deepEqual([...cue.topText.split('\n'), ...cue.bottomText.split('\n')].filter(Boolean).sort(),
      cue.text.split('\n').sort());
  });
  for (const label of layout.topCaptions) assert.ok(positioned.some(c => c.topText.split('\n').includes(label)), label);
});
test('filming-restriction overlay is removed while that scene dialogue remains', () => {
  const app = setup(); const cues = app.parseSrt(srt, layout);
  assert.ok(cues.every(c => !c.text.includes('禁止拍攝的空間')));
  for (const text of ['因為聚集的人太多', '保安剛剛聯絡我們', '我們現在躲起來了', '（天真）'])
    assert.ok(cues.some(c => c.bottomText.includes(text)), text);
});
test('top-only captions do not repeat below; seek gaps and video switches clear both layers', () => {
  const app = setup(); const cues = app.parseSrt(srt, layout);
  app.setSubtitles(cues);
  app.updateActiveSubtitle(cues.findIndex(c => c.text === '抵達環球城站'));
  assert.equal(app.subtitleEl.textContent, '');
  assert.equal(app.subtitleTopEl.textContent, '抵達環球城站');
  app.updateActiveSubtitle(-1);
  assert.equal(app.subtitleTopEl.textContent, '');
  app.updateActiveSubtitle(cues.findIndex(c => c.text === '抵達環球城站'));
  app.setSubtitles([]);
  assert.equal(app.subtitleTopEl.textContent, '');
  assert.equal(app.subtitleEl.textContent, '');
});
test('ordinary subtitles and invalid layout options preserve the default bottom placement', () => {
  const app = setup();
  for (const invalid of [null, {}, { topCaptions: '抵達環球城站' }]) {
    const cues = app.parseSrt(srt, invalid);
    assert.ok(cues.every(c => c.topText === '' && c.bottomText === c.text));
  }
});
function loader(fetch) {
  const app=setup(); Object.assign(app, { fetch, AbortSignal, subtitleRequestToken:0, infoEl:{textContent:''} });
  vm.runInContext(section('    async function loadSubtitleFromSrtFolder(', '    async function loadVideoById('),app);
  return app;
}
test('missing or malformed placement file does not prevent subtitle loading', async () => {
  for (const layoutResponse of [() => ({ok:false}), () => {throw Error('offline');},
    () => ({ok:true,json:async()=>{throw Error('invalid JSON');}})]) {
    const app=loader(async url => url.endsWith('.srt') ? {ok:true,text:async()=>srt} : layoutResponse());
    assert.equal(await app.loadSubtitleFromSrtFolder('8e0FfuwOI9M'),true);
    assert.equal(app.subtitles.length,780);
    assert.ok(app.subtitles.every(c=>c.topText===''));
  }
});
test('a delayed layout from the previous video cannot replace current subtitles', async () => {
  let resolveLayout;
  const app=loader(async url => {
    if (url.includes('previous') && url.endsWith('.layout.json'))
      return new Promise(done=>{resolveLayout=done;});
    return url.endsWith('.srt') ? {ok:true,text:async()=>srt.replaceAll('抵達環球城站','目前影片')} : {ok:false};
  });
  const previous=app.loadSubtitleFromSrtFolder('previous');
  await Promise.resolve();
  await app.loadSubtitleFromSrtFolder('current');
  resolveLayout({ok:true,json:async()=>({topCaptions:['目前影片']})});
  await previous;
  assert.ok(app.subtitles.every(c=>c.topText===''));
});

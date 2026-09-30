const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../playback-progress.js'), 'utf8');
const key = id => 'yt-srt-progress-v1:' + id;

function setup(storageOverride) {
  const data = new Map(), calls = [], prompts = [];
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  const player = {
    id: '', seconds: 0, duration: 1000, status: -1,
    getVideoData() { return { video_id: this.id }; },
    getCurrentTime() { return this.seconds; }, getDuration() { return this.duration; },
    getPlayerState() { return this.status; },
    loadVideoById(options) { calls.push(['load', options]); },
    cueVideoById(options) { calls.push(['cue', options]); }
  };
  const context = {};
  vm.runInNewContext(source, context);
  const progress = context.createPlaybackProgress(() => player, value => prompts.push(value), storageOverride || (() => storage));
  function state(id, status, seconds) {
    Object.assign(player, { id, status, seconds }); progress.state(status);
  }
  function seed(id, seconds = 125) { data.set(key(id), JSON.stringify({ seconds, duration: 1000 })); }
  return { data, calls, prompts, player, progress, state, seed };
}

test('reopening a video offers its saved time and continues at that point', () => {
  const a = setup(); a.seed('A'); a.progress.load('A');
  assert.equal(a.calls[0][0], 'cue');
  assert.equal(a.prompts.at(-1), 125);
  a.progress.save(); assert.equal(JSON.parse(a.data.get(key('A'))).seconds, 125);
  a.progress.choose(false);
  assert.equal(a.calls.at(-1)[1].startSeconds, 125);
  assert.equal(a.prompts.at(-1), null);
});

test('restart clears previous progress and starts at zero', () => {
  const a = setup(); a.seed('A'); a.progress.load('A'); a.progress.choose(true);
  assert.equal(a.data.has(key('A')), false);
  assert.equal(a.calls.at(-1)[1].startSeconds, 0);
});

test('switching saves A before detaching; stale A events cannot write B', () => {
  const a = setup(); a.progress.load('A'); a.state('A', 1, 40);
  a.progress.detach();
  assert.equal(JSON.parse(a.data.get(key('A'))).seconds, 40);
  a.progress.load('B'); a.state('A', 1, 42); a.progress.save();
  assert.equal(a.data.has(key('B')), false);
  a.state('B', 1, 10); a.progress.save();
  assert.equal(JSON.parse(a.data.get(key('B'))).seconds, 10);
  assert.equal(JSON.parse(a.data.get(key('A'))).seconds, 40);
});

test('pause and periodic/background saves persist the current position without subtitles', () => {
  const a = setup(); a.progress.load('A'); a.state('A', 1, 50); a.progress.save();
  assert.equal(JSON.parse(a.data.get(key('A'))).seconds, 50);
  a.state('A', 2, 63);
  assert.equal(JSON.parse(a.data.get(key('A'))).seconds, 63);
  a.player.seconds = 20; a.progress.save();
  assert.equal(JSON.parse(a.data.get(key('A'))).seconds, 20);
});

test('ended clears progress and subsequent pause/pagehide cannot restore the end', () => {
  const a = setup(); a.progress.load('A'); a.state('A', 1, 900); a.progress.save();
  a.state('A', 0, 1000); a.state('A', 2, 999); a.progress.save();
  assert.equal(a.data.has(key('A')), false);
  a.state('A', 1, 5); a.progress.save();
  assert.equal(JSON.parse(a.data.get(key('A'))).seconds, 5);
});

test('native play accepts resume; unplayed cues never overwrite stored progress', () => {
  const a = setup(); a.seed('A'); a.progress.load('A'); a.state('A', 2, 0);
  a.progress.save(); assert.equal(JSON.parse(a.data.get(key('A'))).seconds, 125);
  a.state('A', 1, 126); a.progress.save();
  assert.equal(a.prompts.at(-1), null);
  assert.equal(JSON.parse(a.data.get(key('A'))).seconds, 126);
});

test('blocked storage and corrupt entries do not prevent playback', () => {
  const denied = setup(() => { throw Error('denied'); });
  assert.doesNotThrow(() => {
    denied.progress.load('A'); denied.state('A', 1, 20); denied.progress.save(); denied.state('A', 0, 1000);
  });
  assert.equal(denied.calls[0][0], 'load');
  for (const entry of ['invalid', 'null', '{"seconds":-1,"duration":1000}', '{"seconds":1000,"duration":1000}']) {
    const a = setup(); a.data.set(key('A'), entry); a.progress.load('A');
    assert.equal(a.calls[0][1].startSeconds, 0);
  }
  const full = setup(() => ({ getItem: () => null, setItem() { throw Error('quota'); } }));
  full.progress.load('A'); full.state('A', 1, 10);
  assert.doesNotThrow(() => full.progress.save());
});

test('late native play during subtitle loading cannot overwrite saved progress', () => {
  const a = setup(); a.seed('A'); a.progress.load('A'); a.progress.detach();
  a.state('A', 1, 0); a.progress.save();
  assert.equal(JSON.parse(a.data.get(key('A'))).seconds, 125);
});

test('actual page load flow saves before pausing and only loads the latest subtitle request', async () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const load = html.slice(html.indexOf('    async function loadVideoById(videoId)'), html.indexOf('    retrySubtitlesBtnEl.addEventListener'));
  const events = [], pending = {};
  let request = 0;
  const context = {
    requestedVideoId: '', alert() {},
    progress: { detach: () => events.push('save/detach'), load: id => events.push('load:' + id) },
    window: { updateShareVideo() {} },
    player: { pauseVideo: () => events.push('pause'), loadVideoById() {} },
    subtitleLoadingEl: {}, subtitleLoadingSpinnerEl: {}, retrySubtitlesBtnEl: {}, subtitleLoadingMessageEl: {},
    playerWrapEl: { setAttribute() {} }, setSubtitles() {},
    loadSubtitleFromSrtFolder(id) {
      const token = ++request;
      return new Promise(resolve => { pending[id] = () => resolve(token === request ? false : undefined); });
    }
  };
  vm.runInNewContext(load, context);
  const first = context.loadVideoById('A');
  const second = context.loadVideoById('B');
  pending.B(); await second; pending.A(); await first;
  assert.deepEqual(events, ['save/detach', 'pause', 'save/detach', 'pause', 'load:B']);
  assert.equal(context.subtitleLoadingEl.hidden, true);
});

test('actual page state and visibility hooks forward saves without loaded subtitles', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const handlers = html.slice(html.indexOf('    function handleVisibilityChange()'), html.indexOf('    function handleSubtitleListClick('));
  const events = [];
  const context = {
    document: { hidden: true }, window: {}, subtitleLoadingEl: { hidden: true },
    progress: { save: () => events.push('save'), state: state => events.push(state) },
    syncSubtitle() {}, refreshSyncTimerState() {}, stopSyncTimer() {},
    player: { pauseVideo() {} }, isSyncStateActive: false
  };
  vm.runInNewContext(handlers, context);
  context.handleVisibilityChange(); context.handlePlayerStateChange({ data: 2 });
  context.handlePlayerStateChange({ data: 0 });
  assert.deepEqual(events, ['save', 2, 0]);
  context.subtitleLoadingEl.hidden = false;
  context.handlePlayerStateChange({ data: 1 });
  assert.deepEqual(events, ['save', 2, 0]);
});

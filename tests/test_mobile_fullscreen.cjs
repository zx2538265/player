const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../test.html'), 'utf8');
function section(start, end) {
  return html.slice(html.indexOf(start), html.indexOf(end));
}
function setup() {
  const classes = new Set(['is-fullscreen']);
  const button = { setAttribute() {} };
  const context = {
    window: { innerWidth: 390, innerHeight: 844, matchMedia: () => ({ matches: true }) },
    navigator: { userAgent: 'Instagram' },
    playerWrapEl: { classList: { contains: x => classes.has(x), toggle(x, active) {
      active ? classes.add(x) : classes.delete(x);
    } } },
    toggleRotationBtnEl: button, videoOrientationEl: {}, localStorage: { getItem: () => null },
    isPseudoFullscreen: true, rotationPreference: null, videoOrientation: 'landscape',
    orientationRequestToken: 0, videoOrientationStatusEl: {}, youtubeRatio: { get: async () => null },
    getFullscreenElement: () => null, revealPlayerSideTools() {},
  };
  vm.createContext(context);
  vm.runInContext(section('    function isTouchDevice()', '    function clearOrientationHintTimer()'), context);
  return { context, classes };
}
test('only a known landscape video auto-rotates in a portrait touch in-app browser', () => {
  const { context: app } = setup();
  const base = { fullscreen: true, touch: true, portrait: true, inApp: true,
    orientation: 'landscape', preference: null };
  assert.equal(app.shouldRotatePlayer(base), true);
  for (const change of [{ fullscreen: false }, { touch: false }, { portrait: false },
    { inApp: false }, { orientation: 'portrait' }, { orientation: 'unknown' }]) {
    assert.equal(app.shouldRotatePlayer({ ...base, ...change }), false);
  }
});
test('manual restore overrides automatic rotation; physical landscape avoids double rotation', () => {
  const { context: app, classes } = setup();
  app.syncPlayerRotation(); assert.ok(classes.has('is-rotated'));
  app.togglePlayerRotation(); assert.equal(classes.has('is-rotated'), false);
  app.togglePlayerRotation(); assert.ok(classes.has('is-rotated'));
  app.window.innerWidth = 844; app.window.innerHeight = 390;
  app.syncPlayerRotation(); assert.equal(classes.has('is-rotated'), false);
  assert.equal(app.toggleRotationBtnEl.disabled, true);
  app.window.innerWidth = 390; app.window.innerHeight = 844;
  app.syncPlayerRotation(); assert.ok(classes.has('is-rotated'));
});
test('ordinary browser and unknown video allow manual rotation; exiting resets the choice', () => {
  const { context: app, classes } = setup();
  app.navigator.userAgent = 'Safari'; app.videoOrientation = 'unknown';
  app.syncPlayerRotation(); assert.equal(classes.has('is-rotated'), false);
  app.togglePlayerRotation(); assert.ok(classes.has('is-rotated'));
  app.isPseudoFullscreen = false; classes.delete('is-fullscreen');
  app.syncPlayerRotation(); assert.equal(classes.has('is-rotated'), false);
  assert.equal(app.rotationPreference, null);
});
test('video switch and blocked storage reset stale orientation safely', () => {
  const { context: app, classes } = setup();
  app.syncPlayerRotation();
  app.localStorage.getItem = () => { throw Error('blocked'); };
  app.loadVideoOrientation('another-video');
  assert.equal(app.videoOrientation, 'unknown');
  assert.equal(classes.has('is-rotated'), false);
});
test('late ratio results cannot rotate a different video or override a newer manual choice', async () => {
  const { context: app, classes } = setup();
  let resolve;
  app.youtubeRatio.get = () => new Promise(r => { resolve = r; });
  app.loadVideoOrientation('old-video');
  app.localStorage.getItem = () => 'portrait';
  app.loadVideoOrientation('new-video');
  resolve({ orientation: 'landscape' });
  await Promise.resolve();
  assert.equal(app.videoOrientation, 'portrait');
  assert.equal(classes.has('is-rotated'), false);
});
test('detected landscape enables automatic rotation without changing the auto selection', async () => {
  const { context: app, classes } = setup();
  app.youtubeRatio.get = async () => ({ orientation: 'landscape' });
  app.loadVideoOrientation('new-video');
  await Promise.resolve();
  assert.equal(app.videoOrientation, 'landscape');
  assert.equal(app.videoOrientationEl.value, 'unknown');
  assert.equal(classes.has('is-rotated'), true);
});
test('native fullscreen rejection enters the existing pseudo fullscreen fallback', async () => {
  const context = { getFullscreenElement: () => null, playerWrapEl: {}, isPseudoFullscreen: false,
    requestElementFullscreen: () => Promise.reject(Error('denied')),
    enterPseudoFullscreen() { context.fallback = true; } };
  vm.createContext(context);
  vm.runInContext(section('    async function togglePlayerFullscreen()', '    function handleViewportOrientationChange()'), context);
  await context.togglePlayerFullscreen(); assert.equal(context.fallback, true);
});
test('paused player and open settings keep controls visible; playing schedules hiding', () => {
  let scheduled = 0;
  const app = { clearPlayerControlsHideTimer() {}, isPlayerPlaying: false,
    subtitleSettingsEl: { classList: { contains: () => false } }, isPointerInsideSideTools: false,
    setTimeout() { scheduled++; }, playerControlsAutoHideDelay: 2200 };
  vm.createContext(app);
  vm.runInContext(section('    function schedulePlayerSideToolsAutoHide()', '    function revealPlayerSideTools()'), app);
  app.schedulePlayerSideToolsAutoHide(); assert.equal(scheduled, 0);
  app.isPlayerPlaying = true;
  app.schedulePlayerSideToolsAutoHide(); assert.equal(scheduled, 1);
  app.subtitleSettingsEl.classList.contains = () => true;
  app.schedulePlayerSideToolsAutoHide(); assert.equal(scheduled, 1);
});

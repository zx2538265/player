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
  const styles = {};
  const context = {
    window: { innerWidth: 390, innerHeight: 844, matchMedia: () => ({ matches: true }) },
    navigator: { userAgent: 'Instagram' },
    playerWrapEl: { style: { setProperty: (name, value) => { styles[name] = value; } }, classList: { contains: x => classes.has(x), toggle(x, active) {
      active ? classes.add(x) : classes.delete(x);
    } } },
    toggleRotationBtnEl: button, videoOrientationEl: {}, localStorage: { getItem: () => null },
    isPseudoFullscreen: true, rotationPreference: null, videoOrientation: 'landscape',
    videoAspectRatio: 16 / 9, playerSurfaceEl: { clientWidth: 390, clientHeight: 844 },
    getSubtitlePreset: () => ({ key: 'horizontal' }), subtitleRatioBucket: 'horizontal',
    subtitleSettings: { fontSizePercent: 5, bottom: 8 },
    syncFullscreenViewportSize() {},
    syncSubtitleSettingsPlacement() {},
    orientationRequestToken: 0, videoOrientationStatusEl: {}, youtubeRatio: { get: async () => null },
    getFullscreenElement: () => null, revealPlayerSideTools() {},
  };
  vm.createContext(context);
  vm.runInContext(section('    function isTouchDevice()', '    function clearOrientationHintTimer()'), context);
  return { context, classes, styles };
}
test('portrait fullscreen captions use the letterboxed video height, not the full phone height', () => {
  const { context: app, styles } = setup();
  app.syncPlayerRotation();
  assert.equal(parseFloat(styles['--video-content-width']), 390);
  assert.equal(parseFloat(styles['--video-content-height']), 219.375);
  // Caption baseline is above the video bottom, rather than in the lower black bar.
  const captionBottom = (844 - 219.375) / 2 + 219.375 * 0.94;
  assert.ok(captionBottom < (844 + 219.375) / 2);
  app.playerSurfaceEl.clientWidth = 844; app.playerSurfaceEl.clientHeight = 390;
  app.syncPlayerContentGeometry();
  assert.equal(parseFloat(styles['--video-content-height']), 390);
});
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
test('an explicit rotation click does not depend on pointer media detection', () => {
  const { context: app, classes } = setup();
  app.navigator.userAgent = 'Safari';
  app.window.matchMedia = () => ({ matches: false });
  app.togglePlayerRotation();
  assert.equal(classes.has('is-rotated'), true);
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
test('settings stay in the video surface in both inline and fullscreen modes', () => {
  const classes = new Set();
  const panel = { parentElement: null };
  function host() { return { appendChild(node) { node.parentElement = this; } }; }
  const app = { playerWrapEl: { classList: { contains: c => classes.has(c) } },
    subtitleSettingsEl: panel, playerSurfaceEl: host() };
  vm.createContext(app);
  vm.runInContext(section('    function syncSubtitleSettingsPlacement()', '    function setSubtitleSettingsOpen('), app);
  app.syncSubtitleSettingsPlacement();
  assert.equal(panel.parentElement, app.playerSurfaceEl);
  classes.add('is-fullscreen'); app.syncSubtitleSettingsPlacement();
  assert.equal(panel.parentElement, app.playerSurfaceEl);
  classes.clear(); app.syncSubtitleSettingsPlacement();
  assert.equal(panel.parentElement, app.playerSurfaceEl);
});
test('interacting with the relocated settings panel does not close it', () => {
  let closed = false;
  const app = { playerSideToolsEl: { contains: () => false }, subtitleSettingsEl: { contains: () => true },
    setSubtitleSettingsOpen() { closed = true; }, revealPlayerSideTools() {} };
  vm.createContext(app);
  vm.runInContext(section('    function handleDocumentClick(', '    async function loadSubtitleFromSrtFolder('), app);
  app.handleDocumentClick({ target: {} });
  assert.equal(closed, false);
  app.subtitleSettingsEl.contains = () => false;
  app.handleDocumentClick({ target: {} }); assert.equal(closed, true);
});

function scalingSetup() {
  const storage = new Map(), styles = {};
  const app = { videoAspectRatio: 16 / 9, subtitleRatioBucket: 'horizontal', subtitleSettings: {},
    subtitleSettingsStorageKey: 'ratio-test',
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    containerEl: { style: { setProperty() {} } },
    playerWrapEl: { style: { setProperty: (key, value) => { styles[key] = value; } } },
    playerSurfaceEl: { clientWidth: 1280, clientHeight: 720 },
    subtitleScaleRangeEl: {}, subtitleBottomRangeEl: {}, subtitleScaleValueEl: {}, subtitleBottomValueEl: {} };
  vm.createContext(app);
  vm.runInContext(section('    function getSubtitlePreset(', '    loadSubtitleSettings();'), app);
  vm.runInContext(section('    function syncPlayerContentGeometry()', '    function syncPlayerRotation()'), app);
  app.loadSubtitleSettings();
  return { app, storage, styles };
}
test('subtitle size tracks actual video height across inline, portrait fullscreen and rotation', () => {
  const { app, styles } = scalingSetup();
  for (const [width, height, expected] of [[1280, 720, 36], [390, 844, 13], [844, 390, 19.5]]) {
    app.playerSurfaceEl.clientWidth = width; app.playerSurfaceEl.clientHeight = height;
    app.syncPlayerContentGeometry();
    assert.equal(parseFloat(styles['--subtitle-font-size']), expected);
  }
  app.subtitleSettings.fontSizePercent = 10;
  app.syncPlayerContentGeometry();
  assert.equal(parseFloat(styles['--subtitle-font-size']), 39);
});
test('all five ratio presets match their font and bottom defaults', () => {
  const { app } = scalingSetup();
  for (const [ratio, size, bottom] of [[16/9,5,8], [4/3,4.5,10], [1,4,14], [3/4,3.8,16], [9/16,3.5,18]]) {
    app.videoAspectRatio = ratio; app.syncPlayerContentGeometry();
    assert.equal(app.subtitleSettings.fontSizePercent, size);
    assert.equal(app.subtitleSettings.bottom, bottom);
  }
});
test('ratio-specific preferences survive switching; reset affects only the active ratio', () => {
  const { app, storage } = scalingSetup();
  app.subtitleSettings = { fontSizePercent: 7, bottom: 12 }; app.saveSubtitleSettings();
  app.videoAspectRatio = 9/16; app.syncPlayerContentGeometry();
  assert.equal(app.subtitleSettings.fontSizePercent, 3.5);
  app.subtitleSettings = { fontSizePercent: 4, bottom: 22 }; app.saveSubtitleSettings();
  app.resetCurrentRatioSettings();
  assert.equal(app.subtitleSettings.fontSizePercent, 3.5);
  app.videoAspectRatio = 16/9; app.syncPlayerContentGeometry();
  assert.equal(app.subtitleSettings.fontSizePercent, 7);
  assert.equal(app.subtitleSettings.bottom, 12);
  assert.equal(JSON.parse(storage.get('ratio-test')).vertical, undefined);
});
test('corrupt or blocked preference storage falls back without stopping sizing', () => {
  const { app, storage, styles } = scalingSetup();
  storage.set('ratio-test', '{bad json'); app.loadSubtitleSettings();
  assert.equal(app.subtitleSettings.fontSizePercent, 5);
  app.localStorage.getItem = () => { throw Error('blocked'); };
  app.localStorage.setItem = () => { throw Error('blocked'); };
  app.saveSubtitleSettings(); app.loadSubtitleSettings(); app.syncPlayerContentGeometry();
  assert.equal(parseFloat(styles['--subtitle-font-size']), 36);
});

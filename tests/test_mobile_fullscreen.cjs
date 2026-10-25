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
    syncOrientationHintState() {}, hasShownOrientationHint: false,
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
test('rotation requires an explicit manual request in portrait fullscreen', () => {
  const { context: app } = setup();
  const base = { fullscreen: true, portrait: true, preference: true };
  assert.equal(app.shouldRotatePlayer(base), true);
  for (const change of [{ fullscreen: false }, { portrait: false }, { preference: false }, { preference: null }]) {
    assert.equal(app.shouldRotatePlayer({ ...base, ...change }), false);
  }
});
test('manual rotate and restore work; physical landscape avoids double rotation', () => {
  const { context: app, classes } = setup();
  app.syncPlayerRotation(); assert.equal(classes.has('is-rotated'), false);
  app.togglePlayerRotation(); assert.ok(classes.has('is-rotated'));
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
  app.isPseudoFullscreen = true; classes.add('is-fullscreen');
  app.syncPlayerRotation(); assert.equal(classes.has('is-rotated'), false, 're-entry must not retain rotation');
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
test('verified landscape updates geometry without rotating the picture', async () => {
  const { context: app, classes } = setup();
  app.youtubeRatio.get = async () => ({ orientation: 'landscape', source: 'verified' });
  app.loadVideoOrientation('new-video');
  await Promise.resolve();
  assert.equal(app.videoOrientation, 'landscape');
  assert.equal(app.videoOrientationEl.value, 'unknown');
  assert.equal(classes.has('is-rotated'), false);
});
test('all browsers keep landscape, portrait and unknown videos unrotated until a manual tap', async () => {
  for (const userAgent of ['Safari', 'Chrome', 'Instagram', 'Threads', 'FBAN/FBIOS']) {
   for (const orientation of ['landscape', 'portrait', 'unknown']) {
    const { context: app, classes } = setup();
    app.navigator.userAgent = userAgent;
    app.youtubeRatio.get = async () => orientation === 'unknown' ? null : ({ orientation,
      ratio: orientation === 'portrait' ? 9/16 : 16/9, source: 'embed' });
    app.loadVideoOrientation('5-JZp1F3JvM');
    await Promise.resolve();
    assert.equal(classes.has('is-rotated'), false, userAgent + ':' + orientation);
    app.togglePlayerRotation();
    assert.equal(classes.has('is-rotated'), true, 'manual rotation remains available');
    app.togglePlayerRotation();
    assert.equal(classes.has('is-rotated'), false, 'manual restore remains available');
   }
  }
});
test('legacy landscape preference cannot bypass verified vertical dimensions', async () => {
  for (const userAgent of ['Instagram', 'Threads', 'FBAN/FBIOS']) {
    const { context: app, classes } = setup();
    app.navigator.userAgent = userAgent;
    app.localStorage.getItem = () => 'landscape';
    app.youtubeRatio.get = async () => ({ orientation: 'portrait', ratio: 9/16, source: 'verified' });
    app.loadVideoOrientation('lkHYRzXyGnk');
    assert.equal(classes.has('is-rotated'), false, 'must wait without rotating');
    await Promise.resolve();
    assert.equal(app.videoOrientation, 'portrait');
    assert.equal(classes.has('is-rotated'), false, userAgent);
  }
});
test('new explicit landscape preference remains available and does not require network', () => {
  const { context: app, classes } = setup();
  app.localStorage.getItem = () => JSON.stringify({ version: 2, orientation: 'landscape' });
  app.youtubeRatio.get = () => { throw Error('should not fetch for explicit manual choice'); };
  app.loadVideoOrientation('another-video');
  assert.equal(app.videoOrientation, 'landscape');
  assert.equal(classes.has('is-rotated'), false);
});
test('delayed ratio detection does not override a manual rotation', async () => {
  const { context: app, classes } = setup();
  let resolve;
  app.youtubeRatio.get = () => new Promise(r => { resolve = r; });
  app.loadVideoOrientation('5-JZp1F3JvM');
  app.togglePlayerRotation();
  resolve({ orientation: 'portrait', ratio: 9/16, source: 'verified' });
  await Promise.resolve();
  assert.equal(classes.has('is-rotated'), true);
});
test('native fullscreen rejection enters the existing pseudo fullscreen fallback', async () => {
  const context = { getFullscreenElement: () => null, playerWrapEl: {}, isPseudoFullscreen: false,
    navigator: { userAgent: 'Safari' },
    requestElementFullscreen: () => Promise.reject(Error('denied')),
    enterPseudoFullscreen() { context.fallback = true; } };
  vm.createContext(context);
  vm.runInContext(section('    async function togglePlayerFullscreen()', '    function handleViewportOrientationChange()'), context);
  await context.togglePlayerFullscreen(); assert.equal(context.fallback, true);
});
test('IG uses webpage fullscreen so the browser does not choose the video orientation', async () => {
  let nativeCalls = 0, webpageCalls = 0;
  const app = { getFullscreenElement: () => null, playerWrapEl: {}, isPseudoFullscreen: false,
    navigator: { userAgent: 'Instagram' }, isTouchDevice: () => true,
    requestElementFullscreen: async () => { nativeCalls++; },
    enterPseudoFullscreen() { webpageCalls++; } };
  vm.createContext(app);
  vm.runInContext(section('    async function togglePlayerFullscreen()', '    function handleViewportOrientationChange()'), app);
  await app.togglePlayerFullscreen();
  assert.equal(nativeCalls, 0); assert.equal(webpageCalls, 1);
});
test('Safari, FB and Threads retain native fullscreen when available', async () => {
  for (const userAgent of ['Safari', 'FBAN/FBIOS', 'Threads']) {
    let nativeCalls = 0;
    const app = { getFullscreenElement: () => null, playerWrapEl: {}, isPseudoFullscreen: false,
      navigator: { userAgent }, isTouchDevice: () => true,
      requestElementFullscreen: async () => { nativeCalls++; },
      enterPseudoFullscreen() { throw Error('should preserve native path'); } };
    vm.createContext(app);
    vm.runInContext(section('    async function togglePlayerFullscreen()', '    function handleViewportOrientationChange()'), app);
    await app.togglePlayerFullscreen(); assert.equal(nativeCalls, 1, userAgent);
  }
});
test('paused player and open settings keep controls visible; playing schedules hiding', () => {
  let scheduled = 0;
  const app = { clearPlayerControlsHideTimer() {}, isPlayerPlaying: false,
    subtitleSettingsEl: { classList: { contains: () => false } }, isPointerInsideSideTools: false, isSideToolsKeyboardFocus: false,
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

function controlsSetup() {
  const listeners = {}, timers = new Map(); let serial = 0, hidden = false;
  const app = { controlsHideTimer: null, isPlayerPlaying: true, isPointerInsideSideTools: false,
    isSideToolsKeyboardFocus: false, lastSideToolsPointerType: null,
    subtitleSettingsEl: { classList: { contains: () => false } }, playerControlsAutoHideDelay: 2200,
    playerSideToolsEl: { contains: () => false, addEventListener: (name, callback) => { listeners[name] = callback; } },
    setPlayerSideToolsHidden: value => { hidden = value; },
    setTimeout: callback => { timers.set(++serial, callback); return serial; },
    clearTimeout: id => timers.delete(id) };
  vm.createContext(app);
  vm.runInContext(section('    function clearPlayerControlsHideTimer()', '    function handleGlobalPointerActivity()'), app);
  const bindings = html.split('\n').filter(line => line.includes('playerSideToolsEl.addEventListener(')).join('\n');
  vm.runInContext(bindings, app);
  function dispatch(name, event = {}) { listeners[name]?.(event); }
  return { app, dispatch, timers, get hidden() { return hidden; } };
}

function hintSetup() {
  const run = setup(), app = run.context;
  const hints = new Set(), timers = new Map(); let serial = 0;
  app.orientationHintEl = { classList: { add: x => hints.add(x), remove: x => hints.delete(x) }, setAttribute() {} };
  app.subtitleSettingsEl = { classList: { contains: () => false } };
  app.orientationHintTimer = null; app.orientationHintDuration = 5000;
  app.setTimeout = callback => { timers.set(++serial, callback); return serial; };
  app.clearTimeout = id => timers.delete(id);
  vm.runInContext(section('    function clearOrientationHintTimer()', '    function enterPseudoFullscreen()'), app);
  return { ...run, hints, timers };
}
test('only landscape videos prompt rotation; delayed detection prompts once without rotating', async () => {
  const { context: app, classes, hints, timers } = hintSetup();
  let resolve;
  app.youtubeRatio.get = () => new Promise(r => { resolve = r; });
  app.loadVideoOrientation('5-JZp1F3JvM');
  assert.equal(hints.has('is-visible'), false, 'unknown direction must not prompt');
  resolve({ orientation: 'landscape', ratio: 16/9, source: 'embed' });
  await Promise.resolve();
  assert.equal(hints.has('is-visible'), true);
  assert.equal(classes.has('is-rotated'), false);
  const callback = [...timers.values()][0]; callback();
  app.syncPlayerRotation();
  assert.equal(hints.has('is-visible'), false, 'viewport events must not repeat a dismissed hint');
});
test('portrait and square videos never prompt; manual rotation and fullscreen exit dismiss the hint', () => {
  const { context: app, classes, hints } = hintSetup();
  for (const orientation of ['portrait', 'square', 'unknown']) {
    app.videoOrientation = orientation; app.syncPlayerRotation();
    assert.equal(hints.has('is-visible'), false, orientation);
  }
  app.videoOrientation = 'landscape'; app.syncPlayerRotation();
  assert.equal(hints.has('is-visible'), true);
  app.togglePlayerRotation(); assert.equal(hints.has('is-visible'), false);
  app.isPseudoFullscreen = false; classes.delete('is-fullscreen'); app.syncPlayerRotation();
  assert.equal(app.hasShownOrientationHint, false);
  app.isPseudoFullscreen = true; classes.add('is-fullscreen'); app.syncPlayerRotation();
  assert.equal(hints.has('is-visible'), true, 'a new fullscreen session may prompt again');
});
test('touch tap with Safari compatibility mouse events still hides controls after idle', () => {
  const run = controlsSetup();
  const target = { matches: () => false };
  run.dispatch('pointerenter', { pointerType: 'touch' });
  run.dispatch('mouseenter'); // Compatibility events must not pin touch controls.
  run.dispatch('pointerdown', { pointerType: 'touch' });
  run.dispatch('focusin', { target });
  run.app.revealPlayerSideTools();
  assert.equal(run.timers.size, 1);
  for (const callback of run.timers.values()) callback();
  assert.equal(run.hidden, true);
});
test('mouse hover and keyboard focus retain controls, then resume hiding on leave', () => {
  const run = controlsSetup();
  run.dispatch('pointerenter', { pointerType: 'mouse' });
  run.dispatch('mouseenter');
  run.app.revealPlayerSideTools(); assert.equal(run.timers.size, 0);
  run.dispatch('pointerleave', { pointerType: 'mouse' });
  run.dispatch('mouseleave'); assert.equal(run.timers.size, 1);
  run.app.lastSideToolsPointerType = null;
  run.dispatch('focusin', { target: { matches: () => true } });
  run.app.revealPlayerSideTools(); assert.equal(run.timers.size, 0);
  run.dispatch('focusout', { relatedTarget: null }); assert.equal(run.timers.size, 1);
});
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

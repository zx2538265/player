const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createYouTubeRatioLookup: createLookup } = require('../test-youtube-ratio.js');
const createYouTubeRatioLookup = options => createLookup({ verifiedGeometry: {}, ...options });
test('keyless oEmbed lookup uses Shorts URL, classifies dimensions and reuses cache', async () => {
  let calls = 0;
  const api = createYouTubeRatioLookup({ fetch: async url => {
    calls++;
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('url'), 'https://www.youtube.com/shorts/3HiJYYIupd4');
    assert.equal(parsed.searchParams.has('key'), false);
    return { ok: true, json: async () => ({ width: 113, height: 200 }) };
  } });
  assert.equal((await api.get('3HiJYYIupd4')).orientation, 'portrait');
  await api.get('3HiJYYIupd4'); assert.equal(calls, 1);
});
test('landscape, square and malformed dimensions are distinguished', async () => {
  for (const [data, expected] of [[{ width: 200, height: 113 }, 'landscape'],
    [{ width: 200, height: 200 }, 'square'], [{ width: 0, height: 200 }, null],
    [{ width: 'bad', height: 200 }, null], [{}, null]]) {
    const api = createYouTubeRatioLookup({ fetch: async () => ({ ok: true, json: async () => data }) });
    assert.equal((await api.get('5-JZp1F3JvM'))?.orientation || null, expected);
  }
});
test('network failure falls back and a subsequent attempt can retry', async () => {
  let count = 0;
  const api = createYouTubeRatioLookup({ fetch: async () => {
    if (++count === 1) throw Error('network');
    return { ok: true, json: async () => ({ width: 200, height: 113 }) };
  } });
  assert.equal(await api.get('5-JZp1F3JvM'), null);
  assert.equal((await api.get('5-JZp1F3JvM')).orientation, 'landscape');
});
test('concurrent requests share a fetch and cached results expire', async () => {
  let time = 0, count = 0, resolve;
  const api = createYouTubeRatioLookup({ now: () => time, fetch: () => {
    count++; return new Promise(r => { resolve = r; });
  } });
  const first = api.get('5-JZp1F3JvM'), second = api.get('5-JZp1F3JvM');
  assert.equal(count, 1);
  resolve({ ok: true, json: async () => ({ width: 200, height: 113 }) });
  await Promise.all([first, second]);
  time = 24 * 60 * 60 * 1000 + 1;
  const third = api.get('5-JZp1F3JvM'); assert.equal(count, 2);
  resolve({ ok: false }); assert.equal(await third, null);
});
test('verified vertical video overrides misleading landscape oEmbed dimensions', async () => {
  const geometry = require('../test-video-geometry.json');
  const calls = [];
  const api = createLookup({ fetch: async url => {
    calls.push(url);
    return { ok: true, json: async () => url === 'test-video-geometry.json' ? geometry : { width: 200, height: 113 } };
  } });
  const result = await api.get('lkHYRzXyGnk');
  assert.equal(result.orientation, 'portrait');
  assert.equal(result.ratio, 9 / 16);
  assert.equal(result.source, 'verified');
  assert.deepEqual(calls, ['test-video-geometry.json']);
});
test('missing verified metadata keeps oEmbed fallback available', async () => {
  const api = createLookup({ fetch: async url => url === 'test-video-geometry.json' ?
    { ok: false } : { ok: true, json: async () => ({ width: 200, height: 113 }) } });
  const result = await api.get('5-JZp1F3JvM');
  assert.equal(result.orientation, 'landscape');
  assert.equal(result.source, 'embed');
});

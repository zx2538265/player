const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../share.js'), 'utf8');
const id = 'x8EU50FVB1k';
const url = `https://allenka.com/share/${id}/`;

function setup(fetch, clipboard = { writeText: async () => {} }) {
  const button = { hidden: true, addEventListener: (_, fn) => { button.click = fn; } };
  const status = { textContent: '' };
  const prompts = [];
  const context = { fetch, navigator: { clipboard }, window: { prompt: (...args) => prompts.push(args) },
    document: { getElementById: name => name === 'copyShareBtn' ? button : status } };
  vm.runInNewContext(source, context);
  return { button, status, prompts, update: context.window.updateShareVideo };
}
const response = videos => ({ ok: true, json: async () => ({ version: 1, videos }) });

test('copies only a generated share URL and hides on unknown video', async () => {
  const copies = [];
  const app = setup(async () => response({ [id]: url }), { writeText: async value => copies.push(value) });
  await app.update(id);
  assert.equal(app.button.hidden, false);
  await app.button.click();
  assert.deepEqual(copies, [url]);
  assert.equal(app.status.textContent, '已複製分享連結');
  await app.update('AAAAAAAAAAA');
  assert.equal(app.button.hidden, true);
  await app.button.click();
  assert.equal(copies.length, 1);
});

test('failed clipboard gives a manually copyable URL', async () => {
  // Simulate a denied clipboard permission.
  const denied = setup(async () => response({ [id]: url }), { writeText: async () => { throw Error('denied'); } });
  await denied.update(id);
  await denied.button.click();
  assert.equal(denied.prompts[0][1], url);
});

test('a slow manifest never restores a previous video share button', async () => {
  let resolve;
  const app = setup(() => new Promise(done => { resolve = done; }));
  const first = app.update(id);
  const second = app.update('BBBBBBBBBBB');
  resolve(response({ [id]: url }));
  await Promise.all([first, second]);
  assert.equal(app.button.hidden, true);
});

test('missing or tampered manifest never exposes a broken share URL', async () => {
  for (const fetch of [async () => ({ ok: false }), async () => response({ [id]: 'https://evil.test/' })]) {
    const app = setup(fetch);
    await app.update(id);
    assert.equal(app.button.hidden, true);
  }
});

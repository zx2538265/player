const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../share.js'), 'utf8');
const id = 'x8EU50FVB1k';
const url = `https://allenka.com/share/${id}/`;

function setup(fetch, clipboard = { writeText: async () => {} }) {
  const element = () => ({
    hidden: true,
    addEventListener(event, fn) { this[event] = fn; },
    setAttribute() {},
    focus() { this.focused = true; }
  });
  const button = element(), openButton = element(), checkbox = element(), input = element(), link = element();
  link.select = () => { link.selected = true; };
  const dialog = {
    ...element(),
    open: false,
    showModal() { this.open = true; },
    close() { this.open = false; }
  };
  const status = { textContent: '' };
  const elements = { copyShareBtn: button, openShareBtn: openButton, shareDialog: dialog, shareLink: link,
    shareStartEnabled: checkbox, shareStartTime: input, shareStatus: status };
  const context = { fetch, navigator: { clipboard }, window: {},
    document: { getElementById: name => elements[name] } };
  vm.runInNewContext(source, context);
  return { button, openButton, dialog, link, checkbox, input, status, update: context.window.updateShareVideo };
}
const response = videos => ({ ok: true, json: async () => ({ version: 1, videos }) });

test('copies only a generated share URL and hides on unknown video', async () => {
  const copies = [];
  const app = setup(async () => response({ [id]: url }), { writeText: async value => copies.push(value) });
  await app.update(id);
  assert.equal(app.openButton.hidden, false);
  app.openButton.click();
  assert.equal(app.link.value, url);
  await app.update(id);
  assert.equal(app.dialog.open, true);
  await app.button.click();
  assert.deepEqual(copies, [url]);
  assert.equal(app.status.textContent, '已複製分享連結');
  await app.update('AAAAAAAAAAA');
  assert.equal(app.openButton.hidden, true);
  assert.equal(app.dialog.open, false);
  await app.button.click();
  assert.equal(copies.length, 1);
});

test('failed clipboard gives a manually copyable URL', async () => {
  // Simulate a denied clipboard permission.
  const denied = setup(async () => response({ [id]: url }), { writeText: async () => { throw Error('denied'); } });
  await denied.update(id);
  denied.openButton.click();
  denied.checkbox.checked = true;
  denied.checkbox.change();
  await denied.button.click();
  assert.equal(denied.link.value, url + '?t=0');
  assert.equal(denied.link.selected, true);
});

test('optional start time snapshots playback on check and accepts a manual edit', async () => {
  const copies = [];
  let currentTime = 0;
  const app = setup(async () => response({ [id]: url }), { writeText: async value => copies.push(value) });
  await app.update(id, () => currentTime);
  app.openButton.click();
  assert.equal(app.input.hidden, true);
  currentTime = 83.9;
  app.checkbox.checked = true;
  app.checkbox.change();
  assert.equal(app.input.hidden, false);
  assert.equal(app.input.value, '1:23');
  currentTime = 90;
  await app.button.click();
  app.input.value = '1:02:03';
  app.input.input();
  assert.equal(app.link.value, url + '?t=3723');
  await app.button.click();
  assert.deepEqual(copies, [url + '?t=83', url + '?t=3723']);

  app.input.value = '1:60';
  await app.button.click();
  assert.equal(copies.length, 2);
  assert.equal(app.input.focused, true);

  app.checkbox.checked = false;
  app.checkbox.change();
  assert.equal(app.input.hidden, true);
  await app.button.click();
  assert.equal(copies.at(-1), url);

  app.checkbox.checked = true;
  app.checkbox.change();
  assert.equal(app.input.value, '1:30');
  await app.update('AAAAAAAAAAA');
  assert.equal(app.openButton.hidden, true);
  assert.equal(app.checkbox.checked, false);
});

test('a slow manifest never restores a previous video share button', async () => {
  let resolve;
  const app = setup(() => new Promise(done => { resolve = done; }));
  const first = app.update(id);
  const second = app.update('BBBBBBBBBBB');
  resolve(response({ [id]: url }));
  await Promise.all([first, second]);
  assert.equal(app.openButton.hidden, true);
});

test('missing or tampered manifest never exposes a broken share URL', async () => {
  for (const fetch of [async () => ({ ok: false }), async () => response({ [id]: 'https://evil.test/' })]) {
    const app = setup(fetch);
    await app.update(id);
    assert.equal(app.openButton.hidden, true);
  }
});

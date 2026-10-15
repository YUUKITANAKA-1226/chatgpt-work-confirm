const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('chatgpt-work-confirm/content.js', 'utf8');
function setup(work = true, answer = true) {
  const listeners = {}, timers = [];
  let prompts = 0;
  class Element {
    closest(selector) {
      if (selector === 'form') return this.form;
      if (selector.startsWith('button')) return this.button ? this : null;
      return this.editor ? this : null;
    }
  }
  const form = new Element();
  form.form = form;
  form.querySelector = () => work ? {} : null;
  const editor = Object.assign(new Element(), { editor: true, form });
  const button = Object.assign(new Element(), { button: true, form });
  vm.runInNewContext(source, {
    Element, WeakSet, WeakMap,
    document: { addEventListener: (name, fn) => { listeners[name] = fn; } },
    window: { confirm: () => { prompts++; if (answer === 'throw') throw Error(); return answer; } },
    setTimeout: fn => timers.push(fn)
  });
  return {
    editor, button, form, prompts: () => prompts,
    flush: () => timers.splice(0).forEach(fn => fn()),
    mode: value => { work = value; },
    fire(type, props = {}) {
      const event = { type, target: type === 'submit' ? form : type === 'click' ? button : editor,
        key: 'Enter', detail: 1, prevented: false, stopped: false,
        preventDefault() { this.prevented = true; },
        stopImmediatePropagation() { this.stopped = true; }, ...props };
      listeners[type](event);
      return event;
    }
  };
}
for (const type of ['click', 'keydown', 'submit']) {
  test(`${type}: cancel blocks; OK allows`, () => {
    for (const answer of [false, true]) {
      const s = setup(true, answer), e = s.fire(type);
      assert.equal(s.prompts(), 1);
      assert.equal(e.prevented, !answer);
      assert.equal(e.stopped, !answer);
    }
  });
  test(`${type}: Chat/unknown untouched`, () => {
    const s = setup(false, false);
    assert.equal(s.fire(type).prevented, false);
    assert.equal(s.prompts(), 0);
  });
}
test('IME, modifiers and unrelated keys do not prompt', () => {
  const s = setup();
  for (const props of [{ isComposing: true }, { keyCode: 229 }, { shiftKey: true },
    { ctrlKey: true }, { altKey: true }, { metaKey: true }, { key: 'a' }]) s.fire('keydown', props);
  s.fire('compositionstart'); s.fire('keydown');
  assert.equal(s.prompts(), 0);
  s.fire('compositionend'); s.fire('keydown');
  assert.equal(s.prompts(), 1);
});
test('click → submit and Enter → click → submit prompt once', () => {
  for (const answer of [true, false]) {
    const s = setup(true, answer);
    s.fire('click');
    assert.equal(s.fire('submit').prevented, !answer);
    assert.equal(s.prompts(), 1);
    s.flush();
    s.fire('keydown'); s.fire('click', { detail: 0 }); s.fire('submit');
    assert.equal(s.prompts(), 2);
  }
});
test('later gesture prompts again; repeated Enter is blocked', () => {
  const s = setup();
  s.fire('keydown'); s.flush(); s.fire('keydown');
  assert.equal(s.prompts(), 2);
  assert.equal(s.fire('keydown', { repeat: true }).prevented, true);
});
test('mode changes are evaluated on each gesture', () => {
  const s = setup(false);
  s.fire('click'); s.mode(true); s.fire('click'); s.flush();
  s.mode(false); s.fire('click');
  assert.equal(s.prompts(), 1);
});
test('dialog failure blocks submission', () => {
  const s = setup(true, 'throw');
  assert.equal(s.fire('click').prevented, true);
});

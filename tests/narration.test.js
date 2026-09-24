import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

// The deployed single-file controller runs against a small HTMLMediaElement fake.
// These tests cover playback state, not the browser's decoder or autoplay policy.
function setup(rejectPlayback = false) {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const source = html.slice(html.indexOf('class Narrator {'), html.indexOf('// ---------- Procedural rock'));
  class Media {
    constructor() { this.currentTime = 0; this.paused = true; this.readyState = 4; this.duration = 110; this.events = {}; this.plays = 0; }
    addEventListener(name, callback) { this.events[name] = callback; }
    removeEventListener() {}
    setAttribute() {}
    removeAttribute() {}
    load() { this.currentTime = 0; }
    pause() { this.paused = true; }
    play() { this.plays++; if (rejectPlayback) return Promise.reject(new Error('Autoplay blocked')); this.paused = false; return Promise.resolve(); }
  }
  const context = { Audio: Media, window: {}, Option: class {}, SIM_SECONDS: 110, performance: { now: () => 1000 }, clamp: (x,a=0,b=1) => Math.max(a,Math.min(b,x)), console, clearTimeout, setTimeout };
  vm.createContext(context);
  vm.runInContext(source + '\nglobalThis.Controller = Narrator;', context);
  const select = { replaceChildren() {}, disabled: false }, label = { textContent: '' };
  return { narrator: new context.Controller(select, label), label };
}

test('recorded narration seeks to the timeline and pauses without losing position', async () => {
  const { narrator: n } = setup();
  assert.equal(typeof n.sync, 'function', 'Narration must synchronize recorded media with the timeline');
  n.sync(50, true, 'seep', true);
  await Promise.resolve();
  assert.equal(n.audio.currentTime, 55);
  assert.equal(n.audio.paused, false);
  n.sync(50, false, 'seep');
  assert.equal(n.audio.paused, true);
  assert.equal(n.audio.currentTime, 55);
});

test('muting never starts audio and unmuting resumes at the current position', async () => {
  const { narrator: n } = setup();
  assert.equal(typeof n.sync, 'function');
  n.setEnabled(false);
  n.sync(30, true, 'seep', true);
  assert.equal(n.audio.plays, 0);
  n.setEnabled(true);
  n.sync(60, true, 'seep', true);
  await Promise.resolve();
  assert.equal(n.audio.currentTime, 66);
  assert.equal(n.audio.paused, false);
});

test('changing water scenario selects the matching recording and preserves the seek', () => {
  const { narrator: n } = setup();
  assert.equal(typeof n.sync, 'function');
  n.sync(80, false, 'wet', true);
  assert.match(n.audio.src, /narration-wet\.mp3$/);
  assert.equal(n.audio.currentTime, 88);
  assert.equal(n.audio.paused, true);
});

test('blocked audio reports subtitles and does not reject playback control', async () => {
  const { narrator: n, label } = setup(true);
  assert.equal(typeof n.sync, 'function');
  assert.doesNotThrow(() => n.sync(10, true, 'seep', true));
  await new Promise(setImmediate);
  assert.match(label.textContent, /subtitles|audio/i);
  n.dispose();
});

test('a stale interrupted play promise cannot block a subsequent Play tap', async () => {
  const { narrator:n }=setup();
  let rejectOld;
  n.audio.play=()=>{n.audio.paused=false;return new Promise((resolve,reject)=>{rejectOld=reject;});};
  n.sync(5,true,'seep',true);
  n.sync(5,false,'seep');
  n.audio.play=()=>{n.audio.paused=false;return Promise.resolve();};
  n.sync(5,true,'seep',true);
  rejectOld(new Error('Interrupted'));
  await new Promise(setImmediate);
  assert.equal(n.blocked,false);
  assert.equal(n.audio.paused,false);
});

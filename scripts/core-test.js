const { strict: assert } = require('node:assert');
const { sanitizeQueue, buildBalancedQueue, selectNext, parseMidi, midiPressed, silenceWatch, streamSettings } = require('../src/frontend/studio-core');

assert.deepEqual(sanitizeQueue('corrupt', ['a']), [], 'corrupt rundown must recover safely');
assert.deepEqual(sanitizeQueue(['a', 4, 'missing', 'b'], ['a', 'b']), ['a', 'b'], 'rundown must keep only valid track ids');
assert.deepEqual(
  buildBalancedQueue(['m1', 'm2', 'm3', 'm4', 'm5', 'm6'], ['id1', 'id2'], ['p1'], 3, 6),
  ['m1', 'm2', 'm3', 'id1', 'm4', 'm5', 'm6', 'p1', 'id2'],
  'show builder must space imaging predictably'
);
const pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
assert.equal(selectNext(pool, 'a', ['b'], ['c'], true, 0).id, 'd', 'shuffle must avoid loaded and recent tracks');
assert.equal(selectNext(pool, 'b', [], [], false).id, 'c', 'ordered playback must select the following track');
assert.equal(selectNext([{ id: 'a' }], 'a', [], [], true).id, 'a', 'single-track libraries must remain playable');
assert.deepEqual(parseMidi([0xb2, 7, 100]), { type: 'cc', channel: 3, data1: 7, value: 100 }, 'control change on channel 3');
assert.deepEqual(parseMidi([0x80, 60, 64]), { type: 'note', channel: 1, data1: 60, value: 0 }, 'note off is a release');
assert.equal(parseMidi([0xf8]), null, 'clock and other messages are ignored');
assert.ok(midiPressed('note', 127, 0) && !midiPressed('note', 127, 90) && !midiPressed('note', 0, 127), 'a pad fires once per press');
assert.ok(midiPressed('cc', 70, 10) && !midiPressed('cc', 80, 70) && !midiPressed('cc', 20, 70), 'a CC button fires when it crosses 64 upwards');
let watch = silenceWatch(null, { program: true, playing: false, mic: false, now: 1000 });
assert.deepEqual(watch, { since: 1000, alert: false }, 'silence starts counting');
assert.equal(silenceWatch(watch.since, { program: true, playing: false, mic: false, now: 11000 }).alert, true, 'ten seconds of silence on air alerts');
assert.deepEqual(silenceWatch(watch.since, { program: true, playing: true, mic: false, now: 11000 }), { since: null, alert: false }, 'audio resets the silence count');
assert.equal(silenceWatch(null, { program: false, playing: false, mic: false, now: 99999 }).alert, false, 'off air is never silence');
assert.equal(silenceWatch(watch.since, { program: true, playing: false, mic: true, now: 60000 }).alert, false, 'an open mic is not silence');
const stream = streamSettings({ host: 'https://radio.example.com/admin', port: '8001', mount: 'live', format: 'opus', kbps: '96' });
assert.deepEqual(stream, { settings: { host: 'radio.example.com', port: 8001, mount: '/live', user: 'source', format: 'opus', kbps: 96, name: '', genre: '' }, error: null }, 'stream settings are cleaned up');
assert.equal(streamSettings({}).error, 'Enter the server address', 'a server is required');
assert.equal(streamSettings({ host: 'x', mount: '/a b' }).error, 'Mount points use letters, numbers, dots, dashes and slashes', 'mount points are checked');
assert.equal(streamSettings({ host: 'x', kbps: 1000 }).settings.kbps, 128, 'unknown bitrates fall back to 128 kbps');
console.log('CTR Studio Open core tests passed');

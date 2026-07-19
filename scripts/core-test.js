const { strict: assert } = require('node:assert');
const { sanitizeQueue, buildBalancedQueue, selectNext } = require('../src/frontend/studio-core');

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
console.log('CTR Studio Open core tests passed');

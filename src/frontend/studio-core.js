(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CTRStudioCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function sanitizeQueue(value, validIds) {
    if (!Array.isArray(value)) return [];
    const valid = new Set(validIds);
    return value.filter(id => typeof id === 'string' && valid.has(id));
  }

  function buildBalancedQueue(music, ids, promos, idEvery, promoEvery) {
    const output = [];
    let idIndex = 0;
    let promoIndex = 0;
    music.forEach((trackId, index) => {
      output.push(trackId);
      const count = index + 1;
      if (promoEvery > 0 && count % promoEvery === 0 && promos.length) output.push(promos[promoIndex++ % promos.length]);
      if (idEvery > 0 && count % idEvery === 0 && ids.length) output.push(ids[idIndex++ % ids.length]);
    });
    return output;
  }

  function selectNext(pool, currentId, loadedIds, recentIds, random, randomValue = Math.random()) {
    if (!pool.length) return null;
    const loaded = new Set(loadedIds);
    const recent = new Set(recentIds);
    let candidates = pool.filter(track => track.id !== currentId && !loaded.has(track.id) && !recent.has(track.id));
    if (!candidates.length) candidates = pool.filter(track => track.id !== currentId && !loaded.has(track.id));
    if (!candidates.length) candidates = pool.filter(track => track.id !== currentId);
    if (!candidates.length) return pool[0];
    if (random) return candidates[Math.min(candidates.length - 1, Math.floor(randomValue * candidates.length))];
    const index = Math.max(-1, pool.findIndex(track => track.id === currentId));
    return pool.slice(index + 1).find(track => candidates.includes(track)) || candidates[0];
  }

  // MIDI: note on/off and control change only; note on with velocity 0 is a release.
  function parseMidi(data) {
    const [status = 0, data1 = 0, data2 = 0] = data || [], command = status & 0xf0, channel = (status & 0x0f) + 1;
    if (command === 0xb0) return { type: 'cc', channel, data1, value: data2 };
    if (command === 0x90 || command === 0x80) return { type: 'note', channel, data1, value: command === 0x80 ? 0 : data2 };
    return null;
  }

  // A button fires once per press: a note rising from 0, or a CC crossing 64 upwards.
  function midiPressed(type, value, previous = 0) {
    return type === 'note' ? value > 0 && previous === 0 : value >= 64 && previous < 64;
  }

  // Silence on air: nothing playing, no mic, Program open. Alerts once, after `limit` ms.
  function silenceWatch(since, { program, playing, mic, now, limit = 10000 }) {
    if (!program || playing || mic) return { since: null, alert: false };
    const start = since ?? now;
    return { since: start, alert: now - start >= limit };
  }

  // Icecast source settings, cleaned up; `error` says what's missing.
  function streamSettings(value = {}) {
    const host = String(value.host || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    const port = Math.round(Number(value.port) || 8000), mountRaw = String(value.mount || '/stream').trim();
    const mount = mountRaw.startsWith('/') ? mountRaw : `/${mountRaw}`, format = value.format === 'opus' ? 'opus' : 'mp3';
    const kbps = [64, 96, 128, 160, 192, 256, 320].includes(Number(value.kbps)) ? Number(value.kbps) : 128;
    const settings = { host, port, mount, user: String(value.user || 'source').trim() || 'source', format, kbps, name: String(value.name || '').slice(0, 80), genre: String(value.genre || '').slice(0, 40) };
    const error = !host ? 'Enter the server address' : !(port > 0 && port < 65536) ? 'Enter a port between 1 and 65535' : !/^\/[\w.\-/]+$/.test(mount) ? 'Mount points use letters, numbers, dots, dashes and slashes' : null;
    return { settings, error };
  }

  return { sanitizeQueue, buildBalancedQueue, selectNext, parseMidi, midiPressed, silenceWatch, streamSettings };
}));

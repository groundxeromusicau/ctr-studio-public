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

  return { sanitizeQueue, buildBalancedQueue, selectNext };
}));

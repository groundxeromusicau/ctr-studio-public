(() => {
  const $ = id => document.getElementById(id);
  const DB_NAME = 'ctr-studio-v2';
  const state = { tracks: [], queue: [], sortAsc: true, active: 'A', auto: false, context: null, master: null, mic: null, sessionStarted: null, installPrompt: null };
  const decks = { A: makeDeck('A'), B: makeDeck('B') };

  function makeDeck(name) {
    const audio = new Audio();
    audio.preload = 'metadata';
    return { name, audio, track: null, source: null, gain: null };
  }

  function dbRequest(request) { return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
  async function openDb() {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('tracks', { keyPath: 'id' });
    return dbRequest(request);
  }
  async function dbAll() { const db = await openDb(); const result = await dbRequest(db.transaction('tracks').objectStore('tracks').getAll()); db.close(); return result; }
  async function dbPut(track) { const db = await openDb(); await dbRequest(db.transaction('tracks', 'readwrite').objectStore('tracks').put(track)); db.close(); }
  async function dbClear() { const db = await openDb(); await dbRequest(db.transaction('tracks', 'readwrite').objectStore('tracks').clear()); db.close(); }

  function cleanName(name) { return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim(); }
  function parseName(file) { const parts = cleanName(file.name).split(' - '); return parts.length > 1 ? { artist: parts.shift(), title: parts.join(' - ') } : { artist: 'Local music', title: parts[0] }; }
  function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
  function formatTime(value) { if (!Number.isFinite(value)) return '0:00'; const hours = Math.floor(value / 3600); const minutes = Math.floor(value % 3600 / 60); const seconds = Math.floor(value % 60); return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : `${minutes}:${String(seconds).padStart(2, '0')}`; }
  function formatHours(seconds) { return `${Math.floor(seconds / 3600)}h ${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}m`; }
  function escapeHtml(text) { const node = document.createElement('span'); node.textContent = String(text); return node.innerHTML; }
  function getTrack(id) { return state.tracks.find(track => track.id === id); }
  function saveQueue() { localStorage.setItem('ctr-v2-rundown', JSON.stringify(state.queue)); renderAll(); }
  function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').classList.remove('show'), 2600); }

  async function fileDuration(file) {
    return new Promise(resolve => {
      const audio = new Audio(); const url = URL.createObjectURL(file);
      const done = value => { URL.revokeObjectURL(url); resolve(Number.isFinite(value) ? value : 0); };
      audio.onloadedmetadata = () => done(audio.duration); audio.onerror = () => done(0); audio.src = url;
    });
  }

  async function importFiles(files) {
    const audioFiles = [...files].filter(file => file.type.startsWith('audio/'));
    if (!audioFiles.length) return toast('No supported audio files selected');
    $('importBtn').disabled = true; $('importBtn').textContent = 'Importing…';
    for (const file of audioFiles) {
      const names = parseName(file);
      const track = { id: uid(), ...names, filename: file.name, duration: await fileDuration(file), size: file.size, type: file.type, blob: file, added: Date.now() };
      await dbPut(track); state.tracks.push(track);
    }
    $('importBtn').disabled = false; $('importBtn').innerHTML = '<span>＋</span> Import audio';
    await requestPersistence(); renderAll(); toast(`${audioFiles.length} track${audioFiles.length === 1 ? '' : 's'} saved on this device`);
  }

  function renderLibrary() {
    const query = $('searchInput').value.trim().toLowerCase();
    const tracks = [...state.tracks].sort((a, b) => a.title.localeCompare(b.title) * (state.sortAsc ? 1 : -1)).filter(track => `${track.title} ${track.artist}`.toLowerCase().includes(query));
    $('trackList').innerHTML = tracks.length ? tracks.map((track, index) => `<div class="track-row" data-id="${track.id}"><span>${String(index + 1).padStart(2, '0')}</span><div class="track-title"><b>${escapeHtml(track.title)}</b><small>${escapeHtml(track.filename)}</small></div><span class="track-artist">${escapeHtml(track.artist)}</span><span class="track-time">${formatTime(track.duration)}</span><div class="track-actions"><button data-load="A" title="Load Deck A">A</button><button data-load="B" title="Load Deck B">B</button><button class="add" data-add-queue>+ SHOW</button></div></div>`).join('') : `<div class="empty-state"><i>♫</i><h2>${state.tracks.length ? 'No tracks found' : 'Your library is quiet'}</h2><p>${state.tracks.length ? 'Try another title or artist.' : 'Import MP3, WAV, M4A or other browser-supported audio.'}</p>${state.tracks.length ? '' : '<button type="button" data-import>Choose audio files</button>'}</div>`;
    const total = state.tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
    const bytes = state.tracks.reduce((sum, track) => sum + (track.size || 0), 0);
    $('trackStat').textContent = state.tracks.length; $('durationStat').textContent = formatHours(total); $('sizeStat').textContent = `${(bytes / 1048576).toFixed(bytes > 10485760 ? 0 : 1)} MB`;
    navigator.storage?.estimate().then(({ usage = 0, quota = 1 }) => $('storageBar').style.width = `${Math.min(100, usage / quota * 100)}%`).catch(() => {});
  }

  function renderQueue() {
    state.queue = state.queue.filter(id => getTrack(id));
    const items = state.queue.map(getTrack);
    $('queueList').innerHTML = items.length ? items.map((track, index) => `<li class="queue-item" draggable="true" data-index="${index}" data-id="${track.id}"><span class="drag">⠿</span><div><b>${escapeHtml(track.title)}</b><small>${escapeHtml(track.artist)}</small></div><span>${formatTime(track.duration)}</span><button data-remove-queue>REMOVE</button></li>`).join('') : '<li class="empty-state"><i>≡</i><h2>No tracks in your rundown</h2><p>Add music from the library, then drag it into show order.</p><button type="button" data-go-library>Browse library</button></li>';
    const duration = items.reduce((sum, track) => sum + (track.duration || 0), 0);
    $('queueDuration').textContent = formatTime(duration); $('queueBadge').textContent = items.length; $('queueStat').textContent = items.length; $('liveQueueCount').textContent = items.length;
    $('estimatedEnd').textContent = items.length ? new Date(Date.now() + duration * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
    $('libraryCheck').classList.toggle('good', state.tracks.length > 0); $('libraryCheckText').textContent = state.tracks.length ? `${state.tracks.length} tracks ready` : 'Add music to library';
    $('queueCheck').classList.toggle('good', items.length > 0); $('queueCheckText').textContent = items.length ? `${items.length} items in rundown` : 'Build a show rundown';
    $('liveQueue').innerHTML = items.length ? items.map((track, index) => `<div class="live-track" data-live-load="${track.id}"><b>${String(index + 1).padStart(2, '0')} &nbsp; ${escapeHtml(track.title)}</b><small>${escapeHtml(track.artist)} · ${formatTime(track.duration)}</small></div>`).join('') : '<div class="empty-state"><p>Your rundown is empty.</p></div>';
  }

  function renderAll() { renderLibrary(); renderQueue(); }
  function showView(name) { document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.dataset.view === name)); document.querySelectorAll('.rail-item').forEach(item => item.classList.toggle('active', item.dataset.viewTarget === name)); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  function ensureAudio() {
    if (state.context) return;
    const Context = window.AudioContext || window.webkitAudioContext; state.context = new Context(); state.master = state.context.createGain(); state.master.gain.value = .85; state.master.connect(state.context.destination);
    Object.values(decks).forEach(deck => { deck.source = state.context.createMediaElementSource(deck.audio); deck.gain = state.context.createGain(); deck.source.connect(deck.gain).connect(state.master); }); updateCrossfader();
  }
  function loadDeck(name, track) {
    if (!track) return; ensureAudio(); const deck = decks[name]; deck.audio.pause(); if (deck.track?.url) URL.revokeObjectURL(deck.track.url);
    deck.track = { ...track, url: URL.createObjectURL(track.blob) }; deck.audio.src = deck.track.url; deck.audio.load(); $(`title${name}`).textContent = track.title; $(`artist${name}`).textContent = track.artist; $(`status${name}`).textContent = 'READY'; updateDeck(name); toast(`${track.title} loaded to Deck ${name}`);
  }
  async function toggleDeck(name) {
    const deck = decks[name]; if (!deck.track) return toast(`Deck ${name} is empty`); ensureAudio(); await state.context.resume();
    if (deck.audio.paused) { await deck.audio.play(); state.active = name; state.sessionStarted ||= Date.now(); } else deck.audio.pause(); updateDeck(name); updateNowPlaying();
  }
  function updateDeck(name) {
    const deck = decks[name], playing = !deck.audio.paused;
    $(`status${name}`).textContent = deck.track ? (playing ? 'PLAYING' : 'READY') : 'EMPTY'; const play = document.querySelector(`[data-deck="${name}"] [data-action="play"]`); play.innerHTML = playing ? 'Ⅱ <span>PAUSE</span>' : '▶ <span>PLAY</span>';
    $(`current${name}`).textContent = formatTime(deck.audio.currentTime); $(`duration${name}`).textContent = formatTime(deck.audio.duration); $(`progress${name}`).value = deck.audio.duration ? Math.round(deck.audio.currentTime / deck.audio.duration * 1000) : 0;
  }
  function updateNowPlaying() { const deck = decks[state.active]; $('nowTitle').textContent = deck.track?.title || 'Nothing playing'; $('nowMeta').textContent = deck.track ? `${deck.track.artist} · Deck ${state.active}` : 'Load a track to either deck'; }
  function updateCrossfader() { if (!decks.A.gain) return; const x = +$('crossfader').value / 100; decks.A.gain.gain.value = Math.cos(x * Math.PI / 2); decks.B.gain.gain.value = Math.sin(x * Math.PI / 2); $('mixBtn').textContent = x < .5 ? 'MIX TO B' : 'MIX TO A'; }
  function performMix() { const target = +$('crossfader').value < 50 ? 100 : 0, start = +$('crossfader').value, began = performance.now(); const tick = now => { const amount = Math.min(1, (now - began) / 2200); $('crossfader').value = start + (target - start) * amount; updateCrossfader(); if (amount < 1) requestAnimationFrame(tick); else { state.active = target ? 'B' : 'A'; updateNowPlaying(); } }; requestAnimationFrame(tick); }
  function adjacentTrack(deck, step) { const pool = state.queue.length ? state.queue.map(getTrack) : state.tracks; if (!pool.length) return; const index = Math.max(0, pool.findIndex(track => track?.id === deck.track?.id)); loadDeck(deck.name, pool[(index + step + pool.length) % pool.length]); }
  async function ended(name) {
    updateDeck(name); if (!state.auto) return;
    const pool = state.queue.length ? state.queue.map(getTrack) : state.tracks;
    if (!pool.length) return;
    const currentIndex = Math.max(0, pool.findIndex(track => track?.id === decks[name].track?.id));
    const next = name === 'A' ? 'B' : 'A';
    loadDeck(next, pool[(currentIndex + 1) % pool.length]); await toggleDeck(next); performMix();
  }

  async function toggleMic() {
    ensureAudio(); await state.context.resume();
    if (state.mic) { state.mic.stream.getTracks().forEach(track => track.stop()); state.mic.source.disconnect(); state.mic = null; $('micBtn').classList.remove('active'); $('micBtn').innerHTML = '<i></i> MIC OFF'; return; }
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const source = state.context.createMediaStreamSource(stream); source.connect(state.master); state.mic = { stream, source }; $('micBtn').classList.add('active'); $('micBtn').innerHTML = '<i></i> MIC LIVE'; } catch { toast('Microphone permission was not granted'); }
  }
  async function requestPersistence() { if (navigator.storage?.persist) { const persistent = await navigator.storage.persist(); $('storageState').textContent = persistent ? 'DATA PROTECTED' : 'LOCAL DATA'; } }

  document.querySelectorAll('[data-view-target]').forEach(button => button.onclick = () => showView(button.dataset.viewTarget));
  document.addEventListener('click', event => { if (event.target.closest('[data-import]')) $('audioInput').click(); if (event.target.closest('[data-go-library]')) showView('library'); if (event.target.closest('[data-go-rundown]')) showView('rundown'); });
  $('importBtn').onclick = () => $('audioInput').click(); $('audioInput').onchange = event => importFiles(event.target.files); $('searchInput').oninput = renderLibrary;
  $('sortBtn').onclick = () => { state.sortAsc = !state.sortAsc; $('sortBtn').textContent = state.sortAsc ? 'Title A–Z' : 'Title Z–A'; renderLibrary(); };
  $('trackList').onclick = event => { const row = event.target.closest('.track-row'); if (!row) return; const track = getTrack(row.dataset.id); const load = event.target.closest('[data-load]'); if (load) loadDeck(load.dataset.load, track); if (event.target.closest('[data-add-queue]')) { state.queue.push(track.id); saveQueue(); toast(`${track.title} added to rundown`); } };
  $('clearLibraryBtn').onclick = async () => { if (!state.tracks.length || !confirm('Clear every locally saved track and the show rundown?')) return; Object.values(decks).forEach(deck => { deck.audio.pause(); if (deck.track?.url) URL.revokeObjectURL(deck.track.url); deck.track = null; updateDeck(deck.name); }); await dbClear(); state.tracks = []; state.queue = []; updateNowPlaying(); saveQueue(); toast('Local library cleared'); };
  $('queueList').onclick = event => { const item = event.target.closest('.queue-item'); if (item && event.target.closest('[data-remove-queue]')) { state.queue.splice(+item.dataset.index, 1); saveQueue(); } };
  let dragged = null; $('queueList').ondragstart = event => { dragged = +event.target.closest('.queue-item')?.dataset.index; }; $('queueList').ondragover = event => event.preventDefault(); $('queueList').ondrop = event => { event.preventDefault(); const target = +event.target.closest('.queue-item')?.dataset.index; if (Number.isInteger(dragged) && Number.isInteger(target) && dragged !== target) { const [id] = state.queue.splice(dragged, 1); state.queue.splice(target, 0, id); saveQueue(); } dragged = null; };
  $('clearQueueBtn').onclick = () => { state.queue = []; saveQueue(); }; $('openLiveBtn').onclick = () => showView('live');
  $('showName').oninput = event => { const name = event.target.textContent.trim() || 'Untitled show'; localStorage.setItem('ctr-v2-show-name', name); $('liveShowName').textContent = name; };
  $('liveQueue').onclick = event => { const item = event.target.closest('[data-live-load]'); if (!item) return; const destination = !decks.A.track ? 'A' : !decks.B.track ? 'B' : state.active === 'A' ? 'B' : 'A'; loadDeck(destination, getTrack(item.dataset.liveLoad)); };
  document.querySelectorAll('.deck').forEach(panel => panel.onclick = event => { const action = event.target.closest('[data-action]')?.dataset.action, name = panel.dataset.deck; if (action === 'play') toggleDeck(name); if (action === 'previous') adjacentTrack(decks[name], -1); if (action === 'next') adjacentTrack(decks[name], 1); });
  Object.values(decks).forEach(deck => { deck.audio.ontimeupdate = () => updateDeck(deck.name); deck.audio.onloadedmetadata = () => updateDeck(deck.name); deck.audio.onended = () => ended(deck.name); });
  ['A', 'B'].forEach(name => $(`progress${name}`).oninput = event => { const audio = decks[name].audio; if (audio.duration) audio.currentTime = +event.target.value / 1000 * audio.duration; });
  $('crossfader').oninput = updateCrossfader; $('mixBtn').onclick = performMix; $('master').oninput = event => { ensureAudio(); state.master.gain.value = +event.target.value / 100; $('masterValue').textContent = `${event.target.value}%`; };
  $('autoBtn').onclick = () => { state.auto = !state.auto; $('autoBtn').classList.toggle('active', state.auto); $('autoBtn').querySelector('b').textContent = state.auto ? 'ON' : 'OFF'; };
  $('micBtn').onclick = toggleMic; $('helpBtn').onclick = () => $('helpDialog').showModal();

  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); state.installPrompt = event; $('installBtn').hidden = false; });
  $('installBtn').onclick = async () => { if (!state.installPrompt) return; state.installPrompt.prompt(); await state.installPrompt.userChoice; state.installPrompt = null; $('installBtn').hidden = true; };
  function updateConnection() { const online = navigator.onLine; $('connectionDot').classList.toggle('offline', !online); $('connectionLabel').textContent = online ? 'LOCAL SESSION' : 'OFFLINE SESSION'; }
  window.addEventListener('online', updateConnection); window.addEventListener('offline', updateConnection);
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(() => {}));

  async function init() {
    updateConnection(); const savedName = localStorage.getItem('ctr-v2-show-name') || 'Untitled show'; $('showName').textContent = savedName; $('liveShowName').textContent = savedName;
    try { state.tracks = await dbAll(); } catch { toast('Local library is unavailable in this browser'); }
    try { state.queue = JSON.parse(localStorage.getItem('ctr-v2-rundown')) || []; } catch { state.queue = []; }
    await requestPersistence(); renderAll();
  }
  setInterval(() => { const now = new Date(); $('clock').textContent = now.toLocaleTimeString([], { hour12: false }); $('showClock').textContent = now.toLocaleTimeString([], { hour12: false }); $('sessionTimer').textContent = state.sessionStarted ? formatTime((Date.now() - state.sessionStarted) / 1000) : '00:00:00'; }, 1000);
  init();
})();

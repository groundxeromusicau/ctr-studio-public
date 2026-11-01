// Polls the studio once a second; the lower third slides in again when the track changes.
(() => {
  const $ = id => document.getElementById(id);
  let shown = '';
  async function refresh() {
    try {
      const now = await (await fetch('/now.json', { cache: 'no-store' })).json();
      $('bug').hidden = !(now.onAir && now.bug);
      const track = now.onAir && now.lowerThird && now.title ? `${now.title}\n${now.artist}` : '';
      $('lowerThird').hidden = !track;
      if (track && track !== shown) {
        $('lowerThird').classList.remove('show');
        $('show').textContent = now.show ? `NOW PLAYING · ${now.show.toUpperCase()}` : 'NOW PLAYING';
        $('title').textContent = now.title; $('artist').textContent = now.artist;
        requestAnimationFrame(() => requestAnimationFrame(() => $('lowerThird').classList.add('show')));
      }
      shown = track;
    } catch { /* the studio is closed: keep the last frame */ }
  }
  refresh(); setInterval(refresh, 1000);
})();

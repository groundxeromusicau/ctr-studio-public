require('../../scripts/load-env')();

const express = require('express');
const path = require('path');

const app = express();
const frontend = path.join(__dirname, '..', 'frontend');

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=(self), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin'
  });
  next();
});
app.get('/api/health', (_req, res) => { res.set('Cache-Control', 'no-store'); res.json({ ok: true, product: 'CTR Studio Open', version: '2.0.0-alpha.4' }); });
app.use(express.static(frontend, {
  index: 'index.html',
  etag: true,
  maxAge: '1h',
  setHeaders(res, asset) {
    if (/\.(?:html|webmanifest)$/.test(asset) || asset.endsWith('service-worker.js')) res.set('Cache-Control', 'no-cache, must-revalidate');
  }
}));
app.get('*path', (req, res) => {
  const acceptsHtml = req.accepts('html') && !path.extname(req.path);
  if (!acceptsHtml) return res.status(404).type('text').send('Not found');
  return res.sendFile(path.join(frontend, 'index.html'));
});

if (require.main === module) {
  const port = process.env.PORT === '0' ? 0 : Number(process.env.PORT) || 3000;
  const server = app.listen(port, '127.0.0.1', () => {
    const activePort = server.address().port;
    console.log(`CTR Studio Open ready at http://127.0.0.1:${activePort}`);
    if (process.send) process.send({ type: 'ready', port: activePort });
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}

module.exports = app;

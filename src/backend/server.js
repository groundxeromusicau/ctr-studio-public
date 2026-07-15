require('../../scripts/load-env')();

const express = require('express');
const path = require('path');

const app = express();
const frontend = path.join(__dirname, '..', 'frontend');

app.disable('x-powered-by');
app.get('/api/health', (_req, res) => res.json({ ok: true, product: 'CTR Studio V2 Public', version: '2.0.0-alpha.2' }));
app.use(express.static(frontend, { index: 'index.html', etag: true, maxAge: '1h' }));
app.get('*path', (_req, res) => res.sendFile(path.join(frontend, 'index.html')));

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`CTR Studio V2 Public ready at http://localhost:${port}`);
    if (process.send) process.send({ type: 'ready', port });
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}

module.exports = app;

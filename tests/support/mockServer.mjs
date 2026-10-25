import http from 'node:http';
import { pathToFileURL } from 'node:url';

export async function startMockServer(port = 0) {
  const hits = [];
  const server = http.createServer((req, res) => {
    hits.push({ method: req.method, url: req.url });
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/redirect') {
      res.writeHead(302, { location: '/items' }).end();
      return;
    }
    if (url.pathname === '/sw.js') {
      res.writeHead(200, { 'content-type': 'text/javascript' });
      res.end('self.addEventListener("install", () => fetch("/write", {method:"POST"}));');
      return;
    }
    if (url.pathname === '/invalid-html' || url.pathname === '/wrong-media') {
      res.writeHead(200, { 'content-type': url.pathname === '/wrong-media' ? 'application/json' : 'text/html' });
      res.end('{}');
      return;
    }
    const status = /^\/status\/\d+$/.test(url.pathname) ? Number(url.pathname.split('/').pop()) : 200;
    res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><html><head><title>Local readonly fixture</title></head><body>'
      + '<nav data-testid="main-nav">Navigation</nav><main data-testid="list-container">'
      + '<h1 data-testid="detail-title">Mock item</h1></main></body></html>');
  });
  server.on('upgrade', (req, socket) => {
    hits.push({ method: 'WEBSOCKET', url: req.url });
    socket.destroy();
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  return { server, hits, baseURL };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { baseURL } = await startMockServer(4177);
  console.log(`Mock app listening on ${baseURL}`);
}

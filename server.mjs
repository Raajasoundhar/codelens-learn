import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { AppError, explain } from './lib/explain.mjs';

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/samples.js', ['samples.js', 'text/javascript; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']]
]);

async function readJson(req) {
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') throw new AppError(415, 'Use application/json.');
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) throw new AppError(413, 'This request is too large. Use a shorter snippet.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new AppError(400, 'Invalid JSON.'); }
}

export function createApp({ apiKey = '', model = 'claude-sonnet-4-6', workspaceId = '', fetchImpl = fetch, maxRequests = 10 } = {}) {
  let busy = false;
  let requests = [];
  const server = http.createServer(async (req, res) => {
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      // This prototype is deliberately local-only. Validate Host as well as Origin
      // to protect a configured API key from cross-site requests and DNS rebinding.
      const port = server.address()?.port;
      const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
      if (!hosts.includes(req.headers.host)) throw new AppError(403, 'Open the app using its local address.');
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) throw new AppError(403, 'Cross-site requests are not allowed.');
      if (req.headers['sec-fetch-site'] === 'cross-site') throw new AppError(403, 'Cross-site requests are not allowed.');
      const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
      if (req.method === 'GET' && pathname === '/api/status') return json(200, { connected: Boolean(apiKey), model: apiKey ? model : null });
      if (req.method === 'POST' && pathname === '/api/explain') {
        const input = await readJson(req);
        if (!apiKey) throw new AppError(503, 'Claude is not connected. Add ANTHROPIC_API_KEY to .env and restart the app.');
        if (busy) throw new AppError(429, 'An explanation is already running. Please wait for it to finish.');
        const now = Date.now(); requests = requests.filter(time => time > now - 60000);
        if (requests.length >= maxRequests) throw new AppError(429, 'Please wait a minute before requesting more explanations.');
        requests.push(now); busy = true;
        try { return json(200, { source: 'claude', explanation: await explain(input, { apiKey, model, workspaceId, fetchImpl }) }); }
        finally { busy = false; }
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); throw new AppError(405, 'Method not allowed.'); }
      const asset = assets.get(pathname);
      if (!asset) throw new AppError(404, 'Not found.');
      const body = await readFile(new URL(`./public/${asset[0]}`, import.meta.url));
      res.writeHead(200, { 'Content-Type': asset[1] });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      if (!res.headersSent) json(error instanceof AppError ? error.status : 500, { error: error instanceof AppError ? error.message : 'Something went wrong. Please try again.' });
      else res.end();
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
  const server = createApp({ apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', workspaceId: process.env.ANTHROPIC_WORKSPACE_ID });
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'This port is in use. Set a different PORT in .env.' : 'Could not start the local server.'); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`CodeLens Learn: http://127.0.0.1:${port}\n${process.env.ANTHROPIC_API_KEY ? 'Claude configured. API usage may incur charges.' : 'Sample mode ready. No API key required.'}`));
}

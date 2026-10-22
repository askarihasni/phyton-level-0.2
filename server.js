/**
 * server.js
 * ---------------------------------------------------------------------------
 * A tiny static file server used ONLY for local development.
 *
 * Why is it needed?
 *   The app is built with native ES modules (`<script type="module">`). All
 *   modern browsers block module imports from `file://` URLs for security
 *   reasons, so the page must be served over http://.
 *
 * This server has no application logic: it only reads files from disk and
 * sends them to the browser. The whole shopping cart / checkout system still
 * runs 100% in the browser - there is no backend.
 *
 * Usage:  node server.js        (then open http://localhost:8080)
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const HOST = '127.0.0.1';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

/**
 * Turn a request URL into a safe absolute path inside ROOT.
 * Returns null when the path tries to escape the project directory.
 *
 * @param {string} requestUrl
 * @returns {string | null}
 */
function resolvePath(requestUrl) {
  const { pathname } = new URL(requestUrl, `http://${HOST}:${PORT}`);
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const absolute = normalize(join(ROOT, relative));

  // Directory traversal guard: the resolved file must stay inside ROOT.
  if (absolute !== ROOT.replace(/[\\/]$/, '') && !absolute.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) {
    return null;
  }
  return absolute;
}

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method ?? 'GET')) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }

  const filePath = resolvePath(request.url ?? '/');
  if (!filePath) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  try {
    const info = await stat(filePath);
    const target = info.isDirectory() ? join(filePath, 'index.html') : filePath;
    const body = await readFile(target);

    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
    });

    if (request.method === 'HEAD') {
      response.end();
    } else {
      response.end(body);
    }
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><meta charset="utf-8"><h1>404 - Not found</h1>');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  SmartCart is running at  http://${HOST}:${PORT}\n  Press Ctrl+C to stop.\n`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try: set PORT=8081 && node server.js`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});

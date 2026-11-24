// Development server for BookTracker
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { saveStateToSqlite, loadStateFromSqlite } from './sqlite-store.mjs';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const configuredRoot = process.env.STATIC_ROOT || '.';
const staticRoot = resolve(projectRoot, configuredRoot);
const host = '127.0.0.1';
const port = Number.parseInt(process.env.PORT || '8080', 10);
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port number.');
}

if (staticRoot !== projectRoot && !staticRoot.startsWith(`${projectRoot}${sep}`)) {
  throw new Error('STATIC_ROOT must be inside the project directory.');
}

// Create HTTP server handling all requests
const server = createServer(async (request, response) => {
  // Parse request URL once per request
  const url = new URL(request.url || '/', `http://${host}:${port}`);

  // ---------- Load Database Endpoint ----------
  if (url.pathname === '/api/load-database' && request.method === 'GET') {
    try {
      const result = await loadStateFromSqlite();
      response.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      response.end(JSON.stringify(result));
    } catch (err) {
      response.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      response.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return; // finished handling this request
  }

  // ---------- Save Database Endpoint ----------
  if (url.pathname === '/api/save-database') {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      response.end();
      return;
    }

    if (request.method !== 'POST') {
      response.writeHead(405, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
      return;
    }

    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) {
        request.destroy();
      }
    });

    request.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const result = await saveStateToSqlite(payload);
        response.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        response.end(JSON.stringify(result));
      } catch (err) {
        response.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        response.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // Only allow GET/HEAD for static file serving
  if (!['GET', 'HEAD'].includes(request.method || '')) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }

  // ---------- Static File Serving ----------
  try {
    const requestedPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filePath = resolve(staticRoot, `.${requestedPath}`);
    if (filePath !== staticRoot && !filePath.startsWith(`${staticRoot}${sep}`)) {
      throw new Error('Path outside static root');
    }
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) throw new Error('Not a file');
    const type = contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    if (request.method === 'HEAD') { response.end(); return; }
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, host, () => {
  console.log(`BookTracker is running at http://${host}:${port}/`);
  console.log(`Volunteer sign-in: http://${host}:${port}/volunteer-login.html`);
  console.log(`Admin sign-in: http://${host}:${port}/admin-login.html`);
});

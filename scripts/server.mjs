import {createServer} from 'node:http';
import {readFile, realpath, stat} from 'node:fs/promises';
import {extname, isAbsolute, relative, resolve, sep} from 'node:path';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function inside(root, path) {
  const part = relative(root, path);
  return part !== '..' && !part.startsWith(`..${sep}`) && !isAbsolute(part);
}

// Serve the generated game only. No repository files or directory listings.
export function createPreviewServer(directory) {
  const root = resolve(directory);
  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    const reply = (code, message) => {
      response.writeHead(code, {'Content-Type': 'text/plain; charset=utf-8'});
      response.end(request.method === 'HEAD' ? undefined : message);
    };
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      return reply(405, 'Method not allowed');
    }
    let path;
    try {
      path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      return reply(400, 'Invalid URL');
    }
    if (path.includes('\0') || path.includes('\\') || path.split('/').some(p => p.startsWith('.'))) {
      return reply(404, 'Not found');
    }
    try {
      const base = await realpath(root);
      const target = resolve(base, `.${path === '/' ? '/index.html' : path}`);
      if (!inside(base, target)) return reply(404, 'Not found');
      const actual = await realpath(target);
      if (!inside(base, actual) || !(await stat(actual)).isFile()) return reply(404, 'Not found');
      const body = await readFile(actual);
      response.writeHead(200, {
        'Content-Type': types[extname(actual)] ?? 'application/octet-stream',
        'Content-Length': body.length,
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      if (['ENOENT', 'ENOTDIR', 'EACCES', 'ELOOP'].includes(error.code)) return reply(404, 'Not found');
      console.error('Preview request failed:', error.message);
      reply(500, 'Preview error');
    }
  });
}

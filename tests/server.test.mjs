import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, symlink, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
import {createPreviewServer} from '../scripts/server.mjs';

test('preview server serves the built game without exposing the repository', async t => {
  const folder = await mkdtemp(join(tmpdir(), 'gregor-preview-'));
  const dist = join(folder, 'dist');
  await mkdir(dist);
  await writeFile(join(dist, 'index.html'), '<h1>GREGoR Puzzles</h1>');
  await writeFile(join(dist, 'app.mjs'), 'export const ready = true;');
  await writeFile(join(folder, 'private.txt'), 'outside build');
  await symlink(join(folder, 'private.txt'), join(dist, 'outside.txt'));
  const server = createPreviewServer(dist);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await rm(folder, {recursive: true, force: true});
  });
  const port = server.address().port;
  function read(path, method = 'GET') {
    return new Promise((resolve, reject) => {
      const req = request({hostname: '127.0.0.1', port, path, method}, res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', part => body += part);
        res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body}));
      });
      req.on('error', reject);
      req.end();
    });
  }
  await t.test('index and versioned modules have the correct content types', async () => {
    const page = await read('/');
    assert.equal(page.status, 200);
    assert.equal(page.body, '<h1>GREGoR Puzzles</h1>');
    assert.match(page.headers['content-type'], /^text\/html/);
    const module = await read('/app.mjs?v=test');
    assert.equal(module.status, 200);
    assert.match(module.headers['content-type'], /^text\/javascript/);
    assert.equal(module.headers['x-content-type-options'], 'nosniff');
  });
  await t.test('HEAD reports file length without a response body', async () => {
    const result = await read('/', 'HEAD');
    assert.equal(result.status, 200);
    assert.equal(result.body, '');
    assert.equal(Number(result.headers['content-length']), Buffer.byteLength('<h1>GREGoR Puzzles</h1>'));
  });
  await t.test('missing files, source files, traversal and symlinks cannot expose data', async () => {
    for (const path of ['/missing', '/private.txt', '/.git/config', '/%2e%2e%2fprivate.txt', '/outside.txt', '/%00']) {
      const result = await read(path);
      assert.equal(result.status, 404, path);
      assert.equal(result.body, 'Not found');
    }
  });
  await t.test('malformed URLs and unsupported methods return clear errors', async () => {
    assert.equal((await read('/%XX')).status, 400);
    const result = await read('/', 'POST');
    assert.equal(result.status, 405);
    assert.equal(result.headers.allow, 'GET, HEAD');
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile, readdir, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

test('production build resolves every local file reference and excludes development material', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  await promisify(execFile)(process.execPath, [join(root, 'scripts/build.mjs')], {cwd: tmpdir()});
  const dist = join(root, 'dist');
  const names = await readdir(dist);
  assert.ok(names.includes('index.html'));
  assert.ok(names.includes('review.html'));
  // Keep both entry points unlisted even if moved to a different static host.
  for (const page of ['index.html', 'review.html']) {
    const html = await readFile(join(dist, page), 'utf8');
    const head = html.split('</head>')[0];
    assert.match(head, /<meta name="robots" content="[^\"]*\bnoindex\b[^\"]*">/, page);
  }
  for (const name of ['src', 'game', 'tests', 'docs', '.git', '.github', 'README.md', 'artwork-study.html']) {
    assert.ok(!names.includes(name), name);
  }
  for (const name of names.filter(n => /\.(html|mjs|css)$/.test(n))) {
    const content = await readFile(join(dist, name), 'utf8');
    for (const match of content.matchAll(/['"]\.\/([^'"?]+\.(?:mjs|css|webp|html))(?:\?[^'"]*)?['"]/g)) {
      if (match[1].includes('${')) continue;
      assert.ok((await stat(join(dist, match[1]))).isFile(), `${name}: ${match[1]}`);
    }
  }
  assert.equal((await readdir(join(dist, 'artwork'))).filter(n => n.endsWith('.webp')).length, 10);
});

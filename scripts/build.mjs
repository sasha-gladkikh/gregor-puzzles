import {mkdir, readFile, writeFile, cp, rm, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const source = fileURLToPath(new URL('../game/', import.meta.url));
const output = fileURLToPath(new URL('../dist/', import.meta.url));
const files = [
  'index.html', 'style.css', 'app.mjs', 'engine.mjs', 'session.mjs',
  'round.mjs', 'rounds.mjs', 'collection.mjs',
  'review.html', 'review.mjs', 'review.css',
  'clinical.mjs', 'clinical-ui.mjs', 'clinical.css', 'hpo-terms.mjs',
  'artwork-data.mjs', 'artwork-ui.mjs', 'artwork.css',
];
const contents = await Promise.all(files.map(file => readFile(join(source, file), 'utf8')));
const hash = createHash('sha256').update(contents.join('\n'));
async function hashArtwork(directory) {
  for (const entry of (await readdir(join(source, directory), {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await hashArtwork(path);
    else hash.update(path).update(await readFile(join(source, path)));
  }
}
await hashArtwork('artwork');
const revision = hash.digest('hex').slice(0, 12);
await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});
// Shared revisions prevent a browser from mixing files from different releases.
for (const [i, file] of files.entries()) {
  const text = contents[i].replace(/(['"])(\.\/[^'"?]+\.(?:mjs|css|webp|png|svg))(?:\?[^'"]*)?\1/g,
    (_, quote, path) => `${quote}${path}?v=${revision}${quote}`);
  await writeFile(join(output, file), text);
}
await cp(join(source, 'artwork'), join(output, 'artwork'), {recursive: true});
console.log(`Built GREGoR Puzzles in dist/ (${revision})`);

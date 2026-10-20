import {mkdir, readFile, writeFile, cp, rm, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {prepareHomeHTML} from './homepage.mjs';

const source = fileURLToPath(new URL('../game/', import.meta.url));
const output = fileURLToPath(new URL('../dist/', import.meta.url));
const files = [
  'index.html', 'home.mjs', 'home.css', 'home-state.mjs', 'home-demo.mjs', 'home-demo.css', 'journeys.mjs', 'puzzle-geometry.mjs', 'suggestions.mjs', 'community.mjs', 'player.mjs', 'player-ui.mjs', 'player.css', 'play.html', 'style.css', 'brand.css', 'app.mjs', 'engine.mjs', 'session.mjs', 'board-navigation.mjs',
  'rounds.mjs', 'molecular-clues.mjs', 'collection.mjs', 'signoff.mjs', 'mechanism.mjs', 'round-save.mjs', 'round-carousel.mjs', 'round-carousel.css',
  'review.html', 'review.mjs', 'review.css',
  'clinical.mjs', 'interpretation.mjs', 'clinical-ui.mjs', 'clinical.css', 'hpo-terms.mjs',
  'artwork-data.mjs', 'artwork-ui.mjs', 'artwork-source.mjs', 'artwork.css',
  'experience.mjs', 'experience.css', 'share-card.mjs', 'share-card.css',
  'gene-bank.mjs', 'gene-bank.css', 'gene-hints.mjs', 'play-learning.mjs', 'teaching-data.mjs', 'teaching-ui.mjs', 'teaching-ui.css', 'discovery-motion.mjs', 'discovery-motion.css',
  'artwork-motion.mjs', 'artwork-motion.css', 'artwork-motion-data.mjs', 'artwork-guide.mjs',
  'artwork-detail.mjs', 'artwork-detail-data.mjs', 'artwork-detail-membranes.mjs',
  'artwork-particle-contours.mjs', 'artwork-object-contours.mjs',
  'piece-motion.mjs', 'piece-motion.css', 'figure-view.mjs',
  'site.mjs', 'site.css', 'about.html', 'about.mjs', 'play.css',
  'science.html', 'science.mjs', 'science.css', 'science-ui.mjs',
  'collection.html', 'collection-page.mjs', 'collection-page.css', 'collection-data.mjs',
  'field-guide.html', 'field-guide.mjs', 'field-guide.css',
];
// With approval required, refuse to publish an empty collection.
const {rounds} = await import(new URL('rounds.mjs', new URL('../game/', import.meta.url)));
if (rounds.length === 0) throw new Error('No rounds are approved for publication. Update game/signoff.mjs or set requireApproval to false.');
const contents = await Promise.all(files.map(file => readFile(join(source, file), 'utf8')));
// The homepage only needs navigation and progress metadata, not clinical profiles.
const catalogue=rounds.map(({id,number,topic})=>({id,number,topic,saveKey:`gregor-puzzles:${id}`}));
files.push('home-data.mjs');
contents.push(`// Generated from the currently playable rounds.\nexport const catalogue=${JSON.stringify(catalogue)};\n`);
const homeIndex=files.indexOf('index.html');
contents[homeIndex]=prepareHomeHTML(contents[homeIndex],rounds);
const hash = createHash('sha256').update(contents.join('\n'));
async function hashArtwork(directory) {
  for (const entry of (await readdir(join(source, directory), {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await hashArtwork(path);
    else hash.update(path).update(await readFile(join(source, path)));
  }
}
await hashArtwork('artwork');
await hashArtwork('icons');
await hashArtwork('fonts');
const revision = hash.digest('hex').slice(0, 12);
await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});
// Shared revisions prevent a browser from mixing files from different releases.
for (const [i, file] of files.entries()) {
  const text = contents[i].replace(/(['"])(\.\/[^'"?]+\.(?:mjs|css|webp|png|svg|woff2))(?:\?[^'"]*)?\1/g,
    (_, quote, path) => `${quote}${path}?v=${revision}${quote}`);
  await writeFile(join(output, file), text);
}
for (const directory of ['artwork', 'icons', 'fonts']) await cp(join(source, directory), join(output, directory), {recursive: true});
console.log(`Built GREGoR Puzzles in dist/ (${revision})`);

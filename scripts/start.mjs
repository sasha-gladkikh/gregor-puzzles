import {fileURLToPath} from 'node:url';
import {createPreviewServer} from './server.mjs';

const args = process.argv.slice(2);
const value = args.length === 0 ? '4173' : args.length === 1 && args[0].startsWith('--port=') ? args[0].slice(7) : '';
const port = Number(value);
if (!/^\d+$/.test(value) || port < 1 || port > 65535) {
  console.error('Usage: npm start [-- --port=4174]');
  process.exit(1);
}

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
await import('./build.mjs');
const server = createPreviewServer('dist');
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is in use. Choose another port: npm start -- --port=${port === 65535 ? 4173 : port + 1}`
    : `Unable to start the game: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`\nGREGoR Puzzles\nhttp://localhost:${port}\nPress Ctrl+C to stop.\n`);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close());
}

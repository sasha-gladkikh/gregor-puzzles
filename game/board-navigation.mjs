import {COLS, ROWS, SIZE} from './engine.mjs';

// Horizontal arrows traverse every open position, wrapping between rows.
// Vertical arrows prefer the same column; if that column has no other open
// position, continue through the board so isolated spaces remain reachable.
export function nextOpenSlot(from, key, placed) {
  const occupied = new Set(placed);
  const open = Array.from({length: SIZE}, (_, id) => id).filter(id => !occupied.has(id));
  if (!open.length) return null;
  if (!Number.isInteger(from) || from < 0 || from >= SIZE) return open[0];
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return occupied.has(from) ? open[0] : from;
  const direction = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    const row = Math.floor(from / COLS), column = from % COLS;
    for (let distance = 1; distance < ROWS; distance++) {
      const candidate = ((row + direction * distance + ROWS) % ROWS) * COLS + column;
      if (!occupied.has(candidate)) return candidate;
    }
  }
  for (let distance = 1; distance <= SIZE; distance++) {
    const candidate = (from + direction * distance + SIZE) % SIZE;
    if (!occupied.has(candidate)) return candidate;
  }
  return null;
}

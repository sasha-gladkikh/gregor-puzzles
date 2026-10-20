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

// Prefer the nearest visible survivor in the original tray order. This preserves
// the player's place when the horizontal tray compacts after a placement.
export function nextTrayPiece(from, order, placed, visible = []) {
  const occupied = new Set(placed), available = order.filter(id => !occupied.has(id));
  const visibleSet = new Set(visible), candidates = available.filter(id => visibleSet.has(id));
  const index = Math.max(0, order.indexOf(from));
  return (candidates.length ? candidates : available).sort((a, b) =>
    Math.abs(order.indexOf(a) - index) - Math.abs(order.indexOf(b) - index) || order.indexOf(b) - order.indexOf(a))[0] ?? null;
}
export function horizontalRevealDelta(container, item) {
  return item.left < container.left ? item.left - container.left : item.right > container.right ? item.right - container.right : 0;
}

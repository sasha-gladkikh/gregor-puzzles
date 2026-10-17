import test from 'node:test';
import assert from 'node:assert/strict';
import {SIZE} from '../game/engine.mjs';
import {nextOpenSlot} from '../game/board-navigation.mjs';

const ids = Array.from({length: SIZE}, (_, id) => id);
const placedExcept = open => ids.filter(id => !open.includes(id));

test('horizontal arrows cross row boundaries and wrap without focusing filled spaces', () => {
  const placed = placedExcept([0, 3, 5, 11]);
  assert.equal(nextOpenSlot(3, 'ArrowRight', placed), 5);
  assert.equal(nextOpenSlot(5, 'ArrowLeft', placed), 3);
  assert.equal(nextOpenSlot(11, 'ArrowRight', placed), 0);
  assert.equal(nextOpenSlot(0, 'ArrowLeft', placed), 11);
});

test('diagonally isolated final positions remain reachable with every arrow', () => {
  for (const [first, second] of [[0, 5], [3, 8]]) {
    const placed = placedExcept([first, second]);
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      assert.equal(nextOpenSlot(first, key, placed), second);
      assert.equal(nextOpenSlot(second, key, placed), first);
    }
  }
});

test('vertical arrows retain spatial column movement when another open position exists', () => {
  const placed = placedExcept([1, 3, 5, 9]);
  assert.equal(nextOpenSlot(5, 'ArrowUp', placed), 1);
  assert.equal(nextOpenSlot(5, 'ArrowDown', placed), 9);
  assert.equal(nextOpenSlot(9, 'ArrowDown', placed), 1);
  assert.equal(nextOpenSlot(1, 'ArrowUp', placed), 9);
  assert.equal(nextOpenSlot(3, 'ArrowDown', placed), 5);
  assert.equal(nextOpenSlot(3, 'ArrowUp', placed), 1);
});

test('every possible unfinished board can be traversed entirely in either horizontal direction', () => {
  for (let mask = 1; mask < 1 << SIZE; mask++) {
    const open = ids.filter(id => mask & (1 << id)), placed = placedExcept(open);
    for (const key of ['ArrowLeft', 'ArrowRight']) {
      const visited = new Set();
      let current = open[0];
      for (let step = 0; step < open.length; step++) {
        assert.equal(placed.includes(current), false);
        visited.add(current);
        current = nextOpenSlot(current, key, placed);
      }
      assert.equal(current, open[0]);
      assert.equal(visited.size, open.length, `Unreachable position for ${key}, open positions ${open}`);
    }
  }
});

test('one remaining position keeps focus and a finished board has no focus destination', () => {
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
    assert.equal(nextOpenSlot(7, key, placedExcept([7])), 7);
    assert.equal(nextOpenSlot(7, key, ids), null);
  }
  assert.equal(nextOpenSlot(-1, 'ArrowRight', placedExcept([7])), 7);
  assert.equal(nextOpenSlot(7, 'Escape', placedExcept([7])), 7);
});

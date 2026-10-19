import test from 'node:test';
import assert from 'node:assert/strict';
import {demoPoint, demoFits} from '../game/home-demo.mjs';

test('pointer coordinates preserve the original image at desktop and mobile sizes', () => {
  for (const width of [320, 560, 1200]) {
    const rect = {left: 24, top: 80, width, height: width * .75};
    assert.deepEqual(demoPoint(rect.left + width * .625, rect.top + rect.height * .5, rect), {x: 500, y: 300});
  }
  assert.equal(demoPoint(1, 1, {left: 0, top: 0, width: 0, height: 0}), null);
});

test('drag snapping accepts the intended channel slot and rejects the loose-piece position', () => {
  assert.equal(demoFits(400, 200), true);
  assert.equal(demoFits(440, 240), true);
  assert.equal(demoFits(474, 200), true);
  assert.equal(demoFits(475, 200), false);
  assert.equal(demoFits(560, 30), false);
  assert.equal(demoFits(NaN, 200), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {demoPoint, demoFits, demoDestination, demoInspectionNotes} from '../game/home-demo.mjs';

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


test('preview action preserves the main page destination and returning-player label', () => {
  assert.deepEqual(demoDestination({href: './play.html?level=01', label: 'Start a puzzle'}), {href: './play.html?level=01', label: 'Play a full round'});
  assert.deepEqual(demoDestination({href: './play.html?level=07', label: 'Continue · 7 of 12 pieces'}), {href: './play.html?level=07', label: 'Continue · 7 of 12 pieces'});
  assert.deepEqual(demoDestination({href: './collection.html', label: 'Play another round'}), {href: './collection.html', label: 'Play another round'});
  for (const value of [null, {}, {href: 'javascript:alert(1)'}, {href: 'https://example.com/'}, {href: './about.html'}]) {
    assert.deepEqual(demoDestination(value), {href: './play.html?level=01', label: 'Play a full round'});
  }
});

test('the inspection lens uses complete anonymous notes at the reviewed structure coordinates', () => {
  const notes = demoInspectionNotes();
  assert.equal(notes.length, 3);
  assert.deepEqual(notes.map(({x,y}) => [x,y]), [[43,42],[66,46],[24,79]]);
  assert.deepEqual(notes.map(({marker}) => [marker.x,marker.y]), [[34,36],[76,37],[20,68]]);
  for (const note of notes) {
    assert.ok(note.title.length > 5);
    assert.ok(note.text.length > 60);
    assert.doesNotMatch(note.title + ' ' + note.text, /CLCN1|ClC-1|myotonia|Becker/i);
    const radians=note.marker.angle*Math.PI/180;
    assert.ok(Math.abs(note.marker.x+note.marker.length*Math.cos(radians)-note.x)<1e-10);
    assert.ok(Math.abs(note.marker.y+note.marker.length*Math.sin(radians)/.75-note.y)<1e-10);
  }
  assert.match(notes[1].text, /does not prescribe a fixed ion-flow direction/);
});

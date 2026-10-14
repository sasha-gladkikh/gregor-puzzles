import test from 'node:test';
import assert from 'node:assert/strict';
import {createSequence} from '../game/experience.mjs';

function setup(){
  let id=0;const pending=new Map(),steps=[];
  const sequence=createSequence(3,{onStep:i=>steps.push(i),schedule:callback=>{pending.set(++id,callback);return id;},cancel:key=>pending.delete(key)});
  const tick=()=>{const [key,callback]=pending.entries().next().value??[];if(callback){pending.delete(key);callback();}};
  return {sequence,pending,steps,tick};
}

test('walkthrough stays idle until requested and never loops on its own',()=>{
  const {sequence,pending,steps,tick}=setup();
  assert.equal(sequence.playing,false);assert.equal(pending.size,0);
  sequence.step(0);assert.equal(pending.size,0);
  sequence.play();tick();tick();tick();
  assert.deepEqual(steps,[0,1,2]);assert.equal(sequence.index,2);assert.equal(sequence.playing,false);assert.equal(pending.size,0);
  sequence.play();assert.equal(sequence.index,0);assert.equal(sequence.playing,true);
  sequence.pause();
});

test('pause or close cancels the scheduled step without losing position',()=>{
  const {sequence,pending,steps,tick}=setup();
  sequence.step(1);sequence.play();sequence.pause();tick();
  assert.equal(pending.size,0);assert.equal(sequence.index,1);assert.deepEqual(steps,[1]);
});

test('manual navigation pauses playback and cannot leave the three-step range',()=>{
  const {sequence,pending,tick}=setup();sequence.play();sequence.step(2);tick();
  assert.equal(sequence.playing,false);assert.equal(pending.size,0);assert.equal(sequence.index,2);
  sequence.step(99);assert.equal(sequence.index,2);sequence.step(-1);assert.equal(sequence.index,0);
});

test('repeated play requests cannot create overlapping timers',()=>{
  const {sequence,pending,tick}=setup();sequence.play();sequence.play();sequence.play();
  assert.equal(pending.size,1);tick();assert.equal(sequence.index,1);assert.equal(pending.size,1);
  sequence.pause();assert.equal(pending.size,0);
});

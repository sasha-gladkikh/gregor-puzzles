import test from 'node:test';
import assert from 'node:assert/strict';
import {createMotionClock} from '../game/biology-motion.mjs';

function setup(){
 let time=0,id=0;const frames=new Map(),positions=[];
 const clock=createMotionClock({duration:9000,now:()=>time,request:fn=>{frames.set(++id,fn);return id;},cancel:id=>frames.delete(id),onFrame:p=>positions.push(p)});
 const advance=ms=>{time+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn());};
 return {clock,frames,positions,advance};
}

test('biological playback is finite and replay starts at the beginning',()=>{
 const {clock,frames,advance}=setup();
 clock.play();clock.play();assert.equal(frames.size,1);
 advance(4500);assert.equal(clock.progress,.5);
 advance(6000);assert.equal(clock.progress,1);assert.equal(clock.playing,false);assert.equal(frames.size,0);
 clock.play();assert.equal(clock.progress,0);assert.equal(clock.playing,true);clock.dispose();
});

test('pausing an offscreen animation preserves its exact position across elapsed wall time',()=>{
 const {clock,frames,advance}=setup();
 clock.play();advance(3000);clock.pause();assert.equal(frames.size,0);
 advance(60000);assert.equal(clock.progress,1/3);
 clock.play();advance(1500);assert.equal(clock.progress,.5);clock.dispose();
});

test('reduced-motion final state has no queued frames and cleanup prevents delayed playback',()=>{
 const {clock,frames,positions,advance}=setup();
 clock.play();advance(900);clock.finish();assert.equal(clock.progress,1);assert.equal(clock.playing,false);assert.equal(frames.size,0);
 clock.dispose();const count=positions.length;clock.play();advance(9000);assert.equal(frames.size,0);assert.equal(positions.length,count);
});

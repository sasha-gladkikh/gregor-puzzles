import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiscoveryQueue} from '../game/discovery-motion.mjs';

const clue={kind:'clue',at:2,label:'Location',title:'A membrane channel',body:'A channel spans the membrane.'};
const note={kind:'landmark',index:0,title:'Membrane',text:'A boundary around the cell.'};
function setup(options={}){
  let id=0;const timers=new Map(),shown=[];let empty=0;
  const queue=createDiscoveryQueue({onShow:item=>shown.push(item),onEmpty:()=>empty++,schedule:callback=>{timers.set(++id,callback);return id;},cancel:key=>timers.delete(key),...options});
  const advance=()=>{const pending=[...timers.values()];timers.clear();pending.forEach(callback=>callback());};
  return {queue,timers,shown,advance,get empty(){return empty;}};
}

test('quick placements drain automatically, preserving discovery order without acknowledgement',()=>{
  const state=setup(),{queue,shown,timers,advance}=state;
  queue.push([clue]);queue.push([note]);
  assert.equal(queue.current,clue);assert.deepEqual(shown,[clue]);assert.equal(queue.size,2);assert.equal(timers.size,1);
  advance();assert.equal(queue.current,note);assert.deepEqual(shown,[clue,note]);assert.equal(timers.size,1);
  advance();assert.equal(queue.current,null);assert.equal(queue.size,0);assert.equal(timers.size,0);assert.equal(state.empty,1);
});

test('repeated renders cannot duplicate a discovery during or after its flight',()=>{
  const {queue,shown,advance}=setup();
  queue.push([clue,note,clue]);assert.equal(queue.size,2);
  advance();queue.push([{...clue},note]);assert.equal(queue.size,1);
  advance();queue.push([clue,note]);assert.equal(queue.size,0);assert.deepEqual(shown,[clue,note]);
});

test('clearing cancels flights and permits the same discoveries in a new round',()=>{
  const {queue,timers,shown,advance}=setup();
  queue.push([clue,note]);queue.clear();assert.equal(queue.size,0);assert.equal(timers.size,0);
  advance();assert.deepEqual(shown,[clue]);queue.push([clue]);assert.equal(queue.current,clue);assert.equal(timers.size,1);assert.equal(shown.length,2);
});

test('a stale timer callback cannot advance a new round after clear',()=>{
  const {queue,timers,shown,advance}=setup();queue.push([clue,note]);
  const stale=[...timers.values()][0];queue.clear();queue.push([note,clue]);
  stale();assert.equal(queue.current,note);assert.equal(queue.size,2);assert.equal(timers.size,1);assert.deepEqual(shown,[clue,note]);
  advance();assert.equal(queue.current,clue);
});

test('reduced motion or an inactive page skips decorative flights without retaining a queue',()=>{
  let enabled=false;const {queue,timers,shown,advance}=setup({enabled:()=>enabled});
  queue.push([clue,note]);assert.equal(queue.size,0);assert.equal(timers.size,0);assert.deepEqual(shown,[]);
  enabled=true;queue.push([clue,note]);assert.equal(queue.size,2);enabled=false;advance();
  assert.equal(queue.size,0);assert.equal(timers.size,0);assert.deepEqual(shown,[clue]);
  enabled=true;queue.push([note]);assert.equal(queue.current,note);
});

test('synchronous cancellation while resolving a target leaves no scheduled callback',()=>{
  let queue;const timers=new Map();
  queue=createDiscoveryQueue({onShow:()=>queue.clear(),schedule:callback=>{timers.set(1,callback);return 1;},cancel:key=>timers.delete(key)});
  queue.push([clue,note]);assert.equal(queue.size,0);assert.equal(timers.size,0);
});

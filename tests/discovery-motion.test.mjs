import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiscoveryQueue} from '../game/discovery-motion.mjs';

const clue={kind:'clue',at:2,label:'Location',title:'A membrane channel',body:'A channel spans the membrane.'};
const note={kind:'landmark',index:0,title:'Membrane',text:'A boundary around the cell.'};

test('quick placements queue explanations without replacing an unread discovery',()=>{
  const shown=[],kept=[];let empty=0;
  const queue=createDiscoveryQueue({onShow:item=>shown.push(item),onKeep:item=>kept.push(item),onEmpty:()=>empty++});
  queue.push([clue]);queue.push([note]);
  assert.equal(queue.current,clue);assert.deepEqual(shown,[clue]);assert.equal(queue.size,2);
  queue.keep();assert.equal(queue.current,note);assert.deepEqual(kept,[clue]);assert.deepEqual(shown,[clue,note]);
  queue.keep();assert.equal(queue.current,null);assert.equal(empty,1);assert.deepEqual(kept,[clue,note]);
});

test('repeated render discoveries do not appear twice before or after acknowledgment',()=>{
  const shown=[];const queue=createDiscoveryQueue({onShow:item=>shown.push(item)});
  queue.push([clue,note,clue]);assert.equal(queue.size,2);
  queue.keep();queue.push([{...clue},note]);assert.equal(queue.size,1);
  queue.keep();queue.push([clue,note]);assert.equal(queue.size,0);assert.equal(shown.length,2);
});

test('clearing a round cancels unread cards without counting them as acknowledged',()=>{
  const kept=[],shown=[];const queue=createDiscoveryQueue({onShow:item=>shown.push(item),onKeep:item=>kept.push(item)});
  queue.push([clue,note]);queue.clear();queue.keep();
  assert.equal(queue.size,0);assert.deepEqual(kept,[]);
  queue.push([clue]);assert.equal(queue.current,clue);assert.equal(shown.length,2);
});

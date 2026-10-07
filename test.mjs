import test from 'node:test';import assert from 'node:assert/strict';
import {SIZE,edges,pathFor,newState,place,guess,revealed,complete,validSave,shuffled,edgePoints} from './engine.mjs';
import {round} from './round.mjs';
test('every internal boundary is shared and outside boundaries are flat',()=>{for(let i=0;i<SIZE;i++){const e=edges(i);if(i%4<3)assert.equal(e.right,edges(i+1).left);else assert.equal(e.right,0);if(i<8)assert.equal(e.bottom,edges(i+4).top);else assert.equal(e.bottom,0);if(i%4===0)assert.equal(e.left,0);if(i<4)assert.equal(e.top,0);assert.match(pathFor(i),/^M .* Z$/);assert.ok(!pathFor(i).includes('NaN'));}});
test('shared tab curves coincide when traversed in reverse',()=>{
 const segments=(x,y,dx,dy,sign)=>{let start=[x,y];return edgePoints(x,y,dx,dy,sign).map(s=>{const out={...s,start};start=s.p.slice(-2);return out;}).filter(s=>s.op==='C');};
 const close=(a,b)=>a.forEach((n,i)=>assert.ok(Math.abs(n-b[i])<1e-9));
 for(const sign of [-1,1])for(const [dx,dy] of [[200,0],[0,200]]){
  const f=segments(0,0,dx,dy,sign),r=segments(dx,dy,-dx,-dy,-sign).reverse();
  f.forEach((s,i)=>{close(s.start,r[i].p.slice(4));close(s.p.slice(0,2),r[i].p.slice(2,4));close(s.p.slice(2,4),r[i].p.slice(0,2));close(s.p.slice(4),r[i].start);});
 }
});
test('wrong slots and duplicate placements cannot advance clues',()=>{const s=newState();assert.equal(place(s,0,1),false);assert.equal(place(s,-1,-1),false);assert.equal(place(s,0,0),true);assert.equal(place(s,0,0),false);assert.equal(s.placed.length,1);assert.equal(revealed(s,2),false);});
test('gene and condition unlock only at the last two milestones',()=>{const s=newState();for(let i=0;i<10;i++)place(s,i,i);assert.equal(revealed(s,round.clues[4].at),false);place(s,10,10);assert.equal(revealed(s,11),true);assert.equal(revealed(s,12),false);place(s,11,11);assert.equal(complete(s),true);});
test('gene recognition is case-insensitive and tracked separately',()=>{const s=newState();assert.equal(guess(s,'WRONG',round.gene),false);assert.equal(s.placed.length,0);assert.equal(guess(s,' clcn1 ',round.gene),true);assert.equal(complete(s),true);assert.equal(s.solvedByGuess,true);});
test('corrupt saved progress rejected',()=>{assert.ok(validSave(newState()));assert.ok(!validSave({...newState(),placed:[0,0]}));assert.ok(!validSave({...newState(),seconds:-1}));assert.ok(!validSave({...newState(),placed:[12]}));});
test('shuffle retains every piece exactly once',()=>assert.deepEqual(shuffled(Array.from({length:SIZE},(_,i)=>i)).sort((a,b)=>a-b),Array.from({length:SIZE},(_,i)=>i)));

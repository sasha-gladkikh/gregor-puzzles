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

import {restoreSession,choosePiece,elapsedSeconds,startRound,finishRound,pendingCheckpoint,answerCheckpoint,advanceTextCard,roundComplete} from './session.mjs';
import {checkpoints,textCards} from './round.mjs';
test('a new selection always clears the old hint',()=>{
 assert.deepEqual(choosePiece(4,0),{selected:0,hinted:null});
 assert.deepEqual(choosePiece(4,4),{selected:null,hinted:null});
});
test('timed progress continues through reload and inactive intervals',()=>{
 const state=newState();startRound(state,true,'image',100000);place(state,0,0);
 const resumed=restoreSession(JSON.parse(JSON.stringify({state,timed:true})),120000);
 assert.equal(elapsedSeconds(resumed.state,130000),30);
 assert.equal(elapsedSeconds(resumed.state,700000),600);
});
test('practice does not create a clock and legacy saves migrate',()=>{
 const state=newState();startRound(state,false,'text',100000);assert.equal(elapsedSeconds(state,200000),0);
 const resumed=restoreSession({timed:true,state:{placed:[0],hints:1,peeks:0,seconds:20,solvedByGuess:false}},100000);
 assert.equal(resumed.state.startedAt,80000);assert.equal(elapsedSeconds(resumed.state,110000),30);
 assert.deepEqual(resumed.state.answers,[]);
});
test('picture completion and gene recognition do not bypass learning checks',()=>{
 const s=newState();guess(s,round.gene,round.gene);assert.equal(roundComplete(s),false);
 assert.equal(pendingCheckpoint(s),'mechanism');
 assert.equal(answerCheckpoint(s,'inheritance',2,checkpoints.inheritance),false);
 assert.equal(answerCheckpoint(s,'mechanism',0,checkpoints.mechanism),false);
 assert.equal(answerCheckpoint(s,'mechanism',1,checkpoints.mechanism),true);
 assert.equal(pendingCheckpoint(s),'inheritance');
 assert.equal(answerCheckpoint(s,'inheritance',2,checkpoints.inheritance),true);
 assert.equal(roundComplete(s),true);
});
test('timer ends only when both picture and learning are complete',()=>{
 const s=newState();startRound(s,true,'image',100000);guess(s,round.gene,round.gene);
 finishRound(s,110000);assert.equal(s.finishedAt,null);
 answerCheckpoint(s,'mechanism',1,checkpoints.mechanism);answerCheckpoint(s,'inheritance',2,checkpoints.inheritance);
 finishRound(s,120000);assert.equal(elapsedSeconds(s,180000),20);
 finishRound(s,190000);assert.equal(s.finishedAt,120000);
 const resumed=restoreSession({state:s,timed:true},200000);assert.equal(elapsedSeconds(resumed.state,220000),20);
});
test('the text route completes the same milestones and enforces checkpoints',()=>{
 const s=newState();
 for(const card of textCards){
  const gate=pendingCheckpoint(s);
  if(gate){assert.equal(advanceTextCard(s,card,card.correct),false);answerCheckpoint(s,gate,checkpoints[gate].correct,checkpoints[gate]);}
  assert.equal(advanceTextCard(s,card,(card.correct+1)%3),false);
  assert.equal(advanceTextCard(s,card,card.correct),true);assert.equal(s.placed.length,card.at);
 }
 assert.equal(roundComplete(s),true);
});
test('switching from arbitrary image placements to text retains all prior pieces',()=>{
 const s=newState();place(s,11,11);place(s,8,8);place(s,5,5);
 assert.ok(advanceTextCard(s,textCards[1],textCards[1].correct));assert.equal(s.placed.length,4);
 assert.ok([11,8,5].every(i=>s.placed.includes(i)));assert.equal(new Set(s.placed).size,4);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {SIZE,edges,pathFor,newState,place,guess,revealed,complete,validSave,shuffled,edgePoints} from '../src/engine.mjs';
import {round} from '../src/round.mjs';
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

import {restoreSession,choosePiece,elapsedSeconds,startRound,finishRound,pendingCheckpoint,answerCheckpoint,roundComplete} from '../src/session.mjs';
import {checkpoints} from '../src/round.mjs';
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
 const state=newState();startRound(state,false,'image',100000);assert.equal(elapsedSeconds(state,200000),0);
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
test('old format preferences cannot hide the image puzzle or discard progress',()=>{
 const saved={state:{...newState(),placed:[0,4],usedRoutes:['text'],answers:[]},timed:false,route:'text'};
 const restored=restoreSession(saved);
 assert.deepEqual(restored.state.placed,[0,4]);assert.deepEqual(restored.state.usedRoutes,['legacy']);
 assert.equal('route' in restored,false);
});

import {rounds,findRound,saveKey} from '../src/rounds.mjs';
import {collectionProgress,roundLink} from '../src/collection.mjs';
import {readFileSync} from 'node:fs';
test('the collection contains ten distinct supplied gene-condition pairs',()=>{
 const supplied=[['CLCN1','255700'],['GJB2','220290'],['SLC29A3','602782'],['SBDS','260400'],['RNU4-2','620851'],['CACNA1A','617106'],['PTPN11','163950'],['RNU4ATAC','616651'],['STING1','615934'],['FGF14','620174']];
 assert.deepEqual(rounds.map(r=>[r.gene,r.omim]),supplied);
 assert.equal(new Set(rounds.map(saveKey)).size,10);
 for(const r of rounds){
  assert.deepEqual(r.clues.map(c=>c.at),[2,4,6,8,11,12]);
  assert.equal(r.clues[4].title,r.gene);assert.equal(r.clues[5].title,r.condition);
  assert.ok(r.sources.some(([,url])=>url===`https://omim.org/entry/${r.omim}`));
  assert.equal(r.pieces.length,SIZE);assert.ok(r.clinical.features.length>=6&&r.clinical.features.length<=8);
  for(const q of Object.values(r.checkpoints)){assert.ok(q.correct>=0&&q.correct<q.options.length);assert.ok(q.explanation&&q.source.startsWith('https://'));}
  const bytes=readFileSync(new URL(r.artwork,new URL('../src/',import.meta.url)));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.equal(r.illustration.landmarks.length,3);assert.ok(r.illustration.takeaway&&r.illustration.note);
  assert.ok(r.sources.some(([,url])=>url===r.illustration.source));
  for(const point of r.illustration.landmarks){assert.ok(point.x>0&&point.x<100&&point.y>0&&point.y<100);assert.ok(point.title&&point.text);}
  assert.ok(!r.description.includes(r.gene));
 }
});
test('all ten image puzzles and recognition routes complete with both questions',()=>{
 for(const r of rounds)for(const route of ['image','guess']){
  const state=newState();startRound(state,true,route,10000);
  if(route==='guess')guess(state,r.gene.toLowerCase(),r.gene);
  for(let piece=0;piece<SIZE;piece++){
   if(route==='image')place(state,piece,piece);
   let id;while((id=pendingCheckpoint(state))){const q=r.checkpoints[id];assert.equal(answerCheckpoint(state,id,(q.correct+1)%q.options.length,q),false);assert.equal(answerCheckpoint(state,id,q.correct,q),true);}
  }
  assert.equal(roundComplete(state),true,r.gene);finishRound(state,25000);assert.equal(elapsedSeconds(state,50000),15);
 }
});
test('round navigation uses stable anonymous numbers and safe fallback',()=>{
 for(const r of rounds){assert.equal(findRound(r.number),r);assert.equal(findRound(r.id),r);assert.match(roundLink(r),/^\?level=\d{2}$/);}
 for(const value of [null,undefined,'99','<script>',''])assert.equal(findRound(value),rounds[0]);
 assert.equal(saveKey(rounds[0]),'gregor-puzzles:clcn1-recessive-v1');
});
test('progress stays isolated by round and a reset affects only that round',()=>{
 const store=new Map(),read=k=>store.get(k);
 for(const [i,r] of rounds.entries()){
  const state=newState();startRound(state,false,'image');
  for(let j=0;j<=i;j++)place(state,j,j);
  store.set(saveKey(r),JSON.stringify({state,timed:false}));
 }
 assert.deepEqual(collectionProgress(read).map(p=>p.pieces),[1,2,3,4,5,6,7,8,9,10]);
 store.set(saveKey(rounds[3]),JSON.stringify({state:newState(),timed:false}));
 assert.deepEqual(collectionProgress(read).map(p=>p.pieces),[1,2,3,0,5,6,7,8,9,10]);
});
test('collection completion requires all 20 answers and survives corrupt storage',()=>{
 const store=new Map();for(const r of rounds){const state=newState();guess(state,r.gene,r.gene);store.set(saveKey(r),JSON.stringify({state,timed:false}));}
 assert.equal(collectionProgress(k=>store.get(k)).filter(p=>p.done).length,0);
 for(const r of rounds){const value=JSON.parse(store.get(saveKey(r)));value.state.answers=['mechanism','inheritance'];store.set(saveKey(r),JSON.stringify(value));}
 assert.equal(collectionProgress(k=>store.get(k)).filter(p=>p.done).length,10);
 store.set(saveKey(rounds[4]),'{not json');assert.equal(collectionProgress(k=>store.get(k)).filter(p=>p.done).length,9);
 assert.equal(collectionProgress(()=>{throw Error('blocked');}).every(p=>p.pieces===0),true);
 const state=newState();place(state,0,0);assert.equal(collectionProgress(()=>{throw Error('blocked');},{id:rounds[0].id,state})[0].pieces,1);
});

import {hpoTerms} from '../src/hpo-terms.mjs';
test('clinical teaching has traceable terminology, claim sources, and distinct reasoning tasks',()=>{
 const prompts=[];
 for(const r of rounds){
  assert.ok(r.clinical.objective&&r.clinical.memory&&r.clinical.recall.length===2);
  assert.equal(r.clues.find(c=>c.at===6).body,r.clinical.pattern);
  assert.ok(r.clinical.pearls.length>=2);
  for(const f of r.clinical.features){if(f.hpo)assert.ok(hpoTerms[f.hpo],f.hpo);assert.ok(r.sources.some(([,url])=>url===f.source));}
  for(const q of Object.values(r.checkpoints)){prompts.push(q.question);assert.equal(q.rationales.length,q.options.length);assert.ok(q.rationales.every(Boolean));assert.ok(r.sources.some(([,url])=>url===q.source));}
  const earlyText=r.clues.filter(c=>c.at<11).map(c=>c.body+' '+c.title).join(' ');
  assert.ok(!earlyText.toLowerCase().includes(r.gene.toLowerCase()),r.gene+' leaked before reveal');
 }
 assert.equal(new Set(prompts).size,20);
});
test('new clinical questions preserve legacy pieces but require fresh answers',()=>{
 const old={...newState(),learningVersion:1,placed:[0,1,2,3,4,5],answers:['mechanism'],started:true};
 const restored=restoreSession({state:old,timed:false},100000);
 assert.deepEqual(restored.state.placed,old.placed);assert.deepEqual(restored.state.answers,[]);assert.equal(restored.upgraded,true);
 assert.equal(pendingCheckpoint(restored.state),'mechanism');
 const next=restoreSession({state:restored.state,timed:false},110000);assert.equal(next.upgraded,false);
});
test('upgrading a completed timed save excludes time since its old finish',()=>{
 const state={...newState(),learningVersion:1,placed:Array.from({length:SIZE},(_,i)=>i),answers:['mechanism','inheritance'],started:true,startedAt:10000,finishedAt:30000,seconds:20};
 const result=restoreSession({state,timed:true},1000000);
 assert.equal(elapsedSeconds(result.state,1000000),20);assert.equal(elapsedSeconds(result.state,1005000),25);
 assert.deepEqual(result.state.answers,[]);assert.equal(result.state.finishedAt,null);
});

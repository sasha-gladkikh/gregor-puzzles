import test from 'node:test';import assert from 'node:assert/strict';
import {SIZE,edges,pathFor,newState,place,guess,revealed,complete,validSave,shuffled,edgePoints,recognizeGene,revealGeneHint,geneHintText} from '../game/engine.mjs';
import {allRounds as catalog} from '../game/rounds.mjs';
const round=catalog[0];
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

import {restoreSession,choosePiece,elapsedSeconds,startRound,finishRound,roundComplete} from '../game/session.mjs';
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
 assert.equal('answers' in resumed.state,false);
});
test('the last piece completes the round and stops its timer',()=>{
 const s=newState();startRound(s,true,'image',100000);
 for(let i=0;i<SIZE-1;i++)place(s,i,i);
 finishRound(s,110000);assert.equal(s.finishedAt,null);assert.equal(roundComplete(s),false);
 place(s,SIZE-1,SIZE-1);assert.equal(roundComplete(s),true);
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

import {rounds,findRound,saveKey} from '../game/rounds.mjs';
import {collectionProgress,roundLink} from '../game/collection.mjs';
import {readFileSync} from 'node:fs';
test('the collection contains ten distinct supplied gene-condition pairs',()=>{
 const supplied=[['CLCN1','255700'],['GJB2','220290'],['SLC29A3','602782'],['SBDS','260400'],['RNU4-2','620851'],['CACNA1A','617106'],['PTPN11','163950'],['RNU4ATAC','616651'],['STING1','615934'],['FGF14','620174']];
 assert.deepEqual(allRounds.map(r=>[r.gene,r.omim]),supplied);
 assert.equal(new Set(allRounds.map(saveKey)).size,10);
 for(const r of allRounds){
  assert.deepEqual(r.clues.map(c=>c.at),[2,4,6,8,11,12]);
  assert.equal(r.clues[4].title,r.gene);assert.equal(r.clues[5].title,r.condition);
  assert.ok(r.sources.some(([,url])=>url===`https://omim.org/entry/${r.omim}`));
  assert.equal(r.pieces.length,SIZE);assert.ok(r.clinical.features.length>=6);
  const bytes=readFileSync(new URL(r.artwork,new URL('../game/',import.meta.url)));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.equal(r.illustration.landmarks.length,3);assert.ok(r.illustration.takeaway&&r.illustration.note);
  assert.ok(r.sources.some(([,url])=>url===r.illustration.source));
  for(const point of r.illustration.landmarks){assert.ok(point.x>0&&point.x<100&&point.y>0&&point.y<100);assert.ok(point.title&&point.text);}
  assert.ok(!r.description.includes(r.gene));
 }
});
test('all ten image puzzles and recognition routes finish without interruptions',()=>{
 for(const r of allRounds)for(const route of ['image','guess']){
  const state=newState();startRound(state,true,route,10000);
  if(route==='guess')guess(state,r.gene.toLowerCase(),r.gene);
  for(let piece=0;piece<SIZE;piece++){
   if(route==='image')place(state,piece,piece);
   if(route==='image')assert.equal(roundComplete(state),piece===SIZE-1,r.gene);
  }
  assert.equal(roundComplete(state),true,r.gene);finishRound(state,25000);assert.equal(elapsedSeconds(state,50000),15);
 }
});
test('round navigation uses stable anonymous numbers and safe fallback',()=>{
 for(const r of rounds){assert.equal(findRound(r.number),r);assert.equal(findRound(r.id),r);assert.match(roundLink(r),/^\?level=\d{2}$/);}
 for(const value of [null,undefined,'99','<script>',''])assert.equal(findRound(value),rounds[0]);
 assert.equal(saveKey(allRounds[0]),'gregor-puzzles:clcn1-recessive-v1');
});
test('progress stays isolated by round and a reset affects only that round',()=>{
 const store=new Map(),read=k=>store.get(k);
 for(const [i,r] of rounds.entries()){
  const state=newState();startRound(state,false,'image');
  for(let j=0;j<=i;j++)place(state,j,j);
  store.set(saveKey(r),JSON.stringify({state,timed:false}));
 }
 const counts=rounds.map((_,i)=>i+1),reset=Math.min(3,rounds.length-1);
 assert.deepEqual(collectionProgress(read).map(p=>p.pieces),counts);
 store.set(saveKey(rounds[reset]),JSON.stringify({state:newState(),timed:false}));
 assert.deepEqual(collectionProgress(read).map(p=>p.pieces),counts.map((n,i)=>i===reset?0:n));
});
test('collection completion counts finished images and survives corrupt storage',()=>{
 const store=new Map();for(const r of rounds){const state=newState();guess(state,r.gene,r.gene);store.set(saveKey(r),JSON.stringify({state,timed:false}));}
 assert.equal(collectionProgress(k=>store.get(k)).filter(p=>p.done).length,rounds.length);
 store.set(saveKey(rounds[Math.min(4,rounds.length-1)]),'{not json');assert.equal(collectionProgress(k=>store.get(k)).filter(p=>p.done).length,rounds.length-1);
 assert.equal(collectionProgress(()=>{throw Error('blocked');}).every(p=>p.pieces===0),true);
 const state=newState();place(state,0,0);assert.equal(collectionProgress(()=>{throw Error('blocked');},{id:rounds[0].id,state})[0].pieces,1);
});

import {hpoTerms} from '../game/hpo-terms.mjs';
test('clinical teaching retains traceable terminology and sources without revealing names early',()=>{
 for(const r of allRounds){
  assert.ok(r.clinical.objective&&r.clinical.memory);
  assert.equal(r.clues.find(c=>c.at===6).body,r.clinical.pattern);
  assert.ok(r.clinical.pearls.length>=2);
  for(const f of r.clinical.features){if(f.hpo)assert.ok(hpoTerms[f.hpo],f.hpo);assert.ok(r.sources.some(([,url])=>url===f.source));}
  const earlyText=r.clues.filter(c=>c.at<11).map(c=>c.body+' '+c.title).join(' ');
  assert.ok(!earlyText.toLowerCase().includes(r.gene.toLowerCase()),r.gene+' leaked before reveal');
 }
});
test('previous quiz checkpoints preserve pieces and allow immediate continuation',()=>{
 for(const count of [6,8])for(const version of [1,2]){
  const old={...newState(),sessionVersion:undefined,learningVersion:version,placed:Array.from({length:count},(_,i)=>i),answers:['mechanism'],started:true};
  const {state}=restoreSession({state:old,timed:false},100000);
  assert.deepEqual(state.placed,old.placed);assert.equal('answers' in state,false);assert.equal('learningVersion' in state,false);
  assert.equal(roundComplete(state),false);assert.equal(place(state,count,count),true);
  const progress=collectionProgress(()=>null,{id:rounds[0].id,state:old})[0];
  assert.equal(progress.percent,Math.round(count/SIZE*100));
 }
});
test('previously completed timed rounds retain their saved finish',()=>{
 const state={...newState(),sessionVersion:undefined,learningVersion:1,placed:Array.from({length:SIZE},(_,i)=>i),answers:['mechanism','inheritance'],started:true,startedAt:10000,finishedAt:30000,seconds:20};
 const result=restoreSession({state,timed:true},1000000);
 assert.equal(roundComplete(result.state),true);assert.equal(elapsedSeconds(result.state,1005000),20);
 assert.equal(result.state.finishedAt,30000);assert.equal(result.state.timingUnavailable,false);
});
test('old finished pictures awaiting quizzes count as complete without fabricating a time',()=>{
 const old={...newState(),sessionVersion:undefined,learningVersion:2,placed:Array.from({length:SIZE},(_,i)=>i),answers:[],started:true,startedAt:10000};
 const result=restoreSession({state:old,timed:true},1000000);
 assert.equal(roundComplete(result.state),true);assert.equal(result.state.timingUnavailable,true);assert.equal(result.state.startedAt,null);
 const reload=restoreSession(result,2000000);assert.equal(reload.state.timingUnavailable,true);assert.equal(reload.state.startedAt,null);
 assert.equal(collectionProgress(()=>JSON.stringify({state:old,timed:true})).every(p=>p.done&&p.percent===100),true);
 const practice=restoreSession({state:old,timed:false},1000000);assert.equal(roundComplete(practice.state),true);assert.equal(practice.state.timingUnavailable,false);
});

import {landmarkPiece,normalizeGene} from '../game/engine.mjs';
import {newPlayerKeys} from '../game/collection.mjs';
import {allRounds,publishedRounds,searchText} from '../game/rounds.mjs';
import {signoff,isApproved,checks,requireApproval} from '../game/signoff.mjs';
import {mechanisms,spliceComparison} from '../game/mechanism.mjs';
test('clues follow location, function, clinical pattern, inheritance, gene, and condition',()=>{
 for(const r of allRounds){
  assert.deepEqual(r.clues.map(c=>c.label),['Location','Function','Clinical pattern','Inheritance','The gene','The condition']);
  assert.equal(r.clues[2].title,r.clinical.patternTitle);
 }
 for(const r of allRounds)for(const field of ['phenotypes','subtitle'])assert.equal(field in r,false,`${r.gene}.${field}`);
});
test('each image note belongs to a different piece',()=>{
 for(const r of allRounds){const pieces=r.illustration.landmarks.map(landmarkPiece);assert.equal(new Set(pieces).size,3,r.gene);for(const p of pieces)assert.ok(p>=0&&p<SIZE);}
 assert.equal(landmarkPiece({x:43,y:42}),5);assert.equal(landmarkPiece({x:99,y:99}),11);assert.equal(landmarkPiece({x:1,y:1}),0);
});
test('gene entry ignores punctuation, accepts previous symbols, and records pieces used',()=>{
 assert.equal(normalizeGene(' rnu4 2 '),'RNU42');
 const s=newState();for(let i=0;i<4;i++)place(s,i,i);
 assert.equal(guess(s,'RNU4.2','RNU4-2'),true);assert.equal(s.namedAt,4);
 const sting=allRounds.find(r=>r.gene==='STING1'),t=newState();
 assert.equal(guess(t,'tmem173',sting.gene,sting.aliases),true);assert.equal(t.namedAt,0);
 assert.equal(guess(newState(),'STING',sting.gene,sting.aliases),false);assert.ok(sting.products.includes('STING'));
 assert.equal(guess(newState(),'---','RNU4-2'),false);
 assert.equal(restoreSession(JSON.parse(JSON.stringify({state:s,timed:false}))).state.namedAt,4);
 assert.equal(restoreSession({state:{...newState(),namedAt:99,solvedByGuess:true},timed:false}).state.namedAt,null);
});
test('a new player clears every round but keeps editorial notes',()=>{
 const keys=['gregor-puzzles:clcn1-recessive-v1','gregor-puzzles:fgf14-sca27b-v1','gregor-puzzles:review-notes:clcn1-recessive-v1','other-site:key'];
 assert.deepEqual(newPlayerKeys(keys),keys.slice(0,2));
});
test('optional recognition accepts precise products and aliases without conflating shared RNAs or diagnoses',()=>{
 const slc=allRounds.find(r=>r.gene==='SLC29A3'),sting=allRounds.find(r=>r.gene==='STING1'),rna=allRounds.find(r=>r.gene==='RNU4-2');
 assert.deepEqual(recognizeGene(' ent-3 ',slc),{kind:'product',name:'ENT3'});
 assert.equal(recognizeGene('STING',sting).kind,'product');
 assert.equal(recognizeGene('TMEM173',sting).kind,'alias');
 assert.equal(recognizeGene('RNU42',rna).kind,'symbol');
 assert.equal(recognizeGene('U4',rna).kind,'ambiguous');
 assert.equal(recognizeGene('U4 snRNA',rna).kind,'ambiguous');
 assert.equal(recognizeGene('STING',slc),null);
 assert.equal(recognizeGene('Noonan syndrome',allRounds.find(r=>r.gene==='PTPN11')),null);
 for(const r of allRounds)for(const product of r.products.filter(name=>!r.ambiguousProducts.includes(name))){
  const state=newState();place(state,0,0);const answer=recognizeGene(product,r);
  assert.equal(answer.kind,'product',`${r.gene}: ${product}`);
  assert.equal(guess(state,r.gene,r.gene),true);assert.equal(state.namedAt,1);assert.equal(complete(state),true);
 }
});
test('Science searches recognize protein names, former symbols, alternative conditions and HPO vocabulary',()=>{
 const matches=query=>allRounds.filter(r=>searchText(r).includes(query.toLowerCase())).map(r=>r.gene);
 assert.deepEqual(matches('ENT3'),['SLC29A3']);assert.deepEqual(matches('H syndrome'),['SLC29A3']);
 assert.ok(matches('TMEM173').includes('STING1'));assert.ok(matches('SHP-2').includes('PTPN11'));
 assert.ok(matches('Muscle weakness').includes('CLCN1'));
});
test('requested gene hints are available immediately and biology comes before the symbol',()=>{
 for(const r of allRounds){
  const state=newState();assert.equal(geneHintText(state,r),null);assert.equal(state.hints,0);
  const biology=revealGeneHint(state,r);assert.ok(biology.length>20);assert.equal(state.placed.length,0);
  assert.equal(state.geneHintsSeen,1);assert.equal(state.hints,1);
  for(const name of [r.gene,...r.aliases,...r.products])assert.ok(!normalizeGene(biology).includes(normalizeGene(name)),`${r.gene}: first hint reveals ${name}`);
  assert.equal(geneHintText(state,r),biology);assert.equal(state.hints,1);
  const both=revealGeneHint(state,r);assert.ok(both.startsWith(biology));
  assert.ok(both.includes(`starts with ${normalizeGene(r.gene).slice(0,3)}`));
  assert.ok(both.includes(`${normalizeGene(r.gene).length} letters and digits`));
  assert.equal(state.geneHintsSeen,2);assert.equal(state.hints,2);
  assert.equal(revealGeneHint(state,r),both);assert.equal(state.hints,2);
 }
});
test('gene hint steps and counts persist without a reveal when progress is restored',()=>{
 const r=allRounds.find(r=>r.gene==='SLC29A3'),state=newState();startRound(state,false,'guess');
 const biology=revealGeneHint(state,r);
 const first=restoreSession(JSON.parse(JSON.stringify({state,timed:false}))).state;
 assert.equal(first.geneHintsSeen,1);assert.equal(geneHintText(first,r),biology);assert.equal(first.hints,1);
 const both=revealGeneHint(first,r);
 const second=restoreSession(JSON.parse(JSON.stringify({state:first,timed:false}))).state;
 assert.equal(second.geneHintsSeen,2);assert.equal(geneHintText(second,r),both);assert.equal(second.hints,2);
 assert.equal(revealGeneHint(second,r),both);assert.equal(second.hints,2);
 assert.equal(geneHintText(restoreSession({state:newState(),timed:false}).state,r),null);
});
test('older symbol hints retain access without adding to the saved hint count',()=>{
 const r=allRounds.find(r=>r.gene==='RNU4-2');
 const old={...newState(),geneHintsSeen:undefined,geneHintSeen:true,hints:1,placed:[0,1,2,3,4,5,6,7]};
 const restored=restoreSession({state:old,timed:false}).state;
 assert.equal(restored.geneHintsSeen,2);assert.equal('geneHintSeen' in restored,false);
 assert.match(geneHintText(restored,r),/starts with RNU and has 5 letters and digits/);
 revealGeneHint(restored,r);assert.equal(restored.hints,1);
 for(const invalid of [-1,3,1.5,'2',null]){
  const state=restoreSession({state:{...newState(),geneHintsSeen:invalid},timed:false}).state;
  assert.equal(state.geneHintsSeen,0);assert.equal(geneHintText(state,r),null);
 }
 const finished=newState();guess(finished,r.gene,r.gene);
 assert.equal(revealGeneHint(finished,r),null);assert.equal(finished.hints,0);
});
test('sign-off gates publication only when required and complete',()=>{
 assert.deepEqual(rounds.map(r=>r.id),publishedRounds(allRounds,requireApproval).map(r=>r.id));assert.ok(rounds.length>0);
 assert.equal(publishedRounds(allRounds,false).length,10);
 assert.deepEqual(Object.keys(signoff).sort(),allRounds.map(r=>r.id).sort());
 const full={status:'approved',reviewer:'Reviewer',date:'2026-10-20',checks:Object.fromEntries(checks.map(([k])=>[k,true]))};
 assert.equal(isApproved(full),true);assert.equal(isApproved({...full,date:''}),false);assert.equal(isApproved({...full,checks:{...full.checks,clinical:false}}),false);
 const list=allRounds.map((r,i)=>({...r,signoff:i===2?full:{...full,status:'pending'}}));assert.deepEqual(publishedRounds(list,true).map(r=>r.number),['03']);
 for(const r of allRounds)if(!isApproved(r.signoff))assert.equal(r.reviewStatus,'Pending scientific review');
});
test('completion cards, mechanism figures, and comparisons cite listed sources',()=>{
 for(const r of allRounds){
  const c=r.clinical;assert.ok(c.connection&&c.patternTitle,r.gene);assert.ok(c.pearls[c.caveat],r.gene);
  assert.ok(!c.patternTitle.toLowerCase().includes(r.gene.toLowerCase()));
  const urls=[...(mechanisms[r.number]?.sources??[]),...(spliceComparison.rounds.includes(r.number)?[spliceComparison.source]:[]),...c.pearls.flatMap(p=>p.sources)];
  for(const url of urls)assert.ok(r.sources.some(([,u])=>u===url),`${r.gene}: ${url}`);
 }
 assert.deepEqual(Object.keys(mechanisms).sort(),['05','07','09']);
 for(const m of Object.values(mechanisms)){assert.equal(m.captions.length,2);assert.equal(m.toggle.length,2);assert.match(m.svg,/class="m-after"/);}
});
test('automatic early clues and image notes do not name the gene, product, or condition',()=>{
 const conditions=['SAVI','SCA27B','ReNU','Noonan','Roifman','Shwachman','myotonia','DFNB1','H syndrome'];
 const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 for(const r of allRounds){
  const terms=[r.gene,...r.aliases,...r.products,r.condition,...conditions].map(t=>new RegExp(`(^|[^A-Za-z0-9])${escape(t)}(?![A-Za-z0-9])`,'i'));
  const shown=[...r.illustration.landmarks.flatMap(l=>[l.playTitle,l.playText]),r.description,...r.pieces,...r.clues.filter(c=>c.at<11).flatMap(c=>[c.title,c.body])];
  for(const text of shown)for(const term of terms)assert.ok(!term.test(text),`${r.gene}: ${term} in “${text}”`);
  for(const l of r.illustration.landmarks)assert.ok(l.title&&l.text&&l.playTitle&&l.playText);
 }
});

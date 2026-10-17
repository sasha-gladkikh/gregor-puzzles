import test from 'node:test';
import assert from 'node:assert/strict';
import {allRounds} from '../game/rounds.mjs';
import {newState,guess,GENE_HINT_STEPS,GENE_HINT_VERSION,geneHintCount,geneHintStatus,migrateGeneHints,geneHintText,revealGeneHint,geneClueConnection} from '../game/engine.mjs';

test('a returning player retains previously revealed symbol help without being charged for the inserted teaching step',()=>{
 const round=allRounds.find(round=>round.gene==='SLC29A3');
 for(const saved of [{geneHintsSeen:2},{geneHintVersion:1,geneHintsSeen:2},{geneHintSeen:true}]){
  const legacy={...newState(),geneHintVersion:undefined,...saved,hints:2};
  const snapshot=JSON.stringify(legacy),migrated=migrateGeneHints(legacy);
  assert.equal(JSON.stringify(legacy),snapshot,'migration must not mutate the saved record');
  assert.deepEqual(migrated,{geneHintVersion:GENE_HINT_VERSION,geneHintsSeen:GENE_HINT_STEPS});
  const restored={...legacy,...migrated};
  assert.match(geneHintText(restored,round),/solute carrier/);
  assert.match(geneHintText(restored,round),/starts with SLC/);
  assert.equal(geneHintStatus(restored).hasNext,false);
  revealGeneHint(restored,round);
  assert.equal(restored.hints,2);
 }
});

test('a second hint from the current version remains a teaching step after a reload',()=>{
 const round=allRounds.find(round=>round.gene==='SLC29A3'),state=newState();
 revealGeneHint(state,round);revealGeneHint(state,round);
 Object.assign(state,migrateGeneHints(JSON.parse(JSON.stringify(state))));
 assert.equal(geneHintCount(state),2);
 const snapshot=JSON.stringify(state),text=geneHintText(state,round);
 assert.match(text,/SLC stands for solute carrier/);
 assert.match(text,/nucleosides.*lysosomal membranes/);
 assert.ok(!text.includes('The symbol starts with'));
 assert.equal(geneHintStatus(state).nextLabel,'Reveal symbol hint');
 assert.equal(JSON.stringify(state),snapshot,'reopening hints must not unlock another step');
 revealGeneHint(state,round);
 assert.match(geneHintText(state,round),/starts with SLC/);
 assert.equal(state.hints,3);
});

test('hint controls stop offering another step after completion, including a partially revealed hint set',()=>{
 const round=allRounds[0],state=newState();
 assert.equal(geneHintStatus(state).nextLabel,'Get a gene hint');
 revealGeneHint(state,round);
 assert.equal(geneHintStatus(state).nextLabel,'Connect the biology');
 const text=geneHintText(state,round);
 guess(state,round.gene,round.gene);
 assert.equal(geneHintStatus(state).hasNext,false);
 assert.equal(revealGeneHint(state,round),text);
 assert.equal(state.geneHintsSeen,1);assert.equal(state.hints,1);
});

test('legacy counts are interpreted in their own version and malformed saved counts cannot unlock hints',()=>{
 assert.equal(geneHintCount({geneHintsSeen:2}),3);
 assert.equal(geneHintCount({geneHintVersion:GENE_HINT_VERSION,geneHintsSeen:2}),2);
 assert.equal(geneHintCount({geneHintsSeen:3}),0);
 for(const value of [-1,4,2.5,'3',null,undefined]){
  assert.equal(geneHintCount({geneHintVersion:GENE_HINT_VERSION,geneHintsSeen:value}),0);
 }
});

test('all ten answer explanations connect a named gene to the observed biological clues',()=>{
 for(const round of allRounds){
  const connection=geneClueConnection(round);
  assert.ok(connection.includes(round.gene),round.gene);
  assert.ok(connection.length>70&&connection.length<240,`${round.gene}: concise biological explanation`);
 }
 assert.match(geneClueConnection(allRounds.find(round=>round.gene==='SLC29A3')),/ENT3.*nucleoside.*lysosomal/);
});

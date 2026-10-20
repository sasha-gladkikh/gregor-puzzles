import test from 'node:test';
import assert from 'node:assert/strict';
import {allRounds} from '../game/rounds.mjs';
import {geneHintConnections} from '../game/gene-hints.mjs';
import {terminology,teachingConnections} from '../game/teaching-data.mjs';

test('completion image links identify existing structures in every round without overlapping prose',()=>{
 assert.deepEqual(Object.keys(teachingConnections).sort(),allRounds.map(r=>r.number).sort());
 for(const round of allRounds){
  const text=round.clinical.completionConnection,links=teachingConnections[round.number];
  assert.ok(links.length>=2&&links.length<=3);
  const ranges=links.map(({label,landmark})=>{
   assert.ok(Number.isInteger(landmark)&&round.illustration.landmarks[landmark],`${round.gene}: target structure exists`);
   const start=text.indexOf(label);assert.notEqual(start,-1,`${round.gene}: ${label} is in completion prose`);
   return [start,start+label.length];
  }).sort((a,b)=>a[0]-b[0]);
  for(let i=1;i<ranges.length;i++)assert.ok(ranges[i-1][1]<=ranges[i][0],`${round.gene}: no nested controls`);
 }
});

test('each discovered image note has an authored complete preview and all hints add distinct reasoning',()=>{
 for(const round of allRounds){
  for(const note of round.illustration.landmarks){
   assert.ok(note.playPreview.length<=110,`${round.gene}: preview fits the compact clue panel`);
   assert.match(note.playPreview,/[.!?]$/);
  }
  const hints=geneHintConnections[round.gene];
  assert.ok(hints.biology&&hints.hint);
  for(const hint of [hints.biology,hints.hint]){
   assert.ok(round.clues.every(clue=>hint!==clue.body),`${round.gene}: hint adds to automatic clues`);
  }
  assert.notEqual(hints.biology,hints.hint);
  assert.ok(round.clinical.pattern&&round.clinical.connection,`${round.gene}: deeper clinical content remains`);
 }
});

test('terminology definitions have stable identities and unambiguous literal matches',()=>{
 const ids=new Set(),spellings=new Set();
 for(const entry of terminology){
  assert.match(entry.id,/^[a-z][a-z0-9-]*$/);
  assert.ok(!ids.has(entry.id));ids.add(entry.id);
  assert.ok(entry.definition.length>25&&entry.definition.length<200);
  for(const term of [entry.term,...entry.aliases]){
   const normalized=term.toLowerCase();assert.ok(term.trim()===term&&term.length>2);
   assert.ok(!spellings.has(normalized),`${term}: one definition per literal term`);spellings.add(normalized);
  }
 }
 for(const term of ['intron','nucleoside','cochlea','histiocyte'])assert.ok(ids.has(term));
});

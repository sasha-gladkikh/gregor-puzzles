import test from 'node:test';
import assert from 'node:assert/strict';
import {roundReferences} from '../game/clinical-ui.mjs';
import {allRounds} from '../game/rounds.mjs';
import {mechanisms,spliceComparison} from '../game/mechanism.mjs';

test('round bibliography deduplicates URLs, preserves order, and excludes the condition identifier',()=>{
 const round={number:'07',omim:'163950',sources:[['Condition','https://omim.org/entry/163950'],['First reference','https://example.org/a'],['Repeated label','https://example.org/a'],['Second reference','https://example.org/b']]};
 const original=structuredClone(round.sources);
 assert.deepEqual(roundReferences(round),[
  {url:'https://example.org/a',label:'First reference',number:1,id:'ref-07-1'},
  {url:'https://example.org/b',label:'Second reference',number:2,id:'ref-07-2'},
 ]);
 assert.deepEqual(round.sources,original);
});

test('every clinical and illustration source resolves to one uniquely numbered reference',()=>{
 const allIds=new Set();
 for(const round of allRounds){
  const references=roundReferences(round),byUrl=new Map(references.map(ref=>[ref.url,ref]));
  const requested=[round.clinical.patternSource,...round.clinical.features.map(feature=>feature.source),...round.clinical.pearls.flatMap(pearl=>pearl.sources),...(round.clinical.extraSources??[]),round.illustration.source,round.illustration.noteSource,...(mechanisms[round.number]?.sources??[])].filter(Boolean);
  if(spliceComparison.rounds.includes(round.number))requested.push(spliceComparison.source);
  for(const url of requested)assert.ok(byUrl.has(url),`${round.gene}: missing bibliography entry for ${url}`);
  assert.equal(byUrl.size,references.length,`${round.gene}: duplicated external URL`);
  assert.equal(byUrl.has(`https://omim.org/entry/${round.omim}`),false);
  assert.deepEqual(references.map(ref=>ref.number),Array.from({length:references.length},(_,i)=>i+1));
  for(const ref of references){assert.ok(!allIds.has(ref.id),`Duplicate reference target ${ref.id}`);allIds.add(ref.id);}
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {roundReferences} from '../game/clinical-ui.mjs';
import {allRounds} from '../game/rounds.mjs';
import {mechanisms,spliceComparison} from '../game/mechanism.mjs';

test('all molecular clues have direct evidence in the existing shared bibliography',()=>{
 for(const round of allRounds){
  const refs=roundReferences(round);
  for(const key of['mechanism','variantType']){
   const fact=round.molecular[key];
   assert.ok(fact.title&&fact.body&&fact.preview,`${round.gene}: ${key} explanation`);
   assert.ok(fact.sourceUrl.length>0,`${round.gene}: ${key} evidence`);
   for(const url of fact.sourceUrl)assert.equal(refs.filter(ref=>ref.url===url).length,1,`${round.gene}: ${url}`);
  }
  assert.ok(!Object.values(round.molecular).some(fact=>/dominant.negative/i.test(fact.title??'')),'Do not confuse dominant inheritance with a dominant-negative mechanism');
 }
});

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
  const requested=[round.clinical.patternSource,...round.clues.flatMap(clue=>clue.sourceUrl??[]),...round.clinical.connectionSources,...[round.clinical.significance,round.clinical.family,round.clinical.interpretation].flatMap(claim=>claim.sources),...round.clinical.features.map(feature=>feature.source),...round.clinical.pearls.flatMap(pearl=>pearl.sources),...(round.clinical.extraSources??[]),round.illustration.source,round.illustration.noteSource,...(mechanisms[round.number]?.sources??[])].filter(Boolean);
  if(spliceComparison.rounds.includes(round.number))requested.push(spliceComparison.source);
  for(const url of requested)assert.ok(byUrl.has(url),`${round.gene}: missing bibliography entry for ${url}`);
  assert.equal(byUrl.size,references.length,`${round.gene}: duplicated external URL`);
  assert.equal(byUrl.has(`https://omim.org/entry/${round.omim}`),false);
  assert.deepEqual(references.map(ref=>ref.number),Array.from({length:references.length},(_,i)=>i+1));
  for(const ref of references){assert.ok(!allIds.has(ref.id),`Duplicate reference target ${ref.id}`);allIds.add(ref.id);}
 }
});

test('clinical takeaways have direct evidence and mechanism citations retain variant-specific support',()=>{
 for(const round of allRounds){
  const c=round.clinical;
  assert.ok(c.connectionSources.length>0,`${round.gene}: mechanism evidence`);
  for(const field of ['significance','family','interpretation']){assert.ok(c[field].text,`${round.gene}: ${field}`);assert.ok(c[field].sources.length>0,`${round.gene}: ${field} evidence`);}
  for(const f of c.features)assert.ok(['characteristic','variable','course'].includes(f.group),`${round.gene}: ${f.title} group`);
 }
 const ca=allRounds.find(r=>r.gene==='CACNA1A');
 assert.ok(ca.clinical.connectionSources.includes('https://pubmed.ncbi.nlm.nih.gov/31468518/'));
 assert.equal(ca.sources.filter(([,url])=>/31468518|10\.1111\/epi\.16316/.test(url)).length,1,'One canonical Jiang study entry');
});

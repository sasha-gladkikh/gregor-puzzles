import test from 'node:test';
import assert from 'node:assert/strict';
import {allRounds} from '../game/rounds.mjs';
import {relatedRoundLinks,relatedCompletedRounds,completedGuideRounds,splicingPairComplete,guideClinicalSections,guideReferences,processGroups} from '../game/collection-data.mjs';

const progress=(...done)=>allRounds.map(round=>({round,done:done.includes(round.number),pieces:done.includes(round.number)?12:0}));
test('a related round reveals its identity only after completion',()=>{
 const hidden=relatedRoundLinks('05',progress('05'));
 assert.equal(hidden.length,1);assert.equal(hidden[0].number,'08');assert.equal(hidden[0].title,'Minor RNA splicing');
 assert.equal('gene' in hidden[0],false);assert.equal('condition' in hidden[0],false);
 assert.equal(JSON.stringify(hidden).includes('RNU4ATAC'),false);assert.equal(JSON.stringify(hidden).includes('Roifman'),false);
 assert.deepEqual(relatedCompletedRounds('05',progress('05')),[]);
 const complete=relatedCompletedRounds('05',progress('05','08'));
 assert.equal(complete[0].gene,'RNU4ATAC');assert.equal(complete[0].condition,'Roifman syndrome');assert.equal(complete[0].href,'./play.html?level=08');
});
test('field guide and spliceosome connection reflect completion and reset without changing progress',()=>{
 const items=progress('01','05');const original=JSON.stringify(items);
 assert.deepEqual(completedGuideRounds(items).map(r=>r.number),['01','05']);assert.equal(splicingPairComplete(items),false);
 assert.equal(JSON.stringify(items),original);
 assert.equal(splicingPairComplete(progress('05','08')),true);
 assert.equal(splicingPairComplete(progress('08')),false);
 assert.deepEqual(completedGuideRounds(progress()),[]);
});
test('related links never expose unpublished rounds and process groups cover the catalogue once',()=>{
 assert.deepEqual(relatedRoundLinks('05',progress('05').filter(item=>item.round.number==='05')),[]);
 const numbers=processGroups.flatMap(group=>group.numbers);assert.equal(new Set(numbers).size,numbers.length);
 assert.deepEqual([...numbers].sort(),allRounds.map(round=>round.number));
 for(const item of progress())for(const link of relatedRoundLinks(item.round.number,progress()))assert.match(link.href,/^\.\/play\.html\?level=\d{2}$/);
});
test('field guide preserves clinical course, significance, and family context for every completed round',()=>{
 for(const round of allRounds){
  const sections=guideClinicalSections(round);
  assert.deepEqual(sections.map(section=>section.label),['Mechanism','Clinical pattern','Onset and course','Clinical significance','Family implications']);
  assert.ok(sections.every(section=>typeof section.text==='string'&&section.text.trim()),`${round.gene}: no empty clinical takeaway`);
 }
 const sbds=guideClinicalSections(allRounds.find(round=>round.gene==='SBDS'));
 const significance=sbds.find(section=>section.label==='Clinical significance').text;
 assert.match(significance,/marrow failure/i);
 assert.match(significance,/myelodysplastic|myeloid leukemia/i);
 const fgf14=guideClinicalSections(allRounds.find(round=>round.gene==='FGF14'));
 assert.match(fgf14.find(section=>section.label==='Family implications').text,/predict|onset|penetrance/i);
});
test('field-guide references cover explicit mechanism, clinical, family, and illustration claims without duplicate links',()=>{
 for(const round of allRounds){
  const refs=guideReferences(round),urls=refs.map(ref=>ref.url);
  assert.equal(new Set(urls).size,urls.length);
  assert.equal(urls.includes(`https://omim.org/entry/${round.omim}`),false,'OMIM is linked once in the guide header');
  for(const url of [round.illustration.source,round.illustration.noteSource,round.clinical.patternSource,...round.clinical.connectionSources,...round.molecular.mechanism.sourceUrl,...round.molecular.variantType.sourceUrl,...round.clinical.significance.sources,...round.clinical.family.sources].filter(Boolean))assert.ok(urls.includes(url),`${round.gene}: ${url}`);
  assert.ok(refs.every(ref=>ref.label&&ref.label!=='Supporting reference'&&ref.url.startsWith('https://')),`${round.gene}: references need descriptive registry labels`);
 }
 const cacna=allRounds.find(round=>round.gene==='CACNA1A');
 assert.ok(guideReferences(cacna).some(ref=>ref.url==='https://pubmed.ncbi.nlm.nih.gov/31468518/'),'Jiang supports both gain- and loss-of-function claims in the CACNA1A takeaway');
});

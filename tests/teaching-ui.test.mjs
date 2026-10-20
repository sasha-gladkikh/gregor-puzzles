import test from 'node:test';
import assert from 'node:assert/strict';
import {termSegments,connectionSegments} from '../game/teaching-ui.mjs';
import {allRounds} from '../game/rounds.mjs';
import {teachingConnections} from '../game/teaching-data.mjs';

test('definitions preserve the exact sentence and only match whole terms',()=>{
  const entries=[{id:'rna',term:'RNA',aliases:['ribonucleic acid'],definition:'A molecular message.'},{id:'messenger',term:'messenger RNA',aliases:[],definition:'A protein-making message.'}];
  const text='Messenger RNA carries information. Ribonucleic acid is RNA; RNAs stays unchanged.';
  const parts=termSegments(text,entries);
  assert.equal(parts.map(part=>part.text).join(''),text);
  assert.deepEqual(parts.filter(part=>part.entry).map(part=>[part.text,part.entry.id]),[['Messenger RNA','messenger'],['Ribonucleic acid','rna'],['RNA','rna']]);
});

test('interactive biological phrases retain wording and map to the authored structures for all rounds',()=>{
  for(const round of allRounds){
    const text=round.clinical.completionConnection,connections=teachingConnections[round.number];
    const parts=connectionSegments(text,connections);
    assert.equal(parts.map(part=>part.text).join(''),text);
    assert.deepEqual(parts.filter(part=>part.landmark!==undefined).map(part=>({label:part.text,landmark:part.landmark})),connections.toSorted((a,b)=>text.indexOf(a.label)-text.indexOf(b.label)));
    assert.equal(termSegments(text).map(part=>part.text).join(''),text);
  }
});

test('unknown phrases stay readable when no highlight applies',()=>{
  assert.deepEqual(connectionSegments('A clear explanation.',[]),[{text:'A clear explanation.'}]);
  assert.deepEqual(connectionSegments('A clear explanation.',[{label:'channel',landmark:0}]),[{text:'A clear explanation.'}]);
});

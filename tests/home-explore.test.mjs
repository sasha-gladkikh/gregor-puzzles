import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyHomeRound,discoveryJourneys,discoveryProgress} from '../game/home-explore.mjs';

const catalogue=Array.from({length:10},(_,index)=>({id:`round-${index+1}`,number:String(index+1).padStart(2,'0'),topic:`Process ${index+1}`}));

test('daily picks remain stable during the local day and advance without gaps across daylight saving',()=>{
 for(const day of [7,8,9]){
  const start=new Date(2026,10,day,0,1),end=new Date(2026,10,day,23,59);
  assert.equal(dailyHomeRound(catalogue,start),dailyHomeRound(catalogue,end));
 }
 const a=dailyHomeRound(catalogue,new Date(2026,10,7)),b=dailyHomeRound(catalogue,new Date(2026,10,8));
 assert.equal((catalogue.indexOf(a)+1)%catalogue.length,catalogue.indexOf(b));
});

test('daily selection uses only currently published rounds and handles invalid or empty data',()=>{
 const subset=[catalogue[4],catalogue[8]];
 for(let day=1;day<=31;day++)assert.ok(subset.includes(dailyHomeRound(subset,new Date(2026,9,day))));
 assert.equal(dailyHomeRound([],new Date()),null);
 assert.equal(dailyHomeRound(catalogue,new Date('invalid')),null);
 assert.equal(dailyHomeRound(catalogue,null),null);
 assert.equal(dailyHomeRound([{number:'01&other=1',topic:'Bad'}]),null);
});

test('discovery progress cannot add unpublished rounds or create false completions from piece counts',()=>{
 const items=discoveryProgress(catalogue.slice(0,3),[
  {round:catalogue[0],done:true,pieces:1},
  {round:catalogue[1],done:false,pieces:99},
  {round:catalogue[2],done:false,pieces:-2},
  {round:catalogue[8],done:true,pieces:12},
 ]);
 assert.deepEqual(items.map(({done,pieces,state})=>({done,pieces,state})),[
  {done:true,pieces:12,state:'complete'},
  {done:false,pieces:11,state:'started'},
  {done:false,pieces:0,state:'new'},
 ]);
 assert.equal(items.length,3);
});

test('journeys preserve scientific ordering and select an in-progress round before a new one',()=>{
 const journey=discoveryJourneys(catalogue,[{round:catalogue[7],done:false,pieces:4}]).find(item=>item.id==='rna');
 assert.deepEqual(journey.rounds.map(item=>item.round.number),['05','08','04']);
 assert.equal(journey.next.round.number,'08');
 assert.equal(journey.completed,0);
});

test('journeys skip finished rounds and let completed journeys be replayed',()=>{
 const progress=['02','06','07'].map(number=>({round:catalogue.find(round=>round.number===number),done:true,pieces:12}));
 const complete=discoveryJourneys(catalogue,progress).find(item=>item.id==='communication');
 assert.equal(complete.completed,3);assert.equal(complete.next.round.number,'02');
 const partial=discoveryJourneys(catalogue,progress.slice(0,1)).find(item=>item.id==='communication');
 assert.equal(partial.next.round.number,'06');
});

test('approval subsets never gain unapproved journeys or round links',()=>{
 assert.deepEqual(discoveryJourneys([catalogue[4]]),[]);
 const subset=[catalogue[4],catalogue[7]],paths=discoveryJourneys(subset);
 assert.equal(paths.length,1);
 assert.deepEqual(paths[0].rounds.map(item=>item.round.number),['05','08']);
 assert.ok(paths.every(path=>path.rounds.every(item=>subset.includes(item.round))));
});

test('duplicated, unknown, or malformed progress does not expand the discovery catalogue',()=>{
 const rounds=[catalogue[0],catalogue[0],{number:'<script>',topic:'No'}];
 const result=discoveryProgress(rounds,[null,{round:{number:'99'},done:true,pieces:12}]);
 assert.equal(result.length,1);assert.equal(result[0].state,'new');
 assert.deepEqual(discoveryProgress(null),[]);
});

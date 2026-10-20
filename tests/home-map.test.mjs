import test from 'node:test';
import assert from 'node:assert/strict';
import {groupHomeRounds,homeMapProgress} from '../game/home-map.mjs';

const catalogue=Array.from({length:10},(_,index)=>({id:`round-${index+1}`,number:String(index+1).padStart(2,'0'),topic:`Process ${index+1}`,saveKey:`round-${index+1}`}));

test('the conceptual map groups all ten rounds once without exposing gene answers',()=>{
 const regions=groupHomeRounds(catalogue);
 assert.equal(regions.length,6);
 assert.deepEqual(Object.fromEntries(regions.map(region=>[region.id,region.rounds.map(round=>round.number)])),{
  membrane:['01','02'],nucleus:['05','08','10'],lysosome:['03'],ribosome:['04'],signaling:['07','09'],synapse:['06'],
 });
 assert.deepEqual(regions.flatMap(region=>region.rounds.map(round=>round.number)).sort(),catalogue.map(round=>round.number));
});

test('the map only offers approved catalogue rounds and hides empty regions',()=>{
 const subset=[catalogue[4],catalogue[0],catalogue[7]];
 const regions=groupHomeRounds(subset);
 assert.deepEqual(regions.map(region=>region.id),['membrane','nucleus']);
 assert.deepEqual(regions.map(region=>region.rounds.length),[1,2]);
 assert.ok(regions.flatMap(region=>region.rounds).every(round=>subset.includes(round)));
 assert.deepEqual(groupHomeRounds([]),[]);
});

test('duplicate or malformed catalogue numbers cannot create extra or unsafe round links',()=>{
 const regions=groupHomeRounds([catalogue[0],catalogue[0],{number:'01&mode=other',topic:'Invalid'},{number:'02',topic:null}]);
 assert.deepEqual(regions.map(region=>region.rounds.map(round=>round.number)),[['01']]);
});

test('map progress counts completed rounds in the published region and ignores partial or unpublished progress',()=>{
 const progress=[{round:catalogue[0],done:true,pieces:12},{round:catalogue[1],done:false,pieces:8},{round:catalogue[4],done:true,pieces:12}];
 const regions=homeMapProgress(catalogue.slice(0,2),progress);
 assert.equal(regions.length,1);
 assert.equal(regions[0].completed,1);
 assert.equal(regions[0].rounds.length,2);
});

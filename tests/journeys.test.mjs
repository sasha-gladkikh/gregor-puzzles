import test from 'node:test';
import assert from 'node:assert/strict';
import {availableJourneys,getJourney,journeyRoundHref,nextJourneyStep} from '../game/journeys.mjs';

const catalogue=Array.from({length:10},(_,index)=>({number:String(index+1).padStart(2,'0'),topic:`Process ${index+1}`}));
const done=(...numbers)=>numbers.map(number=>({round:catalogue.find(round=>round.number===number),done:true,pieces:12}));

test('journeys preserve their ordered scientific path rather than the numeric collection order',()=>{
 assert.deepEqual(getJourney(catalogue,'rna').rounds.map(round=>round.number),['05','08','04']);
 const second=nextJourneyStep(catalogue,done('05'),'rna','05');
 assert.equal(second.round.number,'08');
 assert.equal(second.href,'./play.html?level=08&journey=rna');
 const third=nextJourneyStep(catalogue,done('05','08'),'rna','08');
 assert.equal(third.round.number,'04');assert.equal(third.complete,false);
});

test('all complete journeys end at discovery instead of continuing numerically',()=>{
 const next=nextJourneyStep(catalogue,done('05','08','04'),'rna','04');
 assert.equal(next.complete,true);assert.equal(next.round,null);
 assert.equal(next.href,'./#discover');assert.equal(next.label,'Explore more puzzles');
});

test('a completed current step is skipped even before its saved progress refreshes',()=>{
 const next=nextJourneyStep(catalogue,[],'communication','02');
 assert.equal(next.round.number,'06');
});

test('entering a path in the middle eventually visits unfinished earlier steps',()=>{
 const next=nextJourneyStep(catalogue,done('08','04'),'rna','04');
 assert.equal(next.round.number,'05');
 const complete=nextJourneyStep(catalogue,done('08','04'),'rna','05');
 assert.equal(complete.complete,true);
});

test('existing completions are skipped, but partial progress remains a valid next step',()=>{
 const next=nextJourneyStep(catalogue,[...done('02','06'),{round:catalogue[6],done:false,pieces:9}],'communication','02');
 assert.equal(next.round.number,'07');
});

test('published subsets cannot gain unavailable rounds through journey navigation',()=>{
 const subset=[catalogue[4],catalogue[3]];
 assert.deepEqual(getJourney(subset,'rna').rounds.map(round=>round.number),['05','04']);
 assert.equal(nextJourneyStep(subset,[],'rna','05').round.number,'04');
 assert.equal(nextJourneyStep([catalogue[4]],[],'rna','05').complete,true);
 assert.deepEqual(availableJourneys([]),[]);
 assert.equal(getJourney(subset,'communication'),null);
});

test('unrecognized routes or nonmember current rounds fall back to the normal app route',()=>{
 assert.equal(nextJourneyStep(catalogue,[],'bad','05'),null);
 assert.equal(nextJourneyStep(catalogue,[],'rna','06'),null);
 assert.equal(nextJourneyStep(catalogue,[],'rna','05&x=1'),null);
 assert.equal(getJourney(catalogue,null),null);
});

test('journey URLs accept only declared identifiers and round membership',()=>{
 assert.equal(journeyRoundHref(catalogue[4],'rna'),'./play.html?level=05&journey=rna');
 assert.equal(journeyRoundHref(catalogue[4],'rna&unsafe=1'),'./play.html?level=05');
 assert.equal(journeyRoundHref(catalogue[0],'rna'),'./play.html?level=01');
 assert.equal(journeyRoundHref({number:'01&unsafe=1'},'transport'),'./#discover');
});

test('duplicate catalogue records and invalid progress cannot duplicate or finish route steps',()=>{
 const route=getJourney([catalogue[0],catalogue[0],catalogue[1],{number:'03&bad=1'}],'transport');
 assert.deepEqual(route.rounds.map(round=>round.number),['01','02']);
 assert.equal(nextJourneyStep(catalogue,[null,{done:true},{round:catalogue[1],done:'yes'}],'transport','01').round.number,'02');
});

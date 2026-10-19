import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeAttempts,publicPlayers,rankPlayers,playerTime} from '../game/player-ui.mjs';

const catalogue=Array.from({length:10},(_,index)=>({number:String(index+1).padStart(2,'0')}));
const attempt=(roundNumber,overrides={})=>({roundNumber,status:'completed',mode:'timed',route:'image',eligible:true,seconds:60,...overrides});
const player=(id,overrides={})=>({id,displayName:id,attempts:1,roundsPlayed:1,roundsCompleted:1,timedRounds:1,totalBestSeconds:null,best:[{roundNumber:'01',seconds:60,hints:0,peeks:0,geneHintsSeen:0}],...overrides});

test('repeat attempts add history without inflating distinct rounds and fastest eligible time wins',()=>{
 const records=[attempt('01',{seconds:100}),attempt('01',{seconds:30}),attempt('02',{mode:'practice',eligible:false,seconds:null}),attempt('03',{route:'gene',eligible:false}),attempt('04',{status:'restarted',eligible:false,pieces:3}),attempt('04',{status:'active',eligible:false,pieces:2})];
 const summary=summarizeAttempts(records,catalogue);
 assert.deepEqual(summary,{attempts:6,roundsPlayed:4,roundsCompleted:3,timedRounds:1,totalBestSeconds:null});
 const complete=catalogue.map(round=>attempt(round.number));complete.push(attempt('01',{seconds:15}),attempt('02',{seconds:1,eligible:false}));
 assert.equal(summarizeAttempts(complete,catalogue).totalBestSeconds,555);
});

test('overall partial progress ties irrespective of unequal round difficulty or repeated attempts',()=>{
 const players=[player('Ada',{roundsCompleted:4,attempts:19,totalBestSeconds:9}),player('Bea',{roundsCompleted:4,attempts:4,totalBestSeconds:900}),player('Cy',{roundsCompleted:3})];
 assert.deepEqual(rankPlayers(players).map(({id,rank})=>[id,rank]),[['Ada',1],['Bea',1],['Cy',3]]);
 assert.equal(players[0].rank,undefined);
});

test('only a complete set of qualifying timed rounds breaks complete-progress ties',()=>{
 const players=[player('Dora',{roundsCompleted:10,timedRounds:9,totalBestSeconds:1}),player('Ellis',{roundsCompleted:10,timedRounds:10,totalBestSeconds:700}),player('Finn',{roundsCompleted:10,timedRounds:10,totalBestSeconds:700}),player('Gail',{roundsCompleted:10,timedRounds:10,totalBestSeconds:500}),player('Hana',{roundsCompleted:10,timedRounds:0,totalBestSeconds:null})];
 assert.deepEqual(rankPlayers(players).map(({id,rank})=>[id,rank]),[['Gail',1],['Ellis',2],['Finn',2],['Dora',4],['Hana',4]]);
});

test('per-round competition uses millisecond ties and excludes players without that round',()=>{
 const players=[player('Jin',{best:[{roundNumber:'02',seconds:30.1232}]}),player('Ira',{best:[{roundNumber:'02',seconds:30.1231}]}),player('Kai',{best:[{roundNumber:'02',seconds:30.124}]}),player('Lee')];
 assert.deepEqual(rankPlayers(players,'02').map(({id,rank})=>[id,rank]),[['Ira',1],['Jin',1],['Kai',3]]);
 assert.equal(playerTime(59.9999),'1:00.000');
 assert.equal(playerTime(null),'—');
});

test('public data rejects wrong service responses and unsafe names while computing totals from unique best rounds',()=>{
 assert.throws(()=>publicPlayers({ok:true,service:'gregor-suggestions'},catalogue),/unavailable/);
 const payload={ok:true,schema:'gregor-player-board-v1',players:[player('good',{best:[{roundNumber:'01',seconds:60},{roundNumber:'01',seconds:30},{roundNumber:'11',seconds:1}]}),player('bad',{displayName:'<script>alert(1)</script>'}),player('email',{displayName:'person@example.com'})]};
 const clean=publicPlayers(payload,catalogue);
 assert.equal(clean.length,1);assert.equal(clean[0].timedRounds,1);assert.equal(clean[0].best[0].seconds,30);assert.equal(clean[0].totalBestSeconds,null);
});

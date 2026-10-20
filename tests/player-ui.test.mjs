import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeAttempts,publicPlayers,rankPlayers,allocatedRoundTimes,leaderboardAttemptCount,playerTime,playerDateTime} from '../game/player-ui.mjs';

const catalogue=Array.from({length:10},(_,index)=>({number:String(index+1).padStart(2,'0')}));
const attempt=(roundNumber,overrides={})=>({roundNumber,status:'completed',mode:'timed',route:'image',eligible:true,seconds:60,...overrides});
const player=(id,overrides={})=>({id,displayName:id,attempts:1,roundsPlayed:1,roundsCompleted:1,timedRounds:1,totalBestSeconds:null,best:[{roundNumber:'01',seconds:60,hints:0,peeks:0,geneHintsSeen:0}],...overrides});
const report=(overrides={})=>({totalSeconds:563,roundsCompleted:10,estimatedTimes:[44,49,61,57,68,50,55,66,60,53].map((seconds,index)=>({roundNumber:catalogue[index].number,seconds})),submittedAt:'2026-10-19T23:59:00.000Z',...overrides});
const publicList=players=>publicPlayers({ok:true,schema:'gregor-player-board-v1',players},catalogue);

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

test('players without included attempts have no overall or per-round rank',()=>{
 const unplayed=player('Unplayed',{attempts:0,roundsPlayed:0,roundsCompleted:0,timedRounds:0,best:[]});
 const excluded=player('Excluded',{attempts:0});
 const active=player('Active');
 assert.deepEqual(rankPlayers([unplayed,excluded,active]).map(({id,rank})=>[id,rank]),[['Active',1]]);
 assert.deepEqual(rankPlayers([unplayed,excluded,active],'01').map(({id,rank})=>[id,rank]),[['Active',1]]);
 assert.deepEqual(rankPlayers([unplayed,excluded]),[]);
});

test('public timestamps retain the correct latest activity and winning attempt dates',()=>{
 const payload={ok:true,schema:'gregor-player-board-v1',players:[player('Dates',{
  latestAt:'2026-10-19T23:40:15.123Z',
  best:[{roundNumber:'01',seconds:60,completedAt:'2026-10-19T21:10:00Z'},{roundNumber:'01',seconds:30,completedAt:'2026-10-19T22:30:00.456Z'}]
 })]};
 const [clean]=publicPlayers(payload,catalogue);
 assert.equal(clean.latestAt,'2026-10-19T23:40:15.123Z');
 assert.equal(clean.best[0].completedAt,'2026-10-19T22:30:00.456Z');
 assert.equal(clean.best[0].seconds,30);
});

test('invalid, ambiguous, or missing timestamps are omitted without hiding scores',()=>{
 const invalid=[undefined,null,0,'October 19, 2026','2026-10-19T12:00:00','2026-10-19T12:00:00-07:00','2026-02-30T12:00:00Z','2026-10-19T25:00:00Z','<script>'];
 for(const value of invalid){
  const [clean]=publicPlayers({ok:true,schema:'gregor-player-board-v1',players:[player('Dates',{latestAt:value,best:[{roundNumber:'01',seconds:60,completedAt:value}]})]},catalogue);
  assert.equal(clean.latestAt,null);assert.equal(clean.best[0].completedAt,null);assert.equal(clean.best[0].seconds,60);
  assert.equal(playerDateTime(value),null);
 }
});

test('date formatting converts UTC to the viewer time zone including date boundaries',()=>{
 const instant='2026-10-20T01:05:00.000Z';
 assert.equal(playerDateTime(instant,{locale:'en-US',timeZone:'America/Los_Angeles'}),'Oct 19, 2026, 6:05 PM');
 assert.equal(playerDateTime(instant,{locale:'en-US',timeZone:'Asia/Tokyo'}),'Oct 20, 2026, 10:05 AM');
 assert.equal(playerDateTime(instant),new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(instant)));
});

test('a reported complete total ranks alongside faster and slower measured totals without fabricated attempts',()=>{
 const players=publicList([
  player('Sasha',{attempts:0,roundsPlayed:0,roundsCompleted:0,best:[],reportedResult:report()}),
  player('Faster',{attempts:10,roundsPlayed:10,roundsCompleted:10,best:catalogue.map(round=>({roundNumber:round.number,seconds:50}))}),
  player('Slower',{attempts:10,roundsPlayed:10,roundsCompleted:10,best:catalogue.map(round=>({roundNumber:round.number,seconds:60}))})
 ]);
 assert.deepEqual(rankPlayers(players).map(({id,rank})=>[id,rank]),[['Faster',1],['Sasha',2],['Slower',3]]);
 const sasha=players.find(entry=>entry.id==='Sasha');
 assert.equal(sasha.totalBestSeconds,563);assert.equal(sasha.totalSource,'reported');assert.equal(sasha.roundsCompleted,10);
 assert.equal(sasha.attempts,0);assert.equal(sasha.timedRounds,0);assert.deepEqual(sasha.best,[]);assert.equal(sasha.latestAt,null);
 assert.equal(sasha.reportedResult.submittedAt,'2026-10-19T23:59:00.000Z');
 assert.equal(leaderboardAttemptCount(sasha),10);
});

test('displayed attempts combine the reported run with tracked replays without creating history',()=>{
 const players=publicList([
  player('Reported',{attempts:2,reportedResult:report()}),
  player('Tracked',{attempts:12}),
  player('Invalid',{attempts:3,reportedResult:report({roundsCompleted:9})})
 ]);
 assert.deepEqual(players.map(leaderboardAttemptCount),[12,12,3]);
 assert.deepEqual(players.map(entry=>entry.attempts),[2,12,3]);
});

test('allocated splits preserve each duration and yield to measured round results',()=>{
 const players=publicList([
  player('Sasha',{attempts:1,roundsPlayed:10,roundsCompleted:10,best:[{roundNumber:'01',seconds:42}],reportedResult:report()}),
  player('Recorded',{best:[{roundNumber:'02',seconds:90}]})
 ]);
 assert.deepEqual(rankPlayers(players,'02').map(({id,rank})=>[id,rank]),[['Recorded',1]]);
 for(const entry of report().estimatedTimes.slice(1))assert.deepEqual(allocatedRoundTimes(players,entry.roundNumber),[{id:'Sasha',displayName:'Sasha',seconds:entry.seconds}]);
 assert.deepEqual(allocatedRoundTimes(players,'01'),[]);
 assert.deepEqual(allocatedRoundTimes(players,'overall'),[]);
 assert.deepEqual(allocatedRoundTimes(players,'11'),[]);
 const unmeasured=publicList([player('Sasha',{attempts:0,best:[],reportedResult:report()})]);
 assert.equal(catalogue.reduce((sum,round)=>sum+allocatedRoundTimes(unmeasured,round.number)[0].seconds,0),563);
 assert.equal(players[0].totalBestSeconds,563);
 assert.equal(players[0].best.length,1);assert.equal(players[0].timedRounds,1);
});

test('overall total uses one complete result and never combines estimates with recorded best rounds',()=>{
 for(const [perRound,expected,source] of [[50,500,'recorded'],[60,563,'reported']]){
  const [clean]=publicList([player('Complete',{attempts:10,roundsPlayed:10,roundsCompleted:10,best:catalogue.map(round=>({roundNumber:round.number,seconds:perRound})),reportedResult:report()})]);
  assert.equal(clean.totalBestSeconds,expected);assert.equal(clean.totalSource,source);
  assert.equal(clean.best.reduce((sum,entry)=>sum+entry.seconds,0),perRound*10);
  assert.equal(clean.reportedResult.estimatedTimes.reduce((sum,entry)=>sum+entry.seconds,0),563);
 }
 const [partial]=publicList([player('Partial',{reportedResult:report(),best:[{roundNumber:'01',seconds:1}]})]);
 assert.equal(partial.totalBestSeconds,563);
});

test('invalid reports are discarded while measured results remain usable',()=>{
 const valid=report();
 const badReports=[
  report({totalSeconds:9}),report({totalSeconds:604801}),report({totalSeconds:Infinity}),report({totalSeconds:564}),
  report({roundsCompleted:9}),report({submittedAt:'2026-02-30T00:00:00Z'}),report({submittedAt:null}),
  report({estimatedTimes:valid.estimatedTimes.slice(1)}),
  report({estimatedTimes:[...valid.estimatedTimes.slice(1),valid.estimatedTimes[1]]}),
  report({estimatedTimes:valid.estimatedTimes.map((entry,index)=>index===0?{roundNumber:'11',seconds:44}:entry)}),
  report({estimatedTimes:valid.estimatedTimes.map((entry,index)=>index===0?{...entry,seconds:0}:entry)}),
  report({estimatedTimes:valid.estimatedTimes.map((entry,index)=>index===0?{...entry,seconds:NaN}:entry)})
 ];
 for(const reportedResult of badReports){
  const [clean]=publicList([player('Measured',{attempts:10,roundsPlayed:10,roundsCompleted:10,best:catalogue.map(round=>({roundNumber:round.number,seconds:60})),reportedResult})]);
  assert.equal(clean.reportedResult,null);assert.equal(clean.totalBestSeconds,600);assert.equal(clean.totalSource,'recorded');
  const [empty]=publicList([player('Empty',{attempts:0,roundsPlayed:0,roundsCompleted:0,best:[],reportedResult})]);
  assert.deepEqual(rankPlayers([empty]),[]);
 }
});

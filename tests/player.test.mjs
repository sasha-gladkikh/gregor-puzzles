import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayerStore,PLAYER_SCHEMA,validatePlayerName} from '../game/player.mjs';

class MemoryStorage{
 data=new Map();get length(){return this.data.size;}key(i){return [...this.data.keys()][i]??null;}getItem(key){return this.data.get(key)??null;}setItem(key,value){this.data.set(key,String(value));}removeItem(key){this.data.delete(key);}
}
let sequence=0;
const uuid=()=>`00000000-0000-4000-8000-${String(++sequence).padStart(12,'0')}`;
const state=(pieces=1,extras={})=>({placed:Array.from({length:pieces},(_,i)=>i),startedAt:10000,finishedAt:null,hints:0,peeks:0,geneHintsSeen:0,solvedByGuess:false,...extras});
const response=body=>({ok:true,json:async()=>body});
function setup(options={}){
 const storage=options.storage??new MemoryStorage(),calls=[];
 const fetchImpl=options.fetchImpl??(async(url,init)=>{const body=JSON.parse(init.body);calls.push(body);return response({ok:true,schema:PLAYER_SCHEMA,playerId:body.playerId,revision:body.revision,...(body.action==='attempts'?{accepted:body.attempts.map(({id,revision})=>({id,revision}))}:{})});});
 const player=createPlayerStore({storage,uuid,now:()=>20000,fetchImpl,...options});
 return {player,storage,calls,fetchImpl};
}
const start=(p,number='01',timed=true)=>p.startAttempt({roundNumber:number,state:state(),timed,before:0});

test('history starts on an accepted fresh action and does not infer old progress',()=>{
 const {player}=setup();
 assert.deepEqual(player.getAttempts(),[]);
 assert.equal(player.startAttempt({roundNumber:'01',state:state(5),timed:true,before:4}),null);
 assert.equal(player.startAttempt({roundNumber:'01',state:state(0),timed:true,before:0}),null);
 const meta=start(player);assert.equal(player.getAttempts().length,1);assert.ok(meta.id);assert.equal(player.getAttempts()[0].pieces,1);
});

test('same browser remembers identity and attempt history across reloads',()=>{
 const {player,storage}=setup();const meta=start(player);player.updateAttempt(meta,{state:state(4,{hints:2,geneHintsSeen:2}),timed:true});
 const reloaded=setup({storage}).player;assert.deepEqual(reloaded.getPlayer(),player.getPlayer());assert.equal(reloaded.getAttempt(meta).pieces,4);assert.equal(reloaded.getAttempt(meta).hints,2);assert.equal(reloaded.hasAttempt(meta),true);
});

test('private history records practice, timed and gene results without inventing practice times',()=>{
 const {player}=setup();
 const a=start(player,'01',false);player.finishAttempt(a,{state:state(12,{finishedAt:25000}),timed:false});
 const b=start(player,'02');player.finishAttempt(b,{state:state(12,{finishedAt:25000}),timed:true,eligible:true});
 const c=player.startAttempt({roundNumber:'03',state:state(12,{solvedByGuess:true}),timed:true,before:0});player.finishAttempt(c,{state:state(12,{finishedAt:10000,solvedByGuess:true}),timed:true});
 const list=player.getAttempts();assert.equal(list.find(x=>x.id===a.id).seconds,null);assert.equal(list.find(x=>x.id===b.id).seconds,15);assert.equal(list.find(x=>x.id===b.id).eligible,true);assert.equal(list.find(x=>x.id===c.id).route,'gene');assert.equal(list.find(x=>x.id===c.id).eligible,false);assert.equal(list.find(x=>x.id===c.id).pieces,0);
});

test('terminal attempts are immutable and restarting a finished round creates no duplicate result',()=>{
 const {player}=setup();const meta=start(player);player.finishAttempt(meta,{state:state(12,{finishedAt:25000}),timed:true,eligible:true});const completed=player.getAttempt(meta);
 player.finishAttempt(meta,{state:state(2),timed:true,status:'restarted'});player.updateAttempt(meta,{state:state(5),timed:true});
 assert.deepEqual(player.getAttempt(meta),completed);
 const replay=start(player);assert.notEqual(replay.id,meta.id);assert.equal(player.getAttempts().length,2);
});

test('two tabs keep independent attempts and stale progress cannot reduce a shared attempt',()=>{
 const {player:a,storage}=setup(),b=setup({storage}).player;const one=start(a,'01'),two=start(b,'02');
 a.updateAttempt(one,{state:state(8,{hints:2,geneHintsSeen:2}),timed:true});b.updateAttempt(one,{state:state(3,{hints:1,geneHintsSeen:1}),timed:true});
 assert.equal(a.getAttempt(one).pieces,8);assert.equal(a.getAttempt(one).hints,2);assert.equal(b.getAttempts().length,2);assert.equal(a.getAttempt(two).roundNumber,'02');
 a.finishAttempt(one,{state:state(12,{finishedAt:25000}),timed:true});b.finishAttempt(one,{state:state(3),timed:true,status:'restarted'});assert.equal(b.getAttempt(one).status,'completed');
});

test('joining is explicit, names are not identities, and secrets never appear in public APIs',async()=>{
 const {player,calls}=setup();start(player);await player.syncPlayer();assert.equal(calls.length,0);
 await player.joinPlayer('Alex');assert.equal(calls[0].action,'profile');assert.equal(calls[1].action,'attempts');assert.equal(player.getPlayer().joined,true);assert.equal(player.getPlayerStatus().pending,0);
 assert.equal('token' in player.getPlayer(),false);assert.equal('token' in player.getAttempts()[0],false);assert.equal('playerId' in player.getAttempts()[0],false);
 const other=setup().player;await other.joinPlayer('Alex');assert.notEqual(other.getPlayer().id,player.getPlayer().id);
});

test('profile receipt must match before attempts can be uploaded',async()=>{
 const {player}=setup({fetchImpl:async()=>response({ok:true,schema:PLAYER_SCHEMA,playerId:'wrong'})});start(player);
 await assert.rejects(player.joinPlayer('Alex'),/Receipt/);assert.equal(player.getPlayer().joined,false);assert.equal(player.getPlayer().pendingName,'Alex');assert.equal(player.getPlayerStatus().pending,1);
});

test('unconfirmed attempts stay durable and retry exact IDs and revisions',async()=>{
 let fail=true;const payloads=[];
 const fetchImpl=async(url,init)=>{const body=JSON.parse(init.body);payloads.push(body);if(body.action==='attempts'&&fail)throw new TypeError('offline');return response({ok:true,schema:PLAYER_SCHEMA,playerId:body.playerId,revision:body.revision,...(body.action==='attempts'?{accepted:body.attempts.map(({id,revision})=>({id,revision}))}:{})});};
 const {player,storage}=setup({fetchImpl});const meta=start(player);await assert.rejects(player.joinPlayer('Alex'),/connect/);assert.equal(player.getPlayer().joined,true);assert.equal(player.getPlayerStatus().pending,1);
 fail=false;const reloaded=setup({storage,fetchImpl}).player;await reloaded.syncPlayer();assert.equal(reloaded.getPlayerStatus().pending,0);
 const batches=payloads.filter(x=>x.action==='attempts');assert.deepEqual(batches[0].attempts,batches[1].attempts);assert.equal(batches[1].attempts[0].id,meta.id);
});

test('missing acknowledgement never marks an attempt synced',async()=>{
 const {player}=setup({fetchImpl:async(url,init)=>{const b=JSON.parse(init.body);return response({ok:true,schema:PLAYER_SCHEMA,playerId:b.playerId,revision:b.revision,accepted:[]});}});start(player);
 await assert.rejects(player.joinPlayer('Alex'),/waiting for confirmation/);assert.equal(player.getPlayerStatus().pending,1);
});

test('late acknowledgement cannot clear a newer local revision',async()=>{
 let resolveBatch;const {player}=setup({fetchImpl:async(url,init)=>{const b=JSON.parse(init.body);if(b.action==='attempts')return new Promise(resolve=>{resolveBatch=()=>resolve(response({ok:true,schema:PLAYER_SCHEMA,playerId:b.playerId,revision:b.revision,accepted:b.attempts.map(({id,revision})=>({id,revision}))}));});return response({ok:true,schema:PLAYER_SCHEMA,playerId:b.playerId,revision:b.revision});}});
 await player.joinPlayer('Alex');const meta=start(player);const pending=player.syncPlayer();await new Promise(resolve=>setImmediate(resolve));
 player.updateAttempt(meta,{state:state(6),timed:true});resolveBatch();await pending;assert.equal(player.getPlayerStatus().pending,1);
});

test('terminal sync requested during a start upload is queued automatically',async()=>{
 let release,held=true;const calls=[];
 const {player}=setup({fetchImpl:async(url,init)=>{const b=JSON.parse(init.body);calls.push(b);const reply=()=>response({ok:true,schema:PLAYER_SCHEMA,playerId:b.playerId,revision:b.revision,...(b.action==='attempts'?{accepted:b.attempts.map(({id,revision})=>({id,revision}))}:{})});if(b.action==='attempts'&&held){held=false;return new Promise(resolve=>{release=()=>resolve(reply());});}return reply();}});
 await player.joinPlayer('Alex');const meta=start(player);const pending=player.syncPlayer();await new Promise(resolve=>setImmediate(resolve));
 player.finishAttempt(meta,{state:state(12,{finishedAt:25000}),timed:true});void player.syncPlayer();release();await pending;
 assert.equal(player.getPlayerStatus().pending,0);assert.equal(calls.filter(x=>x.action==='attempts').at(-1).attempts[0].status,'completed');
});

test('large local history is sent in bounded batches of twenty',async()=>{
 const {player,calls}=setup();for(let i=0;i<43;i++)start(player);await player.joinPlayer('Alex');assert.deepEqual(calls.filter(x=>x.action==='attempts').map(x=>x.attempts.length),[20,20,3]);assert.equal(player.getPlayerStatus().pending,0);
});

test('leave stops uploading immediately and is retried durably after a failed receipt',async()=>{
 let fail=false;const calls=[];
 const fetchImpl=async(url,init)=>{const b=JSON.parse(init.body);calls.push(b);if(fail)throw new TypeError('offline');return response({ok:true,schema:PLAYER_SCHEMA,playerId:b.playerId,revision:b.revision,...(b.action==='attempts'?{accepted:b.attempts.map(({id,revision})=>({id,revision}))}:{})});};
 const {player,storage}=setup({fetchImpl});await player.joinPlayer('Alex');fail=true;await assert.rejects(player.leaveLeaderboard());assert.equal(player.getPlayer().joined,false);assert.equal(player.getPlayerStatus().leavePending,true);start(player);fail=false;
 const reloaded=setup({storage,fetchImpl}).player;await reloaded.syncPlayer();assert.equal(reloaded.getPlayerStatus().leavePending,false);assert.equal(calls.at(-1).action,'leave');
 await reloaded.newPlayer();assert.equal(reloaded.getAttempts().length,0);
});

test('new player refuses to discard unconfirmed joined results',async()=>{
 let fail=false;const {player}=setup({fetchImpl:async(url,init)=>{const b=JSON.parse(init.body);if(fail)throw new TypeError('offline');return response({ok:true,schema:PLAYER_SCHEMA,playerId:b.playerId,revision:b.revision,...(b.action==='attempts'?{accepted:b.attempts.map(({id,revision})=>({id,revision}))}:{})})}});
 await player.joinPlayer('Alex');const id=player.getPlayer().id;start(player);fail=true;await assert.rejects(player.newPlayer());assert.equal(player.getPlayer().id,id);assert.equal(player.getAttempts().length,1);
 fail=false;await player.newPlayer();assert.notEqual(player.getPlayer().id,id);assert.equal(player.getPlayer().joined,false);assert.equal(player.getAttempts().length,0);
});

test('rotating a player rejects stale metadata and prevents another visitor inheriting the name',async()=>{
 const {player,storage}=setup();await player.joinPlayer('Alex');const meta=start(player);await player.newPlayer();const otherTab=setup({storage}).player;
 assert.equal(otherTab.hasAttempt(meta),false);assert.equal(otherTab.updateAttempt(meta,{state:state(8),timed:true}),null);assert.equal(otherTab.getPlayer().displayName,'');
});

test('blocked local storage does not break play and reports its limitation',()=>{
 const storage={get length(){throw new Error('blocked');},getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');},removeItem(){throw new Error('blocked');}};
 const {player}=setup({storage});const meta=start(player);player.finishAttempt(meta,{state:state(12,{finishedAt:25000}),timed:true});assert.equal(player.getAttempts().length,1);assert.equal(player.getPlayerStatus().available,false);
});

test('display names accept readable names without identifiers or links',()=>{
 assert.equal(validatePlayerName('  Zoë  Chen  '),'Zoë Chen');assert.equal(validatePlayerName("Dr. O’Neill"),"Dr. O’Neill");
 for(const name of ['A','a'.repeat(33),'alex@example.org','https://example.org','www.example.org','Alex\nChen','🙂🙂'])assert.throws(()=>validatePlayerName(name));
});


test('gene recognition after partial image play preserves the actual number of placed pieces',()=>{
 const {player}=setup();const meta=start(player);player.updateAttempt(meta,{state:state(5),timed:true});
 player.finishAttempt(meta,{state:state(12,{solvedByGuess:true,namedAt:5,finishedAt:25000}),timed:true});
 assert.equal(player.getAttempt(meta).pieces,5);assert.equal(player.getAttempt(meta).route,'gene');assert.equal(player.getAttempt(meta).eligible,false);
});


test('unresponsive uploads have a finite timeout and preserve the queue',async()=>{
 const {player}=setup({timeoutMs:5,fetchImpl:async(url,init)=>{
  const b=JSON.parse(init.body);
  if(b.action==='profile')return response({ok:true,schema:PLAYER_SCHEMA,playerId:b.playerId,revision:b.revision});
  return new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
 }});
 start(player);await assert.rejects(player.joinPlayer('Alex'),/in time/);assert.equal(player.getPlayerStatus().pending,1);assert.equal(player.getPlayerStatus().syncing,false);
});

test('membership retries reuse their intent revision, while rename and leave advance it',async()=>{
 let fail=true;const calls=[];
 const {player,storage}=setup({fetchImpl:async(url,init)=>{const body=JSON.parse(init.body);calls.push(body);if(fail)throw new TypeError('offline');return response({ok:true,schema:PLAYER_SCHEMA,playerId:body.playerId,revision:body.revision});}});
 await assert.rejects(player.joinPlayer('Alex'));
 fail=false;const reloaded=setup({storage,fetchImpl:async(url,init)=>{const body=JSON.parse(init.body);calls.push(body);return response({ok:true,schema:PLAYER_SCHEMA,playerId:body.playerId,revision:body.revision});}}).player;
 await reloaded.joinPlayer('Alex');await reloaded.joinPlayer('Avery');await reloaded.leaveLeaderboard();await reloaded.joinPlayer('Avery');
 assert.deepEqual(calls.map(({action,revision})=>[action,revision]),[['profile',1],['profile',1],['profile',2],['leave',3],['profile',4]]);
});

test('a stale membership receipt is not accepted as a successful join',async()=>{
 const {player}=setup({fetchImpl:async(url,init)=>{const body=JSON.parse(init.body);return response({ok:true,schema:PLAYER_SCHEMA,playerId:body.playerId,revision:body.revision-1});}});
 await assert.rejects(player.joinPlayer('Alex'),/Receipt/);assert.equal(player.getPlayer().joined,false);assert.equal(player.getPlayer().pendingName,'Alex');
});

test('leaving while a join is in flight prevents its later receipt from restoring membership',async()=>{
 let release;const calls=[];
 const {player}=setup({fetchImpl:async(url,init)=>{const body=JSON.parse(init.body);calls.push(body);const receipt=()=>response({ok:true,schema:PLAYER_SCHEMA,playerId:body.playerId,revision:body.revision});
  if(body.action==='profile')return new Promise(resolve=>{release=()=>resolve(receipt());});return receipt();
 }});
 const joining=player.joinPlayer('Alex'),superseded=assert.rejects(joining,/changed in another tab/);await new Promise(resolve=>setImmediate(resolve));
 const leaving=player.leaveLeaderboard();assert.equal(player.getPlayer().joined,false);assert.equal(player.getPlayerStatus().leavePending,true);release();await Promise.all([superseded,leaving]);
 assert.equal(player.getPlayer().joined,false);assert.equal(player.getPlayerStatus().leavePending,false);assert.deepEqual(calls.map(({action,revision})=>[action,revision]),[['profile',1],['leave',2]]);
});

test('a timed-out join delivered after confirmed leave cannot republish the player',async()=>{
 let delayedJoin,server={revision:0,joined:false};
 function deliver(body){if(body.revision>server.revision)server={revision:body.revision,joined:body.action==='profile'};return response({ok:true,schema:PLAYER_SCHEMA,playerId:body.playerId,revision:body.revision});}
 const {player}=setup({timeoutMs:5,fetchImpl:async(url,init)=>{const body=JSON.parse(init.body);
  if(body.action==='profile'){delayedJoin=()=>deliver(body);return new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));}
  return deliver(body);
 }});
 await assert.rejects(player.joinPlayer('Alex'),/in time/);await player.leaveLeaderboard();assert.deepEqual(server,{revision:2,joined:false});
 delayedJoin();assert.deepEqual(server,{revision:2,joined:false});assert.equal(player.getPlayer().joined,false);
});

test('new player waits for an unconfirmed withdrawal and retries the same revision',async()=>{
 let failLeave=true;const calls=[];
 const {player}=setup({fetchImpl:async(url,init)=>{const body=JSON.parse(init.body);calls.push(body);if(body.action==='leave'&&failLeave)throw new TypeError('offline');return response({ok:true,schema:PLAYER_SCHEMA,playerId:body.playerId,revision:body.revision});}});
 await player.joinPlayer('Alex');const id=player.getPlayer().id;await assert.rejects(player.leaveLeaderboard());await assert.rejects(player.newPlayer());assert.equal(player.getPlayer().id,id);assert.equal(player.getPlayerStatus().leavePending,true);
 failLeave=false;await player.newPlayer();assert.notEqual(player.getPlayer().id,id);assert.deepEqual(calls.filter(x=>x.action==='leave').map(x=>x.revision),[2,2,2]);
});

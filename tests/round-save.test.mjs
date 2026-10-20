import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoundSaveGuard,createRoundActionQueue} from '../game/round-save.mjs';
import {newState} from '../game/engine.mjs';
import {restoreSession,startRound} from '../game/session.mjs';

function environment(initial=null){
  let raw=initial,sequence=0;
  const page=()=>createRoundSaveGuard({read:()=>raw,write:value=>{raw=value;},initial:raw,token:()=>String(++sequence)});
  return {page,read:()=>JSON.parse(raw),clear:()=>{raw=null;}};
}
test('a stale hint cannot replace a completed round from another tab',()=>{
  const env=environment(),a=env.page(),b=env.page();
  const completed={...newState(),placed:Array.from({length:12},(_,i)=>i),solvedByGuess:true};
  assert.equal(a.save({state:completed,timed:false,order:completed.placed}),true);
  assert.equal(b.save({state:{...newState(),hints:1},timed:false}),false);
  assert.deepEqual(env.read().state,completed);
  assert.equal(b.current(),false,'the stale page cannot resume writing');
});
test('an explicit restart survives later activity from the old completion',()=>{
  const env=environment(),a=env.page();
  a.save({state:{...newState(),placed:Array.from({length:12},(_,i)=>i)}});
  const oldCompletion=env.page();
  a.save({state:newState(),timed:true,order:[11,10,9,8,7,6,5,4,3,2,1,0]});
  assert.equal(oldCompletion.save({state:{...newState(),placed:[0]}}),false);
  assert.deepEqual(env.read().state.placed,[]);
  assert.equal(env.read().timed,true);
});
test('normal consecutive saves retain timing, hints, and tray order exactly',()=>{
  const env=environment(),a=env.page();
  const value={state:{...newState(),placed:[3],hints:2,peeks:1,startedAt:100,seconds:8},timed:true,order:[3,2,1,0,4,5,6,7,8,9,10,11]};
  assert.equal(a.save(value),true);
  value.state.placed.push(4);value.state.seconds=10;
  assert.equal(a.save(value),true);
  const {writeToken,...saved}=env.read();assert.deepEqual(saved,value);
});
test('a fresh timed restart can reload without a legacy clock or timing penalty',()=>{
  const env=environment(),page=env.page(),fresh=restoreSession(null).state;
  page.save({state:fresh,timed:true},{force:true});
  const restored=restoreSession(env.read(),10000);
  assert.equal(restored.state.timingVersion,2);assert.equal(restored.state.startedAt,null);assert.equal(restored.state.timingUnavailable,false);
  restored.state.placed.push(0);startRound(restored.state,restored.timed,'image',20000);
  assert.equal(restored.state.startedAt,20000);assert.equal(restored.state.seconds,0);
});
test('a reset to the same visible state still invalidates older pages',()=>{
  const env=environment(),a=env.page();a.save({state:newState()});
  const b=env.page();a.save({state:newState()},{force:true});
  assert.equal(b.current(),false);
});
test('clearing progress for a new player invalidates old round pages',()=>{
  const env=environment(),a=env.page();a.save({state:newState()});
  env.clear();assert.equal(a.save({state:newState()}),false);assert.equal(env.read(),null);
});
test('failed storage writes do not advance the expected save',()=>{
  let raw=null,fail=true;
  const a=createRoundSaveGuard({read:()=>raw,write:v=>{if(fail)throw Error('quota');raw=v;},initial:null,token:()=> 'test'});
  assert.throws(()=>a.save({state:newState()}),/quota/);
  fail=false;assert.equal(a.save({state:newState()}),true);
});

test('unchanged saves from reopened pages do not invalidate another open page',()=>{
  const env=environment(),first=env.page(),payload={state:newState(),timed:false,order:[0,1,2,3,4,5,6,7,8,9,10,11]};
  first.save(payload);const initial=env.read();
  for(let load=0;load<8;load++){
    const reloaded=env.page();assert.equal(reloaded.save(payload),true);
    assert.deepEqual(env.read(),initial);
    assert.equal(first.current(),true);
  }
});

// An origin-wide lock manager shared by separate page queues. Holding an
// action open reproduces another tab requesting a change before its write.
function lockManager(){
  let pending=Promise.resolve(),active=0,maximum=0;
  const names=[];
  return {
    request(name,action){
      names.push(name);
      const next=pending.then(async()=>{active++;maximum=Math.max(maximum,active);try{return await action();}finally{active--;}});
      pending=next.catch(()=>{});return next;
    },
    get maximum(){return maximum;},
    names
  };
}
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};

test('simultaneous page actions check freshness under the shared lock before any attempt or save',async()=>{
  const env=environment(),a=env.page(),b=env.page(),locks=lockManager(),held=deferred(),entered=deferred(),history=[];
  const queueA=createRoundActionQueue({locks,isCurrent:a.current}),queueB=createRoundActionQueue({locks,isCurrent:b.current});
  const completed={state:{...newState(),placed:Array.from({length:12},(_,i)=>i),startedAt:1000,finishedAt:5000,seconds:4},timed:true};
  const completing=queueA.run(async()=>{entered.resolve();await held.promise;a.save(completed);history.push('completed');});
  await entered.promise;
  const staleHint=queueB.run(()=>{history.push('stale attempt');return b.save({state:{...newState(),hints:1}});});
  assert.equal(b.current(),true,'both tabs initially see the same pre-completion save');
  held.resolve();await completing;assert.equal(await staleHint,false);
  assert.deepEqual(history,['completed']);assert.deepEqual(env.read().state,completed.state);
  assert.equal(env.read().timed,true);assert.equal(locks.maximum,1);
  assert.deepEqual(new Set(locks.names),new Set(['gregor-puzzles:progress']));
});

test('a queued old-round action cannot resurrect progress after an explicit restart',async()=>{
  const env=environment(),initial=env.page();initial.save({state:{...newState(),placed:[0,1,2],startedAt:1000},timed:true});
  const restarting=env.page(),stale=env.page(),locks=lockManager(),held=deferred(),entered=deferred();
  const a=createRoundActionQueue({locks,isCurrent:restarting.current}),b=createRoundActionQueue({locks,isCurrent:stale.current});
  const reset=a.run(async()=>{entered.resolve();await held.promise;return restarting.save({state:newState(),timed:false},{force:true});});
  await entered.promise;
  let attempted=false;
  const oldPlacement=b.run(()=>{attempted=true;return stale.save({state:{...newState(),placed:[0,1,2,3],startedAt:1000},timed:true});});
  held.resolve();await reset;assert.equal(await oldPlacement,false);assert.equal(attempted,false);
  assert.deepEqual(env.read().state,newState());assert.equal(env.read().timed,false);
});

test('new player invalidates queued actions even when the round had no saved progress',async()=>{
  const env=environment(),old=env.page(),locks=lockManager();let identity='old player',newAttempt=false;
  const oldIdentity=identity;
  const reset=createRoundActionQueue({locks}),play=createRoundActionQueue({locks,isCurrent:()=>identity===oldIdentity&&old.current()});
  const rotating=reset.run(()=>{identity='new player';env.clear();});
  const staleAction=play.run(()=>{newAttempt=true;old.save({state:{...newState(),placed:[0]}});});
  await rotating;assert.equal(await staleAction,false);assert.equal(newAttempt,false);assert.equal(env.read(),null);
});

test('each page preserves rapid event order and a rejected action does not poison the lock',async()=>{
  const locks=lockManager(),queue=createRoundActionQueue({locks}),actions=[];
  const selected=queue.run(()=>actions.push('select'));
  const placement=queue.run(()=>actions.push('place'));
  const failed=queue.run(()=>{throw new Error('storage unavailable');});
  const rejected=assert.rejects(failed,/storage unavailable/);
  const recovery=queue.run(()=>actions.push('retry'));
  await Promise.all([selected,placement,rejected,recovery]);
  assert.deepEqual(actions,['select','place','retry']);assert.equal(locks.maximum,1);
});

test('the no-Web-Locks fallback still aborts ordinary stale pages and preserves local action order',async()=>{
  const env=environment(),a=env.page(),b=env.page();
  const queue=createRoundActionQueue({locks:null,isCurrent:b.current});
  a.save({state:{...newState(),placed:[0]}});
  let changed=false;assert.equal(await queue.run(()=>{changed=true;}),false);assert.equal(changed,false);
  const local=createRoundActionQueue({locks:null}),actions=[];
  await Promise.all([local.run(()=>actions.push(1)),local.run(()=>actions.push(2))]);
  assert.deepEqual(actions,[1,2]);
});

import {SUGGESTION_ENDPOINT} from './suggestions.mjs';

export const PLAYER_SCHEMA='gregor-player-v1';
export const PLAYER_PREFIX='gregor-puzzles:player:v1:';
const PROFILE_KEY=`${PLAYER_PREFIX}profile`;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RECORD_FIELDS=['id','roundNumber','revision','status','mode','route','pieces','startedAt','finishedAt','seconds','hints','peeks','geneHintsSeen','eligible'];
const copy=value=>JSON.parse(JSON.stringify(value));
const publicAttempt=value=>Object.fromEntries(RECORD_FIELDS.map(key=>[key,value[key]]));
export function validatePlayerName(name){
 if(typeof name!=='string')throw new Error('Enter a display name.');
 const value=name.normalize('NFC').trim().replace(/ +/g,' ');
 if(Array.from(value).length<2||Array.from(value).length>32||!/[\p{L}\p{N}]/u.test(value)||! /^[\p{L}\p{N} .'’_-]+$/u.test(value)||/(?:www\.|https?\b|\.[a-z]{2,}(?:\s|$))/i.test(value))throw new Error('Use 2–32 letters, numbers, spaces, apostrophes, dots, underscores, or hyphens. Do not use an email or web address.');
 return value;
}
// One durable record per attempt prevents unrelated rounds/tabs overwriting one
// shared history array. The token never leaves this module except in HTTPS POSTs.
export function createPlayerStore({storage,fetchImpl=globalThis.fetch,uuid=()=>globalThis.crypto.randomUUID(),now=()=>Date.now(),endpoint=SUGGESTION_ENDPOINT,notify=()=>{},timeoutMs=45000}={}){
 const memory=new Map();let available=true,error='',inFlight=null,resync=false;
 const changed=()=>notify();
 const getStorage=()=>{try{return storage??globalThis.localStorage;}catch{available=false;return null;}};
 const read=key=>{try{const raw=getStorage()?.getItem(key);if(raw!==null&&raw!==undefined){memory.set(key,raw);return JSON.parse(raw);}if(available)return null;}catch{available=false;}try{return JSON.parse(memory.get(key)??'null');}catch{return null;}};
 const write=(key,value)=>{const raw=JSON.stringify(value);memory.set(key,raw);try{const target=getStorage();if(!target)throw new Error('storage');target.setItem(key,raw);}catch{available=false;}};
 const keys=()=>{const result=new Set(memory.keys());try{const target=getStorage();if(target)for(let i=0;i<target.length;i++)result.add(target.key(i));}catch{available=false;}return [...result].filter(Boolean);};
 const remove=key=>{memory.delete(key);try{getStorage()?.removeItem(key);}catch{available=false;}};
 const fresh=()=>({id:uuid().toLowerCase(),token:uuid().toLowerCase(),displayName:'',joined:false,pendingName:'',leavePending:false,actionRevision:0});
 function profile(){let value=read(PROFILE_KEY);if(!value||!UUID.test(value.id??'')||!UUID.test(value.token??'')){value=fresh();write(PROFILE_KEY,value);}if(!Number.isSafeInteger(value.actionRevision)||value.actionRevision<0){value={...value,actionRevision:value.pendingName||value.leavePending?1:0};write(PROFILE_KEY,value);}return value;}
 const attemptKey=(owner,id)=>`${PLAYER_PREFIX}attempt:${owner}:${id}`;
 const storedAttempts=owner=>keys().filter(key=>key.startsWith(`${PLAYER_PREFIX}attempt:${owner}:`)).map(read).filter(record=>record?.playerId===owner&&UUID.test(record.id??'')&&Number.isInteger(record.revision)).sort((a,b)=>a.startedAt-b.startedAt||a.id.localeCompare(b.id));
 const getPlayer=()=>{const p=profile();return {id:p.id,displayName:p.displayName,joined:p.joined===true,pendingName:p.pendingName||''};};
 const getAttempts=()=>storedAttempts(profile().id).map(publicAttempt);
 const getPlayerStatus=()=>{const p=profile();return {available,joined:p.joined===true,pending:storedAttempts(p.id).filter(a=>(a.ackRevision??0)<a.revision).length,syncing:Boolean(inFlight),error,leavePending:p.leavePending===true};};
 function owned(meta){const p=profile();if(!meta||meta.playerId!==p.id||!UUID.test(meta.id??''))return null;return read(attemptKey(p.id,meta.id));}
 function checkpoint(meta,{state,timed,status='active',eligible=false}={}){
  const previous=owned(meta);if(!previous)return null;
  // A terminal record can never be reopened or overwritten by a stale tab.
  if(previous.status!=='active')return publicAttempt(previous);
  const count=state.solvedByGuess?(Number.isInteger(state.namedAt)?state.namedAt:previous.pieces):(state.placed?.length??0);
  const finished=status==='active'?null:Math.max(previous.startedAt,Number.isFinite(state.finishedAt)?state.finishedAt:now());
  const next={...previous,status,route:state.solvedByGuess?'gene':previous.route,pieces:Math.max(previous.pieces,Math.min(12,count)),finishedAt:finished,seconds:timed?(finished===null?null:(finished-previous.startedAt)/1000):null,hints:Math.max(previous.hints,state.hints||0),peeks:Math.max(previous.peeks,state.peeks||0),geneHintsSeen:Math.max(previous.geneHintsSeen,state.geneHintsSeen||0),eligible:status==='completed'&&eligible===true};
  // Assistance/progress is monotonic. Active clocks are derived, not repeatedly
  // written or transmitted each second. Completion captures the exact interval.
  if(JSON.stringify(publicAttempt({...next,revision:previous.revision}))===JSON.stringify(publicAttempt(previous)))return publicAttempt(previous);
  next.revision=previous.revision+1;write(attemptKey(previous.playerId,previous.id),next);changed();return publicAttempt(next);
 }
 function startAttempt({roundNumber,state,timed,before=0}={}){
  const p=profile();if(before!==0||!/^0[1-9]$|^10$/.test(roundNumber)||!(state.placed?.length>0))return null;
  const record={id:uuid().toLowerCase(),playerId:p.id,revision:1,status:'active',roundNumber,mode:timed?'timed':'practice',route:state.solvedByGuess?'gene':'image',pieces:state.solvedByGuess?before:Math.min(12,state.placed.length),startedAt:timed&&Number.isFinite(state.startedAt)?state.startedAt:now(),finishedAt:null,seconds:null,hints:state.hints||0,peeks:state.peeks||0,geneHintsSeen:state.geneHintsSeen||0,eligible:false,ackRevision:0};
  write(attemptKey(p.id,record.id),record);changed();return {id:record.id,playerId:p.id};
 }
 const updateAttempt=(meta,input)=>checkpoint(meta,input);
 const finishAttempt=(meta,input)=>checkpoint(meta,{...input,status:input?.status==='restarted'?'restarted':'completed'});
 async function request(action,p,extra={}){
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(endpoint))throw new Error('The leaderboard connection is unavailable. Your attempts stay in this browser.');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetchImpl(endpoint,{method:'POST',mode:'cors',credentials:'omit',redirect:'follow',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({schema:PLAYER_SCHEMA,action,playerId:p.id,token:p.token,...(action==='attempts'?{}:{revision:p.actionRevision}),...extra}),signal:controller.signal});
   const result=response.ok?await response.json():null;
   if(result?.ok!==true||result.schema!==PLAYER_SCHEMA||result.playerId!==p.id||(action!=='attempts'&&result.revision!==p.actionRevision))throw new Error(typeof result?.error==='string'&&result.error.length<=280?result.error:'Receipt could not be confirmed. Your attempts stay saved here; try syncing again.');
   return result;
  }catch(cause){if(cause?.name==='AbortError')throw new Error('Receipt could not be confirmed in time. Your attempts stay saved here; try syncing again.');throw cause;}finally{clearTimeout(timeout);}
 }
 async function synchronize(){
  let p=profile();
  if(p.leavePending){await request('leave',p);const current=profile();if(current.id===p.id&&current.actionRevision===p.actionRevision&&current.leavePending){write(PROFILE_KEY,{...current,joined:false,leavePending:false,pendingName:''});changed();}return;}
  if(p.pendingName){
   const name=p.pendingName;await request('profile',p,{displayName:name});const current=profile();
   if(current.id!==p.id||current.actionRevision!==p.actionRevision||current.leavePending)return;
   write(PROFILE_KEY,{...current,displayName:name,joined:true,pendingName:current.pendingName===name?'':current.pendingName});changed();p=profile();
   if(p.pendingName)return; // A newer rename will be sent by the next sync.
  }
  if(!p.joined)return;
  // Snapshot bounded batches; acknowledge only returned IDs and revisions.
  // A concurrent placement remains dirty if its newer revision was not sent.
  const dirty=storedAttempts(p.id).filter(a=>(a.ackRevision??0)<a.revision);
  for(let offset=0;offset<dirty.length;offset+=20){
   if(profile().id!==p.id||!profile().joined||profile().leavePending)break;
   const batch=dirty.slice(offset,offset+20),result=await request('attempts',p,{attempts:batch.map(publicAttempt)});
   if(!Array.isArray(result.accepted))throw new Error('Receipt could not be confirmed. Your attempts stay saved here; try syncing again.');
   for(const sent of batch){
    if(!result.accepted.some(a=>a?.id===sent.id&&a.revision===sent.revision))throw new Error('Some attempts are still waiting for confirmation. Try syncing again.');
    const key=attemptKey(p.id,sent.id),current=read(key);if(current)write(key,{...current,ackRevision:Math.max(current.ackRevision??0,sent.revision)});
   }
   changed();
  }
 }
 function syncPlayer(){
  if(inFlight){resync=true;return inFlight;}
  error='';inFlight=Promise.resolve().then(async()=>{do{resync=false;await synchronize();}while(resync);}).catch(cause=>{error=cause instanceof TypeError?'Could not connect. Your attempts stay saved here; try syncing when you are online.':cause.message||'Could not confirm receipt. Try syncing again.';throw new Error(error);}).finally(()=>{inFlight=null;changed();});changed();return inFlight;
 }
 async function joinPlayer(displayName){
  const name=validatePlayerName(displayName),p=profile();
  const revision=p.pendingName===name&&!p.leavePending?p.actionRevision:p.actionRevision+1;
  write(PROFILE_KEY,{...p,pendingName:name,leavePending:false,actionRevision:revision});changed();
  if(inFlight)await inFlight.catch(()=>{});await syncPlayer();if(profile().pendingName)await syncPlayer();
  if(profile().id!==p.id||profile().actionRevision!==revision)throw new Error('Player settings changed in another tab. Check the current player before trying again.');
  return getPlayer();
 }
 async function leaveLeaderboard(){
  const p=profile();if(!p.joined&&!p.pendingName&&!p.leavePending)return getPlayer();
  const revision=p.leavePending?p.actionRevision:p.actionRevision+1;
  write(PROFILE_KEY,{...p,joined:false,pendingName:'',leavePending:true,actionRevision:revision});changed();
  if(inFlight)await inFlight.catch(()=>{});await syncPlayer();
  if(profile().id!==p.id||profile().actionRevision!==revision)throw new Error('Player settings changed in another tab. Check the current player before trying again.');
  return getPlayer();
 }
 async function newPlayer(){
  const previous=profile();
  // Never silently discard conference results or an unconfirmed removal.
  if(previous.joined||previous.pendingName||previous.leavePending){await syncPlayer();const status=getPlayerStatus();if((profile().joined&&status.pending)||status.leavePending||profile().pendingName)throw new Error('Some results are not confirmed yet. Retry before starting a new player.');}
  if(profile().id!==previous.id)throw new Error('The player changed in another tab. Reload before starting a new player.');
  for(const key of keys().filter(key=>key.startsWith(PLAYER_PREFIX)))remove(key);
  write(PROFILE_KEY,fresh());error='';changed();return getPlayer();
 }
 return {getPlayer,getAttempts,getPlayerStatus,joinPlayer,leaveLeaderboard,syncPlayer,newPlayer,startAttempt,updateAttempt,finishAttempt,hasAttempt:meta=>Boolean(owned(meta)),getAttempt:meta=>{const value=owned(meta);return value?publicAttempt(value):null;}};
}
let singleton;
const store=()=>singleton??=createPlayerStore({notify:()=>{if(globalThis.window)window.dispatchEvent(new Event('gregor-player-change'));}});
export const getPlayer=()=>store().getPlayer();
export const getAttempts=()=>store().getAttempts();
export const getPlayerStatus=()=>store().getPlayerStatus();
export const joinPlayer=name=>store().joinPlayer(name);
export const leaveLeaderboard=()=>store().leaveLeaderboard();
export const syncPlayer=()=>store().syncPlayer();
export const newPlayer=()=>store().newPlayer();
export const startAttempt=input=>store().startAttempt(input);
export const updateAttempt=(meta,input)=>store().updateAttempt(meta,input);
export const finishAttempt=(meta,input)=>store().finishAttempt(meta,input);
export const hasAttempt=meta=>store().hasAttempt(meta);
export const getAttempt=meta=>store().getAttempt(meta);
if(globalThis.window){window.addEventListener('online',()=>void syncPlayer().catch(()=>{}));window.addEventListener('storage',event=>{if(event.key?.startsWith(PLAYER_PREFIX))window.dispatchEvent(new Event('gregor-player-change'));});}

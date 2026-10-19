import {getPlayer,getAttempts,joinPlayer,leaveLeaderboard,syncPlayer,getPlayerStatus} from './player.mjs';
import {SUGGESTION_ENDPOINT} from './suggestions.mjs';

// An illustrative entry only. It never enters the player data or ranking logic.
export const LEADERBOARD_SAMPLE=Object.freeze({displayName:'Sasha Gladkikh',roundsCompleted:10,totalSeconds:563});

const namePattern=/^[\p{L}\p{N} .'’_-]{2,32}$/u;
const nonnegative=value=>Number.isFinite(value)&&value>=0;
const integer=value=>Number.isInteger(value)&&value>=0;
const millis=value=>Math.round(value*1000);
const roundNumber=value=>String(value??'').padStart(2,'0');
const timestamp=value=>{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))return null;
 const canonical=value.includes('.')?value:value.replace('Z','.000Z'),date=new Date(value);
 return Number.isFinite(date.getTime())&&date.toISOString()===canonical?canonical:null;
};

export function playerDateTime(value,{locale,timeZone}={}){
 const valid=timestamp(value);
 return valid?new Intl.DateTimeFormat(locale,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',...(timeZone?{timeZone}:{})}).format(new Date(valid)):null;
}

export function playerTime(seconds){
 if(!nonnegative(seconds))return '—';
 const total=Math.round(seconds*1000),minutes=Math.floor(total/60000),remaining=total%60000;
 return `${minutes}:${String(Math.floor(remaining/1000)).padStart(2,'0')}.${String(remaining%1000).padStart(3,'0')}`;
}

export function summarizeAttempts(attempts,catalogue){
 const allowed=new Set(catalogue.map(round=>round.number));
 const played=new Set(),completed=new Set(),best=new Map();
 for(const attempt of attempts){
  if(!allowed.has(attempt.roundNumber))continue;
  played.add(attempt.roundNumber);
  if(attempt.status!=='completed')continue;
  completed.add(attempt.roundNumber);
  if(attempt.eligible&&attempt.mode==='timed'&&attempt.route==='image'&&nonnegative(attempt.seconds)){
   const previous=best.get(attempt.roundNumber);
   if(!previous||attempt.seconds<previous.seconds)best.set(attempt.roundNumber,attempt);
  }
 }
 return {attempts:attempts.length,roundsPlayed:played.size,roundsCompleted:completed.size,timedRounds:best.size,totalBestSeconds:best.size===allowed.size?[...best.values()].reduce((sum,attempt)=>sum+attempt.seconds,0):null};
}

export function publicPlayers(payload,catalogue){
 if(payload?.ok!==true||payload.schema!=='gregor-player-board-v1'||!Array.isArray(payload.players))throw new Error('The leaderboard response is unavailable.');
 const allowed=new Set(catalogue.map(round=>round.number));
 return payload.players.flatMap(player=>{
  if(typeof player?.id!=='string'||!player.id||typeof player.displayName!=='string'||!namePattern.test(player.displayName)||!integer(player.attempts)||!integer(player.roundsPlayed)||!integer(player.roundsCompleted)||!Array.isArray(player.best))return [];
  const best=new Map();
  for(const entry of player.best){
   const number=roundNumber(entry?.roundNumber);
   if(!allowed.has(number)||!nonnegative(entry.seconds))continue;
   const clean={roundNumber:number,seconds:entry.seconds,hints:integer(entry.hints)?entry.hints:0,peeks:integer(entry.peeks)?entry.peeks:0,geneHintsSeen:integer(entry.geneHintsSeen)?entry.geneHintsSeen:0,completedAt:timestamp(entry.completedAt)};
   if(!best.has(number)||entry.seconds<best.get(number).seconds)best.set(number,clean);
  }
  return [{id:player.id,displayName:player.displayName,attempts:player.attempts,roundsPlayed:Math.min(allowed.size,player.roundsPlayed),roundsCompleted:Math.min(allowed.size,player.roundsCompleted),timedRounds:best.size,totalBestSeconds:best.size===allowed.size?[...best.values()].reduce((sum,entry)=>sum+entry.seconds,0):null,latestAt:timestamp(player.latestAt),best:[...best.values()]}];
 });
}

export function rankPlayers(players,selection='overall',roundCount=10){
 const key=player=>{
  if(selection!=='overall')return String(millis(player.best.find(entry=>entry.roundNumber===selection).seconds));
  return `${player.roundsCompleted}:${player.roundsCompleted===roundCount&&player.timedRounds===roundCount&&nonnegative(player.totalBestSeconds)?millis(player.totalBestSeconds):'untimed'}`;
 };
 const sorted=players.filter(player=>player.attempts>0&&(selection==='overall'||player.best.some(entry=>entry.roundNumber===selection))).slice().sort((a,b)=>{
  let comparison;
  if(selection==='overall'){
   comparison=b.roundsCompleted-a.roundsCompleted;
   if(!comparison&&a.roundsCompleted===roundCount){
    const ta=a.timedRounds===roundCount&&nonnegative(a.totalBestSeconds)?millis(a.totalBestSeconds):Infinity;
    const tb=b.timedRounds===roundCount&&nonnegative(b.totalBestSeconds)?millis(b.totalBestSeconds):Infinity;
    comparison=ta===tb?0:ta-tb;
   }
  }else comparison=millis(a.best.find(entry=>entry.roundNumber===selection).seconds)-millis(b.best.find(entry=>entry.roundNumber===selection).seconds);
  return comparison||a.displayName.localeCompare(b.displayName)||a.id.localeCompare(b.id);
 });
 let previous,rank=0;
 return sorted.map((player,index)=>{const current=key(player);if(current!==previous)rank=index+1;previous=current;return {...player,rank};});
}

const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};
const button=(text,className='home-text-button')=>{const element=node('button',text,className);element.type='button';return element;};
function sampleEntry(){
 const sample=node('aside',undefined,'leaderboard-sample');sample.setAttribute('aria-label','Sample leaderboard entry');
 const identity=node('div',undefined,'leaderboard-sample-identity');
 const heading=node('div',undefined,'leaderboard-sample-heading');
 heading.append(node('strong',LEADERBOARD_SAMPLE.displayName),node('span','Sample','leaderboard-sample-badge'));
 identity.append(heading,node('p',`${LEADERBOARD_SAMPLE.roundsCompleted} of 10 rounds`,'leaderboard-sample-rounds'));
 const time=node('div',undefined,'leaderboard-sample-time');
 time.append(node('strong',`${Math.floor(LEADERBOARD_SAMPLE.totalSeconds/60)}:${String(LEADERBOARD_SAMPLE.totalSeconds%60).padStart(2,'0')}`),node('span','Total time'));
 sample.append(identity,time);
 return sample;
}
const assistance=attempt=>[
 attempt.hints?`${attempt.hints} hint${attempt.hints===1?'':'s'}`:null,
 attempt.peeks?`${attempt.peeks} reference view${attempt.peeks===1?'':'s'}`:null,
 attempt.geneHintsSeen?`${attempt.geneHintsSeen} gene clue${attempt.geneHintsSeen===1?'':'s'}`:null
].filter(Boolean).join(' · ');

export function initPlayerUI(catalogue){
 const $=id=>document.getElementById(id);
 const host=$('playerProfile');
 if(!host||!catalogue.length)return;
 const intro=node('p','Choose a display name to join. Your attempts will save automatically.','player-intro');
 const profile=node('div',undefined,'player-current');
 const identity=node('div',undefined,'player-identity');
 const name=node('strong'),edit=button('Change name');name.tabIndex=-1;identity.append(name,edit);
 const stats=node('div',undefined,'player-stats');
 const form=node('form',undefined,'player-join');form.noValidate=false;
 const label=node('label','Name on the leaderboard');label.htmlFor='playerDisplayName';
 const input=node('input');input.id='playerDisplayName';input.name='displayName';input.required=true;input.minLength=2;input.maxLength=32;input.autocomplete='nickname';input.spellcheck=false;input.placeholder='Your name or nickname';input.setAttribute('aria-describedby','playerPrivacy playerNameHelp');
 const fields=node('div',undefined,'player-join-fields');
 const submit=node('button','Join leaderboard','home-primary player-join-submit');submit.type='submit';
 fields.append(input,submit);
 const help=node('p','2–32 characters. No email address needed.','player-name-help');help.id='playerNameHelp';
 const cancel=button('Cancel');cancel.hidden=true;
 form.append(label,fields,help,cancel);
 const privacy=node('p','Your name, progress and activity dates are public. Attempts are saved privately for the GREGoR Puzzles team.','player-privacy');privacy.id='playerPrivacy';
 const status=node('p',undefined,'player-status');status.setAttribute('role','status');
 const retry=button('Try syncing again');retry.hidden=true;
 const leave=button('Leave leaderboard');leave.classList.add('player-leave');
 const actions=node('div',undefined,'player-account-actions');actions.append(retry,leave);
 profile.append(identity,stats);
 const history=node('details',undefined,'player-history');
 const historyLabel=node('summary','Your attempt history');
 const historyNote=node('p','Your attempts on this device. Replays are recorded separately.','player-history-note');
 const historyList=node('ol',undefined,'player-history-list');
 const more=button('Show more attempts');more.hidden=true;
 history.append(historyLabel,historyNote,historyList,more);
 host.replaceChildren(intro,profile,form,privacy,status,actions,history);
 let editing=false,busy=false,message='',historyLimit=20,lastHistory='',boardLoaded=false;
 const formatDate=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});

 function renderHistory(attempts){
  const signature=JSON.stringify(attempts)+historyLimit;
  history.hidden=!attempts.length;
  historyLabel.textContent=`Your attempt history (${attempts.length})`;
  if(signature===lastHistory)return;lastHistory=signature;
  historyList.replaceChildren();
  const ordered=attempts.slice().sort((a,b)=>(b.startedAt||0)-(a.startedAt||0));
  for(const attempt of ordered.slice(0,historyLimit)){
   const round=catalogue.find(round=>round.number===attempt.roundNumber);
   const item=node('li',undefined,'player-attempt');
   const heading=node('div',undefined,'player-attempt-heading');
   const roundLink=node('a',`Round ${attempt.roundNumber}${round?` · ${round.topic}`:''}`);roundLink.href=`./play.html?level=${attempt.roundNumber}`;
   const state=attempt.status==='completed'?'Complete':attempt.status==='restarted'?'Restarted':'In progress';
   heading.append(roundLink,node('span',state,`attempt-state attempt-${attempt.status}`));
   const detail=[];
   if(attempt.mode==='practice')detail.push('Practice · Untimed');
   else detail.push(`Timed${nonnegative(attempt.seconds)?` · ${playerTime(attempt.seconds)}`:''}`);
   if(attempt.status!=='completed')detail.push(`${attempt.pieces} of 12 pieces`);
   if(attempt.route==='gene'&&attempt.status==='completed')detail.push('Completed with gene answer');
   const assists=assistance(attempt);if(assists)detail.push(assists);
   const detailLine=node('p',detail.join(' · '),'player-attempt-detail');
   if(attempt.mode==='timed'&&attempt.status==='active'&&Number.isFinite(attempt.startedAt)){
    const clock=node('span');clock.dataset.attemptClock=String(attempt.startedAt);detailLine.append(clock);
   }
   item.append(heading,detailLine);
   if(Number.isFinite(attempt.startedAt))item.append(node('time',formatDate.format(new Date(attempt.startedAt)),'player-attempt-date'));
   historyList.append(item);
  }
  updateHistoryClocks();
  more.hidden=ordered.length<=historyLimit;
  more.textContent=`Show ${Math.min(20,Math.max(0,ordered.length-historyLimit))} more attempts`;
 }
 function updateHistoryClocks(){
  for(const clock of historyList.querySelectorAll('[data-attempt-clock]'))clock.textContent=` · ${playerTime(Math.max(0,(Date.now()-Number(clock.dataset.attemptClock))/1000))} elapsed`;
 }
 let historyClock;
 history.addEventListener('toggle',()=>{clearInterval(historyClock);if(history.open){updateHistoryClocks();historyClock=setInterval(updateHistoryClocks,1000);}});
 function renderProfile(){
  const player=getPlayer(),state=getPlayerStatus(),attempts=getAttempts(),summary=summarizeAttempts(attempts,catalogue);
  const joined=Boolean(player?.joined);
  intro.hidden=joined;
  profile.hidden=!joined;
  form.hidden=joined&&!editing;
  cancel.hidden=!joined;
  submit.textContent=busy?'Saving…':joined?'Save name':'Join leaderboard';
  submit.disabled=busy||!state.available||Boolean(state.leavePending);
  input.disabled=busy||!state.available||Boolean(state.leavePending);
  if(document.activeElement!==input&&!editing&&!joined&&player?.pendingName)input.value=player.pendingName;
  name.textContent=player?.displayName||'';
  stats.replaceChildren();
  for(const [value,labelText] of [[`${summary.roundsCompleted}/${catalogue.length}`,'rounds complete'],[summary.roundsPlayed,'rounds played'],[summary.attempts,'attempts']]){
   const stat=node('div');stat.append(node('strong',String(value)),node('span',labelText));stats.append(stat);
  }
  privacy.hidden=joined&&!editing;
  leave.hidden=!(joined||player?.pendingName)||busy;
  leave.textContent=joined?'Leave leaderboard':'Cancel joining';
  retry.hidden=busy||state.syncing||!(joined||player?.pendingName||state.leavePending)||!(state.error||state.pending||state.leavePending||player?.pendingName);
  retry.disabled=busy;
  status.classList.toggle('player-status-error',Boolean(message||state.error||!state.available||state.leavePending));
  if(message)status.textContent=message;
  else if(!state.available)status.textContent='This browser cannot save attempts. Enable site storage to keep a player record.';
  else if(state.leavePending)status.textContent='Removal is waiting to sync. Your public entry may remain visible until it is confirmed.';
  else if(state.syncing)status.textContent='Saving your player record…';
  else if(state.error)status.textContent='Saved on this device. Your online record is waiting to sync.';
  else if(joined&&state.pending)status.textContent=`${state.pending} attempt${state.pending===1?'':'s'} waiting to sync.`;
  else if(joined)status.textContent='Your player record is up to date.';
  else status.textContent=attempts.length?'Your attempts are saved on this device. Join to add them to your player record.':'';
  status.hidden=!status.textContent;
  renderHistory(attempts);
 }
 edit.addEventListener('click',()=>{editing=true;message='';input.value=getPlayer()?.displayName||'';renderProfile();input.focus();});
 cancel.addEventListener('click',()=>{editing=false;message='';renderProfile();edit.focus();});
 input.addEventListener('input',()=>input.setCustomValidity(''));
 form.addEventListener('submit',async event=>{
  event.preventDefault();const value=input.value.trim().replace(/\s+/g,' ');
  if(!namePattern.test(value)||!/[\p{L}\p{N}]/u.test(value)){input.setCustomValidity('Use 2–32 letters, numbers, spaces, apostrophes, hyphens, dots or underscores.');input.reportValidity();return;}
  busy=true;message='';renderProfile();
  try{await joinPlayer(value);editing=false;message='';if(boardLoaded)void loadBoard();}
  catch(error){message=error?.message||'Your name could not be saved yet. Try again.';}
  finally{busy=false;renderProfile();if(!message)name.focus?.();}
 });
 retry.addEventListener('click',async()=>{
  busy=true;message='';renderProfile();
  try{await syncPlayer();if(boardLoaded)void loadBoard();}catch{message='Your online record is still waiting to sync. Try again when connected.';}
  finally{busy=false;renderProfile();}
 });
 more.addEventListener('click',()=>{historyLimit+=20;renderHistory(getAttempts());});
 const leaveDialog=node('dialog',undefined,'player-leave-dialog');leaveDialog.setAttribute('aria-labelledby','playerLeaveTitle');
 const leaveTitle=node('h3','Leave the leaderboard?');leaveTitle.id='playerLeaveTitle';
 const leaveText=node('p','Your public entry will be removed. Attempts already saved remain privately with the GREGoR Puzzles team. Your history stays on this device.');
 const leaveActions=node('div',undefined,'player-dialog-actions'),keep=button('Keep playing','home-secondary'),confirm=button('Leave leaderboard','home-primary');
 leaveActions.append(keep,confirm);leaveDialog.append(leaveTitle,leaveText,leaveActions);host.append(leaveDialog);
 leave.addEventListener('click',()=>leaveDialog.showModal());keep.addEventListener('click',()=>leaveDialog.close());
 confirm.addEventListener('click',async()=>{
  leaveDialog.close();busy=true;message='';renderProfile();
  try{await leaveLeaderboard();message='You have left the public leaderboard.';if(boardLoaded)void loadBoard();}
  catch{message='Removal is waiting to sync. Your public entry may remain visible until it is confirmed.';}
  finally{editing=false;busy=false;renderProfile();}
 });

 const selection=$('leaderboardRound');
 selection.replaceChildren(new Option('Overall progress','overall'),...catalogue.map(round=>new Option(`${round.number} · ${round.topic}`,round.number)));
 let players=[],boardState='loading',boardLimit=10,loading=false,refreshQueued=false;
 function renderBoard(){
  const result=$('leaderboardResults');result.replaceChildren();
  const round=catalogue.find(round=>round.number===selection.value)??catalogue[0];
  $('timedPlay').href=`./play.html?level=${round.number}&mode=timed`;
  $('refreshLeaderboard').disabled=loading;
  if(boardState==='loading'){result.append(node('p','Loading the leaderboard…','board-loading'));return;}
  if(boardState==='error'){
   const empty=node('div',undefined,'leaderboard-empty');empty.append(node('h4','The leaderboard is taking a break.'),node('p','Your attempts are still saved on this device. Try refreshing the standings.'));
   const again=button('Try again');again.addEventListener('click',loadBoard);empty.append(again);result.append(empty);return;
  }
  const ranked=rankPlayers(players,selection.value,catalogue.length);
  if(!ranked.length){
   if(selection.value==='overall'){
    result.append(node('p','Play a timed round to join the rankings.','leaderboard-ranking-invite'),sampleEntry());return;
   }
   const empty=node('div',undefined,'leaderboard-empty');
   empty.append(node('h4','Set the first time.'),node('p','Finish this round in Timed mode while joined to the leaderboard.'));
   result.append(empty);return;
  }
  const table=node('table',undefined,'leaderboard-table player-table');table.setAttribute('aria-label',selection.value==='overall'?'Overall player standings':`Round ${selection.value} best times`);
  const head=node('thead'),headRow=node('tr');
  const columns=selection.value==='overall'?['Rank','Player','Rounds','Attempts','Best total']:['Rank','Player','Best time'];
  for(const title of columns){const th=node('th',title);th.scope='col';headRow.append(th);}head.append(headRow);
  const body=node('tbody'),current=getPlayer();
  for(const player of ranked.slice(0,boardLimit)){
   const row=node('tr');if(current?.joined&&player.id===current.id)row.classList.add('is-you');
   const playerCell=node('th',undefined,'player-name-cell');playerCell.scope='row';playerCell.append(node('span',player.displayName));
   if(current?.joined&&player.id===current.id)playerCell.append(node('span','You','player-you'));
   const activityAt=selection.value==='overall'?player.latestAt:player.best.find(entry=>entry.roundNumber===selection.value)?.completedAt;
   const activityText=playerDateTime(activityAt);
   if(activityText){
    const dateLine=node('small',undefined,'player-activity-date'),time=node('time',activityText);time.dateTime=activityAt;
    dateLine.append(document.createTextNode(selection.value==='overall'?'Latest attempt · ':'Completed · '),time);playerCell.append(dateLine);
   }
   row.append(node('td',String(player.rank),'player-rank'),playerCell);
   if(selection.value==='overall'){
    const rounds=node('td',undefined,'player-round-count');rounds.append(node('strong',`${player.roundsCompleted}/${catalogue.length}`),node('small',`${player.roundsPlayed} played`));
    const total=node('td',undefined,'score-time');total.append(node('span',playerTime(player.totalBestSeconds)),node('small',`${player.timedRounds}/${catalogue.length} timed`));
    row.append(rounds,node('td',String(player.attempts),'player-attempt-count'),total);
   }else{
    const best=player.best.find(entry=>entry.roundNumber===selection.value),time=node('td',undefined,'score-time');time.append(node('span',playerTime(best.seconds)));
    const assists=assistance(best);if(assists)time.append(node('small',assists,'score-assists'));row.append(time);
   }
   body.append(row);
  }
  table.append(head,body);const scroll=node('div',undefined,'player-table-wrap');scroll.append(table);result.append(scroll);
  if(body.querySelector('time'))result.append(node('p','Dates and times are shown in your local time zone.','player-timezone-note'));
  if(ranked.length>boardLimit){const morePlayers=button(`Show ${Math.min(10,ranked.length-boardLimit)} more players`);morePlayers.addEventListener('click',()=>{boardLimit+=10;renderBoard();});result.append(morePlayers);}
  if(selection.value==='overall')result.append(sampleEntry());
 }
 async function loadBoard(){
  if(loading){refreshQueued=true;return;}
  loading=true;boardLoaded=true;boardState='loading';renderBoard();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
  try{
   const url=new URL(SUGGESTION_ENDPOINT);url.searchParams.set('action','leaderboard');
   const response=await fetch(url,{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error('Unavailable');
   const data=await response.json();players=publicPlayers(data,catalogue);boardState='ready';
   const date=new Date(data.updatedAt);$('leaderboardUpdated').hidden=!Number.isFinite(date.getTime());
   if(Number.isFinite(date.getTime()))$('leaderboardUpdated').textContent=`Updated ${new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(date)}`;
  }catch{boardState='error';$('leaderboardUpdated').hidden=true;}
  finally{clearTimeout(timeout);loading=false;renderBoard();if(refreshQueued){refreshQueued=false;void loadBoard();}}
 }
 selection.addEventListener('change',()=>{boardLimit=10;renderBoard();});
 $('refreshLeaderboard').addEventListener('click',loadBoard);
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();void loadBoard();}},{rootMargin:'250px'});observer.observe($('leaderboard'));}
 else void loadBoard();
 let lastSyncing=false,refreshTimer;
 const changed=()=>{
  renderProfile();const state=getPlayerStatus();
  if(lastSyncing&&!state.syncing&&!state.error&&boardLoaded){clearTimeout(refreshTimer);refreshTimer=setTimeout(loadBoard,500);}
  lastSyncing=Boolean(state.syncing);
 };
 window.addEventListener('gregor-player-change',changed);
 const resumeSync=()=>{void syncPlayer().catch(()=>{});};
 window.addEventListener('pageshow',()=>{changed();resumeSync();if(boardLoaded)void loadBoard();if(history.open){clearInterval(historyClock);historyClock=setInterval(updateHistoryClocks,1000);}});
 window.addEventListener('pagehide',()=>{clearInterval(historyClock);clearTimeout(refreshTimer);});
 window.addEventListener('storage',changed);
 renderProfile();
 resumeSync();
}

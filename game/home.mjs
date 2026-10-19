import {renderSite} from './site.mjs';
import {initSuggestionForm} from './suggestions.mjs';
import {catalogue} from './home-data.mjs';
import {legacyPlayURL,homeProgress,homeDestination} from './home-state.mjs';
import {initHomeDemo} from './home-demo.mjs';

const legacy=legacyPlayURL(location.search,location.hash);
if(legacy)location.replace(legacy);
else initHome();

function initHome(){
 const $=id=>document.getElementById(id);
 const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
 const external=(a,href)=>{a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;};
 const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
 const saved=round=>{try{return JSON.parse(read(round.saveKey));}catch{return null;}};
 const playURL=(round,timed=false)=>`./play.html?level=${round.number}${timed?'&mode=timed':''}`;
 renderSite({active:'home',roundNumber:catalogue[0].number});
 initSuggestionForm();
 // The demo is independent of saved game progress and never names the answer.
 if(catalogue.some(round=>round.number==='01'))initHomeDemo();
 else $('homeDemo')?.closest('figure')?.remove();
 $('roundCount').textContent=catalogue.length;
 const allowed=new Set(catalogue.map(round=>round.number));
 document.querySelectorAll('.featured-card').forEach(card=>{
  const number=new URL(card.href).searchParams.get('level');
  if(!allowed.has(number))card.remove();
 });
 function progress(){
  const destination=homeDestination(homeProgress(catalogue,read));
  $('homePlay').href=destination.href;
  $('homePlay').replaceChildren(document.createTextNode(destination.label),node('span','→'));
  $('homePlay').lastElementChild.setAttribute('aria-hidden','true');
  $('homeProgress').textContent=destination.detail;
  $('playTab').href=destination.href;
 }
 progress();
 window.addEventListener('pageshow',()=>{progress();if(community)refreshEligibility();});
 window.addEventListener('storage',()=>{progress();if(community)refreshEligibility();});
 const openSuggestion=()=>{if(location.hash==='#suggest')$('suggestionDisclosure').open=true;};
 openSuggestion();window.addEventListener('hashchange',openSuggestion);
 document.querySelectorAll('a[href="#suggest"]').forEach(link=>link.addEventListener('click',()=>{$('suggestionDisclosure').open=true;}));
 let mapPromise;
 $('homeMapDisclosure').addEventListener('toggle',()=>{
  if($('homeMapDisclosure').open&&!mapPromise)mapPromise=import('./home-map.mjs').then(({initHomeMap})=>initHomeMap(catalogue)).catch(()=>{mapPromise=null;});
 });

 const select=$('leaderboardRound');
 select.replaceChildren(...catalogue.map(round=>{const opt=node('option',`${round.number} · ${round.topic}`);opt.value=round.number;return opt;}));
 let scores=[],boardState='loading',expanded=false,community,available=[];
 let communityPromise;
 const getCommunity=()=>communityPromise??=(import('./community.mjs').then(module=>{community=module;refreshEligibility();return module;}).catch(error=>{communityPromise=null;throw error;}));
 function refreshEligibility(){
  if(!community)return;
  available=catalogue.flatMap(round=>{const score=community.eligibleScore(round,saved(round));return score?[{round,score}]:[];});
  $('showScore').hidden=!available.length;
  $('scoreRequirement').hidden=!available.length;
 }
 function renderBoard(){
  const round=catalogue.find(r=>r.number===select.value)??catalogue[0];
  $('timedPlay').href=playURL(round,true);
  const host=$('leaderboardResults');host.replaceChildren();
  if(boardState==='loading'){host.append(node('p','Loading community times…','board-loading'));return;}
  if(boardState==='error'){
   const empty=node('div',undefined,'leaderboard-empty');
   empty.append(node('h4','Times are unavailable right now.'),node('p','You can still play a timed round.'));
   const retry=node('button','Try again','home-text-button');retry.type='button';retry.addEventListener('click',loadBoard);empty.append(retry);host.append(empty);return;
  }
  const ranked=community.rankScores(scores,round.number).slice(0,10);
  if(!ranked.length){
   const empty=node('div',undefined,'leaderboard-empty');
   empty.append(node('h4','Set the first time.'),node('p','Complete a timed round to open this leaderboard.'));host.append(empty);return;
  }
  const table=node('table',undefined,'leaderboard-table');table.setAttribute('aria-label',`Round ${round.number} community leaderboard`);
  const head=node('thead'),headRow=node('tr');
  for(const label of ['Rank','Player','Time']){const th=node('th',label);th.scope='col';headRow.append(th);}head.append(headRow);
  const body=node('tbody');
  for(const score of ranked.slice(0,expanded?10:3)){
   const tr=node('tr'),player=node('td'),time=node('td',undefined,'score-time');
   player.append(external(node('a',score.login),score.url));time.append(node('span',community.formatTime(score.seconds)));
   const assists=[];if(score.hints)assists.push(`${score.hints} hint${score.hints===1?'':'s'}`);if(score.peeks)assists.push(`${score.peeks} reference view${score.peeks===1?'':'s'}`);
   if(assists.length)time.append(node('span',assists.join(' · '),'score-assists'));
   tr.append(node('td',score.rank),player,time);body.append(tr);
  }
  table.append(head,body);host.append(table);
  if(ranked.length>3){const toggle=node('button',expanded?'Show top three':`View all ${ranked.length} times`,'home-text-button');toggle.type='button';toggle.setAttribute('aria-expanded',String(expanded));toggle.addEventListener('click',()=>{expanded=!expanded;renderBoard();host.querySelector('button')?.focus();});host.append(toggle);}
 }
 let loading=false;
 async function loadBoard(){
  if(loading)return;loading=true;boardState='loading';renderBoard();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try{
   const [response]=await Promise.all([fetch('./leaderboard.json',{cache:'no-cache',signal:controller.signal}),getCommunity()]);
   if(!response.ok)throw Error('unavailable');const data=await response.json();
   if(data.version!==1||!Array.isArray(data.scores))throw Error('invalid snapshot');
   scores=data.scores;boardState='ready';refreshEligibility();
   if(scores.length&&data.updatedAt&&Number.isFinite(Date.parse(data.updatedAt))){$('leaderboardUpdated').textContent=`Updated ${new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(new Date(data.updatedAt))} · Reviewed submissions`;$('leaderboardUpdated').hidden=false;}
   else $('leaderboardUpdated').hidden=true;
  }catch{boardState='error';$('leaderboardUpdated').hidden=true;}
  finally{clearTimeout(timeout);loading=false;}
  renderBoard();
 }
 select.addEventListener('change',()=>{expanded=false;renderBoard();});
 // Community data is secondary to the playable first impression.
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();void loadBoard();}},{rootMargin:'250px'});observer.observe($('leaderboard'));}
 else void loadBoard();
 $('showScore').addEventListener('click',()=>{
  refreshEligibility();const host=$('scoreChoices');host.replaceChildren();
  if(!available.length){host.append(node('p','Finish a timed round to submit a result.','score-none'));return;}
  for(const {round,score} of available){
   const row=node('div',undefined,'score-choice'),text=node('div');
   text.append(node('strong',`Round ${round.number} · ${round.topic}`),node('p',`${community.formatTime(score.seconds)} · ${score.hints} hints · ${score.peeks} reference views`));
   row.append(text,external(node('a','Review on GitHub ↗','home-secondary'),community.scoreIssueURL(score)));host.append(row);
  }
  $('scoreDialog').showModal();
 });
 $('closeScore').addEventListener('click',()=>$('scoreDialog').close());
}

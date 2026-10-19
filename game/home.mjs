import {renderSite} from './site.mjs';
import {rounds,saveKey} from './rounds.mjs';
import {collectionProgress} from './collection.mjs';
import {pathFor,SIZE} from './engine.mjs';
import {legacyPlayURL,nextHomeRound} from './home-state.mjs';
import {eligibleScore,formatTime,scoreIssueURL,suggestionIssueURL,rankScores} from './community.mjs';

const legacy=legacyPlayURL(location.search,location.hash);
if(legacy)location.replace(legacy);
else initHome();
function initHome(){
 const $=id=>document.getElementById(id);
 const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
 const external=(a,href)=>{a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;};
 const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
 const saved=round=>{try{return JSON.parse(read(saveKey(round)));}catch{return null;}};
 const playURL=(round,timed=false)=>`./play.html?level=${round.number}${timed?'&mode=timed':''}`;
 renderSite({active:'home'});
 $('roundCount').textContent=rounds.length;
 function progress(){
  const items=collectionProgress(read),next=nextHomeRound(items),done=items.filter(item=>item.done).length;
  $('homePlay').href=playURL(next.round);
  $('homePlay').replaceChildren(document.createTextNode(next.pieces&&!next.done?'Continue playing':'Play'),node('span','↗'));
  $('homePlay').lastElementChild.setAttribute('aria-hidden','true');
  $('homeProgress').textContent=done===items.length?'Every round complete. Revisit a favorite or try a timed round.':done||next.pieces?`${done} of ${items.length} rounds complete · Progress saved in this browser.`:'No account needed. Just bring your curiosity.';
 }
 progress();window.addEventListener('pageshow',progress);window.addEventListener('storage',progress);
 const select=$('leaderboardRound');select.replaceChildren(...rounds.map(round=>{const opt=node('option',`${round.number} · ${round.topic}`);opt.value=round.number;return opt;}));
 let scores=[],boardState='loading';
 function renderBoard(){
  const round=rounds.find(r=>r.number===select.value)??rounds[0];$('timedPlay').href=playURL(round,true);
  const host=$('leaderboardResults');host.replaceChildren();
  if(boardState==='loading'){host.append(node('p','Loading the leaderboard…','board-loading'));return;}
  if(boardState==='error'){const empty=node('div',undefined,'leaderboard-empty');empty.append(node('h4','Taking a short break.'),node('p','The leaderboard could not load. You can still play and submit a time.'));const retry=node('button','Try again','home-text-button');retry.addEventListener('click',loadBoard);empty.append(retry);host.append(empty);return;}
  const ranked=rankScores(scores,round.number).slice(0,10);
  if(!ranked.length){const empty=node('div',undefined,'leaderboard-empty'),podium=node('div',undefined,'empty-podium');podium.setAttribute('aria-hidden','true');podium.append(node('span'),node('span'),node('span'));empty.append(podium,node('h4','First place is open.'),node('p','Finish a timed puzzle and submit your time to start the board.'));host.append(empty);return;}
  const table=node('table',undefined,'leaderboard-table');table.setAttribute('aria-label',`Round ${round.number} community leaderboard`);const head=node('thead'),headRow=node('tr');for(const label of ['Rank','Player','Time']){const th=node('th',label);th.scope='col';headRow.append(th);}head.append(headRow);const body=node('tbody');
  for(const score of ranked){const tr=node('tr'),player=node('td'),time=node('td',undefined,'score-time');player.append(external(node('a',score.login),score.url));time.append(node('span',formatTime(score.seconds)));const assists=[];if(score.hints)assists.push(`${score.hints} hint${score.hints===1?'':'s'}`);if(score.peeks)assists.push(`${score.peeks} reference view${score.peeks===1?'':'s'}`);if(assists.length)time.append(node('span',assists.join(' · '),'score-assists'));tr.append(node('td',score.rank),player,time);body.append(tr);}table.append(head,body);host.append(table);
 }
 async function loadBoard(){boardState='loading';renderBoard();const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);try{const response=await fetch('./leaderboard.json',{cache:'no-cache',signal:controller.signal});if(!response.ok)throw Error('unavailable');const data=await response.json();if(data.version!==1||!Array.isArray(data.scores))throw Error('invalid snapshot');scores=data.scores;boardState='ready';if(data.updatedAt&&Number.isFinite(Date.parse(data.updatedAt))){$('leaderboardUpdated').textContent=`Updated ${new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(data.updatedAt))} · Reviewed submissions`;$('leaderboardUpdated').hidden=false;}}catch{boardState='error';$('leaderboardUpdated').hidden=true;}finally{clearTimeout(timeout);}renderBoard();}
 select.addEventListener('change',renderBoard);void loadBoard();
 $('showScore').addEventListener('click',()=>{
  const host=$('scoreChoices');host.replaceChildren();
  const available=rounds.flatMap(round=>{const score=eligibleScore(round,saved(round));return score?[{round,score}]:[];});
  if(!available.length){host.append(node('p','No eligible times yet. Choose Timed mode and place all 12 pieces. Completing a round with a gene answer does not qualify.','score-none'));const start=node('a','Play a timed round →','home-secondary');start.href=$('timedPlay').href;host.append(start);}
  for(const {round,score} of available){const row=node('div',undefined,'score-choice'),text=node('div');text.append(node('strong',`Round ${round.number} · ${round.topic}`),node('p',`${formatTime(score.seconds)} · ${score.hints} hints · ${score.peeks} reference views`));row.append(text,external(node('a','Review on GitHub ↗','home-secondary'),scoreIssueURL(score)));host.append(row);}
  $('scoreDialog').showModal();
 });
 $('closeScore').addEventListener('click',()=>$('scoreDialog').close());
 $('suggestionForm').addEventListener('submit',event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget));try{const href=suggestionIssueURL(values);const link=external(node('a','Open your suggestion on GitHub ↗'),href);$('suggestionStatus').replaceChildren(document.createTextNode('Your draft is ready. '),link);window.open(href,'_blank','noopener,noreferrer');}catch(error){$('suggestionStatus').textContent=error.message||'Check the fields and try again.';}});
 // One short assembly, never a looping distraction. The same geometry as play.
 const svg=$('heroPuzzle'),ns='http://www.w3.org/2000/svg';
 const imageURL=$('heroFallback').getAttribute('src');
 function preview(){svg.replaceChildren();const defs=document.createElementNS(ns,'defs');svg.append(defs);for(let i=0;i<SIZE;i++){const path=pathFor(i),clip=document.createElementNS(ns,'clipPath');clip.id=`home-piece-${i}`;const outline=document.createElementNS(ns,'path');outline.setAttribute('d',path);clip.append(outline);defs.append(clip);const group=document.createElementNS(ns,'g');group.classList.add('hero-piece');group.style.setProperty('--i',String((i*5)%12));group.style.setProperty('--x',`${(i%4-1.5)*28}px`);group.style.setProperty('--y',`${(Math.floor(i/4)-1)*25}px`);group.style.setProperty('--rotation',`${i%2?5:-5}deg`);const image=document.createElementNS(ns,'image');image.setAttribute('href',imageURL);image.setAttribute('width','800');image.setAttribute('height','600');image.setAttribute('preserveAspectRatio','none');image.setAttribute('clip-path',`url(#home-piece-${i})`);const seam=document.createElementNS(ns,'path');seam.setAttribute('d',path);seam.classList.add('hero-piece-outline');group.append(image,seam);svg.append(group);}svg.removeAttribute('hidden');$('heroFallback').hidden=true;$('replayPreview').hidden=false;}
 if($('heroFallback').complete&&$('heroFallback').naturalWidth)preview();else $('heroFallback').addEventListener('load',preview,{once:true});
 $('replayPreview').addEventListener('click',preview);
}

import {COLS,SIZE,W,H,CW,CH,pathFor,newState,place,guess,complete,shuffled} from './engine.mjs';
import {rounds,findRound,saveKey} from './rounds.mjs';
import {collectionProgress,roundLink} from './collection.mjs';
const round=findRound(new URLSearchParams(location.search).get('level') ?? '01');
const {checkpoints,pieces:pieceDescriptions,description:diagramDescription}=round;
import {restoreSession,choosePiece,elapsedSeconds,startRound,finishRound,pendingCheckpoint,answerCheckpoint,roundComplete} from './session.mjs';

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg', KEY = saveKey(round);
let stored;
try { stored = JSON.parse(localStorage.getItem(KEY)); } catch {}
let {state,timed} = restoreSession(stored);
let selected = null, hinted = null, peek = false, drag = null, reviewId = null;
let order = shuffled(Array.from({length:SIZE},(_,i)=>i));
let lastCount = -1, renderedCheck = null;
const board = $('puzzle');
const currentCheck = () => reviewId ?? pendingCheckpoint(state);
const save = () => { try {localStorage.setItem(KEY,JSON.stringify({state,timed}));$('saveNotice').hidden=true;} catch {$('saveNotice').hidden=false;} renderCollection(); };
const announce = text => {$('status').textContent = text;};
const focus = id => $(id).focus({preventScroll:false});
function start(useRoute = 'image') { startRound(state,timed,useRoute); save(); updateMode(); }
function svgEl(tag,attrs={}) { const node=document.createElementNS(NS,tag); Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v)); return node; }
function artworkPiece(id,prefix) {
  const g=svgEl('g'), clip=svgEl('clipPath',{id:prefix+id});
  clip.append(svgEl('path',{d:pathFor(id)})); const defs=svgEl('defs'); defs.append(clip); g.append(defs);
  g.append(svgEl('image',{href:round.artwork,width:W,height:H,'clip-path':`url(#${prefix+id})`}));
  g.append(svgEl('path',{d:pathFor(id),class:'piece-outline'})); return g;
}
function buildBoard() {
  board.replaceChildren();
  for(let i=0;i<SIZE;i++) {
    const g=svgEl('g',{'data-slot':i});
    const slot=svgEl('path',{d:pathFor(i),class:'slot',tabindex:'0',role:'button','aria-label':`Board position, row ${Math.floor(i/COLS)+1}, column ${i%COLS+1}`});
    slot.addEventListener('click',()=>attempt(i));
    slot.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();attempt(i);}});
    g.append(slot); board.append(g);
  }
}
function buildTray() {
  const tray=$('tray'); tray.replaceChildren();
  order.forEach((id,index)=>{
    const b=document.createElement('button'); b.className='piece'; b.dataset.piece=id;
    b.setAttribute('aria-label',`Piece ${String.fromCharCode(65+index)}: ${pieceDescriptions[id]}`);
    b.setAttribute('aria-pressed','false');
    const x=id%COLS*CW, y=Math.floor(id/COLS)*CH;
    const svg=svgEl('svg',{viewBox:`${x-48} ${y-48} ${CW+96} ${CH+96}`,'aria-hidden':'true'});
    svg.append(artworkPiece(id,'tray-')); b.append(svg);
    b.addEventListener('click',()=>{if(b.dataset.suppress==='1'){delete b.dataset.suppress;return;}select(id);});
    b.addEventListener('pointerdown',e=>startDrag(e,id,b)); tray.append(b);
  });
}
function select(id) {
  if(complete(state))return;
  if(currentCheck()){focus('checkpointTitle');return;}
  start(); ({selected,hinted}=choosePiece(selected,id)); updateSelection();
  announce(selected===null?'Selection cleared.':`Selected ${pieceDescriptions[id]}. Choose its place on the board.`);
}
function updateSelection() {
  $('board').classList.toggle('started',state.placed.length>0||peek||selected!==null);
  document.querySelectorAll('.piece').forEach(b=>{
    b.setAttribute('aria-pressed',String(Number(b.dataset.piece)===selected));
    b.classList.toggle('hinted',Number(b.dataset.piece)===hinted);
  });
  document.querySelectorAll('.slot').forEach((slot,i)=>slot.classList.toggle('hinted',i===hinted));
}
function progressMessage(before) {
  const unlocked=round.clues.filter(c=>c.at>before&&c.at<=state.placed.length);
  return `${state.placed.length} of ${SIZE} pieces. `+unlocked.map(c=>`${c.label}: ${c.title}. ${c.body}`).join(' ');
}
function afterProgress(before) {
  finishRound(state); render(); save();
  announce(progressMessage(before)+(currentCheck()?' Connect the clues in the learning question.':roundComplete(state)?' Round complete.':''));
  if(currentCheck()) focus('checkpointTitle');
  else if(roundComplete(state)) focus('nextRound');
  else $('tray').querySelector('.piece:not(.placed)')?.focus({preventScroll:true});
}
function attempt(slot) {
  if(currentCheck()){focus('checkpointTitle');return;}
  if(selected===null){announce('First select a piece from the tray.');return;}
  start(); const before=state.placed.length;
  if(!place(state,selected,slot)){announce('That connection does not fit yet. Try another place.');return;}
  selected=null; hinted=null; afterProgress(before);
}
function startDrag(e,id,b) {
  if(e.button!==0||state.placed.includes(id)||currentCheck())return;
  drag={id,b,x:e.clientX,y:e.clientY,moved:false,pointer:e.pointerId}; b.setPointerCapture(e.pointerId);
}
window.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointer)return;
  const d=drag; if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<7)return;
  if(!d.moved){
    d.moved=true; start(); selected=d.id; hinted=null; d.b.classList.add('dragging');
    d.ghost=d.b.querySelector('svg').cloneNode(true);
    d.ghost.querySelectorAll('[id]').forEach(el=>el.id='drag-'+el.id);
    d.ghost.querySelectorAll('[clip-path]').forEach(el=>el.setAttribute('clip-path',el.getAttribute('clip-path').replace('#','#drag-')));
    d.ghost.classList.add('drag-ghost'); const rect=board.getBoundingClientRect();
    d.width=rect.width*(CW+96)/W; d.height=rect.height*(CH+96)/H;
    Object.assign(d.ghost.style,{width:d.width+'px',height:d.height+'px'}); document.body.append(d.ghost); updateSelection();
  }
  d.ghost.style.left=e.clientX-d.width/2+'px'; d.ghost.style.top=e.clientY-d.height/2+'px';
});
function endDrag(e,cancelled=false) {
  if(!drag||e.pointerId!==drag.pointer)return;
  const d=drag; drag=null; d.b.classList.remove('dragging'); d.ghost?.remove();
  if(!d.moved)return;
  d.b.dataset.suppress='1'; setTimeout(()=>delete d.b.dataset.suppress,0);
  if(!cancelled){
    const rect=board.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*W,y=(e.clientY-rect.top)/rect.height*H;
    const cx=(d.id%COLS+.5)*CW,cy=(Math.floor(d.id/COLS)+.5)*CH;
    if(Math.hypot(x-cx,y-cy)<Math.min(CW,CH)*.57)attempt(d.id);
    else announce('Bring the center of the piece closer to its place. You can also click to place it.');
  }
}
window.addEventListener('pointerup',e=>endDrag(e));
window.addEventListener('pointercancel',e=>endDrag(e,true));
function answerButtons(container,options,handler) {
  container.replaceChildren();
  options.forEach((text,i)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.dataset.option=i;b.onclick=()=>handler(i,b);container.append(b);});
}
function renderCheckpoint() {
  const id=currentCheck(); $('checkpoint').hidden=!id;
  if(!id){renderedCheck=null;return;}
  const q=checkpoints[id], answered=state.answers.includes(id);
  if(renderedCheck!==id){
    renderedCheck=id; $('checkpointTitle').textContent=q.title; $('checkpointContext').textContent=q.context;
    $('checkpointQuestion').textContent=q.question; $('checkpointSource').href=q.source; $('checkpointFeedback').textContent='';
    answerButtons($('checkpointOptions'),q.options,(answer,b)=>{
      start(); const right=answerCheckpoint(state,id,answer,q);
      $('checkpointFeedback').textContent=(right?'Correct. ':'Not quite. ')+q.explanation+(right?'':' Choose the answer that follows this explanation.');
      if(right){reviewId=id;finishRound(state);save();render();focus('checkpointContinue');}
      else {b.setAttribute('aria-pressed','true');}
    });
  }
  $('checkpointContinue').hidden=!answered;
  $('checkpointOptions').querySelectorAll('button').forEach((b,i)=>{b.disabled=answered;b.classList.toggle('correct',answered&&i===q.correct);});
}
function updateMode() {
  $('calm').setAttribute('aria-pressed',String(!timed)); $('timed').setAttribute('aria-pressed',String(timed));
  $('calm').disabled=state.started; $('timed').disabled=state.started;
  $('timerPolicy').textContent=timed?'Elapsed time includes reloads, background tabs, and instructions. Finish the picture and both questions to stop it.':state.started?'Practice mode · take your time. Restart to choose a timed round.':'Practice at your own pace. Choose a mode before you begin.';
  $('clock').hidden=!timed; $('clock').textContent=formatTime(elapsedSeconds(state));
}
function render() {
  const n=state.placed.length, pictureDone=complete(state), done=roundComplete(state)&&!reviewId;
  $('board').classList.toggle('started',n>0||peek); $('board').classList.toggle('completed',pictureDone);
  for(let i=0;i<SIZE;i++){
    const slot=board.querySelector(`[data-slot="${i}"]`),isPlaced=state.placed.includes(i),button=slot.querySelector('.slot');
    button.style.display=isPlaced?'none':''; button.setAttribute('aria-disabled',String(Boolean(currentCheck())));
    if(isPlaced&&!slot.querySelector('.piece-on-board')){const g=artworkPiece(i,'board-');g.setAttribute('class','piece-on-board');g.setAttribute('aria-hidden','true');slot.append(g);}
  }
  if(pictureDone)board.setAttribute('aria-label','Completed diagram. '+diagramDescription);
  document.querySelectorAll('.piece').forEach(b=>{const placed=state.placed.includes(Number(b.dataset.piece));b.classList.toggle('placed',placed);b.disabled=placed||Boolean(currentCheck());});
  $('remainingCount').textContent=`${SIZE-n} remaining`; $('pieceBank').hidden=pictureDone;
  $('progressText').textContent=`${n} of ${SIZE} pieces`; $('progressPercent').textContent=Math.round(n/SIZE*100)+'%';
  $('progressFill').style.width=n/SIZE*100+'%'; document.querySelector('.progress-track').setAttribute('aria-valuenow',n);
  if(n!==lastCount){
    $('clues').replaceChildren();
    round.clues.forEach((clue,i)=>{
      const open=n>=clue.at,li=document.createElement('li'); li.className=`clue ${open?'unlocked':'locked'} ${i>=4?'final':''}`;
      li.innerHTML=`<span class="clue-number" aria-hidden="true">${open?'✓':String(i+1).padStart(2,'0')}</span><div class="clue-content"><span class="clue-label">${clue.label}</span>${open?`<h3>${clue.title}</h3><p>${clue.body}</p>`:`<p class="unlock">Unlocks at ${clue.at} pieces</p>`}</div>`;
      $('clues').append(li);
    });lastCount=n;
  }
  $('completion').hidden=!done; $('discoveryDetail').hidden=!pictureDone; $('guessForm').hidden=pictureDone;
  $('hint').disabled=pictureDone||Boolean(currentCheck()); $('peek').disabled=pictureDone;
  $('learningStatus').textContent=`${state.answers.length} of 2 learning questions completed.`;
  if(pictureDone){peek=false;$('reference').hidden=true;$('peek').setAttribute('aria-pressed','false');}
  if(done){
    $('completionText').textContent='You completed the picture and both learning questions. Explore the gene–condition relationship below, or continue to another round.';
    const routeLabel=state.solvedByGuess?'Gene recognition':state.usedRoutes.includes('legacy')?'Restored progress':'Image puzzle';
    $('roundResults').replaceChildren();
    for(const [label,value] of [['Mode',timed?'Timed · '+formatTime(elapsedSeconds(state)):'Practice'],['Route',routeLabel],['Hints',String(state.hints)],['Image reveals',String(state.peeks)]]){
      const group=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;group.append(dt,dd);$('roundResults').append(group);
    }
  }
  updateMode();updateSelection();renderCheckpoint();
}
function formatTime(s) {return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;}
setInterval(()=>{if(timed)$('clock').textContent=formatTime(elapsedSeconds(state));},1000);
$('calm').onclick=()=>{if(!state.started){timed=false;render();save();}};
$('timed').onclick=()=>{if(!state.started){timed=true;render();save();}};
$('peek').onclick=()=>{start('image');peek=!peek;if(peek)state.peeks++;$('reference').hidden=!peek;$('peek').setAttribute('aria-pressed',String(peek));$('board').classList.toggle('started',state.placed.length>0||peek);announce(peek?'Reference image visible. '+diagramDescription:'Reference image hidden.');save();};
$('hint').onclick=()=>{start('image');hinted=selected??order.find(id=>!state.placed.includes(id));selected=hinted;state.hints++;updateSelection();announce(`Hint: place the highlighted piece in row ${Math.floor(hinted/COLS)+1}, column ${hinted%COLS+1}.`);save();};
$('guessForm').onsubmit=e=>{
  e.preventDefault();if(!$('geneGuess').value.trim()){$('guessFeedback').textContent='Enter a gene symbol first.';return;}
  start('guess');const before=state.placed.length;
  if(guess(state,$('geneGuess').value,round.gene)){selected=null;hinted=null;afterProgress(before);}
  else {$('guessFeedback').textContent='That is not the gene for this round. Keep exploring the clues.';$('geneGuess').setAttribute('aria-invalid','true');}
};
$('geneGuess').addEventListener('input',()=>$('geneGuess').removeAttribute('aria-invalid'));
$('checkpointContinue').onclick=()=>{
  reviewId=null;render();save();
  if(currentCheck())focus('checkpointTitle');else if(roundComplete(state))focus('nextRound');else $('tray').querySelector('.piece:not(.placed)')?.focus();
};
$('libraryButton').onclick=()=>{renderCollection();$('libraryDialog').showModal();};
$('closeLibrary').onclick=()=>$('libraryDialog').close();
$('collectionReview').onclick=()=>{renderCollection();$('libraryDialog').showModal();};
$('helpButton').onclick=()=>$('helpDialog').showModal();$('startButton').onclick=()=>$('helpDialog').close();document.querySelector('#helpDialog .dialog-close').onclick=()=>$('helpDialog').close();
$('restart').onclick=()=>$('restartDialog').showModal();$('cancelRestart').onclick=()=>$('restartDialog').close();
$('confirmRestart').onclick=()=>{
  state=newState();selected=null;hinted=null;peek=false;reviewId=null;renderedCheck=null;lastCount=-1;order=shuffled(order);
  $('reference').hidden=true;$('peek').setAttribute('aria-pressed','false');$('geneGuess').value='';$('geneGuess').removeAttribute('aria-invalid');
  $('guessFeedback').textContent='A correct answer completes the picture. Finish both questions to complete the round.';
  board.setAttribute('aria-label','Puzzle board, three rows and four columns');buildBoard();buildTray();render();save();$('restartDialog').close();
  announce('New round. Choose Practice or Timed, then begin.');focus('calm');
};
window.addEventListener('keydown',e=>{if(e.key==='Escape'){selected=null;hinted=null;updateSelection();}});
$('learnButton').onclick=()=>{$('discoveryTitle').setAttribute('tabindex','-1');focus('discoveryTitle');};
document.title=`Round ${round.number} · GREGoR Puzzles`;
$('roundCrumb').textContent=`Round ${round.number}`;
$('roundLabel').textContent=`ROUND ${round.number} / 10`;
$('roundTitle').textContent=round.title;
$('figureLabel').textContent=`FIG. ${round.number} / ${round.topic.toUpperCase()}`;
$('reference').src=round.artwork; $('reference').alt=diagramDescription;
$('biologySummary').textContent=round.summary;
$('sourceNote').textContent=round.sourceNote;
$('variantText').textContent=round.variant;
$('inheritanceText').textContent=round.inheritance;
$('discoveryTitle').textContent=round.gene;$('conditionName').textContent=round.condition;$('otherName').textContent=round.otherName;$('nuance').textContent=round.nuance;
$('diagramDescription').textContent=diagramDescription;$('checkedDate').textContent='Sources checked '+round.checked+'.';
$('guessFeedback').textContent='A correct answer completes the picture. Finish both questions to complete the round.';
round.phenotypes.forEach(([title,body])=>{const el=document.createElement('div');el.className='phenotype';el.innerHTML=`<h4>${title}</h4><p>${body}</p>`;$('phenotypes').append(el);});
round.sources.forEach(([title,url])=>{const a=document.createElement('a');a.textContent=title+' ↗';a.href=url;a.target='_blank';a.rel='noopener noreferrer';$('sources').append(a);});
$('community').textContent=round.community[0]+' ↗';$('community').href=round.community[1];
buildBoard();buildTray();render();save();
if(roundComplete(state))announce('Round complete. Your diagram, learning answers, and results are saved.');
else if(state.started)announce('Your progress is restored.'+(timed?' Elapsed time continues.':'')+(currentCheck()?' A learning question is ready.':''));

function renderCollection() {
  const progress=collectionProgress(key=>localStorage.getItem(key),{id:round.id,state});
  const count=progress.filter(p=>p.done).length;
  $('collectionCount').textContent=`${count} of ${rounds.length} complete`;
  $('libraryProgress').textContent=`${count} of ${rounds.length} rounds complete. Progress is saved in this browser.`;
  $('collectionFill').style.width=`${count/rounds.length*100}%`;
  $('collectionFinished').hidden=count!==rounds.length;
  const next=progress.find(p=>Number(p.round.number)>Number(round.number)&&!p.done)??progress.find(p=>!p.done&&p.round.id!==round.id);
  $('nextRound').href=roundLink(next?.round??rounds[0]);
  $('nextRound').textContent=next?`Continue to round ${next.round.number} →`:'Explore the collection →';
  $('nextRound').onclick=count===rounds.length?e=>{e.preventDefault();$('libraryDialog').showModal();}:null;
  const index=rounds.indexOf(round);
  for(const [id,target] of [['previousRound',rounds[index-1]],['followingRound',rounds[index+1]]]){
    const a=$(id);a.hidden=!target;if(target){a.href=roundLink(target);a.setAttribute('aria-label',`Go to round ${target.number}`);}
  }
  $('levelGrid').replaceChildren();
  for(const item of progress){
    const a=document.createElement('a');a.href=roundLink(item.round);a.className='level-card'+(item.done?' is-complete':'');
    if(item.round.id===round.id)a.setAttribute('aria-current','page');
    const num=document.createElement('span');num.className='level-number';num.textContent=item.round.number;
    const title=document.createElement('h3');title.textContent=item.round.title;
    const topic=document.createElement('p');topic.textContent=item.round.topic;
    const status=document.createElement('span');status.className='level-status';status.textContent=item.done?`${item.round.gene} · Complete ✓`:item.started?`${item.pieces}/12 pieces · ${item.answers}/2 questions`:'Ready to explore';
    const bar=document.createElement('span');bar.className='level-progress';const fill=document.createElement('span');fill.style.width=item.percent+'%';bar.append(fill);
    a.append(num,title,topic,status,bar);$('levelGrid').append(a);
  }
}

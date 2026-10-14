import {node,citation} from './clinical-ui.mjs';
import {COLS,ROWS,SIZE,W,H,CW,CH,pathFor,newState,place,guess,complete,shuffled,normalizeGene,landmarkPiece} from './engine.mjs';
import {rounds,allRounds,findRound,saveKey} from './rounds.mjs';
import {collectionProgress,roundLink,newPlayerKeys} from './collection.mjs';
import {artworkMarkers,artworkGuide} from './artwork-ui.mjs';
import {mechanismFigure,spliceCompare} from './mechanism.mjs';
import {restoreSession,choosePiece,elapsedSeconds,startRound,finishRound,roundComplete} from './session.mjs';
import {isApproved} from './signoff.mjs';
const params=new URLSearchParams(location.search);
const round=findRound(params.get('level') ?? rounds[0].number);
const {pieces:pieceDescriptions,description:diagramDescription}=round;

const $ = id => document.getElementById(id);
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
$('playTab').href = `./?level=${round.number}`;
for (const id of ['editorialTab','editorialFooter']) $(id).href = `./review.html?level=${round.number}`;
const PIECE_PAD=44;
const NS = 'http://www.w3.org/2000/svg', KEY = saveKey(round);
const position = id => `row ${Math.floor(id/COLS)+1}, column ${id%COLS+1}`;
// Each landmark belongs to the piece that contains it; placing that piece reveals the note.
const landmarkPieces=round.illustration.landmarks.map(landmarkPiece);
const imageMarkers=artworkMarkers(round,index=>showNote(index)),markers=[...imageMarkers.children];markers.forEach(m=>m.hidden=true);$('board').append(imageMarkers);
const imageGuide=artworkGuide(round);imageGuide.id='artworkGuide';imageGuide.classList.add('side-guide');imageGuide.hidden=true;
$('completion').after(imageGuide);
let stored;
try { stored = JSON.parse(localStorage.getItem(KEY)); } catch {}
let {state,timed} = restoreSession(stored);
let selected = null, hinted = null, peek = false, drag = null;
let order = shuffled(Array.from({length:SIZE},(_,i)=>i));
let lastCount = -1, extrasShown = false;
const board = $('puzzle');
const save = () => { try {localStorage.setItem(KEY,JSON.stringify({state,timed}));$('saveNotice').hidden=true;} catch {$('saveNotice').hidden=false;} renderCollection(); };
// The strip under the board carries every message, new clue, and image note.
function strip(message,items=[]) {
  const box=$('status');box.replaceChildren(node('p',message,'strip-message'));
  for(const item of items){
    const p=node('p',null,`strip-item ${item.kind}`);
    if(item.kind==='landmark'){const badge=node('span',String(item.index+1),'strip-badge');badge.setAttribute('aria-label',`Image note ${item.index+1}:`);p.append(badge,node('strong',item.title));if(item.text)p.append(' ',item.text);}
    else p.append(node('span',`New clue · ${item.label}`,'strip-kicker'),' ',node('strong',`${item.title}.`),' ',item.body);
    box.append(p);
  }
}
function start(useRoute = 'image') { startRound(state,timed,useRoute); save(); updateMode(); }
function svgEl(tag,attrs={}) { const n=document.createElementNS(NS,tag); Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v)); return n; }
function artworkPiece(id,prefix) {
  const g=svgEl('g'), clip=svgEl('clipPath',{id:prefix+id});
  clip.append(svgEl('path',{d:pathFor(id)})); const defs=svgEl('defs'); defs.append(clip); g.append(defs);
  g.append(svgEl('image',{href:round.artwork,width:W,height:H,'clip-path':`url(#${prefix+id})`}));
  g.append(svgEl('path',{d:pathFor(id),class:'piece-outline','vector-effect':'non-scaling-stroke'})); return g;
}
const slotAt = i => board.querySelector(`[data-slot="${i}"] .slot`);
const trayButton = id => $('tray').querySelector(`[data-piece="${id}"]`);
function nextSlot(from,key) {
  const [dr,dc]={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}[key];
  for(let r=Math.floor(from/COLS)+dr,c=from%COLS+dc;r>=0&&r<ROWS&&c>=0&&c<COLS;r+=dr,c+=dc){const i=r*COLS+c;if(!state.placed.includes(i))return i;}
  return from;
}
function buildBoard() {
  board.replaceChildren();
  for(let i=0;i<SIZE;i++) {
    const g=svgEl('g',{'data-slot':i});
    const slot=svgEl('path',{d:pathFor(i),class:'slot',tabindex:'0',role:'button','aria-label':`Board position, ${position(i)}`});
    slot.addEventListener('click',()=>attempt(i));
    slot.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();attempt(i);}
      else if(e.key.startsWith('Arrow')){e.preventDefault();slotAt(nextSlot(i,e.key))?.focus();}
    });
    g.append(slot); board.append(g);
  }
}
function buildTray() {
  const tray=$('tray'); tray.replaceChildren();
  order.forEach((id,index)=>{
    const b=document.createElement('button'); b.className='piece'; b.dataset.piece=id;
    // Screen-reader users cannot compare shapes, so the label includes the position.
    b.setAttribute('aria-label',`Piece ${String.fromCharCode(65+index)}: ${pieceDescriptions[id]}. Position: ${position(id)}.`);
    b.setAttribute('aria-pressed','false');
    const x=id%COLS*CW, y=Math.floor(id/COLS)*CH;
    const svg=svgEl('svg',{viewBox:`${x-PIECE_PAD} ${y-PIECE_PAD} ${CW+PIECE_PAD*2} ${CH+PIECE_PAD*2}`,'aria-hidden':'true'});
    svg.append(artworkPiece(id,'tray-')); b.append(svg);
    const label=document.createElement('span');label.className='piece-label';label.textContent=String.fromCharCode(65+index);label.setAttribute('aria-hidden','true');b.append(label);
    b.addEventListener('click',e=>{if(b.dataset.suppress==='1'){delete b.dataset.suppress;return;}select(id,e.detail===0);});
    b.addEventListener('pointerdown',e=>startDrag(e,id,b)); tray.append(b);
  });
}
function select(id,fromKeyboard=false) {
  if(complete(state))return;
  start(); ({selected,hinted}=choosePiece(selected,id)); updateSelection();
  strip(selected===null?'Selection cleared.':`Selected: ${pieceDescriptions[id]}. Now choose its place on the board.`);
  if(fromKeyboard&&selected!==null)slotAt(Array.from({length:SIZE},(_,i)=>i).find(i=>!state.placed.includes(i)))?.focus();
}
function updateSelection() {
  $('board').classList.toggle('started',state.placed.length>0||peek||selected!==null);
  document.querySelectorAll('.piece').forEach(b=>{
    b.setAttribute('aria-pressed',String(Number(b.dataset.piece)===selected));
    b.classList.toggle('hinted',Number(b.dataset.piece)===hinted);
  });
  document.querySelectorAll('.slot').forEach((slot,i)=>slot.classList.toggle('hinted',i===hinted));
}
// Notes stay anonymous until the round is complete, so they cannot reveal the gene or condition early.
function noteFor(index) {
  const l=round.illustration.landmarks[index],done=complete(state);
  return {kind:'landmark',index,piece:landmarkPieces[index],title:done?l.title:l.playTitle,text:done?l.text:l.playText};
}
function showNote(index) {
  strip(`Image note ${index+1}.`,[noteFor(index)]);
  markers.forEach((m,i)=>m.classList.toggle('is-active',i===index));
}
function discoveries(before,previous) {
  const clues=round.clues.filter(c=>c.at>before&&c.at<=state.placed.length&&c.at<SIZE).map(c=>({kind:'clue',...c}));
  const notes=landmarkPieces.map((piece,index)=>state.placed.includes(piece)&&!previous.includes(piece)?noteFor(index):null).filter(Boolean);
  return [...clues,...notes];
}
function flyIn(id,from) {
  if(!from||reducedMotion()||from.bottom<0||from.top>innerHeight)return;
  const g=board.querySelector(`[data-slot="${id}"] .piece-on-board`),b=board.getBoundingClientRect();
  if(!g?.animate||!b.width)return;
  const unit=W/b.width,cx=(id%COLS+.5)*CW,cy=(Math.floor(id/COLS)+.5)*CH;
  const fx=(from.left+from.width/2-b.left)*unit,fy=(from.top+from.height/2-b.top)*unit,scale=Math.min(from.width,from.height)*unit/(CW+PIECE_PAD*2);
  g.style.transformOrigin=`${cx}px ${cy}px`;
  g.animate([{transform:`translate(${fx-cx}px,${fy-cy}px) scale(${scale})`},{transform:'none'}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)'});
}
function afterProgress(before,previous,{id=null,from=null,alias=''}={}) {
  finishRound(state);
  const found=discoveries(before,previous);
  render(before); save();
  if(id!==null)flyIn(id,from);
  if(roundComplete(state)){
    strip(`Complete: ${round.gene} · ${round.condition}.${alias}`,found.filter(d=>d.kind==='landmark').map(d=>({...d,text:''})));
    $('revealTitle').focus({preventScroll:true});
    if(state.solvedByGuess&&before<SIZE)$('board').scrollIntoView({block:'start',behavior:reducedMotion()?'auto':'smooth'});
  } else {
    strip(`${state.placed.length} of ${SIZE} placed.`,found);
    $('tray').querySelector('.piece:not(.placed)')?.focus({preventScroll:true});
  }
}
function attempt(slot) {
  if(selected===null){strip('First select a piece from the tray.');return;}
  start(); const before=state.placed.length,previous=[...state.placed],id=selected,from=drag?null:trayButton(id)?.querySelector('svg').getBoundingClientRect();
  if(!place(state,id,slot)){
    const path=slotAt(slot);path?.classList.remove('miss');path?.getBoundingClientRect();path?.classList.add('miss');setTimeout(()=>path?.classList.remove('miss'),450);
    strip('Not this position. Compare the edge shape and image, then try another place.');return;
  }
  selected=null; hinted=null; afterProgress(before,previous,{id,from});
}
function startDrag(e,id,b) {
  if(e.pointerType==='touch'||e.button!==0||state.placed.includes(id))return;
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
    d.width=rect.width*(CW+PIECE_PAD*2)/W; d.height=rect.height*(CH+PIECE_PAD*2)/H;
    Object.assign(d.ghost.style,{width:d.width+'px',height:d.height+'px'}); document.body.append(d.ghost); updateSelection();
  }
  d.ghost.style.left=e.clientX-d.width/2+'px'; d.ghost.style.top=e.clientY-d.height/2+'px';
});
function endDrag(e,cancelled=false) {
  if(!drag||e.pointerId!==drag.pointer)return;
  const d=drag; d.b.classList.remove('dragging'); d.ghost?.remove();
  if(!d.moved){drag=null;return;}
  d.b.dataset.suppress='1'; setTimeout(()=>delete d.b.dataset.suppress,0);
  if(!cancelled){
    const rect=board.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*W,y=(e.clientY-rect.top)/rect.height*H;
    const cx=(d.id%COLS+.5)*CW,cy=(Math.floor(d.id/COLS)+.5)*CH;
    if(Math.hypot(x-cx,y-cy)<Math.min(CW,CH)*.57)attempt(d.id);
    else strip('Bring the center of the piece closer to its place, or click to place it.');
  }
  drag=null;
}
window.addEventListener('pointerup',e=>endDrag(e));
window.addEventListener('pointercancel',e=>endDrag(e,true));
function updateMode() {
  $('calm').setAttribute('aria-pressed',String(!timed)); $('timed').setAttribute('aria-pressed',String(timed));
  $('calm').disabled=state.started; $('timed').disabled=state.started; $('restart').hidden=!state.started;
  $('clock').hidden=!timed||state.timingUnavailable; $('clock').textContent=formatTime(elapsedSeconds(state));
}
function renderResults() {
  const plural=(n,word)=>`${n} ${word}${n===1?'':'s'}`;
  const mode=timed?(state.timingUnavailable?'Timed · time unavailable':`Timed · ${formatTime(elapsedSeconds(state))}`):'Practice';
  const route=state.solvedByGuess?(state.namedAt!==null?`Named the gene at ${state.namedAt} of ${SIZE} pieces`:'Gene recognition'):state.usedRoutes.includes('legacy')?'Restored progress':'Image puzzle';
  $('roundResults').textContent=[mode,route,plural(state.hints,'hint'),plural(state.peeks,'reference view')].join(' · ');
}
function render(before=state.placed.length) {
  const n=state.placed.length, done=complete(state);
  $('board').classList.toggle('started',n>0||peek); $('board').classList.toggle('completed',done);
  for(let i=0;i<SIZE;i++){
    const slot=board.querySelector(`[data-slot="${i}"]`),isPlaced=state.placed.includes(i),button=slot.querySelector('.slot');
    button.style.display=isPlaced?'none':'';
    if(isPlaced&&!slot.querySelector('.piece-on-board')){const g=artworkPiece(i,'board-');g.setAttribute('class','piece-on-board');g.setAttribute('aria-hidden','true');slot.append(g);}
  }
  let delay=0;
  markers.forEach((marker,i)=>{
    const show=state.placed.includes(landmarkPieces[i]);
    if(show&&marker.hidden&&n>before){marker.classList.add('is-new');marker.style.setProperty('--delay',`${delay++*150}ms`);}
    marker.hidden=!show;marker.classList.remove('is-active');marker.setAttribute('aria-label',`Image note ${i+1}: ${noteFor(i).title}`);
  });
  const found=landmarkPieces.map((piece,i)=>state.placed.includes(piece)?i:-1).filter(i=>i>=0);
  $('notesFound').hidden=done||!found.length;
  $('notesList').replaceChildren(...found.map(i=>{const note=noteFor(i),li=node('li');const badge=node('span',String(i+1),'strip-badge');badge.setAttribute('aria-hidden','true');li.append(badge,node('strong',note.title),' ',note.text);return li;}));
  if(done)board.setAttribute('aria-label','Completed diagram. '+diagramDescription);
  document.querySelectorAll('.piece').forEach(b=>{const placed=state.placed.includes(Number(b.dataset.piece));b.classList.toggle('placed',placed);b.disabled=placed;});
  $('remainingCount').textContent=`${SIZE-n} remaining`; $('pieceBank').hidden=done; imageGuide.hidden=!done;
  $('progressText').textContent=`${n} of ${SIZE} pieces`; $('progressPercent').textContent=Math.round(n/SIZE*100)+'%';
  $('progressFill').style.width=n/SIZE*100+'%'; document.querySelector('.progress-track').setAttribute('aria-valuenow',n);
  if(n!==lastCount){
    const fresh=lastCount!==-1;
    $('clues').replaceChildren();
    round.clues.forEach((clue,i)=>{
      const open=n>=clue.at,li=document.createElement('li'); li.className=`clue ${open?'unlocked':'locked'} ${i>=4?'final':''} ${fresh&&open&&clue.at>before?'fresh':''}`;
      li.innerHTML=`<span class="clue-number" aria-hidden="true">${open?'✓':String(i+1).padStart(2,'0')}</span><div class="clue-content"><span class="clue-label">${clue.label}</span>${open?`<h3>${clue.title}</h3><p>${clue.body}</p>`:`<p class="unlock">Unlocks at ${clue.at} pieces</p>`}</div>`;
      if(open&&clue.sourceUrl){const a=citation(clue.sourceUrl,'Clinical reference');a.classList.add('clinical-clue-source');li.querySelector('.clue-content').append(a);}
      $('clues').append(li);
    });lastCount=n;
  }
  $('completion').hidden=!done; $('completionActions').hidden=!done; $('guessForm').hidden=done;
  $('hint').disabled=done; $('peek').disabled=done;
  if(done){
    peek=false;$('reference').hidden=true;$('peek').setAttribute('aria-pressed','false');renderResults();
    if(!extrasShown){
      extrasShown=true;
      const finished=new Set(collectionProgress(key=>localStorage.getItem(key),{id:round.id,state}).filter(p=>p.done).map(p=>p.round.number));
      $('revealExtras').replaceChildren(...[mechanismFigure(round),spliceCompare(round,number=>finished.has(number),number=>rounds.some(r=>r.number===number))].filter(Boolean));
    }
  }
  updateMode();updateSelection();
}
function formatTime(s) {return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;}
setInterval(()=>{if(timed)$('clock').textContent=formatTime(elapsedSeconds(state));},1000);
$('calm').onclick=()=>{if(!state.started){timed=false;render();save();}};
$('timed').onclick=()=>{if(!state.started){timed=true;render();save();}};
$('peek').onclick=()=>{start('image');peek=!peek;if(peek)state.peeks++;$('reference').hidden=!peek;$('peek').setAttribute('aria-pressed',String(peek));$('board').classList.toggle('started',state.placed.length>0||peek);strip(peek?'Reference image visible. '+diagramDescription:'Reference image hidden.');save();};
$('hint').onclick=()=>{start('image');hinted=selected??order.find(id=>!state.placed.includes(id));selected=hinted;state.hints++;updateSelection();strip(`Hint: the highlighted piece belongs in ${position(hinted)}.`);save();};
$('guessForm').onsubmit=e=>{
  e.preventDefault();const value=$('geneGuess').value;
  if(!normalizeGene(value)){$('guessFeedback').textContent='Enter a gene symbol first.';return;}
  start('guess');const before=state.placed.length,previous=[...state.placed];
  if(guess(state,value,round.gene,round.aliases)){
    const alias=normalizeGene(value)===normalizeGene(round.gene)?'':` ${value.trim().toUpperCase()} is the previous symbol for ${round.gene}.`;
    selected=null;hinted=null;afterProgress(before,previous,{alias});
  } else if(round.products.some(p=>normalizeGene(p)===normalizeGene(value))){$('guessFeedback').textContent='That names the gene product. Enter its gene symbol to complete the image.';}
  else {$('guessFeedback').textContent='That is not the gene for this round. Keep exploring the clues.';$('geneGuess').setAttribute('aria-invalid','true');}
};
$('geneGuess').addEventListener('input',()=>$('geneGuess').removeAttribute('aria-invalid'));
$('libraryButton').onclick=()=>{renderCollection();$('libraryDialog').showModal();};
$('closeLibrary').onclick=()=>$('libraryDialog').close();
$('collectionReview').onclick=()=>{renderCollection();$('libraryDialog').showModal();};
$('helpButton').onclick=()=>$('helpDialog').showModal();$('startButton').onclick=()=>$('helpDialog').close();document.querySelector('#helpDialog .dialog-close').onclick=()=>$('helpDialog').close();
$('restart').onclick=()=>$('restartDialog').showModal();$('cancelRestart').onclick=()=>$('restartDialog').close();
$('confirmRestart').onclick=()=>{
  state=newState();selected=null;hinted=null;peek=false;lastCount=-1;extrasShown=false;order=shuffled(order);
  $('reference').hidden=true;$('peek').setAttribute('aria-pressed','false');$('geneGuess').value='';$('geneGuess').removeAttribute('aria-invalid');
  $('guessFeedback').textContent='Enter the gene symbol to complete the image. We record how many pieces you needed.';
  markers.forEach(m=>{m.hidden=true;m.classList.remove('is-new');});
  board.setAttribute('aria-label','Puzzle board, three rows and four columns');buildBoard();buildTray();render();save();$('restartDialog').close();
  strip('New round. Choose Practice or Timed, then begin.');$('calm').focus();
};
document.querySelectorAll('.new-player-button').forEach(b=>b.onclick=()=>{$('libraryDialog').close();$('newPlayerDialog').showModal();});
$('cancelNewPlayer').onclick=()=>$('newPlayerDialog').close();
$('confirmNewPlayer').onclick=()=>{
  try{newPlayerKeys(Array.from({length:localStorage.length},(_,i)=>localStorage.key(i))).forEach(key=>localStorage.removeItem(key));}catch{}
  location.href=`./?level=${rounds[0].number}`;
};
window.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||selected===null||document.querySelector('dialog[open]'))return;
  const back=selected,onBoard=document.activeElement?.classList.contains('slot');
  selected=null;hinted=null;updateSelection();strip('Selection cleared.');
  if(onBoard)trayButton(back)?.focus();
});
document.title=`Round ${round.number} · GREGoR Puzzles`;
document.querySelectorAll('.first-round').forEach(el=>el.textContent=rounds[0].number);
$('roundLabel').textContent=`ROUND ${round.number} / ${String(allRounds.length).padStart(2,'0')} · ${round.topic.toUpperCase()}`;
$('roundTitle').textContent=round.title;
$('libraryLabel').textContent=`All ${rounds.length} rounds`;
$('figureLabel').textContent=`FIG. ${round.number} / ${round.topic.toUpperCase()}`;
$('reference').src=round.artwork; $('reference').alt=diagramDescription;
$('diagramDescription').textContent=diagramDescription;
$('revealGene').textContent=round.gene;$('revealCondition').textContent=round.condition;$('revealAlias').textContent=round.otherName;
$('revealConnection').textContent=round.clinical.connection;
$('revealPatternTitle').textContent=`Clinical pattern · ${round.clinical.patternTitle}`;$('revealPattern').textContent=round.clinical.pattern;
const caveat=round.clinical.pearls[round.clinical.caveat];$('revealCaveat').replaceChildren(node('strong',`${caveat.title}.`),' ',caveat.text);
$('profileLink').href=`./review.html?level=${round.number}#round-${round.number}`;
$('community').textContent=round.community[0]+' ↗';$('community').href=round.community[1];
$('sourceNote').textContent=`${round.reviewStatus}. Sources checked ${round.checked}. Conceptual artwork generated with AI; not a patient image or atomic structure.`;
const reviewed=allRounds.filter(r=>isApproved(r.signoff)).length;
$('reviewSummary').textContent=reviewed?`${reviewed} of ${allRounds.length} rounds scientifically reviewed`:'Content pending scientific review';
buildBoard();buildTray();render();save();
if(roundComplete(state))strip(`Complete: ${round.gene} · ${round.condition}. Your diagram and results are saved.`);
else if(state.started)strip('Your progress is restored.'+(timed?' Elapsed time continues.':''));

function renderCollection() {
  const progress=collectionProgress(key=>localStorage.getItem(key),{id:round.id,state});
  const count=progress.filter(p=>p.done).length,anyStarted=progress.some(p=>p.started);
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
  for(const [i,item] of progress.entries()){
    const a=document.createElement('a');a.href=roundLink(item.round);a.className='level-card'+(item.done?' is-complete':'');
    if(item.round.id===round.id)a.setAttribute('aria-current','page');
    const num=document.createElement('span');num.className='level-number';num.textContent=item.round.number;
    const title=document.createElement('h3');title.textContent=item.round.title;
    const topic=document.createElement('p');topic.textContent=item.round.topic;
    const status=document.createElement('span');status.className='level-status';status.textContent=item.done?`${item.round.gene} · Complete ✓`:item.started?`${item.pieces}/12 pieces`:i===0&&!anyStarted?'Start here':'Ready to explore';
    const bar=document.createElement('span');bar.className='level-progress';const fill=document.createElement('span');fill.style.width=item.percent+'%';bar.append(fill);
    a.append(num,title,topic,status,bar);$('levelGrid').append(a);
  }
}

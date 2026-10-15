import {node,citation,referenceMarks,referenceList} from './clinical-ui.mjs';
import {COLS,ROWS,SIZE,W,H,CW,CH,pathFor,newState,place,guess,complete,shuffled,normalizeGene,landmarkPiece} from './engine.mjs';
import {rounds,allRounds,findRound,saveKey} from './rounds.mjs';
import {collectionProgress,roundLink,newPlayerKeys} from './collection.mjs';
import {artworkMarkers} from './artwork-ui.mjs';
import {mechanismFigure,spliceCompare} from './mechanism.mjs';
import {restoreSession,choosePiece,elapsedSeconds,startRound,finishRound,roundComplete} from './session.mjs';
import {reduceMotion as reducedMotion,soundFeedback,illustrationWalkthrough,highlightStructure,assembleLogo} from './experience.mjs';
import {renderSite} from './site.mjs';
import {relatedRoundLinks} from './collection-data.mjs';
const params=new URLSearchParams(location.search);
const round=findRound(params.get('level') ?? rounds[0].number);
const {pieces:pieceDescriptions,description:diagramDescription}=round;

const $ = id => document.getElementById(id);
renderSite({active:'play',roundNumber:round.number,playControls:true});
const sound=soundFeedback($('soundButton'));
const PIECE_PAD=44;
const NS = 'http://www.w3.org/2000/svg', KEY = saveKey(round);
const position = id => `row ${Math.floor(id/COLS)+1}, column ${id%COLS+1}`;
// Each landmark belongs to the piece that contains it; placing that piece reveals the note.
const landmarkPieces=round.illustration.landmarks.map(landmarkPiece);
const imageMarkers=artworkMarkers(round,index=>showNote(index)),markers=[...imageMarkers.children];markers.forEach(m=>m.hidden=true);$('board').append(imageMarkers);
let stored;
try { stored = JSON.parse(localStorage.getItem(KEY)); } catch {}
let {state,timed} = restoreSession(stored);
let selected = null, hinted = null, peek = false, drag = null;
let order = shuffled(Array.from({length:SIZE},(_,i)=>i));
let lastCount = -1, extrasShown = false;
let walkthrough=null,completionTimer=null,lastCollectionCount=null;
let cancelCollectionCelebration=()=>{};
const walkthroughLayout=matchMedia('(min-width: 801px)');
function positionWalkthrough(){
  const panel=document.querySelector('.discovery');panel.classList.toggle('has-walkthrough',Boolean(walkthrough)&&walkthroughLayout.matches);
  if(!walkthrough)return;
  if(walkthroughLayout.matches)panel.prepend(walkthrough.element);else $('identityCard').after(walkthrough.element);
}
walkthroughLayout.addEventListener('change',positionWalkthrough);
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
  document.querySelectorAll('.slot').forEach(slot=>slot.classList.toggle('hinted',Number(slot.parentElement.dataset.slot)===hinted));
}
// Notes stay anonymous until the round is complete, so they cannot reveal the gene or condition early.
function noteFor(index) {
  const l=round.illustration.landmarks[index],done=complete(state);
  return {kind:'landmark',index,piece:landmarkPieces[index],title:done?l.title:l.playTitle,text:done?l.text:l.playText};
}
function showNote(index) {
  walkthrough?.open(index);
  if(complete(state)){
    markers.forEach((m,i)=>{m.classList.toggle('is-active',i===index);m.setAttribute('aria-pressed',String(i===index));});
    return;
  }
  strip(`Image note ${index+1}.`,[noteFor(index)]);
  markers.forEach((m,i)=>m.classList.toggle('is-active',i===index));
  highlightStructure($('board'),round.illustration.landmarks[index]);
}
function discoveries(before,previous) {
  const clues=round.clues.filter(c=>c.at>before&&c.at<=state.placed.length&&c.at<SIZE).map(c=>({kind:'clue',...c}));
  const notes=landmarkPieces.map((piece,index)=>state.placed.includes(piece)&&!previous.includes(piece)?noteFor(index):null).filter(Boolean);
  return [...clues,...notes];
}
function flyIn(id,from) {
  if(reducedMotion())return;
  const g=board.querySelector(`[data-slot="${id}"] .piece-on-board`),b=board.getBoundingClientRect();
  if(!g?.animate||!b.width)return;
  const cx=(id%COLS+.5)*CW,cy=(Math.floor(id/COLS)+.5)*CH;
  g.style.transformOrigin=`${cx}px ${cy}px`;
  if(!from||from.bottom<0||from.top>innerHeight){g.animate([{transform:'scale(1.025)'},{transform:'none'}],{duration:180,easing:'ease-out'});return;}
  const ghost=svgEl('svg',{viewBox:`${id%COLS*CW-PIECE_PAD} ${Math.floor(id/COLS)*CH-PIECE_PAD} ${CW+PIECE_PAD*2} ${CH+PIECE_PAD*2}`,'aria-hidden':'true'});
  ghost.append(artworkPiece(id,`arrival-${id}-`));ghost.classList.add('drag-ghost');
  Object.assign(ghost.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px',transformOrigin:'center'});document.body.append(ghost);g.style.opacity='0';
  const dx=b.left+cx*b.width/W-from.left-from.width/2,dy=b.top+cy*b.height/H-from.top-from.height/2;
  const scale=(CW+PIECE_PAD*2)*b.width/W/from.width;
  ghost.animate([{transform:'none'},{transform:`translate(${dx}px,${dy}px) scale(${scale*1.015})`,offset:.86},{transform:`translate(${dx}px,${dy}px) scale(${scale})`}],{duration:280,easing:'cubic-bezier(.2,.7,.2,1)'}).finished.catch(()=>{}).finally(()=>{ghost.remove();g.style.opacity='';});
}
function afterProgress(before,previous,{id=null,from=null,alias=''}={}) {
  finishRound(state);
  const found=discoveries(before,previous);
  const finishing=roundComplete(state)&&before<SIZE;
  $('board').classList.toggle('finishing',finishing&&!reducedMotion());
  $('completion').classList.toggle('reveal-pending',finishing&&!reducedMotion());
  render(before); save();
  if(id!==null)flyIn(id,from);
  void sound.play(finishing?'complete':'place');
  if(roundComplete(state)){
    strip(`Round complete. Your diagram is saved.${alias}`);
    if(finishing){
      clearTimeout(completionTimer);
      const reveal=()=>{$('board').classList.remove('finishing');$('completion').classList.remove('reveal-pending');$('completion').classList.add('reveal-arriving');$('revealTitle').focus({preventScroll:true});highlightStructure($('board'),round.illustration.landmarks[0]);completionTimer=null;};
      if(reducedMotion())reveal();else completionTimer=setTimeout(reveal,id===null?0:280);
    }
  } else {
    strip(`${state.placed.length} of ${SIZE} placed.`,found);
    for(const item of found.filter(d=>d.kind==='landmark'))highlightStructure($('board'),round.illustration.landmarks[item.index]);
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
  $('game').classList.toggle('round-complete',done);
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
    marker.hidden=!show;marker.classList.remove('is-active');marker.setAttribute('aria-pressed','false');marker.setAttribute('aria-label',`Image note ${i+1}: ${noteFor(i).title}`);
  });
  const found=landmarkPieces.map((piece,i)=>state.placed.includes(piece)?i:-1).filter(i=>i>=0);
  $('notesFound').hidden=done||!found.length;
  $('notesList').replaceChildren(...found.map(i=>{const note=noteFor(i),li=node('li');const badge=node('span',String(i+1),'strip-badge');badge.setAttribute('aria-hidden','true');li.append(badge,node('strong',note.title),' ',note.text);return li;}));
  if(done)board.setAttribute('aria-label','Completed diagram. '+diagramDescription);
  document.querySelectorAll('.piece').forEach(b=>{const placed=state.placed.includes(Number(b.dataset.piece));b.classList.toggle('placed',placed);b.disabled=placed;});
  $('remainingCount').textContent=`${SIZE-n} remaining`; $('pieceBank').hidden=done;
  $('identityCard').hidden=!done;$('clueDetails').hidden=done;
  $('clueSummary').textContent=`${n} of ${SIZE} pieces`;
  $('progressText').textContent=`${n} of ${SIZE} pieces`; $('progressPercent').textContent=Math.round(n/SIZE*100)+'%';
  $('progressFill').style.width=n/SIZE*100+'%'; document.querySelector('.progress-track').setAttribute('aria-valuenow',n);
  if(n!==lastCount){
    const fresh=lastCount!==-1;
    $('clues').replaceChildren();
    round.clues.forEach((clue,i)=>{
      const open=n>=clue.at,li=document.createElement('li'); li.className=`clue ${open?'unlocked':'locked'} ${i>=4?'final':''} ${fresh&&open&&clue.at>before?'fresh':''}`;
      li.innerHTML=`<span class="clue-number" aria-hidden="true">${open?'✓':String(i+1).padStart(2,'0')}</span><div class="clue-content"><span class="clue-label">${clue.label}</span>${open?`<h3>${clue.title}</h3><p>${clue.body}</p>`:`<p class="unlock">Unlocks at ${clue.at} pieces</p>`}</div>`;
      $('clues').append(li);
    });lastCount=n;
  }
  $('completion').hidden=!done; $('completionActions').hidden=!done; $('guessForm').hidden=done;
  $('hint').disabled=done; $('peek').disabled=done;
  $('hint').hidden=done;$('peek').hidden=done;$('focusButton').hidden=done;$('enlargeButton').hidden=!done;
  document.querySelector('.mode-toggle').hidden=done;
  if(done){
    $('game').classList.remove('focus-view');$('focusButton').setAttribute('aria-pressed','false');$('focusButton').textContent='Focus view';
    peek=false;$('reference').hidden=true;$('peek').setAttribute('aria-pressed','false');renderResults();
    if(!extrasShown){
      extrasShown=true;
      $('clueDetails').open=false;
      walkthrough=illustrationWalkthrough(round,{board:$('board'),onStep:i=>markers.forEach((m,j)=>{m.classList.toggle('is-active',i===j);m.setAttribute('aria-pressed',String(i===j));}),onClose:()=>markers.forEach(m=>{m.classList.remove('is-active');m.setAttribute('aria-pressed','false');})});
      positionWalkthrough();
      const progress=collectionProgress(key=>localStorage.getItem(key),{id:round.id,state});
      const finished=new Set(progress.filter(p=>p.done).map(p=>p.round.number));
      const extras=[mechanismFigure(round),spliceCompare(round,number=>finished.has(number),number=>rounds.some(r=>r.number===number))].filter(Boolean);
      $('mechanismContent').replaceChildren(...extras);$('revealExtras').hidden=!extras.length;
      const related=relatedRoundLinks(round.number,progress);
      $('relatedRounds').replaceChildren();
      if(related.length){$('relatedRounds').append(node('h3','Connect this round'));for(const item of related){const a=node('a',`${item.relationship} · ${item.title} →`);a.href=item.href;$('relatedRounds').append(a);}}
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
function openDialog(id){walkthrough?.pause();$(id).showModal();}
$('libraryButton').onclick=()=>{renderCollection();openDialog('libraryDialog');};
$('closeLibrary').onclick=()=>$('libraryDialog').close();
$('collectionReview').onclick=()=>{renderCollection();openDialog('libraryDialog');};
$('helpButton').onclick=()=>openDialog('helpDialog');$('startButton').onclick=()=>$('helpDialog').close();document.querySelector('#helpDialog .dialog-close').onclick=()=>$('helpDialog').close();
$('focusButton').onclick=()=>{const on=!$('game').classList.contains('focus-view');$('game').classList.toggle('focus-view',on);$('focusButton').setAttribute('aria-pressed',String(on));$('focusButton').textContent=on?'Exit focus view':'Focus view';};
$('enlargeButton').onclick=()=>{if(complete(state))openDialog('figureDialog');};
$('closeFigure').onclick=()=>$('figureDialog').close();
$('restart').onclick=()=>openDialog('restartDialog');$('cancelRestart').onclick=()=>$('restartDialog').close();
$('confirmRestart').onclick=()=>{
  clearTimeout(completionTimer);completionTimer=null;walkthrough?.dispose();walkthrough=null;sound.stop();
  positionWalkthrough();
  $('board').classList.remove('finishing');$('completion').classList.remove('reveal-arriving','reveal-pending');
  $('board').querySelectorAll('.discovery-ring').forEach(n=>n.remove());
  state=newState();selected=null;hinted=null;peek=false;lastCount=-1;extrasShown=false;order=shuffled(order);
  $('game').classList.remove('focus-view');$('focusButton').setAttribute('aria-pressed','false');$('focusButton').textContent='Focus view';
  $('clueDetails').open=true;$('revealExtras').open=false;
  $('reference').hidden=true;$('peek').setAttribute('aria-pressed','false');$('geneGuess').value='';$('geneGuess').removeAttribute('aria-invalid');
  $('guessFeedback').textContent='A correct gene symbol completes the image.';
  markers.forEach(m=>{m.hidden=true;m.classList.remove('is-new');});
  board.setAttribute('aria-label','Puzzle board, three rows and four columns');buildBoard();buildTray();render();save();$('restartDialog').close();
  strip('New round. Choose Practice or Timed, then begin.');$('calm').focus();
};
document.querySelectorAll('.new-player-button').forEach(b=>b.onclick=()=>{$('libraryDialog').close();openDialog('newPlayerDialog');});
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
$('roundLabel').textContent=`Round ${round.number} / ${String(allRounds.length).padStart(2,'0')} · ${round.topic}`;
$('roundTitle').textContent=round.title;
$('libraryLabel').textContent=`Browse rounds`;
$('figureLabel').textContent=`FIG. ${round.number} / ${round.topic.toUpperCase()}`;
$('reference').src=round.artwork; $('reference').alt=diagramDescription;
$('diagramDescription').textContent=diagramDescription;
$('revealGene').textContent=round.gene;$('revealCondition').textContent=round.condition;$('revealAlias').textContent=round.otherName;
$('revealMetadata').append(node('span',round.inheritance),citation(`https://omim.org/entry/${round.omim}`,`OMIM ${round.omim}`));
$('revealConnection').textContent=round.clinical.connection;
$('revealPatternTitle').textContent=`Clinical pattern · ${round.clinical.patternTitle}`;$('revealPattern').textContent=round.clinical.pattern;
const caveat=round.clinical.pearls[round.clinical.caveat];$('revealCaveat').replaceChildren(node('strong',`${caveat.title}.`),' ',caveat.text);
const completionSources=[
 [round.illustration.source,round.clinical.patternSource,...(round.clinical.extraSources??[]),...(round.illustration.noteSource?[round.illustration.noteSource]:[])],
 [round.clinical.patternSource],caveat.sources
];
const sourceKey=urls=>[...new Set(urls)].sort().join('|');
if(completionSources.every(urls=>sourceKey(urls)===sourceKey(completionSources[0])))$('revealLines').after(referenceMarks(round,completionSources[0],'Mechanism, clinical pattern, and interpretation'));
else ['revealConnection','revealPattern','revealCaveat'].forEach((id,index)=>$(id).append(referenceMarks(round,completionSources[index],['Mechanism','Clinical pattern','Interpretation'][index])));
$('referencesBody').append(referenceList(round,{heading:''}));
$('profileLink').href=`./science.html?level=${round.number}`;
$('largeFigure').src=round.artwork;$('largeFigure').alt=diagramDescription;$('largeFigureCaption').textContent=round.illustration.note;
$('community').textContent=round.community[0]+' ↗';$('community').href=round.community[1];
$('sourceNote').textContent=`Sources checked ${round.checked}. Conceptual artwork generated with AI; not a patient image or atomic structure.`;
buildBoard();buildTray();render();save();
if(roundComplete(state))strip('Round complete. Your diagram and results are saved.');
else if(state.started)strip('Your progress is restored.'+(timed?' Elapsed time continues.':''));

function renderCollection() {
  const progress=collectionProgress(key=>localStorage.getItem(key),{id:round.id,state});
  const count=progress.filter(p=>p.done).length,anyStarted=progress.some(p=>p.started);
  $('collectionCount').textContent=`${count} of ${rounds.length} complete`;
  $('libraryProgress').textContent=`${count} of ${rounds.length} rounds complete. Progress is saved in this browser.`;
  $('collectionFill').style.width=`${count/rounds.length*100}%`;
  $('collectionFinished').hidden=count!==rounds.length;
  if(count!==rounds.length)cancelCollectionCelebration();
  if(count===rounds.length&&lastCollectionCount!==null&&lastCollectionCount<rounds.length){cancelCollectionCelebration();cancelCollectionCelebration=assembleLogo($('collectionLogo'));}
  lastCollectionCount=count;
  const next=progress.find(p=>Number(p.round.number)>Number(round.number)&&!p.done)??progress.find(p=>!p.done&&p.round.id!==round.id);
  $('nextRound').href=roundLink(next?.round??rounds[0]);
  $('nextRound').textContent=next?`Next round · ${next.round.number} →`:'Explore the collection →';
  $('nextRound').onclick=count===rounds.length?e=>{e.preventDefault();openDialog('libraryDialog');}:null;
  const index=rounds.indexOf(round);
  for(const [id,target] of [['previousRound',rounds[index-1]],['followingRound',rounds[index+1]]]){
    const a=$(id);a.hidden=!target;if(target){a.href=roundLink(target);a.setAttribute('aria-label',`Go to round ${target.number}`);}
  }
  $('levelGrid').replaceChildren();
  for(const [i,item] of progress.entries()){
    const a=document.createElement('a');a.href=roundLink(item.round);a.className='level-card'+(item.done?' is-complete':'');
    if(item.round.id===round.id)a.setAttribute('aria-current','page');
    const thumbnail=node('img',null,'level-thumbnail');thumbnail.src=item.round.artwork;thumbnail.alt='';thumbnail.width=800;thumbnail.height=600;thumbnail.loading='lazy';thumbnail.decoding='async';
    const num=document.createElement('span');num.className='level-number';num.textContent=item.round.number;
    const title=document.createElement('h3');title.textContent=item.round.title;
    const topic=document.createElement('p');topic.textContent=item.round.topic;
    const status=document.createElement('span');status.className='level-status';status.textContent=item.done?`${item.round.gene} · Complete ✓`:item.started?`${item.pieces}/12 pieces`:i===0&&!anyStarted?'Start here':'Ready to explore';
    const bar=document.createElement('span');bar.className='level-progress';const fill=document.createElement('span');fill.style.width=item.percent+'%';bar.append(fill);
    a.append(thumbnail,num,title,topic,status);
    if(item.done)a.append(node('span',item.round.condition,'level-condition'));
    a.append(bar);$('levelGrid').append(a);
  }
}

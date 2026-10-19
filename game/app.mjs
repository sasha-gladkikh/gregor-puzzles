import {node,citation,referenceMarks,referenceList} from './clinical-ui.mjs';
import {COLS,ROWS,SIZE,W,H,CW,CH,pathFor,newState,place,guess,complete,shuffled,normalizeGene,recognizeGene,revealGeneHint,geneHintText,geneHintStatus,geneClueConnection,landmarkPiece} from './engine.mjs';
import {rounds,allRounds,findRound,saveKey} from './rounds.mjs';
import {collectionProgress,roundLink,newPlayerKeys} from './collection.mjs';
import {artworkMarkers} from './artwork-ui.mjs';
import {mechanismFigure,spliceCompare} from './mechanism.mjs';
import {restoreSession,choosePiece,elapsedSeconds,startRound,recordInteraction,modeLocked,changeTimingMode,finishRound,roundComplete} from './session.mjs';
import {reduceMotion as reducedMotion,soundFeedback,assembleLogo} from './experience.mjs';
import {renderSite} from './site.mjs';
import {relatedRoundLinks} from './collection-data.mjs';
import {geneBank} from './gene-bank.mjs';
import {animatedArtwork,preloadArtwork,createCompletionPlaybackGate} from './artwork-motion.mjs';
import {discoveryMotion} from './discovery-motion.mjs';
import {createPieceMotion} from './piece-motion.mjs';
import {createFigureView} from './figure-view.mjs';
import {artworkSource} from './artwork-source.mjs';
import {latestPlayClue} from './play-learning.mjs';
import {nextOpenSlot} from './board-navigation.mjs';
import {eligibleScore,scoreIssueURL} from './community.mjs';
const params=new URLSearchParams(location.search);
const round=findRound(params.get('level') ?? rounds[0].number);
const {pieces:pieceDescriptions,description:diagramDescription}=round;
const artwork=artworkSource(round);

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
let {state,timed,order} = restoreSession(stored);
// Preserve timing provenance when restoreSession normalizes older saves.
if(stored?.timed&&stored.state&&(stored.state.sessionVersion!==3||stored.state.timingVersion!==2||(stored.state.placed?.length&&!Number.isFinite(stored.state.startedAt))||(stored.state.placed?.length===SIZE&&!Number.isFinite(stored.state.finishedAt))))state.leaderboardIneligible=true;
let timedEntry=params.get('mode')==='timed';
if(timedEntry){const entryURL=new URL(location.href);entryURL.searchParams.delete('mode');history.replaceState(null,'',entryURL.href);}
if(timedEntry&&!modeLocked(state)){timed=changeTimingMode(state,timed,true);timedEntry=false;}
let selected = null, hinted = null, peek = false, drag = null;
let activeSlot=0;
let lastCount = -1, extrasShown = false;
let artworkAnimation=null,lastCollectionCount=null,artworkPrepared=false;
let feedbackEpoch=0,roundGeneration=0;
const completionPlayback=createCompletionPlaybackGate();
document.addEventListener('visibilitychange',()=>{if(document.hidden){completionPlayback.cancel();feedbackEpoch++;pieceMotion.clear();sound.stop();}});
let cancelCollectionCelebration=()=>{};
const walkthroughLayout=matchMedia('(min-width: 1101px)');
function positionCompletion(){
  const panel=document.querySelector('.discovery'),sidebar=complete(state)&&walkthroughLayout.matches&&!$('game').classList.contains('focus-view');
  const summary=$('completionSummary');
  panel.classList.toggle('has-completion',sidebar);
  panel.setAttribute('aria-label',complete(state)?'Round summary':'Clues');
  if(sidebar){if(summary.parentElement!==panel)panel.prepend(summary);}
  else if(summary.parentElement!==$('imagePuzzle'))$('figureTools').after(summary);
  if(complete(state)){
    if($('clueDetails').parentElement!==$('clueRecap'))$('clueRecap').append($('clueDetails'));
  }else if($('clueDetails').parentElement!==panel)$('learningHeading').after($('clueDetails'));
  if(artworkAnimation&&!$('figureDialog').open){
    if(sidebar)$('completionActions').before(artworkAnimation.caption);
    else $('artworkPlayback').append(artworkAnimation.caption);
  }
}
walkthroughLayout.addEventListener('change',positionCompletion);
const board = $('puzzle');
const pieceMotion=createPieceMotion({board,makePiece:artworkPiece,pathFor,COLS,W,H,CW,CH,pad:PIECE_PAD,reduceMotion:reducedMotion,onCancel:()=>sound.stop()});
const bank=geneBank(rounds,{onChoose:value=>checkGene(value,true)});
$('geneBankBody').append(bank.element);
const discoveryGuide=discoveryMotion({board:$('board'),target:discoveryTarget});
function discoveryTarget(item){
  // Resolve the current row after rendering; fast placements can replace it.
  if(walkthroughLayout.matches&&!$('game').classList.contains('focus-view')){
    const panel=document.querySelector('.discovery'),bounds=panel.getBoundingClientRect();
    const row=item.kind==='landmark'?$('notesList').querySelector(`[data-note-index="${item.index}"]`):$('clues').querySelector(`[data-clue-at="${item.at}"]`);
    const rect=row?.getBoundingClientRect();
    if(rect&&rect.top>=Math.max(0,bounds.top)&&rect.top+Math.min(rect.height,48)<=Math.min(innerHeight,bounds.bottom))return row;
    const heading=$('learningHeading'),top=heading.getBoundingClientRect();
    if(top.top>=Math.max(0,bounds.top)&&top.bottom<=Math.min(innerHeight,bounds.bottom))return heading;
  }
  // On narrow layouts the newest teaching point is readable beneath the board.
  // The connection ends on that text, not on a button the player must open.
  const latest=$('latestClue'),rect=latest.getBoundingClientRect();
  if(!latest.hidden&&rect.height&&rect.top>=0&&rect.bottom<=innerHeight)return latest;
  return $('discoveriesButton');
}
const save = () => { try {localStorage.setItem(KEY,JSON.stringify({state,timed,order}));$('saveNotice').hidden=true;} catch {$('saveNotice').hidden=false;} renderCollection(); };
function strip(message,items=[]) {
  const fresh=items.length>0;
  $('placementFeedback').textContent=fresh?`${state.placed.length} of ${SIZE} placed. New clue.`:message;
  const latest=latestPlayClue(round,state.placed);
  $('latestClue').hidden=!latest;
  $('startReassurance').hidden=Boolean(latest);
  if(latest){$('latestClueTitle').textContent=latest.title;$('latestClueText').textContent=latest.text;}
  if(fresh)$('discoveriesButton').classList.add('has-new');
}
function openDiscoveries(noteIndex=null) {
  const body=$('discoveriesBody');body.replaceChildren();
  const unlocked=round.clues.filter(clue=>state.placed.length>=clue.at);
  const found=landmarkPieces.flatMap((piece,index)=>state.placed.includes(piece)?[index]:[]);
  const addNote=index=>{const note=noteFor(index),section=node('section',null,'discovery-note');section.append(node('h3',`${index+1}. ${note.title}`),node('p',note.text));body.append(section);};
  if(noteIndex!==null&&found.includes(noteIndex))addNote(noteIndex);
  if(unlocked.length){
    if(noteIndex!==null)body.append(node('h3','Clues','discovery-group-title'));
    for(const clue of unlocked){const section=node('section',null,'discovery-note');section.append(node('span',clue.label,'eyebrow'),node('h4',clue.title),node('p',clue.body));body.append(section);}
  }
  const otherNotes=found.filter(index=>index!==noteIndex);
  if(otherNotes.length){body.append(node('h3','Image notes','discovery-group-title'));otherNotes.forEach(addNote);}
  if(!unlocked.length&&!found.length)body.append(node('p','Place pieces to reveal clues. The first milestone clue appears at two pieces.'));
  $('discoveriesButton').classList.remove('has-new');openDialog('discoveriesDialog');
}
function start(useRoute = 'image',accepted=false) { void sound.prepare();if(!artworkPrepared){artworkPrepared=true;void preloadArtwork(round);} if(accepted)startRound(state,timed,useRoute);else recordInteraction(state,useRoute);save();updateMode(); }
function svgEl(tag,attrs={}) { const n=document.createElementNS(NS,tag); Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v)); return n; }
function artworkPiece(id,prefix) {
  const g=svgEl('g'), clip=svgEl('clipPath',{id:prefix+id});
  clip.append(svgEl('path',{d:pathFor(id)})); const defs=svgEl('defs'); defs.append(clip); g.append(defs);
  g.append(svgEl('image',{href:artwork,width:W,height:H,preserveAspectRatio:'none','clip-path':`url(#${prefix+id})`}));
  g.append(svgEl('path',{d:pathFor(id),class:'piece-outline','vector-effect':'non-scaling-stroke'})); return g;
}
const slotAt = i => board.querySelector(`[data-slot="${i}"] .slot`);
const trayButton = id => $('tray').querySelector(`[data-piece="${id}"]`);
function nextSlot(from,key) {
  return nextOpenSlot(from,key,state.placed);
}
function buildBoard() {
  board.replaceChildren();
  for(let i=0;i<SIZE;i++) {
    const g=svgEl('g',{'data-slot':i});
    const slot=svgEl('path',{d:pathFor(i),class:'slot',tabindex:'-1',role:'button','aria-label':`Board position, ${position(i)}`});
    slot.addEventListener('focus',()=>{activeSlot=i;updateSelection();});
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
  strip(selected===null?'Selection cleared.':`Piece ${trayButton(id).querySelector('.piece-label').textContent} selected. Choose its place.`);
  if(fromKeyboard&&selected!==null)slotAt(Array.from({length:SIZE},(_,i)=>i).find(i=>!state.placed.includes(i)))?.focus();
}
function updateSelection() {
  $('board').classList.toggle('started',state.placed.length>0||peek||selected!==null);
  document.querySelectorAll('.piece').forEach(b=>{
    b.setAttribute('aria-pressed',String(Number(b.dataset.piece)===selected));
    b.classList.toggle('hinted',Number(b.dataset.piece)===hinted);
  });
  document.querySelectorAll('.slot').forEach(slot=>slot.classList.toggle('hinted',Number(slot.parentElement.dataset.slot)===hinted));
  if(state.placed.includes(activeSlot))activeSlot=Array.from({length:SIZE},(_,i)=>i).find(i=>!state.placed.includes(i))??0;
  document.querySelectorAll('.slot').forEach(slot=>slot.setAttribute('tabindex',selected!==null&&Number(slot.parentElement.dataset.slot)===activeSlot?'0':'-1'));
}
// Notes stay anonymous until the round is complete, so they cannot reveal the gene or condition early.
function noteFor(index) {
  const l=round.illustration.landmarks[index],done=complete(state);
  return {kind:'landmark',index,piece:landmarkPieces[index],title:done?l.title:l.playTitle,text:done?l.text:l.playText};
}
function showNote(index) {
  completionPlayback.cancel();
  artworkAnimation?.pause();
  openDiscoveries(index);
  markers.forEach((m,i)=>m.classList.toggle('is-active',i===index));
}
function discoveries(before,previous) {
  const clues=round.clues.filter(c=>c.at>before&&c.at<=state.placed.length&&c.at<SIZE).map(c=>({kind:'clue',...c}));
  const notes=landmarkPieces.map((piece,index)=>state.placed.includes(piece)&&!previous.includes(piece)?noteFor(index):null).filter(Boolean);
  return [...notes,...clues];
}
function afterProgress(before,previous,{id=null,from=null,alias=''}={}) {
  finishRound(state);
  const found=discoveries(before,previous);
  const finishing=roundComplete(state)&&before<SIZE;
  $('board').classList.toggle('finishing',finishing&&!reducedMotion());
  $('completion').classList.toggle('reveal-pending',finishing&&!reducedMotion());
  $('identityCard').classList.toggle('reveal-pending',finishing&&!reducedMotion());
  render(before); save();
  const epoch=feedbackEpoch,generation=roundGeneration,progress=state.placed.length/SIZE;
  const settled=id===null?Promise.resolve({cancelled:false}):pieceMotion.place(id,from);
  settled.then(result=>{if(epoch===feedbackEpoch&&!result.cancelled)void sound.play(finishing?'complete':'place',{progress});});
  if(roundComplete(state)){
    discoveryGuide.clear();
    strip('Round complete. Your illustration is saved.');
    if(alias)$('roundResults').append(alias);
    if(finishing){
      const takeAutoplay=completionPlayback.arm();
      settled.then(result=>{
        if(generation!==roundGeneration)return;
        $('board').classList.remove('finishing');
        for(const panel of [$('identityCard'),$('completion')]){panel.classList.remove('reveal-pending');panel.classList.add('reveal-arriving');}
        // Always reveal the information. A later interaction can cancel autoplay.
        if(takeAutoplay()&&!result.cancelled&&epoch===feedbackEpoch&&!document.hidden&&!document.querySelector('dialog[open]')){
          $('revealTitle').focus({preventScroll:true});artworkAnimation?.play();
        }
      });
    }
  } else {
    strip(`${state.placed.length} of ${SIZE} placed.`,found);
    const point=id===null?{x:50,y:50}:{x:(id%COLS+.5)/COLS*100,y:(Math.floor(id/COLS)+.5)/ROWS*100};
    discoveryGuide.show(found.map(item=>({...item,point:item.kind==='landmark'?round.illustration.landmarks[item.index]:point})));
    $('tray').querySelector('.piece:not(.placed)')?.focus({preventScroll:true});
  }
}
function attempt(slot) {
  if(selected===null){strip('First select a piece from the tray.');return;}
  start(); const before=state.placed.length,previous=[...state.placed],id=selected,from=drag?null:trayButton(id)?.querySelector('svg').getBoundingClientRect();
  if(!place(state,id,slot)){
    const path=slotAt(slot);path?.classList.remove('miss');path?.getBoundingClientRect();path?.classList.add('miss');setTimeout(()=>path?.classList.remove('miss'),450);
    strip('Try another position. Match the shape and image.');return;
  }
  start('image',true);selected=null; hinted=null; afterProgress(before,previous,{id,from});
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
    else strip('Move closer to its place, or click to place it.');
  }
  drag=null;
}
window.addEventListener('pointerup',e=>endDrag(e));
window.addEventListener('pointercancel',e=>endDrag(e,true));
function updateMode() {
  $('calm').setAttribute('aria-pressed',String(!timed)); $('timed').setAttribute('aria-pressed',String(timed));
  $('calm').disabled=modeLocked(state); $('timed').disabled=modeLocked(state); $('restart').hidden=!state.started;
  $('timingNote').textContent=modeLocked(state)?'Restart to change mode.':'Choose a mode before placing your first piece. Hints and reference views do not start the timer.';
  $('clock').hidden=!timed||state.timingUnavailable||complete(state); $('clock').textContent=formatTime(elapsedSeconds(state));
}
function renderResults() {
  const plural=(n,word)=>`${n} ${word}${n===1?'':'s'}`;
  const mode=timed?(state.timingUnavailable?'Timed · time unavailable':`Timed · ${formatTime(elapsedSeconds(state))}`):'Practice';
  const route=state.solvedByGuess?(state.namedAt!==null?`Identified this round at ${state.namedAt} of ${SIZE} pieces`:'Gene recognition'):state.usedRoutes.includes('legacy')?'Restored progress':'Image puzzle';
  $('roundResults').textContent=[mode,route,plural(state.hints,'hint'),plural(state.peeks,'reference view')].join(' · ');
}
function render(before=state.placed.length) {
  const n=state.placed.length, done=complete(state);
  $('game').classList.toggle('round-complete',done);
  const settingsAnchor=done?$('diagramDescription').closest('details'):$('pieceBank');
  if(settingsAnchor.nextElementSibling!==$('roundSettings'))settingsAnchor.after($('roundSettings'));
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
    marker.removeAttribute('aria-pressed');marker.setAttribute('aria-haspopup','dialog');marker.setAttribute('aria-controls','discoveriesDialog');
  });
  const found=landmarkPieces.map((piece,i)=>state.placed.includes(piece)?i:-1).filter(i=>i>=0);
  $('notesFound').hidden=!found.length;
  // Stable rows keep an in-flight discovery attached to its destination when
  // another piece is placed. Only new or newly identified content is replaced.
  for(const li of [...$('notesList').children])if(!found.includes(Number(li.dataset.noteIndex)))li.remove();
  for(const i of found){
    const note=noteFor(i);let li=$('notesList').querySelector(`[data-note-index="${i}"]`);
    if(!li){li=node('li');li.dataset.noteIndex=i;const next=[...$('notesList').children].find(row=>Number(row.dataset.noteIndex)>i);$('notesList').insertBefore(li,next??null);}
    if(li.dataset.identified!==String(done)){
      const badge=node('span',String(i+1),'strip-badge'),copy=node('div',null,'image-note-copy');badge.setAttribute('aria-hidden','true');
      copy.append(node('h4',note.title),node('p',note.text));li.replaceChildren(badge,copy);li.dataset.identified=String(done);
    }
  }
  if(done)board.setAttribute('aria-label','Completed illustration. '+diagramDescription);
  document.querySelectorAll('.piece').forEach(b=>{const placed=state.placed.includes(Number(b.dataset.piece));b.classList.toggle('placed',placed);b.disabled=placed;});
  $('remainingCount').textContent=`${SIZE-n} remaining`; $('pieceBank').hidden=done;
  $('identityCard').hidden=!done;$('completionSummary').hidden=!done;$('clueRecap').hidden=!done;$('clueDetails').hidden=false;
  $('clueConnection').hidden=!state.solvedByGuess;
  $('learningHeading').hidden=done;$('typingDetails').hidden=done;
  $('clueSummary').textContent=`${n} of ${SIZE} pieces`;
  $('progressText').textContent=`${n} of ${SIZE} pieces`; $('progressPercent').textContent=Math.round(n/SIZE*100)+'%';
  $('progressFill').style.width=n/SIZE*100+'%'; document.querySelector('.progress-track').setAttribute('aria-valuenow',n);
  if(n!==lastCount){
    round.clues.forEach((clue,i)=>{
      const open=n>=clue.at;let li=$('clues').querySelector(`[data-clue-at="${clue.at}"]`);
      if(!li){li=node('li');li.dataset.clueAt=clue.at;$('clues').append(li);}
      if(li.dataset.unlocked!==String(open)){
        li.className=`clue ${open?'unlocked':'locked'} ${i>=4?'final':''}`;
        li.innerHTML=`<span class="clue-number" aria-hidden="true">${open?'✓':String(i+1).padStart(2,'0')}</span><div class="clue-content"><span class="clue-label">${clue.label}</span>${open?`<h3>${clue.title}</h3><p>${clue.body}</p>`:`<p class="unlock">Unlocks at ${clue.at} pieces</p>`}</div>`;
        li.dataset.unlocked=String(open);
      }
    });lastCount=n;
  }
  $('completion').hidden=!done; $('completionActions').hidden=!done; $('guessForm').hidden=done;
  $('geneHint').hidden=done;
  updateGeneHint();
  $('hint').disabled=done; $('peek').disabled=done;
  $('hint').hidden=done;$('peek').hidden=done;$('focusButton').hidden=false;$('enlargeButton').hidden=!done;$('discoveriesButton').hidden=done;
  $('geneBankButton').hidden=done;
  $('artworkPlayback').hidden=!done;
  $('status').hidden=done;
  document.querySelector('.mode-toggle').hidden=done;
  if(done){
    peek=false;$('reference').hidden=true;$('peek').setAttribute('aria-pressed','false');renderResults();
    if(!extrasShown){
      extrasShown=true;
      // Begin motion only after the final piece has settled. Restored rounds stay still.
      artworkAnimation=animatedArtwork(round,{board:$('board'),guided:before<SIZE});
      $('artworkPlayback').replaceChildren(artworkAnimation.controls,artworkAnimation.caption);
      artworkAnimation.controls.addEventListener('click',()=>completionPlayback.cancel());
      const progress=collectionProgress(key=>localStorage.getItem(key),{id:round.id,state});
      const finished=new Set(progress.filter(p=>p.done).map(p=>p.round.number));
      const extras=[mechanismFigure(round),spliceCompare(round,number=>finished.has(number),number=>rounds.some(r=>r.number===number))].filter(Boolean);
      $('mechanismContent').replaceChildren(...extras);$('revealExtras').hidden=!extras.length;
      const related=relatedRoundLinks(round.number,progress);
      $('relatedRounds').replaceChildren();
      if(related.length){$('relatedRounds').append(node('h3','Connect this round'));for(const item of related){const a=node('a',`${item.relationship} · ${item.title} →`);a.href=item.href;$('relatedRounds').append(a);}}
    }
  }
  positionCompletion();updateMode();updateSelection();
}
function formatTime(s) {return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;}
setInterval(()=>{if(timed)$('clock').textContent=formatTime(elapsedSeconds(state));},1000);
$('calm').onclick=()=>{timed=changeTimingMode(state,timed,false);render();save();};
$('timed').onclick=()=>{timed=changeTimingMode(state,timed,true);render();save();};
$('peek').onclick=()=>{start('image');peek=!peek;if(peek)state.peeks++;$('reference').hidden=!peek;$('peek').setAttribute('aria-pressed',String(peek));$('board').classList.toggle('started',state.placed.length>0||peek);strip(peek?'Reference image visible.':'Reference image hidden.');save();};
$('hint').onclick=()=>{openGeneBank();if(!state.geneHintsSeen)requestGeneHint();};
function checkGene(value,fromBank=false){
  if(complete(state))return;
  const feedback=message=>{if(fromBank)bank.feedback(message);else $('guessFeedback').textContent=message;};
  if(!normalizeGene(value)){feedback('Enter a gene symbol or product name, or keep building the image.');return;}
  start('guess');const before=state.placed.length,previous=[...state.placed];
  const answer=recognizeGene(value,round);
  if(answer&&answer.kind!=='ambiguous'&&guess(state,round.gene,round.gene)){
    start('guess',true);
    const alias=answer.kind==='product'?` ${answer.name} is encoded by ${round.gene}.`:answer.kind==='alias'?` ${answer.name} is a previous symbol for ${round.gene}.`:'';
    if(fromBank)$('geneBankDialog').close();
    selected=null;hinted=null;afterProgress(before,previous,{alias});
  } else if(answer?.kind==='ambiguous'){feedback('That identifies the RNA family. More than one gene encodes it; use the specific gene symbol or finish the image.');}
  else {feedback('Not this gene. Compare the location and function clues, or keep building the image.');if(!fromBank)$('geneGuess').setAttribute('aria-invalid','true');}
}
$('guessForm').onsubmit=e=>{e.preventDefault();checkGene($('geneGuess').value);};
function updateGeneHint(){
  const hintStatus=geneHintStatus(state);
  $('bankSymbolHint').textContent=hintStatus.nextLabel;$('bankSymbolHint').hidden=!hintStatus.hasNext;
  bank.hint(geneHintText(state,round));
}
function requestGeneHint(){start('guess');bank.hint(revealGeneHint(state,round));updateGeneHint();save();bank.focusHint();}
function openGeneBank(){updateGeneHint();openDialog('geneBankDialog');bank.focus();}
$('geneHint').onclick=()=>{openGeneBank();if(!state.geneHintsSeen)requestGeneHint();};
$('geneGuess').addEventListener('input',()=>$('geneGuess').removeAttribute('aria-invalid'));
function openDialog(id){completionPlayback.cancel();feedbackEpoch++;pieceMotion.clear();sound.stop();artworkAnimation?.pause();discoveryGuide.clear();$(id).showModal();}
$('geneBankButton').onclick=openGeneBank;
$('closeGeneBank').onclick=()=>$('geneBankDialog').close();
$('bankSymbolHint').onclick=requestGeneHint;
$('discoveriesButton').onclick=()=>openDiscoveries();
$('closeDiscoveries').onclick=()=>$('discoveriesDialog').close();
$('libraryButton').onclick=()=>{renderCollection(true);openDialog('libraryDialog');};
$('closeLibrary').onclick=()=>$('libraryDialog').close();
$('collectionReview').onclick=()=>{renderCollection(true);openDialog('libraryDialog');};
$('helpButton').onclick=()=>openDialog('helpDialog');$('startButton').onclick=()=>$('helpDialog').close();document.querySelector('#helpDialog .dialog-close').onclick=()=>$('helpDialog').close();
$('focusButton').onclick=()=>{pieceMotion.clear();discoveryGuide.clear();const on=!$('game').classList.contains('focus-view');$('game').classList.toggle('focus-view',on);$('focusButton').setAttribute('aria-pressed',String(on));$('focusButton').textContent=on?'Exit focus view':'Focus view';positionCompletion();};
const figureView=createFigureView({dialog:$('figureDialog'),frame:$('board').closest('.board-frame'),playback:$('artworkPlayback'),stageHost:$('figureStage'),controlsHost:$('figurePlayback'),motion:()=>artworkAnimation,focusTarget:$('enlargeButton'),onOpen:()=>{completionPlayback.cancel();feedbackEpoch++;pieceMotion.clear();discoveryGuide.clear();if(artworkAnimation)$('artworkPlayback').append(artworkAnimation.caption);}});
$('figureDialog').addEventListener('close',()=>{if(!$('figureDialog').open)positionCompletion();});
$('enlargeButton').onclick=()=>{if(complete(state))figureView.open();};
$('closeFigure').onclick=()=>figureView.close();
function resetRestartCopy(){
  $('restartDialog').querySelector('h2').textContent='Restart this round?';
  $('restartDialog').querySelector('p').textContent='Restarting clears your pieces and timer. You can choose Practice or Timed again.';
  $('confirmRestart').textContent='Restart round';
}
$('restart').onclick=()=>openDialog('restartDialog');$('cancelRestart').onclick=()=>{timedEntry=false;$('restartDialog').close();resetRestartCopy();};
$('restartDialog').addEventListener('cancel',()=>{timedEntry=false;resetRestartCopy();});
$('confirmRestart').onclick=()=>{
  completionPlayback.cancel();
  feedbackEpoch++;roundGeneration++;pieceMotion.clear();figureView.close();artworkAnimation?.dispose();artworkAnimation=null;discoveryGuide.clear();bank.reset();sound.stop();
  $('board').classList.remove('finishing');
  for(const panel of [$('identityCard'),$('completion')])panel.classList.remove('reveal-arriving','reveal-pending');
  $('board').querySelectorAll('.discovery-ring').forEach(n=>n.remove());
  state=newState();if(timedEntry){timed=true;timedEntry=false;}selected=null;hinted=null;peek=false;lastCount=-1;extrasShown=false;activeSlot=0;order=shuffled(order);
  $('discoveriesButton').classList.remove('has-new');
  $('game').classList.remove('focus-view');$('focusButton').setAttribute('aria-pressed','false');$('focusButton').textContent='Focus view';
  $('typingDetails').open=false;$('revealExtras').open=false;$('clueRecap').open=false;$('clinicalDetails').open=false;
  $('reference').hidden=true;$('peek').setAttribute('aria-pressed','false');$('geneGuess').value='';$('geneGuess').removeAttribute('aria-invalid');
  $('guessFeedback').textContent='Optional. A gene symbol or unambiguous product name completes the image.';$('geneHint').disabled=false;
  markers.forEach(m=>{m.hidden=true;m.classList.remove('is-new');});
  board.setAttribute('aria-label','Puzzle board, three rows and four columns');buildBoard();buildTray();render();save();$('restartDialog').close();resetRestartCopy();
  strip('Tap a piece, then tap its matching space.');$('roundSettings').open=false;trayButton(order[0])?.focus({preventScroll:true});
};
document.querySelectorAll('.new-player-button').forEach(b=>b.onclick=()=>{$('libraryDialog').close();openDialog('newPlayerDialog');});
$('cancelNewPlayer').onclick=()=>$('newPlayerDialog').close();
$('confirmNewPlayer').onclick=()=>{
  try{newPlayerKeys(Array.from({length:localStorage.length},(_,i)=>localStorage.key(i))).forEach(key=>localStorage.removeItem(key));}catch{}
  location.href=`./play.html?level=${rounds[0].number}`;
};
window.addEventListener('keydown',e=>{
  if(e.defaultPrevented||e.key!=='Escape'||selected===null||document.querySelector('dialog[open]'))return;
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
$('reference').src=artwork; $('reference').alt=diagramDescription;
$('diagramDescription').textContent=diagramDescription;
$('revealGene').textContent=round.gene;$('revealCondition').textContent=round.condition;$('revealAlias').textContent=round.otherName;
$('revealMetadata').append(node('span',round.inheritance),citation(`https://omim.org/entry/${round.omim}`,`OMIM ${round.omim}`));
const p=round.clinical;
$('revealTakeaway').append(node('span','One connection to remember','eyebrow'),node('p',p.memory));
$('revealTakeaway').lastElementChild.append(referenceMarks(round,[p.patternSource,...p.connectionSources],'Key connection'));
$('clueConnection').textContent=geneClueConnection(round);
const completionSections=[
 ['How it connects',p.connection,p.connectionSources],
 ['Clinical pattern',p.pattern,[p.patternSource]],
 ['Onset and course',p.onset,[p.patternSource]],
 ['Clinical significance',p.significance.text,p.significance.sources],
 ['Family implications',p.family.text,p.family.sources]
];
// Adjacent statements with the same sources share one citation marker group.
const sourceKey=urls=>[...new Set(urls)].sort().join('|');
$('revealLines').replaceChildren(...completionSections.map(([label,text,sources],index)=>{
 const row=node('div'),title=node('dt',label),body=node('dd',text);
  if(!completionSections[index+1]||sourceKey(sources)!==sourceKey(completionSections[index+1][2])){
   let start=index;while(start>0&&sourceKey(completionSections[start-1][2])===sourceKey(sources))start--;
   body.append(referenceMarks(round,sources,completionSections.slice(start,index+1).map(([title])=>title).join(', ')));
  }
 row.append(title,body);return row;
}));
$('referencesBody').append(referenceList(round,{heading:''}));
$('profileLink').href=`./science.html?level=${round.number}`;
$('figureDialogTitle').textContent=round.gene;$('figureDialogCondition').textContent=round.condition;$('largeFigureCaption').textContent=round.illustration.note;
$('community').textContent=round.community[0]+' ↗';$('community').href=round.community[1];
$('sourceNote').textContent=`Sources checked ${round.checked}. Conceptual artwork generated with AI; not a patient image or atomic structure.`;
buildBoard();buildTray();render();save();
if(roundComplete(state))strip('Round complete. Your illustration and results are saved.');
else if(state.started)strip('Your progress is restored.'+(timed&&state.startedAt!==null?' Elapsed time continues.':''));
else strip('Tap a piece, then tap its matching space.');
if(timedEntry&&modeLocked(state)){
  $('restartDialog').querySelector('h2').textContent='Start a new timed round?';
  $('restartDialog').querySelector('p').textContent='This replaces your saved attempt for this round. Your other rounds stay saved.';
  $('confirmRestart').textContent='Start timed round';
  openDialog('restartDialog');
}

function renderCollection(includeCards=false) {
  const score=eligibleScore(round,{state,timed,order});
  let scoreLink=$('submitRoundTime');
  if(score&&!scoreLink){scoreLink=node('a','Submit time ↗','tool');scoreLink.id='submitRoundTime';scoreLink.target='_blank';scoreLink.rel='noopener noreferrer';$('completionActions').append(scoreLink);}
  if(scoreLink){scoreLink.hidden=!score;if(score){scoreLink.href=scoreIssueURL(score);scoreLink.title='Review your public time submission on GitHub';}}
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
  $('nextRound').onclick=count===rounds.length?e=>{e.preventDefault();renderCollection(true);openDialog('libraryDialog');}:null;
  const index=rounds.indexOf(round);
  for(const [id,target] of [['previousRound',rounds[index-1]],['followingRound',rounds[index+1]]]){
    const a=$(id);a.hidden=!target;if(target){a.href=roundLink(target);a.setAttribute('aria-label',`Go to round ${target.number}`);}
  }
  if(!includeCards)return;
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

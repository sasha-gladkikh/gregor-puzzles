import {node,citation,referenceMarks,referenceList} from './clinical-ui.mjs';
import {COLS,ROWS,SIZE,W,H,CW,CH,pathFor,place,guess,complete,shuffled,normalizeGene,recognizeGene,revealGeneHint,geneHintText,geneHintStatus,geneClueConnection,landmarkPiece} from './engine.mjs';
import {rounds,allRounds,findRound,saveKey} from './rounds.mjs';
import {collectionProgress,roundLink,newPlayerKeys} from './collection.mjs';
import {artworkMarkers,artworkAnnotations} from './artwork-ui.mjs';
import {mechanismFigure,spliceCompare} from './mechanism.mjs';
import {restoreSession,restartSession,choosePiece,elapsedSeconds,startRound,recordInteraction,modeLocked,changeTimingMode,finishRound,roundComplete} from './session.mjs';
import {reduceMotion as reducedMotion,soundFeedback,assembleLogo} from './experience.mjs';
import {renderSite} from './site.mjs';
import {relatedRoundLinks} from './collection-data.mjs';
import {geneBank} from './gene-bank.mjs';
import {animatedArtwork,preloadArtwork,createCompletionPlaybackGate} from './artwork-motion.mjs';
import {discoveryMotion} from './discovery-motion.mjs';
import {createPieceMotion,dropMatchesSlot} from './piece-motion.mjs';
import {createFigureView} from './figure-view.mjs';
import {artworkSource} from './artwork-source.mjs';
import {getJourney,nextJourneyStep,journeyRoundHref} from './journeys.mjs';
import {initShareCard} from './share-card.mjs';
import {latestPlayClue,latestClueKey} from './play-learning.mjs';
import {createTermLens,renderTeachingConnection} from './teaching-ui.mjs';
import {nextOpenSlot,nextTrayPiece,horizontalRevealDelta} from './board-navigation.mjs';
import {createRoundSaveGuard,createRoundActionQueue,createDialogCommit} from './round-save.mjs';
import {createRoundCarousel} from './round-carousel.mjs';
import {eligibleScore} from './community.mjs';
import {getPlayer,getPlayerStatus,getAttempt,hasAttempt,startAttempt,updateAttempt,finishAttempt,syncPlayer,newPlayer} from './player.mjs';
const params=new URLSearchParams(location.search);
const round=findRound(params.get('level') ?? rounds[0].number);
const {pieces:pieceDescriptions,description:diagramDescription}=round;
const artwork=artworkSource(round);
const requestedJourney=getJourney(rounds,params.get('journey'));
const journey=requestedJourney?.rounds.some(item=>item.number===round.number)?requestedJourney:null;

const $ = id => document.getElementById(id);
renderSite({active:'play',roundNumber:round.number,playControls:true});
const playCarousel=createRoundCarousel($('playDiscoveryStrip'),rounds,{currentRound:round.number,assetQuery:new URL(import.meta.url).search,href:roundLink});
window.addEventListener('resize',()=>playCarousel.revealCurrent());
const sound=soundFeedback($('soundButton'));
const termLens=createTermLens();
const PIECE_PAD=44;
const NS = 'http://www.w3.org/2000/svg', KEY = saveKey(round);
const position = id => `row ${Math.floor(id/COLS)+1}, column ${id%COLS+1}`;
// Each landmark belongs to the piece that contains it; placing that piece reveals the note.
const landmarkPieces=round.illustration.landmarks.map(landmarkPiece);
const imageMarkers=artworkMarkers(round,index=>showNote(index)),markers=[...imageMarkers.children];markers.forEach(m=>m.hidden=true);$('board').append(imageMarkers);
const completedAnnotations=artworkAnnotations(round);completedAnnotations.hidden=true;$('board').append(completedAnnotations);
let stored,storedRaw=null;
try { storedRaw=localStorage.getItem(KEY);stored=JSON.parse(storedRaw); } catch {}
const roundSave=createRoundSaveGuard({read:()=>localStorage.getItem(KEY),write:value=>localStorage.setItem(KEY,value),initial:storedRaw});
let refreshingSave=false;
function ensureCurrentSave(){
  if(refreshingSave)return false;
  if(getPlayer().id!==pagePlayerId){refreshingSave=true;location.replace(`./play.html?level=${rounds[0].number}`);return false;}
  try{
    if(roundSave.current())return true;
    refreshingSave=true;location.reload();return false;
  }catch{return true;} // Storage-disabled play remains available.
}
const roundActions=createRoundActionQueue({isCurrent:ensureCurrentSave});
function runRoundAction(action){
  void sound.prepare();
  return roundActions.run(action).catch(error=>{
    console.error('Could not update this round.',error);
    $('saveNotice').hidden=false;
  });
}
// Check before handlers mutate state, not just at the next checkpoint. This
// also covers a tab awakened after missing a storage event.
for(const event of ['pointerdown','click','keydown','submit'])document.addEventListener(event,e=>{
  if(!ensureCurrentSave()){e.preventDefault();e.stopImmediatePropagation();}
},true);
window.addEventListener('storage',event=>{
  if(event.key===KEY||event.key===null)ensureCurrentSave();
  else if(rounds.some(item=>saveKey(item)===event.key))renderCollection();
});
let {state,timed,order} = restoreSession(stored);
// Preserve timing provenance when restoreSession normalizes older saves.
if(stored?.timed&&stored.state&&(stored.state.sessionVersion!==3||stored.state.timingVersion!==2||(stored.state.placed?.length&&!Number.isFinite(stored.state.startedAt))||(stored.state.placed?.length===SIZE&&!Number.isFinite(stored.state.finishedAt))))state.leaderboardIneligible=true;
// Only an accepted action in a fresh round creates history. Older saved
// completions and untracked progress are never backfilled as new attempts.
let attemptMeta=hasAttempt(state.playerAttempt)&&getAttempt(state.playerAttempt).roundNumber===round.number?state.playerAttempt:null;
const pagePlayerId=getPlayer().id;
window.addEventListener('gregor-player-change',()=>{if(getPlayer().id!==pagePlayerId)location.replace(`./play.html?level=${rounds[0].number}`);});
let canTrackFresh=!state.placed.length&&!state.seconds&&state.startedAt===null&&!state.timingUnavailable&&!state.leaderboardIneligible;
let timedEntry=params.get('mode')==='timed',persistInitialMode=false;
if(timedEntry){const entryURL=new URL(location.href);entryURL.searchParams.delete('mode');history.replaceState(null,'',entryURL.href);}
if(timedEntry&&!modeLocked(state)){timed=changeTimingMode(state,timed,true);timedEntry=false;persistInitialMode=true;}
let selected = null, hinted = null, peek = false, drag = null;
let activeSlot=0;
let lastCount = -1, extrasShown = false;
let artworkAnimation=null,lastCollectionCount=null,artworkPrepared=false;
let feedbackEpoch=0,roundGeneration=0;
let completionTimer=null,conceptTimer=null;
let inlineHintOpener=null;
const completionPlayback=createCompletionPlaybackGate();
document.addEventListener('visibilitychange',()=>{if(document.hidden){completionPlayback.cancel();feedbackEpoch++;pieceMotion.clear();sound.stop();}});
let cancelCollectionCelebration=()=>{};
const walkthroughLayout=matchMedia('(min-width: 1101px)');
function positionCompletion(){
  const panel=document.querySelector('.discovery'),sidebar=complete(state)&&walkthroughLayout.matches&&!$('game').classList.contains('focus-view');
  const summary=$('completionSummary');
  panel.classList.toggle('has-completion',sidebar);
  panel.setAttribute('aria-label',complete(state)?'Round summary':'Clues');
  if(sidebar){if(summary.parentElement!==panel){panel.prepend(summary);panel.scrollTop=0;}}
  else if(summary.parentElement!==$('imagePuzzle'))$('figureTools').after(summary);
  if(complete(state)){
    if($('clueDetails').parentElement!==$('clueRecap'))$('clueRecap').append($('clueDetails'));
  }else if($('clueDetails').parentElement!==panel)$('learningHeading').after($('clueDetails'));
  if(artworkAnimation&&!$('figureDialog').open){
    $('board').closest('.board-frame').after(artworkAnimation.caption);
  }
}
walkthroughLayout.addEventListener('change',positionCompletion);
const board = $('puzzle');
const pieceMotion=createPieceMotion({board,makePiece:artworkPiece,pathFor,COLS,W,H,CW,CH,pad:PIECE_PAD,reduceMotion:reducedMotion,onCancel:()=>sound.stop({preserveCompletion:true})});
const bank=geneBank(rounds,{onChoose:value=>runRoundAction(()=>checkGene(value,true))});
$('geneBankBody').append(bank.element);
const discoveryGuide=discoveryMotion({board:$('board'),target:discoveryTarget,isCurrent:(item,target)=>
  target!==$('latestClue')||target.dataset.discoveryKey===(item.kind==='landmark'?`landmark:${item.index}`:`clue:${item.at}`)});
const conceptRing=node('span',null,'concept-focus-ring');
conceptRing.setAttribute('aria-hidden','true');$('board').append(conceptRing);
function highlightConnection(index,selected=false){
  clearTimeout(conceptTimer);
  if(index===null){conceptRing.classList.remove('is-visible');$('board').classList.remove('concept-focused');return;}
  const point=round.illustration.landmarks[index];
  if(!point)return;
  if(selected){completionPlayback.cancel();artworkAnimation?.focusLandmark(index);conceptRing.classList.remove('is-visible');$('board').classList.remove('concept-focused');return;}
  Object.assign(conceptRing.style,{left:`${point.x}%`,top:`${point.y}%`});
  conceptRing.classList.add('is-visible');$('board').classList.add('concept-focused');
  conceptTimer=setTimeout(()=>highlightConnection(null),5000);
}
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
const save = ({force=false}={}) => {
  if(!ensureCurrentSave())return false;
  try {
    if(!roundSave.save({state,timed,order},{force})){ensureCurrentSave();return false;}
    $('saveNotice').hidden=getPlayerStatus().available;
  } catch {$('saveNotice').hidden=false;}
  if(attemptMeta)updateAttempt(attemptMeta,{state,timed});
  renderCollection();renderPlayerResult();
  return true;
};
function strip(message,items=[]) {
  const fresh=items.length>0;
  const feedback=fresh?`${state.placed.length} of ${SIZE} placed. New clue.`:message;
  $('status').dataset.needsAttention=String(/^(Try another|First select|Move closer)/.test(message));
  if($('placementFeedback').textContent!==feedback)$('placementFeedback').textContent=feedback;
  const latest=latestPlayClue(round,state.placed);
  $('latestClue').hidden=!latest;
  $('startReassurance').hidden=Boolean(latest);
  $('latestClue').dataset.discoveryKey=latestClueKey(round,state.placed);
  if(latest&&($('latestClueText').dataset.copy!==latest.text||$('latestClueTitle').textContent!==latest.title)){
    $('latestClueTitle').textContent=latest.title;$('latestClueText').textContent=latest.text;
    $('latestClueText').dataset.copy=latest.text;termLens.enhance($('latestClueText'));
  }
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
  termLens.enhance(body);
  $('discoveriesButton').classList.remove('has-new');openDialog('discoveriesDialog');
}
function start(useRoute='image',accepted=false,before=state.placed.length){
  if(!ensureCurrentSave())return false;
  void sound.prepare();if(!artworkPrepared){artworkPrepared=true;void preloadArtwork(round);}
  if(accepted)startRound(state,timed,useRoute);
  else recordInteraction(state,useRoute);
  if(!save())return false;
  if(accepted){
    if(!attemptMeta&&canTrackFresh&&before===0){
      attemptMeta=startAttempt({roundNumber:round.number,state,timed,before});
      if(attemptMeta)state.playerAttempt=attemptMeta;
      canTrackFresh=false;if(!save())return false;void syncPlayer().catch(()=>{});
    }
  }
  updateMode();return true;
}
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
    slot.addEventListener('click',()=>runRoundAction(()=>attempt(i)));
    slot.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();void runRoundAction(()=>attempt(i));}
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
    b.addEventListener('click',e=>{if(b.dataset.suppress==='1'){delete b.dataset.suppress;return;}void runRoundAction(()=>select(id,e.detail===0));});
    b.addEventListener('pointerdown',e=>startDrag(e,id,b)); tray.append(b);
  });
}
function updateTrayHint(){
  const tray=$('tray');$('trayScrollHint').hidden=tray.scrollWidth<=tray.clientWidth+1;
}
window.addEventListener('resize',updateTrayHint);
function select(id,fromKeyboard=false) {
  if(complete(state))return;
  if(!start())return;({selected,hinted}=choosePiece(selected,id)); updateSelection();
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
  if(!ensureCurrentSave())return;
  finishRound(state);
  const found=discoveries(before,previous);
  const finishing=roundComplete(state)&&before<SIZE;
  const activeBefore=document.activeElement;
  const returnToTray=id!==null&&(activeBefore?.classList.contains('slot')||activeBefore?.closest('.piece')?.dataset.piece===String(id));
  $('board').classList.toggle('finishing',finishing&&!reducedMotion());
  $('completion').classList.toggle('reveal-pending',finishing&&!reducedMotion());
  $('identityCard').classList.toggle('reveal-pending',finishing&&!reducedMotion());
  $('completionSummary').classList.toggle('reveal-pending',finishing&&!reducedMotion());
  render(before);if(!save())return;
  if(roundComplete(state)&&attemptMeta){
    finishAttempt(attemptMeta,{state,timed,eligible:Boolean(eligibleScore(round,{state,timed}))});
    void syncPlayer().catch(()=>{});
  }
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
        for(const panel of [$('completionSummary'),$('identityCard'),$('completion')]){panel.classList.remove('reveal-pending');panel.classList.add('reveal-arriving');}
        // Always reveal the information. A later interaction can cancel autoplay.
        // Completion focus is independent of decorative motion cancellation.
        const active=document.activeElement;
        if(!document.querySelector('dialog[open]')&&(active===document.body||active?.closest('#tray,#puzzle,#guessForm,#geneBankDialog')))
          $('revealTitle').focus({preventScroll:true});
        $('board').classList.add('completion-settled');
        clearTimeout(completionTimer);
        completionTimer=setTimeout(()=>{
          if(generation===roundGeneration&&takeAutoplay()&&!result.cancelled&&epoch===feedbackEpoch&&!document.hidden&&!document.querySelector('dialog[open]'))artworkAnimation?.play();
        },reducedMotion()?0:850);
      });
    }
  } else {
    strip(`${state.placed.length} of ${SIZE} placed.`,found);
    const point=id===null?{x:50,y:50}:{x:(id%COLS+.5)/COLS*100,y:(Math.floor(id/COLS)+.5)/ROWS*100};
    settled.then(result=>{
      if(!result.cancelled&&generation===roundGeneration&&epoch===feedbackEpoch&&!complete(state))
        discoveryGuide.show(found.map(item=>({...item,point:item.kind==='landmark'?round.illustration.landmarks[item.index]:point})));
    });
    if(returnToTray)focusRemainingPiece(id);
  }
}
function focusRemainingPiece(from){
  const tray=$('tray'),bounds=tray.getBoundingClientRect();
  const visible=[...tray.querySelectorAll('.piece:not(.placed)')].filter(button=>{
    const rect=button.getBoundingClientRect();return rect.right>bounds.left+Math.min(rect.width/2,20)&&rect.left<bounds.right-Math.min(rect.width/2,20);
  }).map(button=>Number(button.dataset.piece));
  const id=nextTrayPiece(from,order,state.placed,visible),button=id===null?null:trayButton(id);
  if(!button)return;
  button.focus({preventScroll:true});
  if(tray.scrollWidth>tray.clientWidth)tray.scrollLeft+=horizontalRevealDelta(bounds,button.getBoundingClientRect());
}
function attempt(slot,{fromDrag=false}={}) {
  if(selected===null){strip('First select a piece from the tray.');return;}
  if(!start())return;const before=state.placed.length,previous=[...state.placed],id=selected,from=fromDrag?null:trayButton(id)?.querySelector('svg').getBoundingClientRect();
  if(!place(state,id,slot)){
    const path=slotAt(slot);path?.classList.remove('miss');path?.getBoundingClientRect();path?.classList.add('miss');setTimeout(()=>path?.classList.remove('miss'),450);
    strip('Try another position. Match the shape and image.');return;
  }
  if(!start('image',true,before))return;selected=null; hinted=null; afterProgress(before,previous,{id,from});
}
function startDrag(e,id,b) {
  if(e.pointerType==='touch'||e.button!==0||state.placed.includes(id))return;
  drag={id,b,x:e.clientX,y:e.clientY,moved:false,pointer:e.pointerId}; b.setPointerCapture(e.pointerId);
}
window.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointer)return;
  const d=drag; if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<7)return;
  if(!d.moved){
    d.moved=true;selected=d.id;hinted=null;d.b.classList.add('dragging');
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
    if(dropMatchesSlot(d.id,{x,y},{COLS,ROWS,CW,CH}))void runRoundAction(()=>{selected=d.id;attempt(d.id,{fromDrag:true});});
    else strip('Move closer to its place, or click to place it.');
  }
  drag=null;
}
window.addEventListener('pointerup',e=>endDrag(e));
window.addEventListener('pointercancel',e=>endDrag(e,true));
function updateMode() {
  $('calm').setAttribute('aria-pressed',String(!timed)); $('timed').setAttribute('aria-pressed',String(timed));
  $('calm').disabled=modeLocked(state); $('timed').disabled=modeLocked(state); $('restart').hidden=!state.started;
  $('timingNote').textContent=modeLocked(state)?'Restart to change mode.':'Choose a mode before placing your first piece. Hints and picture views do not start the timer.';
  $('clock').hidden=!timed||state.timingUnavailable||complete(state); $('clock').textContent=formatTime(elapsedSeconds(state));
}
function renderPlayerResult(){
  const target=$('playerResult');if(!target)return;
  const attempt=attemptMeta?getAttempt(attemptMeta):null;target.hidden=!complete(state)||!attempt;
  if(target.hidden)return;
  const player=getPlayer(),status=getPlayerStatus();
  target.textContent=!status.available?'Your browser is blocking saved history. Keep this page open.':player.joined?(status.pending?'Saved to your player history. Leaderboard sync pending.':`Saved to ${player.displayName}’s player history and leaderboard.`):'Saved to your player history in this browser. Add a name on the leaderboard to share your progress.';
}
window.addEventListener('gregor-player-change',renderPlayerResult);
function renderResults() {
  const plural=(n,word)=>`${n} ${word}${n===1?'':'s'}`;
  const mode=timed?(state.timingUnavailable?'Timed · time unavailable':`Timed · ${formatTime(elapsedSeconds(state))}`):'Untimed';
  const route=state.solvedByGuess?(state.namedAt!==null?`Identified this round at ${state.namedAt} of ${SIZE} pieces`:'Gene recognition'):state.usedRoutes.includes('legacy')?'Restored progress':'Image puzzle';
  $('roundResults').textContent=[mode,route,plural(state.hints,'hint'),plural(state.peeks,'picture view')].join(' · ');
  renderPlayerResult();
}
function render(before=state.placed.length) {
  const n=state.placed.length, done=complete(state);
  $('game').classList.toggle('round-complete',done);
  completedAnnotations.hidden=!done;
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
    marker.dataset.discoveryAccent=String(i+1);
    marker.removeAttribute('aria-pressed');marker.setAttribute('aria-haspopup','dialog');marker.setAttribute('aria-controls','discoveriesDialog');
  });
  const found=landmarkPieces.map((piece,i)=>state.placed.includes(piece)?i:-1).filter(i=>i>=0);
  $('notesFound').hidden=!found.length;
  // Stable rows keep an in-flight discovery attached to its destination when
  // another piece is placed. Only new or newly identified content is replaced.
  for(const li of [...$('notesList').children])if(!found.includes(Number(li.dataset.noteIndex)))li.remove();
  for(const i of found){
    const note=noteFor(i);let li=$('notesList').querySelector(`[data-note-index="${i}"]`);
    if(!li){li=node('li');li.dataset.noteIndex=i;li.dataset.discoveryAccent=String(i+1);const next=[...$('notesList').children].find(row=>Number(row.dataset.noteIndex)>i);$('notesList').insertBefore(li,next??null);}
    if(li.dataset.identified!==String(done)){
      const badge=node('span',String(i+1),'strip-badge'),copy=node('div',null,'image-note-copy');badge.setAttribute('aria-hidden','true');
      copy.append(node('h4',note.title),node('p',note.text));li.replaceChildren(badge,copy);li.dataset.identified=String(done);
    }
  }
  if(done)board.setAttribute('aria-label','Completed illustration. '+diagramDescription);
  document.querySelectorAll('.piece').forEach(b=>{const placed=state.placed.includes(Number(b.dataset.piece));b.classList.toggle('placed',placed);b.disabled=placed;});
  $('remainingCount').textContent=`${SIZE-n} remaining`; $('pieceBank').hidden=done;
  $('identityCard').hidden=!done;$('completionSummary').hidden=!done;$('clueRecap').hidden=!done;$('clueDetails').hidden=false;
  $('clueConnection').hidden=!done;
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
    });termLens.enhance($('clues'));termLens.enhance($('notesList'));lastCount=n;
  }
  $('completion').hidden=!done; $('completionActions').hidden=!done; $('guessForm').hidden=done;
  $('geneHint').hidden=done;
  updateGeneHint();
  $('hint').disabled=done; $('peek').disabled=done;
  $('hint').hidden=done;$('peek').hidden=done;$('focusButton').hidden=false;$('enlargeButton').hidden=!done;$('discoveriesButton').hidden=done;
  $('geneBankButton').hidden=done;
  if(done){$('inlineGeneHint').hidden=true;$('hint').setAttribute('aria-expanded','false');}
  $('artworkPlayback').hidden=!done;
  $('status').hidden=done;
  document.querySelector('.mode-toggle').hidden=done;
  if(done){
    peek=false;$('reference').hidden=true;$('peek').setAttribute('aria-pressed','false');renderResults();
    if(!extrasShown){
      extrasShown=true;
      // Begin motion only after the final piece has settled. Restored rounds stay still.
      artworkAnimation=animatedArtwork(round,{board:$('board'),guided:before<SIZE,onInteract:()=>completionPlayback.cancel()});
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
  positionCompletion();updateMode();updateSelection();updateTrayHint();
}
function formatTime(s) {return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;}
setInterval(()=>{if(timed)$('clock').textContent=formatTime(elapsedSeconds(state));},1000);
$('calm').onclick=()=>runRoundAction(()=>{timed=changeTimingMode(state,timed,false);render();save();});
$('timed').onclick=()=>runRoundAction(()=>{timed=changeTimingMode(state,timed,true);render();save();});
$('peek').onclick=()=>runRoundAction(()=>{if(!start('image'))return;peek=!peek;if(peek)state.peeks++;$('reference').hidden=!peek;$('peek').setAttribute('aria-pressed',String(peek));$('board').classList.toggle('started',state.placed.length>0||peek);strip(peek?'Picture shown.':'Picture hidden.');save();});
$('hint').onclick=()=>runRoundAction(()=>openInlineHint());
function checkGene(value,fromBank=false){
  if(complete(state))return;
  const feedback=message=>{if(fromBank)bank.feedback(message);else $('guessFeedback').textContent=message;};
  if(!normalizeGene(value)){feedback('Enter a gene symbol or product name, or keep building the image.');return;}
  if(!start('guess'))return;const before=state.placed.length,previous=[...state.placed];
  const answer=recognizeGene(value,round);
  if(answer&&answer.kind!=='ambiguous'&&guess(state,round.gene,round.gene)){
    if(!start('guess',true,before))return;
    const alias=answer.kind==='product'?` ${answer.name} is encoded by ${round.gene}.`:answer.kind==='alias'?` ${answer.name} is a previous symbol for ${round.gene}.`:'';
    if(fromBank)$('geneBankDialog').close();
    selected=null;hinted=null;afterProgress(before,previous,{alias});
  } else if(answer?.kind==='ambiguous'){feedback('That identifies the RNA family. More than one gene encodes it; use the specific gene symbol or finish the image.');}
  else {feedback('Not this gene. Compare the location and function clues, or keep building the image.');if(!fromBank)$('geneGuess').setAttribute('aria-invalid','true');}
}
$('guessForm').onsubmit=e=>{e.preventDefault();const value=$('geneGuess').value;void runRoundAction(()=>checkGene(value));};
function updateGeneHint(){
  const inlineStepFocused=document.activeElement===$('nextInlineHint');
  const hintStatus=geneHintStatus(state);
  $('bankSymbolHint').textContent=hintStatus.nextLabel;$('bankSymbolHint').hidden=!hintStatus.hasNext;
  bank.hint(geneHintText(state,round));
  $('nextInlineHint').textContent=hintStatus.nextLabel;$('nextInlineHint').hidden=!hintStatus.hasNext;
  $('inlineHintTitle').textContent=`Gene hint · ${hintStatus.seen} of ${hintStatus.total}`;
  const text=geneHintText(state,round)??'';
  if($('inlineHintText').dataset.copy!==text){$('inlineHintText').textContent=text;$('inlineHintText').dataset.copy=text;termLens.enhance($('inlineHintText'));}
  if(!hintStatus.hasNext&&inlineStepFocused)$('inlineHintTitle').focus({preventScroll:true});
}
function requestGeneHint(){if(!start('guess'))return false;bank.hint(revealGeneHint(state,round));updateGeneHint();if(!save())return false;if($('geneBankDialog').open)bank.focusHint();return true;}
function openInlineHint(opener=$('hint')){
  inlineHintOpener=opener;
  $('inlineGeneHint').hidden=false;$('hint').setAttribute('aria-expanded','true');
  if(!geneHintStatus(state).seen){if(!requestGeneHint())return;}else updateGeneHint();
  $('inlineGeneHint').scrollIntoView({block:'nearest',behavior:'instant'});
  $('inlineHintTitle').focus({preventScroll:true});
}
function openGeneBank(){updateGeneHint();openDialog('geneBankDialog');bank.focus();}
$('geneHint').onclick=()=>runRoundAction(()=>openInlineHint($('geneHint')));
function closeInlineHint(){termLens.close();$('inlineGeneHint').hidden=true;$('hint').setAttribute('aria-expanded','false');(inlineHintOpener??$('hint')).focus({preventScroll:true});}
$('closeInlineHint').onclick=closeInlineHint;
$('inlineGeneHint').addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();closeInlineHint();}});
$('nextInlineHint').onclick=()=>runRoundAction(requestGeneHint);
$('hintChoices').onclick=openGeneBank;
$('geneGuess').addEventListener('input',()=>$('geneGuess').removeAttribute('aria-invalid'));
function openDialog(id){termLens.close();highlightConnection(null);completionPlayback.cancel();feedbackEpoch++;pieceMotion.clear();sound.stop();artworkAnimation?.pause();discoveryGuide.clear();$(id).showModal();}
$('geneBankButton').onclick=openGeneBank;
$('closeGeneBank').onclick=()=>$('geneBankDialog').close();
$('bankSymbolHint').onclick=()=>runRoundAction(requestGeneHint);
$('discoveriesButton').onclick=()=>openDiscoveries();
$('closeDiscoveries').onclick=()=>$('discoveriesDialog').close();
$('libraryButton').onclick=()=>{renderCollection(true);openDialog('libraryDialog');};
$('closeLibrary').onclick=()=>$('libraryDialog').close();
$('helpButton').onclick=()=>openDialog('helpDialog');$('startButton').onclick=()=>$('helpDialog').close();document.querySelector('#helpDialog .dialog-close').onclick=()=>$('helpDialog').close();
$('focusButton').onclick=()=>{pieceMotion.clear();discoveryGuide.clear();const on=!$('game').classList.contains('focus-view');$('game').classList.toggle('focus-view',on);$('focusButton').setAttribute('aria-pressed',String(on));$('focusButton').textContent=on?'Exit focus view':'Focus view';positionCompletion();};
const figureView=createFigureView({dialog:$('figureDialog'),frame:$('board').closest('.board-frame'),playback:$('artworkPlayback'),stageHost:$('figureStage'),controlsHost:$('figurePlayback'),motion:()=>artworkAnimation,focusTarget:$('enlargeButton'),onOpen:()=>{completionPlayback.cancel();feedbackEpoch++;pieceMotion.clear();discoveryGuide.clear();if(artworkAnimation)$('artworkPlayback').append(artworkAnimation.caption);}});
$('figureDialog').addEventListener('close',()=>{if(!$('figureDialog').open)positionCompletion();});
$('enlargeButton').onclick=()=>{if(complete(state))figureView.open();};
$('closeFigure').onclick=()=>figureView.close();
function resetRestartCopy(){
  $('restartDialog').querySelector('h2').textContent='Restart this round?';
  $('restartDialog').querySelector('p').textContent='Restarting resets the current puzzle. Your completed-round check, field-guide entry, and recorded attempts stay saved.';
  $('confirmRestart').textContent='Restart round';
}
$('restart').onclick=()=>openDialog('restartDialog');$('cancelRestart').onclick=()=>{timedEntry=false;$('restartDialog').close();resetRestartCopy();};
$('restartDialog').addEventListener('cancel',()=>{timedEntry=false;resetRestartCopy();});
function restartRound(){
  if(attemptMeta){finishAttempt(attemptMeta,{state,timed,status:'restarted'});void syncPlayer().catch(()=>{});}
  attemptMeta=null;canTrackFresh=true;
  completionPlayback.cancel();
  feedbackEpoch++;roundGeneration++;pieceMotion.clear();figureView.close();artworkAnimation?.dispose();artworkAnimation=null;discoveryGuide.clear();bank.reset();sound.stop();
  clearTimeout(completionTimer);termLens.close();highlightConnection(null);
  $('inlineGeneHint').hidden=true;$('hint').setAttribute('aria-expanded','false');
  $('board').classList.remove('finishing','completion-settled');
  for(const panel of [$('completionSummary'),$('identityCard'),$('completion')])panel.classList.remove('reveal-arriving','reveal-pending');
  $('board').querySelectorAll('.discovery-ring').forEach(n=>n.remove());
  state=restartSession(state).state;if(timedEntry){timed=true;timedEntry=false;}selected=null;hinted=null;peek=false;lastCount=-1;extrasShown=false;activeSlot=0;order=shuffled(order);
  $('discoveriesButton').classList.remove('has-new');
  $('game').classList.remove('focus-view');$('focusButton').setAttribute('aria-pressed','false');$('focusButton').textContent='Focus view';
  $('typingDetails').open=false;$('revealExtras').open=false;$('clueRecap').open=false;$('clinicalDetails').open=false;
  $('reference').hidden=true;$('peek').setAttribute('aria-pressed','false');$('geneGuess').value='';$('geneGuess').removeAttribute('aria-invalid');
  $('guessFeedback').textContent='Optional. A gene symbol or unambiguous product name completes the image.';$('geneHint').disabled=false;
  markers.forEach(m=>{m.hidden=true;m.classList.remove('is-new');});
  board.setAttribute('aria-label','Puzzle board, three rows and four columns');buildBoard();buildTray();render();if(!save({force:true}))return;$('restartDialog').close();resetRestartCopy();
  strip('Tap a piece, then tap its matching space.');$('roundSettings').open=false;trayButton(order[0])?.focus({preventScroll:true});
  return true;
}
$('confirmRestart').onclick=()=>runRoundAction(restartRound);
$('replayPuzzle').onclick=()=>runRoundAction(()=>{
  if(!complete(state))return;
  if(restartRound())$('roundTitle').scrollIntoView({block:'start',behavior:reducedMotion()?'instant':'smooth'});
});
document.querySelectorAll('.new-player-button').forEach(b=>b.onclick=()=>{$('libraryDialog').close();openDialog('newPlayerDialog');});
const playerReset=createDialogCommit({
  isOpen:()=>$('newPlayerDialog').open,
  onPending:pending=>{
    $('confirmNewPlayer').disabled=pending;$('cancelNewPlayer').disabled=pending;
    $('newPlayerDialog').setAttribute('aria-busy',String(pending));
  }
});
$('cancelNewPlayer').onclick=()=>{if(!playerReset.pending)$('newPlayerDialog').close();};
$('newPlayerDialog').addEventListener('cancel',event=>{if(playerReset.pending)event.preventDefault();});
$('confirmNewPlayer').onclick=()=>runRoundAction(async()=>{
  const notice=$('newPlayerStatus');
  try{
    await playerReset.run(async()=>{
      notice.textContent='Saving results and starting a new player. Please wait; this step cannot be cancelled.';
      await newPlayer();
      // Preserve the newly rotated player identity while clearing old game saves.
      try{newPlayerKeys(Array.from({length:localStorage.length},(_,i)=>localStorage.key(i))).filter(key=>!key.startsWith('gregor-puzzles:player:v1:')).forEach(key=>localStorage.removeItem(key));}catch{}
      location.href=`./play.html?level=${rounds[0].number}`;
    });
  }catch(error){notice.textContent=`${error.message} Your current player and history have been kept. Retry when connected, or cancel.`;}
});
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
if(journey){$('journeyProgress').hidden=false;$('journeyProgress').textContent=`${journey.title} · Step ${journey.rounds.findIndex(item=>item.number===round.number)+1} of ${journey.rounds.length}`;}
$('libraryLabel').textContent=`Browse rounds`;
$('figureLabel').textContent=`FIG. ${round.number} / ${round.topic.toUpperCase()}`;
$('reference').src=artwork; $('reference').alt=diagramDescription;
$('diagramDescription').textContent=diagramDescription;
$('revealGene').textContent=round.gene;$('revealCondition').textContent=round.condition;$('revealAlias').hidden=!round.otherName;$('revealAlias').textContent=round.otherName;
$('revealMetadata').append(node('span',round.inheritance),citation(`https://omim.org/entry/${round.omim}`,`OMIM ${round.omim}`));
const p=round.clinical;
renderTeachingConnection($('clueConnection'),round,geneClueConnection(round),highlightConnection);
$('clueConnection').append(referenceMarks(round,p.connectionSources,'Picture and clinical connection'));
termLens.enhance($('clueConnection'));
const completionSections=[
 ['How it connects',p.connection,p.connectionSources],
 ['Clinical pattern',p.pattern,[p.patternSource]],
 ['Onset and course',p.onset,[p.patternSource]],
 ['Clinical significance',p.significance.text,p.significance.sources],
 ['Family implications',p.family.text,p.family.sources],
 ['Remember',p.memory,[p.patternSource,...p.connectionSources]]
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
termLens.enhance($('revealLines'));
$('referencesBody').append(referenceList(round,{heading:''}));
$('profileLink').href=`./science.html?level=${round.number}`;
$('figureDialogTitle').textContent=round.gene;$('figureDialogCondition').textContent=round.condition;$('largeFigureCaption').textContent=round.illustration.note;
$('community').textContent=round.community[0]+' ↗';$('community').href=round.community[1];
$('sourceNote').textContent=`Sources checked ${round.checked}. Conceptual artwork generated with AI; not a patient image or atomic structure.`;
const shareCard=initShareCard($('shareIllustration'),{
  getData:()=>roundComplete(state)?{round:{...round,artwork},completed:collectionProgress(key=>{try{return localStorage.getItem(key);}catch{return null;}},{id:round.id,state}).filter(item=>item.done).length,total:rounds.length}:null,
  onOpen:()=>{completionPlayback.cancel();feedbackEpoch++;pieceMotion.clear();sound.stop();artworkAnimation?.pause();discoveryGuide.clear();}
});
window.addEventListener('pagehide',event=>{
  clearTimeout(completionTimer);clearTimeout(conceptTimer);termLens.close();
  if(!event.persisted){shareCard.destroy();termLens.destroy();}
});
// Merely opening a round must not rewrite it: otherwise two tabs repeatedly
// reload each other. A requested timing-mode change is the only startup write.
buildBoard();buildTray();render();renderCollection();
if(persistInitialMode)void runRoundAction(save);
void syncPlayer().catch(()=>{});
window.addEventListener('pageshow',()=>void syncPlayer().catch(()=>{}));
if(roundComplete(state))strip('Round complete. Your illustration and results are saved.');
else if(state.started)strip('Your progress is restored.'+(timed&&state.startedAt!==null?' Elapsed time continues.':''));
else strip('Tap a piece, then tap its matching space.');
if(timedEntry&&modeLocked(state)){
  $('restartDialog').querySelector('h2').textContent='Start a new timed round?';
  $('restartDialog').querySelector('p').textContent='This starts a fresh timed puzzle. Your recorded attempts and other rounds stay saved.';
  $('confirmRestart').textContent='Start timed round';
  openDialog('restartDialog');
}

function renderCollection(includeCards=false) {
  const progress=collectionProgress(key=>localStorage.getItem(key),{id:round.id,state});
  playCarousel.update(progress);
  const count=progress.filter(p=>p.done).length,anyStarted=progress.some(p=>p.started);
  $('collectionCount').textContent=`${count} of ${rounds.length} complete`;
  $('libraryProgress').textContent=`${count} of ${rounds.length} rounds complete. Progress is saved in this browser.`;
  $('collectionFill').style.width=`${count/rounds.length*100}%`;
  $('collectionFinished').hidden=count!==rounds.length;
  if(count!==rounds.length)cancelCollectionCelebration();
  if(count===rounds.length&&lastCollectionCount!==null&&lastCollectionCount<rounds.length){cancelCollectionCelebration();cancelCollectionCelebration=assembleLogo($('collectionLogo'));}
  lastCollectionCount=count;
  const next=progress.find(p=>Number(p.round.number)>Number(round.number)&&!p.done)??progress.find(p=>!p.done&&p.round.id!==round.id);
  $('nextRound').href=next?roundLink(next.round):'./collection.html';
  $('nextRound').textContent=next?`Next round · ${next.round.number} →`:'View collection →';
  $('nextRound').onclick=null;
  const journeyNext=journey?nextJourneyStep(rounds,progress,journey.id,round.number):null;
  if(journeyNext){
    $('nextRound').href=journeyNext.href;
    $('nextRound').textContent=`${journeyNext.label}${journeyNext.round?` · ${journeyNext.round.number}`:''} →`;
    $('nextRound').onclick=null;
  }
  const navigation=journey?.rounds??rounds,index=navigation.indexOf(round);
  for(const [id,target] of [['previousRound',navigation[index-1]],['followingRound',navigation[index+1]]]){
    const a=$(id);a.hidden=!target;if(target){a.href=journey?journeyRoundHref(target,journey.id):roundLink(target);a.setAttribute('aria-label',`Go to round ${target.number}`);}
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
    const status=document.createElement('span');status.className='level-status';status.textContent=item.replaying?`Complete ✓ · Replay ${item.pieces}/12`:item.done?`${item.round.gene} · Complete ✓`:item.started?`${item.pieces}/12 pieces`:i===0&&!anyStarted?'Start here':'Ready to explore';
    const bar=document.createElement('span');bar.className='level-progress';const fill=document.createElement('span');fill.style.width=item.percent+'%';bar.append(fill);
    a.append(thumbnail,num,title,topic,status);
    if(item.done)a.append(node('span',item.round.condition,'level-condition'));
    a.append(bar);$('levelGrid').append(a);
  }
}
requestAnimationFrame(()=>playCarousel.revealCurrent());

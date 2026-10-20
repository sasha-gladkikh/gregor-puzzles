// Lightweight, answer-free discovery metadata. The supplied catalogue is always
// the published subset; these features must never add an unpublished round.
import {availableJourneys,journeyRoundHref} from './journeys.mjs';
const QUESTIONS={
 '01':'How does a muscle cell reset after a signal?',
 '02':'How do neighboring cells stay connected?',
 '03':'How does a cell recycle molecular building blocks?',
 '04':'How does a cell prepare to make proteins?',
 '05':'How does a cell edit an RNA message?',
 '06':'How does one nerve cell signal to another?',
 '07':'How are growth signals kept in balance?',
 '08':'What makes a specialist RNA editor different?',
 '09':'What happens when an immune signal stays on?',
 '10':'What can an expanded DNA repeat change?',
};

function publishedCatalogue(catalogue){
 const seen=new Set();
 return (Array.isArray(catalogue)?catalogue:[]).filter(round=>{
  if(!round||!/^\d{2}$/.test(round.number)||typeof round.topic!=='string'||seen.has(round.number))return false;
  seen.add(round.number);return true;
 });
}

export function discoveryProgress(catalogue,progressItems=[]){
 const lookup=new Map((Array.isArray(progressItems)?progressItems:[]).filter(item=>item?.round).map(item=>[item.round.number,item]));
 return publishedCatalogue(catalogue).map(round=>{
  const item=lookup.get(round.number),done=item?.done===true;
  const pieces=done?12:Math.max(0,Math.min(11,Math.floor(Number(item?.pieces)||0)));
  return {round,done,pieces,state:done?'complete':pieces?'started':'new'};
 });
}

export function discoveryJourneys(catalogue,progressItems=[]){
 const items=discoveryProgress(catalogue,progressItems),lookup=new Map(items.map(item=>[item.round.number,item]));
 return availableJourneys(items.map(item=>item.round)).map(journey=>{
  const rounds=journey.rounds.map(round=>lookup.get(round.number));
  const next=rounds.find(item=>!item.done&&item.pieces>0)??rounds.find(item=>!item.done)??rounds[0];
  return {...journey,rounds,next,completed:rounds.filter(item=>item.done).length};
 }).filter(journey=>journey.rounds.length>=2);
}

export function dailyHomeRound(catalogue,date=new Date()){
 const rounds=publishedCatalogue(catalogue);
 if(!rounds.length||!(date instanceof Date)||!Number.isFinite(date.getTime()))return null;
 // Local calendar components make the choice stable for the visitor's whole
 // day. UTC arithmetic avoids DST making consecutive days skip or repeat.
 const day=Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
 return rounds[((day%rounds.length)+rounds.length)%rounds.length];
}

function el(doc,tag,text,className){
 const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;
}
function art(doc,round,className){
 const image=el(doc,'img',undefined,className);image.src=`./artwork/${round.number}.webp`;image.alt='';image.width=1200;image.height=900;image.loading='lazy';image.decoding='async';return image;
}
function roundLink(doc,round,text,className){const link=el(doc,'a',text,className);link.href=`./play.html?level=${round.number}`;return link;}
function question(round){return QUESTIONS[round.number]??round.topic;}

export function initHomeExplore(catalogue,progressItems=[]){
 const doc=document,collection=doc.getElementById('homeProgressCollection'),journeys=doc.getElementById('homeJourneys'),daily=doc.getElementById('homeDaily');
 function update(progress){
  const items=discoveryProgress(catalogue,progress);
  if(collection){
   const returning=items.some(item=>item.done||item.pieces>0);collection.hidden=!returning;
   if(returning){
    const head=el(doc,'div',undefined,'discovery-heading'),title=el(doc,'h2','Your discoveries');
    head.append(title,el(doc,'p',`${items.filter(item=>item.done).length} of ${items.length} complete`));
    const strip=el(doc,'ol',undefined,'discovery-strip');strip.setAttribute('aria-label','Your puzzle collection');
    for(const item of items){
     const entry=el(doc,'li'),link=roundLink(doc,item.round,undefined,'discovery-thumb');link.dataset.state=item.state;
     const status=item.done?'Complete':item.pieces?`${item.pieces} of 12 pieces`:'Not started';
     link.setAttribute('aria-label',`Round ${item.round.number}: ${item.round.topic}. ${status}.`);
     const image=art(doc,item.round),badge=el(doc,'span',item.done?'✓':item.round.number,'discovery-thumb-number');badge.setAttribute('aria-hidden','true');
     const track=el(doc,'span',undefined,'discovery-thumb-progress');track.setAttribute('aria-hidden','true');track.style.setProperty('--piece-progress',`${item.pieces/12*100}%`);
     link.append(image,badge,track);entry.append(link);strip.append(entry);
    }
    collection.replaceChildren(head,strip);
   }else collection.replaceChildren();
  }
  if(journeys){
   const paths=discoveryJourneys(catalogue,progress);journeys.hidden=!paths.length;
   const heading=el(doc,'div',undefined,'discovery-heading');heading.append(el(doc,'h2','Go a little deeper.'),el(doc,'p','A few connected discoveries. Your choice of where to start.'));
   const grid=el(doc,'div',undefined,'discovery-journeys');
   for(const journey of paths){
    const card=el(doc,'article',undefined,'discovery-journey');card.dataset.journey=journey.id;
    const pictures=el(doc,'div',undefined,'discovery-journey-pictures');pictures.setAttribute('aria-hidden','true');
    journey.rounds.forEach(({round})=>pictures.append(art(doc,round)));
    const title=el(doc,'h3',journey.title),copy=el(doc,'p',journey.question),meta=el(doc,'p',`${journey.rounds.length} rounds${journey.completed?` · ${journey.completed} complete`:''}`,'discovery-meta');
    const action=roundLink(doc,journey.next.round,journey.completed===journey.rounds.length?'Explore again →':journey.next.pieces?'Continue exploring →':'Start exploring →','discovery-action');action.setAttribute('aria-label',`${action.textContent.replace(' →','')}: ${journey.title}`);
    action.href=journeyRoundHref(journey.next.round,journey.id);
    card.append(pictures,title,copy,meta,action);grid.append(card);
   }
   journeys.replaceChildren(heading,grid);
  }
  if(daily){
   const round=dailyHomeRound(catalogue);daily.hidden=!round;
   if(round){
    const item=items.find(item=>item.round.number===round.number),copy=el(doc,'div',undefined,'discovery-daily-copy');
    const eyebrow=el(doc,'p','Today’s pick · From the collection','discovery-eyebrow');
    const title=el(doc,'h2',question(round)),meta=el(doc,'p',`Round ${round.number} · ${round.topic}`,'discovery-meta');
    const link=roundLink(doc,round,item?.done?'Revisit puzzle →':item?.pieces?'Continue this puzzle →':'Explore today’s pick →','discovery-action');
    copy.append(eyebrow,title,meta,link);daily.replaceChildren(art(doc,round,'discovery-daily-art'),copy);
   }else daily.replaceChildren();
  }
 }
 update(progressItems);return {update};
}

// At most one actual illustration animates at a time. Preview is a short,
// optional excerpt and does not alter game progress, scores, or sound settings.
export function initFeaturedGallery(catalogue,host=document.getElementById('featuredGallery')){
 if(!host)return {dispose(){}};
 const doc=host.ownerDocument,win=doc.defaultView,allowed=new Map(publishedCatalogue(catalogue).map(round=>[round.number,round]));
 const reduced=win.matchMedia('(prefers-reduced-motion: reduce)'),hover=win.matchMedia('(hover: hover) and (pointer: fine)');
 let active=null,sequence=0,timer=null,disposed=false,modulePromise;
 const items=[];
 const announce=el(doc,'span',undefined,'discovery-sr');announce.setAttribute('role','status');
 host.classList.add('discovery-gallery');
 const controls=el(doc,'div',undefined,'discovery-gallery-controls');controls.setAttribute('role','group');controls.setAttribute('aria-label','Browse puzzle previews');
 const previous=el(doc,'button','←','discovery-gallery-arrow'),next=el(doc,'button','→','discovery-gallery-arrow'),position=el(doc,'span',undefined,'discovery-gallery-position');
 previous.type=next.type='button';previous.setAttribute('aria-label','Previous puzzle preview');next.setAttribute('aria-label','Next puzzle preview');
 previous.setAttribute('aria-controls',host.id);next.setAttribute('aria-controls',host.id);controls.append(previous,position,next);host.after(controls,announce);
 function stop(){
  sequence++;win.clearTimeout(timer);timer=null;
  if(active){active.animation?.reset();active.button.textContent='Preview motion';active.button.setAttribute('aria-pressed','false');active.tile.classList.remove('is-previewing');active=null;}
 }
 async function preview(item,explicit=false){
  if(disposed)return;
  if(reduced.matches){if(explicit)announce.textContent='Motion is off in your device settings. The complete illustration is shown.';return;}
  if(active===item){if(explicit)stop();return;}
  stop();active=item;const request=sequence;
  item.button.textContent='Preparing…';item.button.setAttribute('aria-pressed','true');
  try{
   modulePromise??=import('./artwork-motion.mjs').catch(error=>{modulePromise=null;throw error;});const {animatedArtwork}=await modulePromise;
   if(disposed||request!==sequence)return;
   if(!item.animation){
    const anonymous={...item.round,artwork:`./artwork/${item.round.number}.webp`,illustration:{takeaway:item.round.topic,landmarks:[]}};
    item.animation=animatedArtwork(anonymous,{board:item.board,autoplay:false,guided:false});
    // The existing static alt describes the artwork. Animation-only titles can
    // contain completed-round names, so keep the decorative overlay anonymous.
    item.animation?.element.setAttribute('aria-hidden','true');
    item.animation?.element.querySelectorAll('title,desc').forEach(node=>node.remove());
   }
   const ready=await item.animation?.ready;
   if(disposed||request!==sequence)return;
   if(!ready){item.animation?.dispose();item.animation=null;stop();announce.textContent='The motion preview could not load. Try Preview motion again or open the puzzle.';return;}
   item.animation.play();item.tile.classList.add('is-previewing');item.button.textContent='Pause preview';
   timer=win.setTimeout(stop,7000);
  }catch{if(request===sequence){item.animation?.dispose();item.animation=null;stop();announce.textContent='The motion preview could not load. Try Preview motion again or open the puzzle.';}}
 }
 for(const card of host.querySelectorAll('.featured-card')){
  const number=new URL(card.href,doc.baseURI).searchParams.get('level'),round=allowed.get(number),board=card.querySelector('.featured-image');
  if(!round||!board)continue;
  const tile=el(doc,'article',undefined,'featured-tile');card.before(tile);tile.append(card);
  const button=el(doc,'button','Preview motion','discovery-preview');button.type='button';button.setAttribute('aria-label',`Preview motion: ${round.topic}`);button.setAttribute('aria-pressed','false');
  tile.append(button);const item={card,tile,button,board,round,animation:null};items.push(item);
  button.addEventListener('click',()=>preview(item,true));
  tile.addEventListener('pointerenter',()=>{if(hover.matches)void preview(item);});
  tile.addEventListener('pointerleave',()=>{if(active===item&&!tile.contains(doc.activeElement))stop();});
  card.addEventListener('focus',()=>{void preview(item);});
  tile.addEventListener('focusout',event=>{if(active===item&&!tile.contains(event.relatedTarget))stop();});
 }
 function currentIndex(){
  const left=host.getBoundingClientRect().left;
  return items.reduce((best,item,index)=>Math.abs(item.tile.getBoundingClientRect().left-left)<Math.abs(items[best].tile.getBoundingClientRect().left-left)?index:best,0);
 }
 function updateControls(){
  const narrow=host.scrollWidth>host.clientWidth+8,index=currentIndex();controls.hidden=!narrow||items.length<2;
  previous.disabled=!narrow||index===0;next.disabled=!narrow||index===items.length-1;position.textContent=`${index+1} / ${items.length}`;
 }
 function move(direction,moveFocus=false){
  const focused=moveFocus?items.findIndex(item=>item.tile.contains(doc.activeElement)):-1;
  stop();const index=Math.max(0,Math.min(items.length-1,(focused>=0?focused:currentIndex())+direction)),target=items[index];if(!target)return;
  host.scrollTo({left:target.tile.offsetLeft-items[0].tile.offsetLeft,behavior:reduced.matches?'instant':'smooth'});
  if(moveFocus)target.card.focus({preventScroll:true});
 }
 previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
 host.addEventListener('scroll',updateControls,{passive:true});
 host.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(event.key==='ArrowRight'?1:-1,true);}});
 const visibility=()=>{if(doc.hidden)stop();};doc.addEventListener('visibilitychange',visibility);
 const preference=()=>{stop();for(const {button} of items)button.hidden=reduced.matches;};reduced.addEventListener('change',preference);
 const observer=typeof win.IntersectionObserver==='function'?new win.IntersectionObserver(entries=>{for(const entry of entries)if(!entry.isIntersecting&&active?.tile===entry.target)stop();},{threshold:0}):null;
 items.forEach(item=>observer?.observe(item.tile));
 const resize=typeof win.ResizeObserver==='function'?new win.ResizeObserver(updateControls):null;resize?.observe(host);win.addEventListener('resize',updateControls);
 preference();updateControls();
 return {dispose(){disposed=true;stop();items.forEach(item=>item.animation?.dispose());observer?.disconnect();resize?.disconnect();doc.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',preference);win.removeEventListener('resize',updateControls);}};
}

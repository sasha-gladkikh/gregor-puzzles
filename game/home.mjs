import {renderSite} from './site.mjs';
import {initSuggestionForm} from './suggestions.mjs';
import {catalogue} from './home-data.mjs';
import {legacyPlayURL,homeProgress,homeDestination} from './home-state.mjs';
import {initHomeDemo} from './home-demo.mjs';
import {initPlayerUI} from './player-ui.mjs';

const legacy=legacyPlayURL(location.search,location.hash);
if(legacy)location.replace(legacy);
else initHome();

function initHome(){
 const $=id=>document.getElementById(id);
 const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
 const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
 renderSite({active:'home',roundNumber:catalogue[0].number});
 initSuggestionForm();
 let items=homeProgress(catalogue,read),destination=homeDestination(items);
 const demo=catalogue.some(round=>round.number==='01')?initHomeDemo(undefined,{destination}):null;
 if(!demo)$('homeDemo')?.closest('figure')?.remove();
 $('roundCount').textContent=catalogue.length;
 const thumbnails=new Map(catalogue.map(round=>{
  const item=node('li',''),link=node('a',''),image=document.createElement('img');
  link.className='discovery-thumb';link.href=`./play.html?level=${round.number}`;
  image.src=`./artwork/${round.number}.webp${new URL(import.meta.url).search}`;image.alt='';
  image.width=1200;image.height=900;image.loading='lazy';image.decoding='async';
  const badge=node('span',round.number),bar=node('span','');
  badge.className='discovery-thumb-number';bar.className='discovery-thumb-progress';
  badge.setAttribute('aria-hidden','true');bar.setAttribute('aria-hidden','true');
  link.append(image,badge,bar);item.append(link);$('discoveryStrip').append(item);
  return [round.number,{link,badge,bar}];
 }));
 function progress(){
  items=homeProgress(catalogue,read);destination=homeDestination(items);
  const link=$('homePlay');link.href=destination.href;
   const arrow=node('span','→');arrow.setAttribute('aria-hidden','true');
   link.replaceChildren(document.createTextNode(destination.label),arrow);
  $('homeBrowse').hidden=destination.href==='./collection.html';
  $('homeProgress').textContent=destination.detail;
  $('playTab').href=destination.href;
  demo?.setDestination(destination);
  $('discoveryCount').textContent=`${items.filter(item=>item.done).length} of ${items.length} complete`;
  for(const {round,done,pieces} of items){
   const {link,badge,bar}=thumbnails.get(round.number);
   const status=done?'Complete':pieces?`${pieces} of 12 pieces placed`:'Not started';
   link.dataset.state=done?'complete':pieces?'started':'new';
   link.setAttribute('aria-label',`Round ${round.number}: ${round.topic}. ${status}.`);
   link.title=`Round ${round.number} · ${round.topic} · ${status}`;
   badge.textContent=done?'✓':round.number;
   bar.style.setProperty('--piece-progress',`${done?100:pieces/12*100}%`);
  }
  $('homeProgressCollection').hidden=false;
 }
 progress();
 window.addEventListener('pageshow',progress);
 window.addEventListener('storage',event=>{if(event.key===null||catalogue.some(round=>round.saveKey===event.key))progress();});
 const openSuggestion=()=>{if(location.hash==='#suggest')$('suggestionDisclosure').open=true;};
 openSuggestion();window.addEventListener('hashchange',openSuggestion);
 document.querySelectorAll('a[href="#suggest"]').forEach(link=>link.addEventListener('click',()=>{$('suggestionDisclosure').open=true;}));
 initPlayerUI(catalogue);
 window.addEventListener('pagehide',event=>{if(!event.persisted){demo?.destroy();}});
}

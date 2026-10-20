import {renderSite} from './site.mjs';
import {initSuggestionForm} from './suggestions.mjs';
import {catalogue} from './home-data.mjs';
import {legacyPlayURL,homeProgress,homeDestination,homePlayURL} from './home-state.mjs';
import {initHomeDemo} from './home-demo.mjs';
import {initPlayerUI} from './player-ui.mjs';
import {createRoundCarousel} from './round-carousel.mjs';

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
 const carousel=createRoundCarousel($('discoveryStrip'),catalogue,{assetQuery:new URL(import.meta.url).search});
 function progress(){
  items=homeProgress(catalogue,read);destination=homeDestination(items);
  const link=$('homePlay');link.href=destination.href;
   const arrow=node('span','→');arrow.setAttribute('aria-hidden','true');
   link.replaceChildren(document.createTextNode(destination.label),arrow);
  $('homeBrowse').hidden=destination.href==='./collection.html';
  $('homeProgress').textContent=destination.detail;
  $('playTab').href=homePlayURL(items);
  demo?.setDestination(destination);
  $('discoveryCount').textContent=`${items.filter(item=>item.done).length} of ${items.length} complete`;
  carousel.update(items);
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

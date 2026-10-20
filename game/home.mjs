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
 function progress(){
  items=homeProgress(catalogue,read);destination=homeDestination(items);
  const link=$('homePlay');link.href=destination.href;
   const arrow=node('span','→');arrow.setAttribute('aria-hidden','true');
   link.replaceChildren(document.createTextNode(destination.label),arrow);
  $('homeBrowse').hidden=destination.href==='./collection.html';
  $('homeProgress').textContent=destination.detail;
  $('playTab').href=destination.href;
  demo?.setDestination(destination);
 }
 progress();
 window.addEventListener('pageshow',progress);
 window.addEventListener('storage',progress);
 const openSuggestion=()=>{if(location.hash==='#suggest')$('suggestionDisclosure').open=true;};
 openSuggestion();window.addEventListener('hashchange',openSuggestion);
 $('openSuggestion').addEventListener('click',()=>{$('suggestionDisclosure').open=true;$('suggestGene').focus();});
 document.querySelectorAll('a[href="#suggest"]').forEach(link=>link.addEventListener('click',()=>{$('suggestionDisclosure').open=true;}));
 initPlayerUI(catalogue);
 window.addEventListener('pagehide',event=>{if(!event.persisted){demo?.destroy();}});
}

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
 const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
 const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
 renderSite({active:'home',roundNumber:catalogue[0].number});
 initSuggestionForm();
 // The demo is independent of saved game progress and never names the answer.
 if(catalogue.some(round=>round.number==='01'))initHomeDemo();
 else $('homeDemo')?.closest('figure')?.remove();
 $('roundCount').textContent=catalogue.length;
 const allowed=new Set(catalogue.map(round=>round.number));
 document.querySelectorAll('.featured-card').forEach(card=>{
  const number=new URL(card.href).searchParams.get('level');
  if(!allowed.has(number))card.remove();
 });
 function progress(){
  const destination=homeDestination(homeProgress(catalogue,read));
  $('homePlay').href=destination.href;
  $('homePlay').replaceChildren(document.createTextNode(destination.label),node('span','→'));
  $('homePlay').lastElementChild.setAttribute('aria-hidden','true');
  $('homeProgress').textContent=destination.detail;
  $('playTab').href=destination.href;
 }
 progress();
 window.addEventListener('pageshow',progress);
 window.addEventListener('storage',progress);
 const openSuggestion=()=>{if(location.hash==='#suggest')$('suggestionDisclosure').open=true;};
 openSuggestion();window.addEventListener('hashchange',openSuggestion);
 document.querySelectorAll('a[href="#suggest"]').forEach(link=>link.addEventListener('click',()=>{$('suggestionDisclosure').open=true;}));
 let mapPromise;
 $('homeMapDisclosure').addEventListener('toggle',()=>{
  if($('homeMapDisclosure').open&&!mapPromise)mapPromise=import('./home-map.mjs').then(({initHomeMap})=>initHomeMap(catalogue)).catch(()=>{mapPromise=null;});
 });

 initPlayerUI(catalogue);
}

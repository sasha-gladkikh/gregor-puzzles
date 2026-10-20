import {renderSite} from './site.mjs';
import {initSuggestionForm} from './suggestions.mjs';
import {catalogue} from './home-data.mjs';
import {legacyPlayURL,homeProgress,homeDestination} from './home-state.mjs';
import {initHomeDemo} from './home-demo.mjs';
import {initHomeExplore,initFeaturedGallery} from './home-explore.mjs';
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
 let items=homeProgress(catalogue,read),destination=homeDestination(items),map,mapPromise;
 const demo=catalogue.some(round=>round.number==='01')?initHomeDemo(undefined,{destination}):null;
 if(!demo)$('homeDemo')?.closest('figure')?.remove();
 $('roundCount').textContent=catalogue.length;
 const allowed=new Set(catalogue.map(round=>round.number));
 document.querySelectorAll('.featured-card').forEach(card=>{
  const number=new URL(card.href).searchParams.get('level');
  if(!allowed.has(number))card.remove();
 });
 const explore=initHomeExplore(catalogue,items);
 const gallery=initFeaturedGallery(catalogue);
 function progress(){
  items=homeProgress(catalogue,read);destination=homeDestination(items);
  for(const id of ['homePlay','homeQuickPlayLink']){
   const link=$(id);link.href=destination.href;
   const arrow=node('span','→');arrow.setAttribute('aria-hidden','true');
   link.replaceChildren(document.createTextNode(destination.label),arrow);
  }
  $('homeProgress').textContent=destination.detail;
  $('playTab').href=destination.href;
  demo?.setDestination(destination);explore.update(items);map?.update(items);
 }
 progress();
 window.addEventListener('pageshow',progress);
 window.addEventListener('storage',progress);
 const openSuggestion=()=>{if(location.hash==='#suggest')$('suggestionDisclosure').open=true;};
 openSuggestion();window.addEventListener('hashchange',openSuggestion);
 $('openSuggestion').addEventListener('click',()=>{$('suggestionDisclosure').open=true;$('suggestGene').focus();});
 document.querySelectorAll('a[href="#suggest"]').forEach(link=>link.addEventListener('click',()=>{$('suggestionDisclosure').open=true;}));
 const loadMap=()=>{
  if(!mapPromise)mapPromise=import('./home-map.mjs').then(({initHomeMap})=>{map=initHomeMap(catalogue,$('homeProcessMap'),items);}).catch(()=>{mapPromise=null;});
 };
 // Keep the map visible without making its illustration compete with the first paint.
 const mapObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){loadMap();mapObserver.disconnect();}},{rootMargin:'300px'});
 mapObserver.observe($('homeProcessMap'));

 // One route follows the player. Mobile controls stay away from input and dialogs.
 const quick=$('homeQuickPlay'),hero=document.querySelector('.home-hero');
 let pastHero=false,footerVisible=false;
 const paintQuick=()=>{quick.hidden=!pastHero||footerVisible||!!document.querySelector('dialog[open]')||!!document.activeElement?.closest('form,input,textarea,select');};
 const visibility=new IntersectionObserver(entries=>{
  for(const entry of entries){if(entry.target===hero)pastHero=!entry.isIntersecting&&entry.boundingClientRect.bottom<0;else footerVisible=entry.isIntersecting;}paintQuick();
 });
 visibility.observe(hero);visibility.observe($('siteFooter'));
 document.addEventListener('focusin',paintQuick);document.addEventListener('focusout',()=>queueMicrotask(paintQuick));
 const dialogs=new MutationObserver(paintQuick);dialogs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
 initPlayerUI(catalogue);
 window.addEventListener('pagehide',event=>{if(!event.persisted){demo?.destroy();gallery?.dispose();mapObserver.disconnect();visibility.disconnect();dialogs.disconnect();}});
}

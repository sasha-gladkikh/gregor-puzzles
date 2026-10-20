import {collectionProgress,affectsRoundProgress,progressSignature} from './collection.mjs';
import {findRound} from './rounds.mjs';
import {processGroups,splicingPairComplete} from './collection-data.mjs';
import {renderSite} from './site.mjs';
import {availableJourneys,journeyRoundHref} from './journeys.mjs';

const currentRound=findRound(new URLSearchParams(location.search).get('level'));
renderSite({active:'collection',roundNumber:currentRound.number,playControls:false});
document.querySelector('.collection-intro .collection-guide-link').href=`./field-guide.html?level=${currentRound.number}`;
const node=(tag,text,className)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
let lastProgress;
function progress(){
 let unavailable=false;
 const items=collectionProgress(key=>{try{return localStorage.getItem(key);}catch{unavailable=true;return null;}});
 document.querySelector('#storageNotice').hidden=!unavailable;return items;
}
function roundCard({round,done,pieces},first){
 const card=node('article',null,'collection-card');
 const link=node('a',null,'collection-card-link');link.href=`./play.html?level=${round.number}`;
 const figure=node('div',null,'collection-artwork'),img=node('img');img.src=round.artwork;img.alt='';img.width=800;img.height=600;img.loading='lazy';img.decoding='async';figure.append(img);
 const body=node('div',null,'collection-card-body');
 const meta=node('div',null,'collection-card-meta');meta.append(node('span',`Round ${round.number}`));
 if(done)meta.append(node('span','Complete','collection-card-status'));
 const title=node('h2',round.gene);body.append(meta,title,node('p',round.condition,'collection-card-description'));
 const action=node('div',null,'collection-card-action');
 action.append(node('span',done?'View round':pieces?`Continue · ${pieces} / 12`:first?'Start here':'Start round'));
 const arrow=node('span','→');arrow.setAttribute('aria-hidden','true');action.append(arrow);
 body.append(action);link.append(figure,body);card.append(link);return card;
}
function renderJourneys(items){
 const disclosure=document.querySelector('#collectionJourneys'),list=document.querySelector('#collectionJourneyList');
 const lookup=new Map(items.map(item=>[item.round.number,item]));
 const journeys=availableJourneys(items.map(item=>item.round)).filter(journey=>journey.rounds.length>=2);
 disclosure.hidden=!journeys.length;
 list.replaceChildren(...journeys.map(journey=>{
  const members=journey.rounds.map(round=>lookup.get(round.number));
  const complete=members.filter(item=>item.done).length;
  const next=members.find(item=>!item.done&&item.pieces>0)??members.find(item=>!item.done)??members[0];
  const entry=node('li',null,'collection-journey'),copy=node('div',null,'collection-journey-copy');
  copy.append(node('h2',journey.title),node('p',journey.question),node('p',`${members.length} rounds${complete?` · ${complete} complete`:''}`,'collection-journey-progress'));
  const label=complete===members.length?'Revisit path':next.pieces?'Continue path':'Start path';
  const action=node('a',`${label} →`,'collection-guide-link');action.href=journeyRoundHref(next.round,journey.id);action.setAttribute('aria-label',`${label}: ${journey.title}`);
  entry.append(copy,action);return entry;
 }));
}
function render(){
 const items=progress(),complete=items.filter(item=>item.done).length;
 const signature=progressSignature(items);if(signature===lastProgress)return;lastProgress=signature;
 const focused=document.activeElement,href=focused?.getAttribute('href'),label=focused?.getAttribute('aria-label');
 document.querySelector('#collectionSummary').textContent=`${complete} of ${items.length} rounds complete`;
 renderJourneys(items);
 document.querySelector('#roundCards').replaceChildren(...items.map((item,index)=>roundCard(item,index===0)));
 const groups=document.querySelector('#mapGroups');groups.replaceChildren();
 for(const group of processGroups){
  const members=items.filter(item=>group.numbers.includes(item.round.number));document.querySelector(`a[href="#process-${group.id}"]`).hidden=!members.length;if(!members.length)continue;
  const section=node('section',null,`process-group process-${group.id}`);section.id=`process-${group.id}`;section.append(node('h3',group.title),node('p',group.description));
  const list=node('ul');for(const {round,done} of members){const li=node('li'),a=node('a');a.href=`./play.html?level=${round.number}`;a.append(node('span',round.number,'map-round-number'),node('span',round.topic),node('span',done?round.gene:'→','map-round-state'));li.append(a);list.append(li);}section.append(list);groups.append(section);
 }
 const connection=document.querySelector('#collectionConnection');connection.replaceChildren();connection.hidden=!splicingPairComplete(items);
 if(!connection.hidden){const copy=node('div');const h=node('h2','Two ways to process RNA');h.id='connectionHeading';copy.append(node('p','Make a connection','page-kicker'),h,node('p','Revisit RNU4-2 and RNU4ATAC side by side: major and minor spliceosomes, distinct gene–condition relationships.'));const a=node('a','Compare RNA splicing →','collection-guide-link');a.href='./science.html?level=05#compare-splicing';connection.append(copy,a);}
 if(href&&!focused.isConnected)[...document.querySelectorAll('#collectionMain a')].find(link=>link.getAttribute('href')===href&&link.getAttribute('aria-label')===label)?.focus({preventScroll:true});
}
function restoreView(){
 const map=location.hash==='#processMap'||processGroups.some(group=>location.hash===`#process-${group.id}`);
 for(const [button,panel,isMap]of [['gridView','roundCards',false],['mapView','processMap',true]]){
  document.getElementById(button).setAttribute('aria-pressed',String(map===isMap));document.getElementById(panel).hidden=map!==isMap;
 }
 if(location.hash==='#collectionJourneys')document.getElementById('collectionJourneys').open=true;
}
for(const [button,panel] of [['gridView','roundCards'],['mapView','processMap']])document.getElementById(button).addEventListener('click',()=>{
 const hash=`#${panel}`;if(location.hash!==hash)history.pushState({},'',hash);
 restoreView();document.getElementById(panel).scrollIntoView({block:'nearest',behavior:'instant'});
});
window.addEventListener('pageshow',render);
window.addEventListener('storage',event=>{if(affectsRoundProgress(event))render();});
render();
restoreView();window.addEventListener('hashchange',restoreView);window.addEventListener('popstate',restoreView);

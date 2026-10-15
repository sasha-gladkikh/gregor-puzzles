import {collectionProgress} from './collection.mjs';
import {findRound} from './rounds.mjs';
import {processGroups,splicingPairComplete} from './collection-data.mjs';
import {renderSite} from './site.mjs';

const currentRound=findRound(new URLSearchParams(location.search).get('level'));
renderSite({active:'collection',roundNumber:currentRound.number,playControls:false});
document.querySelector('.collection-intro .collection-guide-link').href=`./field-guide.html?level=${currentRound.number}`;
const node=(tag,text,className)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
function progress(){return collectionProgress(key=>{try{return localStorage.getItem(key);}catch{document.querySelector('#storageNotice').hidden=false;return null;}});}
function roundCard({round,done,pieces},first){
 const card=node('article',null,'collection-card');
 const link=node('a',null,'collection-card-link');link.href=`./?level=${round.number}`;
 const figure=node('div',null,'collection-artwork'),img=node('img');img.src=round.artwork;img.alt='';img.width=800;img.height=600;img.loading='lazy';img.decoding='async';figure.append(img);
 const body=node('div',null,'collection-card-body');
 const meta=node('div',null,'collection-card-meta');meta.append(node('span',`Round ${round.number}`));
 if(done)meta.append(node('span','Complete','collection-card-status'));
 const title=node('h2',done?round.gene:round.title);body.append(meta,title,node('p',done?round.condition:round.topic,'collection-card-description'));
 const action=node('div',null,'collection-card-action');
 action.append(node('span',done?'View round':pieces?`Continue · ${pieces} / 12`:first?'Start here':'Start round'));
 const arrow=node('span','→');arrow.setAttribute('aria-hidden','true');action.append(arrow);
 body.append(action);link.append(figure,body);card.append(link);return card;
}
function render(){
 const items=progress(),complete=items.filter(item=>item.done).length;
 document.querySelector('#collectionSummary').textContent=`${complete} of ${items.length} rounds complete`;
 document.querySelector('#roundCards').replaceChildren(...items.map((item,index)=>roundCard(item,index===0)));
 const groups=document.querySelector('#mapGroups');groups.replaceChildren();
 for(const group of processGroups){
  const members=items.filter(item=>group.numbers.includes(item.round.number));document.querySelector(`a[href="#process-${group.id}"]`).hidden=!members.length;if(!members.length)continue;
  const section=node('section',null,`process-group process-${group.id}`);section.id=`process-${group.id}`;section.append(node('h3',group.title),node('p',group.description));
  const list=node('ul');for(const {round,done} of members){const li=node('li'),a=node('a');a.href=`./?level=${round.number}`;a.append(node('span',round.number,'map-round-number'),node('span',round.topic),node('span',done?round.gene:'→','map-round-state'));li.append(a);list.append(li);}section.append(list);groups.append(section);
 }
 const connection=document.querySelector('#collectionConnection');connection.replaceChildren();connection.hidden=!splicingPairComplete(items);
 if(!connection.hidden){const copy=node('div');const h=node('h2','Two ways to process RNA');h.id='connectionHeading';copy.append(node('p','Make a connection','page-kicker'),h,node('p','Revisit RNU4-2 and RNU4ATAC side by side: major and minor spliceosomes, distinct gene–condition relationships.'));const a=node('a','Compare RNA splicing →','collection-guide-link');a.href='./science.html?level=05#compare-splicing';connection.append(copy,a);}
}
for(const [button,panel] of [['gridView','roundCards'],['mapView','processMap']])document.getElementById(button).addEventListener('click',()=>{for(const [other,target]of [['gridView','roundCards'],['mapView','processMap']]){document.getElementById(other).setAttribute('aria-pressed',String(other===button));document.getElementById(target).hidden=other!==button;}document.getElementById(panel).scrollIntoView({block:'nearest',behavior:'instant'});});
window.addEventListener('pageshow',render);
window.addEventListener('storage',event=>{if(event.key===null||event.key.startsWith('gregor-puzzles:'))render();});
render();

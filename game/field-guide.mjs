import {collectionProgress} from './collection.mjs';
import {findRound} from './rounds.mjs';
import {completedGuideRounds,guideClinicalSections,guideReferences,relatedCompletedRounds,splicingPairComplete} from './collection-data.mjs';
import {renderSite} from './site.mjs';

const currentRound=findRound(new URLSearchParams(location.search).get('level'));
renderSite({active:'collection',roundNumber:currentRound.number,playControls:false});
document.querySelector('.guide-back a').href=`./collection.html?level=${currentRound.number}`;
const node=(tag,text,className)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
const external=(label,url)=>{const a=node('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
function entry(round,progress){
 const profile=round.clinical,article=node('article',null,'guide-entry');article.id=`round-${round.number}`;
 const header=node('header',null,'guide-entry-header'),identity=node('div',null,'guide-identity');identity.append(node('span','GREGoR Puzzles'),node('span',`Round ${round.number} · ${round.topic}`));
 const h=node('h2',round.gene);header.append(identity,h,node('p',round.condition,'guide-condition'));
 const meta=node('div',null,'guide-meta');meta.append(node('span',round.inheritance),external(`OMIM ${round.omim}`,`https://omim.org/entry/${round.omim}`));
 const variant=node('p',null,'guide-variant');variant.append(node('strong','Variant context: '),document.createTextNode(round.variant));header.append(meta,variant);article.append(header);
 const visual=node('figure',null,'guide-visual'),img=node('img');img.src=round.artwork;img.alt=round.description;img.width=800;img.height=600;img.decoding='async';
 const caption=node('figcaption');caption.append(node('p',round.illustration.takeaway),node('p',round.illustration.note));visual.append(img,caption);
 const text=node('div',null,'guide-text'),implications=node('div',null,'guide-implications');
 guideClinicalSections(round).forEach(({label,text:body},index)=>{const section=node('section');section.append(node('h3',label),node('p',body));(index<3?text:implications).append(section);});
 const content=node('div',null,'guide-content');content.append(visual,text);article.append(content);
 article.append(implications);
 const memory=node('p',null,'guide-memory');memory.append(node('strong','Remember this'),document.createTextNode(profile.memory));article.append(memory);
 const refs=node('section',null,'guide-references');refs.append(node('h3','Selected references'));const list=node('ol');for(const ref of guideReferences(round)){const li=node('li');li.append(external(ref.label,ref.url));list.append(li);}refs.append(list);article.append(refs);
 const related=relatedCompletedRounds(round.number,progress);
 if(related.length){
  const p=node('p',null,'guide-related');p.append(node('strong','Connect the rounds: '));
  if(['05','08'].includes(round.number)&&splicingPairComplete(progress)){
   const a=node('a','Compare RNU4-2 and RNU4ATAC');a.href='./science.html?level=05#compare-splicing';p.append(a);
  }else related.forEach((item,index)=>{if(index)p.append(document.createTextNode(' · '));const a=node('a',`${item.gene} · ${item.relationship.toLowerCase()}`);a.href=`#round-${item.number}`;p.append(a);});
  article.append(p);
 }
 const footer=node('div',null,'guide-entry-footer');const science=node('a','Full profile and sources ↗');science.href=`./science.html?level=${round.number}`;footer.append(node('span','Educational content · AI-generated artwork'),science);article.append(footer);return article;
}
function render(){
 const progress=collectionProgress(key=>{try{return localStorage.getItem(key);}catch{return null;}}),completed=completedGuideRounds(progress);
 document.querySelector('#guideSummary').textContent=`${completed.length} of ${progress.length} rounds complete. Each page connects an illustration with its scientific context.`;
 document.querySelector('#guideEmpty').hidden=completed.length>0;document.querySelector('#printGuide').hidden=completed.length===0;
 document.querySelector('#firstRound').href=`./?level=${progress.find(item=>!item.done)?.round.number??progress[0]?.round.number??'01'}`;
 document.querySelector('#guideEntries').replaceChildren(...completed.map(round=>entry(round,progress)));
}
document.querySelector('#printGuide').addEventListener('click',()=>window.print());
window.addEventListener('pageshow',render);
window.addEventListener('storage',event=>{if(event.key===null||event.key.startsWith('gregor-puzzles:'))render();});
render();

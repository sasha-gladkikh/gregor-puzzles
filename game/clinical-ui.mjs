import {hpoTerms} from './hpo-terms.mjs';
export const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=text;if(className)n.className=className;return n;};
export function citation(url,label='Source',context=''){
 const a=node('a',label+' ↗','inline-source');a.href=url;a.target='_blank';a.rel='noopener noreferrer';if(context)a.setAttribute('aria-label',`${label}: ${context}`);return a;
}
// One stable, numbered bibliography per round. The condition identifier stays
// beside the condition name rather than appearing again as a literature source.
export function roundReferences(round){
 const condition=`https://omim.org/entry/${round.omim}`,seen=new Set(),references=[];
 for(const [label,url] of round.sources){
  if(url.replace(/\/$/,'')===condition||seen.has(url))continue;
  seen.add(url);const number=references.length+1;
  references.push({url,label,number,id:`ref-${round.number}-${number}`});
 }
 return references;
}
export function referenceMarks(round,urls,context=''){
 const requested=new Set((Array.isArray(urls)?urls:[urls]).filter(Boolean));
 const marks=node('span',null,'reference-marks');
 for(const reference of roundReferences(round).filter(ref=>requested.has(ref.url))){
  const a=node('a',`[${reference.number}]`,'reference-mark');a.href=`#${reference.id}`;
  a.setAttribute('aria-label',`Reference ${reference.number}${context?`: ${context}`:''}`);
  a.addEventListener('click',()=>{
   const target=document.getElementById(reference.id);if(!target)return;
   for(let parent=target.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
   target.focus({preventScroll:true});
  });
  marks.append(a);
 }
 return marks;
}
export function referenceList(round,{heading='References'}={}){
 const section=node('section',null,'round-references');
 if(heading)section.append(node('h3',heading));
 const list=node('ol',null,'reference-list');
 for(const reference of roundReferences(round)){
  const li=node('li');li.id=reference.id;li.tabIndex=-1;
  li.append(citation(reference.url,reference.label));list.append(li);
 }
 section.append(list);return section;
}
export function renderClinicalProfile(round,container){
 const p=round.clinical;
 const onset=node('div',null,'clinical-onset');onset.append(node('strong','Onset and course'),node('p',p.onset),referenceMarks(round,p.patternSource,'Onset and course'));container.append(onset);
 const note=node('p','Selected findings and course modifiers, not a diagnostic checklist. Features vary; absence of one finding does not by itself exclude the condition. “Key connection” indicates teaching emphasis, not measured specificity or frequency.','clinical-note');container.append(note);
 const groups=new Map();for(const f of p.features){if(!groups.has(f.system))groups.set(f.system,[]);groups.get(f.system).push(f);}
 const grid=node('div',null,'clinical-groups');
 for(const [system,features] of groups){
  const group=node('section',null,'clinical-system'),heading=node('h4',system),shared=new Set(features.map(f=>f.source));if(shared.size===1)heading.append(referenceMarks(round,[...shared],`${system} findings`));group.append(heading);
  for(const f of features){
   const item=node('div',null,'clinical-feature');const head=node('div',null,'clinical-feature-heading');const title=node('h5',f.title);if(shared.size>1)title.append(referenceMarks(round,f.source,f.title));head.append(title);if(f.key)head.append(node('span','Key connection','feature-key'));
   item.append(head,node('p',f.text),node('p',f.context,'feature-context'));
   const links=node('div',null,'feature-links');
   if(f.hpo){const a=citation(`https://hpo.jax.org/browse/term/${f.hpo}`,f.hpo,hpoTerms[f.hpo]);a.classList.add('hpo-link');a.title=hpoTerms[f.hpo];links.append(a);}
   item.append(links);group.append(item);
  }grid.append(group);
 }container.append(grid);
 container.append(node('p','HPO links describe standardized terminology. They are curated vocabulary mappings, not a claim that HPO formally annotates each feature to this disease. Broader mappings and course modifiers are identified in the notes.','clinical-note'));
}
export function renderPearls(round,container){
 for(const p of round.clinical.pearls){const section=node('section',null,'interpretation-pearl'),heading=node('h4',p.title);heading.append(referenceMarks(round,p.sources,p.title));section.append(heading,node('p',p.text));container.append(section);}
 const scope=node('p',round.nuance,'nuance');container.append(scope);
}
export function renderMemory(round,container){
 const memory=node('div',null,'memory-card');memory.append(node('span','ONE CONNECTION TO REMEMBER','eyebrow'),node('p',round.clinical.memory));
 container.append(memory);
}

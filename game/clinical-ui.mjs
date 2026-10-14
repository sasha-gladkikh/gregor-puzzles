import {hpoTerms} from './hpo-terms.mjs';
export const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=text;if(className)n.className=className;return n;};
export function citation(url,label='Source',context=''){
 const a=node('a',label+' ↗','inline-source');a.href=url;a.target='_blank';a.rel='noopener noreferrer';if(context)a.setAttribute('aria-label',`${label}: ${context}`);return a;
}
export function renderClinicalProfile(round,container){
 const p=round.clinical;
 const onset=node('div',null,'clinical-onset');onset.append(node('strong','Onset and course'),node('p',p.onset),citation(p.patternSource,'Clinical reference'));container.append(onset);
 const note=node('p','Selected findings and course modifiers, not a diagnostic checklist. Features vary; absence of one finding does not by itself exclude the condition. “Key connection” indicates teaching emphasis, not measured specificity or frequency.','clinical-note');container.append(note);
 const groups=new Map();for(const f of p.features){if(!groups.has(f.system))groups.set(f.system,[]);groups.get(f.system).push(f);}
 const grid=node('div',null,'clinical-groups');
 for(const [system,features] of groups){
  const group=node('section',null,'clinical-system');group.append(node('h4',system));
  for(const f of features){
   const item=node('div',null,'clinical-feature');const head=node('div',null,'clinical-feature-heading');head.append(node('h5',f.title));if(f.key)head.append(node('span','Key connection','feature-key'));
   item.append(head,node('p',f.text),node('p',f.context,'feature-context'));
   const links=node('div',null,'feature-links');
   if(f.hpo){const a=citation(`https://hpo.jax.org/browse/term/${f.hpo}`,f.hpo,hpoTerms[f.hpo]);a.classList.add('hpo-link');a.title=hpoTerms[f.hpo];links.append(a);}
   links.append(citation(f.source,'Source',f.title));item.append(links);group.append(item);
  }grid.append(group);
 }container.append(grid);
 container.append(node('p','HPO links describe standardized terminology. They are curated vocabulary mappings, not a claim that HPO formally annotates each feature to this disease. Broader mappings and course modifiers are identified in the notes.','clinical-note'));
}
export function renderPearls(round,container){
 for(const p of round.clinical.pearls){const section=node('section',null,'interpretation-pearl');section.append(node('h4',p.title),node('p',p.text));p.sources.forEach((url,i)=>{if(i)section.append(document.createTextNode(' · '));section.append(citation(url,'Supporting reference',p.title));});container.append(section);}
 const scope=node('p',round.nuance,'nuance');container.append(scope);
}
export function renderMemory(round,container){
 const memory=node('div',null,'memory-card');memory.append(node('span','ONE CONNECTION TO REMEMBER','eyebrow'),node('p',round.clinical.memory));
 container.append(memory);
}

import {node,citation} from './clinical-ui.mjs';
import {hpoTerms} from './hpo-terms.mjs';
import {artworkMarkers} from './artwork-ui.mjs';
import {mechanismFigure,spliceCompare} from './mechanism.mjs';

// Source associations come from the curated round data; these controls add context,
// not a new evidence assessment or a substitute for scientific sign-off.
export function claimSource(round,claimLabel,urls){
 const sources=[...new Set((Array.isArray(urls)?urls:[urls]).filter(Boolean))];
 const details=node('details',null,'claim-source');
 const summary=node('summary',sources.length===1?'Source':`Sources (${sources.length})`);
 summary.setAttribute('aria-label',`Supporting references: ${claimLabel}`);
 details.append(summary);
 const body=node('div',null,'claim-source-body');
 body.append(node('p',claimLabel,'claim-source-context'));
 const list=node('ul');
 for(const url of sources){
  const title=round.sources.find(([,href])=>href===url)?.[0]??'Supporting reference';
  const li=node('li');li.append(citation(url,title));list.append(li);
 }
 body.append(list,node('p',`References linked to this statement. ${round.reviewStatus}.`,'claim-source-note'));
 details.append(body);return details;
}

export function scientificFigure(round){
 const section=node('section',null,'science-visual');
 const figure=node('figure',null,'science-figure');
 const imageBox=node('div',null,'artwork-figure');
 const image=node('img');image.src=round.artwork;image.alt=round.description;image.width=800;image.height=600;image.decoding='async';
 const selected=node('div',null,'science-selected-note');selected.setAttribute('aria-live','polite');selected.setAttribute('aria-atomic','true');
 const list=node('ol',null,'figure-steps');
 const controls=[];
 function select(index){
  const point=round.illustration.landmarks[index];
  controls.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  imageBox.querySelectorAll('.artwork-marker').forEach((marker,i)=>{marker.classList.toggle('is-active',i===index);marker.setAttribute('aria-pressed',String(i===index));});
  selected.replaceChildren(node('h3',`${index+1}. ${point.title}`),node('p',point.text),claimSource(round,point.title,round.illustration.source));
 }
 const markers=artworkMarkers(round,select);
 markers.querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-label',`Explore structure ${i+1}: ${round.illustration.landmarks[i].title}`));
 imageBox.append(image,markers);
 const caption=node('figcaption');caption.append(node('span','Illustrated mechanism','science-kicker'),node('p',round.illustration.takeaway),node('span','Select a numbered structure to connect image, explanation, and source.','figure-instruction'));
 figure.append(imageBox,caption);section.append(figure);
 round.illustration.landmarks.forEach((point,i)=>{
  const li=node('li');const button=node('button',null,'figure-step');button.type='button';
  button.append(node('span',String(i+1),'figure-step-number'),node('span',point.title));
  button.addEventListener('click',()=>select(i));li.append(button);list.append(li);controls.push(button);
 });
 section.append(list,selected,node('p',round.illustration.note,'science-figure-note'));
 if(round.illustration.noteSource)section.append(claimSource(round,'Assembly and activation in the illustration',round.illustration.noteSource));
 const printNotes=node('div',null,'figure-print-notes');
 for(const [i,point] of round.illustration.landmarks.entries())printNotes.append(node('h3',`${i+1}. ${point.title}`),node('p',point.text));
 section.append(printNotes);select(0);return section;
}

export function clinicalDetails(round){
 const section=node('section',null,'science-section clinical-details');section.id='clinical-pattern';
 const p=round.clinical;
 section.append(node('h3','Clinical pattern'),node('p',p.pattern,'science-lead'),claimSource(round,'Clinical pattern',p.patternSource));
 const onset=node('div',null,'science-onset');onset.append(node('h4','Onset and course'),node('p',p.onset),claimSource(round,'Onset and course',p.patternSource));section.append(onset);
 section.append(node('p','Selected findings, not a diagnostic checklist. Features and support needs vary. A missing finding does not by itself exclude the condition.','science-context'));
 const groups=new Map();for(const feature of p.features){if(!groups.has(feature.system))groups.set(feature.system,[]);groups.get(feature.system).push(feature);}
 const features=node('div',null,'science-features');
 for(const [system,items] of groups){
  const group=node('section',null,'science-feature-system');group.append(node('h4',system));
  for(const feature of items){
   const item=node('div',null,'science-feature');item.append(node('h5',feature.title),node('p',feature.text),node('p',feature.context,'science-context'));
   const links=node('div',null,'science-feature-links');
   if(feature.hpo)links.append(citation(`https://hpo.jax.org/browse/term/${feature.hpo}`,feature.hpo,hpoTerms[feature.hpo]));
   links.append(claimSource(round,feature.title,feature.source));item.append(links);group.append(item);
  }features.append(group);
 }
 section.append(features,node('p','HPO links define standardized terms. They are vocabulary mappings, not a claim of formal disease annotation; broader mappings and course modifiers are identified above.','science-context'));
 return section;
}

export function scientificInterpretation(round){
 const section=node('section',null,'science-section');section.id='interpretation';section.append(node('h3','Interpretation'));
 for(const pearl of round.clinical.pearls){
  const part=node('section',null,'science-pearl');part.append(node('h4',pearl.title),node('p',pearl.text),claimSource(round,pearl.title,pearl.sources));section.append(part);
 }
 section.append(node('p',round.nuance,'science-context'));return section;
}

export function scientificReferences(round){
 const section=node('section',null,'science-section');section.id='references';section.append(node('h3','References and resources'));
 const refs=node('ol',null,'science-references');for(const [title,url] of round.sources){const li=node('li');li.append(citation(url,title));refs.append(li);}section.append(refs);
 const support=node('p',null,'science-community');support.append(document.createTextNode('Community resource: '),citation(round.community[1],round.community[0]));
 section.append(support,node('p',round.sourceNote,'science-context'),node('p',`Literature and HPO terminology checked ${round.checked}.`,'science-context'));return section;
}

export function scientificMechanisms(round){
 const section=node('section',null,'science-extra');
 const figure=mechanismFigure(round);if(figure)section.append(figure);
 const comparison=spliceCompare(round,()=>true);if(comparison){comparison.id='compare-splicing';section.append(comparison);}
 return section;
}

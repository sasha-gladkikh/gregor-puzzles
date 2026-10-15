import {node,citation,referenceMarks,referenceList} from './clinical-ui.mjs';
import {hpoTerms} from './hpo-terms.mjs';
import {artworkMarkers} from './artwork-ui.mjs';
import {mechanismFigure,spliceCompare} from './mechanism.mjs';

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
  selected.replaceChildren(node('h3',`${index+1}. ${point.title}`),node('p',point.text));
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
 const note=node('p',round.illustration.note,'science-figure-note');note.append(referenceMarks(round,[round.illustration.source,round.illustration.noteSource],'Illustration and image notes'));section.append(list,selected,note);
 const printNotes=node('div',null,'figure-print-notes');
 for(const [i,point] of round.illustration.landmarks.entries())printNotes.append(node('h3',`${i+1}. ${point.title}`),node('p',point.text));
 section.append(printNotes);select(0);return section;
}

export function clinicalDetails(round){
 const section=node('section',null,'science-section clinical-details');section.id='clinical-pattern';
 const p=round.clinical,heading=node('h3','Clinical pattern');heading.append(referenceMarks(round,p.patternSource,'Clinical pattern and onset'));
 section.append(heading,node('p',p.pattern,'science-lead'));
 const onset=node('p',null,'science-onset');onset.append(node('strong','Onset and course. '),document.createTextNode(p.onset));section.append(onset);
 section.append(node('p','Selected findings, not a diagnostic checklist. Features and support needs vary. A missing finding does not by itself exclude the condition.','science-context'));
 const groups=new Map();for(const feature of p.features){if(!groups.has(feature.system))groups.set(feature.system,[]);groups.get(feature.system).push(feature);}
 const features=node('div',null,'science-features');
 for(const [system,items] of groups){
  const group=node('section',null,'science-feature-system'),heading=node('h4',system),sources=new Set(items.map(f=>f.source));
  if(sources.size===1)heading.append(referenceMarks(round,[...sources],`${system} findings`));
  group.append(heading);const list=node('ul',null,'science-feature-list');
  for(const feature of items){
   const item=node('li',null,'science-feature'),description=node('p'),title=node('strong',`${feature.title}.`);
   if(sources.size>1)title.append(referenceMarks(round,feature.source,feature.title));
   description.append(title,document.createTextNode(` ${feature.text}`));
   const context=node('p',feature.context,'science-context');
   if(feature.hpo){context.append(document.createTextNode(' · '),citation(`https://hpo.jax.org/browse/term/${feature.hpo}`,feature.hpo,hpoTerms[feature.hpo]));}
   item.append(description,context);list.append(item);
  }group.append(list);features.append(group);
 }
 section.append(features,node('p','HPO links define standardized terms. They are vocabulary mappings, not a claim of formal disease annotation; broader mappings and course modifiers are identified above.','science-context'));
 return section;
}

export function scientificInterpretation(round){
 const section=node('section',null,'science-section');section.id='interpretation';section.append(node('h3','Interpretation'));
 for(const pearl of round.clinical.pearls){
  const part=node('section',null,'science-pearl'),heading=node('h4',pearl.title);heading.append(referenceMarks(round,pearl.sources,pearl.title));part.append(heading,node('p',pearl.text));section.append(part);
 }
 section.append(node('p',round.nuance,'science-context'));return section;
}

export function scientificReferences(round){
 const section=node('section',null,'science-section');section.id='references';section.append(referenceList(round));
 const support=node('p',null,'science-community');support.append(document.createTextNode('Community resource: '),citation(round.community[1],round.community[0]));
 section.append(support,node('p',round.sourceNote,'science-context'),node('p',`Literature and HPO terminology checked ${round.checked}.`,'science-context'));return section;
}

export function scientificMechanisms(round){
 const section=node('section',null,'science-extra');
 const figure=mechanismFigure(round);if(figure)section.append(figure);
 const comparison=spliceCompare(round,()=>true);if(comparison){comparison.id='compare-splicing';section.append(comparison);}
 return section;
}

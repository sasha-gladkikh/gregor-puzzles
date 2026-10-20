import {node,citation,referenceMarks,referenceList} from './clinical-ui.mjs';
import {hpoTerms} from './hpo-terms.mjs';
import {artworkMarkers} from './artwork-ui.mjs';
import {artworkSrcset} from './artwork-source.mjs';
import {mechanismFigure,spliceCompare} from './mechanism.mjs';
import {interpretationPrinciples} from './interpretation.mjs';

export function scientificFigure(round){
 const section=node('section',null,'science-visual');
 const figure=node('figure',null,'science-figure');
 const imageBox=node('div',null,'artwork-figure');
 const image=node('img');image.src=round.artwork;image.srcset=artworkSrcset(round);
 // Match the scientific profile's sidebar, split opening, and phone figure cap.
 image.sizes='(max-width:600px) calc(100vw - 34px), (max-width:700px) min(618px, calc(100vw - 42px)), (max-width:800px) calc(47.5vw - 33.35px), (max-width:1000px) calc(47.5vw - 40.95px), (max-width:1180px) calc(47.5vw - 125.5px), (max-width:1416px) calc(47.5vw - 145.45px), 527px';
 image.alt=round.description;image.width=800;image.height=600;image.decoding='async';
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
 const p=round.clinical,heading=node('h3','Clinical features');heading.append(referenceMarks(round,p.patternSource,'Clinical overview and onset'));
 section.append(heading,node('p',p.overview,'science-lead'));
 const onset=node('p',null,'science-onset');onset.append(node('strong','Onset and course. '),document.createTextNode(p.onset));section.append(onset);
 const significance=node('aside',null,'science-significance'),significanceHeading=node('h4','Clinical significance');significanceHeading.append(referenceMarks(round,p.significance.sources,'Clinical significance'));significance.append(significanceHeading,node('p',p.significance.text));section.append(significance);
 section.append(node('p','These selected findings describe a clinical pattern, not a diagnostic checklist. Expression varies; interpret the combination with the variant and family context.','science-context'));
 const features=node('div',null,'science-features');
 for(const {id,label,description,items} of groupedClinicalFeatures(p.features)){
  const group=node('section',null,'science-feature-group');group.dataset.group=id;
  group.append(node('h4',label));
  if(description)group.append(node('p',description,'science-context'));
  // Group claims with a shared source instead of repeating a source control per finding.
  const systems=new Map();for(const feature of items){if(!systems.has(feature.system))systems.set(feature.system,[]);systems.get(feature.system).push(feature);}
  for(const [system,findings] of systems){
   const subsection=node('section',null,'science-feature-system'),heading=node('h5',system),sources=new Set(findings.map(f=>f.source));
   if(sources.size===1)heading.append(referenceMarks(round,[...sources],`${system} findings`));
   subsection.append(heading);const list=node('ul',null,'science-feature-list');
   for(const feature of findings){
    const item=node('li',null,'science-feature'),description=node('p'),title=node('strong',`${feature.title}.`);
    if(sources.size>1)title.append(referenceMarks(round,feature.source,feature.title));
    description.append(title,document.createTextNode(` ${feature.text}`));
    const context=node('p',feature.context,'science-context');item.append(description,context);
    if(feature.hpo){
     const term=node('p',null,'science-hpo');term.append(node('span','HPO: '),citation(`https://hpo.jax.org/browse/term/${feature.hpo}`,`${hpoTerms[feature.hpo]} · ${feature.hpo}`));
     if(feature.hpoQualifier)term.append(node('span',feature.hpoQualifier,'science-hpo-qualifier'));
     item.append(term);
    }
    list.append(item);
   }subsection.append(list);group.append(subsection);
  }features.append(group);
 }
 const terminology=node('details',null,'science-detail-panel');
 terminology.append(node('summary','About HPO terms'),node('p','Human Phenotype Ontology (HPO) links define standardized clinical terms. A link maps the wording to a term; it does not establish a formal disease annotation. Qualifiers identify terms that are broader than the described finding.','science-context'));
 section.append(features,terminology);
 return section;
}

export function groupedClinicalFeatures(features){
 const groups=[
  {id:'characteristic',label:'Characteristic pattern',description:''},
  {id:'variable',label:'Additional and variable findings',description:'Associated findings that broaden the phenotype; this grouping does not imply rarity.'},
  {id:'course',label:'Course and clinical context',description:''}
 ];
 return groups.map(group=>({...group,items:features.filter(feature=>{
  const id=feature.group??(feature.system==='Course'?'course':feature.key?'characteristic':'variable');return id===group.id;
 })})).filter(group=>group.items.length);
}

export function scientificFamily(round){
 const section=node('section',null,'science-section');section.id='family';
 const heading=node('h3','Family implications');heading.append(referenceMarks(round,round.clinical.family.sources,'Family implications'));
 section.append(heading,node('p',round.clinical.family.text));return section;
}

export function scientificInterpretation(round){
 const section=node('section',null,'science-section');section.id='interpretation';section.append(node('h3','Interpretation'));
 const overview=node('p',round.clinical.interpretation.text);overview.append(referenceMarks(round,round.clinical.interpretation.sources,'Variant interpretation'));section.append(overview);
 const details=node('details',null,'science-detail-panel');details.append(node('summary','Mechanism and testing details'));
 for(const pearl of round.clinical.pearls){
  const part=node('section',null,'science-pearl'),heading=node('h4',pearl.title);heading.append(referenceMarks(round,pearl.sources,pearl.title));part.append(heading,node('p',pearl.text));details.append(part);
 }
 details.append(node('p',round.nuance,'science-context'));section.append(details,scientificPrinciples(round));return section;
}

export function scientificPrinciples(round){
 const details=node('details',null,'science-detail-panel');
 details.append(node('summary','How genetic evidence becomes a diagnosis'));
 const sources=[...new Set(interpretationPrinciples.flatMap(principle=>principle.sources))];
 for(const principle of interpretationPrinciples){const item=node('section',null,'science-pearl');item.append(node('h4',principle.title),node('p',principle.text));details.append(item);}
 details.append(referenceMarks(round,sources,'Principles of variant interpretation'));return details;
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

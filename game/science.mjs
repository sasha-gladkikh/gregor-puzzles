import {allRounds,rounds as playable,findRound,searchText} from './rounds.mjs';
import {node,citation,referenceMarks} from './clinical-ui.mjs';
import {renderSite} from './site.mjs';
import {scientificFigure,clinicalDetails,scientificFamily,scientificInterpretation,scientificReferences,scientificMechanisms} from './science-ui.mjs';
import {createTermLens} from './teaching-ui.mjs';

const params=new URLSearchParams(location.search);
let current=findRound(params.get('level')??'01',allRounds);
const mount=document.getElementById('scienceArticle'),index=document.getElementById('scienceIndex'),search=document.getElementById('scienceSearch'),chooser=document.getElementById('scienceChooser');
const wideLayout=window.matchMedia('(min-width:1001px)');
const termLens=createTermLens();
const entries=allRounds.map(round=>{
 const link=node('a',null,'science-round-link');link.href=`./science.html?level=${round.number}`;
 const identity=node('span',null,'science-round-identity');identity.append(node('strong',round.gene),node('span',round.condition,'science-round-condition'));
 link.append(node('span',round.number,'science-round-number'),identity);
 link.addEventListener('click',event=>{if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();history.pushState({},'',link.href);showRound(round);search.value='';filter();chooser.open=false;mount.querySelector('h2').focus({preventScroll:true});});index.append(link);
 return {round,link,search:searchText(round)};
});
function showRound(round){
 termLens.close();
 current=round;document.getElementById('scienceCurrentRound').textContent=`${round.number} · ${round.gene}`;renderSite({active:'science',roundNumber:round.number,playControls:false});
 entries.forEach(item=>{if(item.round===round)item.link.setAttribute('aria-current','true');else item.link.removeAttribute('aria-current');});
 const article=node('article',null,'science-article');article.id=`round-${round.number}`;
 const head=node('header',null,'science-article-head');
 const title=node('h2',round.gene);title.tabIndex=-1;
 const condition=node('p',null,'science-condition');condition.append(node('span',round.condition),citation(`https://omim.org/entry/${round.omim}`,`OMIM ${round.omim}`));
 head.append(node('p',`Round ${round.number} · ${round.topic}`,'science-kicker'),title,condition);
 const facts=node('dl',null,'science-facts');
 for(const [label,value,sources]of[['Normal role',round.clinical.normalRole.text,round.clinical.normalRole.sources],['Disease mechanism',round.molecular.mechanism.body,round.molecular.mechanism.sourceUrl],['Variant pattern',round.molecular.variantType.body,round.molecular.variantType.sourceUrl],['Inheritance',round.inheritance]]){
  const pair=node('div'),description=node('dd',value);if(sources)description.append(referenceMarks(round,sources,label));pair.append(node('dt',label),description);facts.append(pair);
 }
 const actions=node('div',null,'science-actions');
 if(playable.includes(round)){const play=node('a','Play this round','primary');play.href=`./play.html?level=${round.number}`;actions.append(play);}
 head.append(actions);
 const sections=node('details',null,'science-section-nav');sections.open=wideLayout.matches;
 sections.append(node('summary','On this page'));
 const sectionLinks=node('nav',null,'science-section-links');sectionLinks.setAttribute('aria-label',`${round.gene} profile sections`);
 for(const [label,hash]of [['Mechanism','mechanism'],['Clinical features','clinical-pattern'],['Family implications','family'],['Interpretation','interpretation'],['References','references']]){
  const a=node('a',label);a.href=`#${hash}`;a.addEventListener('click',()=>{if(!wideLayout.matches)sections.open=false;});sectionLinks.append(a);
 }sections.append(sectionLinks);
 const layout=node('div',null,'science-article-grid'),content=node('div',null,'science-content'),opening=node('div',null,'science-opening');
 const visual=scientificFigure(round);visual.classList.add('science-visual-column');
 // Keep shared figure interactions, but move the notes after the mechanism in the
 // reading order so their controls do not bury the clinical teaching on a phone.
 const imageNotes=node('details',null,'science-image-details');imageNotes.append(node('summary','Explore image notes'));
 for(const child of [...visual.children])if(!child.classList.contains('science-figure'))imageNotes.append(child);
 visual.querySelectorAll('.artwork-marker').forEach(marker=>marker.addEventListener('click',()=>{imageNotes.open=true;}));
 const mechanism=node('section',null,'science-section science-mechanism');mechanism.id='mechanism';mechanism.append(node('h3','From gene to disease'),facts);
 const memory=node('aside',null,'science-memory');memory.append(node('span','One connection to remember','science-kicker'),node('p',round.clinical.memory));mechanism.append(memory);
 opening.append(visual,mechanism,imageNotes);
 const reading=node('div',null,'science-reading');
 const extra=scientificMechanisms(round);
 if(extra.children.length){const models=node('details',null,'science-model-details');models.append(node('summary','Explore mechanism models'),extra);reading.append(models);}
 const references=scientificReferences(round),review=node('a','For scientific reviewers →','science-review-link');
 review.href=`./review.html?level=${round.number}#round-${round.number}`;
 const reviewerNote=node('p',null,'science-reviewer-note');reviewerNote.append(review);references.append(reviewerNote);
 reading.append(clinicalDetails(round),scientificFamily(round),scientificInterpretation(round),references);
 content.append(opening,reading);layout.append(sections,content);article.append(head,layout);mount.replaceChildren(article);
 termLens.enhance(content);
 document.title=`${round.gene} · Science · GREGoR Puzzles`;
 if(location.hash)requestAnimationFrame(revealHash);
}
function revealHash(){
 const target=document.getElementById(location.hash.slice(1));if(!target)return;
 for(let parent=target.parentElement;parent&&parent!==mount;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
 target.scrollIntoView({block:'start'});
}
function filter(){
 const query=search.value.trim().toLowerCase();const matches=entries.filter(item=>item.search.includes(query));
 document.getElementById('clearScienceSearch').hidden=!query;
 for(const item of entries)item.link.hidden=!matches.includes(item);
 document.getElementById('scienceCount').textContent=query?`${matches.length} of ${allRounds.length} rounds`:`${allRounds.length} rounds`;
 document.getElementById('scienceEmpty').hidden=matches.length>0;
 // Filtering never changes the article or URL. A profile opens only on selection.
}
search.addEventListener('input',filter);
chooser.addEventListener('keydown',event=>{if(event.key==='Escape'){chooser.open=false;chooser.querySelector('summary').focus();}});
document.addEventListener('click',event=>{if(chooser.open&&!chooser.contains(event.target))chooser.open=false;});
wideLayout.addEventListener('change',()=>{const sections=mount.querySelector('.science-section-nav');if(sections)sections.open=wideLayout.matches;});
document.getElementById('clearScienceSearch').addEventListener('click',()=>{search.value='';filter();search.focus();});
window.addEventListener('popstate',()=>{
 const next=findRound(new URLSearchParams(location.search).get('level'),allRounds);
 // Fragment history belongs to the current article. Rebuilding it here would
 // discard open notes, model selections, and the reader's focus.
 if(next.id===current.id){if(location.hash)revealHash();return;}
 search.value='';chooser.open=false;showRound(next);filter();
});
window.addEventListener('hashchange',revealHash);
mount.addEventListener('click',event=>{if(event.target.closest('.figure-step,.artwork-marker'))termLens.enhance(mount.querySelector('.science-selected-note'));});
window.addEventListener('beforeprint',()=>{termLens.close();mount.querySelectorAll('details').forEach(details=>{details.dataset.wasOpen=String(details.open);details.open=true;});});
window.addEventListener('afterprint',()=>{mount.querySelectorAll('[data-was-open]').forEach(details=>{details.open=details.dataset.wasOpen==='true';delete details.dataset.wasOpen;});});
showRound(current);

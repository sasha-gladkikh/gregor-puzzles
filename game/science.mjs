import {allRounds,rounds as playable,findRound,searchText} from './rounds.mjs';
import {node,citation,referenceMarks} from './clinical-ui.mjs';
import {renderSite} from './site.mjs';
import {scientificFigure,clinicalDetails,scientificFamily,scientificInterpretation,scientificReferences,scientificMechanisms} from './science-ui.mjs';

const params=new URLSearchParams(location.search);
let current=findRound(params.get('level')??'01',allRounds);
const mount=document.getElementById('scienceArticle'),index=document.getElementById('scienceIndex'),search=document.getElementById('scienceSearch'),chooser=document.getElementById('scienceChooser');
const wideLayout=window.matchMedia('(min-width:1001px)');
const entries=allRounds.map(round=>{
 const link=node('a',null,'science-round-link');link.href=`./science.html?level=${round.number}`;link.append(node('span',round.number),node('strong',round.gene));
 link.addEventListener('click',event=>{if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();history.pushState({},'',link.href);showRound(round);chooser.open=false;mount.querySelector('h2').focus({preventScroll:true});});index.append(link);
 return {round,link,search:searchText(round)};
});
function showRound(round){
 current=round;document.getElementById('scienceCurrentRound').textContent=`${round.number} · ${round.gene}`;renderSite({active:'science',roundNumber:round.number,playControls:false});
 entries.forEach(item=>{if(item.round===round)item.link.setAttribute('aria-current','true');else item.link.removeAttribute('aria-current');});
 const article=node('article',null,'science-article');article.id=`round-${round.number}`;
 const head=node('header',null,'science-article-head');
 const title=node('h2',round.gene);title.tabIndex=-1;
 const condition=node('p',null,'science-condition');condition.append(node('span',round.condition),citation(`https://omim.org/entry/${round.omim}`,`OMIM ${round.omim}`));
 head.append(node('p',`Round ${round.number} · ${round.topic}`,'science-kicker'),title,condition);
 const facts=node('dl',null,'science-facts');for(const [label,value]of[['Inheritance',round.inheritance],['Variant context',round.variant]]){const pair=node('div');pair.append(node('dt',label),node('dd',value));facts.append(pair);}
 const actions=node('div',null,'science-actions');
 if(playable.includes(round)){const play=node('a','Play this round','primary');play.href=`./play.html?level=${round.number}`;actions.append(play);}
 const review=node('a','Editorial review →','science-review-link');review.href=`./review.html?level=${round.number}#round-${round.number}`;actions.append(review);head.append(actions);
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
 const mechanism=node('section',null,'science-section science-mechanism');mechanism.id='mechanism';const mechanismHeading=node('h3','Mechanism');mechanismHeading.append(referenceMarks(round,round.clinical.connectionSources,'Mechanism and clinical connection'));mechanism.append(mechanismHeading,node('p',round.clinical.connection,'science-lead'));
 const memory=node('aside',null,'science-memory');memory.append(node('span','One connection to remember','science-kicker'),node('p',round.clinical.memory));mechanism.append(memory,facts);
 opening.append(visual,mechanism,imageNotes);
 const reading=node('div',null,'science-reading');
 const extra=scientificMechanisms(round);
 if(extra.children.length){const models=node('details',null,'science-model-details');models.append(node('summary','Explore mechanism models'),extra);reading.append(models);}
 reading.append(clinicalDetails(round),scientificFamily(round),scientificInterpretation(round),scientificReferences(round));
 content.append(opening,reading);layout.append(sections,content);article.append(head,layout);mount.replaceChildren(article);
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
 // Search selects the first matching profile so a phenotype match is visible immediately.
 // An empty search leaves the current profile available while the chooser explains the result.
 if(matches.length&&!matches.some(item=>item.round===current)){
  const next=matches[0].round;history.replaceState({},'',`./science.html?level=${next.number}`);showRound(next);
 }
}
search.addEventListener('input',filter);
chooser.addEventListener('keydown',event=>{if(event.key==='Escape'){chooser.open=false;chooser.querySelector('summary').focus();}});
document.addEventListener('click',event=>{if(chooser.open&&!chooser.contains(event.target))chooser.open=false;});
wideLayout.addEventListener('change',()=>{const sections=mount.querySelector('.science-section-nav');if(sections)sections.open=wideLayout.matches;});
document.getElementById('clearScienceSearch').addEventListener('click',()=>{search.value='';filter();search.focus();});
window.addEventListener('popstate',()=>{search.value='';chooser.open=false;showRound(findRound(new URLSearchParams(location.search).get('level'),allRounds));filter();});
window.addEventListener('hashchange',revealHash);
window.addEventListener('beforeprint',()=>{mount.querySelectorAll('details').forEach(details=>{details.dataset.wasOpen=String(details.open);details.open=true;});});
window.addEventListener('afterprint',()=>{mount.querySelectorAll('[data-was-open]').forEach(details=>{details.open=details.dataset.wasOpen==='true';delete details.dataset.wasOpen;});});
showRound(current);

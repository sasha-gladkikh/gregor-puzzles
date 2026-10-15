import {allRounds,rounds as playable,findRound} from './rounds.mjs';
import {node,citation} from './clinical-ui.mjs';
import {hpoTerms} from './hpo-terms.mjs';
import {renderSite} from './site.mjs';
import {claimSource,scientificFigure,clinicalDetails,scientificInterpretation,scientificReferences,scientificMechanisms} from './science-ui.mjs';

const params=new URLSearchParams(location.search);
let current=findRound(params.get('level')??'01',allRounds);
const mount=document.getElementById('scienceArticle'),index=document.getElementById('scienceIndex'),search=document.getElementById('scienceSearch');
const entries=allRounds.map(round=>{
 const link=node('a',null,'science-round-link');link.href=`./science.html?level=${round.number}`;link.append(node('span',round.number),node('strong',round.gene));
 link.addEventListener('click',event=>{if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();history.pushState({},'',link.href);showRound(round);mount.querySelector('h2').focus({preventScroll:true});});index.append(link);
 return {round,link,search:[round.gene,round.condition,round.topic,round.clinical.pattern,...round.clinical.features.flatMap(f=>[f.title,f.system,f.text,f.context,f.hpo??'',hpoTerms[f.hpo]??''])].join(' ').toLowerCase()};
});
function showRound(round){
 current=round;renderSite({active:'science',roundNumber:round.number,playControls:false});
 entries.forEach(item=>{if(item.round===round)item.link.setAttribute('aria-current','true');else item.link.removeAttribute('aria-current');});
 const article=node('article',null,'science-article');article.id=`round-${round.number}`;
 const head=node('header',null,'science-article-head');
 const title=node('h2',round.gene);title.tabIndex=-1;
 const condition=node('p',null,'science-condition');condition.append(node('span',round.condition),citation(`https://omim.org/entry/${round.omim}`,`OMIM ${round.omim}`));
 const status=node('p',round.reviewStatus,'science-review-status');
 head.append(node('p',`Round ${round.number} · ${round.topic}`,'science-kicker'),title,condition,status);
 const facts=node('dl',null,'science-facts');for(const [label,value]of[['Inheritance',round.inheritance],['Variant context',round.variant]]){const pair=node('div');pair.append(node('dt',label),node('dd',value));facts.append(pair);}head.append(facts);
 const actions=node('div',null,'science-actions');
 if(playable.includes(round)){const play=node('a','Play this round','primary');play.href=`./?level=${round.number}`;actions.append(play);}
 const review=node('a','Review this content','tool');review.href=`./review.html?level=${round.number}#round-${round.number}`;actions.append(review);head.append(actions);
 const sections=node('nav',null,'science-section-nav');sections.setAttribute('aria-label',`${round.gene} profile sections`);for(const [label,hash]of [['Mechanism','mechanism'],['Clinical pattern','clinical-pattern'],['Interpretation','interpretation'],['References','references']]){const a=node('a',label);a.href=`#${hash}`;sections.append(a);}head.append(sections);
 const layout=node('div',null,'science-article-grid'),visual=node('div',null,'science-visual-column'),content=node('div',null,'science-reading');
 visual.append(scientificFigure(round),scientificMechanisms(round));
 const mechanism=node('section',null,'science-section science-mechanism');mechanism.id='mechanism';mechanism.append(node('h3','Mechanism'),node('p',round.clinical.connection,'science-lead'));
 mechanism.append(claimSource(round,'Mechanism and clinical connection',[round.illustration.source,round.clinical.patternSource,...(round.clinical.extraSources??[]),...(round.illustration.noteSource?[round.illustration.noteSource]:[])]));
 const memory=node('aside',null,'science-memory');memory.append(node('span','One connection to remember','science-kicker'),node('p',round.clinical.memory));mechanism.append(memory);
 content.append(mechanism,clinicalDetails(round),scientificInterpretation(round),scientificReferences(round));
 layout.append(visual,content);article.append(head,layout);mount.replaceChildren(article);
 document.title=`${round.gene} · Science & sources · GREGoR Puzzles`;
 document.querySelector('.science-review-link').href=`./review.html?level=${round.number}#round-${round.number}`;
 if(location.hash)requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'start'}));
}
function filter(){
 const query=search.value.trim().toLowerCase();const matches=entries.filter(item=>item.search.includes(query));
 for(const item of entries)item.link.hidden=!matches.includes(item);
 document.getElementById('scienceCount').textContent=query?`${matches.length} of ${allRounds.length} rounds`:`${allRounds.length} rounds`;
 document.getElementById('scienceEmpty').hidden=matches.length>0;
 // Search selects the first matching profile so a phenotype match is visible immediately.
 mount.hidden=matches.length===0;
 if(matches.length&&!matches.some(item=>item.round===current)){
  const next=matches[0].round;history.replaceState({},'',`./science.html?level=${next.number}`);showRound(next);
 }
}
search.addEventListener('input',filter);
document.getElementById('clearScienceSearch').addEventListener('click',()=>{search.value='';filter();search.focus();});
window.addEventListener('popstate',()=>{search.value='';showRound(findRound(new URLSearchParams(location.search).get('level'),allRounds));filter();});
showRound(current);
window.addEventListener('beforeprint',()=>{document.querySelectorAll('.claim-source').forEach(d=>{d.dataset.wasOpen=String(d.open);d.open=true;});});
window.addEventListener('afterprint',()=>{document.querySelectorAll('[data-was-open]').forEach(d=>{d.open=d.dataset.wasOpen==='true';delete d.dataset.wasOpen;});});

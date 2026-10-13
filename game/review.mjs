import {hpoTerms} from './hpo-terms.mjs';
import {rounds,findRound} from './rounds.mjs';
import {artworkMarkers,artworkGuide} from './artwork-ui.mjs';
import {node,citation,renderClinicalProfile,renderPearls,renderMemory} from './clinical-ui.mjs';
const returnRound=findRound(new URLSearchParams(location.search).get('level') ?? '01');
for(const id of ['playTab','playFooter'])document.getElementById(id).href=`./?level=${returnRound.number}`;
document.getElementById('editorialTab').href=`./review.html?level=${returnRound.number}`;
const cards=[],indexLinks=[];
const panel=(label,open=false)=>{const d=node('details',null,'learning-panel');d.open=open;d.append(node('summary',label));return d;};
for(const round of rounds){
 const p=round.clinical;
 const jump=node('a',`${round.number} · ${round.gene}`);jump.href=`#round-${round.number}`;document.getElementById('reviewIndex').append(jump);indexLinks.push(jump);
 const card=node('article',null,'review-round');card.id=`round-${round.number}`;
 const head=node('header');head.append(node('span',`ROUND ${round.number} · ${round.topic.toUpperCase()}`,'eyebrow'),node('h2',round.gene),node('p',round.condition),node('span',round.reviewStatus,'review-badge'));
 const objective=node('div',null,'learning-objective');objective.append(node('strong','Learning objective'),node('p',p.objective));head.append(objective,node('p',p.overview,'clinical-overview'));card.append(head);
 const body=node('div',null,'review-columns'),visual=node('div',null,'review-visual');
 const figure=node('div',null,'artwork-figure');
 const img=node('img');img.src=round.artwork;img.alt=round.description;img.width=800;img.height=600;img.loading='lazy';figure.append(img,artworkMarkers(round));visual.append(figure,artworkGuide(round));
 const play=node('a','Open playable round →','primary');play.href=`./?level=${round.number}`;visual.append(play);renderMemory(round,visual);
 const facts=node('dl',null,'gene-facts');for(const [label,text] of [['Condition identifier',`OMIM ${round.omim}`],['Inheritance for this relationship',round.inheritance],['Relevant variant classes',round.variant]]){const d=node('div');d.append(node('dt',label),node('dd',text));facts.append(d);}visual.append(facts);
 const content=node('div');
 const pattern=node('section',null,'pattern-card');pattern.append(node('span','CLINICAL CONNECTION','eyebrow'),node('p',p.pattern),citation(p.patternSource,'Clinical reference'));content.append(pattern);
 const phenotypes=panel('Clinical profile and HPO terms',true);renderClinicalProfile(round,phenotypes);content.append(phenotypes);
 const interpretation=panel('Molecular interpretation and pitfalls');interpretation.append(node('p',round.summary));renderPearls(round,interpretation);content.append(interpretation);
 const clues=panel('Progressive clues shown during play');const list=node('ol',null,'review-clues');for(const c of round.clues){const li=node('li');li.append(node('strong',`${c.at} pieces · ${c.label}: ${c.title}. `),document.createTextNode(c.body));if(c.sourceUrl)li.append(document.createTextNode(' '),citation(c.sourceUrl));list.append(li);}clues.append(list);content.append(clues);
 const sources=panel('References and community resources');const refs=node('nav',null,'review-sources');refs.setAttribute('aria-label',`${round.gene} sources`);for(const [title,url] of round.sources)refs.append(citation(url,title));sources.append(refs,citation(round.community[1],round.community[0]),node('p',round.sourceNote,'source-note'),node('p',`Literature and HPO terminology checked ${round.checked}.`,'source-note'));content.append(sources);
 const notes=panel('Personal editorial notes');notes.classList.add('review-editor-notes');const id=`notes-${round.number}`,key=`gregor-puzzles:review-notes:${round.id}`;
 const label=node('label',`Review notes for ${round.gene}`);label.htmlFor=id;const textarea=node('textarea');textarea.id=id;textarea.rows=4;textarea.maxLength=12000;textarea.placeholder='Record a correction, missing reference, or teaching suggestion. Use no patient details.';
 const status=node('p','Notes stay in this browser. They are not shared with the team and do not change scientific approval status.','clinical-note');status.setAttribute('role','status');
 try{textarea.value=localStorage.getItem(key)??'';}catch{status.textContent='Local saving is unavailable. Copy your notes before leaving this page.';}
 textarea.addEventListener('input',()=>{try{localStorage.setItem(key,textarea.value);status.textContent='Saved in this browser only. Scientific approval remains pending.';}catch{status.textContent='Could not save locally. Copy your notes before leaving this page.';}});
 notes.append(label,textarea,status);content.append(notes);
 body.append(visual,content);card.append(body);document.getElementById('reviewRounds').append(card);
 cards.push({card,round,search:[round.gene,round.condition,round.topic,p.pattern,...p.features.flatMap(f=>[f.title,f.system,f.text,f.context,f.hpo??'',hpoTerms[f.hpo]??''])].join(' ').toLowerCase()});
}
const search=document.getElementById('reviewSearch');search.addEventListener('input',()=>{
 const query=search.value.trim().toLowerCase();let count=0;
 cards.forEach((item,i)=>{const match=item.search.includes(query);item.card.hidden=!match;indexLinks[i].hidden=!match;if(match)count++;});
 document.getElementById('reviewCount').textContent=`${count} of ${rounds.length} rounds shown`;
 document.getElementById('reviewEmpty').hidden=count!==0;
});
document.getElementById('clearSearch').onclick=()=>{search.value='';search.dispatchEvent(new Event('input'));search.focus();};
document.getElementById('expandProfiles').onclick=()=>{for(const {card}of cards)if(!card.hidden)card.querySelector('.learning-panel').open=true;};
document.getElementById('collapseProfiles').onclick=()=>{for(const {card}of cards)if(!card.hidden)card.querySelectorAll('.learning-panel').forEach(d=>d.open=false);};
window.addEventListener('beforeprint',()=>{document.querySelectorAll('.learning-panel:not(.review-editor-notes)').forEach(d=>{d.dataset.wasOpen=String(d.open);d.open=true;});});
window.addEventListener('afterprint',()=>{document.querySelectorAll('[data-was-open]').forEach(d=>{d.open=d.dataset.wasOpen==='true';delete d.dataset.wasOpen;});});

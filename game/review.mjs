import {hpoTerms} from './hpo-terms.mjs';
import {allRounds as rounds,rounds as playable,findRound} from './rounds.mjs';
import {artworkMarkers,artworkGuide} from './artwork-ui.mjs';
import {node,citation} from './clinical-ui.mjs';
import {mechanismFigure,spliceCompare} from './mechanism.mjs';
import {checks} from './signoff.mjs';
import {illustrationWalkthrough} from './experience.mjs';
import {claimSource} from './science-ui.mjs';
import {renderSite} from './site.mjs';
const returnRound=findRound(new URLSearchParams(location.search).get('level')??'01',rounds);
renderSite({active:'review',roundNumber:returnRound.number,playControls:false});
const cards=[],indexLinks=[];
const panel=(label,open=false)=>{const d=node('details',null,'learning-panel');d.open=open;d.append(node('summary',label));return d;};
for(const round of rounds){
 const p=round.clinical;
 const jump=node('a',`${round.number} · ${round.gene}`);jump.href=`#round-${round.number}`;document.getElementById('reviewIndex').append(jump);indexLinks.push(jump);
 const card=node('article',null,'review-round');card.id=`round-${round.number}`;
 const head=node('header');head.append(node('span',`Round ${round.number} · ${round.topic}`,'science-kicker'),node('h2',round.gene));
 const condition=node('p',null,'review-condition');condition.append(node('span',round.condition),citation(`https://omim.org/entry/${round.omim}`,`OMIM ${round.omim}`));
 head.append(condition,node('span',round.reviewStatus,'review-badge'));
 const links=node('div',null,'review-round-links');const science=node('a','Clinical profile & sources','tool');science.href=`./science.html?level=${round.number}`;links.append(science);
 if(playable.includes(round)){const play=node('a','Play this round','tool');play.href=`./?level=${round.number}`;links.append(play);}head.append(links);card.append(head);
 const body=node('div',null,'review-columns'),visual=node('div',null,'review-visual');
 const figure=node('div',null,'artwork-figure');
 const img=node('img');img.src=round.artwork;img.alt=round.description;img.width=800;img.height=600;img.loading='lazy';figure.append(img,artworkMarkers(round));
 const walkthrough=illustrationWalkthrough(round,{board:figure,id:`review-walkthrough-${round.number}`,onStep:i=>{cards.forEach(c=>{if(c.card!==card)c.walkthrough.pause();});figure.querySelectorAll('.artwork-marker').forEach((m,j)=>m.classList.toggle('is-active',i===j));},onClose:()=>figure.querySelectorAll('.artwork-marker').forEach(m=>m.classList.remove('is-active'))});
 visual.append(figure,walkthrough.element);
 const imageNotes=panel('Completed image notes and mechanism figures');imageNotes.append(artworkGuide(round));for(const extra of [mechanismFigure(round),spliceCompare(round,()=>true)])if(extra)imageNotes.append(extra);visual.append(imageNotes);
 const content=node('div',null,'review-content');
 const checklist=node('section',null,'review-signoff');checklist.append(node('h3','Scientific sign-off'));
 const signoffList=node('ul',null,'signoff-list');signoffList.setAttribute('aria-label',`${round.gene} sign-off checks`);
 for(const [key,label]of checks){const done=round.signoff?.checks?.[key]===true;const li=node('li');li.append(node('span',done?'Reviewed':'Pending','signoff-state'),node('span',label));li.className=done?'is-done':'';signoffList.append(li);}checklist.append(signoffList);content.append(checklist);
 const objective=node('section',null,'review-objective');objective.append(node('h3','Teaching objective'),node('p',p.objective),node('p',p.overview,'clinical-overview'));content.append(objective);
 const reveal=panel('Completion card wording',true);const caveat=p.pearls[p.caveat];
 reveal.append(node('h4','Mechanism'),node('p',p.connection),claimSource(round,'Mechanism and clinical connection',[round.illustration.source,p.patternSource,...(p.extraSources??[]),...(round.illustration.noteSource?[round.illustration.noteSource]:[])]),node('h4','Clinical pattern'),node('p',p.pattern),claimSource(round,'Clinical pattern',p.patternSource),node('h4',`Interpretation note · ${caveat.title}`),node('p',caveat.text),claimSource(round,caveat.title,caveat.sources));content.append(reveal);
 const clues=panel('Progressive clues and image notes during play');const list=node('ol',null,'review-clues');
 for(const c of round.clues){const li=node('li');li.append(node('strong',`${c.at} pieces · ${c.label}: ${c.title}. `),document.createTextNode(c.body));if(c.sourceUrl)li.append(claimSource(round,c.label,c.sourceUrl));list.append(li);}clues.append(list);
 const playNotes=node('ol',null,'review-clues');round.illustration.landmarks.forEach((l,i)=>{const li=node('li');li.append(node('strong',`Image note ${i+1}: ${l.playTitle} `),document.createTextNode(l.playText));playNotes.append(li);});
 clues.append(node('h4','Anonymous image notes'),node('p','This wording is shown during play. Gene and condition names are revealed at the end of the round.','small'),playNotes);content.append(clues);
 const notes=panel('Personal editorial notes');notes.classList.add('review-editor-notes');const id=`notes-${round.number}`,key=`gregor-puzzles:review-notes:${round.id}`;
 const label=node('label',`Notes for ${round.gene}`);label.htmlFor=id;const textarea=node('textarea');textarea.id=id;textarea.rows=4;textarea.maxLength=12000;textarea.placeholder='Correction, supporting reference, or teaching suggestion. Use no patient details.';
 const status=node('p','Saved only in this browser. Use Copy review notes to share them yourself.','clinical-note');status.setAttribute('role','status');
 try{textarea.value=localStorage.getItem(key)??'';}catch{status.textContent='Local saving is unavailable. Copy your notes before leaving.';}
 textarea.addEventListener('input',()=>{try{localStorage.setItem(key,textarea.value);status.textContent='Saved in this browser. Approval status is unchanged.';}catch{status.textContent='Could not save locally. Copy your notes before leaving.';}});
 notes.append(label,textarea,status);content.append(notes);
 body.append(visual,content);card.append(body);document.getElementById('reviewRounds').append(card);
 cards.push({card,round,walkthrough,textarea,search:[round.gene,round.condition,round.topic,p.pattern,...p.features.flatMap(f=>[f.title,f.system,f.text,f.context,f.hpo??'',hpoTerms[f.hpo]??''])].join(' ').toLowerCase()});
}
const search=document.getElementById('reviewSearch');search.addEventListener('input',()=>{
 const query=search.value.trim().toLowerCase();let count=0;
 cards.forEach((item,i)=>{const match=item.search.includes(query);item.card.hidden=!match;indexLinks[i].hidden=!match;if(match)count++;else item.walkthrough.pause();});
 document.getElementById('reviewCount').textContent=`${count} of ${rounds.length} rounds shown`;
 document.getElementById('reviewEmpty').hidden=count!==0;
});
document.getElementById('clearSearch').onclick=()=>{search.value='';search.dispatchEvent(new Event('input'));search.focus();};
document.getElementById('collapseProfiles').onclick=()=>{for(const {card,walkthrough}of cards)if(!card.hidden){card.querySelectorAll('.learning-panel').forEach(d=>d.open=false);walkthrough.close();}};
document.getElementById('copyReviewNotes').addEventListener('click',async()=>{
 const status=document.getElementById('copyStatus'),fallback=document.getElementById('copyFallback');
 const notes=cards.filter(c=>c.textarea.value.trim()).map(({round,textarea})=>`Round ${round.number} · ${round.gene}\n${round.condition}\n${textarea.value.trim()}`);
 if(!notes.length){status.textContent='No notes yet. Open Personal editorial notes under a round to add feedback.';fallback.hidden=true;return;}
 const text=`GREGoR Puzzles · Editorial notes\n\n${notes.join('\n\n')}\n\nPersonal feedback only. Scientific approval status is unchanged.`;
 try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(text);status.textContent=`Copied notes for ${notes.length} ${notes.length===1?'round':'rounds'}. Paste them into your message or document.`;fallback.hidden=true;}
 catch{fallback.hidden=false;const area=document.getElementById('copyFallbackText');area.value=text;area.focus();area.select();status.textContent='Automatic copying is unavailable. Your notes are selected below; copy them manually.';}
});
if(location.hash.startsWith('#round-'))requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView());
window.addEventListener('beforeprint',()=>{document.querySelectorAll('.learning-panel:not(.review-editor-notes),.claim-source').forEach(d=>{d.dataset.wasOpen=String(d.open);d.open=true;});});
window.addEventListener('afterprint',()=>{document.querySelectorAll('[data-was-open]').forEach(d=>{d.open=d.dataset.wasOpen==='true';delete d.dataset.wasOpen;});});

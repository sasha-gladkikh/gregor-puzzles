import {allRounds as rounds,rounds as playable,findRound,searchText} from './rounds.mjs';
import {artworkMarkers} from './artwork-ui.mjs';
import {node,citation,referenceMarks,referenceList} from './clinical-ui.mjs';
import {mechanismFigure,spliceCompare} from './mechanism.mjs';
import {illustrationWalkthrough} from './experience.mjs';
import {renderSite} from './site.mjs';
import {scientificPrinciples} from './science-ui.mjs';
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
 head.append(condition);
 const links=node('div',null,'review-round-links');const science=node('a','Science →','tool');science.href=`./science.html?level=${round.number}`;links.append(science);
 if(playable.includes(round)){const play=node('a','Play this round','tool');play.href=`./?level=${round.number}`;links.append(play);}head.append(links);card.append(head);
 const body=node('div',null,'review-columns'),visual=node('div',null,'review-visual');
 const figure=node('div',null,'artwork-figure');
 const img=node('img');img.src=round.artwork;img.alt=round.description;img.width=800;img.height=600;img.loading='lazy';figure.append(img,artworkMarkers(round));
 const walkthrough=illustrationWalkthrough(round,{board:figure,id:`review-walkthrough-${round.number}`,onStep:i=>{cards.forEach(c=>{if(c.card!==card)c.walkthrough.pause();});figure.querySelectorAll('.artwork-marker').forEach((m,j)=>m.classList.toggle('is-active',i===j));},onClose:()=>figure.querySelectorAll('.artwork-marker').forEach(m=>m.classList.remove('is-active'))});
 visual.append(figure,walkthrough.element);
 visual.append(node('p',round.illustration.note,'review-figure-note'));
 const transcript=node('div',null,'review-image-transcript');for(const [i,landmark]of round.illustration.landmarks.entries())transcript.append(node('h4',`${i+1}. ${landmark.title}`),node('p',landmark.text));visual.append(transcript);
 const extras=[mechanismFigure(round),spliceCompare(round,()=>true)].filter(Boolean);if(extras.length){const diagrams=panel('Mechanism figures');diagrams.append(...extras);visual.append(diagrams);}
 const content=node('div',null,'review-content');
 const objective=node('section',null,'review-objective');objective.append(node('h3','Teaching objective'),node('p',p.objective),node('p',p.overview,'clinical-overview'));content.append(objective);
 const reveal=panel('Completion card wording',true);
 const completionParts=[['Mechanism',p.connection,p.connectionSources],['Clinical pattern',p.pattern,[p.patternSource]],['Onset and course',p.onset,[p.patternSource]],['Clinical significance',p.significance.text,p.significance.sources],['Family implications',p.family.text,p.family.sources]];
 const sourceKeys=completionParts.map(([, ,urls])=>[...new Set(urls)].sort().join('|'));
 for(const [i,[label,text,urls]]of completionParts.entries()){
  const paragraph=node('p',text);
  if(sourceKeys[i]!==sourceKeys[i+1]){let start=i;while(start>0&&sourceKeys[start-1]===sourceKeys[i])start--;paragraph.append(referenceMarks(round,urls,completionParts.slice(start,i+1).map(([title])=>title).join(', ')));}
  reveal.append(node('h4',label),paragraph);
 }content.append(reveal);
 const interpretation=panel('Variant interpretation');const interpretationText=node('p',p.interpretation.text);interpretationText.append(referenceMarks(round,p.interpretation.sources,'Variant interpretation'));interpretation.append(interpretationText,scientificPrinciples(round));content.append(interpretation);
 const clues=panel('Progressive clues and image notes during play');const list=node('ol',null,'review-clues');
 for(const c of round.clues){const li=node('li');li.append(node('strong',`${c.at} pieces · ${c.label}: ${c.title}. `),document.createTextNode(c.body));if(c.sourceUrl)li.append(referenceMarks(round,c.sourceUrl,c.label));list.append(li);}clues.append(list);
 const playNotes=node('ol',null,'review-clues');round.illustration.landmarks.forEach((l,i)=>{const li=node('li');li.append(node('strong',`Image note ${i+1}: ${l.playTitle} `),document.createTextNode(l.playText));playNotes.append(li);});
 clues.append(node('h4','Anonymous image notes'),node('p','This wording is shown during play. Gene and condition names are revealed at the end of the round.','small'),playNotes);content.append(clues);
 const references=panel('References');references.append(referenceList(round,{heading:''}));content.append(references);
 body.append(visual,content);card.append(body);document.getElementById('reviewRounds').append(card);
 cards.push({card,walkthrough,search:searchText(round)});
}
const search=document.getElementById('reviewSearch');search.addEventListener('input',()=>{
 const query=search.value.trim().toLowerCase();let count=0;
 cards.forEach((item,i)=>{const match=item.search.includes(query);item.card.hidden=!match;indexLinks[i].hidden=!match;if(match)count++;else item.walkthrough.pause();});
 document.getElementById('reviewCount').textContent=`${count} of ${rounds.length} rounds shown`;
 document.getElementById('reviewEmpty').hidden=count!==0;
});
document.getElementById('clearSearch').onclick=()=>{search.value='';search.dispatchEvent(new Event('input'));search.focus();};
document.getElementById('collapseProfiles').onclick=()=>{for(const {card,walkthrough}of cards)if(!card.hidden){card.querySelectorAll('.learning-panel, .science-detail-panel').forEach(d=>d.open=false);walkthrough.close();}};
if(/^#(?:round-|ref-)/.test(location.hash))requestAnimationFrame(()=>{const target=document.getElementById(location.hash.slice(1));if(!target)return;for(let parent=target.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;target.scrollIntoView();});
window.addEventListener('beforeprint',()=>{document.querySelectorAll('.learning-panel, .science-detail-panel').forEach(d=>{d.dataset.wasOpen=String(d.open);d.open=true;});});
window.addEventListener('afterprint',()=>{document.querySelectorAll('[data-was-open]').forEach(d=>{d.open=d.dataset.wasOpen==='true';delete d.dataset.wasOpen;});});

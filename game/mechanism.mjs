import {node,citation} from './clinical-ui.mjs';
// Before/after mechanism figures for rounds where a change of state is the mechanism.
// Hand-drawn schematics with labels; positions and sizes are not to scale. Pending scientific review.
const ticks=(x0,x1,y0,y1)=>Array.from({length:Math.floor((x1-x0)/12)+1},(_,i)=>`<line class="m-pair" x1="${x0+i*12}" y1="${y0}" x2="${x0+i*12}" y2="${y1}"/>`).join('');
export const mechanisms={
 '05':{label:'U4 lets go of U6 at activation',toggle:['Show activation','Show assembly'],viewBox:'0 -24 360 224',
  captions:['Assembly: U4 base-pairs with U6, holding U6 inactive while the spliceosome comes together.','Activation: U4 is unwound and released before splicing chemistry. U6 pairs with U2 at the catalytic centre, so U4 is not part of the catalytic core.'],
  sources:['https://www.nature.com/articles/s41467-024-50785-0','https://www.nature.com/articles/s41586-024-07773-7'],
  svg:`<ellipse class="m-pale" cx="180" cy="104" rx="172" ry="96"/>
<g class="m-u4"><path class="m-strand m-teal-stroke" d="M70 70 H226 q34 0 34 -22 q0 -22 -24 -22 q-20 0 -20 20"/><rect class="m-amber" x="196" y="62" width="34" height="16" rx="8"/><text class="m-label" x="56" y="75" text-anchor="end">U4</text><text class="m-note" x="236" y="14" text-anchor="middle">ReNU variant region</text></g>
<g class="m-u4-pairs">${ticks(82,214,74,96)}</g>
<path class="m-strand m-navy-stroke" d="M70 100 H306"/><text class="m-label" x="56" y="105" text-anchor="end">U6</text>
<g class="m-after"><path class="m-strand m-blue-stroke" d="M150 134 H306"/>${ticks(162,294,104,130)}<text class="m-label" x="140" y="139" text-anchor="end">U2</text><text class="m-note" x="306" y="158" text-anchor="end">catalytic centre</text><text class="m-note" x="40" y="22">U4 released</text></g>
<text class="m-note m-fine" x="180" y="194" text-anchor="middle">Variant region position is schematic</text>`},
 '07':{label:'SHP-2 opens when its latch weakens',toggle:['Show the Noonan change','Show the resting state'],viewBox:'0 0 360 210',
  captions:['Resting: the N-SH2 domain sits in the PTP active site, keeping SHP-2 activity low until signaling partners bind.','Noonan: many variants weaken the N-SH2–PTP interface. SHP-2 opens more easily, and RAS/MAPK signaling increases. Variants causing Noonan syndrome with multiple lentigines behave differently.'],
  sources:['https://pubmed.ncbi.nlm.nih.gov/9491886/','https://pubmed.ncbi.nlm.nih.gov/16358218/'],
  svg:`<ellipse class="m-blue" cx="222" cy="96" rx="82" ry="58"/><text class="m-label m-on-dark" x="248" y="101" text-anchor="middle">PTP domain</text>
<circle class="m-amber" cx="150" cy="96" r="13"/><text class="m-note" x="150" y="22" text-anchor="middle">active site</text><line class="m-leader" x1="150" y1="28" x2="150" y2="80"/>
<ellipse class="m-teal-dark" cx="86" cy="160" rx="34" ry="20"/><text class="m-label m-on-dark" x="86" y="165" text-anchor="middle">C-SH2</text><path class="m-linker" d="M118 154 Q150 152 166 140"/>
<g class="m-latch"><ellipse class="m-teal" cx="138" cy="96" rx="38" ry="26"/><text class="m-label m-on-dark" x="134" y="101" text-anchor="middle">N-SH2</text></g>
<g class="m-after"><circle class="m-variant" cx="170" cy="96" r="6"/><text class="m-note m-on-dark" x="180" y="132">Noonan variant</text></g>
<path class="m-output" d="M246 152 V188"/><path class="m-output-head" d="M238 182 L246 194 L254 182"/><text class="m-note" x="236" y="204" text-anchor="end">RAS/MAPK signaling</text>`},
 '09':{label:'STING signals without its trigger',toggle:['Show the SAVI change','Show normal signaling'],viewBox:'0 0 360 210',
  captions:['Normal, in the cGAS–STING pathway shown: cGAS detects DNA in the cytosol and makes cGAMP. STING bound to cGAMP moves from the ER to the Golgi, recruits TBK1, and switches on a type I interferon response.','SAVI: variant STING leaves the ER and signals without cGAMP, so the response stays on. Mouse models suggest interferon is not the only driver of disease.'],
  sources:['https://pmc.ncbi.nlm.nih.gov/articles/PMC4174543/','https://pubmed.ncbi.nlm.nih.gov/29870684/'],
  svg:`<rect class="m-pale-blue" x="12" y="70" width="104" height="116" rx="18"/><text class="m-label" x="64" y="176" text-anchor="middle">ER</text>
<path class="m-teal-pale" d="M240 78 q50 -16 106 0 v14 q-56 -16 -106 0z M240 104 q50 -16 106 0 v14 q-56 -16 -106 0z M240 130 q50 -16 106 0 v14 q-56 -16 -106 0z"/><text class="m-label" x="262" y="172" text-anchor="middle">Golgi</text>
<g class="m-trigger"><path class="m-strand m-navy-stroke" d="M18 34 q10 -12 20 0 t20 0 t20 0"/><text class="m-note" x="18" y="16">cytosolic DNA</text><circle class="m-navy" cx="102" cy="32" r="11"/><text class="m-note" x="102" y="58" text-anchor="middle">cGAS</text><path class="m-amber" d="M134 32 l8 -8 l8 8 l-8 8z"/><text class="m-note" x="156" y="36">cGAMP</text><line class="m-leader" x1="140" y1="42" x2="80" y2="100"/></g>
<g><ellipse class="m-blue" cx="58" cy="118" rx="9" ry="16"/><ellipse class="m-blue" cx="76" cy="118" rx="9" ry="16"/></g><text class="m-label" x="67" y="152" text-anchor="middle">STING</text>
<path class="m-traffic" d="M118 118 H228"/><path class="m-output-head" d="M222 110 L234 118 L222 126"/>
<g><ellipse class="m-blue" cx="262" cy="62" rx="8" ry="14"/><ellipse class="m-blue" cx="278" cy="62" rx="8" ry="14"/><circle class="m-amber" cx="300" cy="52" r="9"/><text class="m-note" x="314" y="56">TBK1</text></g>
<path class="m-output" d="M318 152 V186"/><path class="m-output-head" d="M310 180 L318 192 L326 180"/><text class="m-note" x="308" y="204" text-anchor="end">type I interferon</text>
<g class="m-after"><path class="m-pulse" d="M332 158 q10 10 0 20"/><path class="m-pulse" d="M342 152 q16 16 0 32"/><text class="m-note" x="176" y="100" text-anchor="middle">no trigger needed</text></g>`}
};
// Rounds 05 and 08 compare the two spliceosomes. The other round's gene stays hidden until it is complete.
export const spliceComparison={
 rounds:['05','08'],source:'https://pubmed.ncbi.nlm.nih.gov/23074130/',
 rows:[['Share of human introns','More than 99.5%','Fewer than 0.5% (U12-type)'],['Small nuclear RNAs','U1, U2, U4/U6, U5','U11, U12, U4atac/U6atac, U5'],['Gene in this collection','RNU4-2 encodes U4','RNU4ATAC encodes U4atac'],['Condition here','ReNU syndrome · dominant, often de novo','Roifman syndrome · biallelic']]
};

export function mechanismFigure(round){
 const m=mechanisms[round.number];if(!m)return null;
 const id=`mechanism-${round.number}`,figure=node('figure',null,'mechanism');figure.id=id;
 figure.innerHTML=`<h3>${m.label}</h3><svg viewBox="${m.viewBox}" role="img" aria-labelledby="${id}-caption">${m.svg}</svg>`;
 const caption=node('figcaption',m.captions[0]);caption.id=`${id}-caption`;caption.setAttribute('aria-live','polite');
 const button=node('button',m.toggle[0],'tool mechanism-toggle');button.type='button';button.setAttribute('aria-pressed','false');button.setAttribute('aria-controls',id);
 button.onclick=()=>{const on=!figure.classList.contains('is-changed');figure.classList.toggle('is-changed',on);button.setAttribute('aria-pressed',String(on));button.textContent=m.toggle[on?1:0];caption.textContent=m.captions[on?1:0];};
 const links=node('p',null,'mechanism-sources');m.sources.forEach((url,i)=>{if(i)links.append(document.createTextNode(' · '));links.append(citation(url,i?'Supporting reference':'Mechanism reference',m.label));});
 figure.append(caption,button,links);return figure;
}
export function spliceCompare(round,isDone,isPlayable=()=>true){
 const index=spliceComparison.rounds.indexOf(round.number);if(index<0)return null;
 const other=spliceComparison.rounds[1-index],section=node('section',null,'splice-compare');
 section.append(node('h3','Two spliceosomes, one job'));
 const table=node('table'),head=node('tr');head.append(node('td',''),node('th','Major spliceosome'),node('th','Minor spliceosome'));
 const thead=node('thead');thead.append(head);table.append(thead);const body=node('tbody');
 spliceComparison.rows.forEach(([label,...cells],row)=>{
  const tr=node('tr'),th=node('th',label);th.scope='row';tr.append(th);
  cells.forEach((text,col)=>{const hidden=row>=2&&col!==index&&!isDone(other);const td=node('td',hidden?(isPlayable(other)?`Revealed in round ${other}`:'Pending scientific review'):text);if(col===index)td.className='is-current';if(hidden)td.classList.add('is-hidden');tr.append(td);});
  body.append(tr);
 });
 table.append(body);section.append(table,citation(spliceComparison.source,'Intron share reference','minor spliceosome'));
 return section;
}

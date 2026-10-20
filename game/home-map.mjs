import {discoveryProgress} from './home-explore.mjs';

const REGIONS=[
 {id:'membrane',label:'Cell membrane',description:'Explore transport and communication at the cell boundary.',numbers:['01','02']},
 {id:'nucleus',label:'Nucleus & RNA',description:'Explore RNA processing and repeated DNA sequences.',numbers:['05','08','10']},
 {id:'lysosome',label:'Lysosome',description:'Explore transport within the cell’s recycling system.',numbers:['03']},
 {id:'ribosome',label:'Ribosome',description:'Explore how the cell prepares its protein-making machinery.',numbers:['04']},
 {id:'signaling',label:'Cell signaling',description:'Explore pathways that carry and respond to molecular signals.',numbers:['07','09']},
 {id:'synapse',label:'Synapse',description:'Explore communication between nerve cells.',numbers:['06']},
];

function approvedRounds(catalogue){
 const seen=new Set();
 return (Array.isArray(catalogue)?catalogue:[]).filter(round=>{
  if(!round||!/^\d{2}$/.test(round.number)||typeof round.topic!=='string'||seen.has(round.number))return false;
  seen.add(round.number);return true;
 });
}

// The catalogue is the build's approved subset. Never import unpublished rounds
// or add a round merely because its number appears in the conceptual mapping.
export function groupHomeRounds(catalogue){
 const rounds=approvedRounds(catalogue);
 return REGIONS.map(region=>({...region,rounds:rounds.filter(round=>region.numbers.includes(round.number))})).filter(region=>region.rounds.length);
}

export function homeMapProgress(catalogue,progressItems=[]){
 const items=discoveryProgress(catalogue,progressItems);
 return groupHomeRounds(catalogue).map(region=>({...region,completed:region.rounds.filter(round=>items.find(item=>item.round.number===round.number)?.done).length}));
}

function drawCell(doc){
 const ns='http://www.w3.org/2000/svg';
 const shape=(tag,attributes={},parent)=>{
  const element=doc.createElementNS(ns,tag);
  for(const [key,value] of Object.entries(attributes))element.setAttribute(key,String(value));
  parent?.append(element);return element;
 };
 const svg=shape('svg',{viewBox:'0 0 620 370','aria-hidden':'true',focusable:'false',class:'cell-map-art'});
 const layer=(region)=>shape('g',{'data-region':region,class:'cell-region'},svg);
 // Static, code-owned geometry: the diagram never loads or embeds user content.
 shape('ellipse',{cx:310,cy:190,rx:220,ry:145,fill:'#eef5ff'},svg);
 const membrane=layer('membrane');
 shape('path',{d:'M152 75C208 33 346 34 421 69S538 180 489 252 341 333 240 305 102 232 112 157C117 120 132 92 152 75Z',fill:'#e0eef7',stroke:'#83bac8','stroke-width':11},membrane);
 shape('path',{d:'M152 75C208 33 346 34 421 69S538 180 489 252 341 333 240 305 102 232 112 157C117 120 132 92 152 75Z',fill:'#f7fbff',stroke:'#c0e1e7','stroke-width':3,'stroke-dasharray':'2 9','stroke-linecap':'round'},membrane);
 // Quiet intracellular landmarks provide context without adding extra actions.
 const context=shape('g',{'aria-hidden':'true',opacity:.7},svg);
 for(const offset of [0,12,24])shape('path',{d:`M318 ${172+offset}c31 -14 54 -9 57 4s-29 5 -34 13 34 10 39 16`,fill:'none',stroke:'#b6d6e2','stroke-width':6,'stroke-linecap':'round'},context);
 const mitochondrion=shape('g',{transform:'translate(431 230) rotate(-25)'},context);
 shape('rect',{x:-32,y:-15,width:64,height:30,rx:15,fill:'#fff2d8',stroke:'#d6b477','stroke-width':2},mitochondrion);
 shape('path',{d:'M-20 0c3 -17 8 -17 9 0s7 13 8 -1 8 -14 9 0 8 13 10 -1',fill:'none',stroke:'#d1ac67','stroke-width':2.5,'stroke-linecap':'round'},mitochondrion);
 for(const [x,y,r] of [[165,211,3],[296,92,2.8],[305,227,2.2],[188,234,2],[453,199,2.5],[364,113,2.3]])shape('circle',{cx:x,cy:y,r,fill:'#b9d0e7'},context);
 for(const [x,y,rotation] of [[129,132,-66],[486,171,5],[372,302,-12]]){
  const channel=shape('g',{transform:`translate(${x} ${y}) rotate(${rotation})`},membrane);
  shape('rect',{x:-10,y:-17,width:7,height:34,rx:3,fill:'#168493',stroke:'#fff','stroke-width':2},channel);
  shape('rect',{x:3,y:-17,width:7,height:34,rx:3,fill:'#168493',stroke:'#fff','stroke-width':2},channel);
 }
 const nucleus=layer('nucleus');
 shape('ellipse',{cx:250,cy:166,rx:76,ry:67,transform:'rotate(-18 250 166)',fill:'#dce6ff',stroke:'#718be0','stroke-width':2.5},nucleus);
 shape('ellipse',{cx:250,cy:166,rx:65,ry:56,transform:'rotate(-18 250 166)',fill:'none',stroke:'#b0bfef','stroke-width':1.5,'stroke-dasharray':'3 6'},nucleus);
 shape('path',{d:'M215 129C262 112 233 182 277 175M212 146C255 128 226 198 274 191',fill:'none',stroke:'#4d66b9','stroke-width':4,'stroke-linecap':'round'},nucleus);
 for(const line of ['218 133 218 144','231 132 231 147','242 147 235 157','247 163 240 174','260 175 254 185','272 177 268 191']){
  const [x1,y1,x2,y2]=line.split(' ');shape('line',{x1,y1,x2,y2,stroke:'#7c91cb','stroke-width':2},nucleus);
 }
 shape('path',{d:'M277 146C294 132 298 165 318 155S336 166 344 159',fill:'none',stroke:'#1b999e','stroke-width':3,'stroke-linecap':'round'},nucleus);
 const lysosome=layer('lysosome');
 shape('circle',{cx:226,cy:263,r:29,fill:'#d3f0e8',stroke:'#46a697','stroke-width':2.5},lysosome);
 shape('circle',{cx:226,cy:263,r:22,fill:'none',stroke:'#a2d9cd','stroke-width':1.5},lysosome);
 for(const [x,y,r] of [[216,255,4],[232,254,3],[220,272,3],[235,270,5]])shape('circle',{cx:x,cy:y,r,fill:'#67b7aa'},lysosome);
 const ribosome=layer('ribosome');
 shape('path',{d:'M316 264C333 249 338 280 355 263S379 273 394 259',fill:'none',stroke:'#7097cb','stroke-width':3,'stroke-linecap':'round'},ribosome);
 shape('path',{d:'M332 256C323 239 331 223 348 226 364 222 374 241 366 256Z',fill:'#7099d7',stroke:'#4675b8','stroke-width':2},ribosome);
 shape('path',{d:'M332 265C331 281 365 285 368 265Z',fill:'#b7cff0',stroke:'#7099d7','stroke-width':2},ribosome);
 shape('path',{d:'M352 225C355 214 342 212 347 201',fill:'none',stroke:'#269b9b','stroke-width':3,'stroke-linecap':'round'},ribosome);
 const signaling=layer('signaling');
 shape('path',{d:'M414 91 399 121 427 143 401 176',fill:'none',stroke:'#8fa7c7','stroke-width':2.5,'stroke-dasharray':'4 5','stroke-linecap':'round'},signaling);
 for(const [x,y,r,fill] of [[414,91,12,'#247d94'],[399,121,9,'#51a4af'],[427,143,10,'#6599d6'],[401,176,11,'#4875b8']])shape('circle',{cx:x,cy:y,r,fill,stroke:'#fff','stroke-width':3},signaling);
 shape('path',{d:'m400 175-8-4m8 4 2-9',fill:'none',stroke:'#fff','stroke-width':2,'stroke-linecap':'round'},signaling);
 const synapse=layer('synapse');
 shape('path',{d:'M500 211C523 207 535 218 535 232S526 251 504 250M556 209C546 221 546 244 557 257',fill:'#deedf8',stroke:'#779bbf','stroke-width':3,'stroke-linecap':'round'},synapse);
 for(const [x,y] of [[514,222],[522,234],[511,242]])shape('circle',{cx:x,cy:y,r:4,fill:'#4089ae'},synapse);
 for(const [x,y] of [[541,225],[540,239],[546,232]])shape('circle',{cx:x,cy:y,r:2,fill:'#359f9c'},synapse);
 // Fine guide lines connect the surrounding HTML controls to entry points.
 const guides=shape('g',{fill:'none',stroke:'#b3c6df','stroke-width':1.2,'stroke-linecap':'round',class:'cell-map-guides'},svg);
 for(const d of ['M114 98H76V74','M176 162H70','M210 286H80V304','M363 278H530V304','M426 91H539V74','M559 233H582V179'])shape('path',{d},guides);
 return svg;
}

export function initHomeMap(catalogue,host=document.getElementById('homeProcessMap'),progressItems=[]){
 if(!host)return {update(){}};
 const doc=host.ownerDocument,rounds=approvedRounds(catalogue),regions=groupHomeRounds(rounds);
 if(!rounds.length){host.replaceChildren();return {update(){}};}
 const node=(tag,text,className)=>{const element=doc.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};
 const intro=node('p','Choose a cell process. Follow it into a puzzle.','cell-map-intro');
 const layout=node('div',undefined,'cell-map-layout'),diagram=node('div',undefined,'cell-map-diagram');
 const stage=node('div',undefined,'cell-map-stage'),art=drawCell(doc),controls=node('div',undefined,'cell-map-controls');
 controls.setAttribute('role','group');controls.setAttribute('aria-label','Choose a cell process');
 const panel=node('div',undefined,'cell-map-panel'),headingRow=node('div',undefined,'cell-map-heading-row');
 const heading=node('h3','All processes','cell-map-heading'),all=node('button','Show all','cell-map-all');
 all.type='button';all.setAttribute('aria-label',`Show all ${rounds.length} rounds`);
 const description=node('p',`${rounds.length} illustrated puzzles. Start wherever your curiosity leads.`, 'cell-map-description');
 const list=node('ol',undefined,'cell-map-rounds');list.id=`${host.id||'homeProcessMap'}Rounds`;
 const status=node('p',undefined,'cell-map-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
 const filters=node('div',undefined,'cell-map-filters'),filterLabel=node('label',undefined,'cell-map-filter');
 const unfinished=node('input');unfinished.type='checkbox';unfinished.setAttribute('aria-controls',list.id);filterLabel.append(unfinished,node('span','Unfinished only'));filters.append(filterLabel);
 let progress=discoveryProgress(rounds,progressItems),selected=null;
 const buttons=new Map();
 function select(region,animate=false){
  selected=region;
  const active=region?.id??'all',eligible=region?.rounds??rounds,visible=eligible.filter(round=>!unfinished.checked||!progress.find(item=>item.round.number===round.number)?.done);
  host.dataset.active=active;
  for(const [id,button] of buttons)button.setAttribute('aria-pressed',String(id===active));
  all.setAttribute('aria-pressed',String(!region));
  for(const group of art.querySelectorAll('[data-region]'))group.classList.toggle('is-active',group.dataset.region===active);
  heading.textContent=region?.label??'All processes';
  description.textContent=region?.description??`${rounds.length} illustrated puzzles. Start wherever your curiosity leads.`;
  list.replaceChildren(...visible.map(round=>{
   const item=node('li'),link=node('a',undefined,'cell-map-round');link.href=`./play.html?level=${round.number}`;
   const number=node('span',round.number,'cell-map-number');number.setAttribute('aria-hidden','true');
   const state=progress.find(item=>item.round.number===round.number),copy=node('span',undefined,'cell-map-round-copy');
   const title=node('span',round.topic,'cell-map-topic'),detail=node('span',state?.done?'Complete · View round':state?.pieces?`Continue · ${state.pieces} of 12 pieces`:'Start this puzzle','cell-map-round-state'),arrow=node('span',state?.done?'✓':'→','cell-map-arrow');arrow.setAttribute('aria-hidden','true');
   link.dataset.state=state?.state??'new';
   link.setAttribute('aria-label',`Round ${round.number}: ${round.topic}. ${detail.textContent}`);copy.append(title,detail);link.append(number,copy,arrow);item.append(link);return item;
  }));
  if(!visible.length){const empty=node('li','All puzzles in this view are complete. Turn off “Unfinished only” to explore them again.','cell-map-empty');list.append(empty);}
  if(animate&&!doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches&&typeof list.animate==='function')list.animate([{opacity:.35,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.2,.7,.2,1)'});
  status.textContent=`${visible.length} ${visible.length===1?'round':'rounds'} shown${region?` for ${region.label.toLowerCase()}`:''}.`;
 }
 for(const region of regions){
  const button=node('button',undefined,`cell-map-region cell-map-region--${region.id}`);button.type='button';button.setAttribute('aria-controls',list.id);
  button.setAttribute('aria-label',`${region.label}, ${region.rounds.length} ${region.rounds.length===1?'round':'rounds'}`);
  button.append(node('span',region.label),node('span',region.rounds.length,'cell-map-count'));
  button.addEventListener('click',()=>select(region,true));buttons.set(region.id,button);controls.append(button);
 }
 all.setAttribute('aria-controls',list.id);all.addEventListener('click',()=>select(null,true));unfinished.addEventListener('change',()=>select(selected,true));
 const caption=node('p','Conceptual schematic. Processes can span several compartments; these are starting points for exploration, not exclusive cell locations.','cell-map-caption');
 stage.append(art,controls);diagram.append(stage,caption);headingRow.append(heading,all);panel.append(headingRow,description,filters,list,status);layout.append(diagram,panel);
 function update(items){
  progress=discoveryProgress(rounds,items);
  const hasProgress=progress.some(item=>item.done||item.pieces>0);filters.hidden=!hasProgress;
  if(!hasProgress)unfinished.checked=false;
  for(const region of regions){
   const button=buttons.get(region.id),count=region.rounds.filter(round=>progress.find(item=>item.round.number===round.number)?.done).length;
   button.querySelector('.cell-map-count').textContent=hasProgress?`${count}/${region.rounds.length}`:region.rounds.length;
   button.setAttribute('aria-label',`${region.label}, ${region.rounds.length} ${region.rounds.length===1?'round':'rounds'}${hasProgress?`, ${count} complete`:''}`);
  }
  select(selected);
 }
 host.classList.add('cell-map');host.replaceChildren(intro,layout);update(progressItems);return {update};
}

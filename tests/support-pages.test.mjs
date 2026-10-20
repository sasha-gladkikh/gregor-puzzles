import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {allRounds,rounds,findRound,searchText,saveKey} from '../game/rounds.mjs';
import * as collection from '../game/collection.mjs';
import * as collectionData from '../game/collection-data.mjs';
import * as journeys from '../game/journeys.mjs';
import {GENE_HINT_VERSION,geneHintText,newState,guess} from '../game/engine.mjs';
import {geneClueConnection,geneHintConnections} from '../game/gene-hints.mjs';
import {terminology} from '../game/teaching-data.mjs';

// Execute the actual page controllers with a small DOM, without browser,
// network, or shared saved progress. Browser QA covers layout separately.
function page(filename,{url='https://example.test/',saved=new Map()}={}){
 let document;
 const handlers=new Map(),windowHandlers=new Map(),definitionCalls=[];
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.className='';this.value='';this.hidden=false;this.open=false;this.parentElement=null;}
  set textContent(value){this.replaceChildren(String(value));}get textContent(){return this.children.map(child=>typeof child==='string'?child:child.textContent).join('');}
  append(...children){for(const child of children){if(child instanceof Element){child.parentElement?.remove(child);child.parentElement=this;}this.children.push(child);}}
  remove(child){this.children=this.children.filter(item=>item!==child);}
  after(element){const parent=this.parentElement;if(!parent)return;element.parentElement?.remove(element);element.parentElement=parent;parent.children.splice(parent.children.indexOf(this)+1,0,element);}
  replaceChildren(...children){for(const child of this.children)if(child instanceof Element)child.parentElement=null;this.children=[];this.append(...children);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name]??(name.startsWith('data-')?this.dataset[name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]??null:name==='href'?this.href??null:null);}
  removeAttribute(name){delete this.attributes[name];}
  get classList(){return {contains:name=>this.className.split(' ').includes(name),add:name=>{this.className+=` ${name}`;},toggle:(name,on)=>{const classes=new Set(this.className.split(' '));on?classes.add(name):classes.delete(name);this.className=[...classes].join(' ');}};}
  get isConnected(){return this===document.body||Boolean(this.parentElement?.isConnected);}
  contains(element){return element===this||this.children.some(child=>child instanceof Element&&child.contains(element));}
  matches(selector){
   if(selector.startsWith('#'))return this.id===selector.slice(1);
   if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));
   const attr=/^(\w+)?\[([\w-]+)(?:="([^"]*)")?\]$/.exec(selector);
   if(attr)return (!attr[1]||this.tagName===attr[1].toUpperCase())&&(attr[3]===undefined?this.getAttribute(attr[2])!==null:this.getAttribute(attr[2])===attr[3]);
   return this.tagName===selector.toUpperCase();
  }
  closest(selector){return this.matches(selector)?this:this.parentElement?.closest(selector)??null;}
  querySelectorAll(selector){
   const choices=selector.split(',').map(value=>value.trim().split(/\s+/));
   const matches=element=>choices.some(parts=>{if(!element.matches(parts.at(-1)))return false;let parent=element.parentElement;for(let i=parts.length-2;i>=0;i--){while(parent&&!parent.matches(parts[i]))parent=parent.parentElement;if(!parent)return false;parent=parent.parentElement;}return true;});
   return this.children.filter(child=>child instanceof Element).flatMap(child=>[...(matches(child)?[child]:[]),...child.querySelectorAll(selector)]);
  }
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
  addEventListener(type,callback){if(!handlers.has(this))handlers.set(this,new Map());const events=handlers.get(this);if(!events.has(type))events.set(type,[]);events.get(type).push(callback);}
  dispatch(type,event={}){for(const callback of handlers.get(this)?.get(type)??[])callback({button:0,target:this,preventDefault(){},...event});this[`on${type}`]?.(event);}
  dispatchEvent(event){this.dispatch(event.type,event);}
  focus(){document.activeElement=this;}scrollIntoView(){this.scrolled=true;}
 }
 document={body:new Element('body'),createElement:tag=>new Element(tag),createTextNode:text=>String(text),querySelector:selector=>document.body.querySelector(selector),querySelectorAll:selector=>document.body.querySelectorAll(selector),getElementById:id=>document.body.querySelector(`#${id}`),addEventListener(){}};
 document.activeElement=document.body;
 const node=(tag,text,className)=>{const element=new Element(tag);if(text)element.textContent=text;if(className)element.className=className;return element;};
 const add=(id,tag='div',parent=document.body,className='')=>{const element=node(tag,null,className);element.id=id;parent.append(element);return element;};
 if(filename==='science.mjs'){
  for(const id of ['scienceArticle','scienceIndex','scienceSearch','scienceChooser','scienceCurrentRound','clearScienceSearch','scienceCount','scienceEmpty'])add(id,id==='scienceSearch'?'input':id==='scienceChooser'?'details':'div');
  document.getElementById('scienceChooser').append(node('summary','Choose round'));
 }else if(filename==='collection-page.mjs'){
  const main=add('collectionMain'),intro=add('collectionIntro','header',main,'collection-intro');intro.append(node('a','Guide','collection-guide-link'));
  for(const id of ['collectionJourneys','collectionJourneyList','collectionSummary','roundCards','mapGroups','collectionConnection','gridView','mapView','processMap','storageNotice'])add(id,id==='collectionJourneys'?'details':/View$/.test(id)?'button':'div',main);
  for(const group of collectionData.processGroups){const anchor=node('a');anchor.href=`#process-${group.id}`;main.append(anchor);}
 }else if(filename==='field-guide.mjs'){
  const back=add('guideBack','div',document.body,'guide-back');back.append(node('a'));
  for(const id of ['guideSummary','guideStorageNotice','guideEmpty','printGuide','firstRound','guideEntries'])add(id);
 }else{
  add('reviewIntro','section',document.body,'review-intro');
  for(const id of ['reviewIndex','reviewRounds','reviewSearch','reviewCount','reviewEmpty','clearSearch','collapseProfiles'])add(id);
 }
 const location=new URL(url);
 const window={matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(type,fn){if(!windowHandlers.has(type))windowHandlers.set(type,[]);windowHandlers.get(type).push(fn);}};
 const referenceMarks=()=>node('span');
 const scientificFigure=()=>{const visual=node('section'),figure=node('figure',null,'science-figure');visual.append(figure,node('div','Notes'));return visual;};
 const scientificMechanisms=()=>{const root=node('section');root.append(node('button','Select model'));return root;};
 const scientificReferences=round=>{const section=node('section');section.id='references';const ref=node('li','Reference');ref.id=`ref-${round.number}-1`;section.append(ref);return section;};
 const context={console,URLSearchParams,Event,document,window,location,history:{pushState(_,__,href){location.href=new URL(href,location).href;}},localStorage:{getItem:key=>saved.get(key)??null},requestAnimationFrame:fn=>fn(),node,allRounds,rounds:filename==='review.mjs'?allRounds:rounds,playable:rounds,findRound,searchText,...collection,...collectionData,...journeys,renderSite(){},scientificFigure,scientificMechanisms,scientificReferences,clinicalDetails:()=>node('section'),scientificFamily:()=>node('section'),scientificInterpretation:()=>node('section'),scientificPrinciples:()=>node('section'),citation:(_,text)=>node('a',text),referenceMarks,referenceList:()=>node('ol'),artworkSrcset:()=>'',artworkMarkers:()=>node('div'),artworkAnnotations:()=>node('div'),mechanismFigure:()=>null,spliceCompare:()=>null,illustrationWalkthrough:()=>({element:node('div'),pause(){},close(){}}),createTermLens:()=>({close(){definitionCalls.push(['close']);},enhance(container){definitionCalls.push(['enhance',container]);}}),geneClueConnection,geneHintText,GENE_HINT_VERSION,terminology};
 const source=readFileSync(new URL(`../game/${filename}`,import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 vm.runInNewContext(source,context,{filename});
 return {document,location,saved,node,definitionCalls,emit(type,event={}){for(const fn of windowHandlers.get(type)??[])fn(event);}};
}

test('Science citation and fragment history retain notes, focus, and model state; round history opens the correct profile',()=>{
 const p=page('science.mjs',{url:'https://example.test/science.html?level=01'});
 const mount=p.document.getElementById('scienceArticle'),article=mount.children[0],notes=article.querySelector('.science-image-details'),model=article.querySelector('.science-model-details');
 notes.open=true;model.open=true;model.dataset.selection='after';notes.querySelector('summary').focus();
 p.location.hash='#ref-01-1';p.emit('popstate');p.emit('hashchange');
 assert.equal(mount.children[0],article);assert.equal(notes.open,true);assert.equal(model.open,true);assert.equal(model.dataset.selection,'after');assert.equal(p.document.activeElement,notes.querySelector('summary'));
 p.location.search='?level=02';p.location.hash='';p.emit('popstate');
 assert.notEqual(mount.children[0],article);assert.equal(mount.children[0].id,'round-02');
 p.location.search='?level=01';p.emit('popstate');assert.equal(mount.children[0].id,'round-01');
});

test('Collection restores map anchors on load and browser history, and the view buttons write shareable locations',()=>{
 const p=page('collection-page.mjs',{url:'https://example.test/collection.html#process-exchange'});
 const map=p.document.getElementById('processMap'),grid=p.document.getElementById('roundCards');
 assert.equal(map.hidden,false);assert.equal(grid.hidden,true);assert.equal(p.document.getElementById('mapView').getAttribute('aria-pressed'),'true');
 p.document.getElementById('gridView').dispatch('click');assert.equal(p.location.hash,'#roundCards');assert.equal(map.hidden,true);
 p.location.hash='#process-exchange';p.emit('popstate');assert.equal(map.hidden,false);
 p.location.hash='#roundCards';p.emit('hashchange');assert.equal(grid.hidden,false);
 p.document.getElementById('mapView').dispatch('click');assert.equal(p.location.hash,'#processMap');assert.equal(map.hidden,false);
 p.location.hash='#collectionJourneys';p.emit('hashchange');assert.equal(p.document.getElementById('collectionJourneys').open,true);
});

test('Collection ignores player and timer writes, but updates real progress without losing a focused round link',()=>{
 const p=page('collection-page.mjs'),cards=p.document.getElementById('roundCards'),card=cards.children[0],link=card.querySelector('a');
 link.focus();p.emit('storage',{key:'gregor-puzzles:player:profile'});assert.equal(cards.children[0],card);
 const state=newState();p.saved.set(saveKey(rounds[0]),JSON.stringify({state:{...state,seconds:55}}));p.emit('storage',{key:saveKey(rounds[0])});assert.equal(cards.children[0],card);
 state.placed=[0];p.saved.set(saveKey(rounds[0]),JSON.stringify({state}));p.emit('storage',{key:saveKey(rounds[0])});
 assert.notEqual(cards.children[0],card);assert.equal(p.document.activeElement,cards.children[0].querySelector('a'));assert.match(cards.textContent,/Continue · 1 \/ 12/);
});

test('Field guide keeps the current article on player writes and partial-round changes; completion adds its entry',()=>{
 const saved=new Map(),done=newState();guess(done,'CLCN1','CLCN1');saved.set(saveKey(rounds[0]),JSON.stringify({state:done}));
 const p=page('field-guide.mjs',{saved}),entries=p.document.getElementById('guideEntries'),first=entries.children[0],link=first.querySelector('a');link.focus();
 p.emit('storage',{key:'gregor-puzzles:player:profile'});assert.equal(entries.children[0],first);
 const partial=newState();partial.placed=[0];saved.set(saveKey(rounds[1]),JSON.stringify({state:partial}));p.emit('storage',{key:saveKey(rounds[1])});assert.equal(entries.children[0],first);
 guess(partial,rounds[1].gene,rounds[1].gene);saved.set(saveKey(rounds[1]),JSON.stringify({state:partial}));p.emit('storage',{key:saveKey(rounds[1])});
 assert.equal(entries.children.length,2);assert.equal(p.document.activeElement,entries.children[0].querySelector('a'));
 saved.clear();p.emit('storage',{key:null});assert.equal(entries.children.length,0);assert.equal(p.document.getElementById('guideEmpty').hidden,false);
});

test('Science and the completed field guide retain the same molecular teaching, with reachable guide references',()=>{
 const saved=new Map();for(const round of rounds){const state=newState();guess(state,round.gene,round.gene);saved.set(saveKey(round),JSON.stringify({state}));}
 const guide=page('field-guide.mjs',{saved});
 for(const round of allRounds){
  const science=page('science.mjs',{url:`https://example.test/science.html?level=${round.number}`}),facts=science.document.querySelector('.science-facts');
  assert.deepEqual(facts.querySelectorAll('dt').map(item=>item.textContent),['Normal role','Disease mechanism','Variant pattern','Inheritance']);
  assert.ok(facts.textContent.includes(round.inheritance));
  assert.ok(facts.textContent.includes(round.clinical.normalRole.text));
  for(const fact of [round.molecular.mechanism,round.molecular.variantType])assert.ok(facts.textContent.includes(fact.body),`${round.gene}: Science keeps the qualified molecular explanation`);
  const article=guide.document.getElementById(`round-${round.number}`);if(!article)continue;
  const molecular=article.querySelectorAll('.guide-variant');assert.equal(molecular.length,2);
  for(const [index,fact]of [round.molecular.mechanism,round.molecular.variantType].entries()){
   assert.ok(molecular[index].textContent.includes(fact.body));
   const marks=molecular[index].querySelectorAll('a');assert.ok(marks.length>0,`${round.gene}: molecular fact is sourced`);
   for(const mark of marks){const target=guide.document.getElementById(mark.href.slice(1));assert.ok(target,`${round.gene}: reference target exists`);assert.ok(fact.sourceUrl.includes(target.querySelector('a').href));}
  }
 }
});

test('Science definitions enhance the reading column, close before round replacement, and do not alter article identity on fragment history',()=>{
 const p=page('science.mjs',{url:'https://example.test/science.html?level=01'});
 assert.deepEqual(p.definitionCalls.map(([type])=>type),['close','enhance']);
 const first=p.definitionCalls[1][1];assert.equal(first.className,'science-content');
 p.location.hash='#references';p.emit('popstate');
 assert.equal(p.definitionCalls.length,2,'fragment changes preserve the active reading column');
 p.location.search='?level=02';p.location.hash='';p.emit('popstate');
 assert.deepEqual(p.definitionCalls.map(([type])=>type),['close','enhance','close','enhance']);
 assert.notEqual(p.definitionCalls[3][1],first);assert.equal(first.isConnected,false);
 p.emit('beforeprint');assert.equal(p.definitionCalls.at(-1)[0],'close');
});

test('Editorial review exposes exact compact notes, every hint step, memory text, and each shared definition once',()=>{
 const p=page('review.mjs'),cards=p.document.getElementById('reviewRounds').children;
 assert.equal(cards.length,allRounds.length);
 for(const [index,round]of allRounds.entries()){
  const text=cards[index].textContent;
  for(const note of round.illustration.landmarks){assert.ok(text.includes(note.playText));assert.ok(text.includes(note.playPreview));}
  assert.ok(text.includes(geneHintConnections[round.gene].biology));assert.ok(text.includes(geneHintConnections[round.gene].hint));assert.ok(text.includes(round.clinical.memory));
  for(const textPart of geneHintText({geneHintsSeen:3,geneHintVersion:GENE_HINT_VERSION},round).split('\n\n'))assert.ok(text.includes(textPart));
 }
 const glossary=p.document.getElementById('reviewGlossary');
 for(const term of terminology)assert.equal(glossary.textContent.split(term.definition).length-1,1,term.term);
});


test('Editorial hash navigation restores closed details and printing includes the glossary',()=>{
 const p=page('review.mjs'),glossary=p.document.getElementById('reviewGlossary');
 assert.equal(glossary.closest('.review-intro'),null,'glossary remains outside the non-printing intro');
 glossary.open=false;p.location.hash='#reviewGlossary';p.emit('hashchange');assert.equal(glossary.open,true);assert.equal(glossary.scrolled,true);
 glossary.open=false;p.emit('beforeprint');assert.equal(glossary.open,true);p.emit('afterprint');assert.equal(glossary.open,false);
 const card=p.document.getElementById('round-01'),panel=card.querySelector('.learning-panel'),target=p.node('li','Reference');target.id='ref-01-history';panel.append(target);panel.open=false;
 p.location.hash='#ref-01-history';p.emit('hashchange');assert.equal(panel.open,true);assert.equal(target.scrolled,true);
});

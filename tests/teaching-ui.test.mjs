import test from 'node:test';
import assert from 'node:assert/strict';
import {termSegments,connectionSegments,createTermLens} from '../game/teaching-ui.mjs';
import {allRounds} from '../game/rounds.mjs';
import {teachingConnections} from '../game/teaching-data.mjs';

test('definitions preserve the exact sentence and only match whole terms',()=>{
  const entries=[{id:'rna',term:'RNA',aliases:['ribonucleic acid'],definition:'A molecular message.'},{id:'messenger',term:'messenger RNA',aliases:[],definition:'A protein-making message.'}];
  const text='Messenger RNA carries information. Ribonucleic acid is RNA; RNAs stays unchanged.';
  const parts=termSegments(text,entries);
  assert.equal(parts.map(part=>part.text).join(''),text);
  assert.deepEqual(parts.filter(part=>part.entry).map(part=>[part.text,part.entry.id]),[['Messenger RNA','messenger'],['Ribonucleic acid','rna'],['RNA','rna']]);
});

test('interactive biological phrases retain wording and map to the authored structures for all rounds',()=>{
  for(const round of allRounds){
    const text=round.clinical.completionConnection,connections=teachingConnections[round.number];
    const parts=connectionSegments(text,connections);
    assert.equal(parts.map(part=>part.text).join(''),text);
    assert.deepEqual(parts.filter(part=>part.landmark!==undefined).map(part=>({label:part.text,landmark:part.landmark})),connections.toSorted((a,b)=>text.indexOf(a.label)-text.indexOf(b.label)));
    assert.equal(termSegments(text).map(part=>part.text).join(''),text);
  }
});

test('unknown phrases stay readable when no highlight applies',()=>{
  assert.deepEqual(connectionSegments('A clear explanation.',[]),[{text:'A clear explanation.'}]);
  assert.deepEqual(connectionSegments('A clear explanation.',[{label:'channel',landmark:0}]),[{text:'A clear explanation.'}]);
});

// A small focus-aware DOM exercises the real lens controller. The browser pass
// checks the native first Tab into the dialog; these tests cover its exit paths.
function lensFixture(t){
  const previous=new Map(['document','window','NodeFilter','innerWidth','innerHeight'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  class Target{
    listeners=new Map();
    addEventListener(type,callback,{signal}={}){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push({callback,signal});}
    dispatch(type,values={}){const event={target:this,prevented:false,preventDefault(){this.prevented=true;},stopPropagation(){},...values};for(const {callback,signal}of this.listeners.get(type)??[])if(!signal?.aborted)callback(event);return event;}
  }
  class Element extends Target{
    constructor(tag){super();this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.style={};this.className='';this.tabIndex=['BUTTON','A','INPUT'].includes(this.tagName)?0:-1;}
    append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
    set textContent(value){this.children=[];this.append(new Text(String(value)));}get textContent(){return this.children.map(child=>child.textContent).join('');}
    setAttribute(name,value){this.attributes[name]=String(value);}getAttribute(name){return this.attributes[name]??(name==='data-term-id'?this.dataset.termId:null)??null;}removeAttribute(name){delete this.attributes[name];}
    contains(target){return target===this||this.children.some(child=>child.contains?.(target));}
    get isConnected(){return this===document.body||Boolean(this.parentElement?.isConnected);}
    remove(){if(!this.parentElement)return;const focused=this.contains(document.activeElement);this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;if(focused)document.activeElement=document.body;}
    matches(selector){
      if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));
      const match=/^(\w+)?\[([\w-]+)\]$/.exec(selector);
      if(match)return (!match[1]||this.tagName===match[1].toUpperCase())&&this.getAttribute(match[2])!==null;
      return this.tagName===selector.toUpperCase();
    }
    closest(selector){return selector.split(',').some(item=>this.matches(item.trim()))?this:this.parentElement?.closest(selector)??null;}
    querySelectorAll(selector){return this.children.flatMap(child=>child instanceof Element?[...(selector.split(',').some(item=>child.matches(item.trim()))?[child]:[]),...child.querySelectorAll(selector)]:[]);}
    focus(){document.activeElement=this;document.dispatch('focusin',{target:this});}
    getClientRects(){return this.isConnected&&!this.hidden?[{}]:[];}
    getBoundingClientRect(){return {left:100,bottom:150,width:320,height:160};}
  }
  class Text{
    constructor(text){this.textContent=text;}
    replaceWith(fragment){const siblings=this.parentElement.children,index=siblings.indexOf(this);for(const child of fragment.children)child.parentElement=this.parentElement;siblings.splice(index,1,...fragment.children);this.parentElement=null;}
  }
  const document=new Target(),window=new Target();document.body=new Element('body');document.activeElement=document.body;
  document.createElement=tag=>new Element(tag);document.createTextNode=text=>new Text(text);document.createDocumentFragment=()=>new Element('fragment');
  document.querySelectorAll=selector=>document.body.querySelectorAll(selector);
  document.createTreeWalker=container=>{const collect=element=>element.children.flatMap(child=>child instanceof Text?[child]:collect(child)),texts=collect(container);let i=0;return {nextNode(){this.currentNode=texts[i++];return Boolean(this.currentNode);}};};
  Object.assign(globalThis,{document,window,NodeFilter:{SHOW_TEXT:4},innerWidth:1000,innerHeight:800});
  t.after(()=>{for(const [key,descriptor]of previous)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
  const add=(tag,text='',parent=document.body,className='')=>{const element=new Element(tag);element.className=className;if(text)element.textContent=text;parent.append(element);return element;};
  const paragraph=add('p','Loss of function can alter a gene product.'),next=add('button','Continue reading');
  const lens=createTermLens();t.after(()=>lens.destroy());lens.enhance(paragraph);
  const origin=paragraph.querySelectorAll('button')[0];
  return {document,window,lens,origin,next,add,open(){origin.dispatch('click');return document.body.querySelectorAll('.term-lens')[0];}};
}

test('definition keyboard exits continue after the source term, not at the document end',t=>{
  const f=lensFixture(t),panel=f.open(),dismiss=panel.querySelectorAll('button')[0];
  assert.equal(f.document.activeElement,panel);
  assert.equal(panel.dispatch('keydown',{key:'Tab'}).prevented,false,'first Tab can reach Close definition');
  dismiss.focus();assert.equal(panel.dispatch('keydown',{key:'Tab',target:dismiss}).prevented,true);
  assert.equal(f.document.activeElement,f.next);assert.equal(panel.isConnected,false);
  assert.equal(f.origin.getAttribute('aria-expanded'),'false');assert.equal(f.origin.getAttribute('aria-describedby'),null);
  const reopened=f.open();reopened.dispatch('keydown',{key:'Tab',shiftKey:true});
  assert.equal(f.document.activeElement,f.origin);assert.equal(reopened.isConnected,false);
});

test('definitions restore reading position on Escape or viewport change without stealing outside focus',t=>{
  const f=lensFixture(t);let panel=f.open();
  f.document.dispatch('keydown',{key:'Escape'});assert.equal(f.document.activeElement,f.origin);assert.equal(panel.isConnected,false);
  panel=f.open();f.window.dispatch('scroll');assert.equal(f.document.activeElement,f.origin);assert.equal(panel.isConnected,false);
  panel=f.open();f.window.dispatch('resize');assert.equal(f.document.activeElement,f.origin);assert.equal(panel.isConnected,false);
  panel=f.open();f.next.focus();assert.equal(f.document.activeElement,f.next);assert.equal(panel.isConnected,false);
  panel=f.open();panel.querySelectorAll('button')[0].dispatch('click');assert.equal(f.document.activeElement,f.origin);assert.equal(panel.isConnected,false);
});

test('definitions leave headings, citations, HPO links, and existing controls unchanged',t=>{
  const f=lensFixture(t),article=f.add('article');
  for(const [tag,className]of [['h5',''],['a',''],['p','reference-list'],['p','science-hpo'],['div','figure-print-notes'],['button','']]){
    const element=f.add(tag,'Hypotonia and ataxia',article,className);f.lens.enhance(element);
    assert.equal(element.querySelectorAll('button').length,0,`${tag} ${className}: no nested definition control`);
  }
  const prose=f.add('p','Hypotonia and ataxia can occur. Hypotonia varies.',article);f.lens.enhance(prose);
  assert.equal(prose.querySelectorAll('button').length,2);assert.equal(prose.textContent,'Hypotonia and ataxia can occur. Hypotonia varies.');
  f.lens.enhance(prose);assert.equal(prose.querySelectorAll('button').length,2,'repeated enhancement keeps one definition per term');
});

test('DEE vocabulary describes both developmental contributions without matching DEE42',()=>{
  const parts=termSegments('Developmental and epileptic encephalopathy (DEE) differs from a gene–condition identifier such as DEE42.');
  const definitions=parts.filter(part=>part.entry);assert.equal(definitions.length,2);
  for(const part of definitions){assert.equal(part.entry.id,'developmental-and-epileptic-encephalopathy');assert.match(part.entry.definition,/underlying disorder and epileptic activity/);assert.match(part.entry.sources[0],/ilae\.org/);}
});

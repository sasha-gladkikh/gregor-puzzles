import test from 'node:test';
import assert from 'node:assert/strict';
import {createFigureView} from '../game/figure-view.mjs';

// This harness models node movement, dialog events, and animation scheduling.
// The same board/playback identities must survive every transition.
function setup({state='ready',showError=null}={}){
  class Events{
    constructor(){this.listeners=new Map();}
    addEventListener(type,listener){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(listener);}
    removeEventListener(type,listener){this.listeners.get(type)?.delete(listener);}
    dispatch(type){const event={type,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};for(const listener of [...this.listeners.get(type)??[]])listener(event);return event;}
    count(type){return this.listeners.get(type)?.size??0;}
  }
  class Element extends Events{
    constructor(tag){super();this.tag=tag;this.ownerDocument=document;this.parentNode=null;this.childNodes=[];this.attributes=new Map();this.style={};this.offsetHeight=438;this.focusCalls=[];}
    setAttribute(name,value){this.attributes.set(name,String(value));}
    detach(){if(this.parentNode){this.parentNode.childNodes=this.parentNode.childNodes.filter(node=>node!==this);this.parentNode=null;}}
    append(...nodes){for(const node of nodes){node.detach();node.parentNode=this;this.childNodes.push(node);}}
    before(node){node.detach();const parent=this.parentNode;assert.ok(parent,'The original position must remain attached');node.parentNode=parent;parent.childNodes.splice(parent.childNodes.indexOf(this),0,node);}
    replaceWith(node){node.detach();const parent=this.parentNode;assert.ok(parent,'A placeholder must still have its parent');node.parentNode=parent;parent.childNodes.splice(parent.childNodes.indexOf(this),1,node);this.parentNode=null;}
    focus(options){this.focusCalls.push(options);document.activeElement=this;}
  }
  const document=new Events();document.hidden=false;document.createElement=tag=>new Element(tag);document.createComment=text=>{const node=new Element('#comment');node.textContent=text;return node;};
  const assembly=new Element('section'),before=new Element('h2'),frame=new Element('frame'),after=new Element('aside');assembly.append(before,frame,after);
  const tools=new Element('div'),toolBefore=new Element('button'),playback=new Element('playback'),toolAfter=new Element('button');tools.append(toolBefore,playback,toolAfter);
  const dialog=new Element('dialog'),stageHost=new Element('stage-host'),controlsHost=new Element('controls-host');dialog.append(stageHost,controlsHost);dialog.open=false;
  dialog.showModal=()=>{if(showError)throw showError;dialog.open=true;};
  dialog.close=()=>{if(!dialog.open)return;dialog.open=false;dialog.dispatch('close');};
  dialog.escape=()=>{if(!dialog.dispatch('cancel').defaultPrevented)dialog.close();};
  const focusTarget=new Element('button'),pending=new Map(),cancelled=[];let id=0,opens=0;
  const motion={element:{dataset:{state}},plays:0,pauses:0,play(){this.plays++;this.element.dataset.state='playing';},pause(){this.pauses++;if(this.element.dataset.state==='playing')this.element.dataset.state='paused';}};
  const request=callback=>{pending.set(++id,callback);return id;},cancel=key=>{cancelled.push(key);pending.delete(key);};
  const nextFrame=()=>{const callbacks=[...pending.values()];pending.clear();callbacks.forEach(callback=>callback());};
  const view=createFigureView({dialog,frame,playback,stageHost,controlsHost,motion:()=>motion,onOpen:()=>opens++,focusTarget,request,cancel});
  const assertRestored=()=>{
    assert.deepEqual(assembly.childNodes,[before,frame,after]);
    assert.deepEqual(tools.childNodes,[toolBefore,playback,toolAfter]);
    assert.deepEqual(stageHost.childNodes,[]);assert.deepEqual(controlsHost.childNodes,[]);
  };
  return {view,document,dialog,assembly,tools,frame,playback,stageHost,controlsHost,focusTarget,motion,pending,cancelled,nextFrame,assertRestored,get opens(){return opens;}};
}

test('enlargement moves the original board and controls, reserves its layout height, and restores their exact positions',()=>{
  const h=setup();h.view.open();
  assert.equal(h.dialog.open,true);assert.deepEqual(h.stageHost.childNodes,[h.frame]);assert.deepEqual(h.controlsHost.childNodes,[h.playback]);
  const placeholder=h.assembly.childNodes[1],controlPlaceholder=h.tools.childNodes[1];
  assert.equal(placeholder.className,'board-frame figure-placeholder');assert.equal(placeholder.style.height,'438px');assert.equal(placeholder.attributes.get('aria-hidden'),'true');assert.equal(controlPlaceholder.tag,'#comment');
  h.view.open();assert.equal(h.opens,1,'Opening an already open view does not create more placeholders');
  h.view.close();h.assertRestored();assert.equal(placeholder.parentNode,null);assert.equal(controlPlaceholder.parentNode,null);
  assert.equal(h.document.activeElement,h.focusTarget);assert.deepEqual(h.focusTarget.focusCalls,[{preventScroll:true}]);
  h.view.dispose();
});

test('an already playing illustration resumes once after the modal opens and pauses when it closes',()=>{
  const h=setup({state:'playing'});h.view.open();
  assert.equal(h.motion.element.dataset.state,'paused');assert.equal(h.motion.plays,0);assert.equal(h.pending.size,1);
  h.nextFrame();assert.equal(h.motion.plays,1);assert.equal(h.motion.element.dataset.state,'playing');assert.equal(h.pending.size,0);
  h.nextFrame();assert.equal(h.motion.plays,1);
  h.view.close();assert.equal(h.motion.element.dataset.state,'paused');h.assertRestored();
  h.view.dispose();
});

test('paused and restored-ready illustrations remain still when enlarged',()=>{
  for(const state of ['paused','ready']){
    const h=setup({state});h.view.open();h.nextFrame();
    assert.equal(h.pending.size,0,state);assert.equal(h.motion.plays,0,state);assert.equal(h.motion.element.dataset.state,state);
    h.view.close();h.assertRestored();h.view.dispose();
  }
});

test('Escape restores the board and cancels an arrival frame that has not run',()=>{
  const h=setup({state:'playing'});h.view.open();assert.equal(h.pending.size,1);
  h.dialog.escape();assert.equal(h.dialog.open,false);assert.equal(h.pending.size,0);assert.equal(h.cancelled.length,1);
  h.nextFrame();assert.equal(h.motion.plays,0);h.assertRestored();assert.equal(h.focusTarget.focusCalls.length,1);
  h.view.dispose();
});

test('closing before the next frame prevents stale playback and tolerates repeated close calls',()=>{
  const h=setup({state:'playing'});h.view.open();const pending=[...h.pending.values()][0];
  h.view.close();h.view.close();h.nextFrame();pending();
  assert.equal(h.motion.plays,0);assert.equal(h.pending.size,0);assert.equal(h.focusTarget.focusCalls.length,1);h.assertRestored();
  h.view.dispose();
});

test('hiding the page cancels pending resume and does not restart it when the page becomes visible',()=>{
  const h=setup({state:'playing'});h.view.open();
  h.document.hidden=true;h.document.dispatch('visibilitychange');assert.equal(h.pending.size,0);
  h.nextFrame();assert.equal(h.motion.plays,0);assert.equal(h.motion.element.dataset.state,'paused');
  h.document.hidden=false;h.document.dispatch('visibilitychange');h.nextFrame();assert.equal(h.motion.plays,0);
  h.view.close();h.assertRestored();h.view.dispose();
});

test('the resume callback rechecks visibility even before a visibility event is delivered',()=>{
  const h=setup({state:'playing'});h.view.open();h.document.hidden=true;
  h.nextFrame();assert.equal(h.motion.plays,0);assert.equal(h.pending.size,0);
  h.view.close();h.assertRestored();h.view.dispose();
});

test('a modal opening failure restores moved content, focus, and pending work before propagating its error',()=>{
  const error=new Error('Modal cannot open'),h=setup({state:'playing',showError:error});
  assert.throws(()=>h.view.open(),value=>value===error);
  assert.equal(h.dialog.open,false);assert.equal(h.pending.size,0);assert.equal(h.motion.plays,0);h.assertRestored();assert.equal(h.document.activeElement,h.focusTarget);
  h.view.dispose();
});

test('disposal restores an open view and removes its close and visibility listeners',()=>{
  const h=setup({state:'playing'});h.view.open();
  assert.equal(h.document.count('visibilitychange'),1);assert.equal(h.dialog.count('close'),1);
  h.view.dispose();h.assertRestored();assert.equal(h.dialog.open,false);assert.equal(h.pending.size,0);
  assert.equal(h.document.count('visibilitychange'),0);assert.equal(h.dialog.count('close'),0);
  const pauses=h.motion.pauses;h.document.hidden=true;h.document.dispatch('visibilitychange');assert.equal(h.motion.pauses,pauses);
  h.view.open();assert.equal(h.dialog.open,false);assert.equal(h.opens,1);assert.equal(h.pending.size,0);h.assertRestored();
  h.view.dispose();assert.equal(h.motion.pauses,pauses,'Repeated disposal does not touch playback again');
});

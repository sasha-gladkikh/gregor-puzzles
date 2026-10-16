import test from 'node:test';
import assert from 'node:assert/strict';
import {fittedRect,pieceFlightGeometry,pieceFlightFrames,createPieceMotion,PLACEMENT_DURATION} from '../game/piece-motion.mjs';
import {soundFeedback} from '../game/experience.mjs';

const rect=(left,top,width,height)=>({left,top,width,height});
const dimensions={COLS:4,W:800,H:600,CW:200,CH:200,pad:58};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const events=()=>{
  const listeners=new Map();
  return {addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);},dispatch(type,event={}){return Promise.all([...listeners.get(type)??[]].map(fn=>fn(event)));}};
};

test('tray letterboxing is removed before the flight and the last frame meets the exact board coordinates',()=>{
  const geometry=pieceFlightGeometry(5,rect(100,300,90,66),rect(200,100,800,600),dimensions);
  assert.deepEqual(geometry.from,rect(112,300,66,66));
  assert.deepEqual(geometry.target,rect(342,242,316,316));
  assert.equal(geometry.dx,355);assert.equal(geometry.dy,67);assert.equal(geometry.scale,316/66);
  const frames=pieceFlightFrames(geometry);
  assert.match(frames[0].transform,/translate\(0px,0px\) scale\(1\)/);
  assert.match(frames.at(-1).transform,/translate\(355px,67px\)/);
  assert.ok(frames[8].transform.includes(`translate(177.5px,${33.5-Math.min(24,Math.hypot(355,67)*.045)}px)`));
});

test('letterboxed boards and tiny tray slots share one consistent SVG scale',()=>{
  const geometry=pieceFlightGeometry(11,rect(0,0,48,70),rect(100,40,800,800),dimensions);
  assert.deepEqual(geometry.from,rect(0,11,48,48));
  assert.deepEqual(geometry.target,rect(642,482,316,316));
  assert.equal(fittedRect(rect(0,0,0,50),200,200),null);
  assert.equal(pieceFlightGeometry(12,rect(0,0,50,50),rect(0,0,800,600),dimensions),null);
});

async function motionHarness(run){
  const saved=new Map(['window','document'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const animations=[],observers=[];
  class Element{
    constructor(tag,bounds=rect(0,0,1,1)){this.tag=tag;this.bounds=bounds;this.children=[];this.attributes={};this.style={opacity:''};this.isConnected=true;}
    setAttribute(name,value){this.attributes[name]=value;}
    append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
    remove(){this.isConnected=false;if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);}
    contains(target){return this===target||this.children.some(child=>child.contains(target));}
    getBoundingClientRect(){return {...this.bounds};}
    animate(frames,options){const pending=deferred();const animation={frames,options,element:this,finished:pending.promise,finish:pending.resolve,canceled:false,cancel(){this.canceled=true;pending.reject(new Error('cancelled'));}};animations.push(animation);return animation;}
  }
  const media={...events(),matches:false},body=new Element('body'),board=new Element('svg',rect(200,100,800,600));
  const targets=new Map([0,1,5].map(id=>[id,new Element('g')]));board.append(...targets.values());body.append(board);
  board.querySelector=selector=>targets.get(Number(selector.match(/data-slot="(\d+)"/)?.[1]))??null;
  const document={...events(),body,hidden:false,dialog:false,querySelector(){return this.dialog?{}:null;},createElementNS:(_ns,tag)=>new Element(tag)};
  const window={...events(),innerHeight:900,visualViewport:events(),matchMedia:()=>media,MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}};
  board.ownerDocument=document;document.defaultView=window;globalThis.document=document;globalThis.window=window;
  const make=(extra={})=>createPieceMotion({board,makePiece:()=>new Element('g'),pathFor:id=>`path-${id}`,...dimensions,...extra});
  try{await run({make,body,board,targets,document,window,media,animations,observers});}
  finally{for(const [key,descriptor] of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}

test('contact restores the exact piece and resolves before its jigsaw outline trace finishes',()=>motionHarness(async({make,body,board,targets,animations})=>{
  const motion=make(),contact=motion.place(5,rect(100,300,90,66));
  assert.equal(targets.get(5).style.opacity,'0');assert.equal(body.children.length,2);
  assert.equal(animations[0].options.duration,PLACEMENT_DURATION);
  assert.equal(animations[0].element.style.left,'112px');assert.equal(animations[0].element.style.width,'66px');
  animations[0].finish();assert.deepEqual(await contact,{cancelled:false});
  assert.equal(targets.get(5).style.opacity,'');assert.equal(body.children.length,1);
  assert.equal(board.children.at(-1).attributes.d,'path-5');assert.equal(animations.length,2);
  motion.clear();assert.equal(board.children.length,3);assert.ok(animations[1].canceled);motion.dispose();
}));

test('scroll cancellation restores every hidden target and removes all decorative layers',()=>motionHarness(async({make,body,board,targets,window,animations})=>{
  let cancelled=0;const motion=make({onCancel:()=>cancelled++});
  const first=motion.place(0,rect(40,100,80,64)),second=motion.place(1,rect(150,100,80,64));
  await window.dispatch('scroll');
  assert.deepEqual(await first,{cancelled:true});assert.deepEqual(await second,{cancelled:true});
  assert.equal(targets.get(0).style.opacity,'');assert.equal(targets.get(1).style.opacity,'');
  assert.equal(body.children.length,1);assert.equal(board.children.length,3);assert.ok(animations.every(animation=>animation.canceled));assert.equal(cancelled,1);motion.dispose();
}));

test('a queued completion from an old flight cannot uncover or remove its replacement',()=>motionHarness(async({make,body,targets,animations})=>{
  const motion=make(),first=motion.place(0,rect(30,300,70,80));
  animations[0].finish();motion.clear();
  const next=motion.place(0,rect(30,300,70,80));
  await Promise.resolve();assert.deepEqual(await first,{cancelled:true});
  assert.equal(body.children.length,2);assert.equal(targets.get(0).style.opacity,'0');
  motion.dispose();assert.deepEqual(await next,{cancelled:true});
}));

test('hidden pages, open dialogs and preference changes cancel pending flights immediately',()=>motionHarness(async({make,document,media,targets,body})=>{
  const motion=make();
  let contact=motion.place(0,rect(0,100,60,60));document.hidden=true;await document.dispatch('visibilitychange');assert.deepEqual(await contact,{cancelled:true});
  document.hidden=false;contact=motion.place(0,rect(0,100,60,60));await document.dispatch('beforetoggle',{target:{tagName:'DIALOG'},newState:'open'});assert.deepEqual(await contact,{cancelled:true});
  contact=motion.place(0,rect(0,100,60,60));media.matches=true;await media.dispatch('change');assert.deepEqual(await contact,{cancelled:true});
  assert.deepEqual(await motion.place(0,rect(0,100,60,60)),{cancelled:false});assert.equal(body.children.length,1);assert.equal(targets.get(0).style.opacity,'');motion.dispose();
}));

test('replacing board content cancels the old flight without touching the new board',()=>motionHarness(async({make,targets,board,body,observers})=>{
  const motion=make(),contact=motion.place(0,rect(0,100,60,60));
  const old=targets.get(0);old.remove();observers[0].callback();
  assert.deepEqual(await contact,{cancelled:true});assert.equal(old.style.opacity,'');assert.equal(body.children.length,1);assert.equal(board.children.length,2);motion.dispose();
}));

test('an offscreen source uses an immediate contact without creating a flying duplicate',()=>motionHarness(async({make,body,animations})=>{
  const motion=make();assert.deepEqual(await motion.place(0,rect(0,1000,60,60)),{cancelled:false});
  assert.equal(body.children.length,1);assert.equal(animations.length,1);assert.equal(animations[0].element.tag,'path');motion.dispose();
}));

async function soundHarness(run,{muted=false,suspended=false}={}){
  const saved=new Map(['window','document','localStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const oscillators=[],gains=[],resumes=[],contexts=[];let stored=muted?'off':null;
  const automation=()=>({values:[],setValueAtTime(value,at){this.values.push({value,at});},linearRampToValueAtTime(value,at){this.values.push({value,at});},exponentialRampToValueAtTime(value,at){this.values.push({value,at});}});
  class AudioContext{
    constructor(){this.state=suspended?'suspended':'running';this.currentTime=10;this.destination={};contexts.push(this);}
    resume(){const pending=deferred();resumes.push(()=>{this.state='running';pending.resolve();});return pending.promise;}
    suspend(){this.state='suspended';return Promise.resolve();}
    createOscillator(){const oscillator={frequency:automation(),connect(){},disconnect(){this.disconnected=true;},start(at){this.started=at;},stop(at){this.stopped=at??'now';}};oscillators.push(oscillator);return oscillator;}
    createGain(){const gain={gain:automation(),connect(){},disconnect(){this.disconnected=true;}};gains.push(gain);return gain;}
  }
  const label={textContent:''},button={...events(),attributes:{},setAttribute(key,value){this.attributes[key]=value;},querySelector:()=>label};
  const document={...events(),hidden:false},window={AudioContext,navigator:{userActivation:{isActive:true}}};
  globalThis.document=document;globalThis.window=window;globalThis.localStorage={getItem:()=>stored,setItem:(_key,value)=>{stored=value;}};
  try{await run({sound:soundFeedback(button),button,document,window,oscillators,gains,resumes,contexts,get stored(){return stored;}});}
  finally{for(const [key,descriptor] of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}

test('sound preparation stays silent and delayed contact voices can be cancelled before they start',()=>soundHarness(async({sound,oscillators,gains})=>{
  assert.equal(await sound.prepare(),true);assert.equal(oscillators.length,0);
  await sound.play('place',{progress:.5,delay:340});assert.equal(oscillators.length,2);
  assert.equal(oscillators[0].started,10.34);assert.equal(oscillators[0].frequency.values[0].value,444);
  sound.stop();assert.ok(oscillators.every(voice=>voice.stopped==='now'&&voice.disconnected));assert.ok(gains.every(gain=>gain.disconnected));
}));

test('reset invalidates an asynchronous audio resume before it can resurrect feedback',()=>soundHarness(async({sound,oscillators,resumes})=>{
  const pending=sound.play();sound.stop();resumes.shift()();await pending;assert.equal(oscillators.length,0);
},{suspended:true}));

test('muting during audio resume prevents stale feedback and preserves the preference',()=>soundHarness(async state=>{
  const pending=state.sound.play();await state.button.dispatch('click');
  state.resumes.shift()();await pending;
  assert.equal(state.oscillators.length,0);assert.equal(state.stored,'off');assert.equal(state.button.attributes['aria-pressed'],'false');
},{suspended:true}));

test('hidden-page cancellation prevents a late audio resume from playing',()=>soundHarness(async({sound,document,resumes,oscillators})=>{
  const pending=sound.play('complete');document.hidden=true;await document.dispatch('visibilitychange');resumes.shift()();await pending;assert.equal(oscillators.length,0);
},{suspended:true}));

test('muted preference and lack of a gesture cannot create an audio context',()=>soundHarness(async({sound,contexts,button})=>{
  assert.equal(await sound.prepare(),false);await sound.play();assert.equal(contexts.length,0);assert.equal(button.attributes['aria-pressed'],'false');
},{muted:true}));

test('completion uses a quiet staggered resolution and foreground gesture is required to unlock audio',()=>soundHarness(async({sound,window,contexts,oscillators,gains})=>{
  window.navigator.userActivation.isActive=false;assert.equal(await sound.prepare(),false);assert.equal(contexts.length,0);
  window.navigator.userActivation.isActive=true;await sound.prepare();window.navigator.userActivation.isActive=false;
  await sound.play('complete');assert.equal(oscillators.length,4);
  assert.deepEqual(oscillators.map(voice=>voice.frequency.values[0].value),[392,493.88,587.33,783.99]);
  assert.ok(oscillators.every((voice,index)=>!index||voice.started>oscillators[index-1].started));
  assert.ok(gains.every(gain=>gain.gain.values.every(point=>point.value<=.015)));sound.stop();
}));

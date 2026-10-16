import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiscoveryQueue,discoveryGeometry,discoveryMotion} from '../game/discovery-motion.mjs';

const clue={kind:'clue',at:2,label:'Location',title:'A membrane channel',body:'A channel spans the membrane.'};
const note={kind:'landmark',index:0,title:'Membrane',text:'A boundary around the cell.'};
function setup(options={}){
  let id=0;const timers=new Map(),shown=[];let empty=0;
  const queue=createDiscoveryQueue({onShow:item=>shown.push(item),onEmpty:()=>empty++,schedule:callback=>{timers.set(++id,callback);return id;},cancel:key=>timers.delete(key),...options});
  const advance=()=>{const pending=[...timers.values()];timers.clear();pending.forEach(callback=>callback());};
  return {queue,timers,shown,advance,get empty(){return empty;}};
}

test('quick placements drain automatically, preserving discovery order without acknowledgement',()=>{
  const state=setup(),{queue,shown,timers,advance}=state;
  queue.push([clue]);queue.push([note]);
  assert.equal(queue.current,clue);assert.deepEqual(shown,[clue]);assert.equal(queue.size,2);assert.equal(timers.size,1);
  advance();assert.equal(queue.current,note);assert.deepEqual(shown,[clue,note]);assert.equal(timers.size,1);
  advance();assert.equal(queue.current,null);assert.equal(queue.size,0);assert.equal(timers.size,0);assert.equal(state.empty,1);
});

test('repeated renders cannot duplicate a discovery during or after its flight',()=>{
  const {queue,shown,advance}=setup();
  queue.push([clue,note,clue]);assert.equal(queue.size,2);
  advance();queue.push([{...clue},note]);assert.equal(queue.size,1);
  advance();queue.push([clue,note]);assert.equal(queue.size,0);assert.deepEqual(shown,[clue,note]);
});

test('clearing cancels flights and permits the same discoveries in a new round',()=>{
  const {queue,timers,shown,advance}=setup();
  queue.push([clue,note]);queue.clear();assert.equal(queue.size,0);assert.equal(timers.size,0);
  advance();assert.deepEqual(shown,[clue]);queue.push([clue]);assert.equal(queue.current,clue);assert.equal(timers.size,1);assert.equal(shown.length,2);
});

test('a stale timer callback cannot advance a new round after clear',()=>{
  const {queue,timers,shown,advance}=setup();queue.push([clue,note]);
  const stale=[...timers.values()][0];queue.clear();queue.push([note,clue]);
  stale();assert.equal(queue.current,note);assert.equal(queue.size,2);assert.equal(timers.size,1);assert.deepEqual(shown,[clue,note]);
  advance();assert.equal(queue.current,clue);
});

test('reduced motion or an inactive page skips decorative flights without retaining a queue',()=>{
  let enabled=false;const {queue,timers,shown,advance}=setup({enabled:()=>enabled});
  queue.push([clue,note]);assert.equal(queue.size,0);assert.equal(timers.size,0);assert.deepEqual(shown,[]);
  enabled=true;queue.push([clue,note]);assert.equal(queue.size,2);enabled=false;advance();
  assert.equal(queue.size,0);assert.equal(timers.size,0);assert.deepEqual(shown,[clue]);
  enabled=true;queue.push([note]);assert.equal(queue.current,note);
});

test('synchronous cancellation while resolving a target leaves no scheduled callback',()=>{
  let queue;const timers=new Map();
  queue=createDiscoveryQueue({onShow:()=>queue.clear(),schedule:callback=>{timers.set(1,callback);return 1;},cancel:key=>timers.delete(key)});
  queue.push([clue,note]);assert.equal(queue.size,0);assert.equal(timers.size,0);
});


test('one placement connects all fresh discoveries together without duplicating destinations in later batches',()=>{
  const batches=[];const {queue,advance}=setup({batch:true,onShow:(_first,items)=>batches.push(items)});
  const later={kind:'clue',at:4,label:'Function'};
  queue.push([clue,note,clue]);queue.push([note,later]);
  assert.equal(queue.size,3);assert.deepEqual(batches,[[clue,note]]);
  advance();assert.equal(queue.size,1);assert.deepEqual(batches,[[clue,note],[later]]);
  advance();assert.equal(queue.size,0);
});

test('clearing a batch cancels every queued discovery and ignores its stale callback',()=>{
  const batches=[];const {queue,timers}=setup({batch:true,onShow:(_first,items)=>batches.push(items)});
  queue.push([clue,note]);const stale=[...timers.values()][0];
  queue.clear();queue.push([note]);stale();
  assert.equal(queue.current,note);assert.equal(queue.size,1);assert.equal(timers.size,1);
  assert.deepEqual(batches,[[clue,note],[note]]);
});

const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
const near=(actual,expected,tolerance=.01)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} differs from ${expected}`);

test('desktop connection lands on the actual row badge and follows a smooth arc at even spatial intervals',()=>{
  const geometry=discoveryGeometry({origin:{x:390,y:420},destination:rect(850,290,300,125),view:{left:0,top:0,width:1280,height:800},targetPoint:{x:870,y:311}});
  assert.ok(geometry);assert.deepEqual(geometry.start,{x:390,y:420});assert.deepEqual(geometry.end,{x:870,y:311});
  near(geometry.samples[0].x,390);near(geometry.samples[0].y,420);
  near(geometry.samples.at(-1).x,870);near(geometry.samples.at(-1).y,311);
  const intervals=geometry.samples.slice(1).map((p,i)=>Math.hypot(p.x-geometry.samples[i].x,p.y-geometry.samples[i].y));
  assert.ok(Math.max(...intervals)/Math.min(...intervals)<1.01,'native animation should not speed up at uneven curve segments');
  assert.ok(geometry.length>=Math.hypot(480,-109));assert.match(geometry.path,/^M .* C /);
});

test('phone and offset visual viewports keep both the curve and landing wash inside visible bounds',()=>{
  for(const view of [{left:0,top:0,width:375,height:667},{left:110,top:85,width:300,height:500}]){
    const geometry=discoveryGeometry({origin:{x:view.left+view.width-4,y:view.top+130},destination:rect(view.left-10,view.top+view.height-47,view.width+30,110),view});
    assert.ok(geometry);
    for(const p of [geometry.start,geometry.c1,geometry.c2,geometry.end,...geometry.samples]){
      assert.ok(p.x>=8&&p.x<=view.width-8);assert.ok(p.y>=8&&p.y<=view.height-8);
    }
    assert.equal(geometry.bounds.left,0);assert.equal(geometry.bounds.width,view.width);
    assert.equal(geometry.bounds.top+geometry.bounds.height,view.height);
    assert.ok(geometry.c1.y>geometry.start.y,'phone route should leave downward toward its destination');
  }
});

test('offscreen, absent, or overlapping endpoints produce no decorative connection',()=>{
  const view={left:0,top:0,width:390,height:844},origin={x:180,y:200};
  for(const destination of [rect(30,900,250,100),rect(-400,200,250,100),rect(50,100,0,20),rect(170,190,20,20)])assert.equal(discoveryGeometry({origin,destination,view}),null);
  assert.equal(discoveryGeometry({origin:{x:-1,y:200},destination:rect(10,400,350,80),view}),null);
  assert.equal(discoveryGeometry({origin,destination:rect(10,400,350,80),view:{...view,width:20}}),null);
});

// A small browser harness exercises timer/DOM cleanup, rather than asserting
// source strings or the exact styling of the animation.
function motionHarness(run){
  const saved=new Map(['window','document','matchMedia'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const animations=[],timers=new Map();let id=0;
  const events=()=>({addEventListener(){},removeEventListener(){}});
  class Element{
    constructor(tag,bounds=rect(0,0,1,1)){this.tag=tag;this.bounds=bounds;this.children=[];this.attributes={};this.style={};this.isConnected=true;}
    setAttribute(name,value){this.attributes[name]=value;}
    append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
    remove(){this.isConnected=false;if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);}
    querySelector(){return null;}
    getBoundingClientRect(){return {...this.bounds};}
    animate(){const animation={canceled:false,finished:new Promise(()=>{}),cancel(){this.canceled=true;}};animations.push(animation);return animation;}
  }
  const body=new Element('body'),board=new Element('board',rect(50,100,600,450)),row=new Element('row',rect(850,300,300,125));
  const media={...events(),matches:false};
  globalThis.window={...events(),visualViewport:{...events(),offsetLeft:0,offsetTop:0,width:1280,height:800}};
  globalThis.document={...events(),body,hidden:false,querySelector:()=>null,createElementNS:(_ns,tag)=>new Element(tag)};
  globalThis.matchMedia=()=>media;
  const schedule=(callback,delay)=>{timers.set(++id,{callback,delay});return id;},cancel=key=>timers.delete(key);
  const at=delay=>{for(const [key,timer] of [...timers])if(timer.delay===delay){timers.delete(key);timer.callback();}};
  try{run({body,board,row,animations,timers,schedule,cancel,at});}
  finally{for(const [key,descriptor] of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}

test('a moved row cancels the stale connection before landing, and the next queued placement still plays',()=>motionHarness(({body,board,row,animations,timers,schedule,cancel,at})=>{
  const motion=discoveryMotion({board,target:()=>row,schedule,cancel});
  motion.show([clue]);motion.show([note]);
  assert.equal(body.children.length,1);at(320);
  row.bounds=rect(850,410,300,125);at(970);
  assert.equal(body.children.length,0);assert.ok(animations.every(animation=>animation.canceled));
  assert.equal(timers.size,1,'only the queue advancement remains');
  at(1560);assert.equal(body.children.length,1,'later discoveries still receive their connection');
  motion.dispose();assert.equal(body.children.length,0);assert.equal(timers.size,0);
}));

test('clear cancels pending geometry checks as well as motion, and stale checks cannot remove a later flight',()=>motionHarness(({body,board,row,timers,schedule,cancel})=>{
  const motion=discoveryMotion({board,target:()=>row,schedule,cancel});motion.show([clue]);
  const oldCheck=[...timers.values()].find(timer=>timer.delay===970).callback;
  motion.clear();assert.equal(timers.size,0);assert.equal(body.children.length,0);
  motion.show([note]);oldCheck();assert.equal(body.children.length,1);
  motion.dispose();assert.equal(timers.size,0);
}));

test('synchronous cancellation inside the target resolver cannot recreate a decorative layer',()=>motionHarness(({body,board,row,timers,schedule,cancel})=>{
  let motion;motion=discoveryMotion({board,target:()=>{motion.clear();return row;},schedule,cancel});
  motion.show([clue,note]);assert.equal(body.children.length,0);assert.equal(timers.size,0);motion.dispose();
}));

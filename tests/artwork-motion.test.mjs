import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createArtworkClock,interpolateArtworkSprite,sampleArtworkMotion,sampleArtworkEntrance,sampleArtworkStage,createArtworkStage,createArtworkRemovalPatch,createArtworkAssetCache,createCompletionPlaybackGate,preloadArtwork,animatedArtwork} from '../game/artwork-motion.mjs';
import {artworkMotionData} from '../game/artwork-motion-data.mjs';
import {allRounds} from '../game/rounds.mjs';

function setup(options={}){
  let time=0,id=0;const frames=new Map(),positions=[];
  const clock=createArtworkClock({duration:12000,now:()=>time,request:fn=>{frames.set(++id,fn);return id;},cancel:id=>frames.delete(id),onFrame:position=>positions.push(position),...options});
  const advance=ms=>{time+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn());};
  return {clock,frames,positions,advance};
}

test('completion autoplay runs once and later player intent cancels it without cancelling the reveal',()=>{
  const gate=createCompletionPlaybackGate();
  const first=gate.arm();assert.equal(first(),true);assert.equal(first(),false);
  for(const interaction of ['image note','walkthrough step','manual playback','dialog','hidden document','restart']){
    const pending=gate.arm();let revealed=false,played=false;
    const reveal=()=>{revealed=true;if(pending())played=true;};
    gate.cancel();reveal();
    assert.equal(revealed,true,interaction);assert.equal(played,false,interaction);
  }
  const stale=gate.arm(),current=gate.arm();
  assert.equal(stale(),false);assert.equal(current(),true);assert.equal(current(),false);
});

test('artwork motion completes once and replay restarts without overlapping loops',()=>{
  const {clock,frames,advance}=setup();clock.play();clock.play();assert.equal(frames.size,1);
  advance(6000);assert.equal(clock.progress,.5);advance(7000);assert.equal(clock.progress,1);assert.equal(clock.playing,false);assert.equal(frames.size,0);
  clock.play();assert.equal(clock.progress,0);assert.equal(clock.playing,true);clock.dispose();
});

test('pausing preserves the original-artwork frame while the page is away',()=>{
  const {clock,frames,advance}=setup();clock.play();advance(3000);clock.pause();assert.equal(frames.size,0);
  advance(60000);assert.equal(clock.progress,.25);clock.play();advance(3000);assert.equal(clock.progress,.5);clock.dispose();
});

test('reset restores the untransformed artwork and dispose prevents queued work',()=>{
  const {clock,frames,positions,advance}=setup();clock.play();advance(6000);clock.reset();assert.equal(clock.progress,0);assert.equal(clock.playing,false);assert.equal(frames.size,0);
  clock.play();clock.dispose();const count=positions.length;advance(60000);clock.play();assert.equal(positions.length,count);assert.equal(frames.size,0);
});

test('sprite interpolation honors exact endpoints, opacity fades, and rotation centers',()=>{
  const sprite={keyframes:[{at:0,x:0,y:0,rotate:0,opacity:1},{at:.5,x:80,y:-20,rotate:30,opacity:0},{at:1,x:0,y:0,rotate:0,opacity:1}]};
  assert.deepEqual(interpolateArtworkSprite(sprite,0),{x:0,y:0,rotate:0,scale:1,opacity:1});
  assert.deepEqual(interpolateArtworkSprite(sprite,.25),{x:40,y:-10,rotate:15,scale:1,opacity:.5});
  assert.deepEqual(interpolateArtworkSprite(sprite,.5),{x:80,y:-20,rotate:30,scale:1,opacity:0});
  assert.deepEqual(interpolateArtworkSprite(sprite,1),{x:0,y:0,rotate:0,scale:1,opacity:1});
});

test('linear transport keyframes retain a constant interpolation rate',()=>{
  const sprite={keyframes:[{at:0,x:0},{at:1,x:100,easing:'linear'}]};
  assert.equal(interpolateArtworkSprite(sprite,.25).x,25);assert.equal(interpolateArtworkSprite(sprite,-1).x,0);assert.equal(interpolateArtworkSprite(sprite,2).x,100);
});

test('continuous artwork crosses cycle boundaries without restarting its clock or adding frames',()=>{
  const {clock,frames,advance}=setup({loop:true});
  clock.play();advance(12000);assert.equal(clock.progress,0);assert.equal(clock.elapsed,12000);assert.equal(clock.playing,true);assert.equal(frames.size,1);
  advance(61000);assert.equal(clock.elapsed,73000);assert.ok(Math.abs(clock.progress-1/12)<1e-12);clock.play();assert.equal(frames.size,1);
  clock.pause();advance(60000);assert.equal(clock.elapsed,73000);assert.equal(frames.size,0);
  clock.play();advance(2000);assert.equal(clock.elapsed,75000);assert.equal(clock.progress,.25);clock.dispose();
});

test('independent periods and phases keep neighboring objects asynchronous and seamless',()=>{
  const frames=[{at:0,x:0},{at:.5,x:20},{at:1,x:0}];
  const first={keyframes:frames,period:6000,phase:0},second={keyframes:frames,period:8000,phase:.25};
  assert.equal(sampleArtworkMotion(first,0).x,0);assert.equal(sampleArtworkMotion(second,0).x,0);
  assert.notEqual(sampleArtworkMotion(first,800).x,sampleArtworkMotion(second,800).x);
  const firstPass=sampleArtworkMotion(first,1700),nextPass=sampleArtworkMotion(first,7700);
  for(const key of Object.keys(firstPass))assert.ok(Math.abs(firstPass[key]-nextPass[key])<1e-12);
  assert.notEqual(sampleArtworkMotion(first,1700).x,sampleArtworkMotion(second,1700).x);
  assert.ok(Math.abs(sampleArtworkMotion(first,5999.99).x-sampleArtworkMotion(first,6000.01).x)<1e-8);
});

test('every cutout remains registered with the source image throughout the opening crossfade',()=>{
  const original={x:0,y:0,rotate:0,scale:1,opacity:1};
  for(const [number,scene] of Object.entries(artworkMotionData))for(const sprite of scene.sprites){
    for(const elapsed of [0,60,120])assert.deepEqual(sampleArtworkMotion(sprite,elapsed,scene.duration,{x:1,y:-1}),original,`${number}/${sprite.id}/${elapsed}`);
  }
  let previous=0;
  for(let elapsed=0;elapsed<=600;elapsed++){
    const entrance=sampleArtworkEntrance(elapsed);
    assert.ok(entrance.motion>=previous&&entrance.motion<=1);previous=entrance.motion;
    if(entrance.motion>0)assert.equal(entrance.opacity,1,'No shifted object blends over the still original');
    if(entrance.opacity<1)assert.equal(entrance.motion,0);
  }
  assert.deepEqual(sampleArtworkEntrance(600),{opacity:1,motion:1});
  assert.deepEqual(sampleArtworkEntrance(120000),{opacity:1,motion:1});
});

test('the entrance envelope reaches independent motion without position, scale, or opacity discontinuities',()=>{
  const sprite={period:10000,phase:.25,keyframes:[{at:0},{at:.5,x:80,y:-30,rotate:12,scale:1.1,opacity:.35},{at:1}]};
  for(const center of [120,600]){
    const before=sampleArtworkMotion(sprite,center-.001),after=sampleArtworkMotion(sprite,center+.001);
    for(const key of Object.keys(before))assert.ok(Math.abs(before[key]-after[key])<.001,`${center}/${key}`);
  }
  const expected=interpolateArtworkSprite(sprite,.31);
  for(const elapsed of [600,10600])for(const [key,value] of Object.entries(sampleArtworkMotion(sprite,elapsed)))assert.ok(Math.abs(value-expected[key])<1e-10,`${elapsed}/${key}`);
});

test('pointer parallax affects only floating objects and cannot exceed two logical pixels',()=>{
  const base={keyframes:[{at:0},{at:1}],period:7000};
  assert.deepEqual(sampleArtworkMotion({...base,motion:'transport'},1500,18000,{x:10,y:-10}),{x:0,y:0,rotate:0,scale:1,opacity:1});
  const floating=sampleArtworkMotion({...base,motion:'float'},1500,18000,{x:10,y:-10});
  assert.equal(floating.x,2);assert.equal(floating.y,-2);
  assert.equal(sampleArtworkMotion({...base,motion:'float',parallax:0},1500,18000,{x:1,y:1}).x,0);
});

test('secondary bobbing is periodic and remains within its supplied amplitudes',()=>{
  const sprite={motion:'float',period:6000,keyframes:[{at:0},{at:1}],secondary:{x:3,y:2,rotate:4,period:6000,phase:.15}};
  for(let elapsed=0;elapsed<=18000;elapsed+=250){
    const frame=sampleArtworkMotion(sprite,elapsed);
    assert.ok(Math.abs(frame.x)<=3);assert.ok(Math.abs(frame.y)<=2);assert.ok(Math.abs(frame.rotate)<=4);
  }
  const before=sampleArtworkMotion(sprite,1250),after=sampleArtworkMotion(sprite,7250);
  for(const key of ['x','y','rotate'])assert.ok(Math.abs(before[key]-after[key])<1e-12);
});

test('transport starts visibly at its original source and never rushes into a phase-offset pose',()=>{
  const departures=[];
  for(const [number,scene] of Object.entries(artworkMotionData))for(const sprite of scene.sprites.filter(item=>item.motion==='transport')){
    const context=`${number}/${sprite.id}`,end=sprite.keyframes.find(frame=>frame.opacity===0);
    const distance=Math.hypot(end.x,end.y);let departedAt=null;
    for(let elapsed=0;elapsed<=1000;elapsed+=5){
      const frame=sampleArtworkMotion(sprite,elapsed,scene.duration);
      assert.equal(frame.opacity,1,`${context}: cargo must remain visible throughout its first second`);
      assert.ok(Math.hypot(frame.x,frame.y)<distance*.25,`${context}: entrance must not sprint through a normal journey`);
      if(departedAt===null&&Math.hypot(frame.x,frame.y)>.01)departedAt=elapsed;
    }
    assert.ok(departedAt>120&&departedAt<1000,`${context}: first departure should follow the registered crossfade`);
    departures.push(departedAt);
  }
  assert.ok(new Set(departures).size>10,'neighboring objects have staggered departures');
  const right=artworkMotionData['02'].sprites.find(sprite=>sprite.id==='junction-cargo-right');
  assert.ok(sampleArtworkMotion(right,600).x<2,'the reported 187px entrance jump cannot return');
});

test('visible transport velocity stays close to its route speed on first and later journeys',()=>{
  for(const [number,scene] of Object.entries(artworkMotionData))for(const sprite of scene.sprites.filter(item=>item.motion==='transport')){
    const frames=sprite.keyframes,first=frames.findIndex(frame=>frame.x||frame.y),last=frames.findIndex(frame=>frame.opacity===0);
    let length=0;
    for(let i=first;i<=last;i++)length+=Math.hypot(frames[i].x-frames[i-1].x,frames[i].y-frames[i-1].y);
    const meanSpeed=length/((frames[last].at-frames[first-1].at)*sprite.period)*1000;
    let previous=sampleArtworkMotion(sprite,0),peak=0,seenInvisible=false,seenReturn=false;
    for(let elapsed=5;elapsed<=sprite.period*2;elapsed+=5){
      const frame=sampleArtworkMotion(sprite,elapsed,scene.duration);
      if(frame.opacity>.001&&previous.opacity>.001){
        const speed=Math.hypot(frame.x-previous.x,frame.y-previous.y)/.005;peak=Math.max(peak,speed);
        assert.ok(speed<=meanSpeed*1.09,`${number}/${sprite.id}: visible speed ${speed} exceeds a smooth journey`);
      }
      if(frame.opacity===0)seenInvisible=true;
      if(seenInvisible&&frame.opacity>0&&Math.hypot(frame.x,frame.y)<.001)seenReturn=true;
      previous=frame;
    }
    assert.ok(peak>=meanSpeed,`${number}/${sprite.id}: cargo actually traverses its route`);
    assert.ok(seenInvisible&&seenReturn,`${number}/${sprite.id}: return occurs invisibly before source fade-in`);
  }
});

test('transport crosses interior route markers without easing to a stop and loops without a visible jump',()=>{
  const sprite={motion:'transport',period:10000,phase:.3,keyframes:[
    {at:0},{at:.1},{at:.3,x:30},{at:.7,x:100},{at:.8,x:100,opacity:0},{at:.94,opacity:0},{at:1}
  ]};
  const speeds=[];
  for(let elapsed=1500;elapsed<=6000;elapsed+=100){
    const before=sampleArtworkMotion(sprite,elapsed),after=sampleArtworkMotion(sprite,elapsed+10);
    speeds.push((after.x-before.x)/.01);
  }
  assert.ok(Math.max(...speeds)-Math.min(...speeds)<1e-9,'interior travel has a constant rate, including through the x=30 marker');
  for(let elapsed=1000;elapsed<=20000;elapsed+=25){
    const frame=sampleArtworkMotion(sprite,elapsed),next=sampleArtworkMotion(sprite,elapsed+sprite.period);
    for(const key of Object.keys(frame))assert.ok(Math.abs(frame[key]-next[key])<1e-10,`${elapsed}/${key}`);
  }
});

function transformedOutlineBounds(sprite,elapsed){
  assert.ok(sprite.clip.match(/[a-z]/gi).every(command=>['M','L','Z'].includes(command)),'the reference outline parser expects polygon vertices');
  const values=sprite.clip.match(/-?\d*\.?\d+/g).map(Number),points=[];
  for(let i=0;i<values.length;i+=2)points.push([values[i],values[i+1]]);
  const [cx,cy]=sprite.center,frame=sampleArtworkMotion(sprite,elapsed);
  const angle=frame.rotate*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const moved=points.map(([x,y])=>[(x-cx)*frame.scale*c-(y-cy)*frame.scale*s+cx+frame.x,(x-cx)*frame.scale*s+(y-cy)*frame.scale*c+cy+frame.y]);
  const xs=moved.map(point=>point[0]),ys=moved.map(point=>point[1]);
  return {left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys),opacity:frame.opacity};
}

test('lysosomal export cargo never merges with the fixed exterior nucleoside',()=>{
  const sprite=artworkMotionData['03'].sprites.find(item=>item.id==='transporter-lower-cargo');
  // Independently measured from the original illustration, not the cargo route.
  const fixed={left:578,right:629,top:491,bottom:529};
  for(let elapsed=0;elapsed<=60000;elapsed+=25){
    const frame=transformedOutlineBounds(sprite,elapsed);if(frame.opacity<.02)continue;
    const overlaps=frame.right>fixed.left&&frame.left<fixed.right&&frame.bottom>fixed.top&&frame.top<fixed.bottom;
    assert.equal(overlaps,false,`${elapsed}ms: moving cargo overlaps the fixed exterior molecule`);
  }
});

test('the two lysosomal cargos remain visually separate through successive journeys',()=>{
  const upper=artworkMotionData['03'].sprites.find(item=>item.id==='transporter-upper-cargo');
  const lower=artworkMotionData['03'].sprites.find(item=>item.id==='transporter-lower-cargo');
  let compared=0;
  for(let elapsed=0;elapsed<=300000;elapsed+=25){
    const a=transformedOutlineBounds(upper,elapsed),b=transformedOutlineBounds(lower,elapsed);
    if(a.opacity<.02||b.opacity<.02)continue;
    assert.ok(b.top-a.bottom>=4,`${elapsed}ms: moving cargos merge or lose their visible gap`);compared++;
  }
  assert.ok(compared>1000,'many simultaneous visible frames must be checked, including later cycles');
});

test('vesicle cleanup includes its original soft shadow beyond the solid rim',()=>{
  const sprite=artworkMotionData['06'].sprites.find(item=>item.id==='closed-vesicle-middle');
  const match=sprite.patch.match(/^M\s+([\d.]+)\s+([\d.]+)\s+a\s+([\d.]+)\s+([\d.]+)/);
  assert.ok(match,'the measured shadow cleanup uses an ellipse');
  const [startX,cy,rx,ry]=match.slice(1).map(Number),cx=startX+rx;
  // Locations where the original shadow still differs materially from the
  // clean background. The former rim-only patch left a stationary crescent.
  for(const [x,y] of [[425,228],[450,228],[450,232],[475,216],[485,205]]){
    assert.ok(((x-cx)/rx)**2+((y-cy)/ry)**2<.95,`${x},${y}: original vesicle shadow lies outside cleanup`);
  }
});

test('organic float drift remains inside every authored axis envelope and preserves fixed edges',()=>{
  for(const [number,scene] of Object.entries(artworkMotionData))for(const sprite of scene.sprites.filter(item=>item.motion==='float')){
    for(let elapsed=600;elapsed<=120000;elapsed+=75){
      const frame=sampleArtworkMotion(sprite,elapsed,scene.duration);
      for(const key of ['x','y','rotate']){
        const values=sprite.keyframes.map(item=>item[key]??0),secondary=Math.abs(sprite.secondary?.[key]??0);
        const min=Math.min(0,...values)-secondary,max=Math.max(0,...values)+secondary;
        assert.ok(frame[key]>=min-1e-10&&frame[key]<=max+1e-10,`${number}/${sprite.id}/${key}: left its safe envelope`);
        if(min===max)assert.equal(Math.abs(frame[key]-min),0,`${number}/${sprite.id}/${key}: fixed axis must stay fixed`);
      }
    }
  }
});

test('floating motion has no shared waypoint stops or identical short repeating loop',()=>{
  const sprite={motion:'float',period:10000,phase:0,keyframes:[{at:0},{at:.25,x:12,y:8},{at:.55,x:-7.8,y:-4},{at:.8,x:4.2,y:-2},{at:1}]};
  for(const elapsed of [2500,5500,8000,10000,12500,15500,18000,20000]){
    const before=sampleArtworkMotion(sprite,elapsed-1),after=sampleArtworkMotion(sprite,elapsed+1);
    assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>.001,`${elapsed}: simultaneous waypoint stop`);
  }
  const first=sampleArtworkMotion(sprite,1500),later=sampleArtworkMotion(sprite,11500);
  assert.ok(Math.hypot(first.x-later.x,first.y-later.y)>.1,'the ambient path should evolve across consecutive main periods');
});

test('the completion frame rises smoothly without scaling the image or replaying its perimeter glow',()=>{
  const start=sampleArtworkStage(0);
  assert.equal(Math.abs(start.y),0);assert.equal(start.trace,0);assert.equal(start.halo,0);assert.equal(start.glintOpacity,0);
  let lastTrace=0;
  for(let elapsed=0;elapsed<=120000;elapsed+=100){
    const frame=sampleArtworkStage(elapsed,{x:100,y:-100});
    assert.ok(Object.values(frame).every(Number.isFinite));
    assert.ok(frame.y<=0&&frame.y>=-5.8);
    assert.ok(Math.abs(frame.rotateX)<=.55&&Math.abs(frame.rotateY)<=.7);
    assert.ok(frame.trace>=lastTrace);lastTrace=frame.trace;
    if(elapsed>=3000){assert.equal(frame.halo,0);assert.equal(frame.glintOpacity,0);assert.equal(frame.trace,1);}
    assert.equal('scale' in frame,false);
  }
  assert.ok(sampleArtworkStage(1500).halo>.1);
  assert.ok(sampleArtworkStage(1500).glintOpacity>.5&&sampleArtworkStage(1500).glintOpacity<.65);
});

test('frame levitation stays continuous at both its introduction and later cycle boundaries',()=>{
  for(const center of [0,280,1900,2480,2780,3000,7800,15600]){
    const before=sampleArtworkStage(Math.max(0,center-.01)),after=sampleArtworkStage(center+.01);
    for(const name of ['y','trace','halo','glintOpacity','sweepOpacity'])assert.ok(Math.abs(before[name]-after[name])<.001,`${center}/${name}: visual discontinuity`);
  }
});

test('the presentation light crosses the illustration once at restrained opacity, then leaves it unobstructed',()=>{
  assert.equal(sampleArtworkStage(0).sweepOpacity,0);assert.equal(sampleArtworkStage(280).sweepOpacity,0);
  let previous=-Infinity;
  for(let elapsed=280;elapsed<=2480;elapsed+=20){
    const frame=sampleArtworkStage(elapsed);
    assert.ok(frame.sweepX>=previous);previous=frame.sweepX;
    assert.ok(frame.sweepOpacity>=0&&frame.sweepOpacity<=.12);
  }
  assert.ok(sampleArtworkStage(1380).sweepOpacity>.11);
  for(const elapsed of [2480,3000,7800,15600,120000])assert.equal(sampleArtworkStage(elapsed).sweepOpacity,0);
});

function stageDocument(){
  class Element{
    constructor(tag){this.tag=tag;this.children=[];this.attrs=new Map();this.styles=new Map();this.classes=new Set();this.parent=null;this.attributeWrites=0;this.dataset={};this.listeners=new Map();
      this.style={setProperty:(name,value)=>this.styles.set(name,value),removeProperty:name=>this.styles.delete(name)};
      this.classList={add:(...names)=>names.forEach(name=>this.classes.add(name)),remove:(...names)=>names.forEach(name=>this.classes.delete(name)),toggle:(name,value)=>value?this.classes.add(name):this.classes.delete(name)};
    }
    setAttribute(name,value){this.attributeWrites++;this.attrs.set(name,String(value));}
    removeAttribute(name){this.attributeWrites++;this.attrs.delete(name);}
    append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
    replaceChildren(...nodes){this.children=[];this.append(...nodes);}
    addEventListener(name,callback){this.listeners.set(name,callback);}
    removeEventListener(name){this.listeners.delete(name);}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);this.parent=null;}
  }
  const frame=new Element('div'),board=new Element('div');frame.append(board);board.closest=()=>frame;
  return {document:{createElementNS:(_ns,tag)=>new Element(tag),createElement:tag=>new Element(tag),addEventListener(){},removeEventListener(){}},board,frame};
}

test('all ten completed illustrations keep their readable guide under reduced motion without loading or animating assets',async context=>{
  const keys=['document','matchMedia','IntersectionObserver','Image','requestAnimationFrame'];
  const saved=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  context.after(()=>{for(const [key,descriptor] of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
  globalThis.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
  globalThis.IntersectionObserver=class{observe(){}disconnect(){}};
  globalThis.Image=class{constructor(){assert.fail('reduced motion must not request animation images');}};
  globalThis.requestAnimationFrame=()=>assert.fail('a static guide must not start a clock');
  for(const round of allRounds){
    const {document,board,frame}=stageDocument();globalThis.document=document;
    const animation=animatedArtwork(round,{board,guided:true});
    assert.equal(await animation.ready,false);
    assert.equal(animation.element.hidden,true);assert.equal(animation.controls.hidden,false);
    assert.equal(animation.controls.children[0].hidden,true,'motion toggle is hidden');
    assert.equal(animation.controls.children[2].textContent,'Read image notes');
    assert.equal(animation.caption.hidden,false);
    animation.focusLandmark(1);assert.equal(animation.caption.dataset.phase,'static-1');assert.equal(animation.element.dataset.guideIndex,'1');
    animation.caption.children[3].children[1].onclick();
    assert.equal(animation.caption.dataset.phase,'static-2');assert.equal(animation.element.dataset.guideIndex,'2');
    animation.dispose();assert.deepEqual(frame.children,[board]);assert.equal(board.children.length,0);
  }
});

test('cleanup retains the original footprint when a replacement cutout has a tighter boundary',context=>{
  const previous=globalThis.document,{document}=stageDocument();
  globalThis.document=document;context.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
  const sprite={
    removalClip:'M0 0 L20 0 L20 2 L4 2 L4 20 L0 20 Z',
    clip:'M1 1 L19 1 L19 2 L3 2 L3 19 L1 19 Z',
    patch:'M-1 -1 L21 -1 L21 3 L5 3 L5 21 L-1 21 Z'
  };
  const group=createArtworkRemovalPatch(sprite),paths=group.children;
  assert.equal(paths.length,3,'old footprint, new cutout, and existing clean area all remain represented');
  for(const footprint of [sprite.removalClip,sprite.clip]){
    const path=paths.find(item=>item.attrs.get('d')===footprint);
    assert.ok(path,'a tighter contour cannot strand pixels from the previous object');
    assert.equal(path.attrs.get('fill'),'#fff');assert.equal(path.attrs.get('stroke'),'#fff');
    assert.equal(path.attrs.get('stroke-width'),'6','three logical pixels of cleanup clearance on every edge');
    assert.equal(path.attrs.get('stroke-linejoin'),'round','thin branch joins cannot create long miter artifacts');
    assert.equal(path.attrs.has('transform'),false,'center scaling cannot replace true edge dilation');
  }
  const authored=paths.find(item=>item.attrs.get('d')===sprite.patch);
  assert.ok(authored,'the authored cleanup area must survive independently of clip refinement');
  assert.equal(authored.attrs.has('stroke'),false,'existing broad patches do not receive an additional broad expansion');
});

test('every animated object receives constant cleanup clearance, including thin and concave silhouettes',context=>{
  const previous=globalThis.document,{document}=stageDocument();
  globalThis.document=document;context.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
  for(const [number,scene] of Object.entries(artworkMotionData))for(const sprite of scene.sprites){
    const group=createArtworkRemovalPatch(sprite),footprints=new Set([sprite.removalClip,sprite.clip].filter(Boolean));
    const dilated=group.children.filter(path=>path.attrs.has('stroke'));
    assert.equal(dilated.length,footprints.size,`${number}/${sprite.id}: one cleanup boundary per distinct footprint`);
    for(const path of dilated){
      assert.ok(footprints.has(path.attrs.get('d')),`${number}/${sprite.id}: exact original boundary retained`);
      assert.equal(path.attrs.get('stroke-width'),String((sprite.cleanupRadius??3)*2),`${number}/${sprite.id}: constant measured clearance`);
      assert.equal(path.attrs.get('stroke-linejoin'),'round');
      assert.equal(path.attrs.get('stroke-linecap'),'round');
    }
  }
});

test('only measured fragment shadows expand cleanup beyond the default narrow footprint',context=>{
  const previous=globalThis.document,{document}=stageDocument();
  globalThis.document=document;context.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
  const measured=[['lysosome-fragment-upper',4],['lysosome-fragment-lower',6]];
  for(const [id,shadowDistance] of measured){
    const sprite=artworkMotionData['03'].sprites.find(item=>item.id===id);
    const paths=createArtworkRemovalPatch(sprite).children.filter(path=>path.attrs.has('stroke'));
    for(const path of paths)assert.ok(Number(path.attrs.get('stroke-width'))/2>=shadowDistance+1,`${id}: cleanup must reach beyond the measured original shadow`);
  }
  for(const [number,scene] of Object.entries(artworkMotionData))for(const sprite of scene.sprites){
    if(number==='03'&&measured.some(([id])=>id===sprite.id))continue;
    assert.equal(sprite.cleanupRadius,undefined,`${number}/${sprite.id}: unrelated structures must keep narrow cleanup`);
  }
});

test('stage waits for playback, shares the pause clock, and completely restores the original frame on reset',context=>{
  const previous=globalThis.document,{document,board,frame}=stageDocument();
  globalThis.document=document;context.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
  frame.style.setProperty('margin-top','11px');frame.classList.add('board-frame');
  const stage=createArtworkStage(board,'qa-stage'),rim=frame.children.at(-1);
  assert.equal(rim.attrs.has('hidden'),true);stage.draw(1800,{x:1,y:1});assert.equal(frame.styles.size,1);
  const {clock,frames,advance}=setup({loop:true,onFrame:(_position,elapsed)=>stage.draw(elapsed,{x:.8,y:-.4}),onState:()=>stage.playing(clock.playing)});
  stage.activate();clock.play();advance(2200);
  assert.equal(rim.attrs.has('hidden'),false);assert.equal(frame.classes.has('artwork-stage-playing'),true);
  assert.notEqual(frame.styles.get('--artwork-stage-y'),'0.000px');
  clock.pause();const paused=[...frame.styles];advance(60000);
  assert.deepEqual([...frame.styles],paused);assert.equal(frames.size,0);assert.equal(frame.classes.has('artwork-stage-playing'),false);
  assert.equal(frame.classes.has('artwork-stage-active'),true);
  clock.play();advance(800);assert.equal(clock.elapsed,3000);assert.equal(frame.styles.get('--artwork-stage-halo'),'0.000');
  clock.reset();stage.reset();
  assert.equal(rim.attrs.has('hidden'),true);assert.deepEqual([...frame.styles],[['margin-top','11px']]);assert.deepEqual([...frame.classes],['board-frame']);
  clock.dispose();stage.dispose();assert.deepEqual(frame.children,[board]);
});

test('disposing a playing stage removes its border and every owned presentation style',context=>{
  const previous=globalThis.document,{document,board,frame}=stageDocument();
  globalThis.document=document;context.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
  const stage=createArtworkStage(board,'disposed-stage');stage.activate();stage.playing(true);stage.draw(1200,{x:1,y:-1});stage.dispose();
  assert.deepEqual(frame.children,[board]);assert.equal(board.children.length,0);assert.equal(frame.styles.size,0);assert.equal(frame.classes.size,0);
  stage.draw(4000,{x:1,y:-1});assert.equal(frame.styles.size,0);
});

test('settled light effects stop DOM updates and reset can replay the complete arrival',context=>{
  const previous=globalThis.document,{document,board,frame}=stageDocument();
  globalThis.document=document;context.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
  const stage=createArtworkStage(board,'settled-stage'),sheen=board.children[0];
  const writes=element=>element.attributeWrites+element.children.reduce((sum,child)=>sum+writes(child),0);
  stage.activate();stage.draw(1380,{x:0,y:0});
  assert.equal(sheen.attrs.has('hidden'),false);assert.ok(Number(sheen.attrs.get('opacity'))>.11);
  stage.draw(3000,{x:0,y:0});assert.equal(sheen.attrs.has('hidden'),true);
  const settledWrites=writes(frame),previousY=frame.styles.get('--artwork-stage-y');
  for(let time=3016;time<9000;time+=16)stage.draw(time,{x:0,y:0});
  assert.equal(writes(frame),settledWrites,'Settled decorative SVG does not mutate every frame');
  assert.notEqual(frame.styles.get('--artwork-stage-y'),previousY,'Frame continues floating');
  stage.reset();assert.equal(sheen.attrs.has('hidden'),true);
  stage.activate();stage.draw(1380,{x:0,y:0});assert.equal(sheen.attrs.has('hidden'),false);
  stage.dispose();assert.equal(board.children.length,0);
});

test('asset preloading shares simultaneous requests and retries a failed request',async()=>{
  let loads=0,release;
  const cache=createArtworkAssetCache(()=>{loads++;return new Promise(resolve=>{release=resolve;});});
  const first=cache.load('plate'),second=cache.load('plate');assert.equal(first,second);
  await Promise.resolve();assert.equal(loads,1);release('decoded');assert.equal(await first,'decoded');assert.equal(await cache.load('plate'),'decoded');assert.equal(loads,1);
  let attempts=0;
  const retry=createArtworkAssetCache(()=>{if(++attempts===1)throw new Error('Temporary loading failure');return 'decoded';});
  await assert.rejects(retry.load('plate'));assert.equal(await retry.load('plate'),'decoded');assert.equal(attempts,2);
});

test('retrying an illustration reloads only the failed plate and keeps its decoded original',async()=>{
  const loads=new Map();
  const cache=createArtworkAssetCache(source=>{
    const count=(loads.get(source)??0)+1;loads.set(source,count);
    if(source==='clean-plate'&&count===1)throw new Error('Temporary image failure');
    return `${source}:decoded`;
  });
  const prepare=()=>Promise.all(['original','clean-plate'].map(source=>cache.load(source)));
  await assert.rejects(prepare());
  assert.deepEqual(await prepare(),['original:decoded','clean-plate:decoded']);
  assert.equal(loads.get('original'),1);assert.equal(loads.get('clean-plate'),2);
});

test('reduced-motion preferences skip the animation preload entirely',async context=>{
  const original=globalThis.matchMedia;
  context.after(()=>{if(original===undefined)delete globalThis.matchMedia;else globalThis.matchMedia=original;});
  globalThis.matchMedia=()=>({matches:true});
  assert.equal(await preloadArtwork(allRounds[0]),false);
});

test('every published round has a bounded animation with valid paths and keyframes',()=>{
  assert.deepEqual(Object.keys(artworkMotionData).sort(),allRounds.map(round=>round.number).sort());
  for(const round of allRounds){
    const scene=artworkMotionData[round.number];
    assert.ok(scene.label&&scene.description,`${round.gene}: an accessible explanation is required`);
    assert.ok(Number.isFinite(scene.duration)&&scene.duration>=1000&&scene.duration<=30000,`${round.gene}: duration must be short and finite`);
    assert.ok(scene.sprites.length>0,`${round.gene}: needs at least one moving original object`);
    assert.equal(new Set(scene.sprites.map(sprite=>sprite.id)).size,scene.sprites.length,`${round.gene}: repeated sprite identity`);
    for(const sprite of scene.sprites){
      const context=`${round.gene}/${sprite.id}`;
      assert.ok(sprite.id&&sprite.center?.length===2,`${context}: missing sprite identity or center`);
      assert.ok(sprite.center.every(Number.isFinite),`${context}: invalid rotation center`);
      for(const path of [sprite.clip,sprite.patch]){
        assert.match(path,/^M\s*[-.\d]/);assert.match(path,/[zZ]\s*$/);assert.doesNotMatch(path,/NaN|Infinity|undefined/);
      }
      assert.equal(sprite.keyframes[0].at,0,context);assert.equal(sprite.keyframes.at(-1).at,1,context);
      for(const [index,frame] of sprite.keyframes.entries()){
        assert.ok(Number.isFinite(frame.at)&&frame.at>=0&&frame.at<=1,`${context}: frame time outside sequence`);
        if(index)assert.ok(frame.at>sprite.keyframes[index-1].at,`${context}: keyframes must advance`);
        for(const name of ['x','y','rotate','opacity','scale'])assert.ok(Number.isFinite(frame[name]),`${context}: invalid ${name}`);
        assert.ok(frame.opacity>=0&&frame.opacity<=1,`${context}: opacity outside display range`);
        assert.ok(frame.scale>0,`${context}: scale must preserve the object`);
      }
      assert.ok(sprite.keyframes.some(frame=>frame.x||frame.y||frame.rotate),`${context}: must move original pixels, not only highlight them`);
      if(sprite.period!==undefined)assert.ok(Number.isFinite(sprite.period)&&sprite.period>=1000,`${context}: invalid independent period`);
      if(sprite.phase!==undefined)assert.ok(Number.isFinite(sprite.phase)&&sprite.phase>=0&&sprite.phase<1,`${context}: invalid phase`);
      if(sprite.secondary)for(const [key,value] of Object.entries(sprite.secondary))assert.ok(Number.isFinite(value),`${context}: non-finite secondary ${key}`);
      for(const elapsed of [1000,17000,60000,240000])assert.ok(Object.values(sampleArtworkMotion(sprite,elapsed,scene.duration)).every(Number.isFinite),`${context}: invalid continuous frame`);
    }
    for(const accent of scene.accents??[]){
      assert.match(accent.path,/^M\s*[-.\d]/);assert.doesNotMatch(accent.path,/NaN|Infinity|undefined/);
      if(accent.target)assert.ok(scene.sprites.some(sprite=>sprite.id===accent.target),`${round.gene}: accent has no matching original structure`);
      if(accent.opacity!==undefined)assert.ok(accent.opacity>=0&&accent.opacity<=1,`${round.gene}: invalid accent opacity`);
      if(accent.period!==undefined)assert.ok(Number.isFinite(accent.period)&&accent.period>=1000,`${round.gene}: invalid accent period`);
    }
  }
});

test('all moving objects begin and finish in the exact original composition',()=>{
  const original={x:0,y:0,rotate:0,scale:1,opacity:1};
  for(const [number,scene] of Object.entries(artworkMotionData))for(const sprite of scene.sprites){
    assert.deepEqual(interpolateArtworkSprite(sprite,0),original,`${number}/${sprite.id}: initial position`);
    assert.deepEqual(interpolateArtworkSprite(sprite,1),original,`${number}/${sprite.id}: restored position`);
    for(const position of [.1,.25,.5,.75,.9])assert.ok(Object.values(interpolateArtworkSprite(sprite,position)).every(Number.isFinite),`${number}/${sprite.id}: non-finite interpolated frame`);
  }
});

test('edge-cut exon artwork covers the canvas boundary throughout its vertical motion',()=>{
  const sprite=artworkMotionData['08'].sprites.find(item=>item.id==='joined-exon-product');
  assert.match(sprite.clip,/ C /,'the native RNA boundary uses smooth curves rather than pixel stair steps');
  const endpoints=path=>[Number(path.match(/^M\s+([-\d.]+)/)[1]),Number(path.match(/L\s+([-\d.]+)\s+[-\d.]+\s+Z$/)[1])];
  const clip=endpoints(sprite.clip),patch=endpoints(sprite.patch);
  for(let i=0;i<2;i++){
    assert.ok(clip[i]>800,'the moving cutout must reach beyond the right canvas edge');
    assert.ok(patch[i]>=clip[i]+3,'the feathered patch must fully cover the original edge pixels');
  }
  assert.equal(sprite.parallax,0,'lateral parallax would expose the cropped edge');
  for(const frame of sprite.keyframes){assert.equal(Math.abs(frame.x),0);assert.equal(Math.abs(frame.rotate),0);}
  assert.equal(sprite.secondary.x,0);assert.equal(sprite.secondary.rotate,0);
});

test('all ten clean background plates retain 4:3 framing within native raster rounding',async()=>{
  for(const [number,scene] of Object.entries(artworkMotionData)){
    const path=new URL(scene.cleanPath??`./artwork/motion/${number}-clean.webp`,new URL('../game/artwork-motion.mjs',import.meta.url));
    const bytes=await readFile(path);
    assert.ok(bytes.length>1000,`${number}: missing or empty clean plate`);
    assert.equal(bytes.toString('ascii',0,4),'RIFF',`${number}: valid WebP container`);
    assert.equal(bytes.toString('ascii',8,12),'WEBP',`${number}: WebP file type`);
    assert.equal(bytes.toString('ascii',12,16),'VP8L',`${number}: lossless image bitstream`);
    assert.equal(bytes[20],0x2f,`${number}: valid lossless signature`);
    const dimensions=bytes.readUInt32LE(21),width=(dimensions&0x3fff)+1,height=((dimensions>>>14)&0x3fff)+1;
    assert.ok(width>=800&&height>=600,`${number}: clean plate too small for the stage`);
    assert.ok(Math.abs((width/height)/(4/3)-1)<=.002,`${number}: framing exceeds 0.2% raster-rounding tolerance`);
  }
});

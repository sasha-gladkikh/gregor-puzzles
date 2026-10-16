import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createArtworkClock,interpolateArtworkSprite,sampleArtworkMotion,sampleArtworkStage,createArtworkStage,createArtworkAssetCache,createCompletionPlaybackGate,preloadArtwork} from '../game/artwork-motion.mjs';
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
  assert.equal(sampleArtworkMotion(first,0).x,0);assert.equal(sampleArtworkMotion(second,0).x,10);
  const firstPass=sampleArtworkMotion(first,1700),nextPass=sampleArtworkMotion(first,7700);
  for(const key of Object.keys(firstPass))assert.ok(Math.abs(firstPass[key]-nextPass[key])<1e-12);
  assert.notEqual(sampleArtworkMotion(first,1700).x,sampleArtworkMotion(second,1700).x);
  assert.ok(Math.abs(sampleArtworkMotion(first,5999.99).x-sampleArtworkMotion(first,6000.01).x)<1e-8);
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
  assert.ok(sampleArtworkStage(1500).glintOpacity>.7);
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
    assert.ok(frame.sweepOpacity>=0&&frame.sweepOpacity<=.24);
  }
  assert.ok(sampleArtworkStage(1380).sweepOpacity>.23);
  for(const elapsed of [2480,3000,7800,15600,120000])assert.equal(sampleArtworkStage(elapsed).sweepOpacity,0);
});

function stageDocument(){
  class Element{
    constructor(tag){this.tag=tag;this.children=[];this.attrs=new Map();this.styles=new Map();this.classes=new Set();this.parent=null;this.attributeWrites=0;
      this.style={setProperty:(name,value)=>this.styles.set(name,value),removeProperty:name=>this.styles.delete(name)};
      this.classList={add:(...names)=>names.forEach(name=>this.classes.add(name)),remove:(...names)=>names.forEach(name=>this.classes.delete(name)),toggle:(name,value)=>value?this.classes.add(name):this.classes.delete(name)};
    }
    setAttribute(name,value){this.attributeWrites++;this.attrs.set(name,String(value));}
    removeAttribute(name){this.attributeWrites++;this.attrs.delete(name);}
    append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);this.parent=null;}
  }
  const frame=new Element('div'),board=new Element('div');frame.append(board);board.closest=()=>frame;
  return {document:{createElementNS:(_ns,tag)=>new Element(tag)},board,frame};
}

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
  assert.equal(sheen.attrs.has('hidden'),false);assert.ok(Number(sheen.attrs.get('opacity'))>.23);
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

test('all ten clean background plates retain 4:3 framing within native raster rounding',async()=>{
  for(const [number,scene] of Object.entries(artworkMotionData)){
    const path=new URL(scene.cleanPath??`./artwork/motion/${number}-clean.png`,new URL('../game/artwork-motion.mjs',import.meta.url));
    const bytes=await readFile(path);
    assert.ok(bytes.length>1000,`${number}: missing or empty clean plate`);
    assert.deepEqual(bytes.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]),`${number}: clean plate must be a valid PNG`);
    const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
    assert.ok(width>=800&&height>=600,`${number}: clean plate too small for the stage`);
    assert.ok(Math.abs((width/height)/(4/3)-1)<=.002,`${number}: framing exceeds 0.2% raster-rounding tolerance`);
  }
});

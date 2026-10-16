import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createArtworkClock,interpolateArtworkSprite,sampleArtworkMotion,createArtworkAssetCache,preloadArtwork} from '../game/artwork-motion.mjs';
import {artworkMotionData} from '../game/artwork-motion-data.mjs';
import {allRounds} from '../game/rounds.mjs';

function setup(options={}){
  let time=0,id=0;const frames=new Map(),positions=[];
  const clock=createArtworkClock({duration:12000,now:()=>time,request:fn=>{frames.set(++id,fn);return id;},cancel:id=>frames.delete(id),onFrame:position=>positions.push(position),...options});
  const advance=ms=>{time+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn());};
  return {clock,frames,positions,advance};
}

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

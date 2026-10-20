import {artworkMotionData} from './artwork-motion-data.mjs';
import {artworkSource} from './artwork-source.mjs';
import {createArtworkDetails,detailFocusWeight} from './artwork-detail.mjs';
import {createArtworkGuide} from './artwork-guide.mjs';

const NS='http://www.w3.org/2000/svg';
const clamp=value=>Math.max(0,Math.min(1,value));
const signed=value=>Math.max(-1,Math.min(1,value));
const cycle=value=>((value%1)+1)%1;
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
const identity=()=>({x:0,y:0,rotate:0,scale:1,opacity:1});
let instance=0;

// Presentation can finish after a player has already chosen another interaction.
// Each completion gets one permission to autoplay; later intent revokes it.
export function createCompletionPlaybackGate(){
  let generation=0;
  return {
    arm(){const own=++generation;return ()=>{if(own!==generation)return false;generation++;return true;};},
    cancel(){generation++;}
  };
}

// The clock advances only while playing. An offscreen pause does not accumulate
// elapsed wall time, and replay can never start a second animation loop.
export function createArtworkClock({duration=12000,loop=false,onFrame=()=>{},onState=()=>{},now=()=>performance.now(),request=callback=>requestAnimationFrame(callback),cancel=id=>cancelAnimationFrame(id)}={}){
  let elapsed=0,started=0,playing=false,disposed=false,frame=null;
  const progress=()=>loop?cycle(elapsed/duration):elapsed/duration;
  const draw=()=>onFrame(progress(),elapsed);
  const update=()=>{if(playing)elapsed=loop?Math.max(0,now()-started):Math.min(duration,Math.max(0,now()-started));draw();};
  const stop=()=>{if(frame!==null)cancel(frame);frame=null;playing=false;};
  const tick=()=>{frame=null;if(disposed||!playing)return;update();if(!loop&&elapsed>=duration){stop();onState();}else frame=request(tick);};
  return {
    get progress(){return progress();},get elapsed(){return elapsed;},get playing(){return playing;},
    play(){if(disposed||playing)return;if(!loop&&elapsed>=duration)elapsed=0;started=now()-elapsed;playing=true;draw();onState();frame=request(tick);},
    pause(){if(disposed)return;update();stop();onState();},
    reset(){if(disposed)return;stop();elapsed=0;draw();onState();},
    dispose(){stop();disposed=true;}
  };
}

export function interpolateArtworkSprite(sprite,progress){
  const frames=sprite.keyframes??[],t=clamp(progress);
  if(!frames.length)return {x:0,y:0,rotate:0,scale:1,opacity:1};
  let left=frames[0],right=frames.at(-1);
  if(t<=left.at)right=left;
  else if(t>=right.at)left=right;
  else for(let i=1;i<frames.length;i++)if(t<=frames[i].at){left=frames[i-1];right=frames[i];break;}
  const fraction=right.at===left.at?0:clamp((t-left.at)/(right.at-left.at));
  const amount=right.easing==='linear'?fraction:fraction*fraction*(3-2*fraction);
  const values={};
  for(const [key,fallback] of Object.entries({x:0,y:0,rotate:0,scale:1,opacity:1})){
    const a=left[key]??fallback,b=right[key]??fallback;values[key]=a+(b-a)*amount;
  }
  values.opacity=clamp(values.opacity);return values;
}

export function sampleArtworkEntrance(elapsed){
  const time=Math.max(0,elapsed),join=clamp((time-120)/480);
  return {opacity:clamp(time/120),motion:join*join*join*(join*(join*6-15)+10)};
}

const transportRoutes=new WeakMap(),floatEnvelopes=new WeakMap();
function transportRoute(sprite){
  if(transportRoutes.has(sprite))return transportRoutes.get(sprite);
  const frames=sprite.keyframes??[];
  const firstMove=frames.findIndex(frame=>frame.x||frame.y);
  const invisible=frames.findIndex((frame,index)=>index>firstMove&&frame.opacity===0);
  let route=null;
  if(firstMove>0&&invisible>firstMove){
    const start=frames[firstMove-1],end=frames[invisible];
    const points=[{...start,distance:0}];let length=0;
    for(const frame of frames.slice(firstMove,invisible+1)){
      const previous=points.at(-1),distance=Math.hypot((frame.x??0)-(previous.x??0),(frame.y??0)-(previous.y??0));
      if(distance){length+=distance;points.push({...frame,distance:length});}
    }
    if(length)route={points,length,start:start.at,end:end.at,fade:frames[invisible-1].at};
  }
  transportRoutes.set(sprite,route);return route;
}

function sampleTransport(sprite,elapsed,duration){
  const route=transportRoute(sprite);if(!route)return null;
  // Phase staggers departure instead of dropping a newly revealed object into
  // the middle of its route. Every first journey begins at the source pixels.
  const delay=120+clamp(sprite.phase??0)*750;
  if(elapsed<=delay)return identity();
  const position=cycle((elapsed-delay)/(sprite.period??duration)+route.start);
  if(position<route.start||position>=route.end)return interpolateArtworkSprite(sprite,position);
  const fraction=clamp((position-route.start)/(route.end-route.start)),ramp=.08;
  // Brief acceleration at the source and braking at the destination; no stops
  // at interior keyframes. Arc length keeps the travel rate consistent.
  const travel=fraction<ramp?fraction*fraction/(2*ramp*(1-ramp)):
    fraction>1-ramp?1-(1-fraction)**2/(2*ramp*(1-ramp)):(fraction-ramp/2)/(1-ramp);
  const distance=travel*route.length;
  let left=route.points[0],right=route.points.at(-1);
  for(let i=1;i<route.points.length;i++)if(distance<=route.points[i].distance){left=route.points[i-1];right=route.points[i];break;}
  const amount=clamp((distance-left.distance)/(right.distance-left.distance));
  const frame=identity();
  for(const key of ['x','y','rotate','scale']){
    const fallback=key==='scale'?1:0,a=left[key]??fallback,b=right[key]??fallback;frame[key]=a+(b-a)*amount;
  }
  frame.opacity=1-smooth((position-route.fade)/(route.end-route.fade));
  return frame;
}

function floatingFrame(sprite,elapsed,duration){
  let envelope=floatEnvelopes.get(sprite);
  if(!envelope){
    envelope=['x','y','rotate'].map(key=>{
      const values=(sprite.keyframes??[]).map(frame=>frame[key]??0);
      return {key,min:Math.min(0,...values),max:Math.max(0,...values)};
    });
    floatEnvelopes.set(sprite,envelope);
  }
  const angle=2*Math.PI*(elapsed/(sprite.period??duration)+(sprite.phase??0));
  const frame=interpolateArtworkSprite(sprite,cycle(elapsed/(sprite.period??duration)+(sprite.phase??0)));
  // Different axis phases and incommensurate rhythms avoid the repeated
  // five-waypoint stop. Their convex blend stays inside the authored envelope.
  for(const [index,{key,min,max}] of envelope.entries()){
    const offset=index*1.47;
    const wave=.8*Math.sin(angle+offset)+.2*Math.sin(angle*.618+offset+1.1);
    frame[key]=min+(max-min)*(wave+1)/2;
  }
  return frame;
}

// Independent clocks keep neighboring objects from moving in lockstep. The
// transport clock always starts at its source; ambient drift has its own rhythm.
export function sampleArtworkMotion(sprite,elapsed,duration=18000,pointer={x:0,y:0}){
  if(sprite.motion==='fixed')return identity();
  const entrance=sampleArtworkEntrance(elapsed).motion;
  if(entrance===0)return identity();
  if(sprite.motion==='transport'){
    const transport=sampleTransport(sprite,elapsed,duration);if(transport)return transport;
  }
  const position=cycle(elapsed/(sprite.period??duration)+(sprite.motion==='sequence'?0:sprite.phase??0));
  const frame=sprite.motion==='float'?floatingFrame(sprite,elapsed,duration):interpolateArtworkSprite(sprite,position),secondary=sprite.secondary;
  if(secondary){
    const angle=2*Math.PI*(elapsed/(secondary.period??sprite.period??duration)+(secondary.phase??0));
    frame.x+=(secondary.x??0)*Math.sin(angle);
    frame.y+=(secondary.y??0)*Math.sin(angle+Math.PI/2);
    frame.rotate+=(secondary.rotate??0)*Math.sin(angle+Math.PI/4);
  }
  if(sprite.motion==='float'){
    const depth=clamp(sprite.parallax??1);
    frame.x+=signed(pointer.x)*2*depth;frame.y+=signed(pointer.y)*2*depth;
  }
  // First crossfade an exactly registered image, then introduce the motion.
  // Shifted cutouts never blend over a visible copy of their still originals.
  if(entrance===1)return frame;
  for(const key of ['x','y','rotate'])frame[key]*=entrance;
  frame.scale=1+(frame.scale-1)*entrance;
  frame.opacity=1+(frame.opacity-1)*entrance;
  return frame;
}

// A single perimeter accent finishes before the biological sequence begins.
// The small arrival lift then stays fixed so notes and numbered markers remain
// easy to follow while motion continues within the illustration.
export function sampleArtworkStage(elapsed){
  const time=Math.max(0,elapsed),ease=smooth(time/1400),trace=smooth((time-100)/1000);
  const glint=clamp((time-180)/1220);
  const arrival=time<1500?Math.sin(Math.PI*clamp(time/1500)):0;
  return {
    y:-ease*3,
    rotateX:0,
    rotateY:0,
    trace,
    borderOpacity:ease*(.24+arrival*.38),
    depth:ease,
    halo:Math.max(0,arrival)*.12,
    glint,
    glintOpacity:time<1400?Math.sin(Math.PI*glint)*.52:0
  };
}

function svgNode(tag,attrs={}){const element=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))element.setAttribute(key,String(value));return element;}
function node(tag,className,text){const element=document.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;}

export function artworkControlLabels({failed=false,assetsReady=false,playing=false,elapsed=0}={}){
  const playback=failed?'Retry animation':!assetsReady?'Preparing image':playing?'Pause animation':elapsed>0?'Resume animation':'Animate image';
  const compact=failed?'Retry image':!assetsReady?'Preparing image':playing?'Pause image':elapsed>0?'Resume image':'Animate image';
  return {playback,compact,guide:'Image notes',guideCompact:'Image notes'};
}

export function createArtworkRemovalPatch(sprite){
  const group=svgNode('g');
  const radius=Number.isFinite(sprite.cleanupRadius)?Math.max(3,Math.min(12,sprite.cleanupRadius)):3;
  // Preserve the authored clean area, then cover the complete original and new
  // object footprints. Round strokes give constant edge clearance; selected
  // soft shadows can request a measured larger radius. Center scaling leaves
  // gaps at concavities and thin branches.
  if(sprite.patch)group.append(svgNode('path',{d:sprite.patch,fill:'#fff'}));
  for(const footprint of new Set([sprite.removalClip,sprite.clip].filter(Boolean))){
    group.append(svgNode('path',{d:footprint,fill:'#fff',stroke:'#fff','stroke-width':radius*2,'stroke-linejoin':'round','stroke-linecap':'round'}));
  }
  return group;
}

export function createArtworkStage(board,prefix){
  const frame=board.closest('.board-frame')??board;
  const rim=svgNode('svg',{class:'artwork-stage-rim',viewBox:'0 0 800 600',preserveAspectRatio:'none','aria-hidden':'true',focusable:'false'});
  const defs=svgNode('defs'),gradient=svgNode('linearGradient',{id:`${prefix}-rim`,x1:'0%',y1:'100%',x2:'100%',y2:'0%'});
  gradient.append(svgNode('stop',{offset:'0%', 'stop-color':'#4c7cff'}),svgNode('stop',{offset:'55%', 'stop-color':'#3a91eb'}),svgNode('stop',{offset:'100%', 'stop-color':'#6cd5e4'}));defs.append(gradient);
  const attrs={x:1.5,y:1.5,width:797,height:597,rx:8,fill:'none',pathLength:1000,'vector-effect':'non-scaling-stroke'};
  const line=svgNode('rect',{...attrs,stroke:`url(#${prefix}-rim)`,'stroke-width':1.85,'stroke-dasharray':'1000 1000','stroke-dashoffset':1000});
  const glow=svgNode('rect',{...attrs,stroke:'#78d6ff','stroke-width':7,'stroke-linecap':'round','stroke-dasharray':'66 1000',opacity:0});
  const glint=svgNode('rect',{...attrs,stroke:'#d5f6ff','stroke-width':2.7,'stroke-linecap':'round','stroke-dasharray':'66 1000',opacity:0});
  rim.append(defs,line,glow,glint);rim.setAttribute('hidden','');frame.append(rim);
  let active=false,settled=false;
  const styles=new Map(),attributes=new WeakMap();
  const style=(name,value)=>{if(styles.get(name)!==value){frame.style.setProperty(name,value);styles.set(name,value);}};
  const attribute=(element,name,value)=>{
    let values=attributes.get(element);if(!values){values=new Map();attributes.set(element,values);}
    if(values.get(name)!==value){element.setAttribute(name,value);values.set(name,value);}
  };
  const clear=()=>{
    active=false;settled=false;rim.setAttribute('hidden','');styles.clear();
    frame.classList.remove('artwork-stage-active','artwork-stage-playing');
    for(const key of ['--artwork-stage-y','--artwork-stage-rx','--artwork-stage-ry','--artwork-stage-halo','--artwork-stage-depth'])frame.style.removeProperty(key);
  };
  return {
    activate(){active=true;rim.removeAttribute('hidden');frame.classList.add('artwork-stage-active');},
    playing(value){frame.classList.toggle('artwork-stage-playing',active&&value&&!settled);},
    draw(elapsed,pointer){
      if(!active||settled&&elapsed>=1500)return;
      const sample=sampleArtworkStage(elapsed,pointer);
      style('--artwork-stage-y',`${sample.y.toFixed(3)}px`);
      style('--artwork-stage-rx',`${sample.rotateX.toFixed(3)}deg`);
      style('--artwork-stage-ry',`${sample.rotateY.toFixed(3)}deg`);
      style('--artwork-stage-depth',sample.depth.toFixed(3));
      style('--artwork-stage-halo',sample.halo.toFixed(3));
      attribute(line,'stroke-dashoffset',(1000*(1-sample.trace)).toFixed(3));
      attribute(line,'opacity',sample.borderOpacity.toFixed(3));
      for(const edge of [glow,glint])attribute(edge,'stroke-dashoffset',(-1000*sample.glint).toFixed(3));
      attribute(glow,'opacity',(sample.glintOpacity*.24).toFixed(3));
      attribute(glint,'opacity',sample.glintOpacity.toFixed(3));
      settled=elapsed>=1500;
      if(settled)frame.classList.remove('artwork-stage-playing');
    },
    reset:clear,
    dispose(){clear();rim.remove();}
  };
}
function loadedImage(source,images){
  return new Promise((resolve,reject)=>{
    const image=new Image();image.decoding='async';let settled=false;
    const finish=(error=null)=>{if(settled)return;settled=true;image.onload=null;image.onerror=null;images.delete(image);if(error)reject(error);else resolve(image);};
    images.set(image,()=>{finish(new Error('Illustration loading cancelled'));image.removeAttribute('src');});
    image.onload=async()=>{try{await image.decode();finish();}catch(error){finish(error);}};
    image.onerror=()=>finish(new Error('Illustration could not be decoded'));
    image.src=source;
  });
}

export function createArtworkAssetCache(load){
  const cache=new Map();
  return {load(source){
    if(!cache.has(source))cache.set(source,Promise.resolve().then(()=>load(source)).catch(error=>{cache.delete(source);throw error;}));
    return cache.get(source);
  }};
}
const assetCache=createArtworkAssetCache(source=>loadedImage(source,new Map()));
function artworkSources(round,scene){
  const original=new URL(artworkSource(round),import.meta.url).href;
  if(scene.sprites.every(sprite=>sprite.motion==='fixed'))return {original,clean:original};
  const cleanURL=new URL(scene.cleanPath??`./artwork/motion/${round.number}-clean.webp`,import.meta.url);
  const revision=new URL(import.meta.url).searchParams.get('v');
  if(revision&&!cleanURL.searchParams.has('v'))cleanURL.searchParams.set('v',revision);
  return {original,clean:cleanURL.href};
}
function prepareAssets(round,scene){return Promise.all(Object.values(artworkSources(round,scene)).map(source=>assetCache.load(source)));}
export async function preloadArtwork(round){
  const scene=artworkMotionData[round.number];
  if(!scene||matchMedia('(prefers-reduced-motion: reduce)').matches)return false;
  try{await prepareAssets(round,scene);return true;}catch{return false;}
}

// This is a cutout animation of the actual completed artwork. Original pixels
// provide every moving object; a local clean plate only replaces its old position.
export function animatedArtwork(round,{board,autoplay=false,guided=false,onInteract=()=>{}}={}){
  const scene=artworkMotionData[round.number];
  if(!scene||!board)return null;
  const prefix=`artwork-motion-${round.number}-${++instance}`;
  const stage=createArtworkStage(board,prefix);
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const element=node('div','artwork-motion-layer');element.hidden=true;element.dataset.state='loading';
  const svg=svgNode('svg',{viewBox:'0 0 800 600',role:'img','aria-labelledby':`${prefix}-title ${prefix}-description`});
  const title=svgNode('title',{id:`${prefix}-title`});title.textContent=scene.label;
  const description=svgNode('desc',{id:`${prefix}-description`});description.textContent=scene.description??round.illustration.takeaway;
  const defs=svgNode('defs');
  const feather=svgNode('filter',{id:`${prefix}-feather`,filterUnits:'userSpaceOnUse',x:-10,y:-10,width:820,height:620});
  feather.append(svgNode('feGaussianBlur',{stdDeviation:1.25}));defs.append(feather);
  const {original,clean}=artworkSources(round,scene);
  // Defer SVG image requests too: reduced-motion users need only the static board.
  const image=source=>svgNode('image',{'data-artwork-src':source,x:0,y:0,width:800,height:600,preserveAspectRatio:'none'});
  svg.append(title,description,defs,image(original));
  // A single static union mask avoids a full-canvas blur surface for each sprite.
  // In the ten-ion scene this replaces ten filtered layers with one.
  const patchId=`${prefix}-patches`;
  const mask=svgNode('mask',{id:patchId,maskUnits:'userSpaceOnUse',maskContentUnits:'userSpaceOnUse',x:0,y:0,width:800,height:600,'mask-type':'alpha'});
  const patchShapes=svgNode('g',{filter:`url(#${prefix}-feather)`});mask.append(patchShapes);defs.append(mask);
  const cleanPatch=image(clean);cleanPatch.setAttribute('mask',`url(#${patchId})`);cleanPatch.setAttribute('aria-hidden','true');
  const movingObjects=svgNode('g',{'aria-hidden':'true'});
  const sprites=scene.sprites.filter(sprite=>sprite.motion!=='fixed').map((sprite,index)=>{
    const clipId=`${prefix}-sprite-${index}`;
    patchShapes.append(createArtworkRemovalPatch(sprite));
    const clip=svgNode('clipPath',{id:clipId,clipPathUnits:'userSpaceOnUse'});clip.append(svgNode('path',{d:sprite.clip}));defs.append(clip);
    const group=svgNode('g',{'data-artwork-sprite':sprite.id??index});
    const cutout=image(original);cutout.setAttribute('clip-path',`url(#${clipId})`);group.append(cutout);movingObjects.append(group);
    return {data:sprite,group,elapsed:0};
  });
  const detailLayer=svgNode('g',{'aria-hidden':'true','data-artwork-details':''});
  const details=createArtworkDetails(round.number,{parent:detailLayer,sprites});
  svg.append(cleanPatch,detailLayer,movingObjects);element.append(svg);board.append(element);
  // The guide remains visible on the original still image when animation is
  // disabled or unavailable. No raster assets are needed to read the notes.
  const guideOverlay=svgNode('svg',{class:'artwork-guide-overlay',viewBox:'0 0 800 600','aria-hidden':'true',focusable:'false'});
  board.append(guideOverlay);
  // Navigation holds the selected note. Both animation controls operate the
  // same clock, including when the page pauses playback while out of view.
  const guide=createArtworkGuide(round,{parent:guideOverlay,guided,onNavigate:()=>{onInteract();},onPlayback:playing=>{if(playing)play();else pause();},onFocus:index=>{element.dataset.guideIndex=String(index);}});

  const controls=node('div','artwork-motion-controls');controls.setAttribute('role','group');controls.setAttribute('aria-label','Illustration animation');
  const button=node('button','tool artwork-motion-toggle','Animate image');button.type='button';button.disabled=true;button.setAttribute('aria-controls',prefix);button.setAttribute('aria-pressed','false');element.id=prefix;
  const icon=svgNode('svg',{viewBox:'0 0 20 20','aria-hidden':'true',focusable:'false'}),iconPath=svgNode('path',{d:'M7 4.5 15 10l-8 5.5Z'});icon.append(iconPath);
  const label=node('span','artwork-control-full','Animate image'),compactLabel=node('span','artwork-control-compact','Animate image');
  for(const copy of [label,compactLabel])copy.setAttribute('aria-hidden','true');button.replaceChildren(icon,label,compactLabel);
  const live=node('span','artwork-motion-live');live.setAttribute('aria-hidden','true');for(let i=0;i<3;i++)live.append(node('i'));
  const guideButton=node('button','tool artwork-guide-replay');guideButton.type='button';
  const guideLabel=node('span','artwork-control-full'),compactGuideLabel=node('span','artwork-control-compact');
  for(const copy of [guideLabel,compactGuideLabel])copy.setAttribute('aria-hidden','true');guideButton.append(guideLabel,compactGuideLabel);
  guide.caption.id=`${prefix}-guide`;guideButton.setAttribute('aria-controls',guide.caption.id);
  controls.append(button,live,guideButton);
  let disposed=false,assetsReady=false,failed=false,visible=false,pendingPlay=Boolean(autoplay)&&!media.matches,played=false;
  let loading=null,resolveDisposed;
  const disposedPromise=new Promise(resolve=>{resolveDisposed=()=>resolve(false);});
  const pointer={x:0,y:0},targetPointer={x:0,y:0};let lastDraw=0,lastOpacity=null,lastEntering=null;
  function paint(){
    controls.hidden=false;button.hidden=media.matches;live.hidden=media.matches;
    button.disabled=!assetsReady&&!failed;
    const copy=artworkControlLabels({failed,assetsReady,playing:clock.playing,elapsed:clock.elapsed});
    guideButton.disabled=false;guideLabel.textContent=copy.guide;compactGuideLabel.textContent=copy.guideCompact;guideButton.setAttribute('aria-label',copy.guide);
    label.textContent=copy.playback;compactLabel.textContent=copy.compact;button.setAttribute('aria-label',copy.playback);
    button.setAttribute('aria-pressed',String(clock.playing));
    controls.setAttribute('aria-label',media.matches?'Illustration guide':clock.playing?'Illustration animation, playing':'Illustration animation, paused');
    iconPath.setAttribute('d',clock.playing?'M6 4h3v12H6Zm5 0h3v12h-3Z':'M7 4.5 15 10l-8 5.5Z');
    controls.classList.toggle('is-playing',clock.playing);controls.classList.toggle('has-played',played);
    element.dataset.state=failed?'unavailable':!assetsReady?'loading':clock.playing?'playing':clock.elapsed>0?'paused':'ready';
    stage.playing(clock.playing);
    guide.draw(clock.elapsed,{reduced:media.matches||failed,playing:clock.playing});
    if(media.matches||!assetsReady)element.hidden=true;
  }
  function draw(position,elapsed=0){
    // The final piece has already settled before this clock starts. Give the
    // perimeter its one arrival, then bring the original biology into motion.
    const biologyElapsed=Math.max(0,elapsed-1700);
    const entrance=sampleArtworkEntrance(biologyElapsed);
    const delta=Math.max(0,elapsed-lastDraw),blend=1-Math.exp(-Math.min(64,delta)/170);lastDraw=elapsed;
    pointer.x+=(targetPointer.x-pointer.x)*blend;pointer.y+=(targetPointer.y-pointer.y)*blend;
    stage.draw(elapsed,pointer);
    guide.draw(elapsed,{reduced:media.matches,playing:clock.playing});
    element.dataset.guideIndex=String(guide.index);
    const focus=guide.focus;
    for(const sprite of sprites){
      const {data,group}=sprite;
      // Slow only ambient drift away from the current reading focus. Transport
      // and pathway events retain their authored trajectory and timing.
      if(biologyElapsed>0)sprite.elapsed+=Math.min(delta,biologyElapsed)*(data.motion==='float'?detailFocusWeight(data.center,focus):1);
      const frame=sampleArtworkMotion(data,data.motion==='float'?sprite.elapsed:biologyElapsed,scene.duration??18000,pointer),[cx,cy]=data.center??[400,300];
      group.setAttribute('transform',`translate(${frame.x} ${frame.y}) translate(${cx} ${cy}) rotate(${frame.rotate}) scale(${frame.scale}) translate(${-cx} ${-cy})`);
      group.setAttribute('opacity',String(frame.opacity));
    }
    details.draw(biologyElapsed,{focus});
    // Opacity is no longer touched after entry, and its compositor hint is released.
    const opacity=String(entrance.opacity),entering=entrance.opacity<1;
    if(opacity!==lastOpacity){element.style.opacity=opacity;lastOpacity=opacity;}
    if(entering!==lastEntering){element.classList.toggle('is-entering',entering);lastEntering=entering;}
  }
  const clock=createArtworkClock({duration:scene.duration??18000,loop:true,onFrame:draw,onState:paint});
  function maybePlay(){
    if(disposed||failed||!assetsReady||!visible||document.hidden||media.matches||!pendingPlay)return;
    pendingPlay=false;played=true;element.hidden=false;stage.activate();clock.play();
  }
  function play(){
    if(disposed||media.matches)return;
    pendingPlay=true;
    if(failed||!assetsReady){void loadAssets();return;}
    maybePlay();
  }
  function pause(){if(disposed)return;pendingPlay=false;clock.pause();}
  function replayGuide(){
    if(disposed)return;
    guide.restart(clock.elapsed);paint();
    if(!media.matches)play();
  }
  function focusLandmark(index){
    if(disposed)return;
    guide.select(index);element.dataset.guideIndex=String(guide.index);paint();
  }
  button.addEventListener('click',()=>{onInteract();if(clock.playing)pause();else play();});
  guideButton.addEventListener('click',()=>{onInteract();focusLandmark(guide.index<0?0:guide.index);});
  const visibility=()=>{if(document.hidden)pause();};
  const resetPointer=()=>{pointer.x=0;pointer.y=0;targetPointer.x=0;targetPointer.y=0;lastDraw=0;for(const sprite of sprites)sprite.elapsed=0;};
  const preference=()=>{pendingPlay=false;if(guide.enabled)guide.restart();resetPointer();clock.reset();stage.reset();element.hidden=true;paint();if(!media.matches)void loadAssets();};
  const pointerMove=event=>{
    if(event.pointerType==='touch'||media.matches||!clock.playing)return;
    const rect=board.getBoundingClientRect();if(!rect.width||!rect.height)return;
    targetPointer.x=signed((event.clientX-rect.left)/rect.width*2-1);targetPointer.y=signed((event.clientY-rect.top)/rect.height*2-1);
  };
  const pointerLeave=()=>{targetPointer.x=0;targetPointer.y=0;};
  const observer=new IntersectionObserver(entries=>{
    visible=entries.some(entry=>entry.target===board&&entry.isIntersecting&&entry.intersectionRatio>=.35);
    if(!visible&&clock.playing)pause();else if(visible)maybePlay();
  },{threshold:[0,.35]});
  document.addEventListener('visibilitychange',visibility);media.addEventListener('change',preference);board.addEventListener('pointermove',pointerMove,{passive:true});board.addEventListener('pointerleave',pointerLeave);observer.observe(board);
  draw(0);paint();
  function loadAssets(){
    if(disposed)return Promise.resolve(false);
    if(assetsReady)return Promise.resolve(true);
    if(loading)return loading;
    failed=false;paint();
    loading=Promise.race([prepareAssets(round,scene).then(()=>{
      if(disposed)return false;
      for(const image of svg.querySelectorAll('image[data-artwork-src]'))image.setAttribute('href',image.getAttribute('data-artwork-src'));
      assetsReady=true;paint();maybePlay();return true;
    }).catch(()=>{if(disposed)return false;failed=true;pendingPlay=false;element.hidden=true;guide.draw(clock.elapsed,{reduced:true});paint();return false;}),disposedPromise]).finally(()=>{loading=null;});
    return loading;
  }
  const ready=media.matches?Promise.resolve(false):loadAssets();
  return {
    element,controls,caption:guide.caption,ready,play,pause,replayGuide,focusLandmark,
    reset(){if(disposed)return;pendingPlay=false;guide.cancel();resetPointer();clock.reset();stage.reset();element.hidden=true;},
    dispose(){
      if(disposed)return;disposed=true;pendingPlay=false;resolveDisposed();clock.dispose();details.dispose();guide.dispose();guideOverlay.remove();stage.dispose();observer.disconnect();document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',preference);board.removeEventListener('pointermove',pointerMove);board.removeEventListener('pointerleave',pointerLeave);element.remove();controls.remove();
    }
  };
}

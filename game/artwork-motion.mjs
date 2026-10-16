import {artworkMotionData} from './artwork-motion-data.mjs';

const NS='http://www.w3.org/2000/svg';
const clamp=value=>Math.max(0,Math.min(1,value));
const signed=value=>Math.max(-1,Math.min(1,value));
const cycle=value=>((value%1)+1)%1;
let instance=0;

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

// Independent clocks keep neighboring objects from moving in lockstep. Secondary
// drift is optional and never changes the direction of a transport path.
export function sampleArtworkMotion(sprite,elapsed,duration=18000,pointer={x:0,y:0}){
  const position=cycle(elapsed/(sprite.period??duration)+(sprite.phase??0));
  const frame=interpolateArtworkSprite(sprite,position),secondary=sprite.secondary;
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
  return frame;
}

function svgNode(tag,attrs={}){const element=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))element.setAttribute(key,String(value));return element;}
function node(tag,className,text){const element=document.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;}
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
  const original=new URL(round.artwork,import.meta.url).href;
  const cleanURL=new URL(scene.cleanPath??`./artwork/motion/${round.number}-clean.png`,import.meta.url);
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
export function animatedArtwork(round,{board,autoplay=false}={}){
  const scene=artworkMotionData[round.number];
  if(!scene||!board)return null;
  const prefix=`artwork-motion-${round.number}-${++instance}`;
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
  const sprites=scene.sprites.map((sprite,index)=>{
    const clipId=`${prefix}-sprite-${index}`;
    patchShapes.append(svgNode('path',{d:sprite.patch??sprite.clip,fill:'#fff'}));
    const clip=svgNode('clipPath',{id:clipId,clipPathUnits:'userSpaceOnUse'});clip.append(svgNode('path',{d:sprite.clip}));defs.append(clip);
    const group=svgNode('g',{'data-artwork-sprite':sprite.id??index});
    const cutout=image(original);cutout.setAttribute('clip-path',`url(#${clipId})`);group.append(cutout);movingObjects.append(group);
    return {data:sprite,group};
  });
  const accentLayer=svgNode('g',{'aria-hidden':'true','data-artwork-accents':''});
  const accents=(scene.accents??[]).map((accent,index)=>{
    const group=svgNode('g',{'data-artwork-accent':accent.id??index,opacity:0});
    const paths=[3,1].map((scale,index)=>svgNode('path',{d:accent.path,fill:'none',stroke:accent.color??'#62d8ef','stroke-width':(accent.width??2.5)*scale,'stroke-linecap':'round',opacity:index?1:.24}));
    group.append(...paths);
    const parent=accent.target?sprites.find(sprite=>sprite.data.id===accent.target)?.group:accentLayer;
    (parent??accentLayer).append(group);return {data:accent,group,paths,length:0};
  });
  svg.append(cleanPatch,accentLayer,movingObjects);element.append(svg);board.append(element);
  for(const accent of accents){
    accent.length=accent.paths[0].getTotalLength();
    for(const path of accent.paths)path.setAttribute('stroke-dasharray',`${accent.length*clamp(accent.data.span??.12)} ${accent.length}`);
  }

  const controls=node('div','artwork-motion-controls');controls.setAttribute('role','group');controls.setAttribute('aria-label','Illustration animation');
  const button=node('button','tool artwork-motion-toggle','Play illustration');button.type='button';button.disabled=true;button.setAttribute('aria-controls',prefix);button.setAttribute('aria-pressed','false');element.id=prefix;
  const icon=svgNode('svg',{viewBox:'0 0 20 20','aria-hidden':'true',focusable:'false'}),iconPath=svgNode('path',{d:'M7 4.5 15 10l-8 5.5Z'});icon.append(iconPath);
  const label=node('span',null,'Play illustration');button.replaceChildren(icon,label);
  const live=node('span','artwork-motion-live');live.setAttribute('aria-hidden','true');for(let i=0;i<3;i++)live.append(node('i'));
  controls.append(button,live);
  let disposed=false,assetsReady=false,failed=false,visible=false,pendingPlay=Boolean(autoplay)&&!media.matches,played=false;
  let loading=null,resolveDisposed;
  const disposedPromise=new Promise(resolve=>{resolveDisposed=()=>resolve(false);});
  const pointer={x:0,y:0},targetPointer={x:0,y:0};let lastDraw=0;
  function paint(){
    controls.hidden=media.matches;button.disabled=!assetsReady&&!failed;
    label.textContent=failed?'Retry illustration':clock.playing?'Pause illustration':clock.elapsed>0?'Resume illustration':'Play illustration';
    button.setAttribute('aria-pressed',String(clock.playing));
    controls.setAttribute('aria-label',clock.playing?'Illustration animation, playing':'Illustration animation, paused');
    iconPath.setAttribute('d',clock.playing?'M6 4h3v12H6Zm5 0h3v12h-3Z':'M7 4.5 15 10l-8 5.5Z');
    controls.classList.toggle('is-playing',clock.playing);controls.classList.toggle('has-played',played);
    element.dataset.state=failed?'unavailable':!assetsReady?'loading':clock.playing?'playing':clock.elapsed>0?'paused':'ready';
    if(media.matches||!assetsReady)element.hidden=true;
  }
  function draw(position,elapsed=0){
    const blend=1-Math.exp(-Math.min(64,Math.max(0,elapsed-lastDraw))/170);lastDraw=elapsed;
    pointer.x+=(targetPointer.x-pointer.x)*blend;pointer.y+=(targetPointer.y-pointer.y)*blend;
    for(const {data,group} of sprites){
      const frame=sampleArtworkMotion(data,elapsed,scene.duration??18000,pointer),[cx,cy]=data.center??[400,300];
      group.setAttribute('transform',`translate(${frame.x} ${frame.y}) translate(${cx} ${cy}) rotate(${frame.rotate}) scale(${frame.scale}) translate(${-cx} ${-cy})`);
      group.setAttribute('opacity',String(frame.opacity));
    }
    for(const {data,group,paths,length} of accents){
      const progress=cycle(elapsed/(data.period??7000)+(data.phase??0));
      group.setAttribute('opacity',String(clamp(data.opacity??.16)*Math.pow(Math.sin(Math.PI*progress),2)));
      for(const path of paths)path.setAttribute('stroke-dashoffset',String(length*(1-progress)));
    }
    // Fade once on entry. Every subsequent cycle preserves the full image.
    element.style.opacity=String(clamp(elapsed/350));
  }
  const clock=createArtworkClock({duration:scene.duration??18000,loop:true,onFrame:draw,onState:paint});
  function maybePlay(){
    if(disposed||failed||!assetsReady||!visible||document.hidden||media.matches||!pendingPlay)return;
    pendingPlay=false;played=true;element.hidden=false;clock.play();
  }
  function play(){
    if(disposed||media.matches)return;
    pendingPlay=true;
    if(failed||!assetsReady){void loadAssets();return;}
    maybePlay();
  }
  function pause(){if(disposed)return;pendingPlay=false;clock.pause();}
  button.addEventListener('click',()=>{if(clock.playing)pause();else play();});
  const visibility=()=>{if(document.hidden)pause();};
  const resetPointer=()=>{pointer.x=0;pointer.y=0;targetPointer.x=0;targetPointer.y=0;lastDraw=0;};
  const preference=()=>{pendingPlay=false;resetPointer();clock.reset();element.hidden=true;paint();if(!media.matches)void loadAssets();};
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
    }).catch(()=>{if(disposed)return false;failed=true;pendingPlay=false;element.hidden=true;paint();return false;}),disposedPromise]).finally(()=>{loading=null;});
    return loading;
  }
  const ready=media.matches?Promise.resolve(false):loadAssets();
  return {
    element,controls,ready,play,pause,
    reset(){if(disposed)return;pendingPlay=false;resetPointer();clock.reset();element.hidden=true;},
    dispose(){
      if(disposed)return;disposed=true;pendingPlay=false;resolveDisposed();clock.dispose();observer.disconnect();document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',preference);board.removeEventListener('pointermove',pointerMove);board.removeEventListener('pointerleave',pointerLeave);element.remove();controls.remove();
    }
  };
}

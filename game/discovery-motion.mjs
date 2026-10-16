// Content appears immediately in its permanent list. This decorative connection
// gives a placed piece a quiet visual relationship with the newly revealed row.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const keyOf=item=>item.kind==='landmark'?`landmark:${item.index}`:`clue:${item.at}:${item.label??item.title}`;
const SEQUENCE_DURATION=1560,TRAVEL_DELAY=340,TRAVEL_DURATION=720;
const NS='http://www.w3.org/2000/svg';
let instance=0;

export function createDiscoveryQueue({onShow=()=>{},onEmpty=()=>{},duration=SEQUENCE_DURATION,schedule=setTimeout,cancel=clearTimeout,enabled=()=>true,batch=false}={}){
  const groups=[],seen=new Set();let timer=null,generation=0;
  function next(){
    if(!groups.length){onEmpty();return;}
    const token=generation,group=groups[0];
    onShow(group[0],group);
    // A target resolver may clear the queue during a restart or navigation.
    if(token!==generation||!groups.length)return;
    timer=schedule(()=>{
      if(token!==generation)return;
      timer=null;groups.shift();
      if(!enabled()){clear();return;}
      next();
    },duration);
  }
  function clear(){generation++;if(timer!==null)cancel(timer);timer=null;groups.length=0;seen.clear();onEmpty();}
  return {
    get current(){return groups[0]?.[0]??null;},get size(){return groups.reduce((size,group)=>size+group.length,0);},
    push(incoming){
      if(!enabled())return;
      const empty=groups.length===0,fresh=[];
      for(const item of incoming){const key=keyOf(item);if(!seen.has(key)){seen.add(key);fresh.push(item);}}
      if(fresh.length)groups.push(...(batch?[fresh]:fresh.map(item=>[item])));
      if(empty&&groups.length)next();
    },
    clear
  };
}

function viewport(){const view=window.visualViewport;return {left:view?.offsetLeft??0,top:view?.offsetTop??0,width:view?.width??innerWidth,height:view?.height??innerHeight};}
function visible(rect,view){return rect.width>0&&rect.height>0&&rect.right>view.left&&rect.left<view.left+view.width&&rect.bottom>view.top&&rect.top<view.top+view.height;}
function pointOnBoard(board,point){
  const rect=board.getBoundingClientRect();
  return {x:rect.left+rect.width*clamp(point?.x??50,0,100)/100,y:rect.top+rect.height*clamp(point?.y??50,0,100)/100};
}
function curvePoint(start,c1,c2,end,t){
  const u=1-t;
  return {x:u*u*u*start.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*end.x,y:u*u*u*start.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*end.y};
}

// Pure geometry keeps the curve inside the visible viewport, including when
// Safari's visual viewport is offset by pinch zoom. Samples follow equal arc
// distances; WAAPI supplies the temporal easing without a JavaScript frame loop.
export function discoveryGeometry({origin,destination,view,targetPoint}){
  if(!origin||!destination||!view||view.width<40||view.height<40||!visible(destination,view))return null;
  if(origin.x<view.left||origin.x>view.left+view.width||origin.y<view.top||origin.y>view.top+view.height)return null;
  const constrain=point=>({x:clamp(point.x,8,view.width-8),y:clamp(point.y,8,view.height-8)});
  const start=constrain({x:origin.x-view.left,y:origin.y-view.top});
  const end=constrain({x:(targetPoint?.x??destination.left+Math.min(19,destination.width/2))-view.left,y:(targetPoint?.y??destination.top+Math.min(22,destination.height/2))-view.top});
  const dx=end.x-start.x,dy=end.y-start.y,distance=Math.hypot(dx,dy);
  if(distance<14)return null;
  const horizontal=view.width>=640&&Math.abs(dx)>=Math.abs(dy)*.8;
  const lift=Math.min(20,distance*.045);
  const c1=constrain(horizontal?{x:start.x+dx*.42,y:start.y-lift}:{x:start.x+Math.sign(dx||1)*lift,y:start.y+dy*.4});
  const c2=constrain(horizontal?{x:end.x-dx*.35,y:end.y}:{x:end.x,y:end.y-dy*.35});
  const trace=Array.from({length:97},(_,index)=>curvePoint(start,c1,c2,end,index/96));
  const lengths=[0];
  for(let i=1;i<trace.length;i++)lengths.push(lengths[i-1]+Math.hypot(trace[i].x-trace[i-1].x,trace[i].y-trace[i-1].y));
  const length=lengths.at(-1),samples=[];let segment=1;
  for(let i=0;i<=48;i++){
    const travelled=length*i/48;
    while(segment<lengths.length-1&&lengths[segment]<travelled)segment++;
    const ratio=(travelled-lengths[segment-1])/(lengths[segment]-lengths[segment-1]||1),a=trace[segment-1],b=trace[segment];
    samples.push({x:a.x+(b.x-a.x)*ratio,y:a.y+(b.y-a.y)*ratio});
  }
  const point=({x,y})=>`${x.toFixed(2)} ${y.toFixed(2)}`;
  const path=`M ${point(start)} C ${point(c1)}, ${point(c2)}, ${point(end)}`;
  const left=clamp(destination.left-view.left,0,view.width),top=clamp(destination.top-view.top,0,view.height);
  const bounds={left,top,width:Math.max(0,Math.min(destination.right-view.left,view.width)-left),height:Math.max(0,Math.min(destination.bottom-view.top,view.height)-top)};
  return {start,end,c1,c2,path,length,samples,bounds};
}
function svg(tag,attributes={}){const element=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attributes))element.setAttribute(key,String(value));return element;}

export function discoveryMotion({board,target=()=>null,schedule=setTimeout,cancel=clearTimeout}){
  const effects=new Set(),animations=new Set(),checks=new Set(),media=matchMedia('(prefers-reduced-motion: reduce)');
  let disposed=false,effectGeneration=0;
  const enabled=()=>!disposed&&!media.matches&&!document.hidden&&!document.querySelector('dialog[open]');
  function removeEffects(){
    effectGeneration++;for(const timer of checks)cancel(timer);checks.clear();
    for(const animation of animations)animation.cancel();animations.clear();for(const effect of effects)effect.remove();effects.clear();
  }
  function animate(element,frames,options){
    const animation=element.animate(frames,options);animations.add(animation);
    animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));return animation;
  }
  function flight(_item,items){
    removeEffects();
    const view=viewport(),generation=effectGeneration;
    if(!enabled()||!board.isConnected||!visible(board.getBoundingClientRect(),view))return;
    const origin=pointOnBoard(board,items[0].point),destinations=new Set(),connections=[];
    for(const item of items){
      const destination=target(item);
      // A resolver may synchronously clear/dispose while the queue is showing.
      if(generation!==effectGeneration||!enabled())return;
      if(!destination?.isConnected||destinations.has(destination))continue;
      destinations.add(destination);
      const badge=destination.querySelector('.clue-number,.strip-badge'),badgeRect=badge?.getBoundingClientRect();
      const targetPoint=badgeRect?.width?{x:badgeRect.left+badgeRect.width/2,y:badgeRect.top+badgeRect.height/2}:null;
      const bounds=destination.getBoundingClientRect();
      const geometry=discoveryGeometry({origin,destination:bounds,view,targetPoint});
      if(geometry)connections.push({...geometry,destination,anchor:{left:bounds.left,top:bounds.top,width:bounds.width,height:bounds.height}});
    }
    if(!connections.length)return;
    // New clues can move an existing image-note row without scrolling. Check at
    // the two visual handoffs instead of letting a stale route highlight another
    // row, or polling layout on every animation frame. The content stays put.
    function checkAnchors(delay){
      const timer=schedule(()=>{
        checks.delete(timer);
        if(generation!==effectGeneration)return;
        const stable=enabled()&&connections.every(({destination,anchor})=>{
          if(!destination.isConnected)return false;
          const current=destination.getBoundingClientRect();
          return ['left','top','width','height'].every(key=>Math.abs(current[key]-anchor[key])<=2);
        });
        if(!stable)removeEffects();
      },delay);
      checks.add(timer);
    }
    checkAnchors(TRAVEL_DELAY-20);
    checkAnchors(TRAVEL_DELAY+TRAVEL_DURATION-90);
    const layer=svg('svg',{class:'discovery-connection','aria-hidden':'true',focusable:'false',viewBox:`0 0 ${view.width} ${view.height}`});
    Object.assign(layer.style,{left:`${view.left}px`,top:`${view.top}px`,width:`${view.width}px`,height:`${view.height}px`});
    const id=`discovery-${++instance}`,defs=svg('defs');
    const glow=svg('radialGradient',{id:`${id}-glow`});glow.append(svg('stop',{offset:0,'stop-color':'#3673ff','stop-opacity':.3}),svg('stop',{offset:1,'stop-color':'#3673ff','stop-opacity':0}));
    const wash=svg('linearGradient',{id:`${id}-wash`});wash.append(svg('stop',{offset:0,'stop-color':'#3475ff','stop-opacity':.12}),svg('stop',{offset:1,'stop-color':'#3475ff','stop-opacity':0}));
    defs.append(glow,wash);layer.append(defs);document.body.append(layer);effects.add(layer);
    const source=svg('g',{class:'discovery-source'}),start=connections[0].start;
    source.append(svg('circle',{r:23,fill:`url(#${id}-glow)`}),svg('circle',{r:14,class:'discovery-source-ring'}),svg('circle',{r:2.4,class:'discovery-source-core'}));layer.append(source);
    const sourceTransform=scale=>`translate(${start.x}px,${start.y}px) scale(${scale})`;
    animate(source,[{opacity:0,transform:sourceTransform(.78)},{opacity:1,transform:sourceTransform(1),offset:.32},{opacity:0,transform:sourceTransform(1.12)}],{delay:180,duration:510,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
    connections.forEach((geometry,index)=>{
      const {path,length,samples,bounds}=geometry,stagger=Math.min(index*55,110),delay=TRAVEL_DELAY+stagger;
      const guide=svg('path',{d:path,class:'discovery-guide'});layer.append(guide);
      animate(guide,[{opacity:0},{opacity:1,offset:.22},{opacity:.7,offset:.72},{opacity:0}],{delay:delay-75,duration:TRAVEL_DURATION+220,easing:'linear',fill:'both'});
      const trailLength=clamp(length*.065,12,24),trail=svg('path',{d:path,class:'discovery-signal-trail','stroke-dasharray':`${trailLength} ${length+trailLength}`});layer.append(trail);
      animate(trail,[{strokeDashoffset:String(trailLength)},{strokeDashoffset:String(-length)}],{delay,duration:TRAVEL_DURATION,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'});
      animate(trail,[{opacity:0},{opacity:1,offset:.12},{opacity:.9,offset:.86},{opacity:0}],{delay,duration:TRAVEL_DURATION,easing:'linear',fill:'both'});
      const signal=svg('g',{class:'discovery-signal'});signal.append(svg('circle',{r:8,class:'discovery-signal-aura'}),svg('circle',{r:2.8,class:'discovery-signal-core'}),svg('circle',{r:1.1,class:'discovery-signal-light'}));layer.append(signal);
      animate(signal,samples.map(({x,y},i)=>({transform:`translate(${x}px,${y}px)`,offset:i/(samples.length-1)})),{delay,duration:TRAVEL_DURATION,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'});
      animate(signal,[{opacity:0},{opacity:1,offset:.1},{opacity:1,offset:.86},{opacity:0}],{delay,duration:TRAVEL_DURATION,easing:'linear',fill:'both'});
      const landing=svg('g',{class:'discovery-landing'});
      landing.append(svg('rect',{x:bounds.left,y:bounds.top,width:bounds.width,height:Math.min(bounds.height,120),rx:7,fill:`url(#${id}-wash)`}),svg('path',{d:`M ${bounds.left+1} ${bounds.top+8} v ${Math.max(0,Math.min(bounds.height,120)-16)}`,class:'discovery-landing-accent'}));layer.append(landing);
      animate(landing,[{opacity:0},{opacity:1,offset:.28},{opacity:0}],{delay:delay+TRAVEL_DURATION-60,duration:440,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
    });
  }
  const queue=createDiscoveryQueue({onShow:flight,onEmpty:removeEffects,enabled,batch:true,schedule,cancel});
  const clear=()=>queue.clear();
  const visibility=()=>{if(document.hidden)clear();};
  const dialogChange=event=>{if(event.target?.matches?.('dialog')&&event.target.open)clear();};
  window.addEventListener('resize',clear);window.addEventListener('scroll',clear,{passive:true,capture:true});
  window.visualViewport?.addEventListener('resize',clear);window.visualViewport?.addEventListener('scroll',clear);
  document.addEventListener('visibilitychange',visibility);document.addEventListener('toggle',dialogChange,true);media.addEventListener('change',clear);
  return {
    show(items,{point}={}){queue.push(items.map(item=>({...item,point:item.point??point??{x:50,y:50}})));},
    clear,
    dispose(){
      disposed=true;clear();window.removeEventListener('resize',clear);window.removeEventListener('scroll',clear,true);
      window.visualViewport?.removeEventListener('resize',clear);window.visualViewport?.removeEventListener('scroll',clear);
      document.removeEventListener('visibilitychange',visibility);document.removeEventListener('toggle',dialogChange,true);media.removeEventListener('change',clear);
    }
  };
}

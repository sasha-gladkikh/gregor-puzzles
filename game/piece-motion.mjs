const NS='http://www.w3.org/2000/svg';
export const PLACEMENT_DURATION=340;

// The visible board is a grid, not a set of inscribed circles. Accept corners
// and a small forgiveness zone without letting a distant neighboring slot snap.
export function dropMatchesSlot(id,{x,y}={}, {COLS,ROWS,CW,CH,tolerance=.08}={}){
  if(!Number.isInteger(id)||![x,y,COLS,ROWS,CW,CH,tolerance].every(Number.isFinite)||COLS<=0||ROWS<=0||CW<=0||CH<=0||id<0||id>=COLS*ROWS)return false;
  const edge=Math.min(.2,Math.max(0,tolerance)),left=id%COLS*CW,top=Math.floor(id/COLS)*CH;
  return x>=left-CW*edge&&x<=left+CW*(1+edge)&&y>=top-CH*edge&&y<=top+CH*(1+edge);
}

// SVG's default xMidYMid meet fitting can leave letterboxing in a tray button.
// Follow the drawn piece, not the larger rectangular SVG viewport around it.
export function fittedRect(rect,width,height){
  if(!rect||![rect.left,rect.top,rect.width,rect.height,width,height].every(Number.isFinite)||rect.width<=0||rect.height<=0||width<=0||height<=0)return null;
  const scale=Math.min(rect.width/width,rect.height/height),w=width*scale,h=height*scale;
  return {left:rect.left+(rect.width-w)/2,top:rect.top+(rect.height-h)/2,width:w,height:h};
}

export function pieceFlightGeometry(id,source,board,{COLS,W,H,CW,CH,pad}){
  const figure=fittedRect(board,W,H),from=fittedRect(source,CW+2*pad,CH+2*pad);
  if(!figure||!from||!Number.isInteger(id)||id<0||id>=COLS*(H/CH))return null;
  const scale=figure.width/W;
  const target={left:figure.left+(id%COLS*CW-pad)*scale,top:figure.top+(Math.floor(id/COLS)*CH-pad)*scale,width:(CW+2*pad)*scale,height:(CH+2*pad)*scale};
  return {from,target,dx:target.left+target.width/2-from.left-from.width/2,dy:target.top+target.height/2-from.top-from.height/2,scale:target.width/from.width};
}

export function pieceFlightFrames({dx,dy,scale}){
  const arch=Math.min(24,Math.hypot(dx,dy)*.045),turn=Math.sign(dx)*1.2;
  return Array.from({length:17},(_,i)=>{
    const t=i/16,lift=i===0||i===16?0:Math.sin(Math.PI*t),size=1+(scale-1)*t;
    return {offset:t,transform:`translate(${dx*t}px,${dy*t-arch*lift}px) scale(${size}) rotate(${turn*lift}deg)`,filter:`drop-shadow(0 ${5*lift}px ${4*lift}px #183d6a22)`};
  });
}

export function createPieceMotion({board,makePiece,pathFor,COLS,W,H,CW,CH,pad,reduceMotion=()=>false,onCancel=()=>{}}){
  const document=board.ownerDocument??globalThis.document,window=document.defaultView??globalThis.window;
  const media=window.matchMedia?.('(prefers-reduced-motion: reduce)')??globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const active=new Map();let disposed=false,sequence=0;
  const svg=(tag,attrs)=>{const element=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))element.setAttribute(key,String(value));return element;};
  const restore=record=>{record.target.style.opacity=record.opacity;};
  function remove(record,cancelled=false){
    if(record.removed)return;
    record.removed=true;
    record.flight?.cancel();record.traceAnimation?.cancel();record.ghost?.remove();record.trace?.remove();restore(record);
    if(active.get(record.id)===record)active.delete(record.id);
    record.resolve({cancelled});
  }
  function clear(){
    const hadMotion=active.size>0;
    for(const record of [...active.values()])remove(record,true);
    if(hadMotion)onCancel();
  }
  const canAnimate=()=>!disposed&&!document.hidden&&!document.querySelector('dialog[open]')&&!reduceMotion()&&!media?.matches;
  const connected=record=>board.isConnected&&record.target.isConnected&&board.contains(record.target);
  function trace(record){
    restore(record);record.ghost?.remove();record.ghost=null;
    record.resolve({cancelled:false});
    if(record.removed||!connected(record)||!canAnimate()){remove(record);return;}
    const line=svg('path',{d:pathFor(record.id),class:'piece-contact-trace',pathLength:100,'aria-hidden':'true','pointer-events':'none','vector-effect':'non-scaling-stroke'});
    record.trace=line;board.append(line);
    try{
      record.traceAnimation=line.animate([
        {strokeDashoffset:100,opacity:0},
        {strokeDashoffset:78,opacity:.75,offset:.2},
        {strokeDashoffset:0,opacity:0}
      ],{duration:300,easing:'cubic-bezier(.22,.61,.36,1)',fill:'both'});
      record.traceAnimation.finished.then(()=>remove(record),()=>remove(record,true));
    }catch{remove(record);}
  }
  function place(id,source){
    const previous=active.get(id);if(previous)remove(previous,true);
    const target=board.querySelector(`[data-slot="${id}"] .piece-on-board`);
    if(disposed||!board.isConnected||!target?.isConnected||document.hidden||document.querySelector('dialog[open]'))return Promise.resolve({cancelled:true});
    if(!canAnimate())return Promise.resolve({cancelled:false});
    let resolve;const contact=new Promise(done=>{resolve=done;});
    const record={id,target,opacity:target.style.opacity,resolve,removed:false};active.set(id,record);
    const rect=board.getBoundingClientRect(),geometry=pieceFlightGeometry(id,source,rect,{COLS,W,H,CW,CH,pad});
    if(!geometry||geometry.from.top+geometry.from.height<0||geometry.from.top>window.innerHeight){trace(record);return contact;}
    const ghost=svg('svg',{viewBox:`${id%COLS*CW-pad} ${Math.floor(id/COLS)*CH-pad} ${CW+2*pad} ${CH+2*pad}`,class:'piece-flight','aria-hidden':'true',focusable:'false'});
    ghost.append(makePiece(id,`piece-flight-${++sequence}-`));record.ghost=ghost;
    Object.assign(ghost.style,{left:`${geometry.from.left}px`,top:`${geometry.from.top}px`,width:`${geometry.from.width}px`,height:`${geometry.from.height}px`});
    document.body.append(ghost);target.style.opacity='0';
    try{
      record.flight=ghost.animate(pieceFlightFrames(geometry),{duration:PLACEMENT_DURATION,easing:'cubic-bezier(.22,.8,.28,1)',fill:'forwards'});
      record.flight.finished.then(()=>{
        if(record.removed)return;
        const current=board.getBoundingClientRect();
        if(!connected(record)||!canAnimate()||['left','top','width','height'].some(key=>Math.abs(current[key]-rect[key])>1)){remove(record,true);return;}
        trace(record);
      },()=>remove(record,true));
    }catch{remove(record);}
    return contact;
  }
  const hidden=()=>{if(document.hidden)clear();};
  const preference=()=>{if(media?.matches||reduceMotion())clear();};
  const dialog=event=>{if(event.newState==='open'&&event.target?.tagName==='DIALOG')clear();};
  const Observer=window.MutationObserver??globalThis.MutationObserver;
  const observer=Observer?new Observer(()=>{
    if(document.querySelector('dialog[open]')){clear();return;}
    for(const record of [...active.values()])if(!connected(record))remove(record,true);
  }):null;
  observer?.observe(board,{childList:true,subtree:true});
  observer?.observe(document.body,{attributes:true,attributeFilter:['open'],subtree:true});
  window.addEventListener('scroll',clear,{passive:true,capture:true});window.addEventListener('resize',clear);
  window.addEventListener('pagehide',clear);window.visualViewport?.addEventListener('resize',clear);window.visualViewport?.addEventListener('scroll',clear);
  document.addEventListener('visibilitychange',hidden);document.addEventListener('beforetoggle',dialog,true);media?.addEventListener('change',preference);
  return {place,clear,dispose(){
    if(disposed)return;disposed=true;clear();observer?.disconnect();
    window.removeEventListener('scroll',clear,true);window.removeEventListener('resize',clear);window.removeEventListener('pagehide',clear);
    window.visualViewport?.removeEventListener('resize',clear);window.visualViewport?.removeEventListener('scroll',clear);
    document.removeEventListener('visibilitychange',hidden);document.removeEventListener('beforetoggle',dialog,true);media?.removeEventListener('change',preference);
  }};
}

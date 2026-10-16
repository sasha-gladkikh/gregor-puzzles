// Discoveries stay readable until acknowledged. Animation connects a structure to
// its explanation; it never represents a molecule's physical trajectory.
let nextDiscoveryId=0;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const textOf=item=>item.text??item.body??'';
const keyOf=item=>item.kind==='landmark'?`landmark:${item.index}`:`clue:${item.at}:${item.label??item.title}`;

// Queue state is independent of motion, so quick placements cannot replace an
// unread explanation and reduced-motion users receive exactly the same content.
export function createDiscoveryQueue({onShow=()=>{},onKeep=()=>{},onEmpty=()=>{},onChange=()=>{}}={}){
  const items=[],seen=new Set();
  return {
    get current(){return items[0]??null;},get size(){return items.length;},
    push(incoming){
      const empty=items.length===0;
      for(const item of incoming){const key=keyOf(item);if(!seen.has(key)){seen.add(key);items.push(item);}}
      if(empty&&items.length)onShow(items[0]);
      onChange(items.length);
    },
    keep(){
      if(!items.length)return;
      onKeep(items.shift());
      if(items.length)onShow(items[0]);else onEmpty();
      onChange(items.length);
    },
    clear(){items.length=0;seen.clear();onEmpty();onChange(0);}
  };
}

function el(tag,className,text){
  const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;
}
function viewport(){const v=window.visualViewport;return {left:v?.offsetLeft??0,top:v?.offsetTop??0,width:v?.width??innerWidth,height:v?.height??innerHeight};}
function pointOnBoard(board,point){
  const rect=board.getBoundingClientRect();
  return {x:rect.left+rect.width*clamp(point?.x??50,0,100)/100,y:rect.top+rect.height*clamp(point?.y??50,0,100)/100};
}
function center(element){const r=element.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}
function svgLayer(className){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.classList.add(className);svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
  svg.setAttribute('width',String(innerWidth));svg.setAttribute('height',String(innerHeight));
  document.body.append(svg);return svg;
}
function svgNode(tag,attributes){const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));return node;}

export function discoveryMotion({board,target=()=>null,onKeep=()=>{}}){
  const id=`discovery-popout-${++nextDiscoveryId}`;
  const card=el('section','discovery-popout');card.hidden=true;card.setAttribute('aria-labelledby',`${id}-title`);card.setAttribute('aria-describedby',`${id}-text`);
  const head=el('div','discovery-popout-head'),label=el('span','discovery-popout-label','New discovery'),count=el('span','discovery-popout-count');
  head.append(label,count);
  const copy=el('div','discovery-popout-copy'),title=el('h3'),text=el('p');title.id=`${id}-title`;text.id=`${id}-text`;copy.append(title,text);
  const footer=el('div','discovery-popout-footer'),hint=el('span',null,'Saved with your clues'),keep=el('button','discovery-keep','Keep clue →');keep.type='button';footer.append(hint,keep);card.append(head,copy,footer);
  const announcer=el('div','discovery-announcer');announcer.setAttribute('role','status');announcer.setAttribute('aria-live','polite');announcer.setAttribute('aria-atomic','true');
  document.body.append(card,announcer);
  const effects=new Set(),animations=new Set(),media=matchMedia('(prefers-reduced-motion: reduce)');
  let disposed=false,current=null,frame=null;
  const animate=(element,frames,options)=>{
    const animation=element.animate(frames,options);animations.add(animation);
    animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));return animation;
  };
  function removeEffects(){for(const animation of animations)animation.cancel();animations.clear();for(const effect of effects)effect.remove();effects.clear();}
  function position(){
    if(card.hidden)return;
    const view=viewport(),margin=12;
    if(view.width<=700){
      card.style.left=`${view.left+margin}px`;card.style.width=`${view.width-margin*2}px`;
      card.style.top='auto';card.style.bottom=`calc(max(12px, env(safe-area-inset-bottom)) + ${Math.max(0,innerHeight-view.top-view.height)}px)`;
    }else{
      const rect=board.getBoundingClientRect(),point=pointOnBoard(board,current?.point),width=Math.min(320,view.width-32);
      card.style.width=`${width}px`;card.style.bottom='auto';
      const left=current?.point?.x>=50?rect.left+16:rect.right-width-16;
      card.style.left=`${clamp(left,view.left+16,view.left+view.width-width-16)}px`;
      card.style.top=`${clamp(point.y-72,view.top+16,view.top+view.height-card.offsetHeight-16)}px`;
    }
  }
  function arrive(item){
    if(reduced())return;
    const origin=pointOnBoard(board,item.point),rect=card.getBoundingClientRect();
    const glow=el('div','discovery-origin-glow');glow.setAttribute('aria-hidden','true');glow.style.left=`${origin.x}px`;glow.style.top=`${origin.y}px`;document.body.append(glow);effects.add(glow);
    const line=svgLayer('discovery-connection');effects.add(line);
    const to={x:clamp(origin.x,rect.left+20,rect.right-20),y:origin.y<rect.top?rect.top:origin.y>rect.bottom?rect.bottom:rect.top+22};
    const path=svgNode('path',{d:`M ${origin.x} ${origin.y} Q ${origin.x} ${to.y} ${to.x} ${to.y}`,fill:'none',stroke:'#064dff','stroke-width':1.5,'stroke-linecap':'round'});
    line.append(path);const length=path.getTotalLength();path.style.strokeDasharray=String(length);path.style.strokeDashoffset=String(length);
    animate(path,[{strokeDashoffset:length,opacity:.65},{strokeDashoffset:0,opacity:.65,offset:.65},{strokeDashoffset:0,opacity:0}],{duration:850,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>{line.remove();effects.delete(line);});
    animate(glow,[{opacity:0,transform:'translate(-50%,-50%) scale(.65)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.25},{opacity:0,transform:'translate(-50%,-50%) scale(1.25)'}],{duration:1400,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>{glow.remove();effects.delete(glow);});
    animate(card,[{opacity:0,transform:`translate(${clamp(origin.x-rect.left-rect.width/2,-24,24)}px, ${clamp(origin.y-rect.top-rect.height/2,-18,18)}px) scale(.97)`},{opacity:1,transform:'none'}],{duration:340,delay:240,fill:'backwards',easing:'cubic-bezier(.2,.7,.25,1)'});
  }
  function send(item){
    const from=card.getBoundingClientRect(),hadFocus=card.contains(document.activeElement);
    onKeep(item);
    const destination=target();
    if(hadFocus&&queue.size===0&&destination)destination.focus?.({preventScroll:true});
    if(reduced()||!destination)return;
    const to=destination.getBoundingClientRect(),view=viewport();
    if(!to.width||!to.height||to.bottom<view.top||to.top>view.top+view.height)return;
    const chip=el('span','discovery-travel-chip','✦ Clue');chip.setAttribute('aria-hidden','true');chip.style.left=`${from.left+from.width/2-38}px`;chip.style.top=`${from.top+from.height/2-16}px`;document.body.append(chip);effects.add(chip);
    const dx=to.left+to.width/2-(from.left+from.width/2),dy=to.top+Math.min(to.height/2,36)-(from.top+from.height/2);
    animate(chip,[{opacity:0,transform:'scale(.85)'},{opacity:1,transform:'scale(1)',offset:.12},{opacity:.9,transform:`translate(${dx}px,${dy}px) scale(.75)`,offset:.85},{opacity:0,transform:`translate(${dx}px,${dy}px) scale(.55)`}],{duration:620,easing:'cubic-bezier(.4,0,.2,1)'}).finished.then(()=>{
      if(!disposed&&destination.isConnected)animate(destination,[{boxShadow:'0 0 0 0 #064dff30'},{boxShadow:'0 0 0 7px #064dff15',offset:.5},{boxShadow:'0 0 0 0 #064dff00'}],{duration:550,easing:'ease-out'});
    }).catch(()=>{}).finally(()=>{chip.remove();effects.delete(chip);});
  }
  const queue=createDiscoveryQueue({
    onShow(item){current=item;title.textContent=item.title;text.textContent=textOf(item);label.textContent=item.kind==='landmark'?'Inside the image':item.label??'New discovery';card.hidden=false;copy.scrollTop=0;position();arrive(item);announcer.textContent=`New discovery. ${item.title}. ${textOf(item)}`;},
    onKeep:send,
    onEmpty(){current=null;card.hidden=true;announcer.textContent='';},
    onChange(size){count.textContent=size>1?`${size} to explore`:'';keep.textContent=size>1?'Keep & next →':'Keep clue →';}
  });
  keep.addEventListener('click',()=>queue.keep());
  const clear=()=>{queue.clear();removeEffects();};
  const reflow=()=>{if(frame===null)frame=requestAnimationFrame(()=>{frame=null;position();});};
  const visibility=()=>{if(document.hidden)clear();};
  const motionChange=()=>{removeEffects();position();};
  const escape=event=>{
    if(event.key!=='Escape'||event.defaultPrevented||!queue.current||document.querySelector('dialog[open]'))return;
    const focused=document.activeElement;
    if(!card.contains(focused)&&(focused?.matches('input,textarea,select,[contenteditable="true"]')||board.closest('#game')?.querySelector('.piece[aria-pressed="true"]')))return;
    event.preventDefault();queue.keep();
  };
  window.addEventListener('resize',reflow);window.addEventListener('scroll',reflow,{passive:true});window.visualViewport?.addEventListener('resize',reflow);window.visualViewport?.addEventListener('scroll',reflow);
  document.addEventListener('visibilitychange',visibility);document.addEventListener('keydown',escape);media.addEventListener('change',motionChange);
  return {
    show(items,{point}={}){if(!disposed)queue.push(items.map(item=>({...item,point:item.point??point??{x:50,y:50}})));},
    keep(){queue.keep();},clear,
    dispose(){disposed=true;clear();if(frame!==null)cancelAnimationFrame(frame);window.removeEventListener('resize',reflow);window.removeEventListener('scroll',reflow);window.visualViewport?.removeEventListener('resize',reflow);window.visualViewport?.removeEventListener('scroll',reflow);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',escape);media.removeEventListener('change',motionChange);card.remove();announcer.remove();}
  };
}

// The permanent clue list owns the content. These short, decorative flights only
// connect a newly placed piece to the explanation already visible in that list.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const keyOf=item=>item.kind==='landmark'?`landmark:${item.index}`:`clue:${item.at}:${item.label??item.title}`;
const FLIGHT_DURATION=1100;

export function createDiscoveryQueue({onShow=()=>{},onEmpty=()=>{},duration=FLIGHT_DURATION,schedule=setTimeout,cancel=clearTimeout,enabled=()=>true}={}){
  const items=[],seen=new Set();let timer=null,generation=0;
  function next(){
    if(!items.length){onEmpty();return;}
    const token=generation;
    onShow(items[0]);
    // onShow may clear the queue if its destination has disappeared.
    if(token!==generation||!items.length)return;
    timer=schedule(()=>{
      if(token!==generation)return;
      timer=null;items.shift();
      if(!enabled()){clear();return;}
      next();
    },duration);
  }
  function clear(){generation++;if(timer!==null)cancel(timer);timer=null;items.length=0;seen.clear();onEmpty();}
  return {
    get current(){return items[0]??null;},get size(){return items.length;},
    push(incoming){
      if(!enabled())return;
      const empty=items.length===0;
      for(const item of incoming){const key=keyOf(item);if(!seen.has(key)){seen.add(key);items.push(item);}}
      if(empty&&items.length)next();
    },
    clear
  };
}

function el(tag,className,text){
  const node=document.createElement(tag);node.className=className;node.setAttribute('aria-hidden','true');
  if(text)node.textContent=text;return node;
}
function viewport(){const view=window.visualViewport;return {left:view?.offsetLeft??0,top:view?.offsetTop??0,width:view?.width??innerWidth,height:view?.height??innerHeight};}
function visible(rect,view){return rect.width>0&&rect.height>0&&rect.right>view.left&&rect.left<view.left+view.width&&rect.bottom>view.top&&rect.top<view.top+view.height;}
function pointOnBoard(board,point){
  const rect=board.getBoundingClientRect();
  return {x:rect.left+rect.width*clamp(point?.x??50,0,100)/100,y:rect.top+rect.height*clamp(point?.y??50,0,100)/100};
}

export function discoveryMotion({board,target=()=>null}){
  const effects=new Set(),animations=new Set(),media=matchMedia('(prefers-reduced-motion: reduce)');
  let disposed=false;
  const enabled=()=>!disposed&&!media.matches&&!document.hidden&&!document.querySelector('dialog[open]');
  function removeEffects(){for(const animation of animations)animation.cancel();animations.clear();for(const effect of effects)effect.remove();effects.clear();}
  function animate(element,frames,options){
    const animation=element.animate(frames,options);animations.add(animation);
    animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));return animation;
  }
  function flight(item){
    removeEffects();
    const destination=target(item),view=viewport();
    if(!destination?.isConnected||!board.isConnected)return;
    const to=destination.getBoundingClientRect(),boardRect=board.getBoundingClientRect();
    if(!visible(to,view)||!visible(boardRect,view))return;
    const origin=pointOnBoard(board,item.point),end={x:clamp(to.left+Math.min(to.width/2,100),view.left+16,view.left+view.width-16),y:clamp(to.top+Math.min(to.height/2,25),view.top+16,view.top+view.height-16)};
    if(origin.x<view.left||origin.x>view.left+view.width||origin.y<view.top||origin.y>view.top+view.height)return;
    const glow=el('span','discovery-origin-glow');glow.style.left=`${origin.x}px`;glow.style.top=`${origin.y}px`;
    const chip=el('span','discovery-travel-chip',item.title??item.label??'New clue');chip.style.left=`${origin.x}px`;chip.style.top=`${origin.y}px`;
    document.body.append(glow,chip);effects.add(glow);effects.add(chip);
    const dx=end.x-origin.x,dy=end.y-origin.y;
    const transform=(x,y,scale)=>`translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`;
    animate(glow,[{opacity:0,transform:'translate(-50%,-50%) scale(.55)'},{opacity:.8,transform:'translate(-50%,-50%) scale(1)',offset:.28},{opacity:0,transform:'translate(-50%,-50%) scale(1.3)'}],{duration:600,easing:'ease-out',fill:'both'});
    animate(chip,[
      {opacity:0,transform:transform(0,0,.75)},
      {opacity:1,transform:transform(0,-8,1),offset:.16},
      {opacity:1,transform:transform(dx*.45,dy*.45-22,.97),offset:.5},
      {opacity:.85,transform:transform(dx,dy,.8),offset:.88},
      {opacity:0,transform:transform(dx,dy,.65)}
    ],{duration:850,easing:'cubic-bezier(.35,0,.2,1)',fill:'both'});
    // A delayed pulse uses the same animation lifecycle, so clearing cannot leave
    // a late callback that highlights a row after a restart or a dialog opens.
    animate(destination,[{boxShadow:'0 0 0 0 #064dff00'},{boxShadow:'0 0 0 5px #064dff20',offset:.4},{boxShadow:'0 0 0 0 #064dff00'}],{duration:350,delay:750,easing:'ease-out'});
  }
  const queue=createDiscoveryQueue({onShow:flight,onEmpty:removeEffects,enabled});
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

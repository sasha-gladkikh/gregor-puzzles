import {node,referenceMarks} from './clinical-ui.mjs';

export const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

// Explicit playback state makes pause/close/restart cancellation independent of rendering.
export function createSequence(count,{onStep=()=>{},onState=()=>{},delay=()=>6000,schedule=setTimeout,cancel=clearTimeout}={}){
  let index=0,playing=false,timer=null;
  const pause=()=>{if(timer!==null)cancel(timer);timer=null;playing=false;onState();};
  const show=i=>{index=Math.max(0,Math.min(count-1,i));onStep(index);onState();};
  const queue=()=>{timer=schedule(()=>{timer=null;if(!playing)return;if(index===count-1){pause();return;}show(index+1);queue();},delay(index));};
  return {get index(){return index;},get playing(){return playing;},pause,step(i){pause();show(i);},play(){if(playing)return;if(index===count-1)show(0);playing=true;onState();queue();}};
}

// Audio is synthesized locally. Creating/resuming the context requires an intentional gesture.
// No audio files, analytics, autoplay, or third-party requests are used.
export function soundFeedback(button){
  const key='gregor-puzzles:sound';
  let enabled=true,context=null,epoch=0,disposed=false;
  const voices=new Set();
  try{enabled=localStorage.getItem(key)!=='off';}catch{}
  const paint=()=>{button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'Turn sound off':'Turn sound on');button.querySelector('span').textContent=enabled?'Sound on':'Sound off';};
  const stop=()=>{epoch++;for(const voice of voices){try{voice.oscillator.stop();}catch{}voice.release();}voices.clear();};
  const current=token=>!disposed&&token===epoch&&enabled&&!document.hidden;
  async function ready(token){
    if(!current(token))return false;
    try{
      const Audio=window.AudioContext??window.webkitAudioContext;if(!Audio)return false;
      // Prime while handling the placement gesture; later contact feedback can
      // use that running context without depending on a second user gesture.
      if((!context||context.state==='suspended')&&window.navigator?.userActivation?.isActive===false)return false;
      context??=new Audio();if(context.state==='suspended')await context.resume();
      return current(token)&&context.state==='running';
    }catch{return false;}
  }
  const prepare=()=>ready(epoch);
  async function play(kind='place',{progress=0,delay=0}={}){
    const token=epoch;if(!await ready(token)||!current(token))return;
    const amount=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
    const wait=Number.isFinite(delay)?Math.max(0,Math.min(2000,delay))/1000:0;
    const base=420+amount*48;
    // A short, soft contact plus a barely audible upper partial; completion
    // opens into a warm G-major resolution instead of a sharp notification.
    const notes=kind==='complete'?[
      {hz:392,tail:392,at:0,length:.44,volume:.015},
      {hz:493.88,tail:493.88,at:.065,length:.46,volume:.012},
      {hz:587.33,tail:587.33,at:.13,length:.50,volume:.010},
      {hz:783.99,tail:783.99,at:.21,length:.60,volume:.006}
    ]:kind==='discovery'?[
      {hz:587.33,tail:587.33,at:0,length:.19,volume:.009},
      {hz:783.99,tail:783.99,at:.075,length:.27,volume:.006}
    ]:[
      {hz:base,tail:base*.82,at:0,length:.085,volume:.022},
      {hz:base*2.12,tail:base*1.7,at:.003,length:.045,volume:.0045}
    ];
    for(const note of notes){
      if(!current(token))break;
      const oscillator=context.createOscillator(),gain=context.createGain(),at=context.currentTime+wait+note.at;
      oscillator.type='sine';oscillator.frequency.setValueAtTime(note.hz,at);
      oscillator.frequency.exponentialRampToValueAtTime(note.tail,at+note.length*.8);
      gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(note.volume,at+(kind==='complete'?.012:.006));gain.gain.exponentialRampToValueAtTime(.0001,at+note.length);
      oscillator.connect(gain);gain.connect(context.destination);
      let released=false;
      const voice={oscillator,release(){if(released)return;released=true;voices.delete(voice);oscillator.disconnect();gain.disconnect();}};
      voices.add(voice);oscillator.onended=voice.release;
      oscillator.start(at);oscillator.stop(at+note.length+.02);
    }
  }
  const save=()=>{try{localStorage.setItem(key,enabled?'on':'off');}catch{}};
  const toggle=async()=>{
    enabled=!enabled;stop();paint();save();if(!enabled)return;
    const token=epoch;
    if(!await ready(token)){
      if(token===epoch){enabled=false;paint();save();}
      return;
    }
    if(current(token))void play();
  };
  const visibility=()=>{if(document.hidden){stop();void context?.suspend().catch(()=>{});}};
  const refresh=()=>{if(disposed)return;let next=enabled;try{next=localStorage.getItem(key)!=='off';}catch{}if(next!==enabled){enabled=next;stop();paint();}};
  const storage=event=>{if(event.key===key||event.key===null)refresh();};
  window.addEventListener('pageshow',refresh);window.addEventListener('storage',storage);
  button.addEventListener('click',toggle);
  document.addEventListener('visibilitychange',visibility);
  paint();return {prepare,play,stop,dispose(){disposed=true;stop();window.removeEventListener('pageshow',refresh);window.removeEventListener('storage',storage);button.removeEventListener('click',toggle);document.removeEventListener('visibilitychange',visibility);void context?.close?.().catch(()=>{});}};
}

// The sequence uses the same three referenced image notes as the editorial page.
// Moving the spotlight means "read this structure", not a molecule's physical trajectory.
// Nothing starts automatically, and reduced motion makes every step manually controlled.
export function illustrationWalkthrough(round,{board,onStep=()=>{},onClose=()=>{},id=`walkthrough-${round.number}`}={}){
  const panel=node('section',null,'walkthrough');panel.id=id;panel.setAttribute('aria-label','Illustration walkthrough');
  const intro=node('div',null,'walkthrough-intro'),copy=node('div');
  const takeaway=node('h3',round.illustration.takeaway);takeaway.append(referenceMarks(round,[round.illustration.source,round.illustration.noteSource].filter(Boolean),'Illustration'));
  copy.append(node('span','FROM IMAGE TO IDEA','eyebrow'),takeaway);
  const launch=node('button','Explore the illustration','tool walkthrough-launch');launch.type='button';launch.setAttribute('aria-expanded','false');launch.setAttribute('aria-controls',`${id}-body`);
  intro.append(copy,launch);
  const body=node('div',null,'walkthrough-body');body.id=`${id}-body`;body.hidden=true;
  const title=node('h4'),text=node('p'),caption=node('div',null,'walkthrough-caption');caption.setAttribute('aria-live','polite');caption.setAttribute('aria-atomic','true');caption.append(title,text);
  const controls=node('div',null,'walkthrough-controls');
  const back=node('button','← Previous','tool'),play=node('button','Play sequence','tool'),next=node('button','Next →','tool');
  for(const b of [back,play,next])b.type='button';
  const counter=node('span',null,'walkthrough-count');
  controls.append(back,counter,next,play);
  const note=node('p','Highlights guide attention; they do not simulate molecular movement.','walkthrough-note');
  body.append(caption,controls,note);
  panel.append(intro,body);
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const spotlight=node('div',null,'biology-spotlight');spotlight.setAttribute('aria-hidden','true');spotlight.hidden=true;board.append(spotlight);
  const paintControls=()=>{back.disabled=tour.index===0;next.disabled=tour.index===2;counter.textContent=`${tour.index+1} / 3`;play.textContent=tour.playing?'Pause':tour.index===2?'Replay sequence':'Play sequence';play.setAttribute('aria-pressed',String(tour.playing));play.hidden=media.matches;};
  function show(i){
    const point=round.illustration.landmarks[i];
    title.textContent=`${i+1}. ${point.title}`;text.textContent=point.text;
    spotlight.hidden=false;spotlight.style.left=`${point.x}%`;spotlight.style.top=`${point.y}%`;
    onStep(i);
  }
  const tour=createSequence(3,{onStep:show,onState:paintControls,delay:i=>Math.max(5500,round.illustration.landmarks[i].text.split(/\s+/).length*250)});
  const pause=()=>tour.pause();
  const open=(i=0)=>{pause();body.hidden=false;launch.setAttribute('aria-expanded','true');launch.textContent='Close illustration guide';tour.step(i);};
  const close=()=>{pause();body.hidden=true;launch.textContent='Explore the illustration';launch.setAttribute('aria-expanded','false');spotlight.hidden=true;onClose();};
  launch.onclick=()=>{if(body.hidden)open();else close();};
  back.onclick=()=>tour.step(tour.index-1);next.onclick=()=>tour.step(tour.index+1);
  play.onclick=()=>{if(tour.playing)pause();else tour.play();};
  const visibility=()=>{if(document.hidden)pause();};
  document.addEventListener('visibilitychange',visibility);
  media.addEventListener('change',pause);
  return {element:panel,pause,open,select(i){if(body.hidden)pause();else tour.step(i);},close,dispose(){pause();spotlight.remove();document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',pause);panel.remove();}};
}

export function highlightStructure(board,point){
  const ring=node('div',null,'discovery-ring');ring.setAttribute('aria-hidden','true');ring.style.left=`${point.x}%`;ring.style.top=`${point.y}%`;board.append(ring);
  if(!reduceMotion())ring.animate([{opacity:0,transform:'translate(-50%,-50%) scale(.8)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.25},{opacity:0,transform:'translate(-50%,-50%) scale(1.2)'}],{duration:1100,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>ring.remove());
  else setTimeout(()=>ring.remove(),1800);
}

export function assembleLogo(element){
  if(reduceMotion())return ()=>{};
  const animate=()=>{if(!reduceMotion())for(const [i,img] of [...element.querySelectorAll('img')].entries())img.animate([{opacity:0,transform:`translate(${i%2?9:-9}px,${i<2?-9:9}px)`},{opacity:1,transform:'none'}],{duration:450,delay:i*70,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'});};
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();animate();}},{threshold:.8});observer.observe(element);
  return ()=>observer.disconnect();
}

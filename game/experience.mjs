import {node,citation} from './clinical-ui.mjs';

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
  let enabled=false,context=null;
  const voices=new Set();
  try{enabled=localStorage.getItem(key)==='on';}catch{}
  const paint=()=>{button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'Turn sound off':'Turn sound on');button.querySelector('span').textContent=enabled?'Sound on':'Sound off';};
  const stop=()=>{for(const voice of voices){try{voice.stop();}catch{}}voices.clear();};
  async function ready(){
    if(!enabled||document.hidden)return false;
    try{const Audio=window.AudioContext??window.webkitAudioContext;if(!Audio)return false;context??=new Audio();if(context.state==='suspended')await context.resume();return enabled&&!document.hidden&&context.state==='running';}catch{return false;}
  }
  async function play(kind='place'){
    if(!await ready())return;
    const notes=kind==='complete'?[523.25,659.25,783.99]:[880];
    for(const [i,hz] of notes.entries()){
      const oscillator=context.createOscillator(),gain=context.createGain(),at=context.currentTime+i*.045;
      oscillator.type='sine';oscillator.frequency.setValueAtTime(hz,at);
      const length=kind==='complete'?.36:.065;
      gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(kind==='complete'?.022:.035,at+.006);gain.gain.exponentialRampToValueAtTime(.0001,at+length);
      oscillator.connect(gain);gain.connect(context.destination);voices.add(oscillator);
      oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};
      oscillator.start(at);oscillator.stop(at+length+.02);
    }
  }
  button.addEventListener('click',async()=>{
    enabled=!enabled;
    if(enabled&&!await ready())enabled=false;
    if(!enabled)stop();
    try{localStorage.setItem(key,enabled?'on':'off');}catch{}
    paint();if(enabled)void play();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();void context?.suspend().catch(()=>{});}});
  paint();return {play,stop};
}

// The sequence uses the same three referenced image notes as the editorial page.
// Moving the spotlight means "read this structure", not a molecule's physical trajectory.
// Nothing starts automatically, and reduced motion makes every step manually controlled.
export function illustrationWalkthrough(round,{board,onStep=()=>{},onClose=()=>{},id=`walkthrough-${round.number}`}={}){
  const panel=node('section',null,'walkthrough');panel.id=id;panel.setAttribute('aria-label','Illustration walkthrough');
  const intro=node('div',null,'walkthrough-intro'),copy=node('div');
  copy.append(node('span','FROM IMAGE TO IDEA','eyebrow'),node('h3',round.illustration.takeaway));
  const launch=node('button','See it work','tool walkthrough-launch');launch.type='button';launch.setAttribute('aria-expanded','false');launch.setAttribute('aria-controls',`${id}-body`);
  intro.append(copy,launch);
  const body=node('div',null,'walkthrough-body');body.id=`${id}-body`;body.hidden=true;
  const title=node('h4'),text=node('p'),caption=node('div',null,'walkthrough-caption');caption.setAttribute('aria-live','polite');caption.setAttribute('aria-atomic','true');caption.append(title,text);
  const controls=node('div',null,'walkthrough-controls');
  const back=node('button','← Previous','tool'),play=node('button','Play sequence','tool'),next=node('button','Next →','tool');
  for(const b of [back,play,next])b.type='button';
  const counter=node('span',null,'walkthrough-count');
  controls.append(back,counter,next,play);
  const note=node('p','Illustration walkthrough · Three highlighted structures. Motion guides attention; it does not simulate molecular movement. Pending scientific review.','walkthrough-note');
  body.append(caption,controls,note,citation(round.illustration.source,'Diagram reference'));
  if(round.illustration.noteSource)body.append(' · ',citation(round.illustration.noteSource,'Assembly and activation'));
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
  launch.onclick=()=>{const open=body.hidden;pause();body.hidden=!open;launch.setAttribute('aria-expanded',String(open));launch.textContent=open?'Close walkthrough':'See it work';if(open)tour.step(0);else{spotlight.hidden=true;onClose();}};
  back.onclick=()=>tour.step(tour.index-1);next.onclick=()=>tour.step(tour.index+1);
  play.onclick=()=>{if(tour.playing)pause();else tour.play();};
  const visibility=()=>{if(document.hidden)pause();};
  document.addEventListener('visibilitychange',visibility);
  media.addEventListener('change',pause);
  return {element:panel,pause,select(i){if(body.hidden)pause();else tour.step(i);},close(){pause();body.hidden=true;launch.textContent='See it work';launch.setAttribute('aria-expanded','false');spotlight.hidden=true;onClose();},dispose(){pause();spotlight.remove();document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',pause);panel.remove();}};
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

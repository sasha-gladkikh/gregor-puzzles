// A finite reading sequence on the completed illustration. Its only clock is
// the artwork clock: pausing, hiding, or enlarging the image cannot desync it.
// Captions and coordinates come from the existing referenced image notes.
const NS='http://www.w3.org/2000/svg';
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};

export function artworkGuideSteps(round){
  let at=650;
  return round.illustration.landmarks.map((point,index)=>{
    // Allow reading time rather than racing every caption at a fixed rate.
    const words=`${point.title} ${point.text}`.trim().split(/\s+/).length;
    const duration=Math.max(6500,Math.min(10000,words*225));
    const step={...point,index,at,duration};at+=duration;return step;
  });
}

export function sampleArtworkGuide(steps,elapsed){
  const last=steps.at(-1),duration=last?last.at+last.duration:0;
  const time=Math.max(0,elapsed),done=!steps.length||time>=duration;
  if(done)return {index:-1,done:true,progress:1,opacity:0};
  const index=steps.findIndex(step=>time<step.at+step.duration),step=steps[index];
  const age=time-step.at;
  // Fade at the old location before changing locations; do not draw a physical
  // trajectory between biological structures that are not travelling there.
  const opacity=smooth(age/420)*smooth((step.duration-age)/420);
  return {index,done:false,progress:clamp(time/duration),opacity};
}

function node(tag,className,text){
  const element=document.createElement(tag);if(className)element.className=className;
  if(text)element.textContent=text;return element;
}
function svgNode(tag,attrs={}){
  const element=document.createElementNS(NS,tag);
  for(const [key,value] of Object.entries(attrs))element.setAttribute(key,String(value));
  return element;
}

export function createArtworkGuide(round,{parent,guided=false}={}){
  const steps=artworkGuideSteps(round);
  const caption=node('section','artwork-guide-caption');caption.hidden=!guided;
  caption.setAttribute('aria-label','Illustration guide');
  const heading=node('div','artwork-guide-heading'),label=node('span','artwork-guide-label','Follow the image');
  const count=node('span','artwork-guide-count');count.setAttribute('aria-hidden','true');heading.append(label,count);
  const copy=node('div','artwork-guide-copy');copy.setAttribute('aria-live','polite');copy.setAttribute('aria-atomic','true');
  const current=node('div','artwork-guide-content');
  const title=node('strong','artwork-guide-title'),body=node('p','artwork-guide-text');current.append(title,body);copy.append(current);
  // All captions share one grid cell. Invisible measurement copies reserve the
  // tallest natural height at the current width, including text zoom and wraps.
  // They are excluded from accessibility; the visible caption never truncates.
  const measurements=steps.map(step=>{
    const measure=node('div','artwork-guide-measure');measure.setAttribute('aria-hidden','true');
    measure.append(node('strong','artwork-guide-title',`${step.index+1}. ${step.title}`),node('p','artwork-guide-text',step.text));
    copy.append(measure);return measure;
  });
  const track=node('div','artwork-guide-progress');track.setAttribute('aria-hidden','true');
  const fill=node('span');track.append(fill);caption.append(heading,copy,track);
  const focus=svgNode('g',{'data-artwork-guide-focus':'','aria-hidden':'true',opacity:0});
  const halo=svgNode('ellipse',{cx:0,cy:0,rx:67,ry:54,fill:'none',stroke:'#fff','stroke-width':5,'vector-effect':'non-scaling-stroke'});
  const ring=svgNode('ellipse',{cx:0,cy:0,rx:67,ry:54,fill:'#4488ee','fill-opacity':.035,stroke:'#326dde','stroke-width':1.6,'vector-effect':'non-scaling-stroke'});
  focus.append(halo,ring);parent?.append(focus);
  let enabled=Boolean(guided),origin=0,lastKey=null,disposed=false,lastOpacity=null,lastPosition=null,lastProgress=null;
  const setOpacity=value=>{if(value!==lastOpacity){focus.setAttribute('opacity',value);lastOpacity=value;}};
  const hideFocus=()=>setOpacity('0');
  return {
    caption,
    get enabled(){return enabled;},
    restart(elapsed=0){if(disposed)return;enabled=true;origin=Math.max(0,elapsed);lastKey=null;},
    cancel(){enabled=false;caption.hidden=true;hideFocus();lastKey=null;},
    draw(elapsed,{reduced=false}={}){
      if(disposed)return;
      if(caption.hidden===enabled)caption.hidden=!enabled;
      if(!enabled){hideFocus();return;}
      const state=reduced?{index:-1,done:true,progress:1,opacity:0}:sampleArtworkGuide(steps,elapsed-origin);
      const key=reduced?'static':state.done?'done':String(state.index);
      if(key!==lastKey){
        lastKey=key;caption.dataset.phase=key;
        label.textContent=state.done?'In the image':'Follow the image';
        count.textContent=state.done?'':`${state.index+1} / ${steps.length}`;
        title.textContent=state.done?round.illustration.takeaway:`${state.index+1}. ${steps[state.index].title}`;
        body.textContent=state.done?'':steps[state.index].text;
        body.hidden=state.done;track.hidden=state.done;
        for(const measure of measurements)measure.hidden=state.done;
      }
      const progress=state.progress.toFixed(4);
      if(progress!==lastProgress){fill.style.transform=`scaleX(${progress})`;lastProgress=progress;}
      if(state.done){hideFocus();return;}
      const step=steps[state.index];
      const position=`translate(${step.x*8} ${step.y*6})`;
      if(position!==lastPosition){focus.setAttribute('transform',position);lastPosition=position;}
      setOpacity(state.opacity.toFixed(3));
    },
    dispose(){disposed=true;enabled=false;focus.remove();caption.remove();}
  };
}

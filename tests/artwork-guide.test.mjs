import test from 'node:test';
import assert from 'node:assert/strict';
import {allRounds} from '../game/rounds.mjs';
import {artworkGuideSteps,sampleArtworkGuide,createArtworkGuide} from '../game/artwork-guide.mjs';
import {createArtworkClock} from '../game/artwork-motion.mjs';

test('all ten image guides use the referenced notes and the same structure coordinates',()=>{
  assert.equal(allRounds.length,10);
  for(const round of allRounds){
    const steps=artworkGuideSteps(round);
    assert.equal(steps.length,3);
    steps.forEach((step,index)=>{
      const landmark=round.illustration.landmarks[index];
      assert.equal(step.title,landmark.title);assert.equal(step.text,landmark.text);
      assert.equal(step.x,landmark.x);assert.equal(step.y,landmark.y);
      assert.ok(step.duration>=6500&&step.duration<=10000);
      if(index)assert.equal(step.at,steps[index-1].at+steps[index-1].duration);
    });
  }
});

test('the guide fades at each structure before changing focus, and finishes only once',()=>{
  for(const round of allRounds){
    const steps=artworkGuideSteps(round);
    assert.equal(sampleArtworkGuide(steps,0).opacity,0);
    for(const [index,step] of steps.entries()){
      const entry=sampleArtworkGuide(steps,step.at),middle=sampleArtworkGuide(steps,step.at+step.duration/2);
      assert.equal(entry.index,index);assert.equal(entry.opacity,0);
      assert.equal(middle.index,index);assert.equal(middle.opacity,1);
      assert.ok(sampleArtworkGuide(steps,step.at+step.duration-.01).opacity<.0001);
    }
    const end=steps.at(-1).at+steps.at(-1).duration;
    for(const time of [end,end+18000,end+3600000])assert.deepEqual(sampleArtworkGuide(steps,time),{index:-1,done:true,progress:1,opacity:0});
  }
});

// A minimal DOM exercises real captions and highlight attributes rather than
// asserting source strings or relying on one particular CSS implementation.
class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.style={};this.dataset={};this.hidden=false;this.textContent='';}
  setAttribute(key,value){this.attrs[key]=String(value);}
  append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
}
function setup(guided=false){
  const original=globalThis.document;
  globalThis.document={createElement:tag=>new Element(tag),createElementNS:(_ns,tag)=>new Element(tag)};
  const parent=new Element('svg'),round=allRounds[2];
  const originalArtwork=new Element('g');parent.append(originalArtwork);
  const guide=createArtworkGuide(round,{parent,guided});
  const focus=parent.children[1],caption=guide.caption;
  return {guide,parent,focus,caption,originalArtwork,round,restore(){globalThis.document=original;}};
}

test('restored rounds stay ambient until the reader explicitly starts the guide',()=>{
  const state=setup();
  try{
    state.guide.draw(19000);assert.equal(state.caption.hidden,true);assert.equal(state.focus.attrs.opacity,'0');
    state.guide.restart(19000);state.guide.draw(19000);
    assert.equal(state.caption.hidden,false);assert.equal(state.caption.dataset.phase,'0');
    state.guide.draw(21000);assert.equal(state.focus.attrs.opacity,'1.000');
    assert.equal(state.focus.attrs.transform,'translate(432 168)');
    assert.equal(state.parent.children[0],state.originalArtwork);
  }finally{state.restore();}
});

test('pausing the artwork clock freezes the caption and focus, then resumes the same step',()=>{
  const state=setup(true);let now=0,id=0;const frames=new Map();
  const clock=createArtworkClock({duration:18000,loop:true,now:()=>now,request:callback=>{frames.set(++id,callback);return id;},cancel:key=>frames.delete(key),onFrame:(_progress,elapsed)=>state.guide.draw(elapsed)});
  const advance=ms=>{now+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback());};
  try{
    clock.play();advance(2500);clock.pause();
    const caption=state.caption.dataset.phase,opacity=state.focus.attrs.opacity;
    advance(60000);assert.equal(state.caption.dataset.phase,caption);assert.equal(state.focus.attrs.opacity,opacity);assert.equal(frames.size,0);
    clock.play();advance(6000);assert.equal(state.caption.dataset.phase,'1');assert.equal(frames.size,1);
    state.guide.restart(clock.elapsed);state.guide.draw(clock.elapsed);assert.equal(state.caption.dataset.phase,'0');
    assert.equal(frames.size,1,'replaying the guide does not add an animation loop');
  }finally{clock.dispose();state.guide.dispose();state.restore();}
});

test('reduced motion retains every full image note with manual navigation and a static highlight',()=>{
  const state=setup(true);
  try{
    state.guide.draw(0,{reduced:true});
    assert.equal(state.caption.hidden,false);assert.equal(state.caption.dataset.phase,'static-0');
    assert.equal(state.caption.children[1].children[0].children[0].textContent,`1. ${state.round.illustration.landmarks[0].title}`);
    assert.equal(state.caption.children[1].children[0].children[1].hidden,false);
    assert.equal(state.caption.children[2].hidden,true);assert.equal(state.focus.attrs.opacity,'0.850');
    state.guide.draw(7000,{reduced:true});assert.equal(state.caption.dataset.phase,'static-0');
    const [previous,next]=state.caption.children[3].children;
    assert.equal(previous.disabled,true);assert.equal(next.disabled,false);
    for(const index of [1,2]){
      next.onclick();assert.equal(state.caption.dataset.phase,`static-${index}`);
      assert.equal(state.caption.children[1].children[0].children[1].textContent,state.round.illustration.landmarks[index].text);
    }
    assert.equal(next.disabled,true);previous.onclick();assert.equal(state.caption.dataset.phase,'static-1');
  }finally{state.restore();}
});

test('selecting a structure pauses on that note, and resuming continues there instead of rewinding',()=>{
  const state=setup(true);
  try{
    state.guide.draw(2500);state.guide.select(2);
    assert.equal(state.guide.index,2);assert.equal(state.caption.dataset.phase,'static-2');
    state.guide.draw(5000);assert.equal(state.caption.dataset.phase,'static-2');
    state.guide.resume(5000);state.guide.draw(5500);
    assert.equal(state.caption.dataset.phase,'2');assert.equal(state.guide.focus.title,state.round.illustration.landmarks[2].title);
  }finally{state.restore();}
});

test('natural caption measurements stay present through every step, then collapse for the static takeaway',()=>{
  const state=setup(true);
  try{
    const copy=state.caption.children[1],measurements=copy.children.slice(1),steps=artworkGuideSteps(state.round);
    assert.equal(measurements.length,3);
    for(const [index,measure] of measurements.entries()){
      assert.equal(measure.attrs['aria-hidden'],'true');
      assert.equal(measure.children[0].textContent,`${index+1}. ${steps[index].title}`);
      assert.equal(measure.children[1].textContent,steps[index].text);
    }
    for(const step of steps){
      state.guide.draw(step.at+1000);
      assert.ok(measurements.every(measure=>!measure.hidden),'All three captions determine the natural height during each step');
    }
    const end=steps.at(-1).at+steps.at(-1).duration;
    state.guide.draw(end);assert.ok(measurements.every(measure=>measure.hidden));
    assert.equal(state.caption.children[0].children[0].textContent,'In the image');
    state.guide.restart(end);state.guide.draw(end);assert.ok(measurements.every(measure=>!measure.hidden));
  }finally{state.restore();}
});

test('cancelling a guide removes its focus and caption, and disposal removes only its own nodes',()=>{
  const state=setup(true);
  try{
    state.guide.draw(3000);state.guide.cancel();state.guide.draw(4000);
    assert.equal(state.caption.hidden,true);assert.equal(state.focus.attrs.opacity,'0');
    state.guide.dispose();state.guide.restart();state.guide.draw(2000);
    assert.deepEqual(state.parent.children,[state.originalArtwork]);assert.equal(state.guide.enabled,false);
  }finally{state.restore();}
});

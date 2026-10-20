import test from 'node:test';
import assert from 'node:assert/strict';
import {artworkDetails,artworkSequences,sampleDetailTrack,createArtworkDetails,detailFocusWeight,detailReadingWeight} from '../game/artwork-detail.mjs';
import {artworkMotionData} from '../game/artwork-motion-data.mjs';
import {allRounds} from '../game/rounds.mjs';

test('every round has finite, staged contour tracks attached only to existing artwork',()=>{
  assert.deepEqual(Object.keys(artworkDetails).sort(),allRounds.map(round=>round.number).sort());
  for(const [number,scene] of Object.entries(artworkDetails)){
    assert.ok(Number.isFinite(scene.period)&&scene.period>=6000&&scene.period<=30000,`${number}: bounded scene period`);
    assert.ok(scene.tracks.length>0,`${number}: missing detail tracks`);
    assert.equal(new Set(scene.tracks.map(track=>track.id)).size,scene.tracks.length,`${number}: unique track IDs`);
    for(const track of scene.tracks){
      const label=`${number}/${track.id}`;
      assert.ok(track.id);assert.ok(['surface','route'].includes(track.type),label);
      assert.ok(Number.isFinite(track.offset)&&track.offset>=0&&track.offset<scene.period,`${label}: departure inside scene`);
      assert.ok(Number.isFinite(track.duration)&&track.duration>=1000&&track.offset+track.duration<=scene.period,`${label}: full pass fits the scene`);
      assert.ok(Number.isFinite(track.span)&&track.span>0&&track.span<1,`${label}: light occupies a bounded part of its contour`);
      assert.ok(Number.isFinite(track.width)&&track.width>0&&track.width<=10,`${label}: restrained contour width`);
      assert.match(track.path,/^M\s*[-.\d]/,label);assert.doesNotMatch(track.path,/NaN|Infinity|undefined/,label);
      const coordinates=track.path.match(/-?\d*\.?\d+/g).map(Number);
      assert.ok(coordinates.length>=4&&coordinates.every(value=>Number.isFinite(value)&&value>=-50&&value<=850),`${label}: normalized illustration coordinates`);
      if(track.target)assert.ok(artworkMotionData[number].sprites.some(sprite=>sprite.id===track.target),`${label}: target must be an existing original-pixel sprite`);
    }
  }
});

test('every track is dark on reset and at the ends of each pass, with bounded smooth fades',()=>{
  for(const [number,scene] of Object.entries(artworkDetails))for(const track of scene.tracks){
    const label=`${number}/${track.id}`,start=600+track.offset;
    assert.equal(sampleDetailTrack(track,0,scene.period).opacity,0,`${label}: reset`);
    assert.equal(sampleDetailTrack(track,start-1,scene.period).opacity,0,`${label}: before departure`);
    for(const pass of [0,1,2,10]){
      const departure=start+pass*scene.period;
      for(const elapsed of [departure,departure+track.duration,departure+scene.period-1])assert.equal(sampleDetailTrack(track,elapsed,scene.period).opacity,0,`${label}: invisible loop boundary`);
      for(let fraction=0;fraction<=1;fraction+=.025){
        const frame=sampleDetailTrack(track,departure+track.duration*fraction,scene.period);
        assert.ok(Object.values(frame).every(Number.isFinite),label);
        assert.ok(frame.opacity>=0&&frame.opacity<=1,label);
        assert.ok(Math.abs(frame.offset)<=1+track.span&&Math.abs(frame.headOffset)<=1+track.span,label);
      }
      assert.equal(sampleDetailTrack(track,departure+track.duration*.5,scene.period).opacity,1,`${label}: sustained readable middle`);
      assert.ok(sampleDetailTrack(track,departure+.01,scene.period).opacity<1e-6,`${label}: soft departure`);
      assert.ok(sampleDetailTrack(track,departure+track.duration-.01,scene.period).opacity<1e-6,`${label}: soft arrival`);
    }
  }
});

test('routes and message flow never reverse while ambient reflections alternate direction',()=>{
  for(const [number,scene] of Object.entries(artworkDetails))for(const track of scene.tracks){
    const direction=[];
    for(const pass of [0,1,2,3]){
      const start=600+track.offset+pass*scene.period;
      const early=sampleDetailTrack(track,start+track.duration*.2,scene.period),late=sampleDetailTrack(track,start+track.duration*.8,scene.period);
      direction.push(Math.sign(late.offset-early.offset));
    }
    assert.deepEqual(direction,track.type==='route'||track.direction==='forward'?[-1,-1,-1,-1]:[-1,1,-1,1],`${number}/${track.id}`);
  }
});

test('the narrow glint leads the body in both directions and remains inside its illuminated span',()=>{
  for(const [number,scene] of Object.entries(artworkDetails))for(const track of scene.tracks){
    for(const pass of [0,1])for(const fraction of [.2,.5,.8]){
      const time=600+track.offset+pass*scene.period+track.duration*fraction;
      const frame=sampleDetailTrack(track,time,scene.period),bodyStart=-frame.offset,headStart=-frame.headOffset;
      const headEnd=headStart+track.span*.3,bodyEnd=bodyStart+track.span;
      assert.ok(headStart>=bodyStart-1e-12&&headEnd<=bodyEnd+1e-12,`${number}/${track.id}: glint inside body`);
      if(track.type==='route'||track.direction==='forward'||pass===0)assert.ok(Math.abs(headEnd-bodyEnd)<1e-12,`${number}/${track.id}: glint leads forward`);
      else assert.ok(Math.abs(headStart-bodyStart)<1e-12,`${number}/${track.id}: glint leads backward`);
    }
  }
});

function fakeDocument(){
  class Element{
    constructor(tag){this.tag=tag;this.children=[];this.attrs=new Map();this.parent=null;this.writes=0;}
    setAttribute(name,value){this.attrs.set(name,String(value));this.writes++;}
    append(...elements){for(const element of elements){element.parent=this;this.children.push(element);}}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(element=>element!==this);this.parent=null;}
  }
  return {document:{createElementNS:(_namespace,tag)=>new Element(tag)},Element};
}

test('detail rendering uses only the supplied artwork clock and follows its moving sprite parents',context=>{
  const globals={document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame,setTimeout:globalThis.setTimeout};
  context.after(()=>{for(const [key,value] of Object.entries(globals)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
  const {document,Element}=fakeDocument();globalThis.document=document;
  globalThis.requestAnimationFrame=()=>{assert.fail('details must not start their own animation loop');};
  globalThis.setTimeout=()=>{assert.fail('details must not schedule independent timers');};
  for(const [number,scene] of Object.entries(artworkDetails)){
    const parent=new Element('g'),sprites=artworkMotionData[number].sprites.map(data=>({data,group:new Element('g')}));
    const unrelated=new Element('path');parent.append(unrelated);
    const detail=createArtworkDetails(number,{parent,sprites});
    const groups=[...parent.children,...sprites.flatMap(sprite=>sprite.group.children)].filter(element=>element!==unrelated);
    assert.equal(groups.length,scene.tracks.length,`${number}: one group for each contour`);
    for(const track of scene.tracks){
      const group=groups.find(element=>element.attrs.get('data-artwork-detail')===track.id);
      const expectedParent=track.target?sprites.find(sprite=>sprite.data.id===track.target).group:parent;
      assert.equal(group.parent,expectedParent,`${number}/${track.id}: inherits actual sprite movement`);
      assert.equal(group.children.length,3,'halo, body, and leading glint');
      for(const path of group.children)assert.equal(path.attrs.get('pathLength'),'1','all offsets use normalized path fractions');
    }
    detail.draw(0);for(const group of groups)assert.equal(group.attrs.get('opacity'),'0.000');
    const initialWrites=groups.map(group=>group.writes);
    detail.draw(0);assert.deepEqual(groups.map(group=>group.writes),initialWrites,'an idle shared clock causes no repeated hidden updates');
    const track=scene.tracks[0],group=groups.find(element=>element.attrs.get('data-artwork-detail')===track.id);
    detail.draw(600+track.offset+track.duration/2);assert.equal(group.attrs.get('opacity'),(track.intensity??1).toFixed(3));
    const forward=Number(group.children[1].attrs.get('stroke-dashoffset'));
    detail.draw(600+track.offset+track.duration*.7);assert.ok(Number(group.children[1].attrs.get('stroke-dashoffset'))<forward,'the supplied clock advances the contour');
    detail.draw(0);for(const item of groups)assert.equal(item.attrs.get('opacity'),'0.000','reset makes every contour invisible');
    detail.dispose();detail.dispose();
    assert.deepEqual(parent.children,[unrelated],'dispose preserves unrelated original artwork');
    for(const sprite of sprites)assert.equal(sprite.group.children.length,0,'dispose removes tracks from moving sprites too');
  }
});

test('an unknown round has a safe inert detail renderer',()=>{
  const details=createArtworkDetails('unknown',{});assert.doesNotThrow(()=>{details.draw(1000);details.dispose();});
});

test('guide focus leaves its structure fully visible and gradually quiets unrelated decorative details',()=>{
  const focus={x:50,y:50,opacity:1};
  assert.equal(detailFocusWeight([400,300],focus),1);
  const nearby=detailFocusWeight([450,330],focus),distant=detailFocusWeight([780,30],focus);
  assert.ok(distant>=.28&&distant<nearby&&nearby<1);
  assert.equal(detailFocusWeight([780,30],{...focus,opacity:0}),1);
  assert.equal(detailFocusWeight([780,30],null),1);
  assert.equal(detailFocusWeight(null,focus),1);
});

test('the first biological sequence remains prominent, then later reflections settle for reading',()=>{
  for(const scene of Object.values(artworkDetails)){
    const boundary=scene.period+600;
    for(const elapsed of [0,scene.period,boundary])assert.equal(detailReadingWeight(elapsed,scene.period),1);
    let previous=1;
    for(let elapsed=boundary;elapsed<=boundary+3000;elapsed+=10){
      const weight=detailReadingWeight(elapsed,scene.period);
      assert.ok(weight<=previous&&weight>=.45-1e-12);previous=weight;
    }
    assert.ok(Math.abs(detailReadingWeight(boundary+3000,scene.period)-.45)<1e-12);
    assert.equal(detailReadingWeight(3600000,scene.period),detailReadingWeight(boundary+3000,scene.period));
  }
});

test('causal scenes share an ordered cadence with their original-pixel actions',()=>{
  for(const [number,sequence] of Object.entries(artworkSequences)){
    assert.equal(artworkDetails[number].period,sequence.period);
    let end=0;
    for(const [label,start,finish] of sequence.beats){
      assert.ok(label&&start>=end&&finish>start&&finish<=sequence.period,`${number}: non-overlapping, ordered explanatory beats`);end=finish;
    }
    for(const sprite of artworkMotionData[number].sprites.filter(sprite=>sprite.motion==='sequence'))assert.equal(sprite.period,sequence.period,`${number}/${sprite.id}: action and emphasis cannot drift apart`);
  }
  const track=(number,id)=>artworkDetails[number].tracks.find(item=>item.id===id);
  for(const [number,ids] of [
    ['04',['blocking-factor-release','small-subunit-joining','assembled-message-surface']],
    ['05',['major-input-message','major-intron-surface','major-joined-message']],
    ['06',['calcium-entry-arrow','release-arrow','receptor-left-rim']],
    ['07',['receptor-fold','regulator-fold','regulator-to-ras','nuclear-response']],
    ['08',['minor-input-exon','minor-lariat-route','minor-joined-message']],
    ['09',['er-membrane-fold','carrier-departure','carrier-arrival','golgi-response','rna-product']]
  ]){
    for(let i=1;i<ids.length;i++)assert.ok(track(number,ids[i]).offset>track(number,ids[i-1]).offset,`${number}: ${ids.join(' → ')}`);
  }
});

test('repeat-length comparison highlights both fixed segments together without a travelling neuronal signal',()=>{
  const scene=artworkDetails['10'];
  assert.ok(scene.tracks.every(track=>/^(short|long)-repeat-/.test(track.id)));
  for(const strand of ['near','far']){
    const shorter=scene.tracks.find(track=>track.id===`short-repeat-${strand}-strand`),expanded=scene.tracks.find(track=>track.id===`long-repeat-${strand}-strand`);
    for(let elapsed=0;elapsed<=60000;elapsed+=100)assert.equal(sampleDetailTrack(shorter,elapsed,scene.period).opacity,sampleDetailTrack(expanded,elapsed,scene.period).opacity,'Both comparison diagrams receive emphasis at the same time');
  }
});

test('RNA processing traces keep their first-pass direction on every later sequence',()=>{
  for(const [number,ids] of [
    ['04',['assembled-message-surface']],
    ['05',['major-input-message','major-intron-surface','major-joined-message']],
    ['08',['minor-input-exon','minor-intron-surface','minor-downstream-exon','minor-joined-message']],
    ['09',['rna-product']]
  ])for(const id of ids){
    const scene=artworkDetails[number],track=scene.tracks.find(track=>track.id===id);
    for(const pass of [0,1,2,9,20]){
      const start=600+track.offset+scene.period*pass;
      const early=sampleDetailTrack(track,start+track.duration*.2,scene.period),late=sampleDetailTrack(track,start+track.duration*.8,scene.period);
      assert.ok(late.offset<early.offset,`${number}/${id}: reversed RNA processing on pass ${pass}`);
      const initial=sampleDetailTrack(track,600+track.offset+track.duration*.2,scene.period);
      assert.ok(Math.abs(initial.offset-early.offset)<1e-10,`${number}/${id}: every pass follows the same route`);
    }
  }
});

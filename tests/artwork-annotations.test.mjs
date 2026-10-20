import test from 'node:test';
import assert from 'node:assert/strict';
import {allRounds} from '../game/rounds.mjs';
import {landmarkPiece} from '../game/engine.mjs';
import {artworkMarkers,artworkAnnotations,markerGeometry} from '../game/artwork-ui.mjs';
import {complexArtworkDetails} from '../game/artwork-detail-data.mjs';

class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.style={};this.dataset={};this.events={};this.textContent='';}
 setAttribute(key,value){this.attrs[key]=String(value);}
 append(...children){this.children.push(...children);}
 addEventListener(type,fn){this.events[type]=fn;}
}
function withDOM(fn){
 const saved=globalThis.document;
 globalThis.document={createElement:tag=>new Element(tag),createElementNS:(_ns,tag)=>new Element(tag)};
 try{return fn();}finally{globalThis.document=saved;}
}

test('moving marker numbers preserves the original biological and piece-discovery anchors',()=>{
 const pieces=[[5,6,8],[5,6,7],[2,7,11],[5,6,11],[5,3,11],[5,6,10],[0,5,7],[6,8,11],[0,2,9],[1,6,8]];
 for(const [index,round] of allRounds.entries()){
  assert.deepEqual(round.illustration.landmarks.map(landmarkPiece),pieces[index],round.number);
  for(const point of round.illustration.landmarks){
   const position=markerGeometry(point);
   assert.ok(position.x>=8&&position.x<=92&&position.y>=6&&position.y<=94,round.number);
   assert.ok(position.length>=5&&position.length<=26,`${round.number}: leader has a bounded reach`);
   const angle=position.angle*Math.PI/180;
   assert.ok(Math.abs(position.x+position.length*Math.cos(angle)-point.x)<1e-10);
   assert.ok(Math.abs(position.y+position.length*Math.sin(angle)/.75-point.y)<1e-10);
  }
 }
});

test('marker layers retain three accessible controls and each leader belongs to its note',()=>withDOM(()=>{
 for(const round of allRounds){
  let chosen=-1;const layer=artworkMarkers(round,index=>chosen=index);
  assert.equal(layer.children.length,3);
  layer.children.forEach((marker,index)=>{
   assert.equal(marker.tagName,'button');assert.equal(marker.textContent,String(index+1));
   assert.equal(marker.children.length,1);assert.equal(marker.children[0].attrs['aria-hidden'],'true');
   marker.events.click();assert.equal(chosen,index);
   assert.equal(marker.style.left,`${round.illustration.landmarks[index].markerX}%`);
  });
 }
}));

test('comparison labels and machinery role traces are separate from undiscovered notes',()=>withDOM(()=>{
 for(const round of allRounds){
  const markers=artworkMarkers(round),annotations=artworkAnnotations(round);
  assert.equal(annotations.attrs['aria-hidden'],'true');
  assert.equal(markers.children.length,3);
  for(const marker of markers.children)assert.equal(marker.children.length,1,'no completion labels leak into a note');
  const labels=round.illustration.annotations?.labels??[];
  if(labels.length)assert.equal(annotations.children[0].attrs.viewBox,'0 0 800 600');
 }
 const major=allRounds.find(r=>r.number==='05').illustration.annotations;
 const minor=allRounds.find(r=>r.number==='08').illustration.annotations;
 assert.ok(major.traces.length&&minor.traces.length);
 for(const round of allRounds){
  for(const trace of round.illustration.annotations?.traces??[]){
   assert.ok(complexArtworkDetails[round.number].tracks.some(track=>track.id===trace&&track.path),'role outlines reuse registered source paths');
  }
  const labels=artworkAnnotations(round).children[0]?.children.filter(child=>child.tagName==='g')??[];
  for(const label of labels){
   const [,cx,cy]=label.attrs.transform.match(/translate\(([\d.]+) ([\d.]+)\)/),rect=label.children[0].attrs;
   const left=Number(cx)+Number(rect.x),right=left+Number(rect.width),top=Number(cy)+Number(rect.y),bottom=top+Number(rect.height);
   assert.ok(left>=0&&right<=800,`${round.number}: label stays inside figure`);
   assert.ok(top>=0&&bottom<=600,`${round.number}: label stays inside figure`);
   for(const point of round.illustration.landmarks){
    const marker=markerGeometry(point),x=marker.x*8,y=marker.y*6;
    const distance=Math.hypot(Math.max(left-x,0,x-right),Math.max(top-y,0,y-bottom));
    assert.ok(distance>14*800/318,`${round.number}: labels clear marker circles even on a 318px board`);
   }
  }
 }
 assert.deepEqual(major.labels.slice(1),minor.labels.slice(1),'RNA roles use the same visual key');
 const repeat=allRounds.find(r=>r.number==='10').illustration.annotations.labels.map(l=>l.text);
 assert.ok(repeat.includes('Shorter repeat'));assert.ok(repeat.includes('Expanded repeat'));
}));

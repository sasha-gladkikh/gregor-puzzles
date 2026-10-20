import {node,referenceMarks} from './clinical-ui.mjs';
import {complexArtworkDetails} from './artwork-detail-data.mjs';
import {markerGeometry} from './artwork-data.mjs';
export {markerGeometry} from './artwork-data.mjs';
const NS='http://www.w3.org/2000/svg';
function svg(tag,attrs={}){
 const element=document.createElementNS(NS,tag);
 for(const [key,value] of Object.entries(attrs))element.setAttribute(key,String(value));
 return element;
}
// With onSelect, markers are buttons that reopen their note; otherwise they are decorative.
export function artworkMarkers(round,onSelect){
 const layer=node('div',null,'artwork-markers');if(!onSelect)layer.setAttribute('aria-hidden','true');
 round.illustration.landmarks.forEach((item,index)=>{
  const marker=node(onSelect?'button':'span',String(index+1),'artwork-marker');
  if(onSelect){marker.type='button';marker.addEventListener('click',()=>onSelect(index));}
  const position=markerGeometry(item);
  marker.style.left=`${position.x}%`;marker.style.top=`${position.y}%`;
  if(position.length){
   const leader=node('span',null,'artwork-marker-leader');leader.setAttribute('aria-hidden','true');
   leader.style.width=`max(0px, calc(${position.length}cqw - 14px))`;leader.style.transform=`rotate(${position.angle}deg) translateX(14px)`;
   marker.append(leader);
  }
  layer.append(marker);
 });
 return layer;
}

// Keep text and role outlines as native vectors. The layer is separate from
// markers so unlocking a number never leaks completed-illustration labels.
export function artworkAnnotations(round){
 const layer=node('div',null,'artwork-annotations');layer.setAttribute('aria-hidden','true');
 const data=round.illustration.annotations;if(!data)return layer;
 layer.dataset.round=round.number;
 const drawing=svg('svg',{viewBox:'0 0 800 600',preserveAspectRatio:'none',focusable:'false'});
 for(const trace of data.traces??[]){
  const d=complexArtworkDetails[round.number]?.tracks.find(track=>track.id===trace)?.path;
  if(!d)continue;
  drawing.append(svg('path',{d,class:'artwork-role-trace-halo'}),svg('path',{d,class:'artwork-role-trace'}));
 }
 for(const {x,y,text,tone='neutral'} of data.labels??[]){
  const label=svg('g',{transform:`translate(${x*8} ${y*6})`,class:`artwork-scene-label is-${tone}`});
  const width=Math.max(128,text.length*14.8+28);
  label.append(svg('rect',{x:-width/2,y:-23,width,height:46,rx:8}));
  const copy=svg('text',{'text-anchor':'middle','dominant-baseline':'central'});copy.textContent=text;label.append(copy);drawing.append(label);
 }
 layer.append(drawing);return layer;
}
export function artworkGuide(round){
 const section=node('section',null,'artwork-guide');
 section.append(node('span','FROM IMAGE TO IDEA','eyebrow'),node('h3',round.illustration.takeaway));
 const list=node('ol');
 round.illustration.landmarks.forEach((item,index)=>{
  const li=node('li'),badge=node('span',String(index+1),'artwork-key');badge.setAttribute('aria-hidden','true');
  const copy=node('div');copy.append(node('strong',item.title),node('p',item.text));li.append(badge,copy);list.append(li);
 });
 section.append(list,node('p',round.illustration.note,'artwork-note'),referenceMarks(round,[round.illustration.source,round.illustration.noteSource].filter(Boolean),'Illustration'));
 return section;
}

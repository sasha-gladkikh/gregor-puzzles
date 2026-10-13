import {node,citation} from './clinical-ui.mjs';
export function artworkMarkers(round){
 const layer=node('div',null,'artwork-markers');layer.setAttribute('aria-hidden','true');
 round.illustration.landmarks.forEach((item,index)=>{
  const marker=node('span',String(index+1),'artwork-marker');
  marker.style.left=`${item.x}%`;marker.style.top=`${item.y}%`;layer.append(marker);
 });
 return layer;
}
export function artworkGuide(round){
 const section=node('section',null,'artwork-guide');
 section.append(node('span','FROM IMAGE TO IDEA','eyebrow'),node('h3',round.illustration.takeaway));
 const list=node('ol');
 round.illustration.landmarks.forEach((item,index)=>{
  const li=node('li'),badge=node('span',String(index+1),'artwork-key');badge.setAttribute('aria-hidden','true');
  const copy=node('div');copy.append(node('strong',item.title),node('p',item.text));li.append(badge,copy);list.append(li);
 });
 section.append(list,node('p',round.illustration.note,'artwork-note'),citation(round.illustration.source,'Diagram reference'));
 if(round.illustration.noteSource)section.append(document.createTextNode(' · '),citation(round.illustration.noteSource,'Assembly and activation'));
 return section;
}

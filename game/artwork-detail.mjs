import {complexArtworkDetails} from './artwork-detail-data.mjs';
import {membraneArtworkDetails} from './artwork-detail-membranes.mjs';

const NS='http://www.w3.org/2000/svg';
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const x=clamp(value);return x*x*(3-2*x);};
export const artworkDetails={...complexArtworkDetails,...membraneArtworkDetails};

// These are moving reflections and emphasis along the illustration's existing
// contours and arrows, not extra molecules or experimentally measured events.
export function sampleDetailTrack(track,elapsed,period){
  const time=elapsed-600-(track.offset??0);
  if(time<0)return {opacity:0,offset:0,headOffset:0};
  const cycle=Math.floor(time/period),within=time-cycle*period;
  const duration=track.duration??5000;
  if(within>=duration)return {opacity:0,offset:0,headOffset:0};
  const progress=within/duration;
  const forward=track.type==='route'||cycle%2===0;
  const direction=forward?progress:1-progress;
  const span=track.span??.2,position=direction*(1+span)-span;
  // Gentle on/off envelopes, a long luminous body, and a narrow leading glint.
  // Surface reflections reverse on alternate passes; pathway arrows do not.
  const opacity=smooth(progress/.15)*smooth((1-progress)/.22);
  return {opacity,offset:-position,headOffset:-(position+(forward?span*.7:0))};
}

function svg(tag,attrs={}){
  const element=document.createElementNS(NS,tag);
  for(const [name,value] of Object.entries(attrs))element.setAttribute(name,String(value));
  return element;
}

export function createArtworkDetails(number,{parent,sprites=[]}){
  const scene=artworkDetails[number];
  if(!scene)return {draw(){},dispose(){}};
  const groups=[];let disposed=false;
  const tracks=scene.tracks.map(track=>{
    const group=svg('g',{'data-artwork-detail':track.id,'aria-hidden':'true',opacity:0});
    const shared={d:track.path,fill:'none',pathLength:1,'stroke-linecap':'round','stroke-linejoin':'round'};
    const span=track.span??.2,width=track.width??3,color=track.color??'#bcefff';
    const halo=svg('path',{...shared,stroke:color,'stroke-width':width*4,opacity:.16,'stroke-dasharray':`${span} 2`});
    const body=svg('path',{...shared,stroke:color,'stroke-width':width,opacity:.66,'stroke-dasharray':`${span} 2`});
    const glint=svg('path',{...shared,stroke:'#f4ffff','stroke-width':Math.max(.8,width*.32),opacity:.84,'stroke-dasharray':`${span*.3} 2`});
    group.append(halo,body,glint);
    const target=track.target?sprites.find(sprite=>sprite.data.id===track.target)?.group:null;
    (target??parent).append(group);groups.push(group);
    return {track,group,paths:[halo,body],glint,last:null};
  });
  return {
    draw(elapsed){
      if(disposed)return;
      for(const entry of tracks){
        const frame=sampleDetailTrack(entry.track,elapsed,scene.period);
        if(frame.opacity===0&&entry.last===0)continue;
        entry.group.setAttribute('opacity',frame.opacity.toFixed(3));entry.last=frame.opacity;
        if(frame.opacity===0)continue;
        for(const path of entry.paths)path.setAttribute('stroke-dashoffset',frame.offset.toFixed(5));
        entry.glint.setAttribute('stroke-dashoffset',frame.headOffset.toFixed(5));
      }
    },
    dispose(){if(disposed)return;disposed=true;for(const group of groups)group.remove();}
  };
}

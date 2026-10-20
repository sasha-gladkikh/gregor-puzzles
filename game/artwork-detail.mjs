import {complexArtworkDetails} from './artwork-detail-data.mjs';
import {membraneArtworkDetails} from './artwork-detail-membranes.mjs';

const NS='http://www.w3.org/2000/svg';
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const x=clamp(value);return x*x*(3-2*x);};
export const artworkDetails={...complexArtworkDetails,...membraneArtworkDetails};

// Named beats make each causal story inspectable and keep it on one scene
// cadence. These timings emphasize the existing reference views; they are not
// experimentally measured event durations or an additional mechanism diagram.
export const artworkSequences={
 '04':{period:18000,beats:[['Release blocker',0,4000],['Join subunits',4400,8000],['Translate message',8500,16500]]},
 '05':{period:18000,beats:[['Recognize precursor',0,3000],['Remove intron',3000,10000],['Join exons',10000,17000]]},
 '06':{period:18000,beats:[['Calcium entry',0,4400],['Vesicle release',4600,11000],['Receptor interaction',12000,17000]]},
 '07':{period:20000,beats:[['Receptor response',0,4000],['Central regulator',4100,9200],['Ordered pathway response',9400,19200]]},
 '08':{period:19000,beats:[['Recognize specialized intron',0,7000],['Release intron',7500,10500],['Join exons',10800,17800]]},
 '09':{period:21000,beats:[['ER departure',0,5500],['Carrier and Golgi',5700,10400],['Downstream response',10500,19800]]}
};
const timing={
 '04':{
  'large-ribosomal-upper-rna':[0,3300],'large-ribosomal-lower-rna':[600,3400],
  'blocking-factor-release':[500,3100],'small-subunit-joining':[4400,3000],
  'small-ribosomal-rna':[4700,3200],'assembled-ribosome-route':[8500,2600],
  'assembled-message-surface':[11200,5300]
 },
 '05':{
  'major-input-message':[0,3000],'major-intron-surface':[3000,3900],
  'major-upper-rna':[1600,3900],'major-left-rna':[2400,3900],'major-right-rna':[3200,3900],
  'major-lariat-route':[7200,2700],'major-exon-route':[10000,2700],'major-joined-message':[12700,4300]
 },
 '06':{
  'calcium-channel-left':[0,4200],'calcium-entry-arrow':[0,1900],'calcium-inner-arrow':[1900,2500],
  'vesicle-middle-rim':[4600,2900],'vesicle-upper-rim':[4800,2900],'vesicle-right-rim':[5000,2900],
  'fused-vesicle-rim':[4600,3700],'release-arrow':[8100,2900],
  'receptor-left-rim':[12000,3800],'receptor-right-rim':[12000,3800],'postsynaptic-membrane':[14000,3000]
 },
 '07':{
  'receptor-fold':[0,3300],'receptor-response':[3000,1800],'regulator-fold':[4100,3200],
  'regulator-to-ras':[7400,1800],'ras-to-cascade':[9400,1800],'cascade-fold':[11100,2100],
  'cascade-relay':[13100,1500],'cascade-output':[14600,1700],'nuclear-response':[16500,2700]
 },
 '08':{
  'minor-input-exon':[0,3000],'minor-intron-surface':[3000,4000],
  'minor-upper-rna':[1300,3800],'minor-left-rna':[2200,3800],'minor-right-rna':[3100,3800],
  'minor-downstream-exon':[4000,3000],'minor-lariat-route':[7500,3000],
  'minor-exon-route':[10800,2600],'minor-joined-message':[13400,4400]
 },
 '09':{
  'er-membrane-fold':[0,3300],'carrier-departure':[3300,2200],'carrier-arrival':[5700,2200],
  'golgi-rim':[7600,2800],'golgi-response':[10500,2000],'protein-relay':[12700,1800],
  'nuclear-entry':[14600,2400],'rna-product':[17300,2500]
 }
};
const forwardMessages=new Set([
 'assembled-message-surface',
 'major-input-message','major-intron-surface','major-joined-message',
 'minor-input-exon','minor-intron-surface','minor-downstream-exon','minor-joined-message',
 'rna-product'
]);
for(const [number,tracks] of Object.entries(timing)){
 const scene=artworkDetails[number];scene.period=artworkSequences[number].period;
 for(const track of scene.tracks){
  [track.offset,track.duration]=tracks[track.id];
  // These traces now carry the processing sequence. Only decorative texture
  // reflections reverse; message flow must not appear to run backward later.
  if(forwardMessages.has(track.id))track.direction='forward';
  // Internal RNA reflections are quieter than the precursor/product route.
  if(/^(major|minor)-(upper|left|right)-rna$/.test(track.id))track.intensity=.48;
  if(number==='06'&&track.id.startsWith('vesicle-'))track.intensity=.35;
  // A fixed reference structure inherits no transform from a removed cutout.
  if(['cascade-blue-protein','joined-exon-product'].includes(track.target))delete track.target;
 }
}
// Compare repeat lengths simultaneously, without a growing segment or an
// axonal travelling light that could be mistaken for a disease simulation.
artworkDetails['10'].period=16000;
artworkDetails['10'].tracks=artworkDetails['10'].tracks.filter(track=>!track.id.startsWith('neuronal-'));
for(const track of artworkDetails['10'].tracks){track.offset=track.id.includes('near')?800:1600;track.duration=6500;}

// Focus is a reading aid, not a change in biological activity. Only decorative
// reflections are quieter away from the structure named by the current note.
export function detailFocusWeight(point,focus){
  if(!focus||!point)return 1;
  const dx=(point[0]-focus.x*8)/170,dy=(point[1]-focus.y*6)/135;
  const proximity=Math.exp(-(dx*dx+dy*dy)/2);
  return 1-.72*clamp(focus.opacity??1)*(1-proximity);
}

// These are moving reflections and emphasis along the illustration's existing
// contours and arrows, not extra molecules or experimentally measured events.
export function sampleDetailTrack(track,elapsed,period){
  const time=elapsed-600-(track.offset??0);
  if(time<0)return {opacity:0,offset:0,headOffset:0};
  const cycle=Math.floor(time/period),within=time-cycle*period;
  const duration=track.duration??5000;
  if(within>=duration)return {opacity:0,offset:0,headOffset:0};
  const progress=within/duration;
  const forward=track.type==='route'||track.direction==='forward'||cycle%2===0;
  const direction=forward?progress:1-progress;
  const span=track.span??.2,position=direction*(1+span)-span;
  // Gentle on/off envelopes, a long luminous body, and a narrow leading glint.
  // Ambient reflections alternate; pathway arrows and message flow do not.
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
    const values=(track.path.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)??[]).map(Number);
    const xs=values.filter((_value,index)=>index%2===0),ys=values.filter((_value,index)=>index%2===1);
    const center=xs.length&&ys.length?[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2]:null;
    return {track,group,paths:[halo,body],glint,last:null,center};
  });
  return {
    draw(elapsed,{focus=null}={}){
      if(disposed)return;
      for(const entry of tracks){
        const frame=sampleDetailTrack(entry.track,elapsed,scene.period);
        if(frame.opacity===0&&entry.last===0)continue;
        const emphasis=entry.track.type==='route'?1:detailFocusWeight(entry.center,focus);
        entry.group.setAttribute('opacity',(frame.opacity*emphasis*(entry.track.intensity??1)).toFixed(3));entry.last=frame.opacity;
        if(frame.opacity===0)continue;
        for(const path of entry.paths)path.setAttribute('stroke-dashoffset',frame.offset.toFixed(5));
        entry.glint.setAttribute('stroke-dashoffset',frame.headOffset.toFixed(5));
      }
    },
    dispose(){if(disposed)return;disposed=true;for(const group of groups)group.remove();}
  };
}

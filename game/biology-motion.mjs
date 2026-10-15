import {node,referenceMarks} from './clinical-ui.mjs';

// These schematics reuse the round's curated mechanism and illustration references.
// Motion explains ordering or exchange, not molecular speeds or measured trajectories.
export const motionScenes={
 CLCN1:{title:'Chloride conductance in muscle',kind:'Normal function',steps:[['A membrane pathway','ClC-1 has two subunits, each with a chloride-conduction pathway.'],['Chloride can cross','Movement in both directions is shown to avoid implying a fixed direction of chloride flow.'],['Electrical stability','Chloride conductance helps stabilize muscle excitability. Reduced function can delay relaxation.']]},
 GJB2:{title:'A direct connection between cells',kind:'Normal function',steps:[['Two channel halves meet','A connexon from each neighboring cell contributes to the gap-junction channel.'],['A shared passage','Ions and small molecules pass directly between the two cytoplasms.'],['Communication matters','Connexin 26 supports communication among inner-ear cells. These channels are not pumps.']]},
 SLC29A3:{title:'A route out of the lysosome',kind:'Normal function',steps:[['Recover building blocks','Lysosomal breakdown supplies nucleosides, represented by amber symbols.'],['Transport across the membrane','ENT3 provides a route for nucleosides from the lysosome to the cytoplasm.'],['Support cellular homeostasis','Impaired transport disturbs lysosomal and cellular homeostasis. The link to every clinical feature is not fully resolved.']]},
 SBDS:{title:'Release the blocker, permit joining',kind:'Normal maturation',steps:[['A protected joining face','eIF6 on the large 60S subunit prevents premature joining with the 40S subunit.'],['Release eIF6','SBDS and EFL1 cooperate to release the blocking factor.'],['Subunits can join','The large and small subunits can now form a working ribosome. Reduced SBDS function impairs this maturation step.']]},
 'RNU4-2':{title:'U4 lets go before catalysis',kind:'Normal activation',steps:[['Assembly','U4 pairs with U6, holding U6 inactive while the major spliceosome assembles.'],['Release','U4 is unwound and released before splicing chemistry begins.'],['The catalytic RNA arrangement','U6 pairs with U2 at the catalytic centre. U4 is not a persistent component of that centre.']]},
 CACNA1A:{title:'Calcium couples arrival to release',kind:'Normal signaling',steps:[['Calcium enters','CaV2.1 allows calcium into the presynaptic terminal.'],['A vesicle fuses','Calcium entry helps trigger vesicle fusion with the membrane.'],['Transmitter reaches the cleft','Neurotransmitter is released toward receptors on the next cell. Disease-associated channel effects can increase or decrease activity.']]},
 PTPN11:{title:'An intramolecular latch opens',kind:'Noonan-associated mechanism',steps:[['An autoinhibited state','At rest, the N-SH2 domain blocks SHP-2’s phosphatase active site.'],['The interface weakens','Many Noonan-associated variants weaken this interaction, making the open state easier to access.'],['Signaling increases','Increased SHP-2 activity can increase RAS/MAPK signaling. Other PTPN11 associations can behave differently.']]},
 RNU4ATAC:{title:'The specialist RNA-processing pathway',kind:'Normal minor splicing',steps:[['A functional RNA helps assembly','U4atac participates in minor-spliceosome assembly. It is released before catalysis.'],['Remove a minor intron','The minor spliceosome processes a specialized class of introns. The amber loop represents the removed intron.'],['Join the flanking exons','Successful processing joins the flanking exons. Impairment can affect many transcripts, not just one.']]},
 STING1:{title:'Trafficking activates a signal',kind:'SAVI-associated activation',steps:[['Begin at the ER','STING is an intracellular membrane protein. SAVI-associated variants can activate it without cGAMP.'],['Move toward the Golgi','Trafficking to the Golgi provides a platform for recruitment and activation of TBK1.'],['A sustained response','Downstream signaling can drive type I interferon responses. Interferon may not explain every feature of SAVI.']]},
 FGF14:{title:'Compare two repeat lengths',kind:'Sequence comparison',steps:[['Locate the intron','The GAA repeat lies within FGF14 intron 1, between schematic exon markers.'],['Compare a longer repeat','Both DNA tracks remain fixed: this compares sequence lengths, not an expansion occurring during a person’s lifetime.'],['Think beyond coding sequence','The SCA27B expansion is intronic. Standard exome sequencing does not reliably detect it; the drawing does not define a diagnostic repeat threshold.']]}
};

// A finite, resumable clock avoids hidden-tab jumps and overlapping playback loops.
// Timing is injectable so pause, replay and cleanup can be checked without a browser.
export function createMotionClock({duration=9000,onFrame=()=>{},onState=()=>{},now=()=>performance.now(),request=callback=>requestAnimationFrame(callback),cancel=id=>cancelAnimationFrame(id)}={}){
 let elapsed=0,start=0,playing=false,disposed=false,frame=null;
 const draw=()=>onFrame(elapsed/duration);
 const update=()=>{if(playing)elapsed=Math.min(duration,Math.max(0,now()-start));draw();};
 const stop=()=>{if(frame!==null)cancel(frame);frame=null;playing=false;};
 const tick=()=>{frame=null;if(!playing||disposed)return;update();if(elapsed>=duration){stop();onState();}else frame=request(tick);};
 const api={get progress(){return elapsed/duration;},get playing(){return playing;},
  play(){if(disposed||playing)return;if(elapsed>=duration)elapsed=0;start=now()-elapsed;playing=true;draw();onState();frame=request(tick);},
  pause(){if(disposed)return;update();stop();onState();},
  finish(){if(disposed)return;stop();elapsed=duration;draw();onState();},
  dispose(){stop();disposed=true;}
 };return api;
}

const line=(d,cls='')=>`<path d="${d}" class="bm-line ${cls}"/>`;
const label=(x,y,text,cls='')=>`<text x="${x}" y="${y}" class="bm-label ${cls}" text-anchor="middle">${text}</text>`;
const dot=(x,y,r=7,cls='')=>`<circle cx="${x}" cy="${y}" r="${r}" class="bm-dot ${cls}"/>`;
const group=(id,content)=>`<g data-motion="${id}">${content}</g>`;
const membrane=(y,x=35,width=530)=>`<rect x="${x}" y="${y}" width="${width}" height="38" rx="19" class="bm-membrane"/>${Array.from({length:Math.floor(width/15)},(_,i)=>`<path d="M${x+10+i*15} ${y+10}v18" class="bm-lipid"/>`).join('')}`;
const channel=(x,y,labelText)=>`<rect x="${x-30}" y="${y-12}" width="22" height="62" rx="11" class="bm-blue"/><rect x="${x+8}" y="${y-12}" width="22" height="62" rx="11" class="bm-blue"/>${label(x,y+81,labelText)}`;
const exon=(x,y,width,color='bm-blue')=>`<rect x="${x}" y="${y}" width="${width}" height="22" rx="8" class="${color}"/>`;
const dash=(x1,y1,x2,y2)=>`<path d="M${x1} ${y1} L${x2} ${y2}" class="bm-route"/>`;
const pairTicks=(y)=>Array.from({length:10},(_,i)=>`<path d="M${220+i*17} ${y}v18" class="bm-pair"/>`).join('');

function sceneDrawing(gene){
 switch(gene){
 case 'CLCN1':return `${label(300,36,'Skeletal muscle-cell membrane')}${membrane(130)}${channel(255,130,'')}${channel(335,130,'')}${label(300,258,'ClC-1 · two pores')}${label(110,92,'Chloride')}${dash(255,75,255,226)}${dash(335,226,335,75)}${[0,1,2,3].map((i)=>group(`ion-${i}`,dot(i%2?335:255,i%2?225:74,7,'bm-teal'))).join('')}`;
 case 'GJB2':return `<rect x="30" y="35" width="240" height="220" rx="52" class="bm-cell-blue"/><rect x="330" y="35" width="240" height="220" rx="52" class="bm-cell-teal"/>${label(145,74,'Cell A')}${label(452,74,'Cell B')}<rect x="245" y="114" width="110" height="31" rx="13" class="bm-blue"/><rect x="245" y="163" width="110" height="31" rx="13" class="bm-blue"/>${label(300,285,'Connexin 26 gap junction')}${dash(145,155,455,155)}${[0,1,2,3].map(i=>group(`cargo-${i}`,dot(i%2?458:142,154,7,'bm-amber'))).join('')}`;
 case 'SLC29A3':return `<circle cx="210" cy="150" r="109" class="bm-organelle"/>${label(210,74,'Lysosome')}${line('M142 128q14-20 28 0t28 0','bm-rna')}${line('M156 187q14-20 28 0t28 0','bm-rna')}<rect x="295" y="116" width="49" height="22" rx="11" class="bm-blue"/><rect x="295" y="158" width="49" height="22" rx="11" class="bm-blue"/>${label(320,218,'ENT3')}${label(465,108,'Cytoplasm')}${dash(244,148,490,148)}${[0,1,2].map(i=>group(`cargo-${i}`,dot(230+i*19,148,7,'bm-amber'))).join('')}${label(210,287,'Nucleoside export')}`;
 case 'SBDS':return `<path d="M100 152q0-77 91-80 96-3 96 80 0 71-96 71-91 0-91-71" class="bm-blue"/>${label(187,150,'60S','bm-on-dark')}${group('blocker',`<rect x="272" y="127" width="28" height="57" rx="11" class="bm-amber"/>${label(286,112,'eIF6')}`)}${group('small',`<path d="M434 94q62 6 62 59t-62 59q-42-8-42-59t42-59" class="bm-teal"/>${label(442,158,'40S','bm-on-dark')}`)}${group('factors',`<circle cx="273" cy="238" r="19" class="bm-teal"/><circle cx="315" cy="238" r="19" class="bm-blue"/>${label(294,284,'SBDS + EFL1')}`)}`;
 case 'RNU4-2':return `<ellipse cx="304" cy="155" rx="202" ry="115" class="bm-cloud"/>${label(300,35,'Major spliceosome')}${group('u4',`${line('M210 118H404q35 0 35-25t-30-25q-26 0-26 22','bm-rna bm-teal-stroke')}${label(175,124,'U4')}`)}${group('paired',pairTicks(122))}${line('M210 145H415','bm-rna bm-blue-stroke')}${label(175,151,'U6')}${group('u2',`${line('M210 190H415','bm-rna bm-navy-stroke')}${label(175,196,'U2')}`)}${group('catalytic',pairTicks(151))}${label(300,289,'RNA rearrangement before splicing')}`;
 case 'CACNA1A':return `<path d="M35 37h530v142q0 17-17 17H52q-17 0-17-17z" class="bm-cell-blue"/>${label(300,35,'Presynaptic terminal')}${membrane(181)}${channel(160,181,'CaV2.1')}<path d="M35 279h530v18H35z" class="bm-cell-teal"/>${label(450,282,'Next cell')}${group('vesicle',`<circle cx="405" cy="117" r="36" class="bm-vesicle"/>${dot(393,111,6,'bm-amber')}${dot(414,116,6,'bm-amber')}${dot(401,129,6,'bm-amber')}`)}${[0,1,2].map(i=>group(`calcium-${i}`,dot(160,255-i*15,7,'bm-teal'))).join('')}${group('fusion',`<rect x="369" y="181" width="72" height="39" fill="#e3effa"/><path d="M369 219Q391 213 378 189C349 142 461 142 432 189Q419 213 441 219" fill="none" stroke="#528d8a" stroke-width="3"/>`)}${[0,1,2].map(i=>group(`transmitter-${i}`,dot(395+i*12,200,6,'bm-amber'))).join('')}${label(500,244,'Cleft')}`;
 case 'PTPN11':return `${group('latch-link',line('M226 168Q210 187 146 199','bm-linker'))}<ellipse cx="334" cy="132" rx="105" ry="73" class="bm-blue"/>${label(355,137,'PTP domain','bm-on-dark')}<circle cx="237" cy="131" r="16" class="bm-amber"/>${group('latch',`<ellipse cx="226" cy="132" rx="52" ry="36" class="bm-teal"/>${label(220,138,'N-SH2','bm-on-dark')}`)}<ellipse cx="146" cy="224" rx="45" ry="25" class="bm-teal"/>${label(146,231,'C-SH2','bm-on-dark')}${line('M186 224Q214 245 260 192','bm-linker')}${label(320,35,'SHP-2')}${group('signal',`${dash(442,133,510,133)}${dot(476,133,7,'bm-amber')}${label(492,178,'RAS/MAPK')}`)}${label(340,281,'Many Noonan-associated variants')}`;
 case 'RNU4ATAC':return `<ellipse cx="300" cy="157" rx="153" ry="102" class="bm-cloud"/>${label(300,34,'Minor spliceosome')}${group('assembly',`${line('M233 94q0-34 22-34t22 34q0 34 22 34t22-34','bm-rna bm-teal-stroke')}${label(398,80,'U4atac')}`)}${group('left-exon',exon(99,167,130,'bm-blue'))}${group('right-exon',exon(370,167,130,'bm-teal'))}${group('intron',`${line('M230 178q23 0 23-30c-68-85 120-85 75 0q-9 30 42 30','bm-rna bm-amber-stroke')}`)}${label(160,232,'Exon')}${label(437,232,'Exon')}${label(300,286,'Assembly → intron removal → exon joining')}`;
 case 'STING1':return `<path d="M49 75q67-31 128 0v20q-65-24-128 0z M49 114q67-31 128 0v20q-65-24-128 0z M49 153q67-31 128 0v20q-65-24-128 0z" class="bm-cell-blue"/>${label(115,220,'ER')}<path d="M397 66q71-26 146 0v20q-72-24-146 0z M397 104q71-26 146 0v20q-72-24-146 0z M397 142q71-26 146 0v20q-72-24-146 0z" class="bm-cell-teal"/>${label(469,220,'Golgi')}${dash(180,135,391,114)}${group('sting',`<circle cx="162" cy="135" r="32" class="bm-carrier"/><rect x="145" y="149" width="14" height="33" rx="7" class="bm-blue"/><rect x="164" y="149" width="14" height="33" rx="7" class="bm-blue"/>${label(164,218,'STING')}`)}${group('tbk',`${dot(499,93,11,'bm-amber')}${label(529,41,'TBK1')}`)}${group('signal',`${line('M553 170v72H321','bm-signal')}${label(301,279,'Type I interferon response')}`)}${label(201,35,'cGAMP not required in SAVI')}`;
 case 'FGF14':return `${label(300,30,'FGF14 · intron 1')}${label(130,75,'Shorter repeat')}${label(132,174,'Expanded repeat')}${line('M46 108H554','bm-rna bm-navy-stroke')}${line('M46 209H554','bm-rna bm-navy-stroke')}${exon(48,97,43)}${exon(509,97,43)}${exon(48,198,43)}${exon(509,198,43)}${Array.from({length:3},(_,i)=>`<rect x="${258+i*27}" y="93" width="23" height="30" rx="5" class="bm-amber"/>`).join('')}${Array.from({length:11},(_,i)=>`<rect x="${150+i*27}" y="194" width="23" height="30" rx="5" class="bm-amber"/>`).join('')}${group('upper-ring','<rect x="249" y="84" width="96" height="48" rx="13" class="bm-highlight"/>')}${group('lower-ring','<rect x="142" y="185" width="309" height="48" rx="13" class="bm-highlight"/>')}${label(300,270,'Amber blocks = symbolic GAA repeat units')}`;
 default:return '';
 }
}

const clamp=n=>Math.max(0,Math.min(1,n));
const segment=(progress,start,end)=>clamp((progress-start)/(end-start));
const ease=t=>t*t*(3-2*t);
function animateScene(svg,gene,progress){
 const find=id=>svg.querySelector(`[data-motion="${id}"]`);
 const move=(id,x=0,y=0,opacity=1)=>{const n=find(id);if(n){n.setAttribute('transform',`translate(${x} ${y})`);n.setAttribute('opacity',String(opacity));}};
 const a=ease(segment(progress,.13,.65)),b=ease(segment(progress,.55,.9));
 switch(gene){
 case 'CLCN1':for(let i=0;i<4;i++){const p=ease(segment(progress,.12+i*.12,.52+i*.12));move(`ion-${i}`,0,(i%2?-151:151)*p);}break;
 case 'GJB2':for(let i=0;i<4;i++){const p=ease(segment(progress,.12+i*.1,.55+i*.1));move(`cargo-${i}`,(i%2?-310:310)*p,0);}break;
 case 'SLC29A3':for(let i=0;i<3;i++){const p=ease(segment(progress,.12+i*.11,.66+i*.11));move(`cargo-${i}`,230*p,0);}break;
 case 'SBDS':move('blocker',36*a,-75*a);move('factors',0,0,1-.78*a);move('small',-107*b,0);break;
 case 'RNU4-2':move('u4',-62*a,-23*a,1-a);move('paired',0,0,1-a);move('u2',0,-19*b,.25+.75*b);move('catalytic',0,0,b);break;
 case 'CACNA1A':for(let i=0;i<3;i++)move(`calcium-${i}`,0,-111*ease(segment(progress,.05+i*.07,.37+i*.07)));move('vesicle',0,68*ease(segment(progress,.3,.62)),1-b);move('fusion',0,0,b);for(let i=0;i<3;i++)move(`transmitter-${i}`,(i-1)*19*b,52*b,b);break;
 case 'PTPN11':find('latch-link').querySelector('path').setAttribute('d',`M${226-52*a} ${168-57*a}Q${210-30*a} 180 146 199`);move('latch',-52*a,-57*a);move('signal',0,0,b);break;
 case 'RNU4ATAC':{const release=ease(segment(progress,.08,.36));move('assembly',-39*release,-27*release,1-release);move('intron',0,-41*ease(segment(progress,.38,.71)));move('left-exon',70*b,0);move('right-exon',-71*b,0);break;}
 case 'STING1':move('sting',277*a,-35*a);move('tbk',0,0,b);move('signal',0,0,b);break;
 case 'FGF14':move('upper-ring',0,0,progress<.45?1:.25);move('lower-ring',0,0,ease(segment(progress,.33,.7)));break;
 }
}

export function biologyMotion(round,{autoplay=false}={}){
 const scene=motionScenes[round.gene];if(!scene)return null;
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 const panel=node('section',null,'biology-motion');panel.id=`biology-motion-${round.number}`;panel.setAttribute('aria-label','Animated mechanism');
 const heading=node('div',null,'biology-motion-heading'),copy=node('div');
 copy.append(node('span','MECHANISM IN MOTION','eyebrow'),node('h3',scene.title));
 const button=node('button','Play animation','tool biology-motion-toggle');button.type='button';
 heading.append(copy,button);
 const figure=node('div',null,'biology-motion-figure');
 figure.innerHTML=`<svg viewBox="0 0 600 310" role="img" aria-labelledby="${panel.id}-title ${panel.id}-description"><title id="${panel.id}-title">${scene.title}</title><desc id="${panel.id}-description">${scene.steps.map(s=>s[1]).join(' ')}</desc>${sceneDrawing(round.gene)}</svg>`;
 const svg=figure.querySelector('svg');
 const context=node('p',scene.kind,'biology-motion-context');
 const caption=node('div',null,'biology-motion-caption'),step=node('span',null,'biology-motion-step'),title=node('strong'),text=node('p');
 caption.append(step,title,text);
 const progress=node('div',null,'biology-motion-progress');progress.setAttribute('aria-hidden','true');progress.append(node('span'));
 const note=node('p','Schematic; structures, timing and distances are illustrative.','biology-motion-note');
 note.append(referenceMarks(round,[...round.clinical.connectionSources,round.illustration.source,round.illustration.noteSource,...(round.gene==='STING1'?round.clinical.pearls.flatMap(pearl=>pearl.sources):[])].filter(Boolean),'Animated mechanism'));
 const transcript=node('details',null,'biology-motion-transcript');
 const summary=node('summary','Read the sequence'),sequence=node('ol');
 for(const [heading,body] of scene.steps){const item=node('li');item.append(node('strong',heading),node('p',body));sequence.append(item);}
 transcript.append(summary,sequence);transcript.open=media.matches;
 panel.append(heading,context,figure,progress,caption,transcript,note);
 let disposed=false,lastStep=-1,visible=false,autoplayPending=autoplay;
 const paintState=()=>{button.textContent=clock.playing?'Pause':clock.progress>=1?'Replay animation':clock.progress>0?'Resume':'Play animation';button.setAttribute('aria-pressed',String(clock.playing));button.hidden=media.matches;panel.classList.toggle('is-playing',clock.playing);};
 const draw=position=>{animateScene(svg,round.gene,position);progress.firstChild.style.transform=`scaleX(${position})`;const index=Math.min(2,Math.floor(position*3));if(index!==lastStep){lastStep=index;step.textContent=`${index+1} / 3`;title.textContent=scene.steps[index][0];text.textContent=scene.steps[index][1];}};
 const clock=createMotionClock({onFrame:draw,onState:paintState});
 const pause=()=>{autoplayPending=false;clock.pause();};
 const play=({whenVisible=false}={})=>{if(disposed||media.matches||document.hidden)return;if(whenVisible&&!visible){autoplayPending=true;return;}autoplayPending=false;clock.play();};
 button.addEventListener('click',()=>{if(clock.playing)pause();else play();});
 const visibility=()=>{if(document.hidden)pause();};
 const preference=()=>{autoplayPending=false;if(media.matches){transcript.open=true;clock.finish();}else clock.pause();};
 const observer=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.35);if(!visible){clock.pause();}else if(autoplayPending&&!media.matches&&!document.hidden)play();},{threshold:.35});
 document.addEventListener('visibilitychange',visibility);media.addEventListener('change',preference);observer.observe(panel);
 if(media.matches)clock.finish();else{draw(0);paintState();}
 return {element:panel,play,pause,dispose(){if(disposed)return;disposed=true;autoplayPending=false;clock.dispose();observer.disconnect();document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',preference);panel.remove();}};
}

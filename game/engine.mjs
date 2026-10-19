import {geneHintConnections} from './gene-hints.mjs';
export {geneClueConnection} from './gene-hints.mjs';
import {SIZE,COLS,ROWS} from './puzzle-geometry.mjs';
export {COLS,ROWS,SIZE,W,H,CW,CH,edges,edgePoints,pathFor} from './puzzle-geometry.mjs';
export const GENE_HINT_STEPS=3,GENE_HINT_VERSION=2;
export function newState(){return {sessionVersion:3,placed:[],hints:0,geneHintsSeen:0,geneHintVersion:GENE_HINT_VERSION,peeks:0,solvedByGuess:false,namedAt:null,seconds:0,timingUnavailable:false,started:false,startedAt:null,finishedAt:null,usedRoutes:[]};}
export function place(state,piece,slot){if(!Number.isInteger(piece)||piece<0||piece>=SIZE||piece!==slot||state.placed.includes(piece))return false;state.placed.push(piece);return true;}
// Case, spaces, and punctuation are ignored: RNU4-2, rnu4 2, and RNU42 match.
export const normalizeGene=value=>value.toUpperCase().replace(/[^A-Z0-9]/g,'');
// Recognition is optional. A product name counts only when it identifies this
// gene unambiguously; a shared RNA such as U4 still needs a locus-specific name.
export function recognizeGene(value,round){
 const typed=normalizeGene(value);if(!typed)return null;
 if(typed===normalizeGene(round.gene))return {kind:'symbol',name:round.gene};
 const alias=round.aliases.find(name=>normalizeGene(name)===typed);
 if(alias)return {kind:'alias',name:alias};
 const product=round.products.find(name=>normalizeGene(name)===typed);
 if(product)return {kind:round.ambiguousProducts?.includes(product)?'ambiguous':'product',name:product};
 return null;
}
// Old two-step saves already exposed the symbol at step two. Preserve that
// access while inserting the new teaching step, without charging another hint.
export function geneHintCount(state){
 if(state.geneHintSeen===true)return GENE_HINT_STEPS;
 const seen=state.geneHintsSeen,max=state.geneHintVersion===GENE_HINT_VERSION?GENE_HINT_STEPS:2;
 if(!Number.isInteger(seen)||seen<0||seen>max)return 0;
 return state.geneHintVersion!==GENE_HINT_VERSION&&seen===2?GENE_HINT_STEPS:seen;
}
export function migrateGeneHints(raw){return {geneHintVersion:GENE_HINT_VERSION,geneHintsSeen:geneHintCount(raw)};}
export function geneHintStatus(state){
 const seen=geneHintCount(state);
 return {seen,total:GENE_HINT_STEPS,hasNext:seen<GENE_HINT_STEPS&&!complete(state),nextLabel:['Get a gene hint','Connect the biology','Reveal symbol hint','All hints shown'][seen]};
}
// Reading saved hints never reveals another step or changes the hint count.
export function geneHintText(state,round){
 const seen=geneHintCount(state);if(!seen)return null;
 const location=round.clues.find(clue=>clue.label==='Location');
 const functionClue=round.clues.find(clue=>clue.label==='Function');
 const biology=`${location.title}. ${functionClue.body}`;
 if(seen===1)return biology;
 const connection=geneHintConnections[round.gene]?.hint??`Connect the location, ${location.title.toLowerCase()}, with the function: ${functionClue.title.toLowerCase()}.`;
 const teaching=`${biology}\n\n${connection}`;
 if(seen===2)return teaching;
 const symbol=normalizeGene(round.gene);
 return `${teaching}\n\nThe symbol starts with ${symbol.slice(0,3)} and has ${symbol.length} letters and digits.`;
}
// Explicit hints are available from the start. Each new step counts once;
// reopening previously requested help is free, including after a reload.
export function revealGeneHint(state,round){
 const seen=geneHintCount(state);
 Object.assign(state,migrateGeneHints(state));delete state.geneHintSeen;
 if(!complete(state)&&seen<GENE_HINT_STEPS){state.geneHintsSeen=seen+1;state.hints++;}
 return geneHintText(state,round);
}
export function guess(state,value,gene,aliases=[]){
 const typed=normalizeGene(value);if(!typed||![gene,...aliases].some(symbol=>normalizeGene(symbol)===typed))return false;
 if(!complete(state))state.namedAt=state.placed.length;
 state.placed=Array.from({length:SIZE},(_,i)=>i);state.solvedByGuess=true;return true;
}
// Landmark coordinates are percentages of the image; return the piece that contains the point.
export const landmarkPiece=({x,y})=>Math.min(ROWS-1,Math.floor(y/100*ROWS))*COLS+Math.min(COLS-1,Math.floor(x/100*COLS));
export const revealed=(state,threshold)=>state.placed.length>=threshold;
export const complete=state=>state.placed.length===SIZE;
export function shuffled(values,random=Math.random){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function validSave(value){return value&&Array.isArray(value.placed)&&value.placed.length<=SIZE&&new Set(value.placed).size===value.placed.length&&value.placed.every(n=>Number.isInteger(n)&&n>=0&&n<SIZE)&&['hints','peeks','seconds'].every(k=>Number.isFinite(value[k])&&value[k]>=0)&&typeof value.solvedByGuess==='boolean';}

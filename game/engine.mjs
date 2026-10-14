export const COLS=4, ROWS=3, SIZE=12, W=800, H=600, CW=W/COLS, CH=H/ROWS;
// An edge belongs to the shared boundary, not to either neighboring piece.
const horizontal=Array.from({length:ROWS-1},(_,r)=>Array.from({length:COLS},(_,c)=>(r+c)%2?1:-1));
const vertical=Array.from({length:ROWS},(_,r)=>Array.from({length:COLS-1},(_,c)=>(r+c)%2?-1:1));
export function edges(id){const r=Math.floor(id/COLS),c=id%COLS;return {top:r?horizontal[r-1][c]:0,right:c<COLS-1?vertical[r][c]:0,bottom:r<ROWS-1?horizontal[r][c]:0,left:c?vertical[r][c-1]:0};}
// Each boundary has one round tab. Reversing traversal reproduces the same curve.
export function edgePoints(x,y,dx,dy,sign){
 const nx=-dy,ny=dx;
 const at=(t,n)=>[x+dx*t+nx*n*sign,y+dy*t+ny*n*sign];
 if(!sign)return [{op:'L',p:[x+dx,y+dy]}];
 return [
 {op:'L',p:at(.36,0)},
 {op:'C',p:[...at(.44,0),...at(.42,-.08),...at(.40,-.10)]},
 {op:'C',p:[...at(.32,-.26),...at(.68,-.26),...at(.60,-.10)]},
 {op:'C',p:[...at(.58,-.08),...at(.56,0),...at(.64,0)]},
 {op:'L',p:[x+dx,y+dy]}];
}
export function pathFor(id){const r=Math.floor(id/COLS),c=id%COLS,x=c*CW,y=r*CH,e=edges(id);
 const s=[`M ${x} ${y}`];
 for(const [a,b,dx,dy,v] of [[x,y,CW,0,e.top],[x+CW,y,0,CH,e.right],[x+CW,y+CH,-CW,0,-e.bottom],[x,y+CH,0,-CH,-e.left]]){
  for(const seg of edgePoints(a,b,dx,dy,v))s.push(`${seg.op} ${seg.p.join(' ')}`);
 }
 return s.join(' ')+' Z';
}
export function newState(){return {sessionVersion:3,placed:[],hints:0,peeks:0,solvedByGuess:false,namedAt:null,seconds:0,timingUnavailable:false,started:false,startedAt:null,finishedAt:null,usedRoutes:[]};}
export function place(state,piece,slot){if(!Number.isInteger(piece)||piece<0||piece>=SIZE||piece!==slot||state.placed.includes(piece))return false;state.placed.push(piece);return true;}
// Case, spaces, and punctuation are ignored: RNU4-2, rnu4 2, and RNU42 match.
export const normalizeGene=value=>value.toUpperCase().replace(/[^A-Z0-9]/g,'');
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

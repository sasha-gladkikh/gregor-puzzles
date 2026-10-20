import {landmarkPiece} from './engine.mjs';

// Keep the most recent teaching point on screen between placements. The full
// text always remains in Clues; authored previews keep the scientific point.
export function cluePreview(item){
  if(!item)return null;
  if(item.preview)return {title:item.title,text:item.preview};
  const text=item.body??item.text??'';
  const sentence=typeof Intl.Segmenter==='function'
    ? [...new Intl.Segmenter('en',{granularity:'sentence'}).segment(text)][0]?.segment
    : text.match(/^.*?[.!?](?:\s|$)/)?.[0];
  return {title:item.title,text:(sentence??text).trim()};
}

export function latestPlayClue(round,placed){
  const count=placed.length;
  const clue=round.clues.filter(item=>item.at<=count).at(-1);
  const notes=round.illustration.landmarks.map((note,index)=>({
    at:placed.indexOf(landmarkPiece(note))+1,
    kind:'landmark',index,title:note.playTitle,text:note.playText,preview:note.playPreview
  })).filter(note=>note.at>0).sort((a,b)=>a.at-b.at);
  const note=notes.at(-1);
  // A milestone clue is the main teaching point when both unlock together.
  return cluePreview(clue&&(!note||clue.at>=note.at)?clue:note);
}

export function latestClueKey(round,placed){
  const clue=round.clues.filter(item=>item.at<=placed.length).at(-1);
  const notes=round.illustration.landmarks.map((note,index)=>({index,at:placed.indexOf(landmarkPiece(note))+1}))
    .filter(note=>note.at>0).sort((a,b)=>a.at-b.at);
  const note=notes.at(-1);
  return clue&&(!note||clue.at>=note.at)?`clue:${clue.at}`:note?`landmark:${note.index}`:'';
}

export function discoveryCounts(round,placed){
 const clues=round.clues.filter(clue=>clue.at<=placed.length).length;
 const notes=round.illustration.landmarks.filter(note=>placed.includes(landmarkPiece(note))).length;
 return {clues,notes,total:clues+notes};
}

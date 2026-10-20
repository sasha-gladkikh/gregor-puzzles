import {restoreSession,roundComplete,earnedCompletion} from './session.mjs';
// Keep old shared round links and browser progress working after adding Home.
export function legacyPlayURL(search, hash='') {
  return new URLSearchParams(search).has('level') ? `./play.html${search}${hash}` : null;
}
export function nextHomeRound(progress) {
  return progress.find(item=>item.replaying&&item.pieces>0) ?? progress.find(item=>!item.done&&item.pieces>0) ?? progress.find(item=>item.replaying) ?? progress.find(item=>!item.done) ?? progress[0];
}

export function homeProgress(catalogue,read) {
  return catalogue.map(round=>{
    let saved;
    try {saved=JSON.parse(read(round.saveKey));} catch {}
    const state=restoreSession(saved).state;
    return {round,done:earnedCompletion(state),replaying:earnedCompletion(state)&&!roundComplete(state),pieces:state.placed.length};
  });
}

export function homeDestination(items) {
  const next=nextHomeRound(items),done=items.filter(item=>item.done).length;
  if(next?.replaying)return {href:`./play.html?level=${next.round.number}`,label:`Continue replay · ${next.round.number}`,detail:`${next.round.topic} · ${next.pieces} of 12 pieces placed. Completion saved.`};
  if(!next||done===items.length)return {href:'./collection.html',label:'Play another round',detail:'Every round complete. Revisit a favorite or try a timed round.'};
  const continuing=next.pieces>0;
  return {
    href:`./play.html?level=${next.round.number}`,
    label:continuing?`Continue round ${next.round.number}`:done?'Play your next puzzle':'Start a puzzle',
    detail:continuing?`${next.round.topic} · ${next.pieces} of 12 pieces placed.`:done?`${done} of ${items.length} rounds complete · Progress saved in this browser.`:`${items.length} rounds · 12 pieces each · No account required`,
  };
}

// The navigation always opens a puzzle, while the completed hero may open Collection.
export function homePlayURL(items) {
 const next=nextHomeRound(items);
 return next?`./play.html?level=${next.round.number}`:'./collection.html';
}

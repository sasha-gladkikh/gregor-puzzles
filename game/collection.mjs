import {SIZE} from './engine.mjs';
import {rounds,saveKey} from './rounds.mjs';
import {restoreSession,roundComplete,earnedCompletion} from './session.mjs';

export const roundLink = round => `?level=${round.number}`;
const roundSaveKeys=new Set(rounds.map(saveKey));
export const affectsRoundProgress=event=>event.key===null||roundSaveKeys.has(event.key);
// Ignore timer checkpoints and player-service writes when deciding whether a
// reference page's visible progress actually changed.
export const progressSignature=(items,{completedOnly=false}={})=>items.map(({round,done,pieces})=>`${round.id}:${done?1:0}${completedOnly?'':`:${pieces}`}`).join('|');
// A new player on a shared device starts with no progress. Editorial notes are kept.
export const newPlayerKeys = keys => keys.filter(key => key.startsWith('gregor-puzzles:') && !key.startsWith('gregor-puzzles:review-notes:'));
export function collectionProgress(read, current) {
  return rounds.map(round=>{
    let saved;
    try {saved=JSON.parse(read(saveKey(round)));} catch {}
    const state=current?.id===round.id?current.state:restoreSession(saved).state;
    const done=earnedCompletion(state),pieces=state.placed.length,replaying=done&&!roundComplete(state);
    return {round,done,replaying,pieces,started:state.started,percent:Math.round(pieces/SIZE*100)};
  });
}

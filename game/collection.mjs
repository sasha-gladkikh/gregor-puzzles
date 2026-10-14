import {SIZE} from './engine.mjs';
import {rounds,saveKey} from './rounds.mjs';
import {restoreSession,roundComplete} from './session.mjs';

export const roundLink = round => `?level=${round.number}`;
// A new player on a shared device starts with no progress. Editorial notes are kept.
export const newPlayerKeys = keys => keys.filter(key => key.startsWith('gregor-puzzles:') && !key.startsWith('gregor-puzzles:review-notes:'));
export function collectionProgress(read, current) {
  return rounds.map(round=>{
    let saved;
    try {saved=JSON.parse(read(saveKey(round)));} catch {}
    const state=current?.id===round.id?current.state:restoreSession(saved).state;
    const done=roundComplete(state),pieces=state.placed.length;
    return {round,done,pieces,started:state.started,percent:Math.round(pieces/SIZE*100)};
  });
}

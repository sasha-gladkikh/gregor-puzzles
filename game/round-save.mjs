// Each page writes only over the save it actually read. A stale page must
// reload before acting, including after an explicit restart in another tab.
// A unique write token also detects a save that changed and then returned to
// the same visible state (for example a reset followed by the same hint).
export function createRoundSaveGuard({read,write,initial,token=()=>crypto.randomUUID()}){
  let baseline=initial,conflicted=false;
  const current=()=>{
    if(conflicted)return false;
    if(read()!==baseline){conflicted=true;return false;}
    return true;
  };
  return {
    current,
    save(value,{force=false}={}){
      if(!current())return false;
      // Loading or rendering a round is not a new write. In particular, two
      // open pages must not keep invalidating each other with fresh tokens.
      try{
        const {writeToken,...previous}=JSON.parse(baseline);
        if(!force&&JSON.stringify(previous)===JSON.stringify(value))return true;
      }catch{}
      const next=JSON.stringify({...value,writeToken:token()});
      write(next);baseline=next;
      return true;
    }
  };
}

// All cooperating play tabs use the same origin-wide lock, including when a
// new player clears every round. Check freshness *inside* the lock, then keep
// the entire action (state, attempt history and save) in that critical section.
// The local queue also preserves event order while an action awaits the lock.
// Without Web Locks the read-before-write guard still detects stale pages,
// but cannot provide an atomic cross-process compare-and-write.
export function createRoundActionQueue({locks=globalThis.navigator?.locks,isCurrent=()=>true}={}){
  let tail=Promise.resolve();
  return {
    run(action){
      const next=tail.then(()=>{
        const execute=()=>isCurrent()?action():false;
        return locks?.request?locks.request('gregor-puzzles:progress',execute):execute();
      });
      tail=next.catch(()=>{});
      return next;
    }
  };
}

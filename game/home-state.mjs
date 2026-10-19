// Keep old shared round links and browser progress working after adding Home.
export function legacyPlayURL(search, hash='') {
  return new URLSearchParams(search).has('level') ? `./play.html${search}${hash}` : null;
}
export function nextHomeRound(progress) {
  return progress.find(item=>!item.done&&item.pieces>0) ?? progress.find(item=>!item.done) ?? progress[0];
}

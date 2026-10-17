// Native masters preserve the approved composition and all original pixels.
// Use one source for the board and moving cutouts to keep their edges registered.
const nativeSources={
  '01':'./artwork/native/01.webp',
  '02':'./artwork/native/02.webp',
  '03':'./artwork/native/03.webp',
  '04':'./artwork/native/04.webp',
  '05':'./artwork/native/05.webp',
  '06':'./artwork/native/06.webp',
  '07':'./artwork/native/07.webp',
  '08':'./artwork/native/08.webp',
  '09':'./artwork/native/09.webp',
  '10':'./artwork/native/10.webp'
};

export function artworkSource(round){return nativeSources[round.number]??round.artwork;}

// Small cards keep the lighter rendition; explanatory figures can use the master.
export function artworkSrcset(round){
  const native=nativeSources[round.number];
  return native?`${round.artwork} 1200w, ${native} ${round.number==='05'?1447:1448}w`:'';
}

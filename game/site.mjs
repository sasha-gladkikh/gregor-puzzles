// Shared navigation and project identity. Keep the approved artwork intact.
const external='target="_blank" rel="noopener noreferrer"';
const speaker='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/><path class="sound-wave" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
const question='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 3m0 2v1"/></svg>';

export function siteMarkup({active='play',roundNumber='01',playControls=false}={}) {
  // Only a round number can enter generated navigation markup.
  const round=/^\d{2}$/.test(String(roundNumber))?String(roundNumber):'01';
  const level=`?level=${round}`;
  const current=key=>active===key?' aria-current="page"':key==='science'&&active==='review'?' aria-current="location"':'';
  const header=`
    <div class="institution-strip"><div class="institution-inner"><a href="https://gregor.stanford.edu/" ${external}>GREGoR Stanford Site <span aria-hidden="true">↗</span></a><span>Genetics education</span></div></div>
    <header class="site-masthead${playControls?' has-play-controls':' without-play-controls'}">
      <a class="site-wordmark" href="./" aria-label="GREGoR Puzzles home"><img src="./icons/brand-wordmark.png" alt="GREGoR Puzzles" width="2172" height="724" fetchpriority="high" decoding="async"></a>
      <nav class="main-nav" aria-label="Main navigation">
        <a id="homeTab" href="./"${current('home')}>Home</a>
        <a id="playTab" href="./play.html${level}"${current('play')}>Play</a>
        <a id="collectionTab" href="./collection.html${level}"${current('collection')}>Collection</a>
        <a id="scienceTab" href="./science.html${level}"${current('science')}>Science</a>
      </nav>
      <div class="site-controls${playControls?'':' is-empty'}"${playControls?'':' aria-hidden="true"'}>${playControls?`<button class="site-control sound-button" id="soundButton" type="button" aria-pressed="true" aria-label="Turn sound off">${speaker}<span>Sound on</span></button><button class="site-control" id="helpButton" type="button" aria-label="How to play">${question}<span>How to play</span></button>`:''}</div>
    </header>`;
  const footer=`<footer class="site-footer">
    <div class="site-footer-identity">
      <span class="site-footer-name"><img src="./icons/brand-mark.png" alt="" width="24" height="24">GREGoR Puzzles</span>
      <a href="https://gregor.stanford.edu/" ${external}>GREGoR Stanford Site <span aria-hidden="true">↗</span></a>
    </div>
    <nav class="site-footer-links" aria-label="Footer navigation">
      <div class="site-footer-group"><span class="site-footer-label">Project</span><a href="./about.html${level}"${current('about')}>About</a><a href="./about.html#collaborate">For educators</a></div>
      <div class="site-footer-group"><span class="site-footer-label">Community</span><a href="./#leaderboard">Leaderboard</a><a href="./#suggest">Suggest a puzzle</a></div>
    </nav>
  </footer>`;
  return {header,footer};
}

export function renderSite(options={}) {
  const markup=siteMarkup(options);
  for(const [id,key] of [['siteHeader','header'],['siteFooter','footer']]){
    const host=document.getElementById(id);
    if(host&&!host.dataset.prerendered)host.innerHTML=markup[key];
  }
}

// Shared navigation and project identity. Keep the approved artwork intact.
const external='target="_blank" rel="noopener noreferrer"';
const speaker='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/><path class="sound-wave" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
const question='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 3m0 2v1"/></svg>';

export function renderSite({active='play',roundNumber='01',playControls=false}={}) {
  // Only a round number can enter generated navigation markup.
  const round=/^\d{2}$/.test(String(roundNumber))?String(roundNumber):'01';
  const level=`?level=${round}`;
  const current=key=>active===key?' aria-current="page"':key==='science'&&active==='review'?' aria-current="location"':'';
  const header=document.getElementById('siteHeader');
  if(header)header.innerHTML=`
    <div class="institution-strip"><div class="institution-inner"><a href="https://gregor.stanford.edu/" ${external}>GREGoR Stanford Site <span aria-hidden="true">↗</span></a><span>Educational prototype</span></div></div>
    <header class="site-masthead">
      <a class="site-wordmark" href="./${level}" aria-label="GREGoR Puzzles home"><img src="./icons/brand-wordmark.png" alt="GREGoR Puzzles" width="2172" height="724" fetchpriority="high" decoding="async"></a>
      <nav class="main-nav" aria-label="Main navigation">
        <a id="playTab" href="./${level}"${current('play')}>Play</a>
        <a id="collectionTab" href="./collection.html${level}"${current('collection')}>Collection</a>
        <a id="scienceTab" href="./science.html${level}"${current('science')}>Science &amp; sources</a>
      </nav>
      ${playControls?`<div class="site-controls"><button class="site-control sound-button" id="soundButton" type="button" aria-pressed="true" aria-label="Turn sound off">${speaker}<span>Sound on</span></button><button class="site-control" id="helpButton" type="button" aria-label="How to play">${question}<span>How to play</span></button></div>`:''}
    </header>`;
  const footer=document.getElementById('siteFooter');
  if(footer)footer.innerHTML=`<footer class="site-footer">
    <div class="site-footer-identity"><span class="site-footer-name"><img src="./icons/brand-mark.png" alt="" width="24" height="24">GREGoR Puzzles</span><span id="reviewSummary">Content pending scientific review</span></div>
    <nav aria-label="Project links"><a href="./about.html${level}"${current('about')}>About</a><a href="https://gregor.stanford.edu/" ${external}>GREGoR Stanford Site <span aria-hidden="true">↗</span></a><a href="./science.html${level}">Sources</a><a id="editorialFooter" href="./review.html${level}"${current('review')}>Editorial review</a><a href="https://github.com/sasha-gladkikh/gregor-puzzles/issues/new" ${external}>Report an issue <span aria-hidden="true">↗</span></a></nav>
  </footer>`;
}

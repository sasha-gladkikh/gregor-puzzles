import {siteMarkup} from '../game/site.mjs';

// Preserve the approved-round publication boundary in HTML, even without JS.
export function prepareHomeHTML(html,rounds){
 if(!rounds.length)throw new Error('The homepage needs at least one playable round.');
 const allowed=new Set(rounds.map(round=>round.number));
 const markup=siteMarkup({active:'home',roundNumber:rounds[0].number});
 let result=html
  .replace('<div id="siteHeader"></div>',`<div id="siteHeader" data-prerendered="true">${markup.header}</div>`)
  .replace('<div id="siteFooter"></div>',`<div id="siteFooter" data-prerendered="true">${markup.footer}</div>`)
  .replace(/(<a id="(?:homePlay|homeQuickPlayLink)"[^>]*href=")[^"]+("[^>]*>)/g,`$1./play.html?level=${rounds[0].number}$2`)
  .replace(/(<span id="roundCount">)\d+(<\/span>)/,`$1${rounds.length}$2`)
  .replace(/(<p id="homeProgress"[^>]*>)[\s\S]*?(<\/p>)/,`$1${rounds.length} rounds · 12 pieces each · No account required$2`)
  .replace(/<a\b[^>]*class="featured-card"[^>]*>[\s\S]*?<\/a>/g,card=>{
   const number=/[?&]level=(\d{2})/.exec(card)?.[1];return allowed.has(number)?card:'';
  })
  .replace(/<li><a href="\.\/play\.html\?level=(\d{2})">[\s\S]*?<\/a><\/li>/g,(item,number)=>allowed.has(number)?item:'');
 if(!allowed.has('01'))result=result.replace(/<figure class="hero-figure"[\s\S]*?<\/figure>/,'');
 result=result.replace(/(<select id="leaderboardRound">)[\s\S]*?(<\/select>)/,`$1<option value="${rounds[0].number}">Round ${rounds[0].number}</option>$2`)
  .replace(/(<a id="timedPlay"[^>]*href=")[^"]+("[^>]*>)/,`$1./play.html?level=${rounds[0].number}&amp;mode=timed$2`);
 return result;
}

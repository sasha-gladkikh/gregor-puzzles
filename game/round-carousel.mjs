// Home and Play share one visual record. Updating progress never replaces the
// links, so keyboard focus and the player's horizontal scroll position survive.
export function createRoundCarousel(list,catalogue,{currentRound='',assetQuery='',href=round=>`./play.html?level=${round.number}`}={}){
  const document=list.ownerDocument,thumbnails=new Map();
  list.style.setProperty('--round-count',String(catalogue.length));
  for(const round of catalogue){
    const item=document.createElement('li'),link=document.createElement('a'),image=document.createElement('img');
    link.className='discovery-thumb';link.href=href(round);
    image.src=`./artwork/${round.number}.webp${assetQuery}`;image.alt='';
    image.width=1200;image.height=900;image.loading='lazy';image.decoding='async';
    const badge=document.createElement('span'),bar=document.createElement('span');
    badge.className='discovery-thumb-number';bar.className='discovery-thumb-progress';
    badge.setAttribute('aria-hidden','true');bar.setAttribute('aria-hidden','true');
    if(round.number===currentRound)link.setAttribute('aria-current','page');
    link.append(image,badge,bar);item.append(link);list.append(item);
    thumbnails.set(round.number,{link,badge,bar});
  }
  function update(progress){
    for(const {round,done,pieces} of progress){
      const thumbnail=thumbnails.get(round.number);
      if(!thumbnail)continue;
      const {link,badge,bar}=thumbnail,current=round.number===currentRound;
      const status=done?'Complete':pieces?`${pieces} of 12 pieces placed`:'Not started';
      link.dataset.state=done?'complete':pieces?'started':'new';
      link.setAttribute('aria-label',`Round ${round.number}: ${round.topic}. ${status}.${current?' Current round.':''}`);
      link.title=`Round ${round.number} · ${round.topic} · ${status}${current?' · Current round':''}`;
      badge.textContent=done?'✓':round.number;
      bar.style.setProperty('--piece-progress',`${done?100:Math.max(0,Math.min(12,pieces))/12*100}%`);
    }
  }
  function revealCurrent(){
    const link=thumbnails.get(currentRound)?.link;
    if(!link||list.scrollWidth<=list.clientWidth)return;
    // Only move this horizontal strip. scrollIntoView would also pull the
    // entire page away from the puzzle or an in-progress piece placement.
    const container=list.getBoundingClientRect(),current=link.getBoundingClientRect();
    if(current.left<container.left||current.right>container.right){
      list.scrollLeft+=current.left-container.left-(container.width-current.width)/2;
    }
  }
  update(catalogue.map(round=>({round,done:false,pieces:0})));
  return {update,revealCurrent};
}

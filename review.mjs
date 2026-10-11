import {rounds} from './rounds.mjs';
const el=(tag,text,className)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;};
const link=(title,url)=>{const a=el('a',title+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
for(const round of rounds){
  const jump=el('a',`${round.number} · ${round.gene}`);jump.href=`#round-${round.number}`;document.getElementById('reviewIndex').append(jump);
  const card=el('article',null,'review-round');card.id=`round-${round.number}`;
  const head=el('header');head.append(el('span',`ROUND ${round.number} · ${round.topic.toUpperCase()}`,'eyebrow'),el('h2',round.gene),el('p',round.condition),el('span',round.reviewStatus,'review-badge'));card.append(head);
  const body=el('div',null,'review-columns'), visual=el('div');
  const img=el('img');img.src=round.artwork;img.alt=round.description;img.width=800;img.height=600;visual.append(img,el('p',round.description,'small'));
  const play=el('a','Open playable round →','primary');play.href=`./?level=${round.number}`;visual.append(play);
  const content=el('div');content.append(el('h3','Relationship and mechanism'),el('p',round.summary));
  const facts=el('dl',null,'gene-facts');for(const [title,text] of [['OMIM condition',round.omim],['Inheritance',round.inheritance],['Relevant variant classes',round.variant]]){const d=el('div');d.append(el('dt',title),el('dd',text));facts.append(d);}content.append(facts);
  content.append(el('h3','Phenotype summaries'));for(const [title,desc] of round.phenotypes){const p=el('p');p.append(el('strong',title+'. '),document.createTextNode(desc));content.append(p);}content.append(el('p',round.nuance,'nuance'));
  const clues=el('ol',null,'review-clues');for(const c of round.clues){const li=el('li');li.append(el('strong',`${c.at} pieces · ${c.label}: ${c.title}. `),document.createTextNode(c.body));clues.append(li);}content.append(el('h3','Progressive clues'),clues);
  for(const q of Object.values(round.checkpoints)){const block=el('section',null,'review-question');block.append(el('h3',q.title),el('p',q.context),el('strong',q.question));const opts=el('ol');q.options.forEach((option,i)=>opts.append(el('li',option+(q.correct===i?' ✓ Correct answer':''))));block.append(opts,el('p',q.explanation),link('Supporting reference',q.source));content.append(block);}
  const refs=el('nav',null,'review-sources');refs.setAttribute('aria-label',`${round.gene} sources`);for(const [title,url] of round.sources)refs.append(link(title,url));content.append(el('h3','Sources and community'),refs,link(...round.community),el('p',round.sourceNote,'source-note'),el('p',`Sources checked ${round.checked}.`,'source-note'));
  body.append(visual,content);card.append(body);document.getElementById('reviewRounds').append(card);
}

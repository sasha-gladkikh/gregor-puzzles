import {terminology,teachingConnections} from './teaching-data.mjs';

const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

// Split existing teaching text without changing its words or adding definitions
// to headings, gene choices, citations, or the puzzle's anonymous image labels.
export function termSegments(text,entries=terminology){
  const terms=entries.flatMap(entry=>[entry.term,...(entry.aliases??[])].map(term=>({term,entry})))
    .sort((a,b)=>b.term.length-a.term.length);
  if(!terms.length)return [{text}];
  const expression=new RegExp(`\\b(${terms.map(item=>escape(item.term)).join('|')})\\b`,'gi');
  const result=[];let end=0;
  for(const match of text.matchAll(expression)){
    if(match.index>end)result.push({text:text.slice(end,match.index)});
    result.push({text:match[0],entry:terms.find(item=>item.term.toLowerCase()===match[0].toLowerCase()).entry});
    end=match.index+match[0].length;
  }
  if(end<text.length)result.push({text:text.slice(end)});
  return result.length?result:[{text}];
}

export function connectionSegments(text,connections=[]){
  if(!connections.length)return [{text}];
  const expression=new RegExp(connections.map(item=>escape(item.label)).sort((a,b)=>b.length-a.length).join('|'),'g');
  const result=[];let end=0;
  for(const match of text.matchAll(expression)){
    if(match.index>end)result.push({text:text.slice(end,match.index)});
    result.push({text:match[0],landmark:connections.find(item=>item.label===match[0]).landmark});
    end=match.index+match[0].length;
  }
  if(end<text.length)result.push({text:text.slice(end)});
  return result;
}

export function renderTeachingConnection(host,round,text,onHighlight){
  host.replaceChildren();
  for(const segment of connectionSegments(text,teachingConnections[round.number])){
    if(segment.landmark===undefined){host.append(document.createTextNode(segment.text));continue;}
    const button=document.createElement('button');
    button.type='button';button.className='connection-term';button.textContent=segment.text;
    button.setAttribute('aria-label',`Locate ${segment.text} in the illustration`);
    button.addEventListener('click',()=>onHighlight(segment.landmark,true));
    button.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')onHighlight(segment.landmark,false);});
    button.addEventListener('pointerleave',()=>onHighlight(null,false));
    button.addEventListener('focus',()=>onHighlight(segment.landmark,false));
    button.addEventListener('blur',()=>onHighlight(null,false));
    host.append(button);
  }
}

export function createTermLens(){
  let panel=null,origin=null;
  let sequence=0;
  const events=new AbortController();
  function close(returnFocus=false){
    panel?.remove();panel=null;
    origin?.setAttribute('aria-expanded','false');
    origin?.removeAttribute('aria-controls');
    origin?.removeAttribute('aria-describedby');
    if(returnFocus&&origin?.isConnected)origin.focus({preventScroll:true});
    origin=null;
  }
  function open(button,entry){
    if(origin===button){close();return;}
    close();origin=button;button.setAttribute('aria-expanded','true');
    panel=document.createElement('aside');panel.className='term-lens';
    panel.id=`term-lens-${++sequence}`;panel.tabIndex=-1;
    panel.setAttribute('role','dialog');panel.setAttribute('aria-label',`${entry.term}: definition`);
    const heading=document.createElement('strong');heading.textContent=entry.term;
    const text=document.createElement('p');text.textContent=entry.definition;text.id=`${panel.id}-definition`;
    panel.setAttribute('aria-describedby',text.id);
    button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-describedby',text.id);
    const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='×';
    dismiss.setAttribute('aria-label','Close definition');dismiss.addEventListener('click',()=>close(true));
    panel.append(heading,dismiss,text);(button.closest('dialog')??document.body).append(panel);
    const rect=button.getBoundingClientRect(),box=panel.getBoundingClientRect();
    panel.style.left=`${Math.max(12,Math.min(rect.left,innerWidth-box.width-12))}px`;
    panel.style.top=`${Math.max(12,Math.min(rect.bottom+10,innerHeight-box.height-12))}px`;
    panel.focus({preventScroll:true});
  }
  document.addEventListener('click',event=>{if(panel&&!panel.contains(event.target)&&!origin?.contains(event.target))close();},{signal:events.signal});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel){event.preventDefault();event.stopPropagation();close(true);}},{capture:true,signal:events.signal});
  window.addEventListener('scroll',()=>close(),{capture:true,passive:true,signal:events.signal});
  window.addEventListener('resize',()=>close(),{signal:events.signal});
  return {
    enhance(container){
      if(!container)return;
      const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT),texts=[];
      while(walker.nextNode())if(!walker.currentNode.parentElement.closest('button,a,script,style,textarea,input,h1,h2,h3,h4,summary,[data-no-terms]'))texts.push(walker.currentNode);
      const seen=new Set([...container.querySelectorAll('[data-term-id]')].map(button=>button.dataset.termId));
      for(const text of texts){
        const segments=termSegments(text.textContent);
        if(!segments.some(part=>part.entry&&!seen.has(part.entry.id)))continue;
        const fragment=document.createDocumentFragment();
        for(const part of segments){
          if(!part.entry||seen.has(part.entry.id)){fragment.append(document.createTextNode(part.text));continue;}
          seen.add(part.entry.id);
          const button=document.createElement('button');button.type='button';button.className='term-help';button.textContent=part.text;
          button.dataset.termId=part.entry.id;button.setAttribute('aria-expanded','false');
          button.setAttribute('aria-haspopup','dialog');
          button.setAttribute('aria-label',`${part.text}: definition`);
          button.addEventListener('click',()=>open(button,part.entry));
          fragment.append(button);
        }
        text.replaceWith(fragment);
      }
    },
    close,
    destroy(){close();events.abort();}
  };
}

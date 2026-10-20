export const SHARE_PLAY_URL='https://sasha-gladkikh.github.io/gregor-puzzles/';
export const SHARE_CARD_WIDTH=1600;

const cleanText=(value,max)=>typeof value==='string'&&value.trim().length<=max?value.trim().replace(/\s+/g,' '):'';

// Project only completed-round fields. Player identity and timing never enter the image.
export function shareCardData(value){
 if(!value?.round||!Number.isInteger(value.completed)||!Number.isInteger(value.total)||value.completed<1||value.total<1||value.completed>value.total||value.total>100)return null;
 const number=String(value.round.number??'').padStart(2,'0');
 const gene=cleanText(value.round.gene,32),condition=cleanText(value.round.condition,240),topic=cleanText(value.round.topic,100),artwork=cleanText(value.round.artwork,2048);
 if(!/^\d{2}$/.test(number)||Number(number)<1||!gene||!condition||!topic||!artwork)return null;
 return {number,gene,condition,topic,artwork,completed:value.completed,total:value.total,url:SHARE_PLAY_URL,filename:`gregor-puzzles-round-${number}.png`};
}

export function wrapShareText(value,maxWidth,measure){
 if(!Number.isFinite(maxWidth)||maxWidth<=0||typeof measure!=='function')throw new TypeError('A positive width and text measurement are required.');
 const words=String(value??'').trim().split(/\s+/).filter(Boolean),lines=[];
 let current='';
 for(const word of words){
  if(measure(current?`${current} ${word}`:word)<=maxWidth){current=current?`${current} ${word}`:word;continue;}
  if(current){lines.push(current);current='';}
  // Split long unspaced names safely at Unicode code points instead of clipping.
  for(const character of word){
   if(current&&measure(current+character)>maxWidth){lines.push(current);current='';}
   current+=character;
  }
 }
 if(current)lines.push(current);
 return lines;
}

export function containShareImage(sourceWidth,sourceHeight,x,y,width,height){
 if(![sourceWidth,sourceHeight,width,height].every(value=>Number.isFinite(value)&&value>0)||![x,y].every(Number.isFinite))throw new TypeError('Image dimensions must be positive.');
 const scale=Math.min(width/sourceWidth,height/sourceHeight),w=sourceWidth*scale,h=sourceHeight*scale;
 return {x:x+(width-w)/2,y:y+(height-h)/2,width:w,height:h};
}

const rounded=(ctx,x,y,w,h,r)=>{
 ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
};
const setFont=(ctx,size,weight=400)=>{ctx.font=`${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;};

function imageReady(src,signal){
 return new Promise((resolve,reject)=>{
  const url=new URL(src,document.baseURI);
  if(url.origin!==location.origin){reject(new Error('The illustration must come from this site.'));return;}
  const image=new Image();let settled=false;
  const finish=(error)=>{
   if(settled)return;settled=true;clearTimeout(timeout);signal.removeEventListener('abort',abort);image.onload=null;image.onerror=null;
   if(error){image.removeAttribute('src');reject(error);}else resolve(image);
  };
  const abort=()=>finish(new DOMException('Image creation cancelled.','AbortError'));
  const timeout=setTimeout(()=>finish(new Error('The illustration took too long to load.')),18000);
  image.onload=()=>finish();image.onerror=()=>finish(new Error('The illustration could not be loaded.'));
  signal.addEventListener('abort',abort,{once:true});
  if(signal.aborted){abort();return;}
  image.src=url.href;
 });
}

async function renderShareImage(data,signal){
 const [artwork,mark]=await Promise.all([imageReady(data.artwork,signal),imageReady('./icons/brand-mark.png',signal)]);
 if(signal.aborted)throw new DOMException('Image creation cancelled.','AbortError');
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('This browser could not create an image.');
 const margin=80,contentWidth=SHARE_CARD_WIDTH-margin*2;
 setFont(ctx,44,400);
 const conditionLines=wrapShareText(data.condition,contentWidth,text=>ctx.measureText(text).width);
 setFont(ctx,27,600);
 const topicLines=wrapShareText(`ROUND ${data.number}  /  ${data.topic.toUpperCase()}`,contentWidth,text=>ctx.measureText(text).width);
 const artworkY=208+Math.max(0,topicLines.length-1)*36,artworkHeight=1080;
 const geneY=artworkY+artworkHeight+110,conditionY=geneY+68,progressY=conditionY+conditionLines.length*58+48;
 canvas.width=SHARE_CARD_WIDTH;canvas.height=progressY+282;
 ctx.fillStyle='#f4f7ff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle='#ffffff';rounded(ctx,32,32,canvas.width-64,canvas.height-64,30);ctx.fill();
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(mark,margin,66,84,84);
 ctx.fillStyle='#0b0b44';setFont(ctx,49,750);ctx.fillText('GREGoR',margin+106,124);
 const brandWidth=ctx.measureText('GREGoR').width;
 setFont(ctx,49,400);ctx.fillText(' Puzzles',margin+106+brandWidth,124);
 ctx.fillStyle='#526989';setFont(ctx,27,600);
 topicLines.forEach((line,index)=>ctx.fillText(line,margin,185+index*36));
 ctx.save();rounded(ctx,margin,artworkY,contentWidth,artworkHeight,20);ctx.clip();ctx.fillStyle='#f7fbff';ctx.fillRect(margin,artworkY,contentWidth,artworkHeight);
 const box=containShareImage(artwork.naturalWidth,artwork.naturalHeight,margin,artworkY,contentWidth,artworkHeight);ctx.drawImage(artwork,box.x,box.y,box.width,box.height);ctx.restore();
 ctx.strokeStyle='#d6e2f1';ctx.lineWidth=2;rounded(ctx,margin,artworkY,contentWidth,artworkHeight,20);ctx.stroke();
 let geneSize=78;setFont(ctx,geneSize,750);while(ctx.measureText(data.gene).width>contentWidth&&geneSize>34){geneSize-=2;setFont(ctx,geneSize,750);}
 ctx.fillStyle='#0b0b44';ctx.fillText(data.gene,margin,geneY);
 ctx.fillStyle='#3b5172';setFont(ctx,44,400);conditionLines.forEach((line,index)=>ctx.fillText(line,margin,conditionY+index*58));
 ctx.fillStyle='#edf3ff';rounded(ctx,margin,progressY-30,contentWidth,76,16);ctx.fill();
 ctx.fillStyle='#0752d4';setFont(ctx,30,650);ctx.fillText(`${data.completed} of ${data.total} rounds complete`,margin+24,progressY+19);
 const trackX=canvas.width-margin-420,trackY=progressY+2,trackWidth=380;
 ctx.fillStyle='#d2e1fd';rounded(ctx,trackX,trackY,trackWidth,10,5);ctx.fill();
 ctx.fillStyle='#0055ff';rounded(ctx,trackX,trackY,Math.max(10,trackWidth*data.completed/data.total),10,5);ctx.fill();
 ctx.fillStyle='#0b0b44';setFont(ctx,38,650);ctx.fillText('Piece together the biology.',margin,progressY+121);
 ctx.fillStyle='#0055db';setFont(ctx,27,500);ctx.fillText(data.url.replace(/^https:\/\//,''),margin,progressY+169);
 ctx.fillStyle='#6b7a92';setFont(ctx,22,400);ctx.fillText('An illustrated discovery in genetics.',margin,progressY+213);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('The image could not be exported.')),'image/png'));
}

const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};
let shareDialogId=0;

export function initShareCard(button,{getData,onOpen}={}){
 if(!button||typeof getData!=='function')throw new TypeError('A share button and completed-round data are required.');
 const id=`shareCard${++shareDialogId}`,dialog=node('dialog',undefined,'share-card-dialog');dialog.setAttribute('aria-labelledby',`${id}Title`);
 const heading=node('div',undefined,'share-card-heading'),title=node('h2','Share your discovery');title.id=`${id}Title`;
 const closeButton=node('button','×','share-card-close');closeButton.type='button';closeButton.setAttribute('aria-label','Close share preview');
 heading.append(title,closeButton);
 const description=node('p','A keepsake of the biology you pieced together.','share-card-description');description.id=`${id}Description`;dialog.setAttribute('aria-describedby',description.id);
 const preview=node('div',undefined,'share-card-preview'),previewImage=node('img');previewImage.hidden=true;preview.append(previewImage);
 const status=node('p','','share-card-status');status.setAttribute('role','status');
 const actions=node('div',undefined,'share-card-actions');
 const share=node('button','Share image','share-card-primary');share.type='button';share.hidden=true;
 const download=node('a','Download image','share-card-secondary');download.hidden=true;
 const copy=node('button','Copy play link','share-card-secondary');copy.type='button';
 const retry=node('button','Try again','share-card-secondary');retry.type='button';retry.hidden=true;
 const link=node('input',undefined,'share-card-link');link.type='url';link.readOnly=true;link.value=SHARE_PLAY_URL;link.hidden=true;link.setAttribute('aria-label','Play link to copy');
 actions.append(share,download,copy,retry);dialog.append(heading,description,preview,status,actions,link);document.body.append(dialog);
 let current=null,request=null,objectURL=null,shareFile=null,generation=0,destroyed=false;
 const release=()=>{if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}shareFile=null;previewImage.removeAttribute('src');download.removeAttribute('href');};
 const reset=()=>{generation++;request?.abort();request=null;release();previewImage.hidden=true;share.hidden=true;download.hidden=true;retry.hidden=true;link.hidden=true;preview.classList.remove('is-ready');};
 async function generate(){
  reset();const token=generation;request=new AbortController();preview.setAttribute('aria-busy','true');status.textContent='Preparing your illustration…';
  try{
   const blob=await renderShareImage(current,request.signal);
   if(token!==generation||destroyed||!dialog.open)return;
   objectURL=URL.createObjectURL(blob);previewImage.src=objectURL;previewImage.alt=`GREGoR Puzzles, round ${current.number}: ${current.gene}, ${current.condition}. ${current.completed} of ${current.total} rounds complete.`;previewImage.hidden=false;
   download.href=objectURL;download.download=current.filename;download.hidden=false;
   if(typeof File==='function'){
    shareFile=new File([blob],current.filename,{type:'image/png'});
    try{share.hidden=!(typeof navigator.share==='function'&&navigator.canShare?.({files:[shareFile]}));}catch{share.hidden=true;}
   }
   preview.classList.add('is-ready');status.textContent='Your illustration is ready.';
  }catch(error){
   if(token!==generation||error?.name==='AbortError')return;
   status.textContent='The image could not be prepared. Try again, or copy the play link.';retry.hidden=false;
  }finally{if(token===generation)preview.removeAttribute('aria-busy');}
 }
 function open(){
  if(destroyed||dialog.open)return false;
  const data=shareCardData(getData());if(!data)return false;
  current=data;onOpen?.();dialog.showModal();closeButton.focus();void generate();return true;
 }
 function close(){if(dialog.open)dialog.close();}
 const restoreFocus=()=>{reset();current=null;if(!destroyed&&button.isConnected&&!button.hidden)button.focus({preventScroll:true});};
 button.addEventListener('click',open);closeButton.addEventListener('click',close);dialog.addEventListener('close',restoreFocus);retry.addEventListener('click',generate);
 copy.addEventListener('click',async()=>{
  const token=generation;
  try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(SHARE_PLAY_URL);if(dialog.open&&token===generation)status.textContent='Play link copied.';}
  catch{if(dialog.open&&token===generation){link.hidden=false;link.focus();link.select();status.textContent='Select and copy this play link.';}}
 });
 share.addEventListener('click',async()=>{
  if(!shareFile)return;const token=generation;share.disabled=true;
  try{await navigator.share({files:[shareFile],title:'GREGoR Puzzles'});if(dialog.open&&token===generation)status.textContent='Your discovery is ready to share.';}
  catch(error){if(dialog.open&&token===generation)status.textContent=error?.name==='AbortError'?'Your illustration is ready.':'Sharing is unavailable here. Download the image or copy the play link.';}
  finally{share.disabled=false;}
 });
 return {open,close,destroy(){if(destroyed)return;destroyed=true;button.removeEventListener('click',open);close();reset();dialog.remove();}};
}

// Enlarge the original board and its existing renderer. No second animation,
// decoded image, or independent playback state is created.
export function createFigureView({dialog,frame,playback,stageHost,controlsHost,motion,onOpen=()=>{},focusTarget,request=requestAnimationFrame,cancel=cancelAnimationFrame}){
  let placeholders=null,resumeFrame=null,disposed=false;
  const stopResume=()=>{if(resumeFrame!==null)cancel(resumeFrame);resumeFrame=null;};
  function restore(){
    stopResume();
    if(!placeholders)return;
    motion()?.pause();
    const saved=placeholders;placeholders=null;
    saved.frame.replaceWith(frame);saved.controls.replaceWith(playback);
    focusTarget?.focus({preventScroll:true});
  }
  function open(){
    if(disposed||placeholders||dialog.open)return;
    const animation=motion();
    const wasPlaying=animation?.element.dataset.state==='playing';
    onOpen();animation?.pause();
    const framePlaceholder=frame.ownerDocument.createElement('div');
    framePlaceholder.className='board-frame figure-placeholder';
    framePlaceholder.setAttribute('aria-hidden','true');
    framePlaceholder.style.height=`${frame.offsetHeight}px`;
    const controlPlaceholder=frame.ownerDocument.createComment('illustration playback');
    frame.before(framePlaceholder);playback.before(controlPlaceholder);
    placeholders={frame:framePlaceholder,controls:controlPlaceholder};
    stageHost.append(frame);controlsHost.append(playback);
    try{dialog.showModal();}catch(error){restore();throw error;}
    if(wasPlaying)resumeFrame=request(()=>{
      resumeFrame=null;
      if(!disposed&&!frame.ownerDocument.hidden&&dialog.open&&placeholders)motion()?.play();
    });
  }
  const hidden=()=>{if(frame.ownerDocument.hidden){stopResume();motion()?.pause();}};
  // Native close events are queued. An older event must not dismantle a view
  // that was reopened after close() already restored its previous contents.
  const closed=()=>{if(!dialog.open)restore();};
  dialog.addEventListener('close',closed);
  frame.ownerDocument.addEventListener('visibilitychange',hidden);
  return {open,close(){stopResume();if(dialog.open)dialog.close();restore();},dispose(){if(disposed)return;disposed=true;stopResume();if(dialog.open)dialog.close();restore();dialog.removeEventListener('close',closed);frame.ownerDocument.removeEventListener('visibilitychange',hidden);}};
}

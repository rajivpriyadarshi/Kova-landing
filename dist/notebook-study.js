// The notebook owns only its rotation offsets, zoom, and rendering choice.
// Drag follows input directly, release holds the view, and reset is interruptible.
// Touch reserves vertical panning and pinch zoom for the browser. No idle motion.
export function createNotebookStudy({allowed,requestRender,onInteract}){
 const surface=document.querySelector('#notebook-ring');
 const board=document.querySelector('.thought-board');
 const buttons=[...document.querySelectorAll('[data-notebook-action]')];
 const modes=[...document.querySelectorAll('[data-notebook-mode]')];
 const output=document.querySelector('#notebook-zoom');
 const state={x:0,y:0,zoom:1};
 let mode=null,wire=false,drag=null,resetTween=null;
 const abort=new AbortController();
 const listen=(target,type,callback)=>target.addEventListener(type,callback,{signal:abort.signal});
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

 function sync(){
  board.dataset.rendering=wire?'sketch':'solid';
  modes.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.notebookMode===(wire?'sketch':'solid'))));
  output.value=Math.round(state.zoom*100)+'%';
  buttons.find(button=>button.dataset.notebookAction==='in').disabled=state.zoom>=1.35;
  buttons.find(button=>button.dataset.notebookAction==='out').disabled=state.zoom<=1;
 }
 function takeControl(){
  resetTween?.kill();resetTween=null;onInteract();
  // Once touched, a scroll reveal must not override the chosen rendering.
  if(mode===null)mode=wire?'sketch':'solid';
 }
 function zoom(delta){takeControl();state.zoom=clamp(Math.round((state.zoom+delta)*100)/100,1,1.35);sync();requestRender()}
 function rotate(x,y){takeControl();state.x=clamp(state.x+x,-.8,.8);state.y+=y;requestRender()}
 function endDrag(){
  if(!drag)return;
  const id=drag.id;drag=null;surface.classList.remove('is-dragging');
  if(surface.hasPointerCapture(id))surface.releasePointerCapture(id);
 }
 function reset(){
  endDrag();takeControl();
  if(!allowed()||!window.gsap){Object.assign(state,{x:0,y:0,zoom:1});sync();requestRender();return}
  resetTween=gsap.to(state,{x:0,y:0,zoom:1,duration:.45,ease:'power3.out',onUpdate:()=>{sync();requestRender()},onComplete:()=>{resetTween=null}});
 }
 listen(surface,'pointerdown',event=>{
  if(!event.isPrimary||event.button!==0||drag)return;
  takeControl();
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,rx:state.x,ry:state.y,touch:event.pointerType==='touch',moving:false};
  surface.setPointerCapture(event.pointerId);surface.classList.add('is-dragging');
 });
 listen(surface,'pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(drag.touch&&!drag.moving){
   if(Math.abs(dx)<6||Math.abs(dx)<=Math.abs(dy)*1.1)return;
   drag.moving=true;
  }
  state.y=drag.ry+dx*.009;
  state.x=drag.touch?drag.rx:clamp(drag.rx+dy*.006,-.8,.8);
  requestRender();
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(surface,type,event=>{if(drag?.id===event.pointerId)endDrag()});
 listen(window,'blur',endDrag);
 listen(surface,'keydown',event=>{
  const rotations={ArrowLeft:[0,-.2],ArrowRight:[0,.2],ArrowUp:[-.12,0],ArrowDown:[.12,0]};
  if(rotations[event.key]){event.preventDefault();rotate(...rotations[event.key])}
  else if(['+','=','-'].includes(event.key)){event.preventDefault();zoom(event.key==='-'?-.1:.1)}
  else if(event.key==='Home'){event.preventDefault();reset()}
  else if(event.key==='Escape')endDrag();
 });
 modes.forEach(button=>listen(button,'click',()=>{takeControl();mode=button.dataset.notebookMode;wire=mode==='sketch';sync();requestRender()}));
 buttons.forEach(button=>listen(button,'click',()=>{
  const action=button.dataset.notebookAction;
  if(action==='reset')reset();
  else if(action==='in'||action==='out')zoom(action==='in'?.1:-.1);
  else rotate(0,action==='left'?-.3:.3);
 }));
 surface.tabIndex=0;
 return {
  state,
  rendering(automaticWire){wire=mode===null?automaticWire:mode==='sketch';sync();return wire},
  cancel:endDrag,
  preferences(){if(!allowed()&&resetTween){resetTween.progress(1);resetTween=null}},
  dispose(){endDrag();abort.abort();resetTween?.kill();surface.tabIndex=-1}
 };
}

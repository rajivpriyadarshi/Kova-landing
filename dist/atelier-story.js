export function createAtelierStory({motionAllowed}){
 const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
 const desk={
  research:['Collect a point of view.','A detail worth carrying forward.','DESIGN INTENTION','A sculpted shoulder.\nA quiet strength.'],
  design:['Give the idea its own voice.','One direction. Room for variation.','THE DESIGNER’S NOTE','Keep the petal.\nTurn the stone.'],
  materials:['Bring substance to the sketch.','Every choice belongs to the piece.','MATERIAL PALETTE','Gold, emerald,\nand considered form.'],
  marketing:['Let the piece tell its story.','The same idea, ready to be shared.','COLLECTION STUDY','The folded petal.\nA new expression.']
 };
 const owners={
  designer:['In the designer’s hands.','DESIGN INTENTION','Preserve the folded petal shoulders.','CREATIVE CONTEXT','References. Variations. Decisions.'],
  manufacturer:['At the manufacturer’s bench.','TECHNICAL REVIEW','Confirm the setting and material requirements.','WORKING CONTEXT','Design intent. Specifications. Review notes.'],
  studio:['Ready for the studio’s eye.','PRESENTATION CONTEXT','Carry the character of the piece into its story.','SHARED CONTEXT','Selected imagery. Product story. Feedback.']
 };
 let context,deskTween,ownerTween,doorsTween;
 function updateDesk(stage){
  const data=desk[stage];if(!data)return;
  $('.atelier-desk').dataset.stage=stage;
  ['#desk-title','#desk-copy','#desk-note-label','#desk-note'].forEach((selector,i)=>$(selector).innerText=data[i]);
  all('[data-desk-stage]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.deskStage===stage)));
  deskTween?.kill();
  if(window.gsap&&motionAllowed())deskTween=gsap.fromTo('.desk-caption h3,.desk-caption p,.desk-paper p',{y:12,opacity:.25},{y:0,opacity:1,duration:.55,stagger:.05,ease:'power3.out',clearProps:'transform,opacity'});
 }
 function updateOwner(owner){
  const data=owners[owner];$('.handoff-stage').dataset.owner=owner;
  ['#handoff-title','#handoff-note-label','#handoff-note','#handoff-evidence-label','#handoff-evidence'].forEach((selector,i)=>$(selector).textContent=data[i]);
  all('.handoff-select').forEach(button=>{const selected=button.dataset.owner===owner;button.setAttribute('aria-pressed',String(selected));button.closest('article')?.classList.toggle('is-selected',selected)});
  ownerTween?.kill();
  if(window.gsap&&motionAllowed())ownerTween=gsap.fromTo('.handoff-note,.handoff-evidence',{y:15,opacity:.3},{y:0,opacity:1,duration:.65,stagger:.1,ease:'power3.out',clearProps:'transform,opacity'});
  window.dispatchEvent(new CustomEvent('kova:owner',{detail:owner}));
 }
 window.addEventListener('kova:stage',event=>updateDesk(event.detail));
 all('.handoff-select').forEach(button=>button.addEventListener('click',()=>{
  updateOwner(button.dataset.owner);
  if(button.closest('article'))$('.handoff-stage').scrollIntoView({behavior:motionAllowed()?'smooth':'instant',block:'center'});
 }));
 $('.atelier-entry').addEventListener('click',()=>{
  if(!window.gsap||!motionAllowed())return;
  doorsTween?.kill();doorsTween=gsap.timeline().set('.atelier-doors',{autoAlpha:1})
   .fromTo('.atelier-doors>span:first-child',{xPercent:0},{xPercent:-102,duration:.85,ease:'power3.inOut'},0)
   .fromTo('.atelier-doors>span:last-child',{xPercent:0},{xPercent:102,duration:.85,ease:'power3.inOut'},0)
   .set('.atelier-doors',{autoAlpha:0});
 });
 updateDesk('research');updateOwner('designer');
 function reset(){
  context?.revert();context=null;deskTween?.kill();ownerTween?.kill();doorsTween?.kill();
  if(window.gsap){gsap.set('.desk-caption h3,.desk-caption p,.desk-paper p,.handoff-note,.handoff-evidence',{clearProps:'transform,opacity'});gsap.set('.atelier-doors',{autoAlpha:0})}
 }
 function mount(){
  if(!motionAllowed()||!window.gsap||!window.ScrollTrigger)return;
  context=gsap.context(()=>{
   gsap.from('.thought-reference',{y:50,rotation:-22,opacity:0,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:'.thought-board',start:'top 85%',toggleActions:'play none none reverse'}});
   gsap.from('.thought-note',{y:20,opacity:0,stagger:.2,duration:.8,ease:'power3.out',scrollTrigger:{trigger:'.thought-board',start:'top 70%',toggleActions:'play none none reverse'}});
   const path=$('.note-a path'),length=path.getTotalLength();
   gsap.fromTo(path,{strokeDasharray:length,strokeDashoffset:length},{strokeDashoffset:0,ease:'none',scrollTrigger:{trigger:'.thought-board',start:'top 80%',end:'center center',scrub:.5}});
   gsap.fromTo('.handoff-thread',{scaleX:0},{scaleX:1,transformOrigin:'left',ease:'none',scrollTrigger:{trigger:'.handoff-stage',start:'top 80%',end:'center center',scrub:.5}});
   gsap.fromTo('.finale-light',{xPercent:-55,rotation:-30},{xPercent:55,rotation:20,ease:'none',scrollTrigger:{trigger:'.closing',start:'top bottom',end:'center center',scrub:.6}});
  });
 }
 return {mount,reset};
}

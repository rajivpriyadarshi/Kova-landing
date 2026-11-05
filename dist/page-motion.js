// Editorial motion is owned separately from the opening film. Every effect is
// finite or scroll-driven; semantic navigation and tab state change immediately.
export function createPageMotion({motionAllowed}) {
 const $=selector=>document.querySelector(selector);
 const all=selector=>[...document.querySelectorAll(selector)];
 const chapterLinks=all('.chapter-rail a'),chapters=chapterLinks.map(a=>$(a.getAttribute('href')));
 const rail=$('.chapter-rail'),progress=$('.reading-progress i'),card=$('.craft-image');
 const drawing=all('.construction-lines path,.construction-lines ellipse');
 const drawButton=$('#plate-replay');
 let context,stageTimeline,drawTimeline,stageVersion=0,scrollFrame=0;
 let tiltX,tiltY,lightX,lightY;
 const faqTweens=new Map(),seen=new WeakSet();

 function updateReading(){
  scrollFrame=0;
  const max=document.documentElement.scrollHeight-innerHeight;
  progress.style.transform=`scaleX(${max>0?Math.min(1,Math.max(0,scrollY/max)):0})`;
  rail.classList.toggle('is-visible',scrollY>$('.hero').offsetHeight*.65);
  let active=-1;
  chapters.forEach((section,i)=>{if(section.getBoundingClientRect().top<innerHeight*.4)active=i});
  chapterLinks.forEach((link,i)=>{if(i===active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')});
 }
 const reading=()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateReading)};
 window.addEventListener('scroll',reading,{passive:true});window.addEventListener('resize',reading,{passive:true});
 document.fonts.ready.then(reading);reading();

 function drawStudy(){
  drawTimeline?.kill();
  if(!window.gsap)return;
  gsap.set(drawing,{clearProps:'strokeDasharray,strokeDashoffset'});
  gsap.set('.plate-scan',{opacity:0,clearProps:'transform'});
  if(!motionAllowed())return;
  drawTimeline=gsap.timeline({defaults:{ease:'power2.inOut'}});
  drawing.forEach((path,i)=>{
   const length=path.getTotalLength();
   drawTimeline.fromTo(path,{strokeDasharray:length,strokeDashoffset:length},{strokeDashoffset:0,duration:1.15,clearProps:'strokeDasharray,strokeDashoffset'},i*.065);
  });
  drawTimeline.fromTo('.plate-scan',{yPercent:0,opacity:0},{opacity:.6,duration:.2},0)
   .to('.plate-scan',{y:()=>$('.technical-plate').clientHeight-100,duration:1.8,ease:'power1.inOut'},0)
   .to('.plate-scan',{opacity:0,duration:.25},1.65);
 }
 drawButton.addEventListener('click',drawStudy);

 function transitionStage(direction){
  const version=++stageVersion;stageTimeline?.kill();
  if(!window.gsap)return;
  const image=$('#stage-img'),copy=all('.stage-description>*');
  gsap.set([image,...copy],{clearProps:'opacity,transform,visibility'});
  gsap.set('.stage-sheen',{opacity:0});
  if(!motionAllowed())return;
  // A stale decode cannot animate an image selected by a newer click.
  Promise.resolve(image.decode?.()).catch(()=>{}).then(()=>{
   if(version!==stageVersion||!motionAllowed())return;
   stageTimeline=gsap.timeline({defaults:{ease:'power3.out'}})
    .fromTo(image,{scale:1.035,x:direction*12,opacity:.4},{scale:1,x:0,opacity:1,duration:.65,clearProps:'opacity,transform'},0)
    .fromTo(copy,{y:12,opacity:0},{y:0,opacity:1,duration:.45,stagger:.055,clearProps:'opacity,transform'},.06)
    .fromTo('.stage-sheen',{xPercent:-150,opacity:.45},{xPercent:220,duration:.8,ease:'power2.inOut'},0)
    .to('.stage-sheen',{opacity:0,duration:.15},.65);
  });
 }

 card.addEventListener('pointermove',event=>{
  if(!motionAllowed()||!tiltX||event.pointerType==='touch')return;
  const box=card.getBoundingClientRect(),x=(event.clientX-box.left)/box.width,y=(event.clientY-box.top)/box.height;
  tiltX((.5-y)*4);tiltY((x-.5)*5);lightX(x*box.width);lightY(y*box.height);
  card.classList.add('is-inspecting');
 });
 card.addEventListener('pointerleave',()=>{tiltX?.(0);tiltY?.(0);card.classList.remove('is-inspecting')});
 all('.faq-list details').forEach(details=>details.addEventListener('toggle',()=>{
  faqTweens.get(details)?.kill();
  const answers=[...details.children].filter(child=>child.tagName!=='SUMMARY');
  if(window.gsap){gsap.set(answers,{clearProps:'opacity,transform'});if(details.open&&motionAllowed())faqTweens.set(details,gsap.fromTo(answers,{y:8,opacity:.3},{y:0,opacity:1,duration:.3,stagger:.04,ease:'power2.out',clearProps:'opacity,transform'}));}
  reading();
 }));

 function reset(){
  stageVersion++;stageTimeline?.kill();drawTimeline?.kill();context?.revert();context=null;
  faqTweens.forEach(tween=>tween.kill());faqTweens.clear();
  tiltX=tiltY=lightX=lightY=null;card.classList.remove('is-inspecting');
  drawButton.disabled=!motionAllowed();
  if(window.gsap){
   gsap.set(drawing,{clearProps:'strokeDasharray,strokeDashoffset'});
   gsap.set('.stage-description>*,#stage-img,.faq-list details>p,.faq-list details>a',{clearProps:'opacity,transform,visibility'});
   gsap.set('.plate-scan,.stage-sheen',{opacity:0,clearProps:'transform'});
  }
 }
 function mount(){
  if(!motionAllowed()||!window.gsap||!window.ScrollTrigger)return;
  context=gsap.context(()=>{
   const enter=(elements,trigger,vars={})=>{
    const list=typeof elements==='string'?all(elements):elements;
    if(!list.length)return;
    const anchor=typeof trigger==='string'?$(trigger):trigger;
    if(seen.has(anchor))return;
    if(anchor.getBoundingClientRect().top<innerHeight*.86){seen.add(anchor);return;}
    gsap.from(list,{y:25,opacity:0,duration:.9,stagger:.08,ease:'power3.out',...vars,
     scrollTrigger:{trigger:anchor,start:'top 88%',once:true,onEnter:()=>seen.add(anchor)},clearProps:'transform,opacity,visibility'});
   };
   // A line of thought becomes legible as it moves into the reading position.
   all('.manifesto-line').forEach(line=>gsap.fromTo(line,{opacity:.3,y:18},{opacity:1,y:0,ease:'none',scrollTrigger:{trigger:line,start:'top 91%',end:'top 65%',scrub:.35}}));
   gsap.fromTo('.idea-orbit',{rotation:-18},{rotation:18,ease:'none',scrollTrigger:{trigger:'.manifesto',start:'top bottom',end:'bottom top',scrub:.7}});
   enter('.manifesto-bottom>*','.manifesto-bottom',{y:16});
   enter('.disciplines>a,.disciplines>i','.disciplines',{y:10,duration:.65,stagger:.055});
   gsap.fromTo('.discipline-line',{scaleX:0},{scaleX:1,transformOrigin:'left',ease:'none',scrollTrigger:{trigger:'.disciplines',start:'top 92%',end:'top 50%',scrub:.5}});

   all('.section-meta').forEach(meta=>enter([...meta.children],meta,{y:10,duration:.6}));
   all('.reveal,.questions h2').forEach(heading=>enter([heading],heading,{y:32,duration:.95}));
   enter('.section-heading>p','.section-heading>p');
   enter(['.workspace'].map($),'.workspace',{rotationX:5,y:45,transformPerspective:1400,transformOrigin:'50% 100%',duration:1.15});
   enter('.constraint-row','.craft-copy',{x:18,y:0,stagger:.12});
   enter('.precision-copy>p,.precision-copy>.text-link,.precision-copy>small','.precision-copy',{y:16});

   enter('.image-label,.image-pin','.craft-image',{y:12,stagger:.2,duration:1});
   ScrollTrigger.create({trigger:'.technical-plate',start:'top 82%',once:true,onEnter:()=>{if(!seen.has($('.technical-plate'))){seen.add($('.technical-plate'));drawStudy()}}});
   enter('.people-rows article','.people-rows',{x:-18,y:12,stagger:.15,duration:.85});
   enter('.faq-list details','.faq-list',{y:16,stagger:.075,duration:.75});

   gsap.fromTo('.closing-facet',{rotation:-20,scale:.88},{rotation:7,scale:1.06,ease:'none',scrollTrigger:{trigger:'.closing',start:'top bottom',end:'bottom top',scrub:.7}});
   enter('.closing-title-part','.closing h2',{y:55,stagger:.12,duration:1.15});
   enter('.closing>.button,.closing>small','.closing>.button',{y:20,stagger:.15,duration:.8});
   enter('.closing-watermark>span','.closing',{yPercent:70,y:0,stagger:.09,duration:1.4});
  });
 }
 return {mount,reset,transitionStage,refreshReading:reading};
}

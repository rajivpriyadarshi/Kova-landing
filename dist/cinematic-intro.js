import * as THREE from './assets/three/three.module.js';

// One continuous shot: line -> gold -> facets -> hero. The same live WebGL
// scene is reframed into its real page rectangle, never replaced by a video.
// No scroll lock. Skip, Escape, Tab, scroll and reduced motion end the opening.
export function createCinematicIntro({renderer,camera,ring,build,stoneStage,host,rest,requestRender,resize,onFinish,onSkip}) {
 const root=document.documentElement,ui=document.querySelector('#cinema-ui');
 const dock=document.querySelector('#ring-dock'),interior=document.querySelector('#gem-interior');
 const title=document.querySelector('#cinema-caption'),chapter=document.querySelector('#cinema-chapter');
 const progress=document.querySelector('#cinema-progress'),pause=document.querySelector('#cinema-pause');
 let active=false,timeline=null,targetRect=null,viewport=null,startScroll=scrollY,manuallyPaused=false;
 const shot={azimuth:-.7,elevation:.13,radius:6.3,targetY:.4,roll:-.07,dock:0,exposure:.8,floor:0,progress:0};
 const aim=new THREE.Vector3();
 const restRadius=Math.hypot(3.3,3,6.5),restAzimuth=Math.atan2(3.3,6.5),restElevation=Math.asin(3/restRadius);
 function phase(name,text,number){host.dataset.phase=name;title.textContent=text;chapter.textContent=number+' / 04';document.querySelector('#ring-status').textContent=text;}
 function finish(){
  const needsResize=active||root.classList.contains('cinema-pending');
  active=false;manuallyPaused=false;timeline?.kill();timeline=null;
  root.classList.remove('cinema-pending','cinema-active','cinema-revealing');
  root.style.removeProperty('--cinema-cover');ui.style.removeProperty('opacity');host.style.removeProperty('mask-image');
  interior.style.opacity='0';interior.style.visibility='hidden';
  pause.textContent='Pause';pause.setAttribute('aria-label','Pause introduction');
  renderer.setScissorTest(false);renderer.toneMappingExposure=1.15;
  stoneStage.setOpacity(1);build.complete();if(needsResize)resize();
  host.dataset.phase='complete';document.querySelector('#ring-status').textContent='Interactive 3D concept';
  requestRender();
 }
 function play(){
  finish();startScroll=scrollY;targetRect=dock.getBoundingClientRect();
  Object.assign(shot,{azimuth:-.7,elevation:.13,radius:6.3,targetY:.4,roll:-.07,dock:0,exposure:.8,floor:0,progress:0});
  Object.assign(build.state,{outlineHeight:-1.7,outlineOpacity:.85,fillHeight:-1.7,pieceOpacity:0,assembled:false,goldDock:0,spread:1.3});
  build.parts.forEach(p=>p.userData.progress=0);build.update();
  ring.rotation.set(.18,-.72,-.38);ring.scale.setScalar(1);
  active=true;root.classList.remove('cinema-pending');root.classList.add('cinema-active');
  root.style.setProperty('--cinema-cover','1');ui.style.opacity='1';resize();
  phase('interior','Within a single possibility.','01');
  timeline=gsap.timeline({defaults:{ease:'power2.inOut'},onUpdate:()=>{progress.style.transform=`scaleX(${shot.progress})`;requestRender()},onComplete:()=>{finish();onFinish()}})
   .addLabel('outline',0)
   .to(shot,{progress:1,duration:8.6,ease:'none'},0)
   .to(build.state,{outlineHeight:2.2,duration:1.7,ease:'sine.inOut'},0)
   .to(shot,{azimuth:.18,elevation:.32,radius:6.6,targetY:.3,roll:.035,duration:3.15,ease:'sine.inOut'},0)
   .to(ring.rotation,{y:.15,x:.32,z:-.28,duration:3.15,ease:'sine.inOut'},0)
   .addLabel('gold',1.45)
   .call(()=>phase('gold','Drawn into gold.','02'),null,'gold')
   .to(build.state,{fillHeight:2.2,duration:1.9,ease:'sine.inOut'},'gold')
   .to(build.state,{goldDock:1,duration:1.8,ease:'power3.inOut'},'gold+=.2')
   .to(shot,{exposure:1.15,duration:1.3},'gold')
   .addLabel('emerald',3.35)
   .call(()=>phase('emerald','Every facet finds its place.','03'),null,'emerald')
   .to(build.state,{pieceOpacity:1,duration:.5},'emerald')
   .to(build.parts.map(p=>p.userData),{progress:1,duration:1.25,stagger:.11,ease:'power3.inOut'},'emerald+=.25')
   .to(build.state,{outlineOpacity:0,duration:.75},'emerald+=.3')
   .to(shot,{azimuth:.65,elevation:.57,radius:5.65,targetY:.75,roll:-.045,duration:2.2,ease:'sine.inOut'},3.15)
   .to(ring.rotation,{y:-.32,x:.2,z:-.38,duration:2.2,ease:'sine.inOut'},3.15)
   .call(()=>phase('facets','Every facet finds its place.','03'),null,4.4)
   .call(()=>{build.state.assembled=true;phase('finished','Imagination, made tangible.','04')},null,5.65)
   .to(shot,{floor:1,duration:1.1},5.45)
   .addLabel('reveal',6.05)
   .call(()=>{phase('docking','Imagination, made tangible.','04');root.classList.add('cinema-revealing')},null,'reveal')
   .to(shot,{dock:1,azimuth:restAzimuth,elevation:restElevation,radius:restRadius,targetY:.25,roll:0,duration:2.55,ease:'power3.inOut'},'reveal')
   .to(ring.rotation,{...rest,duration:2.55,ease:'power3.inOut'},'reveal')
   .to(root,{'--cinema-cover':0,duration:1.8,ease:'sine.inOut'},'reveal')
   .to(ui,{opacity:0,duration:.65},'reveal');
  timeline.shiftChildren(1.2,true,0);
  timeline.fromTo(interior,{autoAlpha:1,scale:1.5,rotation:-10},{autoAlpha:0,scale:.82,rotation:4,duration:1.6,ease:'power2.inOut'},0)
   .call(()=>phase('outline','From a line, a possibility.','01'),null,1.2);
  requestRender();return timeline;
 }
 function prepare(){
  const bounds=host.getBoundingClientRect();
  if(!active){
   const factor=Math.max(1,Math.min(1.32,.86/(bounds.width/bounds.height)));
   camera.aspect=bounds.width/bounds.height;camera.fov=35;camera.position.set(3.3,3,6.5).multiplyScalar(factor);camera.up.set(0,1,0);camera.lookAt(0,.25,0);camera.updateProjectionMatrix();
   viewport=null;return;
  }
  const d=shot.dock,w=innerWidth,h=innerHeight;
  viewport={x:THREE.MathUtils.lerp(0,targetRect.left,d),y:THREE.MathUtils.lerp(0,targetRect.top,d),width:THREE.MathUtils.lerp(w,targetRect.width,d),height:THREE.MathUtils.lerp(h,targetRect.height,d)};
  camera.aspect=viewport.width/viewport.height;camera.fov=35;
  // Portrait gets the same choreography with enough room for the outer facets.
  const portrait=THREE.MathUtils.clamp((.85-camera.aspect)/.4,0,1);
  const finalFit=Math.max(1,Math.min(1.32,.86/camera.aspect));
  const radius=shot.radius*THREE.MathUtils.lerp(1+portrait*.7,finalFit,d);
  camera.position.set(Math.sin(shot.azimuth)*Math.cos(shot.elevation)*radius,Math.sin(shot.elevation)*radius,Math.cos(shot.azimuth)*Math.cos(shot.elevation)*radius);
  aim.set(0,shot.targetY,0);camera.up.set(Math.sin(shot.roll),Math.cos(shot.roll),0);camera.lookAt(aim);camera.updateProjectionMatrix();
  renderer.toneMappingExposure=shot.exposure;stoneStage.setOpacity(shot.floor);
 }
 function applyViewport(){
  if(!active||!viewport)return;
  const r=viewport,bottom=innerHeight-r.y-r.height;
  const leftFeather=r.width*.07*shot.dock,rightFeather=r.width*.04*shot.dock;
  host.style.maskImage=`linear-gradient(90deg,transparent ${r.x}px,#000 ${r.x+leftFeather}px,#000 ${r.x+r.width-rightFeather}px,transparent ${r.x+r.width}px)`;
  renderer.setViewport(r.x,bottom,r.width,r.height);renderer.setScissor(r.x,bottom,r.width,r.height);renderer.setScissorTest(true);
 }
 function skip(){if(active||root.classList.contains('cinema-pending'))onSkip()}
 const scroll=()=>{if((active||root.classList.contains('cinema-pending'))&&Math.abs(scrollY-startScroll)>32)skip()};
 const key=e=>{if((active||root.classList.contains('cinema-pending'))&&['Escape','Tab','PageDown','ArrowDown','End'].includes(e.key))skip()};
 const pageAction=e=>{if(active&&e.target.closest('a,button')&&!e.target.closest('#cinema-ui,#ring-replay'))skip()};
 const skipClick=()=>{window.kovaOpeningRequested=false;onSkip();document.querySelector('#ring-replay').focus({preventScroll:true})};
 const pauseClick=()=>{if(!timeline)return;const paused=!timeline.paused();manuallyPaused=paused;timeline.paused(paused);pause.textContent=paused?'Resume':'Pause';pause.setAttribute('aria-label',paused?'Resume introduction':'Pause introduction')};
 document.querySelector('#cinema-skip').addEventListener('click',skipClick);pause.addEventListener('click',pauseClick);
 window.addEventListener('wheel',skip,{passive:true});window.addEventListener('touchmove',skip,{passive:true});window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('kova:skip-opening',skip);
 document.addEventListener('keydown',key);document.addEventListener('click',pageAction);
 return {play,finish,prepare,applyViewport,get paused(){return manuallyPaused},get active(){return active},get floorVisible(){return !active||shot.floor>.001},dispose(){finish();window.removeEventListener('wheel',skip);window.removeEventListener('touchmove',skip);window.removeEventListener('scroll',scroll);window.removeEventListener('kova:skip-opening',skip);document.removeEventListener('keydown',key);document.removeEventListener('click',pageAction);document.querySelector('#cinema-skip').removeEventListener('click',skipClick);pause.removeEventListener('click',pauseClick)}};
}

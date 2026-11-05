import * as THREE from './assets/three/three.module.js';
import {createNotebookStudy} from './notebook-study.js';

// One renderer, one ring, seven document anchors. Scroll changes the viewport;
// finite pose tweens preserve object identity. No pinned scroll or idle loop.
export function createRingJourney({renderer,camera,ring,build,stoneStage,host,key,allowed,requestRender,rest}){
 const root=document.documentElement,docks=[...document.querySelectorAll('[data-ring-view]')];
 const meshes=ring.children.filter(object=>object.isMesh),gem=ring.getObjectByName('Emerald_Step_Cut');
 const originals=meshes.map((mesh,i)=>{
  const geometry=build.outlines.children[i].geometry.clone();geometry.translate(-mesh.position.x,-mesh.position.y,-mesh.position.z);
  const line=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0xb8c9a0,transparent:true,opacity:.8,depthTest:false}));
  line.visible=false;line.renderOrder=5;mesh.add(line);
  return {mesh,line,position:mesh.position.clone(),color:mesh.material.color?.clone(),roughness:mesh.material.roughness};
 });
 const views={
  hero:{rx:rest.x,ry:rest.y,rz:rest.z,cx:3.3,cy:3,cz:6.5,aim:.25,floor:1},
  vision:{rx:.12,ry:-.25,rz:-.3,cx:2.8,cy:2.5,cz:7.6,aim:.35,floor:0},
  workspace:{rx:.15,ry:-.6,rz:-.22,cx:3,cy:3.3,cz:7.7,aim:.35,floor:0},
  craft:{rx:.3,ry:-.45,rz:-.35,cx:2.2,cy:3.5,cz:6.6,aim:.45,floor:0},
  construction:{rx:.04,ry:-.3,rz:0,cx:3.2,cy:3.3,cz:9.7,aim:1.1,floor:0},
  people:{rx:.22,ry:-.6,rz:-.3,cx:3.3,cy:3.2,cz:7.8,aim:.3,floor:0},
  closing:{rx:.28,ry:-.4,rz:-.32,cx:3.3,cy:3.0,cz:7.6,aim:.25,floor:1}
 };
 const pose={...views.hero},variation={turn:0,finish:0},separation={value:0};
 const heroRotation=ring.rotation.clone();
 let active=null,rect=null,poseTween,variationTween,separationTween,manualSeparation=false,structure=false,owner='designer',stage='research',cinemaWasActive=false;
 const range=document.querySelector('#assembly-range'),output=document.querySelector('#assembly-value');
 const craft=document.querySelector('.craft-image'),loupe=document.querySelector('.craft-loupe'),loupeButton=document.querySelector('.loupe-toggle');
 const loupeCanvas=loupe.querySelector('canvas'),loupeContext=loupeCanvas.getContext('2d');
 let inspect=false,pointer={x:.5,y:.42},light={x:0,y:0};
 const abort=new AbortController(),listen=(target,type,callback,options={})=>target.addEventListener(type,callback,{...options,signal:abort.signal});
 const notebook=createNotebookStudy({allowed,requestRender,onInteract:()=>{poseTween?.progress(1);poseTween?.kill();poseTween=null}});

 function animate(target,values,duration=.8){
  if(!allowed()||!window.gsap){Object.assign(target,values);requestRender();return null}
  return gsap.to(target,{...values,duration,ease:'power3.inOut',overwrite:true,onUpdate:requestRender});
 }
 function targetPose(name){
  const target={...views[name]};
  if(name==='people')target.ry=owner==='manufacturer'?.1:owner==='studio'?-.9:-.6;
  if(name==='workspace'){
   if(stage==='design')Object.assign(target,{ry:.2,cy:2.1});
   if(stage==='materials')Object.assign(target,{ry:-.1,cy:5,cz:7.5});
   if(stage==='marketing')Object.assign(target,{ry:-.55,floor:1});
  }
  return target;
 }
 function select(cinemaActive){
  if(cinemaActive){cinemaWasActive=true;loupe.hidden=true;camera.zoom=1;notebook.cancel();return true}
  const candidates=docks.map(dock=>({dock,b: dock.getBoundingClientRect()})).filter(({b})=>b.bottom>0&&b.top<innerHeight&&b.width>0);
  const chosen=candidates.sort((a,b)=>Math.abs(a.b.top+a.b.height*.5-innerHeight*.5)-Math.abs(b.b.top+b.b.height*.5-innerHeight*.5))[0];
  if(!chosen){active=null;rect=null;loupe.hidden=true;notebook.cancel();return false}
  rect=chosen.b;const name=chosen.dock.dataset.ringView;
  if(name!==active||cinemaWasActive){
   // Section controls cannot overwrite the hero's independent rotation.
   if(active==='hero'||cinemaWasActive)heroRotation.copy(ring.rotation);
   if(name==='hero')ring.rotation.copy(heroRotation);
   poseTween?.kill();const previous=active;active=name;cinemaWasActive=false;
   if(name==='hero'||!previous||!allowed())Object.assign(pose,targetPose(name));else poseTween=animate(pose,targetPose(name),.9);
   host.dataset.view=name;
  }
  if(name!=='craft')loupe.hidden=true;
  if(name!=='vision')notebook.cancel();
  return true;
 }
 function prepare(){
  if(!active||!rect)return;
  if(active==='hero')heroRotation.copy(ring.rotation);
  const factor=Math.max(1,Math.min(1.65,.85/(rect.width/rect.height)));
  camera.zoom=active==='vision'?notebook.state.zoom:1;
  camera.aspect=rect.width/rect.height;camera.fov=35;camera.position.set(pose.cx,pose.cy,pose.cz).multiplyScalar(factor);camera.up.set(0,1,0);camera.lookAt(0,pose.aim,0);camera.updateProjectionMatrix();
  if(active!=='hero')ring.rotation.set(pose.rx,pose.ry,pose.rz);
  if(active==='vision'){ring.rotation.x+=notebook.state.x;ring.rotation.y+=notebook.state.y}
  stoneStage.setOpacity(pose.floor);renderer.toneMappingExposure=active==='closing'?1.22:1.15;
  key.position.set(-3+(active==='craft'?light.x*5:0),5+(active==='craft'?light.y*2:0),5);
  const drafting=active==='vision',draftProgress=rect?THREE.MathUtils.clamp((innerHeight*.85-rect.top)/(innerHeight*.9),0,1):1;
  const wire=(active==='construction'&&structure)||(drafting&&notebook.rendering(allowed()&&draftProgress<.6));
  let explode=0;
  if(active==='construction'){
   if(!manualSeparation&&allowed()){
    const phase=THREE.MathUtils.clamp((innerHeight-rect.top)/(innerHeight+rect.height),0,1);
    separation.value=Math.sin(phase*Math.PI);
   }
   explode=separation.value;range.value=String(Math.round(explode*100));output.value=range.value+'%';
  }
  for(const {mesh,line,position,color,roughness} of originals){
   mesh.position.copy(position);mesh.rotation.set(0,0,0);mesh.material.colorWrite=!wire;mesh.material.depthWrite=!wire;
   line.visible=wire;line.material.opacity=drafting?.75:.6;
   if(color){mesh.material.color.copy(color);mesh.material.roughness=roughness;
    if(active==='craft'){mesh.material.color.lerp(new THREE.Color(0xe4d8b1),variation.finish);mesh.material.roughness=THREE.MathUtils.lerp(roughness,.5,variation.finish);}
   }
   if(active==='craft'&&(mesh===gem||mesh.name.startsWith('Claw')||mesh.name==='Open_Gallery_Rail'))mesh.rotation.y=variation.turn;
   if(active==='construction'){
    const n=mesh.name;
    if(mesh===gem)mesh.position.y+=explode*1.45;
    else if(n.startsWith('Claw')){
     const sx=n.includes('_-1_')?-1:1,sz=n.endsWith('_-1')?-1:1;
     mesh.position.add(new THREE.Vector3(sx*.36,.65,sz*.32).multiplyScalar(explode));
    }else if(n==='Open_Gallery_Rail')mesh.position.y+=explode*.4;
    else if(n.startsWith('Petal'))mesh.position.y+=explode*.12;
   }
  }
 }
 function applyViewport(){
  if(!rect)return;
  renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);
  renderer.setScissor(rect.left,Math.max(0,innerHeight-rect.bottom),rect.width,Math.min(innerHeight,rect.bottom)-Math.max(0,rect.top));renderer.setScissorTest(true);
 }
 function afterRender(){
  if(!inspect||active!=='craft'||!rect){loupe.hidden=true;return}
  loupe.hidden=false;
  const diameter=innerWidth<761?180:220,x=rect.left+rect.width*pointer.x,y=rect.top+rect.height*pointer.y;
  loupe.style.left=Math.max(8,Math.min(innerWidth-diameter-8,x-diameter/2))+'px';loupe.style.top=Math.max(8,Math.min(innerHeight-diameter-8,y-diameter/2))+'px';
  const ratio=renderer.domElement.width/innerWidth,source=diameter/2.4;
  loupeContext.fillStyle='#08110b';loupeContext.fillRect(0,0,440,440);
  loupeContext.drawImage(renderer.domElement,(x-source/2)*ratio,(y-source/2)*ratio,source*ratio,source*ratio,0,0,440,440);
 }
 listen(window,'scroll',requestRender,{passive:true});listen(window,'resize',requestRender,{passive:true});
 listen(window,'kova:stage',event=>{stage=event.detail;if(active==='workspace'){poseTween?.kill();poseTween=animate(pose,targetPose(active))}});
 listen(window,'kova:owner',event=>{owner=event.detail;if(active==='people'){poseTween?.kill();poseTween=animate(pose,targetPose(active))}});
 for(const button of document.querySelectorAll('[data-craft]'))listen(button,'click',()=>{
  const mode=button.dataset.craft;
  document.querySelectorAll('[data-craft]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  document.querySelector('#craft-caption').textContent=mode==='change'?'A new point of view.':mode==='explore'?'A softer expression.':'Keep the character.';
  variationTween?.kill();variationTween=animate(variation,{turn:mode==='change'?Math.PI/2:0,finish:mode==='explore'?1:0},1.05);
 });
 for(const button of document.querySelectorAll('[data-rendering]'))listen(button,'click',()=>{
  structure=button.dataset.rendering==='structure';document.querySelectorAll('[data-rendering]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));requestRender();
 });
 listen(range,'input',()=>{manualSeparation=true;separationTween?.kill();separation.value=Number(range.value)/100;output.value=range.value+'%';requestRender()});
 listen(document.querySelector('#plate-replay'),'click',()=>{
  manualSeparation=true;separationTween?.kill();
  if(!allowed()){separation.value=0;requestRender();return}
  separationTween=gsap.timeline({onUpdate:requestRender}).to(separation,{value:1,duration:1.3,ease:'power2.inOut'}).to(separation,{value:0,duration:1.4,ease:'power3.inOut'},'+=.3');
 });
 listen(loupeButton,'click',()=>{inspect=!inspect;loupeButton.setAttribute('aria-pressed',String(inspect));pointer={x:.5,y:.37};requestRender()});
 listen(craft,'pointermove',event=>{
  if(event.pointerType==='touch')return;const box=craft.getBoundingClientRect();
  light=allowed()?{x:(event.clientX-box.left)/box.width-.5,y:.5-(event.clientY-box.top)/box.height}:{x:0,y:0};
  if(rect){pointer={x:THREE.MathUtils.clamp((event.clientX-rect.left)/rect.width,0,1),y:THREE.MathUtils.clamp((event.clientY-rect.top)/rect.height,0,1)}}requestRender();
 });
 listen(craft,'pointerleave',()=>{light={x:0,y:0};pointer={x:.5,y:.37};requestRender()});
 document.querySelector('#plate-replay').innerHTML='Assemble again <span aria-hidden="true">↗</span>';document.querySelector('#plate-replay').setAttribute('aria-label','Replay component assembly');
 root.classList.add('ring-journey-ready');document.querySelectorAll('.model-control').forEach(button=>button.disabled=false);
 return {
  select,prepare,applyViewport,afterRender,get floorVisible(){return active&&pose.floor>.001},
  preferences(){notebook.preferences();if(!allowed()){poseTween?.kill();variationTween?.progress(1);separationTween?.progress(1);if(active)Object.assign(pose,targetPose(active));requestRender()}},
  resetMaterials(){for(const {mesh,line,position,color,roughness} of originals){mesh.material.colorWrite=true;mesh.material.depthWrite=true;line.visible=false;mesh.position.copy(position);mesh.rotation.set(0,0,0);if(color){mesh.material.color.copy(color);mesh.material.roughness=roughness}}},
  dispose(){notebook.dispose();abort.abort();poseTween?.kill();variationTween?.kill();separationTween?.kill();root.classList.remove('ring-journey-ready');loupe.hidden=true;document.querySelectorAll('.model-control').forEach(button=>button.disabled=true)}
 };
}

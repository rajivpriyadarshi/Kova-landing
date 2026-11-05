import * as THREE from './assets/three/three.module.js';
import {createRing} from './ring-model.js';
import {emeraldMaterial} from './emerald-material.js';
import {createBuild} from './ring-build.js';
import {createStoneStage} from './stone-stage.js';
import {createCinematicIntro} from './cinematic-intro.js';
import {createRingJourney} from './ring-journey.js';

// Intro: traced contours -> gold reveal -> eight emerald sectors assemble -> rest.
// The 9.8s opening fills the viewport, orbits the assembly, then docks into the hero.
// Drag cancels intro immediately. No autoplay loop. Offscreen/hidden rendering stops.
// Reduced motion settles to the intended pose, preserving deliberate rotation.
const host=document.querySelector('#ring-stage');
const canvas=host.querySelector('canvas');
const input=document.querySelector('#ring-dock');
const hero=document.querySelector('.hero');
const status=document.querySelector('#ring-status');
let cubeTarget;
let renderer,environment,pmrem,observer,resizeObserver,frame=0,visible=true,disposed=false;
let revealOnNextFrame=false;
let dragging=null,intro=null,resetTween=null;let preferenceObserver;
let ring,scene,camera,build,stoneStage,band,cinema,journey;
const floorY=-1.5,contactPoint=new THREE.Vector3();
function groundRing(){
 if(!ring||!band)return;
 ring.position.y=0;ring.updateMatrixWorld(true);
 let min=Infinity;const points=band.geometry.attributes.position;
 for(let i=0;i<points.count;i++){contactPoint.fromBufferAttribute(points,i).applyMatrix4(band.matrixWorld);min=Math.min(min,contactPoint.y)}
 ring.position.y=floorY-min+.006;ring.updateMatrixWorld(true);
}
const rest={x:.28,y:-.40,z:-.32};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const allowed=()=>!reduced.matches&&!document.documentElement.classList.contains('motion-off');
function render(){
 frame=0;if(disposed||document.hidden||!renderer)return;
 const hasView=journey?.select(cinema?.active)??true;
 build?.update();cinema?.prepare();if(!cinema?.active)journey?.prepare();groundRing();
 renderer.setScissorTest(false);renderer.setViewport(0,0,renderer.domElement.clientWidth,renderer.domElement.clientHeight);renderer.clear();
 if(hasView){
  if(cinema?.active?cinema.floorVisible:journey?.floorVisible??true)stoneStage?.reflect(camera);
  if(cinema?.active)cinema.applyViewport();else journey?.applyViewport();
  renderer.render(scene,camera);renderer.setScissorTest(false);if(!cinema?.active)journey?.afterRender();
 }
 if(revealOnNextFrame){revealOnNextFrame=false;document.documentElement.classList.remove('ring-loading')}
}
function requestRender(){if(!frame&&!disposed&&!document.hidden)frame=requestAnimationFrame(render)}
function stopAnimation(){
 const wasOpening=cinema?.active;intro?.kill();resetTween?.kill();intro=null;resetTween=null;
 cinema?.finish();if(wasOpening)ring.rotation.set(rest.x,rest.y,rest.z);
 build?.complete();status.textContent='Interactive 3D concept';host.dataset.phase='complete';if(build)requestRender();
}
function settle(){stopAnimation();ring.rotation.set(rest.x,rest.y,rest.z);ring.position.set(0,0,0);ring.scale.setScalar(1);requestRender()}
function runIntro(){
 if(!allowed()||!window.gsap||!cinema){settle();return}
 stopAnimation();journey?.resetMaterials();intro=cinema.play();
}
function move(dx,dy){stopAnimation();ring.rotation.y+=dx;ring.rotation.x=THREE.MathUtils.clamp(ring.rotation.x+dy,-1.15,1.25);requestRender()}
function reset(){stopAnimation();if(!allowed()||!window.gsap){settle();return}resetTween=gsap.to(ring.rotation,{...rest,duration:.8,ease:'power3.out',onUpdate:requestRender,onComplete:()=>{resetTween=null}});ring.position.y=0;ring.scale.setScalar(1)}
function fail(){stopAnimation();journey?.dispose();hero.classList.remove('has-3d');document.documentElement.classList.remove('ring-loading','cinema-pending','cinema-active','cinema-revealing');host.hidden=true;document.querySelector('.ring-controls').hidden=true;status.textContent='Concept artwork';if(frame)cancelAnimationFrame(frame);renderer?.dispose();disposed=true;}
try{
 renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.debug.onShaderError=()=>{throw new Error('Gemstone shader could not compile')};
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0x080d0b,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.set(3.3,3.0,6.5);camera.lookAt(0,.25,0);
 // Local studio reflection rig; no external HDR request or tracking.
 const room=new THREE.Scene();room.background=new THREE.Color(0x30382e);
 const wall=new THREE.Mesh(new THREE.BoxGeometry(18,14,18),new THREE.MeshBasicMaterial({color:0x3d4137,side:THREE.BackSide}));room.add(wall);
 const lightPanel=(x,y,z,w,h,color,intensity)=>{const mat=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide});const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);p.position.set(x,y,z);p.lookAt(0,0,0);room.add(p)};
 lightPanel(-4,4,4,3,7,0xfff5df,5);lightPanel(5,2,-2,2,8,0xffffff,4);lightPanel(0,6,0,6,3,0xffffff,3);lightPanel(0,1,7,1.2,6,0xffffff,3);lightPanel(-3,-3,-3,4,1,0x9fb6a8,1.5);
 cubeTarget=new THREE.WebGLCubeRenderTarget(256,{type:THREE.HalfFloatType});
 const cubeCamera=new THREE.CubeCamera(.1,30,cubeTarget);cubeCamera.update(renderer,room);
 pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromScene(room,.04, .1,30);scene.environment=environment.texture;
 room.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xd5f0df,0x333022,2));const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-3,5,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;key.shadow.normalBias=.035;key.shadow.bias=-.0002;scene.add(key);const rim=new THREE.DirectionalLight(0xe5c588,2);rim.position.set(3,1,-4);scene.add(rim);
 ring=createRing();scene.add(ring);band=ring.getObjectByName('Continuous_Comfort_Shank');
 const gemstone=ring.getObjectByName('Emerald_Step_Cut');const portableMaterial=gemstone.material;
 gemstone.material=emeraldMaterial(gemstone.geometry,cubeTarget.texture);portableMaterial.dispose();
 build=createBuild(ring,gemstone,cubeTarget.texture);
 const inverse=new THREE.Matrix4();
 ring.traverse(mesh=>{if(!mesh.isMesh)return;mesh.castShadow=true;
  if(mesh.material.uniforms?.cameraLocal)mesh.onBeforeRender=(_renderer,_scene,viewCamera)=>{inverse.copy(mesh.matrixWorld).invert();mesh.material.uniforms.cameraLocal.value.copy(viewCamera.position).applyMatrix4(inverse);mesh.material.uniforms.worldRotation.value.setFromMatrix4(mesh.matrixWorld);};
 });
 // Filled surfaces cast shadows; unrevealed gold never leaves a solid shadow.
 build.metals.forEach(mesh=>{const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  depth.onBeforeCompile=shader=>{shader.uniforms.buildHeight={get value(){return build.state.fillHeight}};shader.uniforms.heightOffset={value:mesh.position.y};shader.vertexShader='varying float buildY;uniform float heightOffset;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbuildY=position.y+heightOffset;');shader.fragmentShader='varying float buildY;uniform float buildHeight;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(buildY>buildHeight)discard;');};mesh.customDepthMaterial=depth;
 });
 stoneStage=createStoneStage(renderer,scene,floorY);
 renderer.autoClear=false;
 const resize=()=>{const {width,height}=host.getBoundingClientRect();if(width<1||height<1)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();requestRender()};
 cinema=createCinematicIntro({renderer,camera,ring,build,stoneStage,host,rest,requestRender,resize,onFinish:()=>{intro=null},onSkip:()=>{window.kovaOpeningRequested=false;settle()}});
 host.hidden=false;resize();
 // Set the home pose without dismissing the pending opening.
 ring.rotation.set(rest.x,rest.y,rest.z);build.complete();

 // Compile every phase before playback so first-use shader work cannot steal
 // the outline or assembly beats on a cold load.
 Object.assign(build.state,{outlineOpacity:1,pieceOpacity:1,assembled:false});build.update();
 await renderer.compileAsync(scene,camera);build.complete();
 journey=createRingJourney({renderer,camera,ring,build,stoneStage,host,key,allowed,requestRender,rest});resize();
 hero.classList.add('has-3d');document.querySelector('.ring-controls').hidden=false;status.textContent='Interactive 3D concept';
 resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
 observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(!visible){if(frame)cancelAnimationFrame(frame);frame=0;intro?.pause();resetTween?.pause()}else{if(!cinema?.paused)intro?.resume();resetTween?.resume();requestRender()}},{threshold:.01});observer.observe(host);
 input.addEventListener('pointerdown',e=>{if(e.button!==0||dragging)return;if(cinema.active){settle();return}stopAnimation();dragging={id:e.pointerId,x:e.clientX,y:e.clientY,rotation:ring.rotation.clone()};input.setPointerCapture(e.pointerId);input.classList.add('dragging')});
 input.addEventListener('pointermove',e=>{if(!dragging||dragging.id!==e.pointerId)return;ring.rotation.y=dragging.rotation.y+(e.clientX-dragging.x)*.009;ring.rotation.x=THREE.MathUtils.clamp(dragging.rotation.x+(e.clientY-dragging.y)*.006,-1.15,1.25);requestRender()});
 const end=e=>{if(dragging?.id!==e.pointerId)return;dragging=null;input.classList.remove('dragging');if(input.hasPointerCapture(e.pointerId))input.releasePointerCapture(e.pointerId)};
 ['pointerup','pointercancel','lostpointercapture'].forEach(type=>input.addEventListener(type,end));
 input.addEventListener('keydown',e=>{const keys={ArrowLeft:[-.18,0],ArrowRight:[.18,0],ArrowUp:[0,-.12],ArrowDown:[0,.12]};if(keys[e.key]){e.preventDefault();move(...keys[e.key])}else if(e.key==='Home'){e.preventDefault();reset()}});
 document.querySelector('#ring-left').addEventListener('click',()=>move(-.3,0));document.querySelector('#ring-right').addEventListener('click',()=>move(.3,0));document.querySelector('#ring-reset').addEventListener('click',reset);document.querySelector('#ring-replay').addEventListener('click',runIntro);
 const preferences=()=>{if(!allowed()){if(intro||resetTween)settle();requestRender()}journey?.preferences();document.querySelector('#ring-replay').disabled=!allowed()};
 reduced.addEventListener('change',preferences);preferenceObserver=new MutationObserver(preferences);preferenceObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;intro?.pause();resetTween?.pause()}else{if(!cinema?.paused)intro?.resume();resetTween?.resume();requestRender()}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail()});
 window.addEventListener('pagehide',e=>{stopAnimation();if(frame)cancelAnimationFrame(frame);frame=0;if(!e.persisted){disposed=true;preferenceObserver.disconnect();reduced.removeEventListener('change',preferences);observer.disconnect();resizeObserver.disconnect();cinema.dispose();journey?.dispose();environment.dispose();cubeTarget.dispose();stoneStage.dispose();scene.traverse(o=>{o.geometry?.dispose();o.customDepthMaterial?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose()});renderer.dispose()}});
 window.addEventListener('pageshow',e=>{if(e.persisted)requestRender()});
 window.addEventListener('resize',()=>{if(cinema.active)settle()});
 preferences();if(window.kovaOpeningRequested)runIntro();else settle();
 // Reveal the canvas only after drawing the chosen initial state, never the
 // complete ring used to compile its shaders before the opening begins.
 revealOnNextFrame=true;requestRender();
}catch(error){console.warn('3D preview unavailable; retaining campaign artwork.',error);fail()}

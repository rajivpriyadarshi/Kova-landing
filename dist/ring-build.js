import * as THREE from './assets/three/three.module.js';
import {emeraldMaterial} from './emerald-material.js';

// The animation is an illustration of design becoming form, not a casting simulation.
// One shared build height reveals gold; closed gemstone wedges assemble into the
// exact outer surface. Replacing the wedges at completion removes internal seams.
export function createBuild(ring, gemstone, studio) {
 const state={outlineHeight:-1.7,outlineOpacity:0,fillHeight:-1.7,pieceOpacity:0,assembled:false,goldDock:1,spread:1};
 const uniforms={height:{value:-1.7},opacity:{value:0},fill:{value:-1.7}};
 const outlines=new THREE.Group();outlines.name='Construction_Contours';ring.add(outlines);
 const lineMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{height:uniforms.height,alpha:uniforms.opacity},vertexShader:`
  varying float h;void main(){h=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
 `,fragmentShader:`uniform float height;uniform float alpha;varying float h;
  void main(){if(h>height)discard;gl_FragColor=vec4(vec3(.72,.77,.57),alpha);#include <colorspace_fragment>}
 `.replace(';#include',';\n#include').replace('fragment>}','fragment>\n}')});
 const metals=[],originalMaterials=new Set();
 for(const object of [...ring.children]){
  if(!object.isMesh)continue;
  object.updateMatrix();
  const points=[];const p=object.geometry.attributes.position;
  const segment=(a,b)=>{const va=new THREE.Vector3().fromBufferAttribute(p,a).applyMatrix4(object.matrix),vb=new THREE.Vector3().fromBufferAttribute(p,b).applyMatrix4(object.matrix);points.push(...va,...vb)};
  const grid=(rows,cols,strands)=>{for(const c of strands)for(let r=0;r<rows-1;r++)segment(r*cols+c,(r+1)*cols+c)};
  if(object.name==='Continuous_Comfort_Shank')grid(161,21,[0,5,10,15]);
  else if(object.name.startsWith('Petal_Shoulder'))grid(56,19,[0,5,9,14]);
  else if(object.name.startsWith('Petal_Ridge'))grid(53,11,[0]);
  else if(object.name.startsWith('Claw_')&&!object.name.startsWith('Claw_Tip'))grid(53,11,[0,5]);
  else {const edge=new THREE.EdgesGeometry(object.geometry,12);edge.applyMatrix4(object.matrix);points.push(...edge.attributes.position.array);edge.dispose()}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  const lines=new THREE.LineSegments(geometry,lineMaterial);outlines.add(lines);
  if(object===gemstone)continue;
  originalMaterials.add(object.material);const material=object.material.clone();object.material=material;metals.push(object);
  material.onBeforeCompile=shader=>{
   shader.uniforms.buildHeight=uniforms.fill;shader.uniforms.heightOffset={value:object.position.y};
   shader.vertexShader='varying float buildY;uniform float heightOffset;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbuildY=position.y+heightOffset;');
   shader.fragmentShader='varying float buildY;uniform float buildHeight;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(buildY>buildHeight) discard;');
  };
  material.customProgramCacheKey=()=> 'kova-metal-build-v1';
  object.geometry.computeBoundingBox();const mid=object.geometry.boundingBox.getCenter(new THREE.Vector3()).add(object.position);
  object.userData.home=object.position.clone();
  object.userData.buildOffset=object.name==='Continuous_Comfort_Shank'?new THREE.Vector3():new THREE.Vector3(Math.sign(mid.x)*.28,.32,Math.sign(mid.z)*.22);
  object.userData.fold=object.name.startsWith('Petal_')?Math.sign(mid.x)*.16:0;
 }
 originalMaterials.forEach(material=>material.dispose());
 const pieces=new THREE.Group();pieces.name='Emerald_Assembly';ring.add(pieces);
 const centre=new THREE.Vector3(0,1.46,0);
 // Each closed radial wedge retains the exact stepped exterior facets.
 const levels=[{x:.08,z:.12,y:1.03},{x:.38,z:.49,y:1.15},{x:.58,z:.73,y:1.35},{x:.69,z:.86,y:1.52},{x:.69,z:.86,y:1.57},{x:.60,z:.76,y:1.73},{x:.49,z:.64,y:1.86},{x:.41,z:.55,y:1.91}];
 const oct=(l)=>[[-l.x*.73,-l.z],[l.x*.73,-l.z],[l.x,-l.z*.73],[l.x,l.z*.73],[l.x*.73,l.z],[-l.x*.73,l.z],[-l.x,l.z*.73],[-l.x,-l.z*.73]].map(([x,z])=>new THREE.Vector3(x,l.y,z));
 const parts=[];
 for(let sector=0;sector<8;sector++){
  const verts=[];const next=(sector+1)%8;
  const tri=(a,b,c)=>{for(const v of [a,b,c])verts.push(...v.clone().sub(centre))};
  const A=levels.map(l=>oct(l)[sector]),B=levels.map(l=>oct(l)[next]),C=levels.map(l=>new THREE.Vector3(0,l.y,0));
  for(let i=0;i<levels.length-1;i++){
   tri(A[i],A[i+1],B[i]);tri(B[i],A[i+1],B[i+1]);
   tri(C[i],C[i+1],A[i]);tri(A[i],C[i+1],A[i+1]);
   tri(B[i],B[i+1],C[i]);tri(C[i],B[i+1],C[i+1]);
  }
  tri(C[7],B[7],A[7]);tri(C[0],A[0],B[0]);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geometry.computeVertexNormals();
  const part=new THREE.Mesh(geometry,emeraldMaterial(geometry,studio));part.name=`Emerald_Sector_${sector+1}`;part.material.transparent=true;
  part.material.uniforms.revealAlpha={value:1};
  part.material.fragmentShader=part.material.fragmentShader.replace('uniform samplerCube studio;','uniform float revealAlpha;\nuniform samplerCube studio;').replace('vec4(color,1.)','vec4(color,revealAlpha)');
  const direction=A[3].clone().add(B[3]).multiplyScalar(.5).sub(new THREE.Vector3(0,1.52,0)).normalize();
  part.userData.offset=new THREE.Vector3(direction.x*.55,.42+sector*.025,direction.z*.55);part.userData.progress=0;part.userData.twist=(sector%2?1:-1)*.22;
  part.position.copy(centre);pieces.add(part);parts.push(part);
 }
 function update(){
  uniforms.height.value=state.outlineHeight;uniforms.opacity.value=state.outlineOpacity;uniforms.fill.value=state.fillHeight;
  outlines.visible=state.outlineOpacity>.001;
  gemstone.visible=state.assembled;pieces.visible=!state.assembled&&state.pieceOpacity>.001;
  for(const part of parts){part.position.copy(centre).addScaledVector(part.userData.offset,(1-part.userData.progress)*state.spread);part.rotation.set(part.userData.twist*(1-part.userData.progress),part.userData.twist*(1-part.userData.progress),part.userData.twist*.5*(1-part.userData.progress));part.material.uniforms.revealAlpha.value=state.pieceOpacity;}
  for(const mesh of metals){mesh.visible=state.fillHeight>-1.6;mesh.position.copy(mesh.userData.home).addScaledVector(mesh.userData.buildOffset,1-state.goldDock);mesh.rotation.z=mesh.userData.fold*(1-state.goldDock);}
 }
 function complete(){Object.assign(state,{outlineHeight:2.2,outlineOpacity:0,fillHeight:2.2,pieceOpacity:1,assembled:true,goldDock:1,spread:1});parts.forEach(p=>p.userData.progress=1);update()}
 complete();
 return {state,parts,update,complete,outlines,pieces,metals};
}

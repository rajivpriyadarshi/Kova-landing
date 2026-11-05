import * as THREE from './assets/three/three.module.js';

// A chipped slate monolith, with a live planar reflection softened by roughness.
// All texture is procedural and local. The reflection contains the actual current
// ring pose, including its construction contours and gemstone assembly.
export function createStoneStage(renderer, scene, floorY) {
 const group=new THREE.Group();group.name='Charcoal_Slate_Stage';scene.add(group);
 const outline=[[-2.75,-1.35],[-1.8,-1.75],[-.5,-1.68],[1.1,-1.8],[2.65,-1.2],[2.9,-.2],[2.7,1.05],[1.55,1.65],[-.2,1.7],[-1.9,1.4],[-2.85,.55]];
 const topPositions=[],sidePositions=[];
 const push=(array,points)=>points.forEach(p=>array.push(...p));
 for(let i=0;i<outline.length;i++){
  const a=outline[i],b=outline[(i+1)%outline.length];
  push(topPositions,[[0,floorY,0],[b[0]*.95,floorY,b[1]*.95],[a[0]*.95,floorY,a[1]*.95]]);
  const innerA=[a[0]*.95,floorY,a[1]*.95],innerB=[b[0]*.95,floorY,b[1]*.95];
  const outerA=[a[0],floorY-.11,a[1]],outerB=[b[0],floorY-.11,b[1]];
  push(sidePositions,[innerA,innerB,outerA,innerB,outerB,outerA]);
  const A=[a[0],floorY-.11,a[1]],B=[b[0],floorY-.11,b[1]],C=[a[0]*.97,floorY-.40-(i%3)*.035,a[1]*.96],D=[b[0]*.97,floorY-.40-((i+1)%3)*.035,b[1]*.96];
  push(sidePositions,[A,B,C,B,D,C]);
 }
 function geo(points){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));const u=[];for(let i=0;i<points.length;i+=3)u.push(points[i]/6+.5,points[i+2]/4+.5);g.setAttribute('uv',new THREE.Float32BufferAttribute(u,2));g.computeVertexNormals();return g}
 const size=512,data=new Uint8Array(size*size*4);
 const hash=(x,y)=>{let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295};
 function noise(x,y){const a=Math.floor(x),b=Math.floor(y);let u=x-a,v=y-b;u=u*u*(3-2*u);v=v*v*(3-2*v);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(a,b),hash(a+1,b),u),THREE.MathUtils.lerp(hash(a,b+1),hash(a+1,b+1),u),v)}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const n=noise(x/60,y/30)*.42+noise(x/17,y/9)*.3+noise(x/5,y/4)*.2+noise(x,y)*.08;
  const vein=Math.pow(Math.abs(Math.sin(x*.037+y*.08+n*12)),18);
  const value=THREE.MathUtils.clamp(75+n*100-vein*26,0,255);const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 const target=new THREE.WebGLRenderTarget(640,640,{type:THREE.HalfFloatType,depthBuffer:true});target.texture.name='Slate_Live_Reflection';
 const mirrorCamera=new THREE.PerspectiveCamera(),matrix=new THREE.Matrix4(),bias=new THREE.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
 const material=new THREE.MeshStandardMaterial({color:0x30362e,metalness:.18,roughness:.76,map:texture,bumpMap:texture,bumpScale:.12,roughnessMap:texture});
 material.onBeforeCompile=shader=>{
  shader.uniforms.slateReflection={value:target.texture};shader.uniforms.slateMatrix={value:matrix};shader.uniforms.slateGrain={value:texture};
  shader.vertexShader='varying vec4 slateUV;varying vec3 slateWorld;uniform mat4 slateMatrix;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nslateWorld=(modelMatrix*vec4(transformed,1.)).xyz;slateUV=slateMatrix*vec4(slateWorld,1.);');
  shader.fragmentShader='varying vec4 slateUV;varying vec3 slateWorld;uniform sampler2D slateReflection;uniform sampler2D slateGrain;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   vec2 grainUV=slateWorld.xz*vec2(.17,.25)+.5;
   float grain=texture2D(slateGrain,grainUV).r;
   vec2 reflectedUV=slateUV.xy/slateUV.w+vec2(grain-.5)*.003;
   float radius=.0045;
   vec4 reflection=texture2D(slateReflection,reflectedUV)*.4;
   reflection+=texture2D(slateReflection,reflectedUV+vec2(radius,0.))*.15;
   reflection+=texture2D(slateReflection,reflectedUV-vec2(radius,0.))*.15;
   reflection+=texture2D(slateReflection,reflectedUV+vec2(0.,radius))*.15;
   reflection+=texture2D(slateReflection,reflectedUV-vec2(0.,radius))*.15;
   float ao=1.-.65*exp(-dot(slateWorld.xz*vec2(2.5,3.),slateWorld.xz*vec2(2.5,3.)));
   outgoingLight*=mix(.55,1.15,grain)*ao;
   outgoingLight=mix(outgoingLight,reflection.rgb,.28*reflection.a*(.7+.3*grain));
   #include <opaque_fragment>
  `);
 };
 material.customProgramCacheKey=()=> 'kova-slate-reflection-v1';
 const top=new THREE.Mesh(geo(topPositions),material);top.receiveShadow=true;group.add(top);
 const side=new THREE.Mesh(geo(sidePositions),new THREE.MeshStandardMaterial({color:0x080c09,roughness:.86,metalness:.08,bumpMap:texture,bumpScale:.13,side:THREE.DoubleSide}));group.add(side);
 const direction=new THREE.Vector3(),aim=new THREE.Vector3();
 function reflect(camera){
  mirrorCamera.copy(camera);mirrorCamera.position.y=2*floorY-camera.position.y;
  camera.getWorldDirection(direction);aim.copy(camera.position).add(direction);aim.y=2*floorY-aim.y;
  mirrorCamera.up.set(0,-1,0);mirrorCamera.lookAt(aim);mirrorCamera.updateMatrixWorld();
  matrix.copy(bias).multiply(mirrorCamera.projectionMatrix).multiply(mirrorCamera.matrixWorldInverse);
  group.visible=false;const previous=renderer.getRenderTarget();renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,mirrorCamera);renderer.setRenderTarget(previous);group.visible=true;
 }
 function setOpacity(value){
  group.visible=value>.001;
  for(const mesh of group.children){if(!mesh.material.transparent){mesh.material.transparent=true;mesh.material.needsUpdate=true}mesh.material.opacity=value;}
 }
 function dispose(){target.dispose();texture.dispose()}
 return {group,reflect,dispose,setOpacity};
}

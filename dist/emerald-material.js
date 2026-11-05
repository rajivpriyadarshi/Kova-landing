import * as THREE from './assets/three/three.module.js';
// Convex-facet ray tracing: real internal reflection through the modeled stone.
// The portable GLB uses a standard physical material instead of this WebGL shader.
export function emeraldMaterial(geometry,environment){
 const position=geometry.attributes.position,planes=[];
 for(let i=0;i<position.count;i+=3){
  const a=new THREE.Vector3().fromBufferAttribute(position,i),b=new THREE.Vector3().fromBufferAttribute(position,i+1),c=new THREE.Vector3().fromBufferAttribute(position,i+2);
  const n=new THREE.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a)).normalize(),d=n.dot(a);
  if(!planes.some(p=>n.dot(new THREE.Vector3(p.x,p.y,p.z))>.9999&&Math.abs(d-p.w)<.001))planes.push(new THREE.Vector4(n.x,n.y,n.z,d));
 }
 const material=new THREE.ShaderMaterial({uniforms:{studio:{value:environment},planes:{value:planes},cameraLocal:{value:new THREE.Vector3()},worldRotation:{value:new THREE.Matrix3()}},vertexShader:`
 varying vec3 localPoint; varying vec3 localNormal;
 void main(){ localPoint=position;localNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
 `,fragmentShader:`
 precision highp float;
 uniform samplerCube studio;
 uniform vec4 planes[${planes.length}];
 uniform vec3 cameraLocal;
 uniform mat3 worldRotation;
 varying vec3 localPoint;varying vec3 localNormal;
 vec3 environment(vec3 direction){return textureCube(studio,worldRotation*direction).rgb;}
 void main(){
  vec3 incoming=normalize(localPoint-cameraLocal),n=normalize(localNormal);
  float fresnel=.05+.95*pow(1.-max(0.,dot(-incoming,n)),5.);
  vec3 exterior=environment(reflect(incoming,n));
  vec3 direction=refract(incoming,n,1./1.58),origin=localPoint+direction*.0005;
  vec3 throughput=vec3(1.),result=vec3(0.);
  for(int bounce=0;bounce<6;bounce++){
   float nearest=10000.;vec3 normalAtHit=vec3(0.,1.,0.);
   for(int face=0;face<${planes.length};face++){
    vec4 plane=planes[face];float denominator=dot(plane.xyz,direction);
    if(denominator>.00001){float distance=(plane.w-dot(plane.xyz,origin))/denominator;if(distance>.0001&&distance<nearest){nearest=distance;normalAtHit=plane.xyz;}}
   }
   if(nearest>9999.){result+=throughput*environment(direction);break;}
   origin+=direction*nearest;
   throughput*=exp(-vec3(2.2,.22,1.25)*nearest);
   vec3 exitDirection=refract(direction,-normalAtHit,1.58);
   float f=.05+.95*pow(1.-max(0.,dot(direction,normalAtHit)),5.);
   if(dot(exitDirection,exitDirection)>.001){result+=throughput*(1.-f)*environment(exitDirection);throughput*=f;}
   direction=reflect(direction,normalAtHit);origin+=direction*.0005;
  }
  vec3 color=mix(result*vec3(.16,.43,.29),exterior*.7,fresnel);
  color+=vec3(.002,.012,.006);
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }
 `});
 return material;
}

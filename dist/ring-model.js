import * as THREE from './assets/three/three.module.js';

// Original, procedural visual study inspired by the campaign artwork.
// Coordinates are artistic proportions, not verified jewelry measurements.
export function createRing(){
 const ring=new THREE.Group();ring.name='KOVA_Folded_Petal_Concept';
 ring.userData={purpose:'Visual concept only. Not manufacturing CAD.',design:'Emerald-cut centre, four prongs, folded petal shoulders, gold shank'};
 const gold=new THREE.MeshStandardMaterial({color:0xe7b965,metalness:1,roughness:.22});gold.name='Brushed_18k_Gold_Concept';
 const edgeGold=new THREE.MeshStandardMaterial({color:0xf2ce8d,metalness:1,roughness:.16});edgeGold.name='Polished_Gold';
 const stone=new THREE.MeshPhysicalMaterial({color:0x08663f,metalness:.2,roughness:.07,transmission:.55,thickness:1.1,ior:1.58,clearcoat:1,clearcoatRoughness:.04,attenuationColor:0x045d37,attenuationDistance:.65,vertexColors:true,flatShading:true});stone.name='Faceted_Emerald';
 const mesh=(g,m,name)=>{const o=new THREE.Mesh(g,m);o.name=name;ring.add(o);return o};
 // Smooth comfort-profile shank, subtly wider through the shoulders.
 const pos=[],ids=[],N=160,M=20;
 for(let i=0;i<=N;i++){let a=i/N*Math.PI*2;let w=.105+.055*Math.max(0,Math.sin(a));for(let j=0;j<=M;j++){let b=j/M*Math.PI*2;let rr=1.12+.087*Math.cos(b);pos.push(rr*Math.cos(a),rr*Math.sin(a)-.25,w*Math.sin(b));}}
 for(let i=0;i<N;i++)for(let j=0;j<M;j++){let a=i*(M+1)+j,b=a+M+1;ids.push(a,b,a+1,a+1,b,b+1)}
 const band=new THREE.BufferGeometry();band.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));band.setIndex(ids);band.computeVertexNormals();mesh(band,gold,'Continuous_Comfort_Shank');
 const tube=(pts,r,mat,name)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),52,r,10,false),mat,name);
 // Four thick, folded leaf shoulders: full surfaces rather than billboards.
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(sx*1.08,.05,sz*.035),new THREE.Vector3(sx*.98,.65,sz*.34),new THREE.Vector3(sx*.83,1.05,sz*.59),new THREE.Vector3(sx*.57,1.43,sz*.64)]);
  const lp=[],li=[],L=55,K=18;
  for(let i=0;i<=L;i++){let t=i/L,c=curve.getPoint(t),tan=curve.getTangent(t),side=new THREE.Vector3(0,0,1).cross(tan).normalize(),normal=new THREE.Vector3().crossVectors(tan,side).normalize();let width=.012+.24*Math.pow(Math.sin(Math.PI*t),.8);for(let j=0;j<=K;j++){let a=j/K*Math.PI*2;let q=c.clone().addScaledVector(side,width*Math.cos(a)).addScaledVector(normal,(.035+.065*Math.sin(Math.PI*t))*Math.sin(a));lp.push(q.x,q.y,q.z)}}
  for(let i=0;i<L;i++)for(let j=0;j<K;j++){let a=i*(K+1)+j,b=a+K+1;li.push(a,a+1,b,a+1,b+1,b)}
  const leaf=new THREE.BufferGeometry();leaf.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));leaf.setIndex(li);leaf.computeVertexNormals();mesh(leaf,gold,`Petal_Shoulder_${sx}_${sz}`);
  tube([[sx*1.06,.07,sz*.055],[sx*.94,.59,sz*.39],[sx*.79,1.03,sz*.66],[sx*.57,1.43,sz*.64]],.015,edgeGold,`Petal_Ridge_${sx}_${sz}`);
 }
 // Octagonal step-cut emerald. Each step is independently faceted.
 const outline=(x,z)=>[[-x*.73,-z], [x*.73,-z],[x,-z*.73],[x,z*.73],[x*.73,z],[-x*.73,z],[-x,z*.73],[-x,-z*.73]];
 const levels=[{x:.08,z:.12,y:1.03},{x:.38,z:.49,y:1.15},{x:.58,z:.73,y:1.35},{x:.69,z:.86,y:1.52},{x:.69,z:.86,y:1.57},{x:.60,z:.76,y:1.73},{x:.49,z:.64,y:1.86},{x:.41,z:.55,y:1.91}];
 const gp=[],gc=[];let face=0;
 const tri=(a,b,c,k)=>{const shade=[.67,.95,.54,.8,1,.6,.86,.72][k%8];for(const p of [a,b,c]){gp.push(...p);gc.push(shade,shade,shade)}};
 for(let l=0;l<levels.length-1;l++){const a=levels[l],b=levels[l+1],aa=outline(a.x,a.z).map(p=>[p[0],a.y,p[1]]),bb=outline(b.x,b.z).map(p=>[p[0],b.y,p[1]]);for(let j=0;j<8;j++){const n=(j+1)%8;tri(aa[j],bb[j],aa[n],j+l);tri(aa[n],bb[j],bb[n],j+l)}}
 const top=levels.at(-1),o=outline(top.x,top.z).map(p=>[p[0],top.y,p[1]]);for(let i=0;i<8;i++)tri([0,top.y,0],o[(i+1)%8],o[i],1);
 const bottom=levels[0],bo=outline(bottom.x,bottom.z).map(p=>[p[0],bottom.y,p[1]]);for(let i=0;i<8;i++)tri([0,bottom.y,0],bo[i],bo[(i+1)%8],2);
 const gem=new THREE.BufferGeometry();gem.setAttribute('position',new THREE.Float32BufferAttribute(gp,3));gem.setAttribute('color',new THREE.Float32BufferAttribute(gc,3));gem.computeVertexNormals();mesh(gem,stone,'Emerald_Step_Cut');
 // Open gallery rail under the girdle and four curved claw tips.
 const rail=outline(.66,.82).map(p=>[p[0],1.48,p[1]]);rail.push(rail[0]);tube(rail,.029,gold,'Open_Gallery_Rail');
 for(const sx of [-1,1])for(const sz of [-1,1]){
  tube([[sx*.48,1.02,sz*.55],[sx*.62,1.31,sz*.77],[sx*.65,1.61,sz*.81],[sx*.55,1.83,sz*.72],[sx*.48,1.87,sz*.66]],.044,edgeGold,`Claw_${sx}_${sz}`);
  const tip=mesh(new THREE.SphereGeometry(.047,14,10),edgeGold,`Claw_Tip_${sx}_${sz}`);tip.position.set(sx*.48,1.87,sz*.66);
 }
 return ring;
}

import {createPageMotion} from './page-motion.js';
import {createAtelierStory} from './atelier-story.js';
/* Motion contract: scroll reveals orient the visitor; transform/opacity only. Native
   navigation never waits for motion. Disabling motion reverts all owned timelines.
   Tab selection is immediate and cancels its previous visual transition. */
const $ = s => document.querySelector(s);
const stages = {
 research:{label:'THE FIRST SPARK',title:'A world of references.\nA direction that’s yours.',copy:'Explore jewelry references, save the details that matter and bring their contributions into a project board.',proof:'Saved research and reference boards · recorded capability',alt:'Recorded Kova Explore screen with jewelry references and source filters'},
 design:{label:'THE HUMAN TOUCH',title:'Your direction.\nRoom to explore.',copy:'Develop concepts, compare saved versions and refine selected details with the brief and source references close at hand.',proof:'Concept generation and scoped image edits · recorded capability',alt:'Recorded Kova design editor with image editing tools and saved design context'},
 materials:{label:'THE DETAILS BEHIND THE DESIGN',title:'A beautiful piece.\nAn informed next step.',copy:'Keep supplied dimensions, inferred materials and the price basis visible. Prepare a specification for technical review.',proof:'BOM and pricing recorded · integrated CAD and measured adoption under qualification',alt:'Recorded Kova bill of materials and pricing workspace'},
 marketing:{label:'THE STORY CONTINUES',title:'From design direction\nto creative direction.',copy:'Carry the chosen product image into campaign strategy, copy and supported creative formats. Review the assets before sharing.',proof:'Campaign workspaces and saved video outputs recorded · automatic publishing unconnected',alt:'Recorded Kova Marketing workspace with creative asset options'}
};
const tabs=[...document.querySelectorAll('[data-stage]')];
let selected='research';let animationContext;let firstEntrance=true;let manualOff=false;
try{manualOff=localStorage.getItem('kova-motion')==='off'}catch{}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const motionAllowed=()=>!manualOff&&!reduced.matches;
const editorial=createPageMotion({motionAllowed});
const atelier=createAtelierStory({motionAllowed});
function setStage(key,focus=false){
 if(!stages[key])return;const direction=Object.keys(stages).indexOf(key)>=Object.keys(stages).indexOf(selected)?1:-1;selected=key; const d=stages[key];
 $('.workspace').dataset.currentStage=key;$('#workspace-number').textContent=String(Object.keys(stages).indexOf(key)+1).padStart(2,'0');
 tabs.forEach(t=>{const active=t.dataset.stage===key;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;if(active&&focus)t.focus()});
 $('#stage-panel').setAttribute('aria-labelledby','tab-'+key);
 $('#stage-img').src='assets/'+key+'.png';$('#stage-img').alt=d.alt;
 $('#stage-label').textContent=d.label;$('#stage-title').innerText=d.title;$('#stage-copy').textContent=d.copy;$('#stage-proof').textContent=d.proof;
 editorial.transitionStage(direction);
 window.dispatchEvent(new CustomEvent('kova:stage',{detail:key}));
 window.ScrollTrigger?.refresh();editorial.refreshReading();
}
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>setStage(tab.dataset.stage));tab.addEventListener('keydown',e=>{let n;if(e.key==='ArrowDown'||e.key==='ArrowRight')n=(i+1)%tabs.length;if(e.key==='ArrowUp'||e.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;if(e.key==='Home')n=0;if(e.key==='End')n=tabs.length-1;if(n!==undefined){e.preventDefault();setStage(tabs[n].dataset.stage,true)}})});
document.querySelectorAll('[data-select-stage]').forEach(a=>a.addEventListener('click',()=>setStage(a.dataset.selectStage)));
document.querySelectorAll('[data-desk-stage]').forEach(button=>button.addEventListener('click',()=>setStage(button.dataset.deskStage)));
const menu=$('.menu-toggle');function closeMenu(){menu.setAttribute('aria-expanded','false');$('#mobile-nav').hidden=true}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!open));$('#mobile-nav').hidden=open});
$('#mobile-nav').querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#mobile-nav').hidden){closeMenu();menu.focus()}});
matchMedia('(min-width: 761px)').addEventListener('change',e=>{if(e.matches)closeMenu()});
$('#expand-view').addEventListener('click',()=>{$('#dialog-image').src='assets/'+selected+'.png';$('#dialog-image').alt=stages[selected].alt;$('#image-dialog').showModal()});
$('#credits-open').addEventListener('click',()=>$('#credits-dialog').showModal());
document.querySelectorAll('dialog').forEach(d=>{d.querySelector('.dialog-close').addEventListener('click',()=>d.close());d.addEventListener('click',e=>{if(e.target===d){const b=d.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)d.close()}})});
function updateMotion(){
 const allowed=motionAllowed();document.documentElement.classList.toggle('motion-off',!allowed);$('#motion-toggle').textContent=allowed?'Motion: on':'Motion: off';$('#motion-toggle').setAttribute('aria-pressed',String(!allowed));
 animationContext?.revert();editorial.reset();atelier.reset();if(!window.gsap||!window.ScrollTrigger)return;
 gsap.set('.stage-description',{clearProps:'transform,opacity'});
 if(!allowed){firstEntrance=false;return}gsap.registerPlugin(ScrollTrigger);
 animationContext=gsap.context(()=>{
  if(firstEntrance&&window.kovaOpeningRequested){firstEntrance=false}
  if(firstEntrance){gsap.timeline({defaults:{ease:'power3.out'}}).from('.hero-intro',{y:12,opacity:0,duration:.7}).from('.hero h1 .line>*',{yPercent:110,duration:1.1,stagger:.12},.1).from('.hero-copy,.hero-actions',{y:18,opacity:0,duration:.8,stagger:.12},.5).from('.spec-tag',{opacity:0,y:12,duration:.7},.8);firstEntrance=false}
 });editorial.mount();atelier.mount();ScrollTrigger.refresh();
}
$('#motion-toggle').addEventListener('click',()=>{manualOff=motionAllowed();try{localStorage.setItem('kova-motion',manualOff?'off':'on')}catch{}updateMotion()});
reduced.addEventListener('change',updateMotion);
matchMedia('(min-width: 761px)').addEventListener('change',updateMotion);
updateMotion();
document.fonts.ready.then(()=>window.ScrollTrigger?.refresh());window.addEventListener('load',()=>window.ScrollTrigger?.refresh(),{once:true});
document.querySelectorAll('details').forEach(d=>d.addEventListener('toggle',()=>window.ScrollTrigger?.refresh()));
window.addEventListener('pagehide',()=>{animationContext?.revert();editorial.reset();atelier.reset()});window.addEventListener('pageshow',e=>{if(e.persisted)updateMotion()});

import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {clamp,faceAt,blockPose,narrative,fluidState,narrationAt,advanceTime,voiceScore} from './model.js';
const $=id=>document.getElementById(id);let renderer;
try{renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true,powerPreference:'high-performance'});}catch(e){$('loading').textContent='3D requires WebGL. Please open this private link in Safari or Chrome.';throw e;}
let ultra=false,autoScale=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.setClearColor(0x11171b);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x11171b,.009);const camera=new THREE.PerspectiveCamera(39,1,.1,180);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,4,0);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=17;controls.maxDistance=140;controls.maxPolarAngle=Math.PI*.49;controls.minPolarAngle=.22;controls.enablePan=false;
function home(){camera.fov=innerWidth<600?52:39;camera.updateProjectionMatrix();camera.position.set(innerWidth<600?45:31,innerWidth<600?30:23,innerWidth<600?68:35);controls.target.set(0,4,0);controls.update();}home();
scene.add(new THREE.HemisphereLight(0xdce8e5,0x403c34,1.35));const light=new THREE.DirectionalLight(0xffe4b2,3.2);light.position.set(-15,25,20);light.castShadow=true;const shadowSize=Math.min(1024,renderer.capabilities.maxTextureSize);light.shadow.mapSize.set(shadowSize,shadowSize);Object.assign(light.shadow.camera,{left:-23,right:23,top:22,bottom:-18,near:1,far:80});light.shadow.normalBias=.04;light.shadow.bias=-.00012;scene.add(light);const rim=new THREE.DirectionalLight(0x86b0ce,1.6);rim.position.set(10,10,-20);scene.add(rim);
let seed=347;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function rockTexture(){const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d');
 const pixels=ctx.createImageData(1024,1024);
 for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){const n=(random()-.5)*40,bed=Math.sin(y*.31+Math.sin(x*.016)*.8)*9+Math.sin(y*.06)*12;const g=145+n+bed;const i=(y*1024+x)*4;pixels.data[i]=g;pixels.data[i+1]=g*.96;pixels.data[i+2]=g*.88;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);
 for(let i=0;i<42;i++){let y=random()*1024;ctx.strokeStyle=`rgba(43,39,32,${.12+random()*.15})`;ctx.lineWidth=.5+random()*2;ctx.beginPath();ctx.moveTo(0,y);for(let x=0;x<=1024;x+=16){y+=(random()-.5)*1.8;ctx.lineTo(x,y);}ctx.stroke();}
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());return tex;}
const texture=rockTexture();const relief=texture.clone();relief.colorSpace=THREE.NoColorSpace;relief.needsUpdate=true;const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.91,map:texture,bumpMap:relief,bumpScale:.07,...extra});const stoneMats=[0x777b6c,0x888271,0x686e64,0x9b947f,0x827c6b,0xaba08a].map(c=>mat(c));const coalMat=mat(0x20282a);const metal=new THREE.MeshStandardMaterial({color:0xa1aead,metalness:.8,roughness:.32});const gold=new THREE.MeshStandardMaterial({color:0xc8ad60,metalness:.6,roughness:.42});
function box(w,h,d,material,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;scene.add(o);return o;}
box(34,1.1,12,mat(0x4b5047),0,-.65,-1.5);
const coal=box(32,2,10,coalMat,0,1,-1.5);
const blocks=[];const layers=6,cols=20,rows=5;
// Separate low beds: their intact joints are fine, then opened by displacement.
for(let l=0;l<layers;l++){
 const geom=new THREE.BoxGeometry(1.57,.72,1.96,4,2,4);const verts=geom.attributes.position;for(let v=0;v<verts.count;v++){const x=verts.getX(v),y=verts.getY(v),z=verts.getZ(v);const chip=Math.sin(x*39.7+y*21.9+z*17.1+l*5)*.022;verts.setXYZ(v,x+chip+(y>0?.10:-.10)*(l%2?1:-1),y+chip+(x>0?.035:-.035),z+chip+(y>0?.065:-.065));}geom.computeVertexNormals();const mesh=new THREE.InstancedMesh(geom,stoneMats[l],cols*rows);mesh.castShadow=mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
 for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const x=-15.2+i*1.6,z=-5.5+j*2;mesh.setColorAt(i*rows+j,new THREE.Color().setScalar(.77+random()*.28));blocks.push({mesh,index:i*rows+j,x,y:2.39+l*.76,z,l,seed:i*17+j*3+l*51});}
}
// Stronger upper beds deform as a continuous plate, with a separate lower joint.
const upper=[];
for(let l=0;l<3;l++){const geometry=new THREE.BoxGeometry(32,.68,10,64,1,10);const base=geometry.attributes.position.array.slice();const mesh=new THREE.Mesh(geometry,mat([0xb0a38a,0x7a8072,0x928b78][l],{transparent:true,opacity:l===2?.64:.88}));mesh.receiveShadow=true;mesh.position.set(0,7.12+l*.76,-1.5);scene.add(mesh);upper.push({mesh,base,l});}
// One cutaway well. No invented depth scale; a ghost lower interval flags unknown completion.
const well=new THREE.Group();well.name='single-well';scene.add(well);well.position.set(0,0,3.65);
function tube(radius,height,y,material){const o=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,48,1,true),material);o.position.y=y;well.add(o);return o;}
tube(.36,8.5,9.65,new THREE.MeshStandardMaterial({color:0xb8d7d2,metalness:.15,roughness:.25,transparent:true,opacity:.19,depthWrite:false}));tube(.28,2.3,12.8,new THREE.MeshStandardMaterial({color:0xd0c9b7,roughness:.85,transparent:true,opacity:.45}));tube(.17,2.2,6.5,new THREE.MeshStandardMaterial({color:0x9fcaba,transparent:true,opacity:.4,wireframe:true}));const cap=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.2,20),metal);cap.position.y=14.1;well.add(cap);const valve=new THREE.Mesh(new THREE.TorusGeometry(.42,.06,7,24),gold);valve.position.y=14.5;valve.rotation.x=Math.PI/2;well.add(valve);
// Steel coupling collars and cutaway completion rings give the bore depth cues.
for(const y of [8.1,10.2,12.3]){const collar=new THREE.Mesh(new THREE.TorusGeometry(.36,.028,8,48),metal);collar.rotation.x=Math.PI/2;collar.position.y=y;well.add(collar);}

const shields=new THREE.Group();scene.add(shields);for(let j=0;j<5;j++){const g=new THREE.Group();g.position.z=-5.5+j*2;shields.add(g);const canopy=new THREE.Mesh(new THREE.BoxGeometry(2.25,.18,1.7),gold);canopy.position.set(-1.2,2.02,0);g.add(canopy);const base=new THREE.Mesh(new THREE.BoxGeometry(2,.16,1.65),metal);base.position.set(-1.15,.15,0);g.add(base);for(const xx of [-1.8,-.6]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.1,.13,1.75,8),metal);leg.position.set(xx,1.06,0);g.add(leg);}const guard=new THREE.Mesh(new THREE.BoxGeometry(.15,1.1,1.7),gold);guard.position.set(-2.2,1.1,0);guard.rotation.z=-.25;g.add(guard);}
shields.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
const shearer=box(.65,.8,9.8,metal,0,.7,-1.5);const faceGlow=box(.06,2,10,new THREE.MeshBasicMaterial({color:0xdaa65b,transparent:true,opacity:.14}),0,1,-1.5);
// Bright tracers follow the fracture network into a transparent enlarged bore.
const tracerCanvas=document.createElement('canvas');tracerCanvas.width=tracerCanvas.height=64;
const tracerCtx=tracerCanvas.getContext('2d');const gradient=tracerCtx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.25,'#ffffff');gradient.addColorStop(1,'#ffffff00');tracerCtx.fillStyle=gradient;tracerCtx.fillRect(0,0,64,64);const tracerMap=new THREE.CanvasTexture(tracerCanvas);
const gasGeometry=new THREE.BufferGeometry();const gasArray=new Float32Array(480*3);gasGeometry.setAttribute('position',new THREE.BufferAttribute(gasArray,3));const gas=new THREE.Points(gasGeometry,new THREE.PointsMaterial({color:0x59ff9b,size:.26,map:tracerMap,transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending}));gas.frustumCulled=false;scene.add(gas);
const waterGeometry=new THREE.BufferGeometry();const waterArray=new Float32Array(220*3);waterGeometry.setAttribute('position',new THREE.BufferAttribute(waterArray,3));const water=new THREE.Points(waterGeometry,new THREE.PointsMaterial({color:0x38bdff,size:.095,map:tracerMap,transparent:true,opacity:.95,depthWrite:false}));water.frustumCulled=false;scene.add(water);
const waterColumn=new THREE.Mesh(new THREE.CylinderGeometry(.30,.30,1,24),new THREE.MeshStandardMaterial({color:0x4097aa,metalness:.08,transparent:true,opacity:.58,roughness:.12}));waterColumn.position.set(0,5.4,3.65);scene.add(waterColumn);
const waterSurface=new THREE.Mesh(new THREE.CircleGeometry(.31,32),new THREE.MeshBasicMaterial({color:0x8bdeff,side:THREE.DoubleSide,transparent:true,opacity:.9}));waterSurface.rotation.x=-Math.PI/2;scene.add(waterSurface);
const fracturePaths=[];
for(let i=0;i<8;i++){
 const side=i%2?1:-1,y=6+(i%4)*.38;
 const points=[new THREE.Vector3(side*(4+i*.35),y+1.2,3.8),new THREE.Vector3(side*2.5,y+.5,3.8),new THREE.Vector3(side*1.2,y+.5,3.8),new THREE.Vector3(0,6.25,3.65)];
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x34baf3,transparent:true,opacity:.12}));scene.add(line);fracturePaths.push({points,line});
}
let scenario='seep',fluids=fluidState(0,scenario);
function updateFluids(){
 const f=fluids,levelY=5.4+f.level*4.8;
 waterColumn.visible=waterSurface.visible=f.level>.002;
 waterColumn.scale.y=Math.max(.001,f.level*4.8);waterColumn.position.y=5.4+f.level*2.4;
 waterSurface.position.set(0,levelY,3.65);waterSurface.scale.setScalar(1+.025*Math.sin(elapsed*3));
 fracturePaths.forEach(p=>p.line.visible=f.connection>0&&scenario!=='dry');
 for(let i=0;i<480;i++){
  const a=i*3,p=(elapsed*(.04+.17*f.gas)+i/480)%1,angle=i*2.399;
  const visible=f.connection>0&&i<480*f.gas;
  if(p<.57){const q=p/.57;const side=i%2?1:-1,sourceY=i%3===0?7.7:6.5;gasArray[a]=side*(6+(i%5)*.3)*(1-q);gasArray[a+1]=sourceY+(6.25-sourceY)*clamp((q-.5)*2)+Math.sin(q*18+i)*.035;gasArray[a+2]=3.7+Math.sin(i)*.13*(1-q);}
  else{const q=(p-.57)/.43;gasArray[a]=Math.sin(angle+q*9)*.13;gasArray[a+1]=6.25+q*7.7;gasArray[a+2]=3.65+Math.cos(angle+q*9)*.13;}
  if(!visible)gasArray[a+1]=-30;
 }
 for(let i=0;i<220;i++){
  const a=i*3,p=(elapsed*.16+i/220)%1,pts=fracturePaths[i%8].points;
  let x=0,y=0,z=3.65;
  if(p<.6){const q=p/.6*3,k=Math.min(2,Math.floor(q)),v=q-k;x=THREE.MathUtils.lerp(pts[k].x,pts[k+1].x,v);y=THREE.MathUtils.lerp(pts[k].y,pts[k+1].y,v);z=3.8;}
  else{const q=(p-.6)/.4;x=Math.sin(i*7)*.24;y=6.25+(Math.min(levelY,6.25)-6.25)*q;
   if(i%4===0&&f.carried>.0001)y=6.25+q*7.7;
  }
  waterArray[a]=x;waterArray[a+1]=f.inflow>.0001&&i<Math.min(220,Math.max(10,f.inflow*2600))?y:-30;waterArray[a+2]=z;
 }
 gas.visible=gasOn;gasGeometry.attributes.position.needsUpdate=true;waterGeometry.attributes.position.needsUpdate=true;
}
const dustArray=new Float32Array(150*3);const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustArray,3));const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0xc3b69a,size:.055,transparent:true,opacity:.28,depthWrite:false}));scene.add(dust);
const dummy=new THREE.Object3D();let time=0,playing=false,elapsed=0,gasOn=true,last=0,lastUpdate=0;
function update(){const face=faceAt(time),remaining=Math.max(.01,16-face);coal.scale.x=remaining/32;coal.position.x=16-remaining/2;shields.position.x=face;shields.visible=face<17&&face>-16;shearer.position.x=face+.2;shearer.visible=shields.visible;faceGlow.position.x=face;faceGlow.visible=face<16;
 for(const b of blocks){const p=blockPose(time,b.x,b.l,b.seed);dummy.position.set(b.x,b.y-p.drop-p.settle,b.z);dummy.rotation.set(p.angle*.55,Math.sin(b.seed)*p.progress*.09,p.angle);dummy.scale.set(1,1,1);dummy.updateMatrix();b.mesh.setMatrixAt(b.index,dummy.matrix);}for(const mesh of new Set(blocks.map(b=>b.mesh)))mesh.instanceMatrix.needsUpdate=true;renderer.shadowMap.needsUpdate=true;
 for(const {mesh,base,l} of upper){const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){let x=base[i*3];const behind=face-x;const sag=clamp((behind-6-l*1.4)/12);a.array[i*3+1]=base[i*3+1]-(.48-l*.10)*sag*sag; }a.needsUpdate=true;mesh.geometry.computeVertexNormals();}
 let activeFall=false;for(let i=0;i<150;i++){let j=i%cols,x=-15.2+j*1.6,p=blockPose(time,x,0,j);const active=p.progress>.08&&p.progress<.97;const a=i*3;dustArray[a]=x+Math.sin(i*7.1)*.65;dustArray[a+1]=active?2.3-p.drop+(i%7)*.07:-20;dustArray[a+2]=-5.5+(i%5)*2+Math.cos(i*3)*.55;activeFall ||= active;}dust.visible=activeFall;dustGeometry.attributes.position.needsUpdate=true;
 fluids=fluidState(time,scenario);updateFluids();
 $('flow-state').textContent=fluids.status;
 $('gas-meter').style.width=`${fluids.gas*100}%`;$('water-meter').style.width=`${fluids.level*100}%`;
 $('fluid-note').textContent=!fluids.connection?'Move to Roof fall to open the fracture paths.':scenario==='dry'?'No connected water source: gas travels through fractures into the well.':fluids.level>.77?'The water head has overcome the assumed gas drive. Gas delivery stops while water remains in the bore.':fluids.level>.2?'Water enters faster than gas can carry it out. The rising column adds backpressure and gas flow weakens.':'Water runs down the bore. Faster gas can carry some droplets upward; the rest collects below.';
 const n=narrative(time);$('chapter').textContent=n[0];$('title').textContent=n[1];$('description').textContent=n[2];$('timeline').value=time;if(playing&&voiceOn)syncNarration();
}
const synth=window.speechSynthesis;let voiceOn=false,spokenKey='',voiceBusy=false,utterance=null,speechGeneration=0,speechTimer=null,selectedVoice="";
function cancelSpeech(){clearTimeout(speechTimer);speechGeneration++;if(synth)synth.cancel();voiceBusy=false;utterance=null;}
function syncNarration(force=false){
 const cue=narrationAt(time,scenario),key=cue.id+':'+scenario;
 if(!voiceOn||(!force&&key===spokenKey))return;
 cancelSpeech();spokenKey=key;$('voice-caption').textContent=cue.text;
 const generation=speechGeneration;utterance=new SpeechSynthesisUtterance(cue.text);utterance.lang='en-US';utterance.rate=.98;
 const voices=synth.getVoices();utterance.voice=voices.find(v=>v.voiceURI===selectedVoice)||voices.filter(v=>/^en[-_]/i.test(v.lang)).sort((a,b)=>voiceScore(b)-voiceScore(a))[0]||null;
 voiceBusy=true;utterance.onend=()=>{if(generation===speechGeneration){voiceBusy=false;clearTimeout(speechTimer);}};utterance.onerror=e=>{if(generation!==speechGeneration)return;voiceBusy=false;if(!['canceled','interrupted'].includes(e.error)){voiceOn=false;$('voice').setAttribute('aria-pressed','false');$('voice').textContent='Voice unavailable';$('voice-caption').textContent=cue.text+' Voice playback is unavailable in this browser.';}};
 try{synth.speak(utterance);}catch{cancelSpeech();$('voice-caption').textContent=cue.text+' (Voice unavailable; playback continues.)';return;}
 speechTimer=setTimeout(()=>{if(generation===speechGeneration){cancelSpeech();$('voice-caption').textContent=cue.text+' (Audio timed out; playback continues.)';}},Math.max(16000,cue.text.split(/\s+/).length*650));
}
function refreshVoices(){
 if(!synth)return;const voices=synth.getVoices().filter(v=>/^en[-_]/i.test(v.lang)).sort((a,b)=>voiceScore(b)-voiceScore(a));
 const select=$('narrator');select.replaceChildren();
 for(const v of voices){const option=document.createElement('option');option.value=v.voiceURI;option.textContent=v.name;select.append(option);}
 if(!voices.length){const option=document.createElement('option');option.value='';option.textContent='Device default';select.append(option);}
 if(voices.some(v=>v.voiceURI===selectedVoice))select.value=selectedVoice;else selectedVoice=select.value;
 $('voice-note').textContent=voices.some(v=>/natural|premium|enhanced|neural/i.test(v.name))?'Enhanced voice available on this device.':'Voice quality depends on installed device voices. No recorded neural narration is connected.';
}
if(synth){synth.addEventListener('voiceschanged',refreshVoices);refreshVoices();}
$('narrator').onchange=e=>{selectedVoice=e.target.value;if(voiceOn)syncNarration(true);};
function setPlay(v){playing=v;$('play').textContent=v?'Ⅱ':'▶';$('play').setAttribute('aria-label',v?'Pause collapse':'Play collapse');if(!v){cancelSpeech();spokenKey='';}else if(voiceOn)syncNarration(true);}
function jump(t){time=+t;elapsed=time/4;setPlay(false);update();if(voiceOn)syncNarration(true);}
$('play').onclick=()=>{if(time>=100){time=0;spokenKey='';update();}setPlay(!playing);};$('replay').onclick=()=>jump(0);$('timeline').oninput=e=>{time=+e.target.value;setPlay(false);update();};$('timeline').onchange=()=>{if(voiceOn)syncNarration(true);};document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>jump(b.dataset.time));$('home').onclick=home;$('gas').onclick=()=>{gasOn=!gasOn;gas.visible=gasOn;$('gas').setAttribute('aria-pressed',gasOn);update();};$('water-source').onchange=e=>{scenario=e.target.value;update();if(voiceOn)syncNarration(true);};$('info').onclick=()=>{setPlay(false);$('details').showModal();};$('close').onclick=()=>$('details').close();document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlay(false);});window.addEventListener('pagehide',cancelSpeech);
$('voice').onclick=()=>{voiceOn=!voiceOn;$('voice').setAttribute('aria-pressed',voiceOn);$('voice').textContent=voiceOn?'Voice on':'Voice over';if(voiceOn){if(time>=100)time=0;setPlay(true);}else{cancelSpeech();$('voice-caption').textContent='';}};
if(!synth||!window.SpeechSynthesisUtterance){$('voice').disabled=true;$('voice').textContent='Voice unavailable';$('voice-caption').textContent='Read the stage explanation below. Voice playback is unavailable in this browser.';}
function resize(){const r=renderer.domElement.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);const desired=ultra?3840/Math.max(w,h):Math.min(devicePixelRatio,1.35)*autoScale;renderer.setPixelRatio(Math.min(desired,renderer.capabilities.maxTextureSize/Math.max(w,h),Math.sqrt(8294400/(w*h))));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();$('quality').title=`${renderer.domElement.width} × ${renderer.domElement.height} render pixels`;}
$('quality').onclick=()=>{ultra=!ultra;$('quality').textContent=ultra?'4K detail':'Auto detail';$('quality').setAttribute('aria-pressed',ultra);autoScale=1;const size=Math.min(ultra?2048:1024,renderer.capabilities.maxTextureSize);light.shadow.mapSize.set(size,size);if(light.shadow.map){light.shadow.map.dispose();light.shadow.map=null;}renderer.shadowMap.needsUpdate=true;resize();};window.addEventListener('resize',resize);resize();update();$('loading').hidden=true;
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();setPlay(false);$('loading').hidden=false;$('loading').textContent='3D paused. Reload to restore the graphics view.';});
let lastRender=0,slowFrames=0;
function frame(now){
 requestAnimationFrame(frame);
 if(document.hidden){last=now;return;}
 const dt=last?Math.max(0,(now-last)/1000):0;last=now;
 if(playing){time=advanceTime(time,dt,voiceOn);if(now-lastUpdate>50){update();lastUpdate=now;}if(time>=100){setPlay(false);update();}}
 elapsed+=Math.min(.1,dt);
 if(now-lastRender<32)return;
 if(!ultra&&now-lastRender>65&&lastRender){slowFrames++;if(slowFrames>=30&&autoScale>.6){autoScale=Math.max(.6,autoScale-.2);resize();slowFrames=0;}}else slowFrames=Math.max(0,slowFrames-1);
 lastRender=now;updateFluids();controls.update();renderer.render(scene,camera);
}requestAnimationFrame(frame);
// Read-only diagnostics for rendering validation.
window.sceneDiagnostics=()=>({wells:scene.children.filter(o=>o.name==='single-well').length,blocks:blocks.length,time,playing,webgl:!!renderer.getContext(),camera:camera.position.toArray(),calls:renderer.info.render.calls,scenario,fluids,gasOn,voiceOn,voiceBusy,renderSize:[renderer.domElement.width,renderer.domElement.height],ultra});

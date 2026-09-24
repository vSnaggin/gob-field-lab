import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../public/vendor/three.core.js';
import * as processModel from '../public/process-model.js';

const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const source=html.match(/<script type="module" id="simulation">([\s\S]*?)<\/script>/)[1];
const context=vm.createContext({THREE,console,...processModel});
const rendering=source.slice(source.indexOf('function rockMaterial'),source.indexOf('// ---------- UI and one bounded animation loop'));
vm.runInContext(rendering+'\nthis.CutawayClass=Cutaway;this.fluidTable=buildFluidTable;this.fluidSample=sampleFluids;this.advance=advanceTimeline;',context);

test('deployed model keeps water bounded and playback independent of audio',()=>{
  for(const scenario of ['dry','seep','wet']){
    const table=context.fluidTable(scenario);
    for(const f of table){assert.ok(Number.isFinite(f.level)&&f.level>=0&&f.level<=4.8);assert.ok(f.gas>=0&&f.gas<=1);}
    for(let i=0;i<table.length-1;i++){
      const expected=Math.max(0,Math.min(Math.PI*.1**2*4.8,table[i].volume+(table[i].inflow-table[i].carry)/1000*.72));
      assert.ok(Math.abs(expected-table[i+1].volume)<1e-12);
    }
  }
  assert.equal(context.fluidSample(context.fluidTable('wet'),100).gas,0);
  assert.ok(context.fluidSample(context.fluidTable('seep'),100).level<.3);
  let t=0;for(let i=0;i<7000;i++)t=context.advance(t,1/60);assert.equal(t,100);
});

test('animated geometry and guided camera remain finite through all scenarios',()=>{
  const app=Object.create(context.CutawayClass.prototype);
  app.scene=new THREE.Scene();app.renderer={shadowMap:{}};app.time=0;app.lastShadow=-1;app.glowMap=new THREE.Texture();
  app.materials=Object.fromEntries(['sand','shale','silt','coal'].map(k=>[k,new THREE.MeshStandardMaterial()]));
  for(const key of ['steel','darkSteel','brass','paint'])app[key]=new THREE.MeshStandardMaterial();
  app.buildRock();app.buildMachinery();app.buildWell();app.buildFlows();
  app.camera=new THREE.PerspectiveCamera(36,.62,.08,260);app.controls={target:new THREE.Vector3()};app.cameraTarget=new THREE.Vector3();app.cameraPosition=new THREE.Vector3();app.viewMode='cinema';
  const objects=[];app.scene.traverse(o=>{if(o.geometry)objects.push(o);});
  for(const scenario of ['dry','seep','wet'])for(let t=0;t<=100;t+=5){
    const f=context.fluidSample(context.fluidTable(scenario),t);app.updateModel(t,f);app.animate(t*1.1,1/30,t,f,scenario);app.updateCamera(1,t,true);
    for(const o of objects){
      for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value),'position');
      if(o.geometry.attributes.normal)for(const value of o.geometry.attributes.normal.array)assert.ok(Number.isFinite(value),'normal');
      if(o.isInstancedMesh)for(const value of o.instanceMatrix.array)assert.ok(Number.isFinite(value),'instance transform');
    }
    for(const value of app.camera.position.toArray())assert.ok(Number.isFinite(value),'camera');
    assert.ok(app.water.position.y>=app.wellBottom);
  }
  let count=0;app.scene.traverse(o=>{if(o.geometry)count++;});assert.equal(count,objects.length);
  assert.equal(app.mainRoof.length,4);assert.equal(app.roof.length,4);
  const flow=app.flows.geometry.attributes.position.array;
  for(let i=0;i<flow.length;i+=6)assert.ok(Math.hypot(flow[i]-flow[i+3],flow[i+1]-flow[i+4],flow[i+2]-flow[i+5])<1);
});

test('every recorded caption fits its chapter and each track covers the full timeline',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../public/audio/chapters.json',import.meta.url)));
  assert.equal(data.duration,110);
  for(const scenario of ['dry','seep','wet']){
    const chapters=data.chapters[scenario];assert.equal(chapters.length,6);
    let end=0;
    for(const ch of chapters){assert.equal(ch.start,end);assert.ok(ch.end>ch.start);end=ch.end;
      for(const caption of ch.captions){assert.ok(caption.start>=ch.start&&caption.end<=ch.end);assert.ok(caption.end>caption.start);assert.ok(caption.text.length>5);}
    }
    assert.equal(end,110);
    assert.ok(fs.statSync(new URL(`../public/audio/narration-${scenario}.mp3`,import.meta.url)).size>100000);
  }
});

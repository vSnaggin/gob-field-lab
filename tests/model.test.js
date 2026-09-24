import test from 'node:test';import assert from 'node:assert/strict';import {faceAt,blockPose} from '../public/model.js';
test('roof stays in place ahead of the face',()=>{for(let t=0;t<=100;t+=5)for(let l=0;l<6;l++){const p=blockPose(t,faceAt(t)+1,l);assert.equal(p.drop,0);assert.equal(p.progress,0);}});
test('caving begins below before higher layers',()=>{for(let t=0;t<=100;t+=1){assert.ok(blockPose(t,0,0).progress>=blockPose(t,0,5).progress);}});
test('blocks stay above the floor throughout playback',()=>{for(let t=0;t<=100;t+=.25)for(let l=0;l<6;l++){let p=blockPose(t,0,l,12);let center=2.39+l*.76-p.drop-p.settle;assert.ok(center-.36-Math.abs(Math.sin(p.angle))*.8>-.12);assert.ok(Number.isFinite(center));}});
test('rewind reconstructs the same geometry',()=>{const a=blockPose(61,0,2,21);blockPose(100,0,2,21);assert.deepEqual(blockPose(61,0,2,21),a);});
import {fluidState} from '../public/model.js';
test('water requires a connected fracture and supply',()=>{assert.equal(fluidState(50,'connected').level,0);assert.equal(fluidState(100,'dry').level,0);});
test('strong water entry loads the well and suppresses gas',()=>{const dry=fluidState(100,'dry'),wet=fluidState(100,'connected');assert.ok(dry.gas>.7);assert.ok(wet.level>.8);assert.equal(wet.gas,0);assert.equal(wet.carried,0);});
test('small seep can be carried while gas continues flowing',()=>{const s=fluidState(72,'seep');assert.ok(s.gas>.9);assert.ok(s.level<.05);assert.ok(s.carried>0);});
test('water rewind is deterministic and all states remain bounded',()=>{const before=fluidState(68,'connected');fluidState(100,'connected');assert.deepEqual(fluidState(68,'connected'),before);for(const scenario of ['dry','seep','connected'])for(let t=0;t<=100;t++){const f=fluidState(t,scenario);for(const k of ['level','gas','inflow','carried'])assert.ok(Number.isFinite(f[k])&&f[k]>=0&&f[k]<=1);}});

import {narrationAt} from '../public/model.js';
test('default is a light seep and stage narration matches the water scenario',()=>{assert.ok(fluidState(100).level<.05);assert.ok(fluidState(100).gas>.7);assert.deepEqual([0,30,52,64,82].map(t=>narrationAt(t).id),[0,1,2,3,4]);assert.match(narrationAt(72,'dry').text,/no connected water/);assert.match(narrationAt(90,'connected').text,/water loaded/);});

import {advanceTime,gasConnection,voiceScore} from '../public/model.js';
test('playback crosses every narration boundary without audio completion',()=>{for(const boundary of [30,52,64,82,100])assert.ok(advanceTime(boundary-.01,.05,true)>=boundary);let t=0;for(let i=0;i<1100;i++)t=advanceTime(t,.1,true);assert.equal(t,100);});
test('gas connection requires local caving and increases through roof disruption',()=>{assert.equal(gasConnection(48),0);assert.equal(gasConnection(55),0);assert.ok(gasConnection(64)>0);assert.equal(gasConnection(72),1);});
test('enhanced English voices outrank basic defaults and non-English voices',()=>{assert.ok(voiceScore({name:'Ava Enhanced',lang:'en-US'})>voiceScore({name:'Samantha',lang:'en-US',default:true}));assert.ok(voiceScore({name:'Samantha',lang:'en-US'})>voiceScore({name:'Natural',lang:'fr-FR'}));});

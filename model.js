export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function faceAt(t){return -18+clamp(t,0,100)*.4;}
// Deterministic kinematic sequence; no claimed mechanical calibration.
export function blockPose(t,x,layer,seed=0){
 const face=faceAt(t),behind=face-x;
 const lag=3.8+layer*.75+(Math.sin(seed*12.17)+1)*.18;
 const progress=clamp((behind-lag)/2.3);
 const sag=.12*clamp((behind-1.7)/(lag-1.7));
 const drop=1.72-layer*.115;
 const falling=progress<.82?Math.pow(progress/.82,2):1;
 const bounce=progress>=.82?.07*Math.sin((progress-.82)/.18*Math.PI):0;
 return {progress,drop:progress>0?sag+(drop-sag)*falling-bounce:sag,angle:Math.sin(seed*8.71)*.16*progress,settle:clamp((behind-lag-5)/15)*.08};
}
export function narrative(t){if(t<30)return ['01 / INTACT ROOF','The coal supports the roof.','The face begins on the left. One well is shown in a cutaway through the overlying rock.'];if(t<52)return ['02 / SUPPORT MOVES FORWARD','A span of roof is left behind.','The shields support the working area. Farther behind them, the immediate roof sags and starts to separate.'];if(t<82)return ['03 / PROGRESSIVE CAVING','The roof breaks from below upward.','Unsupported beds detach and fall into the mined-out space. Higher beds bend and separate as broken rock builds up beneath them.'];return ['04 / GOB SETTLEMENT','Broken rock fills much of the opening.','The fallen blocks form the gob and settle under load. Fractures and bedding separations can remain above the rubble.'];}

// Dimensionless teaching model: storage = inflow - gas-carried water.
// Head and driving pressure are normalized, not measured well pressures.
export function fluidState(t,scenario='seep'){
 let level=0; const supply={dry:0,seep:.007,connected:.095}[scenario]??.095;
 let gas=0,inflow=0,carried=0,connection=0;
 for(let s=0;s<=clamp(t,0,100);s+=.25){
  connection=gasConnection(s);
  const dryGas=connection*(1-.25*clamp((s-76)/24));
  gas=dryGas*Math.sqrt(Math.max(0,1-level/.78));
  inflow=supply*connection*Math.max(0,1-level/.98);
  carried=.035*Math.max(0,gas-.48)*Math.min(1,level/.035);
  level=clamp(level+(inflow-carried)*.25,0,.98);
 }
 return {level,gas,inflow,carried,connection,head:level/.78,
  status:!connection?'Not connected':level>.77?'Water-loaded':level>.2?'Water building':inflow>0?'Water entering':'Gas flowing'};
}

// Connection follows local roof disruption, not merely the face passing the bore.
export function gasConnection(t){return clamp(blockPose(t,0,2,0).progress);}
// Audio completion must never gate the simulation clock.
export function advanceTime(t,dt,narrated=false){return Math.min(100,t+Math.max(0,Math.min(.1,dt))*(narrated?1:3));}
export function voiceScore(v){return (/^en[-_]/i.test(v.lang)?1000:-1000)+(/premium|enhanced|natural|neural|online/i.test(v.name)?100:0)+(/Google|Microsoft.*(Aria|Jenny|Guy)|Siri/i.test(v.name)?40:0)+(/Samantha|Alex|Daniel|Ava/i.test(v.name)?10:0)+(v.default?1:0);}
export function narrationAt(t,scenario='seep'){
 if(t<30)return {id:0,end:30,text:'This is a surface gob well in the Black Warrior Basin setting. It collects gas connected by mining. Conventional coalbed methane wells can drain coal before mining. They are a different completion approach.'};
 if(t<52)return {id:1,end:52,text:'Watch the shields advance with the face. Behind them, the roof loses support. The beds sag, separate, and begin to break. Passing the well is not the same as opening a good gas connection.'};
 if(t<64)return {id:2,end:64,text:'The lower beds cave into the opening. Higher beds separate. Gas can now move through connected fractures toward the well.'};
 if(t<82)return {id:3,end:82,text:scenario==='dry'?'Green tracers follow paths from the surrounding gas-bearing beds into the bore. This dry example has no connected water supply. The gas itself is invisible.':scenario==='seep'?'A small seep enters along a connected fracture. Water drains down the bore. Some collects at the bottom, while faster gas can carry a few droplets upward.':'Here, water enters faster than gas can remove it. The rising water column adds backpressure. As that pressure builds, less gas can reach the surface.'};
 return {id:4,end:101,text:scenario==='connected'?'This example is now water loaded. Actual water levels and production require measurements from the well. The public company records do not supply those inputs.':'The gob settles, but fractures can stay open above it. Gas production depends on those connections, pressure, and remaining gas supply. This is a source-informed illustration, not a measured production forecast.'};
}

const zero=()=>[0,0,0,0,0];
let target=zero(), current=zero(), last=0, stamp=0;
export function publish(weights) {
  target=weights.map(x=>Number.isFinite(x)?Math.max(0,Math.min(1,x)):0);
  stamp=performance.now();
}
export function reset(){target=zero();current=zero();stamp=0;}
export function mouthWeights(now){
  if(now-stamp>180)target=zero();
  const dt=last?Math.min(.1,(now-last)/1000):.016;last=now;
  current=current.map((v,i)=>v+(target[i]-v)*(1-Math.exp(-dt/(target[i]>v?.045:.085))));
  return current;
}

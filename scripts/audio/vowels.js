// Original LPC-based vowel estimator; no third-party code or training data.
// Input: mono 16 kHz PCM. Output: [a,i,u,e,o] weights (sum <= 1).
const prototypes = [[750,1250],[300,2300],[350,1250],[500,1950],[500,850]];
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
export function estimateVowels(frame, speech) {
  const silent = [0,0,0,0,0];
  if (!frame || frame.length < 400 || speech < .40) return silent;
  let power=0;
  for (const x of frame) power+=x*x;
  const rms=Math.sqrt(power/frame.length);
  if(rms<.004) return silent;
  // 16 -> 8 kHz lowpass/downsample, pre-emphasis, Hamming window.
  const n=Math.min(320,Math.floor((frame.length-2)/2));
  const x=new Float64Array(n);
  let prev=0;
  for(let i=0;i<n;i++){
    const j=2*i+1;
    const s=(frame[j-1]+2*frame[j]+frame[j+1])*.25;
    x[i]=(s-.95*prev)*(.54-.46*Math.cos(2*Math.PI*i/(n-1)));
    prev=s;
  }
  const order=10,r=new Float64Array(order+1);
  for(let lag=0;lag<=order;lag++) for(let i=lag;i<n;i++) r[lag]+=x[i]*x[i-lag];
  if(r[0]<1e-8) return silent;
  r[0]*=1.001;
  let a=new Float64Array(order+1);a[0]=1;
  let err=r[0];
  for(let k=1;k<=order;k++){
    let sum=r[k];
    for(let j=1;j<k;j++) sum+=a[j]*r[k-j];
    const reflection=clamp(-sum/Math.max(err,1e-10),-.98,.98);
    const next=a.slice();
    for(let j=1;j<k;j++) next[j]=a[j]+reflection*a[k-j];
    next[k]=reflection;a=next;err*=1-reflection*reflection;
  }
  const envelope=[];
  for(let f=100;f<=3400;f+=25){
    let re=1,im=0;
    for(let k=1;k<=order;k++){
      const w=2*Math.PI*f*k/8000;
      re+=a[k]*Math.cos(w);im-=a[k]*Math.sin(w);
    }
    envelope.push({f,db:-10*Math.log10(re*re+im*im+1e-10)});
  }
  const peaks=envelope.filter((v,i)=>i>0&&i<envelope.length-1&&v.db>envelope[i-1].db&&v.db>=envelope[i+1].db);
  const f1=peaks.find(p=>p.f>=200&&p.f<=1100);
  const f2=f1&&peaks.find(p=>p.f>=Math.max(650,f1.f+250)&&p.f<=3000);
  if(!f1||!f2)return silent;
  const scores=prototypes.map(([a,b])=>((Math.log(f1.f/a)/.30)**2+(Math.log(f2.f/b)/.25)**2));
  const best=Math.min(...scores);
  const confidence=clamp(1-best/7,0,1);
  const w=scores.map(s=>Math.exp(-(s-best)*1.25));
  const sum=w.reduce((a,b)=>a+b,0);
  const openness=clamp((rms-.004)/.035,0,1)*clamp((speech-.40)/.35,0,1)*confidence;
  return w.map(v=>v/sum*openness);
}

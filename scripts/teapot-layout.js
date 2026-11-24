// Surface rows sampled by arc length, with local tangent frames.
export const SETTINGS = { pitch: .077, rowPitch: .116, glyphHeight: .100, rotationSeconds: 20 };
export function makeLayout(sample, count=32) {
  const {pitch,rowPitch}=SETTINGS;
  const add=(a,b)=>a.map((x,i)=>x+b[i]);
  const sub=(a,b)=>a.map((x,i)=>x-b[i]);
  const mul=(a,k)=>a.map(x=>x*k);
  const length=a=>Math.hypot(...a);
  const unit=a=>mul(a,1/Math.max(length(a),1e-9));
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const arc=fn=>{
    const d=[0]; let prev=fn(0);
    for(let i=1;i<=32;i++){const p=fn(i/32);d.push(d[i-1]+length(sub(p,prev)));prev=p;}
    return {length:d[32],at(f){const wanted=f*d[32];let j=1;while(j<32&&d[j]<wanted)j++;return (j-1+(wanted-d[j-1])/Math.max(d[j]-d[j-1],1e-9))/32;}};
  };
  const out=[];
  for(let p=0;p<count;p++){
    const rows=arc(s=>sample(p,s,.5));
    const nr=Math.max(1,Math.round(rows.length/rowPitch));
    for(let r=0;r<nr;r++){
      const s=rows.at((r+.5)/nr);
      const line=arc(t=>sample(p,s,t));
      const nc=Math.max(1,Math.round(line.length/pitch));
      for(let j=0;j<nc;j++){
        const t=line.at((j+.5)/nc);
        const pos=sample(p,s,t);
        const tangent=sub(sample(p,s,Math.min(1,t+.005)),sample(p,s,Math.max(0,t-.005)));
        const along=sub(sample(p,Math.min(1,s+.005),t),sample(p,Math.max(0,s-.005),t));
        if(length(tangent)<1e-5||length(along)<1e-5)continue;
        // TeapotGeometry normals are t tangent cross s tangent.
        const normal=unit(cross(tangent,along));
        let right=unit(tangent),up=unit(cross(normal,right));
        if(up[1]<-.001){right=mul(right,-1);up=mul(up,-1);}
        const height=Math.min(SETTINGS.glyphHeight,rows.length/nr*.87,line.length/nc*1.35);
        if(height<.022)continue;
        out.push({letter:"nlb0sl"[(j+r*2+p)%6],pos:add(pos,mul(normal,.014)),right,up,normal,height});
      }
    }
  }
  return out;
}

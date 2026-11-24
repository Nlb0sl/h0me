// Procedural stippled clouds. Canvas 2D only, with cached cloud sprites.
const canvas = document.querySelector(".clouds");
if (canvas) {
  const ctx = canvas.getContext("2d", {alpha:true});
  if (ctx) mount(canvas,ctx);
}

function mount(canvas,ctx) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const random = (a,b) => a+Math.random()*(b-a);
  const clamp = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  function smooth(a,b,x){const t=clamp((x-a)/(b-a));return t*t*(3-2*t);}
  function hash(x,y,seed){
    let h=(Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(seed,1013904223))|0;
    h=Math.imul(h^(h>>>13),1274126177);
    return ((h^(h>>>16))>>>0)/4294967295;
  }
  function noise(x,y,seed){
    const i=Math.floor(x),j=Math.floor(y);
    const u=smooth(0,1,x-i),v=smooth(0,1,y-j);
    return (hash(i,j,seed)*(1-u)+hash(i+1,j,seed)*u)*(1-v)
      +(hash(i,j+1,seed)*(1-u)+hash(i+1,j+1,seed)*u)*v;
  }
  function fbm(x,y,seed){
    return .52*noise(x,y,seed)+.27*noise(x*2.03+13,y*2.03,seed)
      +.14*noise(x*4.11,y*4.11+19,seed)+.07*noise(x*8.2+37,y*8.2,seed);
  }

  let width=1,height=1,dpr=1,layers=[],frame=0,last=0;
  // Clouds differ in their proportions and height, not merely their position.
  function makeCloud(w,h,layer){
    const seed=Math.floor(random(1,1000000));
    const sprite=document.createElement("canvas");
    sprite.width=Math.ceil(w*dpr);sprite.height=Math.ceil(h*dpr);
    const g=sprite.getContext("2d");
    g.scale(dpr,dpr);
    const lobes=[];
    const crest=random(.26,.43);
    for(let i=0;i<8;i++){
      const x=.13+i*.105+random(-.045,.045);
      const rise=Math.sin(Math.PI*(i+.5)/8);
      lobes.push([x,.67-rise*crest+random(-.035,.055),random(.105,.185),random(.18,.32)]);
      lobes.push([x,.69+random(-.055,.04),random(.14,.23),random(.18,.26)]);
    }
    function field(u,v){
      let d=-5;
      for(const [x,y,rx,ry] of lobes){
        const q=1-Math.hypot((u-x)/rx,(v-y)/ry);
        // Smooth maximum: rounded, connected cloud lobes.
        const k=.16,m=Math.max(k-Math.abs(d-q),0)/k;
        d=Math.max(d,q)+m*m*k*.25;
      }
      const ragged=.38*(fbm(u*13,v*10,seed)-.5);
      return d+ragged-.08;
    }
    const gap=layer.gap;
    // Quantize color for a printed, halftone-like texture.
    const colors=layer.palette;
    const paths=colors.map(()=>[]);
    for(let y=gap/2;y<h;y+=gap){
      for(let x=gap/2;x<w;x+=gap){
        const u=x/w,v=y/h,d=field(u,v);
        const edge=smooth(-.08,.17,d);
        if(edge<.025)continue;
        const grain=hash(Math.floor(x/gap),Math.floor(y/gap),seed+7);
        if(grain>Math.min(1,edge*1.55))continue;
        const billows=fbm(u*8+11,v*7+4,seed);
        const detail=fbm(u*23,v*20,seed+1);
        // Light-facing lobes and deep pockets of shade below overlapping lobes.
        const slope=field(u+.009,v+.015)-field(u-.009,v-.015);
        const underside=smooth(.39,.84,v);
        const pockets=smooth(.34,.62,fbm(u*12+5,v*9+23,seed+2));
        const t=clamp(.82 + slope*2.1 + (billows-.5)*1.25
          + (detail-.5)*.22 - underside*.70 - pockets*.26);
        const band=Math.round(t*(colors.length-1));
        // Dark areas remain dense instead of disappearing into the sky.
        const radius=gap*(.34+.16*t)*Math.sqrt(edge)*(.91+.14*grain);
        paths[band].push([x,y,radius]);
      }
    }
    paths.forEach((dots,i)=>{
      g.fillStyle=colors[i];g.beginPath();
      for(const [x,y,r] of dots){g.moveTo(x+r,y);g.arc(x,y,r,0,Math.PI*2);}
      g.fill();
    });
    return sprite;
  }
  function newCloud(layer,x){
    const w=Math.round(layer.scale*random(.78,1.30));
    const h=Math.round(w*random(.44,.64));
    const y=height*layer.level-h*random(.43,.67);
    return {sprite:makeCloud(w,h,layer),w,h,x,y};
  }
  function rebuild(){
    width=Math.max(1,window.innerWidth);
    height=Math.max(1,window.innerHeight);
    dpr=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const scale=Math.min(1060,Math.max(420,width*.70,height*.68));
    layers=[
      {scale:scale*.69,level:.64,speed:2.7,opacity:.77,gap:3.7,
        palette:["#71888e","#84999d","#9aa9a9","#b1bab4","#c7c9ba","#d9d7c0","#e5ddc5"],clouds:[]},
      {scale:scale*.92,level:.83,speed:5.1,opacity:.92,gap:4.1,
        palette:["#596f7b","#70878d","#8a9b9c","#a3aba5","#bcbbae","#d8cbb0","#e7d9b8","#f0e2c6"],clouds:[]},
      {scale:scale*1.18,level:1.01,speed:8.2,opacity:1,gap:4.7,
        palette:["#495f70","#607984","#7e9398","#98a6a6","#b0b5aa","#c8c4ae","#ded1b3","#efdfbf","#f6e8ce"],clouds:[]}
    ];
    for(const layer of layers){
      let x=-layer.scale*.38;
      while(x<width+layer.scale*.2){
        const cloud=newCloud(layer,x);layer.clouds.push(cloud);
        x+=cloud.w*random(.64,.83);
      }
    }
    last=0;draw(performance.now(),false);
  }
  function draw(now,advance=true){
    const dt=advance&&last?Math.min((now-last)/1000,.05):0;
    last=now;
    ctx.clearRect(0,0,width,height);
    for(const layer of layers){
      ctx.globalAlpha=layer.opacity;
      for(const cloud of layer.clouds)cloud.x+=layer.speed*dt;
      if(advance){
        // Enter at the left and retire at the right; no repeating strip.
        layer.clouds=layer.clouds.filter(c=>c.x<width+10);
        const first=layer.clouds[0];
        if(!first||first.x>-layer.scale*.12){
          const next=newCloud(layer,0);
          next.x=(first?first.x:0)-next.w*random(.70,.88);
          layer.clouds.unshift(next);
        }
      }
      for(const c of layer.clouds)ctx.drawImage(c.sprite,c.x,c.y,c.w,c.h);
    }
    ctx.globalAlpha=1;
  }
  function tick(now){
    frame=0;
    if(document.hidden||reduced.matches)return;
    draw(now);
    frame=requestAnimationFrame(tick);
  }
  function restart(){
    if(frame)cancelAnimationFrame(frame);
    frame=0;last=0;
    if(!document.hidden&&!reduced.matches)frame=requestAnimationFrame(tick);
  }
  let resizeFrame=0;
  window.addEventListener("resize",()=>{
    if(resizeFrame)cancelAnimationFrame(resizeFrame);
    resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;rebuild();restart();});
  });
  document.addEventListener("visibilitychange",restart);
  reduced.addEventListener("change",restart);
  rebuild();restart();
}

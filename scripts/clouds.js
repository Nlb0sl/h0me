// Procedural stippled clouds. Canvas 2D only, with cached cloud sprites.
const canvas = document.querySelector(".clouds");
if (canvas) {
  const ctx = canvas.getContext("2d", {alpha:true});
  if (ctx) mount(canvas,ctx);
}

function mount(canvas,ctx) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  // Stable initial composition on reload; later clouds still vary as they enter.
  const initialSeed=0x4e4c4230;
  let rng=initialSeed;
  function nextRandom(){
    rng=(rng+0x6D2B79F5)|0;
    let t=Math.imul(rng^(rng>>>15),1|rng);
    t^=t+Math.imul(t^(t>>>7),61|t);
    return ((t^(t>>>14))>>>0)/4294967296;
  }
  const random = (a,b) => a+nextRandom()*(b-a);
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
    // Leave room for the complete density field, including turbulent edges.
    const padX=Math.ceil(w*.28),padY=Math.ceil(h*.28);
    const sw=w+2*padX,sh=h+2*padY;
    sprite.width=Math.ceil(sw*dpr);sprite.height=Math.ceil(sh*dpr);
    const g=sprite.getContext("2d");
    g.scale(dpr,dpr);
    // A continuous turbulent density field, not individually shaded balls.
    const lobes=[];
    const peak=random(.25,.69);
    const crest=random(.23,.39);
    for(let i=0;i<10;i++){
      const x=.12+i*.084+random(-.025,.025);
      const rise=crest*Math.exp(-Math.pow((x-peak)/random(.20,.34),2));
      const y=.66-rise*.7+random(-.045,.04);
      lobes.push([x,y,random(.08,.155),random(.14,.22)+rise*.3]);
      lobes.push([x,.72+random(-.035,.04),random(.09,.15),random(.10,.17)]);
      if(i>0&&i<9&&nextRandom()<.75){
        lobes.push([x+random(-.045,.045),y-random(.07,.14),random(.035,.075),random(.055,.105)]);
      }
    }
    function field(u,v){
      const wx=u+.075*(fbm(u*5+11,v*5,seed)-.5);
      const wy=v+.095*(fbm(u*6,v*5+17,seed+1)-.5);
      let density=0;
      for(const [x,y,rx,ry] of lobes){
        const dx=(wx-x)/rx,dy=(wy-y)/ry;
        const q=Math.max(0,1-(dx*dx+dy*dy)*.46);
        density+=q*q;
      }
      const turbulence=.85*(fbm(u*12,v*10,seed+2)-.5)
        +.36*(fbm(u*33,v*25,seed+3)-.5);
      // Fade according to cloud density, never distance to a rectangular sprite edge.
      return density+turbulence*smooth(0,.40,density)-.48;
    }
    const gap=layer.gap,colors=layer.palette;
    const paths=colors.map(()=>[]);
    for(let row=0,y=gap/2;y<sh;y+=gap,row++){
      for(let col=0,x=gap/2+(row%2)*gap*.5;x<sw;x+=gap,col++){
        const u=(x-padX)/w,v=(y-padY)/h,d=field(u,v);
        const edge=smooth(-.07,.30,d);
        if(edge<.025)continue;
        const grain=hash(col,row,seed+7);
        if(grain>Math.min(1,edge*1.5))continue;
        // Diffuse light on a shared density surface; no seams between lobes.
        const lightFacing=clamp((field(u+.012,v+.020)-field(u-.012,v-.020))*1.4,-.4,.4);
        const billows=fbm(u*8+11,v*7+4,seed+4);
        const shadow=smooth(.36,.75,fbm(u*10+5,v*8+23,seed+5));
        const underside=smooth(.42,.86,v);
        const t=clamp(.76+lightFacing+(billows-.5)*.94-underside*.47-shadow*.26);
        const tone=t*(colors.length-1),lo=Math.floor(tone);
        const band=Math.min(colors.length-1,lo+(hash(col,row,seed+19)<tone-lo?1:0));
        const radius=gap*(.32+.16*t)*Math.sqrt(edge)*(.91+.14*grain);
        paths[band].push([x,y,radius]);
      }
    }
    paths.forEach((dots,i)=>{
      g.fillStyle=colors[i];g.beginPath();
      for(const [x,y,r] of dots){g.moveTo(x+r,y);g.arc(x,y,r,0,Math.PI*2);}
      g.fill();
    });
    return {sprite,padX,padY,sw,sh};
  }
  function newCloud(layer,x){
    const w=Math.round(layer.scale*random(.78,1.30));
    const h=Math.round(w*random(.44,.64));
    const y=height*layer.level-h*random(.43,.67);
    return {...makeCloud(w,h,layer),w,h,x,y};
  }
  function rebuild(){
    const w=Math.max(1,canvas.clientWidth||window.innerWidth);
    const h=Math.max(1,canvas.clientHeight||window.innerHeight);
    const ratio=Math.min(window.devicePixelRatio||1,1.5);
    if(layers.length&&w===width&&h===height&&ratio===dpr)return;
    width=w;height=h;dpr=ratio;
    rng=initialSeed;
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
        x+=cloud.w*random(1.05,1.40);
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
        layer.clouds=layer.clouds.filter(c=>c.x-c.padX<width+10);
        const first=layer.clouds[0];
        if(!first||first.x>-layer.scale*.12){
          const next=newCloud(layer,0);
          next.x=Math.min(-next.w-next.padX,(first?first.x:0)-next.w*random(1.05,1.40));
          layer.clouds.unshift(next);
        }
      }
      for(const c of layer.clouds){
        const left=c.x-c.padX,top=c.y-c.padY;
        if(left+c.sw>0&&left<width)ctx.drawImage(c.sprite,left,top,c.sw,c.sh);
      }
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
  let resizeTimer=0;
  window.addEventListener("resize",()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{rebuild();restart();},180);
  });
  document.addEventListener("visibilitychange",restart);
  reduced.addEventListener("change",restart);
  rebuild();restart();
}

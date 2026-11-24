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
    // Asymmetric cumulus towers, with smaller rounded lobes at their shoulders.
    // Keep the base inside the sprite; no rectangular clipping at its edges.
    const lobes=[];
    const add=(x,y,rx,ry,depth)=>lobes.push({x,y,rx,ry,depth});
    const peak=random(.30,.65);
    const profile=x=>Math.exp(-Math.pow((x-peak)/.23,2));
    for(let i=0;i<7;i++){
      const x=.16+i*.113+random(-.027,.027);
      const rise=profile(x)*random(.19,.31);
      const ry=random(.13,.22)+rise*.32;
      const y=.67-rise*.65;
      const rx=random(.075,.13)+rise*.09;
      add(x,y,rx,ry,random(.82,1.10)*rx);
      add(x,.76,random(.095,.145),random(.09,.14),.085);
      if(i>0&&i<6){
        const top=y-ry*.56;
        add(x+random(-.055,.055),Math.max(.16,top),rx*random(.55,.82),ry*random(.49,.70),rx*.68);
      }
    }
    const gap=layer.gap, colors=layer.palette;
    const paths=colors.map(()=>[]);
    for(let row=0,y=gap/2;y<h;y+=gap,row++){
      for(let col=0,x=gap/2+(row%2)*gap*.5;x<w;x+=gap,col++){
        const u=x/w,v=y/h;
        const warp=.013*(fbm(u*14,v*12,seed)-.5);
        const sx=u+warp,sy=v+warp*.8;
        let silhouette=-10,depth=-1,lit=.5;
        for(const l of lobes){
          const dx=(sx-l.x)/l.rx,dy=(sy-l.y)/l.ry;
          const q=1-dx*dx-dy*dy;
          silhouette=Math.max(silhouette,q);
          if(q>0){
            const z=Math.sqrt(q),front=z*l.depth;
            if(front>depth){
              depth=front;
              // Upper-left daylight on each rounded volume.
              lit=clamp(.35-.39*dx-.62*dy+.45*z);
            }
          }
        }
        const edge=smooth(-.045,.18,silhouette);
        if(edge<.015)continue;
        const grain=hash(col,row,seed+7);
        if(grain>Math.min(1,edge*1.35))continue;
        const broad=fbm(u*8+11,v*7+4,seed+2);
        const underside=smooth(.53,.90,v);
        const shade=clamp(.17+.83*lit-.31*underside+(broad-.5)*.32);
        const tone=shade*(colors.length-1);
        const lo=Math.floor(tone),hi=Math.min(colors.length-1,lo+1);
        const band=hash(col,row,seed+19)<tone-lo?hi:lo;
        // Printed stippling: small but dense circles, with subtle size variation.
        const radius=gap*(.29+.17*shade)*Math.sqrt(edge)*(.92+.16*grain);
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
    const w=Math.round(layer.scale*random(.74,1.32));
    const h=Math.round(w*random(.49,.70));
    const y=height*layer.level-h*random(.37,.53);
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
      {scale:scale*.67,level:.68,speed:2.0,opacity:.75,gap:3.0,
        palette:["#829ba5","#94a8ad","#a7b5b5","#bec4bf","#d2d2c4","#e5dfcc","#f0e7d5"],clouds:[]},
      {scale:scale*.99,level:.86,speed:3.8,opacity:.92,gap:3.2,
        palette:["#627e91","#7c96a3","#99adb3","#b4bfc0","#cdd1c8","#e0ddcd","#f0e7d3","#faf0db"],clouds:[]},
      {scale:scale*1.30,level:1.04,speed:6.1,opacity:1,gap:3.5,
        palette:["#526f85","#6c899e","#8da4b1","#a6b7bf","#c0c9c8","#d6d9cf","#e9e4d4","#f6eedb","#fff5e1"],clouds:[]}
    ];
    for(const layer of layers){
      let x=-layer.scale*.45;
      while(x<width+layer.scale*.2){
        const cloud=newCloud(layer,x);layer.clouds.push(cloud);
        x+=cloud.w*random(.78,1.06);
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
        if(!first||first.x>-layer.scale*.06){
          const next=newCloud(layer,0);
          next.x=Math.min(-next.w,(first?first.x:0)-next.w*random(.78,1.06));
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

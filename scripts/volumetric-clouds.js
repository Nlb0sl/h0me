// Volumetric clouds rendered with @takram/three-clouds, then stippled.
// The existing Canvas 2D background remains visible until this renderer is ready.
import * as THREE from "three";
import { Effect, EffectComposer, EffectPass, RenderPass } from "postprocessing";
import { PrecomputedTexturesLoader, DEFAULT_PRECOMPUTED_TEXTURES_URL } from "@takram/three-atmosphere";
import { CloudsEffect, CLOUD_SHAPE_TEXTURE_SIZE, CLOUD_SHAPE_DETAIL_TEXTURE_SIZE,
  DEFAULT_LOCAL_WEATHER_URL, DEFAULT_SHAPE_URL, DEFAULT_SHAPE_DETAIL_URL, DEFAULT_TURBULENCE_URL } from "@takram/three-clouds";
import { DataTextureLoader, parseUint8Array, STBNLoader, DEFAULT_STBN_URL, Geodetic } from "@takram/three-geospatial";

const fallback=document.querySelector(".clouds");
if(fallback)start().catch(error=>console.warn("Volumetric clouds unavailable; using Canvas 2D.",error));

async function start(){
  const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,depth:false,powerPreference:"low-power"});
  renderer.setPixelRatio(1);
  renderer.toneMapping=THREE.NoToneMapping;
  const view=renderer.domElement;
  view.className="clouds clouds--volumetric";
  view.setAttribute("aria-hidden","true");
  let failed=false,ready=false,frame=0,last=0,composer;
  function fail(error){
    if(failed)return;
    failed=true;cancelAnimationFrame(frame);
    view.remove();
    fallback.hidden=false;
    document.dispatchEvent(new Event("clouds-fallback"));
    console.warn("Volumetric cloud rendering:",error);
  }
  renderer.debug.onShaderError=()=>fail(new Error("WebGL shader compilation failed"));
  view.addEventListener("webglcontextlost",e=>{e.preventDefault();fail(new Error("WebGL context lost"));},{once:true});
  try{
    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0);
    const camera=new THREE.PerspectiveCamera(65,1,10,1e6);
    const position=new Geodetic(0,0,100).toECEF();
    camera.position.copy(position);
    camera.up.set(1,0,0);
    const direction=new THREE.Vector3(.75,1,0).normalize();
    camera.lookAt(position.clone().addScaledVector(direction,1000));
    const clouds=new CloudsEffect(camera);
    clouds.qualityPreset="medium";
    clouds.resolutionScale=.55;
    clouds.coverage=.62;
    clouds.lightShafts=false;
    clouds.haze=false;
    clouds.skipRendering=true;
    clouds.localWeatherVelocity.set(.00045,.00013);
    clouds.shapeVelocity.set(8,3,0);
    clouds.sunDirection.set(.82,-.25,.51).normalize();
    // Use the upstream LUTs and 3D noise textures rather than an invented cloud field.
    const manager=new THREE.LoadingManager();
    const textureLoader=new THREE.TextureLoader(manager);
    const image=async url=>{
      const t=await textureLoader.loadAsync(url);
      t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;
      t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.NoColorSpace;t.needsUpdate=true;return t;
    };
    const volume=async(url,size)=>{
      const t=await new DataTextureLoader(THREE.Data3DTexture,parseUint8Array,{width:size,height:size,depth:size},manager).loadAsync(url);
      t.format=THREE.RedFormat;t.minFilter=t.magFilter=THREE.LinearFilter;
      t.wrapS=t.wrapT=t.wrapR=THREE.RepeatWrapping;t.colorSpace=THREE.NoColorSpace;t.needsUpdate=true;return t;
    };
    const lut=new PrecomputedTexturesLoader({},manager).setType(renderer);
    const [textures,weather,shape,detail,turbulence,stbn]=await Promise.all([
      lut.loadAsync(DEFAULT_PRECOMPUTED_TEXTURES_URL),
      image(DEFAULT_LOCAL_WEATHER_URL),
      volume(DEFAULT_SHAPE_URL,CLOUD_SHAPE_TEXTURE_SIZE),
      volume(DEFAULT_SHAPE_DETAIL_URL,CLOUD_SHAPE_DETAIL_TEXTURE_SIZE),
      image(DEFAULT_TURBULENCE_URL),
      new STBNLoader(manager).loadAsync(DEFAULT_STBN_URL)
    ]);
    Object.assign(clouds,textures,{localWeatherTexture:weather,shapeTexture:shape,shapeDetailTexture:detail,turbulenceTexture:turbulence,stbnTexture:stbn});
    if(failed)return;

    // Original halftone effect. Sample radiance and opacity at each dot's center.
    const fragment=`
      uniform sampler2D cloudMap;
      uniform vec2 viewport;
      vec3 linearColor(vec3 c){return pow(c,vec3(2.2));}
      void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){
        vec3 sky=mix(linearColor(vec3(.675,.737,.718)),linearColor(vec3(.569,.651,.663)),uv.y);
        vec2 p=uv*viewport;
        float pitch=4.2;
        float row=floor(p.y/pitch);
        vec2 shifted=p-vec2(mod(row,2.0)*pitch*.5,0.0);
        vec2 cell=(floor(shifted/pitch)+.5)*pitch;
        vec2 center=cell+vec2(mod(row,2.0)*pitch*.5,0.0);
        vec4 cloud=texture2D(cloudMap,clamp(center/viewport,vec2(0.0),vec2(1.0)));
        float opacity=clamp(cloud.a,0.0,1.0);
        float lum=dot(max(cloud.rgb,vec3(0.0)),vec3(.2126,.7152,.0722))/max(opacity,.035);
        float shade=clamp(1.0-exp(-lum*6.0),0.0,1.0);
        shade=floor(shade*8.0+.5)/8.0;
        vec3 shadow=linearColor(vec3(.286,.373,.439));
        vec3 middle=linearColor(vec3(.659,.706,.682));
        vec3 light=linearColor(vec3(.965,.910,.808));
        vec3 ink=mix(mix(shadow,middle,smoothstep(0.0,.6,shade)),light,smoothstep(.45,1.0,shade));
        float radius=pitch*(.32+.17*shade)*sqrt(opacity);
        float mask=1.0-smoothstep(radius-.55,radius+.55,length(p-center));
        mask*=smoothstep(.018,.16,opacity);
        outputColor=vec4(mix(sky,ink,mask),1.0);
      }`;
    const halftone=new Effect("CloudHalftone",fragment,{uniforms:new Map([
      ["cloudMap",new THREE.Uniform(null)],["viewport",new THREE.Uniform(new THREE.Vector2(1,1))]
    ])});
    clouds.events.addEventListener("change",event=>{
      if(event.property==="atmosphereOverlay")halftone.uniforms.get("cloudMap").value=clouds.atmosphereOverlay?.map??null;
    });
    composer=new EffectComposer(renderer,{frameBufferType:THREE.HalfFloatType,multisampling:0});
    composer.addPass(new RenderPass(scene,camera));
    composer.addPass(new EffectPass(camera,clouds));
    composer.addPass(new EffectPass(camera,halftone));
    const reduced=matchMedia("(prefers-reduced-motion: reduce)");
    function resize(){
      const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
      // Render at a bounded resolution for a background, not a game.
      const scale=Math.min(1,1440/w,1000/h);
      camera.aspect=w/h;camera.updateProjectionMatrix();
      composer.setSize(Math.round(w*scale),Math.round(h*scale));
      halftone.uniforms.get("viewport").value.set(w,h);
      if(ready&&reduced.matches)draw(performance.now());
    }
    function draw(now){
      if(failed)return;
      try{
        const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
        composer.render(dt);
        if(!failed&&clouds.atmosphereOverlay?.map){
          // The ping-pong buffer may change after each temporal resolve.
          halftone.uniforms.get("cloudMap").value=clouds.atmosphereOverlay.map;
          if(!ready){
            ready=true;
            fallback.insertAdjacentElement("afterend",view);
            fallback.hidden=true;
            document.dispatchEvent(new Event("clouds-volumetric-ready"));
          }
        }
      }catch(error){fail(error);}
    }
    function tick(now){
      frame=0;
      if(failed||document.hidden)return;
      draw(now);
      if(!failed&&!reduced.matches)frame=requestAnimationFrame(tick);
    }
    function restart(){
      cancelAnimationFrame(frame);frame=0;last=0;
      if(!failed&&!document.hidden)frame=requestAnimationFrame(tick);
    }
    window.addEventListener("resize",resize);
    document.addEventListener("visibilitychange",restart);
    reduced.addEventListener("change",restart);
    resize();restart();
  }catch(error){fail(error);composer?.dispose();renderer.dispose();}
}

// Volumetric clouds rendered with @takram/three-clouds, then stippled.
// The existing Canvas 2D background remains visible until this renderer is ready.
import * as THREE from "three";
import { Effect, EffectComposer, EffectPass, RenderPass } from "postprocessing";
import { PrecomputedTexturesLoader, DEFAULT_PRECOMPUTED_TEXTURES_URL } from "@takram/three-atmosphere";
import { CloudsEffect, CLOUD_SHAPE_TEXTURE_SIZE, CLOUD_SHAPE_DETAIL_TEXTURE_SIZE,
  DEFAULT_LOCAL_WEATHER_URL, DEFAULT_SHAPE_URL, DEFAULT_SHAPE_DETAIL_URL, DEFAULT_TURBULENCE_URL } from "@takram/three-clouds";
import { DataTextureLoader, parseUint8Array, STBNLoader, DEFAULT_STBN_URL, Geodetic } from "@takram/three-geospatial";

const fallback=document.querySelector(".clouds");
const mode=new URLSearchParams(location.search).get("clouds");
if(fallback&&mode!=="2d")start().catch(error=>console.warn("Volumetric clouds unavailable; using Canvas 2D.",error));

async function start(){
  const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,depth:true,powerPreference:"low-power"});
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
    document.documentElement.dataset.cloudRenderer="canvas2d";
    if(mode==="raw")document.title="nlb0sl — Canvas fallback";
    document.dispatchEvent(new Event("clouds-fallback"));
    console.warn("Volumetric cloud rendering:",error);
  }
  renderer.debug.onShaderError=()=>fail(new Error("WebGL shader compilation failed"));
  view.addEventListener("webglcontextlost",e=>{e.preventDefault();fail(new Error("WebGL context lost"));},{once:true});
  try{
    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0);
    const camera=new THREE.PerspectiveCamera(53,1,10,1e6);
    const position=new Geodetic(0,0,180).toECEF();
    camera.position.copy(position);
    camera.up.set(1,0,0);
    const direction=new THREE.Vector3(.32,1,0).normalize();
    camera.lookAt(position.clone().addScaledVector(direction,1000));
    const clouds=new CloudsEffect(camera);
    clouds.qualityPreset="medium";
    clouds.resolutionScale=.85;
    clouds.temporalUpscale=false;
    clouds.coverage=.58;
    clouds.shapeDetail=true;
    clouds.turbulence=true;
    clouds.cloudLayers[0].altitude=900;
    clouds.cloudLayers[0].height=650;
    clouds.cloudLayers[0].densityScale=.10;
    clouds.cloudLayers[1].altitude=1400;
    clouds.cloudLayers[1].height=1000;
    clouds.cloudLayers[1].densityScale=.10;
    clouds.cloudLayers[2].densityScale=.001;
    // At this ECEF location X is vertical; compress vertically, stretch horizontally.
    clouds.shapeRepeat.set(.00034,.00024,.00024);
    clouds.cloudLayers[0].shapeDetailAmount=.55;
    clouds.cloudLayers[1].shapeDetailAmount=.65;
    clouds.turbulenceDisplacement*=.60;
    clouds.clouds.maxIterationCountToSun=4;
    clouds.clouds.accurateSunSkyLight=true;
    clouds.lightShafts=false;
    clouds.haze=false;
    clouds.skipRendering=true;
    clouds.localWeatherVelocity.set(.00018,.00006);
    clouds.shapeVelocity.set(0,0,0);
    clouds.sunDirection.set(.75,-.40,.53).normalize();
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
      uniform float rawMode;
      vec3 linearColor(vec3 c){return pow(c,vec3(2.2));}
      vec3 softCloud(vec4 c){
        float a=clamp(c.a,0.0,1.0);
        float lum=dot(max(c.rgb,vec3(0.0)),vec3(.2126,.7152,.0722))/max(a,.025);
        // Continuous luminance response with a lifted shadow floor.
        float shade=pow(lum/(lum+.28),.64);
        vec3 shadow=linearColor(vec3(.66,.70,.70));
        vec3 light=linearColor(vec3(.99,.965,.91));
        return mix(shadow,light,shade);
      }
      void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){
        vec3 sky=mix(linearColor(vec3(.675,.737,.718)),linearColor(vec3(.569,.651,.663)),uv.y);
        vec4 cloud=texture2D(cloudMap,uv);
        float a=clamp(cloud.a,0.0,1.0);
        if(rawMode>.5){
          // Diagnostic: original cloud radiance and opacity, no stipple or palette.
          vec3 radiance=max(cloud.rgb,vec3(0.0))/max(a,.025);
          vec3 mapped=vec3(1.0)-exp(-radiance*2.0);
          outputColor=vec4(mix(sky,mapped,a),1.0);
          return;
        }
        vec2 p=uv*viewport;
        float pitch=3.8;
        float row=floor(p.y/pitch);
        vec2 shifted=p-vec2(mod(row,2.0)*pitch*.5,0.0);
        vec2 cell=(floor(shifted/pitch)+.5)*pitch;
        vec2 center=cell+vec2(mod(row,2.0)*pitch*.5,0.0);
        vec4 sampleCloud=texture2D(cloudMap,clamp(center/viewport,vec2(0.0),vec2(1.0)));
        float opacity=clamp(sampleCloud.a,0.0,1.0);
        // Keep a faint continuous scattering layer between the printed dots.
        vec3 base=mix(sky,softCloud(cloud),a*.32);
        float radius=pitch*.45*sqrt(opacity);
        float mask=(1.0-smoothstep(radius-.45,radius+.45,length(p-center)))*opacity;
        outputColor=vec4(mix(base,softCloud(sampleCloud),mask*.90),1.0);
      }`;
    const halftone=new Effect("CloudHalftone",fragment,{uniforms:new Map([
      ["cloudMap",new THREE.Uniform(null)],["viewport",new THREE.Uniform(new THREE.Vector2(1,1))],
      ["rawMode",new THREE.Uniform(mode==="raw"?1:0)]
    ])});
    // Read the current ping-pong output immediately before the halftone pass.
    halftone.update=()=>{
      halftone.uniforms.get("cloudMap").value=clouds.cloudsPass.outputBuffer;
    };
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
          if(!ready){
            ready=true;
            fallback.insertAdjacentElement("afterend",view);
            fallback.hidden=true;
            document.documentElement.dataset.cloudRenderer="takram";
            if(mode==="raw")document.title="nlb0sl — Takram raw clouds";
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

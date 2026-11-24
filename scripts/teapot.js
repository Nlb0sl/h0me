import * as THREE from "three";
import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";
import { makeLayout, SETTINGS } from "./teapot-layout.js";

const root=document.querySelector("[data-teapot]");
if(root) try { mount(root); } catch(error) { console.error("Teapot:",error); }

function mount(root){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.setClearColor(0x202222,1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.domElement.hidden=true;
  renderer.domElement.setAttribute("aria-hidden","true");
  root.append(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-2.5,2.5,2.3,-2.3,.1,50);
  camera.position.set(0,1.7,7);camera.lookAt(0,0,0);
  const object=new THREE.Group();scene.add(object);
  const segments=24;
  const surface=new TeapotGeometry(1,segments,true,true,true,true,true);
  const positions=surface.getAttribute("position");
  const stride=segments+1;
  function sample(p,s,t){
    const u=Math.min(segments-1,Math.floor(s*segments)),v=Math.min(segments-1,Math.floor(t*segments));
    const a=s*segments-u,b=t*segments-v;
    const i=p*stride*stride+u*stride+v;
    const result=[];
    for(const read of [positions.getX,positions.getY,positions.getZ]){
      const x=read.call(positions,i),y=read.call(positions,i+1),z=read.call(positions,i+stride),w=read.call(positions,i+stride+1);
      result.push((1-a)*((1-b)*x+b*y)+a*((1-b)*z+b*w));
    }
    return result;
  }
  // The base surface only writes depth. No solid pot is ever visible.
  const depth=new THREE.Mesh(surface,new THREE.MeshBasicMaterial({colorWrite:false,side:THREE.DoubleSide}));
  depth.renderOrder=-10;object.add(depth);
  const glyphs=makeLayout(sample);
  scene.add(new THREE.HemisphereLight(0xffffff,0x727673,1.8));
  const key=new THREE.DirectionalLight(0xffffff,2.0);
  key.position.set(-3,5,5);scene.add(key);
  const plane=new THREE.PlaneGeometry(.76,1);
  for(const letter of new Set("nlb0sl")){
    const canvas=document.createElement("canvas");canvas.width=128;canvas.height=168;
    const ctx=canvas.getContext("2d");
    ctx.font="600 152px Arial, Helvetica, sans-serif";
    ctx.fillStyle="#ffffff";
    const metrics=ctx.measureText(letter);
    const y=(168+metrics.actualBoundingBoxAscent-metrics.actualBoundingBoxDescent)/2;
    ctx.textAlign="center";ctx.fillText(letter,64,y);
    const map=new THREE.CanvasTexture(canvas);
    map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    const material=new THREE.MeshLambertMaterial({color:0xd9dcd6,map,alphaTest:.28,side:THREE.FrontSide});
    const list=glyphs.filter(g=>g.letter===letter);
    const mesh=new THREE.InstancedMesh(plane,material,list.length);
    list.forEach((g,i)=>{
      const matrix=new THREE.Matrix4().makeBasis(new THREE.Vector3(...g.right),new THREE.Vector3(...g.up),new THREE.Vector3(...g.normal));
      matrix.scale(new THREE.Vector3(g.height,g.height,1));
      matrix.setPosition(...g.pos);mesh.setMatrixAt(i,matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();object.add(mesh);
  }
  // Center the actual Utah teapot mesh, including its asymmetric spout and handle.
  surface.computeBoundingBox();const center=surface.boundingBox.getCenter(new THREE.Vector3());
  for(const child of object.children)child.position.sub(center);
  let frame=0,lost=false;
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  const start=performance.now();
  function render(now){
    frame=0;if(lost||document.hidden)return;
    object.rotation.y=.28+(reduced.matches?0:(now-start)/1000*2*Math.PI/SETTINGS.rotationSeconds);
    renderer.render(scene,camera);
    renderer.domElement.hidden=false;
    if(!reduced.matches)frame=requestAnimationFrame(render);
  }
  function invalidate(){
    if(!frame&&!lost&&!document.hidden)frame=requestAnimationFrame(render);
  }
  function resize(){
    const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight),aspect=w/h;
    const half=Math.max(2.12,2.55/aspect);
    camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;
    camera.updateProjectionMatrix();renderer.setSize(w,h,false);invalidate();
  }
  new ResizeObserver(resize).observe(root);
  document.addEventListener("visibilitychange",()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else invalidate();});
  reduced.addEventListener("change",()=>invalidate());
  renderer.domElement.addEventListener("webglcontextlost",event=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;renderer.domElement.hidden=true;});
  renderer.domElement.addEventListener("webglcontextrestored",()=>{lost=false;invalidate();});
  resize();
}

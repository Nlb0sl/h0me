import {estimateVowels} from "../audio/vowels.js";
import {publish,reset} from "../audio/state.js";

const ORT="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";
const VAD="https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.31/dist/";
let library;
function script(src){
  return new Promise((resolve,reject)=>{
    const s=document.createElement("script");s.src=src;
    s.onload=resolve;s.onerror=()=>{s.remove();reject(new Error("音声ライブラリを読み込めません"));};
    document.head.append(s);
  });
}
function load(){
  if(!library)library=(async()=>{
    if(!window.ort)await script(ORT+"ort.wasm.min.js");
    window.ort.env.wasm.numThreads=1;
    if(!window.vad?.MicVAD)await script(VAD+"bundle.min.js");
    return window.vad.MicVAD;
  })().catch(e=>{library=null;throw e;});
  return library;
}
export function mount(root){
  const mic=root.querySelector("[data-mic]");
  const screen=root.querySelector("[data-screen]");
  const stopButton=root.querySelector("[data-stop]");
  const status=root.querySelector("[data-voice-status]");
  const test=root.querySelector("[data-test]");
  let stream, detector, generation=0, testTimer;
  function controls(busy,active){
    mic.disabled=screen.disabled=busy||active;
    stopButton.disabled=!busy&&!active;
    test.disabled=busy||active;
  }
  async function stop(message="OFF"){
    ++generation;
    clearInterval(testTimer);testTimer=null;
    const d=detector;detector=null;
    const s=stream;stream=null;
    s?.getTracks().forEach(t=>t.stop());
    reset();controls(false,false);status.textContent=message;
    if(d)try{await d.destroy();}catch(e){console.warn(e);}
  }
  async function start(mode){
    if(stream)return;
    clearInterval(testTimer);testTimer=null;reset();
    const id=++generation;
    controls(true,false);status.textContent="接続中…";
    try{
      // Capture must be initiated directly by a user gesture, before loading OSS.
      let selected;
      if(mode==="screen"){
        if(!navigator.mediaDevices?.getDisplayMedia)throw new Error("画面音声共有に非対応");
        selected=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true,systemAudio:"include"});
      }else{
        if(!navigator.mediaDevices?.getUserMedia)throw new Error("HTTPS または localhost が必要");
        selected=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,noiseSuppression:true,echoCancellation:true,autoGainControl:false}});
      }
      if(id!==generation){selected.getTracks().forEach(t=>t.stop());return;}
      stream=selected;
      if(!stream.getAudioTracks().length)throw new Error("共有音声がありません。音声共有を有効にしてください");
      for(const track of stream.getTracks())track.addEventListener("ended",()=>{if(id===generation)void stop("共有終了");},{once:true});
      const audioStream=new MediaStream(stream.getAudioTracks());
      const MicVAD=await load();
      if(id!==generation)return;
      const d=await MicVAD.new({
        model:"v5",startOnLoad:false,
        baseAssetPath:VAD,onnxWASMBasePath:ORT,
        getStream:async()=>audioStream,
        pauseStream:async()=>{},
        resumeStream:async()=>audioStream,
        onFrameProcessed:(prob,frame)=>{
          if(id!==generation)return;
          publish(estimateVowels(frame,prob.isSpeech));
        }
      });
      if(id!==generation){await d.destroy();return;}
      detector=d;await d.start();
      if(id!==generation)return;
      controls(false,true);status.textContent=mode==="screen"?"共有音声を解析中":"マイクを解析中";
    }catch(e){if(id===generation){console.error(e);await stop(e.message||"接続失敗");}}
  }
  mic.addEventListener("click",()=>void start("mic"));
  screen.addEventListener("click",()=>void start("screen"));
  stopButton.addEventListener("click",()=>void stop());
  test.addEventListener("click",()=>{
    if(testTimer){void stop();return;}
    let i=0;const tick=()=>{const w=[0,0,0,0,0];w[Math.floor(i/10)%5]=1;publish(w);status.textContent="TEST / "+"AIUEO"[Math.floor(i/10)%5];i++;};
    tick();testTimer=setInterval(tick,80);stopButton.disabled=false;
  });
  window.addEventListener("pagehide",()=>void stop(),{once:true});
}

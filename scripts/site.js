// The exhibit works without JavaScript; these controls are progressive enhancement.
const frame=document.querySelector("[data-artwork]");
const button=document.querySelector("[data-motion]");
if(frame&&button){
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  let paused=reduced.matches;
  function apply(){
    frame.dataset.paused=String(paused);
    button.setAttribute("aria-pressed",String(paused));
    button.textContent=paused?"再生":"停止";
  }
  button.hidden=false;
  button.addEventListener("click",()=>{paused=!paused;frame.dataset.override="true";apply();});
  reduced.addEventListener("change",e=>{paused=e.matches;delete frame.dataset.override;apply();});
  const light=frame.querySelector(".pointer-light");
  frame.addEventListener("pointermove",e=>{
    if(paused||reduced.matches||e.pointerType==="touch")return;
    const bounds=frame.getBoundingClientRect();
    light.style.transform="translateX("+((e.clientX-bounds.left)/bounds.width*480)+"px)";
  });
  frame.addEventListener("pointerleave",()=>{light.style.transform="translateX(-180px)";});
  apply();
}

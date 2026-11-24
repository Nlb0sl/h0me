// Shared scene coordinates and animation policy for both cloud renderers.
// A landscape scene is always composed at the same aspect ratio; CSS crops it.
export const SCENE = Object.freeze({
  width: 1920,
  height: 1080,
  renderWidth: 1440,
  renderHeight: 810,
});

export const cloudMode = new URLSearchParams(location.search).get("clouds");

export function setCloudRenderer(name) {
  document.documentElement.dataset.cloudRenderer = name;
  if (cloudMode === "raw") {
    document.title = name === "takram" ? "nlb0sl — Takram raw clouds" : "nlb0sl — Canvas fallback";
  }
}

// One animation policy: pause when hidden, render once for reduced motion,
// reset the time origin on resume, and detach listeners on disposal.
export function createFrameLoop(draw, isActive = () => true) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let last = null;
  let disposed = false;
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = null;
  }
  function tick(now) {
    frame = 0;
    if (disposed || document.hidden || !isActive()) return;
    const dt = last === null || reduced.matches ? 0 : Math.min((now - last) / 1000, .05);
    last = now;
    draw(dt);
    if (!disposed && !document.hidden && isActive() && !reduced.matches) {
      frame = requestAnimationFrame(tick);
    }
  }
  function restart() {
    stop();
    if (!disposed && !document.hidden && isActive()) frame = requestAnimationFrame(tick);
  }
  function dispose() {
    disposed = true;
    stop();
    document.removeEventListener("visibilitychange", restart);
    reduced.removeEventListener("change", restart);
  }
  document.addEventListener("visibilitychange", restart);
  reduced.addEventListener("change", restart);
  return { restart, dispose };
}

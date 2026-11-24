import { photos, autoplayMs } from "../data/photos.js";

export function mount(root) {
  if (!photos.length) return;
  const image = root.querySelector(".slideshow__image");
  const previous = root.querySelector(".slideshow__button--prev");
  const next = root.querySelector(".slideshow__button--next");
  const status = root.querySelector("[data-status]");
  let index = 0;
  let target = 0;
  let request = 0;
  let animation;
  let timer;
  let start;
  const wrap = n => (n % photos.length + photos.length) % photos.length;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function preload(n) {
    const img = new Image();
    img.src = photos[wrap(n)].src;
    return img;
  }

  async function show(n, animate = true) {
    target = wrap(n);
    const destination = target;
    const id = ++request;
    const photo = photos[destination];
    const pending = preload(destination);
    try {
      await pending.decode();
    } catch (error) {
      if (id === request) {
        target = index;
        status.textContent = "画像を読み込めませんでした";
        console.error("Cannot load photo:", photo.src, error);
      }
      return;
    }
    if (id !== request) return;

    animation?.cancel();
    image.src = pending.src;
    image.alt = photo.alt || "";
    index = destination;
    status.textContent = (index + 1) + " / " + photos.length;
    if (animate && !reducedMotion.matches) {
      animation = image.animate([{ opacity: .35 }, { opacity: 1 }], {
        duration: 350, easing: "ease-out"
      });
    }
    if (photos.length > 1) {
      preload(index + 1);
      preload(index - 1);
    }
  }

  function schedule() {
    clearInterval(timer);
    if (autoplayMs > 0 && photos.length > 1 && !reducedMotion.matches && !document.hidden) {
      timer = setInterval(() => show(target + 1), autoplayMs);
    }
  }

  function move(delta) {
    show(target + delta);
    schedule();
  }

  previous.hidden = next.hidden = photos.length < 2;
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  document.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        event.target.closest?.("input, textarea, select, [contenteditable]")) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
    }
  });
  root.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" || event.target.closest("button")) return;
    start = { x: event.clientX, y: event.clientY, id: event.pointerId };
    root.setPointerCapture(event.pointerId);
  });
  root.addEventListener("pointerup", event => {
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = undefined;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
  });
  root.addEventListener("pointercancel", () => { start = undefined; });
  document.addEventListener("visibilitychange", schedule);
  reducedMotion.addEventListener("change", schedule);
  show(0, false);
  schedule();
}

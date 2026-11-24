const components = {
  slideshow: () => import("./components/slideshow.js"),
  voice: () => import("./components/voice.js"),
  shader: () => import("./components/shader.js"),
};

for (const element of document.querySelectorAll("[data-component]")) {
  for (const name of element.dataset.component.trim().split(/\s+/)) {
    components[name]?.().then(({ mount }) => mount(element))
      .catch(error => console.error("Component failed:", name, error));
  }
}

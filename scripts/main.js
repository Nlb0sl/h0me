// Register optional UI modules here. Only modules used on a page are imported.
const components = {
  theme: () => import("./components/theme.js"),
};

for (const element of document.querySelectorAll("[data-component]")) {
  const names = element.dataset.component.trim().split(/\s+/);
  for (const name of names) {
    const load = components[name];
    if (!load) continue;
    load().then(({ mount }) => mount(element)).catch(error => {
      console.error("Component failed:", name, error);
    });
  }
}

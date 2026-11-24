// Example component: attach interactive behavior to existing static HTML.
export function mount(container) {
  const modes = ["system", "light", "dark"];
  let mode = "system";
  try {
    const saved = localStorage.getItem("h0me.theme");
    if (modes.includes(saved)) mode = saved;
  } catch { /* Storage may be unavailable. */ }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "theme-toggle";

  function render() {
    if (mode === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = mode;
    button.textContent = mode;
    button.setAttribute("aria-label", "テーマ: " + mode + "。クリックして変更");
  }

  button.addEventListener("click", () => {
    mode = modes[(modes.indexOf(mode) + 1) % modes.length];
    try { localStorage.setItem("h0me.theme", mode); } catch {}
    render();
  });

  render();
  container.append(button);
}

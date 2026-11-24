import { shaderConfig as config } from "../data/shader.js";

async function source(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Shader file: " + response.status + " " + url);
  return response.text();
}

function compile(gl, type, code) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, code);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

export async function mount(root) {
  if (!config.enabled) return;
  const canvas = root.querySelector(".shader-canvas");
  const image = root.querySelector(".slideshow__image");
  if (!canvas || !image) return;
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (!gl) return; // The original HTML image remains visible.

  const [vs, fs] = await Promise.all([source(config.vertex), source(config.fragment)]);
  const program = gl.createProgram();
  const vertex = compile(gl, gl.VERTEX_SHADER, vs);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fs);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const uniform = name => gl.getUniformLocation(program, name);
  const u = Object.fromEntries(["u_photo", "u_resolution", "u_photoResolution", "u_mouse", "u_time", "u_fit"].map(name => [name, uniform(name)]));

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.uniform1i(u.u_photo, 0);

  let ready = false;
  let stopped = false;
  let frame = 0;
  let photoWidth = 1, photoHeight = 1;
  let mouse = [0.5, 0.5];
  const start = performance.now();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  function invalidate() {
    if (!stopped && ready && !frame && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function draw(now) {
    frame = 0;
    if (stopped || !ready || document.hidden) return;
    const ratio = Math.min(devicePixelRatio || 1, config.maxPixelRatio);
    const width = Math.max(1, Math.round(root.clientWidth * ratio));
    const height = Math.max(1, Math.round(root.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.u_resolution, canvas.width, canvas.height);
    gl.uniform2f(u.u_photoResolution, photoWidth, photoHeight);
    gl.uniform2f(u.u_mouse, ...mouse);
    gl.uniform1f(u.u_time, reduced.matches ? 0 : (now - start) / 1000);
    gl.uniform1i(u.u_fit, getComputedStyle(image).objectFit === "contain" ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.hidden = false;
    if (config.animated && !reduced.matches) invalidate();
  }

  function uploadPhoto() {
    if (stopped || !image.complete || !image.naturalWidth) return;
    try {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // Downscale exceptionally large photos to the GPU texture limit.
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const scale = Math.min(1, max / image.naturalWidth, max / image.naturalHeight);
      let input = image;
      photoWidth = Math.max(1, Math.round(image.naturalWidth * scale));
      photoHeight = Math.max(1, Math.round(image.naturalHeight * scale));
      // Rasterize SVG placeholders and oversized images for consistent WebGL uploads.
      if (scale < 1 || /\.svg(?:[?#]|$)/i.test(image.currentSrc || image.src)) {
        input = document.createElement("canvas");
        input.width = photoWidth;
        input.height = photoHeight;
        input.getContext("2d").drawImage(image, 0, 0, photoWidth, photoHeight);
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, input);
      const error = gl.getError();
      if (error !== gl.NO_ERROR) throw new Error("WebGL texture error: " + error);
      ready = true;
      invalidate();
    } catch (error) {
      ready = false;
      canvas.hidden = true;
      console.error("Photo shader:", error);
    }
  }

  image.addEventListener("load", uploadPhoto);
  image.addEventListener("error", () => { ready = false; canvas.hidden = true; });
  const resize = new ResizeObserver(invalidate);
  resize.observe(root);
  root.addEventListener("pointermove", event => {
    const bounds = root.getBoundingClientRect();
    mouse = [(event.clientX - bounds.left) / bounds.width, 1 - (event.clientY - bounds.top) / bounds.height];
    invalidate();
  });
  document.addEventListener("visibilitychange", invalidate);
  reduced.addEventListener("change", invalidate);
  canvas.addEventListener("webglcontextlost", () => {
    stopped = true;
    cancelAnimationFrame(frame);
    canvas.hidden = true;
  });
  uploadPhoto();
}

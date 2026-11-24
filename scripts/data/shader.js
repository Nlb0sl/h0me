// Shader settings. No npm, framework or build step.
export const shaderConfig = {
  enabled: true,
  animated: true, // false: render on image/size/pointer changes only
  maxPixelRatio: 1.5,
  vertex: new URL("../../shaders/fullscreen.vert", import.meta.url),
  fragment: new URL("../../shaders/photo.frag", import.meta.url),
};

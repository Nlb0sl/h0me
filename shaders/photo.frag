#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_photo;
uniform vec2 u_resolution;       // canvas width / height in pixels
uniform vec2 u_photoResolution;  // source image width / height
uniform vec2 u_mouse;            // normalized, bottom-left origin
uniform float u_time;            // elapsed seconds
uniform int u_fit;               // 0: cover, 1: contain

vec2 photoUV(vec2 uv) {
    float screenAspect = u_resolution.x / u_resolution.y;
    float photoAspect = u_photoResolution.x / u_photoResolution.y;
    float ratio = screenAspect / photoAspect;
    vec2 scale = u_fit == 0
        ? vec2(min(1.0, ratio), min(1.0, 1.0 / ratio))
        : vec2(max(1.0, ratio), max(1.0, 1.0 / ratio));
    return (uv - 0.5) * scale + 0.5;
}

float random(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = photoUV(v_uv);
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) {
        fragColor = vec4(vec3(0.067), 1.0);
        return;
    }
    vec3 color = texture(u_photo, uv).rgb;

    // Example: gentle animated film grain.
    // Edit these lines freely, or remove them for a plain photo.
    float grain = random(gl_FragCoord.xy + floor(u_time * 12.0) * 19.0) - 0.5;
    color += grain * 0.035;

    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}

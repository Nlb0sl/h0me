#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

// nlb0sl / specimen 06
// A rotating zero, six orbiting signals, an impossible identification portrait.
const float PI = 3.14159265359;
const float TAU = 6.28318530718;

mat2 rotate(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, s, -s, c);
}
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float stroke(float d, float width, float aa) {
    return 1.0 - smoothstep(width, width + aa, abs(d));
}
float segment(vec2 p, vec2 a, vec2 b) {
    vec2 v = b - a;
    return length(p - a - v * clamp(dot(p - a, v) / dot(v, v), 0.0, 1.0));
}

// Five-by-seven bitmap alphabet. Each integer stores one row.
int glyphRow(int letter, int row) {
    const int n[7] = int[7](0,0,22,25,17,17,17);
    const int l[7] = int[7](12,4,4,4,4,4,14);
    const int b[7] = int[7](16,16,22,25,17,25,22);
    const int z[7] = int[7](14,17,19,21,25,17,14);
    const int s[7] = int[7](0,0,15,16,14,1,30);
    if (letter == 0) return n[row];
    if (letter == 1 || letter == 5) return l[row];
    if (letter == 2) return b[row];
    if (letter == 3) return z[row];
    return s[row];
}
float signature(vec2 p) {
    vec2 cell = floor(p);
    if (cell.x < 0.0 || cell.x >= 35.0 || cell.y < 0.0 || cell.y >= 7.0) return 0.0;
    int letter = int(cell.x) / 6;
    int column = int(cell.x) % 6;
    if (column >= 5) return 0.0;
    int row = 6 - int(cell.y);
    int bit = (glyphRow(letter, row) >> (4 - column)) & 1;
    return float(bit);
}

vec3 objectSpace(vec3 p, float t) {
    p.xz = rotate(t * 0.32 + (u_mouse.x - 0.5) * 0.9) * p.xz;
    p.yz = rotate(0.28 * sin(t * 0.43) + (u_mouse.y - 0.5) * 0.55) * p.yz;
    p.xy = rotate(0.16 * sin(t * 0.31)) * p.xy;
    return p;
}
float field(vec3 p, float t) {
    p = objectSpace(p, t);
    float a = atan(p.y, p.x);
    float radius = 0.53 + 0.065 * cos(a * 6.0 + t * 1.1);
    float tube = 0.115 + 0.042 * sin(a * 3.0 - t * 0.8);
    float r = length(p.xy * vec2(1.12, 0.88));
    float ring = length(vec2(r - radius, p.z + 0.085 * sin(a * 3.0 + t))) - tube;
    // A small detached, moving core visible through the zero.
    vec3 core = p - vec3(0.11 * sin(t * 0.7), 0.12 * cos(t * 0.53), 0.035);
    float bead = length(core) - 0.105;
    return min(ring, bead);
}
vec3 normalAt(vec3 p, float t) {
    vec2 e = vec2(0.002, 0.0);
    return normalize(vec3(field(p + e.xyy,t) - field(p - e.xyy,t),
                          field(p + e.yxy,t) - field(p - e.yxy,t),
                          field(p + e.yyx,t) - field(p - e.yyx,t)));
}
void main() {
    float t = u_time;
    float aa = 2.0 / max(u_resolution.y, 1.0);
    vec2 p = (v_uv - 0.5) * 2.0;
    p.x *= u_resolution.x / u_resolution.y;
    p.y -= 0.05;
    vec2 q = p * 1.43;

    // Paper / measurement field, not a real photograph.
    vec3 paper = vec3(0.88, 0.89, 0.85);
    vec3 ink = vec3(0.075, 0.10, 0.095);
    vec3 color = paper;
    vec2 grid = abs(fract(p * 13.0 + 0.5) - 0.5);
    float dots = 1.0 - smoothstep(0.025, 0.075, length(grid));
    color = mix(color, ink, dots * 0.21);

    float orbit = stroke(length(q * vec2(1.0, 0.85)) - 0.87, 0.0025, aa);
    color = mix(color, ink, orbit * 0.32);
    for (int i = 0; i < 6; ++i) {
        float a = float(i) * TAU / 6.0 + t * 0.19;
        vec2 satellite = vec2(cos(a), sin(a) / 0.85) * 0.87;
        float d = length(q - satellite);
        float mark = stroke(d - 0.028, 0.004, aa)
                   + (1.0 - smoothstep(0.009, 0.009 + aa, d));
        color = mix(color, ink, clamp(mark, 0.0, 1.0) * 0.8);
    }

    // Raymarch the impossible 0. Conservative steps for the warped SDF.
    vec3 ro = vec3(0.0, 0.0, 3.0);
    vec3 rd = normalize(vec3(q, -2.55));
    float travel = 0.0;
    bool hit = false;
    vec3 point = ro;
    for (int i = 0; i < 80; ++i) {
        point = ro + rd * travel;
        float d = field(point, t);
        if (d < 0.0018) { hit = true; break; }
        travel += max(d * 0.65, 0.001);
        if (travel > 5.0) break;
    }
    if (hit) {
        vec3 n = normalAt(point, t);
        float diffuse = max(dot(n, normalize(vec3(-0.6, 0.8, 0.9))), 0.0);
        float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
        vec3 obj = objectSpace(point, t);
        float bands = 0.5 + 0.5 * sin(obj.y * 54.0 + obj.x * 9.0 + t * 0.9);
        float luminance = clamp(0.12 + diffuse * 0.67 + rim * 0.22 - bands * 0.09, 0.0, 1.0);
        // Quantized, printed shading.
        float noise = hash(floor(gl_FragCoord.xy));
        luminance = floor(luminance * 5.0 + noise) / 5.0;
        color = mix(ink, paper, luminance);
    }

    // Scan marks, corner registration marks, and the actual six-letter name.
    vec2 f = v_uv;
    vec2 corner = abs(f - 0.5);
    float cornerX = stroke(corner.x - 0.445, 0.002, aa) * step(0.42, corner.y) * step(corner.y, 0.455);
    float cornerY = stroke(corner.y - 0.455, 0.002, aa) * step(0.40, corner.x) * step(corner.x, 0.445);
    color = mix(color, ink, clamp(cornerX + cornerY, 0.0, 1.0) * 0.7);
    float scanY = 0.5 + 0.32 * sin(t * 0.39);
    float scan = stroke(f.y - scanY, 0.001, aa) * step(0.07, f.x) * step(f.x, 0.93);
    color = mix(color, ink, scan * 0.16);

    vec2 textCell = vec2((f.x - 0.29) * 35.0 / 0.42, (f.y - 0.075) * 35.0 / 0.42 * u_resolution.y / u_resolution.x);
    color = mix(color, ink, signature(textCell));
    float grain = hash(floor(gl_FragCoord.xy) + floor(t * 8.0) * 7.0) - 0.5;
    color += grain * 0.055;
    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}

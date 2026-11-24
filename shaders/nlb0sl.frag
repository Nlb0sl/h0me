#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

// nlb0sl / specimen 06
// A single morphing specimen, six orbiting signals, an impossible identification portrait.
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

// One three-dimensional specimen, six sequential identities.
const float HOLD = 1.25;
const float MORPH = 2.15;
const float THICKNESS = .118;
const float WOBBLE = .095;
const int STEPS = 28;
vec3 nodes[STEPS + 1];
float radii[STEPS];

vec2 bezier(vec2 a, vec2 b, vec2 c, vec2 d, float t) {
    vec2 ab = mix(a,b,t);
    vec2 bc = mix(b,c,t);
    vec2 cd = mix(c,d,t);
    return mix(mix(ab,bc,t), mix(bc,cd,t), t);
}

vec2 glyph(int id, float u) {
    float x = clamp(u,0.0,1.0)*4.0;
    int k = min(int(x),3);
    float t = x-float(k);
    // n
    if (id == 0) {
        if(k==0) return bezier(vec2(-.30,-.45),vec2(-.30,-.22),vec2(-.30,.02),vec2(-.30,.24),t);
        if(k==1) return bezier(vec2(-.30,.24),vec2(-.24,.35),vec2(-.12,.39),vec2(0.,.35),t);
        if(k==2) return bezier(vec2(0.,.35),vec2(.22,.35),vec2(.30,.22),vec2(.30,.04),t);
        return bezier(vec2(.30,.04),vec2(.30,-.13),vec2(.30,-.29),vec2(.30,-.45),t);
    }
    // l: a tall stem and soft foot
    if (id == 1 || id == 5) {
        if(k==0) return bezier(vec2(-.10,.57),vec2(-.10,.42),vec2(-.10,.25),vec2(-.10,.11),t);
        if(k==1) return bezier(vec2(-.10,.11),vec2(-.10,-.04),vec2(-.10,-.19),vec2(-.10,-.27),t);
        if(k==2) return bezier(vec2(-.10,-.27),vec2(-.10,-.43),vec2(-.03,-.46),vec2(.10,-.46),t);
        return bezier(vec2(.10,-.46),vec2(.14,-.46),vec2(.19,-.45),vec2(.23,-.43),t);
    }
    // b: stem flows into the bowl, which joins the stem again
    if (id == 2) {
        if(k==0) return bezier(vec2(-.29,.57),vec2(-.29,.25),vec2(-.29,-.13),vec2(-.29,-.43),t);
        if(k==1) return bezier(vec2(-.29,-.43),vec2(-.02,-.55),vec2(.34,-.47),vec2(.34,-.12),t);
        if(k==2) return bezier(vec2(.34,-.12),vec2(.34,.14),vec2(.12,.30),vec2(-.08,.24),t);
        return bezier(vec2(-.08,.24),vec2(-.17,.21),vec2(-.24,.15),vec2(-.29,.08),t);
    }
    // 0: closed continuous oval
    if (id == 3) {
        if(k==0) return bezier(vec2(-.34,0.),vec2(-.34,.28),vec2(-.19,.49),vec2(0.,.49),t);
        if(k==1) return bezier(vec2(0.,.49),vec2(.19,.49),vec2(.34,.28),vec2(.34,0.),t);
        if(k==2) return bezier(vec2(.34,0.),vec2(.34,-.28),vec2(.19,-.49),vec2(0.,-.49),t);
        return bezier(vec2(0.,-.49),vec2(-.19,-.49),vec2(-.34,-.28),vec2(-.34,0.),t);
    }
    // s: two soft bends
    if(k==0) return bezier(vec2(.29,.29),vec2(.02,.48),vec2(-.34,.33),vec2(-.29,.13),t);
    if(k==1) return bezier(vec2(-.29,.13),vec2(-.26,-.02),vec2(-.04,.01),vec2(.13,-.08),t);
    if(k==2) return bezier(vec2(.13,-.08),vec2(.40,-.17),vec2(.34,-.40),vec2(.08,-.45),t);
    return bezier(vec2(.08,-.45),vec2(-.06,-.48),vec2(-.21,-.45),vec2(-.31,-.36),t);
}


void prepareMorph(float t) {
    float duration = HOLD + MORPH;
    float slot = mod(t, duration * 6.0);
    int from = int(floor(slot / duration));
    int to = (from + 1) % 6;
    float phase = clamp((mod(slot,duration) - HOLD) / MORPH, 0.0, 1.0);
    float blend = phase * phase * (3.0 - 2.0 * phase);
    float energy = sin(PI * blend);
    for (int i=0; i<=STEPS; ++i) {
        float u = float(i)/float(STEPS);
        vec2 xy = mix(glyph(from,u),glyph(to,u),blend) * 1.04;
        // Spatial waves keep closed loops joined. Surface motion is
        // intentionally subdued when a readable letter is held.
        vec2 original = xy;
        float wobble = .022 + WOBBLE * energy;
        xy += wobble * vec2(
            sin(original.y*9.0 + original.x*4.0 - t*1.8),
            cos(original.x*8.0 - original.y*5.0 + t*1.5));
        float z = (.047 + .09*energy)*sin(original.x*8.0 + original.y*7.0 + t*1.4);
        nodes[i] = vec3(xy,z);
    }
    for (int i=0; i<STEPS; ++i) {
        vec3 midpoint = (nodes[i]+nodes[i+1])*.5;
        radii[i] = THICKNESS + (.019+.018*energy)*sin(midpoint.x*10.0-midpoint.y*8.0-t*1.25);
    }
}

vec3 objectSpace(vec3 p, float t) {
    float duration=HOLD+MORPH;
    float phase=clamp((mod(t,duration)-HOLD)/MORPH,0.0,1.0);
    float energy=sin(PI*phase);
    // Face the camera while readable; turn in depth during metamorphosis.
    p.xz = rotate((.15+.80*energy)*sin(t*.72) + (u_mouse.x-.5)*.65) * p.xz;
    p.yz = rotate((.12+.38*energy)*sin(t*.51) + (u_mouse.y-.5)*.45) * p.yz;
    p.xy = rotate((.07+.21*energy)*sin(t*.63)) * p.xy;
    return p;
}
float field(vec3 p,float t) {
    p=objectSpace(p,t);
    // A union of rounded 3D capsules along one continuous changing path.
    // No separate letters or detached core.
    float d=10.0;
    for(int i=0;i<STEPS;++i) {
        vec3 a=nodes[i], b=nodes[i+1];
        vec3 v=b-a;
        float u=clamp(dot(p-a,v)/max(dot(v,v),.000001),0.0,1.0);
        d=min(d,length(p-a-v*u)-radii[i]);
    }
    return d;
}
vec3 normalAt(vec3 p, float t) {
    vec2 e = vec2(0.002, 0.0);
    return normalize(vec3(field(p + e.xyy,t) - field(p - e.xyy,t),
                          field(p + e.yxy,t) - field(p - e.yxy,t),
                          field(p + e.yyx,t) - field(p - e.yyx,t)));
}
void main() {
    float t = u_time;
    prepareMorph(t);
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

    // Raymarch the morphing specimen, clipped to a bounding sphere.
    vec3 ro = vec3(0.0, 0.0, 3.0);
    vec3 rd = normalize(vec3(q, -2.55));
    float b = dot(ro, rd);
    float h = b*b - dot(ro,ro) + 1.0;
    float travel = h >= 0.0 ? max(0.0, -b-sqrt(max(h,0.0))) : 6.0;
    float farLimit = h >= 0.0 ? -b+sqrt(max(h,0.0)) : 0.0;
    bool hit = false;
    vec3 point = ro;
    for (int i = 0; i < 64; ++i) {
        if (travel > farLimit) break;
        point = ro + rd * travel;
        float d = field(point, t);
        if (d < 0.0018) { hit = true; break; }
        travel += max(d * 0.85, 0.001);
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

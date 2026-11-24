#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

// Signed distances in local glyph coordinates.
float line(vec2 p, vec2 a, vec2 b) {
    vec2 v = b-a;
    return length(p-a-v*clamp(dot(p-a,v)/dot(v,v),0.0,1.0));
}
float ellipse(vec2 p, vec2 r) {
    return abs(length(p/r)-1.0)*min(r.x,r.y);
}
float arc(vec2 p, vec2 c, vec2 r, float side) {
    vec2 q = p-c;
    if (q.y*side >= 0.0) return ellipse(q,r);
    return min(length(q-vec2(-r.x,0.0)),length(q-vec2(r.x,0.0)));
}
float glyph(vec2 p, int id) {
    float d = 10.0;
    // n: stem, arch, second stem
    if(id==0) {
        d = min(line(p,vec2(-.29,-.42),vec2(-.29,.23)),
                line(p,vec2(.29,-.42),vec2(.29,.04)));
        d = min(d,arc(p,vec2(0.0,.04),vec2(.29,.25),1.0));
    // l: ascender with a curved foot
    } else if(id==1 || id==5) {
        d = line(p,vec2(-.08,.55),vec2(-.08,-.27));
        d = min(d,line(p,vec2(-.08,-.27),vec2(.02,-.42)));
        d = min(d,line(p,vec2(.02,-.42),vec2(.20,-.42)));
    // b: ascender and bowl
    } else if(id==2) {
        d = line(p,vec2(-.28,-.42),vec2(-.28,.55));
        d = min(d,ellipse(p-vec2(.02,-.08),vec2(.30,.34)));
    // 0: oval with slash
    } else if(id==3) {
        d = ellipse(p,vec2(.31,.44));
        d = min(d,line(p,vec2(-.13,-.18),vec2(.13,.18)));
    // s: smooth-ish double bowl, built from rounded strokes
    } else {
        d = line(p,vec2(.28,.25),vec2(.08,.31));
        d = min(d,line(p,vec2(.08,.31),vec2(-.21,.23)));
        d = min(d,line(p,vec2(-.21,.23),vec2(-.29,.09)));
        d = min(d,line(p,vec2(-.29,.09),vec2(-.17,-.03)));
        d = min(d,line(p,vec2(-.17,-.03),vec2(.18,-.12)));
        d = min(d,line(p,vec2(.18,-.12),vec2(.29,-.25)));
        d = min(d,line(p,vec2(.29,-.25),vec2(.15,-.40)));
        d = min(d,line(p,vec2(.15,-.40),vec2(-.12,-.43)));
        d = min(d,line(p,vec2(-.12,-.43),vec2(-.29,-.36)));
    }
    return d;
}
mat2 rotation(float a) {
    float c=cos(a), s=sin(a);
    return mat2(c,s,-s,c);
}
void main() {
    // Fit a three-column / two-row composition inside any canvas.
    float aspect = u_resolution.x/max(u_resolution.y,1.0);
    float unit = min(aspect/3.65, 1.0/2.9);
    vec2 p = (v_uv-.5)*vec2(aspect,1.0)/unit;
    float t = u_time;
    vec3 paper = vec3(.95,.95,.92);
    vec3 ink = vec3(.10,.12,.11);
    float mask = 0.0;
    for(int i=0;i<6;i++) {
        float f=float(i);
        vec2 center = vec2(float(i%3)-1.0, .69-float(i/3)*1.38);
        float phase = f*1.71;
        center += vec2(.035*sin(t*1.1+phase),.045*cos(t*1.4+phase));
        vec2 q = p-center;
        q = rotation(.13*sin(t*1.15+phase))*q;
        q /= vec2(1.0+.10*sin(t*1.4+phase),1.0+.12*cos(t*1.2+phase));
        // Smooth spatial warp: every part of each glyph moves differently.
        vec2 old=q;
        q.x += .105*sin(old.y*6.2+t*2.1+phase)
             + .035*sin(old.y*11.0-t*1.3+phase);
        q.y += .09*sin(old.x*7.0-t*1.7+phase)
             + .03*cos(old.y*9.0+t*1.1+phase);
        float thickness = .095+.024*sin(t*1.9+phase+q.y*5.0);
        float d = glyph(q,i)-thickness;
        float aa=max(fwidth(d),.002);
        mask=max(mask,1.0-smoothstep(-aa,aa,d));
    }
    vec3 color=mix(paper,ink,mask);
    fragColor=vec4(color,1.0);
}

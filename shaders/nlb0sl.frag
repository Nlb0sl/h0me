#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

// One continuous ink stroke. Four cubic Beziers per glyph.
// All glyphs share the same parameterization, so the stroke itself morphs.
const float HOLD = 1.05;
const float MORPH = 1.95;
const float THICKNESS = 0.105;
const float WOBBLE = 0.16;
const int STEPS = 48;
const float PI = 3.14159265359;

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

float segment(vec2 p,vec2 a,vec2 b) {
    vec2 v=b-a;
    return length(p-a-v*clamp(dot(p-a,v)/max(dot(v,v),0.000001),0.0,1.0));
}

vec2 strokePoint(int a,int b,float u,float blend,float energy,float time) {
    vec2 p=mix(glyph(a,u),glyph(b,u),blend);
    // A wave travels along the SAME stroke while it changes identity.
    // Spatial phase keeps the two ends of the closed zero joined.
    vec2 wave=vec2(
        sin(p.y*7.0+p.x*3.0-time*2.2),
        cos(p.x*7.0-p.y*3.0+time*1.7)
    );
    p += wave * (0.018 + WOBBLE*energy);
    return p;
}

void main() {
    float duration=HOLD+MORPH;
    float clock=mod(u_time,duration*6.0);
    int from=int(floor(clock/duration));
    int to=(from+1)%6;
    float phase=clamp((mod(clock,duration)-HOLD)/MORPH,0.0,1.0);
    float blend=phase*phase*(3.0-2.0*phase);
    float energy=sin(PI*blend);

    // Aspect-correct coordinates. The single object stays in the portrait.
    vec2 size=max(u_resolution,vec2(1.0));
    vec2 p=(v_uv-.5)*size/min(size.x,size.y)*1.70;
    p -= (u_mouse-.5)*0.025;
    float angle=.045*sin(u_time*1.2)+.14*energy*sin(u_time*1.5);
    float c=cos(angle),s=sin(angle);
    p=mat2(c,s,-s,c)*p;

    float d=10.0;
    vec2 previous=strokePoint(from,to,0.0,blend,energy,u_time);
    for(int i=1;i<=STEPS;i++) {
        float u=float(i)/float(STEPS);
        vec2 next=strokePoint(from,to,u,blend,energy,u_time);
        // Radius changes smoothly in space; the shape remains a joined stroke.
        float radius=THICKNESS + .025*energy*(.5+.5*sin(u*12.0-u_time*3.0));
        d=min(d,segment(p,previous,next)-radius);
        previous=next;
    }

    float aa=max(fwidth(d)*.8,.002);
    float mask=1.0-smoothstep(-aa,aa,d);
    vec3 paper=vec3(.95,.95,.92);
    vec3 ink=vec3(.10,.12,.11);
    fragColor=vec4(mix(paper,ink,mask),1.0);
}

#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

// nlb0sl / TYPE FIELD
// Repeated, rigid metal letterforms. Motion belongs to light and elevation.
const float WIDTH = .090;
const float BEVEL = .023;
const vec2 PITCH = vec2(1.0, 1.30);
const float PI = 3.14159265359;

float hash(vec2 p) {
    return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}
float line(vec2 p,vec2 a,vec2 b) {
    vec2 v=b-a;
    return length(p-a-v*clamp(dot(p-a,v)/dot(v,v),0.,1.));
}
float ellipse(vec2 p,vec2 r) {
    return abs(length(p/r)-1.)*min(r.x,r.y);
}
float glyph(vec2 p,int id) {
    float d=10.;
    if(id==0) {
        d=min(line(p,vec2(-.27,-.43),vec2(-.27,.23)),
              line(p,vec2(.27,-.43),vec2(.27,.04)));
        vec2 q=p-vec2(0.,.04);
        d=min(d,q.y>=0.?ellipse(q,vec2(.27,.24)):
              min(length(q-vec2(-.27,0.)),length(q-vec2(.27,0.))));
    } else if(id==1 || id==5) {
        d=line(p,vec2(-.07,.49),vec2(-.07,-.29));
        d=min(d,line(p,vec2(-.07,-.29),vec2(.015,-.42)));
        d=min(d,line(p,vec2(.015,-.42),vec2(.19,-.42)));
    } else if(id==2) {
        d=line(p,vec2(-.27,-.43),vec2(-.27,.49));
        d=min(d,ellipse(p-vec2(.015,-.10),vec2(.285,.33)));
    } else if(id==3) {
        d=ellipse(p-vec2(0.,.015),vec2(.28,.43));
        // Slashed zero, joined to the bowl.
        d=min(d,line(p,vec2(-.185,-.275),vec2(.185,.305)));
    } else {
        vec2 a=vec2(.25,.23), b=vec2(.055,.30), c=vec2(-.19,.22);
        vec2 e=vec2(-.25,.085), f=vec2(-.15,-.025), g=vec2(.16,-.12);
        vec2 h=vec2(.25,-.245), j=vec2(.13,-.395), k=vec2(-.10,-.43), l=vec2(-.26,-.35);
        d=min(line(p,a,b),line(p,b,c));
        d=min(d,min(line(p,c,e),line(p,e,f)));
        d=min(d,min(line(p,f,g),line(p,g,h)));
        d=min(d,min(line(p,h,j),line(p,j,k)));
        d=min(d,line(p,k,l));
    }
    return d-WIDTH;
}
float topHeight(vec2 cell,float t) {
    float wave=.5+.5*sin(cell.x*.69+cell.y*.83-t*.70);
    return .105+.28*pow(wave,3.);
}
float letterSDF(vec3 p,float t) {
    vec2 cell=floor(p.xy/PITCH+.5);
    vec2 local=p.xy-cell*PITCH;
    int id=int(mod(cell.x+3.,6.));
    float h=topHeight(cell,t);
    // Extruded lettering: fixed outlines, constant width, bevelled edges.
    vec2 d=vec2(glyph(local,id)+BEVEL,abs(p.z-h*.5)-(h*.5-BEVEL));
    return length(max(d,0.))+min(max(d.x,d.y),0.)-BEVEL;
}
float scene(vec3 p,float t) {
    return min(p.z,letterSDF(p,t));
}
vec3 normalAt(vec3 p,float t) {
    vec2 e=vec2(.003,0.);
    return normalize(vec3(scene(p+e.xyy,t)-scene(p-e.xyy,t),
                          scene(p+e.yxy,t)-scene(p-e.yxy,t),
                          scene(p+e.yyx,t)-scene(p-e.yyx,t)));
}
float shadow(vec3 p,vec3 direction,float t) {
    float s=.025, shade=1.;
    for(int i=0;i<32;i++) {
        vec3 q=p+direction*s;
        if(q.z>.45) break;
        float d=letterSDF(q,t);
        if(d<.003) return .17;
        shade=min(shade,12.*d/s);
        s+=clamp(d*.75,.012,.105);
        if(s>1.4) break;
    }
    return mix(.17,1.,clamp(shade,0.,1.));
}
void main() {
    float t=u_time;
    float aspect=u_resolution.x/max(u_resolution.y,1.);
    // Orthographic macro view. Crop the pattern at the edges like a print.
    vec2 screen=(v_uv-.5)*vec2(aspect,1.)*10.3;
    vec3 rd=normalize(vec3(-.21,.38,-1.));
    vec3 right=normalize(cross(rd,vec3(0.,1.,0.)));
    vec3 up=cross(right,rd);
    vec3 ro=vec3(.05,-.30,2.2)+right*screen.x+up*screen.y;
    ro.xy+=(u_mouse-.5)*.18;
    float travel=max(0.,(.44-ro.z)/rd.z);
    float end=max(0.,-ro.z/rd.z);
    vec3 point=ro+rd*end;
    bool hit=false;
    for(int i=0;i<72;i++) {
        if(travel>end) break;
        vec3 q=ro+rd*travel;
        float d=letterSDF(q,t);
        if(d<.003) {point=q;hit=true;break;}
        // Limit the step near repeating cell boundaries.
        travel+=clamp(d*.70,.002,.105);
    }
    vec3 n=hit?normalAt(point,t):vec3(0.,0.,1.);

    // Grazing studio key light, and a slow diagonal sweep across the field.
    float angle=.56+.24*sin(t*.19);
    vec3 light=normalize(vec3(-cos(angle),sin(angle),.58));
    float sweep=sin(point.x*.52+point.y*.38-t*.38);
    float spot=.22+.78*smoothstep(-.72,.78,sweep);
    float castShadow=shadow(point+n*.018,light,t);
    float diffuse=max(dot(n,light),0.);
    float gloss=pow(max(dot(n,normalize(light-rd)),0.),38.);
    float rim=pow(1.-max(dot(n,-rd),0.),3.);

    vec3 paper=vec3(.83,.84,.80);
    vec3 dark=vec3(.065,.080,.077);
    vec3 color;
    if(hit) {
        // Satin graphite / silver. No organic surface patterns.
        vec3 metal=mix(dark,vec3(.74,.77,.73),.26+.57*diffuse*castShadow*spot);
        color=metal+vec3(.28,.31,.30)*(gloss*spot*castShadow+.15*rim);
    } else {
        float base=.55+.38*spot;
        color=paper*base*mix(.53,1.,castShadow);
        // Very quiet grid printed beneath the type.
        vec2 cell=abs(fract(point.xy/PITCH)-.5);
        float grid=1.-smoothstep(.007,.018,min(.5-cell.x,.5-cell.y));
        color=mix(color,dark,grid*.045);
    }

    // Fine stochastic print texture, fixed in screen space (no flicker).
    float grain=hash(floor(gl_FragCoord.xy))-.5;
    color+=grain*.045;
    float vignette=1.-.20*dot(v_uv-.5,v_uv-.5);
    color*=vignette;
    fragColor=vec4(clamp(color,0.,1.),1.);
}

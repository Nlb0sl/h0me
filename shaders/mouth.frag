#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform float u_aiueo[5];

void main(){
    vec2 size=max(u_resolution,vec2(1.0));
    vec2 p=(v_uv-.5)*size/min(size.x,size.y);
    float a=u_aiueo[0], i=u_aiueo[1], u=u_aiueo[2], e=u_aiueo[3], o=u_aiueo[4];
    float total=clamp(a+i+u+e+o,0.,1.);
    // Morph dimensions of a single mouth: rest, A, I, U, E, O.
    float w=.245*(1.-total)+dot(vec4(a,i,u,e),vec4(.235,.31,.125,.28))+.155*o;
    float h=.012*(1.-total)+dot(vec4(a,i,u,e),vec4(.20,.055,.085,.105))+.17*o;
    vec2 q=p-vec2(0.,-.025);
    float aa=1./min(size.x,size.y);
    // Outer contour, tapered corners, and dark oral cavity.
    float x=q.x/w;
    float taper=sqrt(max(0.,1.-x*x));
    float upper=h*(.78+.22*cos(x*3.14159))*taper;
    float lower=h*1.10*taper;
    float d=max(abs(q.x)-w,max(q.y-upper,-q.y-lower));
    float mouth=1.-smoothstep(-aa,aa,d);
    vec3 paper=vec3(.93,.935,.91);
    vec3 ink=vec3(.075,.085,.09);
    vec3 color=mix(paper,ink,mouth);
    // A subtle upper-lip highlight stays inside the moving shape.
    float highlight=mouth*(1.-smoothstep(aa,aa*2.,abs(q.y-upper+.011)))*smoothstep(.12,.65,total);
    color=mix(color,vec3(.42,.44,.42),highlight*.45);
    fragColor=vec4(color,1.);
}

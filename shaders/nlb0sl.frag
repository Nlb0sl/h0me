#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

// nlb0sl / SILENT FIELD
// Six bundles of light, engraved into a dark photographic field.
const int GROUPS = 6;
const int LINES = 6;
const float SPEED = .36;
const float AMPLITUDE = .105;
float hash(vec2 p) {
    return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}
void main() {
    vec2 size = max(u_resolution,vec2(1.0));
    vec2 p = (v_uv-.5)*size/min(size.x,size.y);
    float t = u_time*SPEED;
    float aa = 0.8/min(size.x,size.y);
    vec3 bg = vec3(.065,.071,.075);
    vec3 color = bg + .025*exp(-4.0*dot(p,p));
    float ink = 0.0;
    for(int g=0;g<GROUPS;g++) {
        for(int j=0;j<LINES;j++) {
            float x0=(float(g)-2.5)*.119+(float(j)-2.5)*.016;
            float y=p.y+.21*x0;
            float envelope=exp(-7.0*y*y);
            float phase=t + x0*4.6;
            float x=x0+envelope*(AMPLITUDE*sin(y*7.4+phase)+.025*sin(y*13.0-phase*.6));
            float lengthY=.445+.035*cos(x0*6.0);
            float distanceToLine=abs(p.x-x)-.0015;
            float endMask=1.0-smoothstep(lengthY-aa,lengthY+aa,abs(y));
            float lineMask=(1.0-smoothstep(-aa,aa,distanceToLine))*endMask;
            float offsetY=y-.28*sin(t*.8+x0*4.0);
            float light=.48+.48*exp(-3.0*offsetY*offsetY);
            ink=max(ink,lineMask*light);
        }
    }
    color=mix(color,vec3(.92,.925,.89),ink);
    float grain=hash(floor(gl_FragCoord.xy))-.5;
    color+=grain*.023;
    fragColor=vec4(clamp(color,0.0,1.0),1.0);
}

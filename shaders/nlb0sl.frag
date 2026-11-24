#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_photo;
uniform vec2 u_resolution;
uniform vec2 u_photoResolution;
uniform float u_time;

// nlb0sl / SIGNAL TYPE
// Fixed, readable typography; only its optical texture moves.
const float SPEED = .35;
const float FREQUENCY = 24.0;
const float LINE_DEPTH = .48;

float hash(vec2 p) {
    return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}

void main() {
    vec2 size = max(u_resolution, vec2(1.0));
    vec2 p = (v_uv-.5)*size/min(size.x,size.y);
    float aspect = (size.x/size.y)/(u_photoResolution.x/u_photoResolution.y);
    vec2 uv = (v_uv-.5)*vec2(min(1.0,aspect),min(1.0,1.0/aspect))+.5;
    float mask = smoothstep(.083,.94,texture(u_photo,uv).r);
    float t = u_time*SPEED;

    // Optical lines flow through the type, never deforming its silhouette.
    float coordinate = p.x + .10*p.y
        + .055*sin(p.y*9.0 + t)
        + .020*sin(p.y*17.0 - t*.65);
    float stripe = coordinate*FREQUENCY;
    float dist = abs(fract(stripe+.5)-.5);
    float aa = max(fwidth(stripe)*.65,.001);
    float grooves = 1.0-smoothstep(.08-aa,.08+aa,dist);
    float light = .86+.14*cos(p.x*3.4-p.y*2.2-t*.8);

    vec3 background = vec3(.065,.071,.075);
    vec3 white = vec3(.91,.92,.89);
    vec3 typeColor = white*light*(1.0-LINE_DEPTH*grooves);
    vec3 color = mix(background,typeColor,mask);
    float grain = hash(floor(gl_FragCoord.xy))-.5;
    color += grain*.023;
    fragColor = vec4(clamp(color,0.0,1.0),1.0);
}

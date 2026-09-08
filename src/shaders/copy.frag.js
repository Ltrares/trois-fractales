// Simple texture copy shader

export const copyFragmentSrc = `#version 300 es
precision highp float;
layout(location = 0) out vec4 fragColor;
// Clears the fractal coverage mask. The fractal passes are scissored and
// discard freely, so anything they do not touch must already read as "no
// fractal here" for the text composite downstream.
layout(location = 1) out vec4 fragMask;
uniform sampler2D u_texture;
uniform vec2 u_resolution;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    fragColor = texture(u_texture, uv);
    fragMask = vec4(0.0);
}`;

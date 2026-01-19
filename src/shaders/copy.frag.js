// Simple texture copy shader

export const copyFragmentSrc = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform vec2 u_resolution;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    fragColor = texture(u_texture, uv);
}`;

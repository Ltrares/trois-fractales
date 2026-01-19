// Temporal anti-aliasing blend shader

export const taaFragmentSrc = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform sampler2D u_currentFrame;
uniform sampler2D u_history;
uniform vec2 u_resolution;
uniform float u_blendFactor; // How much history to keep (0.0 = none, 0.95 = lots)

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec3 current = texture(u_currentFrame, uv).rgb;
    vec3 history = texture(u_history, uv).rgb;
    vec3 result = mix(current, history, u_blendFactor);
    fragColor = vec4(result, 1.0);
}`;

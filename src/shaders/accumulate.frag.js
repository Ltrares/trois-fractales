// TEMPORAL SUPERSAMPLING (TSAA)
//
// Not TAA. There is no reprojection and no history rejection: pixel (x,y) is
// always blended with pixel (x,y) from the previous frame. What makes that
// legitimate is that the jitter is a sub-pixel SAMPLE offset inside a fixed
// fragment, not a camera shift -- so the pixel is the same pixel every frame
// and there is nothing to warp. Averaging N jittered samples over time gives N
// spatial samples per pixel, which is supersampling paid for in frames rather
// than in fill rate.
//
// The weight is a true running mean, 1/n, capped: 1/min(n, cap). Uncapped it
// would never forget and stale content would persist forever. Capped, history
// decays over ~cap frames on its own, so the accumulator is self-recovering and
// needs no hard reset on camera movement -- a move fades the stale image out
// instead of discarding it in one frame.
//
// The cap is driven from JS: high when parked (converge), short while moving
// (a brief ghost tail rather than a bare single sample).
export const accumulateFragmentSrc = `#version 300 es
precision highp float;

uniform sampler2D u_cur;    // this frame, jittered
uniform sampler2D u_hist;   // accumulated history
uniform vec2  u_resolution;
uniform float u_wAge;       // blend weight: 1/min(age, cap)
uniform int   u_reset;      // 1 = discard history (resize, first frame)

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec3 cur = texture(u_cur, uv).rgb;

    if (u_reset == 1) { fragColor = vec4(cur, 1.0); return; }

    // Same pixel, every time -- no reprojection, so no neighbourhood clamp
    // either. A clamp exists to reject history that reprojection dragged in
    // from elsewhere; an in-place fetch returns this pixel's own past, so
    // there is nothing foreign to reject.
    vec3 hist = texture(u_hist, uv).rgb;
    fragColor = vec4(mix(hist, cur, u_wAge), 1.0);
}`;

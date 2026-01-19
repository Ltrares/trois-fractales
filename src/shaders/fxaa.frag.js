// FXAA (Fast Approximate Anti-Aliasing) + Text Composite shader
// Based on FXAA 3.11 by Timothy Lottes (NVIDIA)
// Text is composited AFTER FXAA to keep it crisp

export const fxaaFragmentSrc = `#version 300 es
precision highp float;

out vec4 fragColor;

uniform sampler2D u_texture;
uniform sampler2D u_textLayer;  // Text layer for post-FXAA compositing
uniform vec2 u_resolution;

// FXAA quality settings
const float FXAA_REDUCE_MIN = 1.0 / 128.0;
const float FXAA_REDUCE_MUL = 1.0 / 8.0;
const float FXAA_SPAN_MAX = 8.0;

// Compute luminance from RGB
float luma(vec3 rgb) {
    return dot(rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 texelSize = 1.0 / u_resolution;

    // Sample center and 4 corners
    vec3 rgbNW = texture(u_texture, uv + vec2(-1.0, -1.0) * texelSize).rgb;
    vec3 rgbNE = texture(u_texture, uv + vec2( 1.0, -1.0) * texelSize).rgb;
    vec3 rgbSW = texture(u_texture, uv + vec2(-1.0,  1.0) * texelSize).rgb;
    vec3 rgbSE = texture(u_texture, uv + vec2( 1.0,  1.0) * texelSize).rgb;
    vec3 rgbM  = texture(u_texture, uv).rgb;

    // Convert to luminance
    float lumaNW = luma(rgbNW);
    float lumaNE = luma(rgbNE);
    float lumaSW = luma(rgbSW);
    float lumaSE = luma(rgbSE);
    float lumaM  = luma(rgbM);

    // Find min/max luma for local contrast
    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

    // Compute edge direction
    vec2 dir;
    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

    // Reduce direction based on overall luma
    float dirReduce = max(
        (lumaNW + lumaNE + lumaSW + lumaSE) * 0.25 * FXAA_REDUCE_MUL,
        FXAA_REDUCE_MIN
    );

    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);

    // Clamp direction to max span
    dir = clamp(dir * rcpDirMin, vec2(-FXAA_SPAN_MAX), vec2(FXAA_SPAN_MAX)) * texelSize;

    // Sample along edge direction
    vec3 rgbA = 0.5 * (
        texture(u_texture, uv + dir * (1.0/3.0 - 0.5)).rgb +
        texture(u_texture, uv + dir * (2.0/3.0 - 0.5)).rgb
    );

    vec3 rgbB = rgbA * 0.5 + 0.25 * (
        texture(u_texture, uv + dir * -0.5).rgb +
        texture(u_texture, uv + dir *  0.5).rgb
    );

    float lumaB = luma(rgbB);

    // Use rgbA if rgbB is outside local contrast range (prevents artifacts)
    vec3 fxaaResult;
    if (lumaB < lumaMin || lumaB > lumaMax) {
        fxaaResult = rgbA;
    } else {
        fxaaResult = rgbB;
    }

    // Composite text on top AFTER FXAA (keeps text crisp but not razor-sharp)
    vec4 text = texture(u_textLayer, uv);

    // Soften text alpha slightly to avoid overly harsh edges
    // This preserves the anti-aliasing from the texture while avoiding FXAA artifacts
    float softAlpha = text.a * 0.65;
    vec3 result = mix(fxaaResult, text.rgb, softAlpha);

    fragColor = vec4(result, 1.0);
}`;

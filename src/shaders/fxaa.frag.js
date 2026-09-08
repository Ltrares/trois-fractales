// FXAA (Fast Approximate Anti-Aliasing) + Text Composite shader
// Based on FXAA 3.11 by Timothy Lottes (NVIDIA)
// Text is composited AFTER FXAA to keep it crisp

export const fxaaFragmentSrc = `#version 300 es
precision highp float;

out vec4 fragColor;

uniform sampler2D u_texture;
uniform sampler2D u_textLayer;  // Text layer for post-FXAA compositing
// Where the fractal passes drew, red carries the fractal hit distance; 0 means
// no fractal. Paired with the gallery depth below it says whether a sculpture
// stands between the eye and the wall the glyph is painted on.
uniform sampler2D u_fractalMask;
uniform sampler2D u_galleryDepth;
uniform vec2 u_resolution;
// 0 bypasses the edge filter and passes the image through untouched, still
// compositing the text. For evaluating TSAA on its own: judging an accumulated
// image through FXAA measures the pair, not the accumulator.
uniform int u_fxaaOn;

// FXAA quality settings
const float FXAA_REDUCE_MIN = 1.0 / 128.0;
const float FXAA_REDUCE_MUL = 1.0 / 8.0;
const float FXAA_SPAN_MAX = 8.0;

// Compute luminance from RGB
float luma(vec3 rgb) {
    return dot(rgb, vec3(0.299, 0.587, 0.114));
}

// The text layer is produced by the gallery pass, before any fractal is
// marched, so it cannot know a sculpture will later cover those pixels.
// Recover the occlusion here: drop the glyph wherever a fractal was hit in
// front of the wall the text sits on.
float textVisibility(vec2 uv) {
    float fractalT = texture(u_fractalMask, uv).r;
    if (fractalT <= 0.0) return 1.0;              // no fractal at this pixel
    float wallT = texture(u_galleryDepth, uv).r;
    return fractalT < wallT ? 0.0 : 1.0;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 texelSize = 1.0 / u_resolution;

    if (u_fxaaOn == 0) {
        vec4 t = texture(u_textLayer, uv);
        vec3 r = mix(texture(u_texture, uv).rgb, t.rgb, t.a * textVisibility(uv));
        fragColor = vec4(r, 1.0);
        return;
    }

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

    // Composite text on top AFTER FXAA, so the filter never softens the glyphs.
    // Occlusion is recovered separately by textVisibility() -- running last costs
    // nothing in correctness, it just means depth has to be reapplied here.
    vec4 text = texture(u_textLayer, uv);

    // The alpha already carries the 0.9 blend weight from the gallery pass, and
    // the glyph texture supplies its own anti-aliased edges. Attenuating again
    // here would only make the text washed out, not smoother.
    vec3 result = mix(fxaaResult, text.rgb, text.a * textVisibility(uv));

    fragColor = vec4(result, 1.0);
}`;

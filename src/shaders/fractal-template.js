// Fractal shader template with placeholders

export const fractalShaderTemplate = `#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2 u_resolution;
uniform vec2 u_jitter;   // sub-pixel sample offset, in pixels (0,0 = centre)
uniform vec3 u_camPos;
uniform vec3 u_camDir;
uniform vec3 u_camRight;
uniform vec3 u_camUp;
uniform float u_zoom;
uniform sampler2D u_galleryColor;
uniform sampler2D u_galleryDepth;

// Fractal-specific uniforms
{{FRACTAL_UNIFORMS}}

const int MAX_STEPS = 60;
const float MIN_DIST = 0.002;
const float MAX_DIST = 100.0;

// Display position for this fractal
{{DISPLAY_POSITION}}

// Bounding box size
const vec3 BBOX_SIZE = vec3({{BBOX_SIZE}});
const float FRACTAL_SCALE = {{FRACTAL_SCALE}};

float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

// Half-angle subtended by one pixel, taken from the ray construction below:
// uv is normalised by u_resolution.y and the forward term is 1.5 * u_zoom, so a
// one-pixel step in uv turns the ray by 1/(res.y * 1.5 * zoom) radians. No FOV
// constant needed - the projection is fully described by the uniforms.
float pixelAngle() {
    return 1.0 / (u_resolution.y * 1.5 * u_zoom);
}

// Radius of the pixel's cone at ray distance t: the footprint the sample stands
// for. A surface detail finer than this cannot be resolved, so marching to a
// tighter epsilon than this resolves DE noise rather than visible geometry -
// which is what blinks as the camera moves.
float pixelFootprint(float t) {
    return t * pixelAngle();
}

// Ray-AABB intersection (returns tmin, tmax or -1 if no hit)
vec2 rayBoxIntersect(vec3 ro, vec3 rd, vec3 boxMin, vec3 boxMax) {
    vec3 invRd = 1.0 / rd;
    vec3 t0 = (boxMin - ro) * invRd;
    vec3 t1 = (boxMax - ro) * invRd;
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);
    float tNear = max(max(tmin.x, tmin.y), tmin.z);
    float tFar = min(min(tmax.x, tmax.y), tmax.z);
    if (tNear > tFar || tFar < 0.0) return vec2(-1.0);
    return vec2(max(tNear, 0.0), tFar);
}

// Fractal distance function (injected)
{{FRACTAL_DE}}

float sceneDE(vec3 p) {
    vec3 fp = (p - DISPLAY_POS) / FRACTAL_SCALE;
    float fd = fractalDE(fp) * FRACTAL_SCALE;
    float clip = sdBox(p - DISPLAY_POS, BBOX_SIZE);
    {{CLIP_MODIFIER}}
    return max(fd, clip);
}

vec3 calcNormal(vec3 p, float t) {
    // Tetrahedron technique - 4 samples, more symmetric than forward differences.
    // Sample width scales with ray distance: a fixed 0.001 offset is far finer
    // than a pixel at range, so it resolves DE noise rather than visible surface.
    // Signs stay unit so only the sample width changes, not the weighting.
    float k = {{NORMAL_EPSILON}};
    const vec2 s = vec2(1.0, -1.0);
    return normalize(
        s.xyy * sceneDE(p + s.xyy * k) +
        s.yyx * sceneDE(p + s.yyx * k) +
        s.yxy * sceneDE(p + s.yxy * k) +
        s.xxx * sceneDE(p + s.xxx * k)
    );
}

float calcAO(vec3 pos, vec3 nor) {
    float occ = 0.0;
    float sca = 1.0;
    for (int i = 0; i < 6; i++) {
        float h = 0.01 + 0.06 * float(i);
        float d = sceneDE(pos + nor * h);
        occ += (h - d) * sca;
        sca *= 0.65;
    }
    return clamp(1.0 - {{AO_STRENGTH}} * occ, 0.0, 1.0);
}

// Self-shadowing: trace ray toward spotlight
float calcSelfShadow(vec3 pos, vec3 lightPos) {
    vec3 rd = normalize(lightPos - pos);
    float maxDist = length(lightPos - pos);
    float t = 0.01;
    float res = 1.0;
    float k = 8.0;

    for (int i = 0; i < {{SHADOW_STEPS}}; i++) {
        vec3 p = pos + rd * t;
        float d = sceneDE(p);
        if (d < 0.001) return 0.0;
        res = min(res, k * d / t);
        t += d;
        if (t > maxDist) break;
    }
    return clamp(res, 0.0, 1.0);
}

void main() {
    // u_jitter offsets the SAMPLE POINT inside each pixel, in pixels. This is
    // the correct place for an accumulation jitter: the camera basis stays byte-identical
    // between frames, so history reprojection is exact. Tilting u_camDir
    // instead rotates the whole ray bundle, which shifts every pixel at every
    // depth by an amount the resolve cannot undo -- a uniform screen-space
    // shake that never converges.
    vec2 uv = (gl_FragCoord.xy + u_jitter - 0.5 * u_resolution) / u_resolution.y;
    vec2 screenUV = gl_FragCoord.xy / u_resolution;

    vec3 ro = u_camPos;
    vec3 rd = normalize(u_camDir * 1.5 * u_zoom + uv.x * u_camRight + uv.y * u_camUp);

    // Read gallery depth for early-out checks (decode from normalized 0-1 to 0-100)
    float galleryDepth = texture(u_galleryDepth, screenUV).r * 100.0;

    // Early-out: check if ray can hit fractal bounding box before gallery depth
    vec3 bboxMin = DISPLAY_POS - BBOX_SIZE;
    vec3 bboxMax = DISPLAY_POS + BBOX_SIZE;
    vec2 boxHit = rayBoxIntersect(ro, rd, bboxMin, bboxMax);

    if (boxHit.x < 0.0 || boxHit.x >= galleryDepth) {
        // Ray doesn't hit bbox, or bbox is behind gallery surface
        discard;
    }

    // Ray march the fractal, starting from bbox entry
    float t = boxHit.x;
    float tMax = min(boxHit.y, galleryDepth);
    bool hit = false;
    int stepsTaken = 0;
    float d = 0.0;
    {{RAY_MARCH_INIT}}

    for (int i = 0; i < MAX_STEPS; i++) {
        stepsTaken = i;
        vec3 p = ro + rd * t;
        d = sceneDE(p);
        {{RAY_MARCH_BOUNDARY_CHECK}}
        if (d < {{HIT_EPSILON}}) {
            {{RAY_MARCH_HIT_CHECK}}
            hit = true;
            break;
        }
        t += d;
        if (t > tMax) break;
    }

    // Near-miss check: if we got close but exhausted steps, treat as hit
    {{NEAR_MISS_CHECK}}

    // Debug write happens before the miss path, so misses report their step
    // count instead of discarding.
    {{DEBUG_FLAT}}

    if (!hit) {
        {{FOG_MISS}}
        discard;
    }

    // Shade the fractal
    vec3 pos = ro + rd * t;
    vec3 nor = calcNormal(pos, t);
    {{DEBUG_NORMALS}}

    vec3 lightDir = normalize(vec3(0.2, 1.0, 0.3));
    vec3 viewDir = -rd;

    {{DIFFUSE_CALC}}
    {{CALC_AO}}

    // Spotlight from below/side with self-shadowing (uplight)
    vec3 spotOffset = vec3({{SPOT_OFFSET}});
    vec3 spotPos = DISPLAY_POS + spotOffset;
    vec3 spotAim = normalize(DISPLAY_POS - spotPos);
    vec3 spotDir = normalize(pos - spotPos);
    float spotCone = max(dot(spotDir, spotAim), 0.0);
    float spotDist = length(pos - spotPos);
    spotCone = pow(spotCone, 6.0) / (1.0 + spotDist * 0.1);

    // Self-shadow toward spotlight
    {{SELF_SHADOW}}
    float spot = spotCone * {{SPOT_INTENSITY}} * selfShadow;

    // Refresh fractal state at hit point (AO/shadow calcs overwrite globals)
    {{REFRESH_DE}}

    // Optional discard for transparent interior (Julia only)
    {{FRACTAL_DISCARD}}

    // Color based on position (fractal-specific)
    float iterProxy = length(pos - DISPLAY_POS) / FRACTAL_SCALE;
    vec3 baseColor = {{FRACTAL_COLOR}};

    vec3 ambient = {{AMBIENT}} * ao;
    vec3 diffCol = baseColor * diff * 0.35;
    float spotNdotL = max(dot(nor, normalize(spotPos - pos)), 0.0);
    vec3 spotContrib = baseColor * spot * 0.8 * spotNdotL;
    vec3 col = ambient + diffCol + spotContrib;

    // Specular from spotlight
    vec3 halfDir = normalize(normalize(spotPos - pos) + viewDir);
    float spec = pow(max(dot(nor, halfDir), 0.0), {{SPEC_EXP}}) * {{SPEC_MULT}};
    col += vec3(0.06) * spec;
    col += vec3(1.0, 0.95, 0.85) * spot * spec * 0.25;

    {{FOG_BLEND}}

    col = pow(col, vec3(0.4545));
    fragColor = vec4(col, {{ALPHA_OUT}});
}`;

// Build fractal shaders from template
export function buildFractalShader(fractalDE, uniforms, displayPos, bboxSize, scale, colorExpr, spotOffset, specMult = '1.0', specExp = '32.0', shadowSteps = '32', opts = {}) {
    const selfShadowCode = opts.skipSelfShadow
        ? 'float selfShadow = 1.0; // self-shadow disabled'
        : 'float selfShadow = calcSelfShadow(pos + nor * 0.01, spotPos);';
    const aoCode = opts.skipAO
        ? 'float ao = 1.0; // AO disabled'
        : 'float ao = calcAO(pos, nor);';
    const aoStrength = opts.aoStrength || '3.5';
    const spotIntensity = opts.spotIntensity || '0.8';
    const ambient = opts.ambient || 'vec3(0.04)';
    const diffuseCalc = opts.wrapLighting
        ? 'float diff = dot(nor, lightDir) * 0.5 + 0.5; // wrap lighting'
        : 'float diff = max(dot(nor, lightDir), 0.0);';
    const refreshDE = opts.skipRefreshDE
        ? '// refresh skipped (no AO/shadow to overwrite globals)'
        : 'sceneDE(pos);';
    return fractalShaderTemplate
        .replace('{{FRACTAL_DE}}', fractalDE)
        .replace('{{FRACTAL_UNIFORMS}}', uniforms)
        .replace('{{DISPLAY_POSITION}}', `const vec3 DISPLAY_POS = vec3(${displayPos});`)
        .replace('{{BBOX_SIZE}}', bboxSize)
        .replace('{{FRACTAL_SCALE}}', scale)
        .replace('{{FRACTAL_COLOR}}', colorExpr)
        .replace('{{SPOT_OFFSET}}', spotOffset)
        .replace('{{SPEC_MULT}}', specMult)
        .replace('{{SPEC_EXP}}', specExp)
        .replace('{{SHADOW_STEPS}}', shadowSteps)
        .replace('{{SPOT_INTENSITY}}', spotIntensity)
        .replace('{{SELF_SHADOW}}', selfShadowCode)
        .replace('{{CALC_AO}}', aoCode)
        .replace('{{AO_STRENGTH}}', aoStrength)
        .replace('{{AMBIENT}}', ambient)
        .replace('{{DIFFUSE_CALC}}', diffuseCalc)
        .replace('{{HIT_EPSILON}}', opts.hitEpsilon || 'MIN_DIST')
        .replace('{{NORMAL_EPSILON}}', opts.normalEpsilon || '0.001')
        .replace('{{DEBUG_FLAT}}', opts.debugFlat
            ? `fragColor = vec4(hit ? 1.0 : 0.0, float(stepsTaken) / float(MAX_STEPS), 0.0, 1.0); return;`
            : '')
        .replace('{{DEBUG_NORMALS}}', opts.debugNormals
            ? `fragColor = vec4(nor * 0.5 + 0.5, ${opts.alphaOut || '1.0'}); return;`
            : '')
        .replace('{{REFRESH_DE}}', refreshDE)
        .replace('{{RAY_MARCH_INIT}}', opts.init || '')
        .replace('{{RAY_MARCH_BOUNDARY_CHECK}}', opts.boundaryCheck || '')
        .replace('{{RAY_MARCH_HIT_CHECK}}', opts.hitCheck || '')
        .replace('{{FRACTAL_DISCARD}}', opts.discardCheck || '')
        .replace('{{FOG_BLEND}}', opts.fogBlend || '')
        .replace('{{FOG_MISS}}', opts.fogMiss || '')
        .replace('{{CLIP_MODIFIER}}', opts.clipModifier || '')
        .replace('{{NEAR_MISS_CHECK}}', opts.nearMissCheck || '')
        // Alpha LAST. The opts blocks above (notably fogMiss) contain alpha
        // placeholders of their own, and they are only present in the source
        // once those blocks have been injected. Substituting alpha earlier
        // left {{ALPHA_MISS}} literal in the mandelbox fog path -- a GLSL
        // syntax error that stopped the shader compiling at all.
        //
        // Non-hit pixels (fog/miss): alphaMiss defaults to matching alphaOut,
        // but a consumer reading alpha as data wants a rejectable sentinel.
        .replace(/\{\{ALPHA_MISS\}\}/g,
            opts.alphaMiss || opts.alphaOut || '1.0')
        .replace(/\{\{ALPHA_OUT\}\}/g, opts.alphaOut || '1.0');
}

// Pre-built fractal shader sources
import { mandelboxDE } from './fractals/mandelbox-de.js';
import { mandelbulbDE } from './fractals/mandelbulb-de.js';
import { juliaDE } from './fractals/julia-de.js';
import { glslFloat, FRACTALS } from '../geometry/GalleryGeometry.js';

// Helper to format array for GLSL
function toGLSL(arr) {
    return arr.map(v => v.toFixed(1)).join(', ');
}

// Surface epsilon that grows with the pixel's cone footprint at range t.
// coneK is in pixel footprints; 0 (or absent) keeps the fixed MIN_DIST.
function coneEpsilon(coneK) {
    if (!coneK) return 'MIN_DIST';
    return `max(MIN_DIST, ${glslFloat(coneK)} * t / (u_resolution.y * 1.5 * u_zoom))`;
}

const mbx = FRACTALS.mandelbox;
export const mandelboxShaderSrc = buildFractalShader(
    mandelboxDE, '',
    toGLSL(mbx.position),
    toGLSL(mbx.bboxHalf),
    glslFloat(mbx.scale),
    'mix(vec3(0.25, 0.2, 0.2), vec3(0.89, 0.89, 0.90), iterProxy)',
    toGLSL(mbx.spotlightOffset),
    '0.23',  // specMult - reduced specular
    '32.0',
    '20',
    {
        skipSelfShadow: false,
        skipAO: true,
        // Cone-traced hit threshold: widen the surface epsilon with distance so
        // a sample stands for the pixel footprint it actually covers.
        //
        // A fixed MIN_DIST resolves detail finer than a pixel can display, so
        // whether a given micro-feature falls inside the epsilon flips as the
        // camera moves and the pixel blinks - the distance sparkle. The pixel's
        // half-angle comes from the ray construction below: uv is normalised by
        // u_resolution.y and the forward term is 1.5 * u_zoom, so one pixel
        // subtends 1/(res.y * 1.5 * zoom) radians, and its footprint at range t
        // is t times that. RENDER_QUALITY scales u_resolution, so this follows
        // the actual pixel size rather than a fixed assumption.
        //
        // max() keeps MIN_DIST near the sculpture, where a pixel is finer than
        // 0.002 world units, so close-up detail is unchanged. The crossover at
        // 1080p is around 3 units; the gallery viewing distance is about 7.
        hitEpsilon: coneEpsilon(mbx.coneK),
        fogMiss: `// Fog: blend toward surface gray for rays that got lost
        float fogAmount = float(stepsTaken) / float(MAX_STEPS);
        fogAmount = smoothstep(0.7, 1.0, fogAmount);

        // Only render fog if there's significant fog to show
        if (fogAmount > 0.01) {
            // Cheap spotlight interaction - brighten fog in light cone
            vec3 fogPos = ro + rd * t;
            vec3 spotPos = DISPLAY_POS + vec3(${toGLSL(mbx.spotlightOffset)});
            vec3 spotAim = normalize(DISPLAY_POS - spotPos);
            vec3 toFog = normalize(fogPos - spotPos);
            float spotCone = pow(max(dot(toFog, spotAim), 0.0), 6.0);
            float spotDist = length(fogPos - spotPos);
            float spotLight = spotCone / (1.0 + spotDist * 0.1);

            vec3 fogColor = vec3(0.21, 0.22, 0.23) + vec3(0.2, 0.19, 0.21) * spotLight;
            vec4 gallery = texture(u_galleryColor, screenUV);
            gallery.rgb = mix(gallery.rgb, fogColor, fogAmount * 0.65);
            // Alpha must follow the shader's alphaOut, not the gallery texture's own
            // alpha. A consumer that reads alpha as data (the accumulator reads it as ray
            // distance) would otherwise get the gallery's 1.0 here and
            // reconstruct a world position ~1 unit from the eye instead of at
            // the real surface -- a history fetch that swings ~0.8px every
            // frame with the camera parked.
            fragColor = vec4(gallery.rgb, {{ALPHA_MISS}});
            return;
        }`
    }
);

const mbl = FRACTALS.mandelbulb;
export const mandelbulbShaderSrc = buildFractalShader(
    mandelbulbDE, '',
    toGLSL(mbl.position),
    toGLSL(mbl.bboxHalf),
    glslFloat(mbl.scale),
    'mix(vec3(0.02, 0.1, 0.02), vec3(0.3, 0.7, 0.2), 0.5 + 0.5 * cos(6.28 * g_bulbIter))',
    toGLSL(mbl.spotlightOffset),
    '1.0',   // specMult
    '32.0',  // specExp
    '32',    // more shadow steps for mandelbulb
    {
        skipSelfShadow: false,
        skipAO: false,
        nearMissCheck: `if (!hit && d < 0.02) {
        hit = true;  // Close enough - treat as surface hit
    }`
    }
);

const jul = FRACTALS.julia;
// Julia uses smaller bbox for cross-section display
export const juliaShaderSrc = buildFractalShader(
    juliaDE, '',
    toGLSL(jul.position),
    '0.8, 0.8, 0.8',  // smaller bbox for cross-sections
    glslFloat(jul.scale),
    '0.5 + 0.5 * cos(3.14 * (g_juliaIter + vec3(0.23, 0.53, 0.87)))',  // cosine palette
    toGLSL(jul.spotlightOffset),
    '0.27',   // specMult - reduced for less shiny look
    '12.0',  // specExp - broader, softer highlights
    '10',    // shadow steps (unused when skipSelfShadow)
    { skipSelfShadow: true, skipAO: true, skipRefreshDE: true, aoStrength: '0.3', spotIntensity: '0.1', ambient: 'vec3(0.0133)', wrapLighting: true }
);

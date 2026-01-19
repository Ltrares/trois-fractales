// Fractal shader template with placeholders

export const fractalShaderTemplate = `#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2 u_resolution;
uniform vec3 u_camPos;
uniform vec3 u_camDir;
uniform vec3 u_camRight;
uniform vec3 u_camUp;
uniform float u_zoom;
uniform vec2 u_jitter;
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
    return max(fd, clip);
}

vec3 calcNormal(vec3 p) {
    // Tetrahedron technique - 4 samples, more symmetric than forward differences
    const vec2 e = vec2(0.001, -0.001);
    return normalize(
        e.xyy * sceneDE(p + e.xyy) +
        e.yyx * sceneDE(p + e.yyx) +
        e.yxy * sceneDE(p + e.yxy) +
        e.xxx * sceneDE(p + e.xxx)
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
    // Apply sub-pixel jitter for TAA temporal supersampling
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
        fragColor = texture(u_galleryColor, screenUV);
        return;
    }

    // Ray march the fractal, starting from bbox entry
    float t = boxHit.x;
    float tMax = min(boxHit.y, galleryDepth);
    bool hit = false;
    int stepsTaken = 0;
    {{RAY_MARCH_INIT}}

    for (int i = 0; i < MAX_STEPS; i++) {
        stepsTaken = i;
        vec3 p = ro + rd * t;
        float d = sceneDE(p);
        {{RAY_MARCH_BOUNDARY_CHECK}}
        if (d < MIN_DIST) {
            {{RAY_MARCH_HIT_CHECK}}
            hit = true;
            break;
        }
        t += d;
        if (t > tMax) break;
    }

    if (!hit) {
        vec4 gallery = texture(u_galleryColor, screenUV);
        {{FOG_MISS}}
        fragColor = gallery;
        return;
    }

    // Shade the fractal
    vec3 pos = ro + rd * t;
    vec3 nor = calcNormal(pos);

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
    fragColor = vec4(col, 1.0);
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
        .replace('{{REFRESH_DE}}', refreshDE)
        .replace('{{RAY_MARCH_INIT}}', opts.init || '')
        .replace('{{RAY_MARCH_BOUNDARY_CHECK}}', opts.boundaryCheck || '')
        .replace('{{RAY_MARCH_HIT_CHECK}}', opts.hitCheck || '')
        .replace('{{FRACTAL_DISCARD}}', opts.discardCheck || '')
        .replace('{{FOG_BLEND}}', opts.fogBlend || '')
        .replace('{{FOG_MISS}}', opts.fogMiss || '');
}

// Pre-built fractal shader sources
import { mandelboxDE } from './fractals/mandelbox-de.js';
import { mandelbulbDE } from './fractals/mandelbulb-de.js';
import { juliaDE } from './fractals/julia-de.js';
import { FRACTALS } from '../geometry/GalleryGeometry.js';

// Helper to format array for GLSL
function toGLSL(arr) {
    return arr.map(v => v.toFixed(1)).join(', ');
}

const mbx = FRACTALS.mandelbox;
export const mandelboxShaderSrc = buildFractalShader(
    mandelboxDE, '',
    toGLSL(mbx.position),
    toGLSL(mbx.bboxHalf),
    mbx.scale.toFixed(1),
    'mix(vec3(0.25, 0.2, 0.2), vec3(0.89, 0.89, 0.90), iterProxy)',
    toGLSL(mbx.spotlightOffset),
    '0.23',  // specMult - reduced specular
    '32.0',
    '20',
    {
        skipSelfShadow: false,
        skipAO: true,
        fogMiss: `// Fog: blend toward surface gray for rays that got lost
        float fogAmount = float(stepsTaken) / float(MAX_STEPS);
        fogAmount = smoothstep(0.7, 1.0, fogAmount);

        // Cheap spotlight interaction - brighten fog in light cone
        vec3 fogPos = ro + rd * t;
        vec3 spotPos = DISPLAY_POS + vec3(${toGLSL(mbx.spotlightOffset)});
        vec3 spotAim = normalize(DISPLAY_POS - spotPos);
        vec3 toFog = normalize(fogPos - spotPos);
        float spotCone = pow(max(dot(toFog, spotAim), 0.0), 6.0);
        float spotDist = length(fogPos - spotPos);
        float spotLight = spotCone / (1.0 + spotDist * 0.1);

        vec3 fogColor = vec3(0.21, 0.22, 0.23) + vec3(0.2, 0.19, 0.21) * spotLight;
        gallery.rgb = mix(gallery.rgb, fogColor, fogAmount * 0.65);`
    }
);

const mbl = FRACTALS.mandelbulb;
export const mandelbulbShaderSrc = buildFractalShader(
    mandelbulbDE, '',
    toGLSL(mbl.position),
    toGLSL(mbl.bboxHalf),
    mbl.scale.toFixed(1),
    'mix(vec3(0.08, 0.22, 0.06), vec3(0.28, 0.48, 0.18), iterProxy) + 0.05 * cos(pos * 10.0 + vec3(0.3, 0.0, 0.6))',
    toGLSL(mbl.spotlightOffset),
    '1.0',   // specMult
    '32.0',  // specExp
    '32',    // more shadow steps for mandelbulb
    { skipSelfShadowskipAO: false }
);

const jul = FRACTALS.julia;
// Julia uses smaller bbox for cross-section display
export const juliaShaderSrc = buildFractalShader(
    juliaDE, '',
    toGLSL(jul.position),
    '0.8, 0.8, 0.8',  // smaller bbox for cross-sections
    jul.scale.toFixed(1),
    '0.5 + 0.5 * cos(3.14 * (g_juliaIter + vec3(0.23, 0.53, 0.87)))',  // cosine palette
    toGLSL(jul.spotlightOffset),
    '0.27',   // specMult - reduced for less shiny look
    '12.0',  // specExp - broader, softer highlights
    '10',    // shadow steps (unused when skipSelfShadow)
    { skipSelfShadow: true, skipAO: true, skipRefreshDE: true, aoStrength: '0.3', spotIntensity: '0.1', ambient: 'vec3(0.0133)', wrapLighting: true }
);

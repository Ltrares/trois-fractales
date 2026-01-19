console.log('[init] gallery.frag.js executing...');
// Gallery-only shader (Pass 1)
// Outputs: color to attachment 0, ray distance to attachment 1

import {
    FRACTALS,
    FRACTAL_SPOTLIGHTS,
    WALLS,
    PEDESTALS,
    CEILING_LIGHTS,
    WALL_SPOTLIGHTS,
    FLOOR_Y,
    CEILING_Y,
    GALLERY_REGIONS,
    SHADOW_SURFACES,
    MATERIALS,
    MATERIAL_IDS,
    PEEPHOLE,
    // SLIDE_PROJECTION,  // Slideshow disabled
} from '../geometry/GalleryGeometry.js';

import { allHelpers, allShadowDEs } from './fractals/fractal-des.js';

// Helper to format vec3 for GLSL (use 2 decimals to avoid rounding errors like 0.04 -> 0.0)
function vec3(arr) {
    return `vec3(${arr.map(v => v.toFixed(2)).join(', ')})`;
}

// Generate fractal constants
function generateFractalConstants() {
    const lines = [];
    lines.push('// Fractal display positions');
    for (const [name, f] of Object.entries(FRACTALS)) {
        const upper = name.toUpperCase();
        lines.push(`const vec3 DISPLAY_${upper} = ${vec3(f.position)};`);
    }
    lines.push('');
    lines.push('// Fractal bounding boxes and scales');
    for (const [name, f] of Object.entries(FRACTALS)) {
        const upper = name.toUpperCase();
        const bbox = f.bboxHalf;
        if (bbox[0] === bbox[1] && bbox[1] === bbox[2]) {
            lines.push(`const vec3 ${upper}_BBOX = vec3(${bbox[0].toFixed(1)});`);
        } else {
            lines.push(`const vec3 ${upper}_BBOX = ${vec3(bbox)};`);
        }
        lines.push(`const float ${upper}_SCALE = ${f.scale.toFixed(1)};`);
    }
    return lines.join('\n');
}

// Generate ceiling light constants
function generateCeilingLightConstants() {
    const lines = [];
    lines.push('// Ceiling lights');
    const lights = Object.values(CEILING_LIGHTS);
    for (let i = 0; i < lights.length; i++) {
        lines.push(`const vec3 CEILING_LIGHT_${i + 1} = ${vec3(lights[i].position)};`);
    }
    lines.push(`const int NUM_CEILING_LIGHTS = ${lights.length};`);
    lines.push('const float CEILING_DISC_RADIUS = 0.13;');
    lines.push('const vec3 CEILING_DISC_COLOR = vec3(1.0, 0.9, 0.7);');
    return lines.join('\n');
}

// Generate spotlight marker sphere constants
function generateSpotlightSphereConstants() {
    const lines = [];
    lines.push('// Fractal spotlight marker spheres');
    lines.push('const float SPOTLIGHT_SPHERE_RADIUS = 0.06;');
    const names = Object.keys(FRACTAL_SPOTLIGHTS);
    for (let i = 0; i < names.length; i++) {
        const pos = FRACTAL_SPOTLIGHTS[names[i]];
        lines.push(`const vec3 SPOTLIGHT_${names[i].toUpperCase()} = ${vec3(pos)};`);
    }
    return lines.join('\n');
}

// Generate isInGallery function
function generateIsInGallery() {
    const lines = [];
    lines.push('bool isInGallery(float x, float z) {');
    for (const [, region] of Object.entries(GALLERY_REGIONS)) {
        lines.push(`    if (x >= ${region.minX.toFixed(1)} && x <= ${region.maxX.toFixed(1)} && z >= ${region.minZ.toFixed(1)} && z <= ${region.maxZ.toFixed(1)}) return true;`);
    }
    lines.push('    return false;');
    lines.push('}');
    return lines.join('\n');
}

// Generate wall tracing code for traceGallery
function generateWallTracing() {
    const lines = [];
    for (const [name, wall] of Object.entries(WALLS)) {
        lines.push(`    // ${name}`);
        lines.push(`    d = rayBox(ro, rd, ${vec3(wall.center)}, ${vec3(wall.halfExtents)}, n);`);
        lines.push(`    if (d > 0.0 && d < t) { t = d; matId = ${wall.materialId}; shadowId = ${wall.shadowId}; normal = n; }`);
    }
    lines.push('');
    lines.push('    // Pedestals (shadowId -1 means "pedestal" - handled specially)');
    for (const [, ped] of Object.entries(PEDESTALS)) {
        lines.push(`    d = rayBox(ro, rd, ${vec3(ped.center)}, ${vec3(ped.halfExtents)}, n);`);
        lines.push(`    if (d > 0.0 && d < t) { t = d; matId = 0; shadowId = -1; normal = n; }`);
    }
    return lines.join('\n');
}

// Generate galleryDE function
function generateGalleryDE() {
    const lines = [];
    lines.push('float galleryDE(vec3 p, out int matId) {');
    lines.push('    float d = MAX_DIST;');
    lines.push('    matId = 0;');
    lines.push('');
    lines.push(`    float floorDist = p.y - ${FLOOR_Y.toFixed(1)};`);
    lines.push('    if (floorDist < d) { d = floorDist; matId = 1; }');
    lines.push('');
    lines.push(`    float ceilDist = ${CEILING_Y.toFixed(1)} - p.y;`);
    lines.push('    if (ceilDist < d) { d = ceilDist; matId = 0; }');
    lines.push('');

    for (const [name, wall] of Object.entries(WALLS)) {
        const varName = name.replace(/([A-Z])/g, '_$1').toLowerCase();
        lines.push(`    float ${varName} = sdBox(p - ${vec3(wall.center)}, ${vec3(wall.halfExtents)});`);
        lines.push(`    if (${varName} < d) { d = ${varName}; matId = ${wall.materialId}; }`);
    }
    lines.push('');

    const pedNames = ['ped1', 'ped2', 'ped3'];
    let i = 0;
    for (const [, ped] of Object.entries(PEDESTALS)) {
        lines.push(`    float ${pedNames[i]} = sdBox(p - ${vec3(ped.center)}, ${vec3(ped.halfExtents)});`);
        lines.push(`    if (${pedNames[i]} < d) { d = ${pedNames[i]}; matId = 0; }`);
        i++;
    }
    lines.push('');
    lines.push('    return d;');
    lines.push('}');
    return lines.join('\n');
}

// Generate wall spotlight code
function generateWallSpotlights() {
    const spots = Object.values(WALL_SPOTLIGHTS);
    const lines = [];

    for (let i = 0; i < spots.length; i++) {
        const num = i + 1;
        const spot = spots[i];
        lines.push(`        vec3 wallSpot${num}Pos = ${vec3(spot.position)};`);
        lines.push(`        vec3 wallSpot${num}Target = ${vec3(spot.target)};`);
        lines.push(`        vec3 toWallLight${num} = normalize(wallSpot${num}Pos - pos);`);
        lines.push(`        float wallSpot${num}Diff = max(dot(nor, toWallLight${num}), 0.0);`);
        lines.push(`        vec3 wallSpot${num}Aim = normalize(wallSpot${num}Target - wallSpot${num}Pos);`);
        lines.push(`        vec3 wallSpot${num}Dir = normalize(pos - wallSpot${num}Pos);`);
        lines.push(`        float wallSpot${num}Cone = max(dot(wallSpot${num}Dir, wallSpot${num}Aim), 0.0);`);
        lines.push(`        float wallSpot${num}Dist = length(pos - wallSpot${num}Pos);`);
        const falloff = i === 2 ? '4.0' : '6.0';
        const attenuation = i === 2 ? '0.06' : '0.05';
        const intensity = i === 2 ? '0.6' : '0.8';
        lines.push(`        wallSpot${num}Cone = pow(wallSpot${num}Cone, ${falloff}) / (1.0 + wallSpot${num}Dist * ${attenuation});`);
        lines.push(`        wallSpot += wallSpot${num}Cone * wallSpot${num}Diff * ${intensity};`);
        if (i < spots.length - 1) lines.push('');
    }
    return lines.join('\n');
}

// Generate ceiling light code
function generateCeilingLightCode() {
    const lights = Object.values(CEILING_LIGHTS);
    const lines = [];

    for (let i = 0; i < lights.length; i++) {
        const num = i + 1;
        const name = `CEILING_LIGHT_${num}`;
        const light = lights[i];
        const aim = light.aimDir;
        lines.push(`        // Ceiling light ${num}`);
        lines.push(`        vec3 toLight${num} = normalize(${name} - pos);`);
        lines.push(`        float ceil${num}Diff = max(dot(nor, toLight${num}), 0.0);`);
        lines.push(`        vec3 ceilLight${num}Aim = normalize(${vec3(aim)});`);
        lines.push(`        vec3 ceilLight${num}Dir = normalize(pos - ${name});`);
        lines.push(`        float ceil${num}Cone = max(dot(ceilLight${num}Dir, ceilLight${num}Aim), 0.0);`);
        lines.push(`        float ceil${num}Dist = length(pos - ${name});`);
        lines.push(`        ceil${num}Cone = pow(ceil${num}Cone, 12.0) / (1.0 + ceil${num}Dist * 0.1);`);
        lines.push(`        ceilingSpot += ceil${num}Cone * ceil${num}Diff * bakedShadow;`);
        if (i < lights.length - 1) lines.push('');
    }
    return lines.join('\n');
}

// Generate fractal spotlight code
function generateFractalSpotlights() {
    const fractals = Object.entries(FRACTALS);
    const lines = [];

    for (let i = 0; i < fractals.length; i++) {
        const [name, f] = fractals[i];
        const upper = name.toUpperCase();
        const num = i + 1;
        const offset = vec3(f.spotlightOffset);

        lines.push(`        // Spotlight ${num}: ${name.charAt(0).toUpperCase() + name.slice(1)}`);
        lines.push(`        vec3 spot${num}Pos = DISPLAY_${upper} + ${offset};`);
        lines.push(`        vec3 spot${num}Target = DISPLAY_${upper};`);
        lines.push(`        vec3 spot${num}Aim = normalize(spot${num}Target - spot${num}Pos);`);
        lines.push(`        vec3 spot${num}Dir = normalize(pos - spot${num}Pos);`);
        lines.push(`        float spot${num}Cone = max(dot(spot${num}Dir, spot${num}Aim), 0.0);`);
        lines.push(`        float spot${num}Dist = length(pos - spot${num}Pos);`);
        lines.push(`        spot${num}Cone = pow(spot${num}Cone, 6.0) / (1.0 + spot${num}Dist * 0.08);`);
        lines.push(`        if (spot${num}Cone > 0.001) {`);
        lines.push(`            vec3 toLight = normalize(spot${num}Pos - pos);`);
        lines.push(`            vec3 shadowOrigin = pos + toLight * 0.02;`);
        lines.push(`            float spotDiff = max(dot(nor, toLight), 0.0);`);
        lines.push(`            float fracShadow = calcFractalShadow(shadowOrigin, toLight, DISPLAY_${upper}, ${upper}_BBOX, ${upper}_SCALE, ${i});`);
        lines.push(`            spot += spot${num}Cone * 1.2 * spotDiff * fracShadow * bakedShadow;`);
        lines.push(`        }`);
        if (i < fractals.length - 1) lines.push('');
    }
    return lines.join('\n');
}

// Generate computeShadowUV function - computes UV for a known shadow layer
function generateComputeShadowUV() {
    const lines = [];
    lines.push('// Compute UV for known shadow layer (no guessing needed!)');
    lines.push('// Auto-generated from SHADOW_SURFACES in GalleryGeometry.js');
    lines.push('vec2 computeShadowUV(int shadowId, vec3 pos) {');
    lines.push('    float x = pos.x, y = pos.y, z = pos.z;');
    lines.push('');

    // Generate a switch-like structure for each surface
    for (let i = 0; i < SHADOW_SURFACES.length; i++) {
        const s = SHADOW_SURFACES[i];
        const uRange = s.maxU - s.minU;
        const vRange = s.maxV - s.minV;

        const prefix = i === 0 ? 'if' : '} else if';
        lines.push(`    ${prefix} (shadowId == ${s.id}) {`);
        lines.push(`        // ${s.name} (type ${s.type})`);

        if (s.type === 0) {
            // Horizontal: UV from x,z
            lines.push(`        return vec2((x - ${s.minU.toFixed(1)}) / ${uRange.toFixed(1)}, (z - ${s.minV.toFixed(1)}) / ${vRange.toFixed(1)});`);
        } else if (s.type === 1) {
            // Z-facing wall: UV from x,y
            lines.push(`        return vec2((x - ${s.minU.toFixed(1)}) / ${uRange.toFixed(1)}, (y - ${s.minV.toFixed(1)}) / ${vRange.toFixed(1)});`);
        } else {
            // X-facing wall: UV from z,y
            lines.push(`        return vec2((z - ${s.minU.toFixed(1)}) / ${uRange.toFixed(1)}, (y - ${s.minV.toFixed(1)}) / ${vRange.toFixed(1)});`);
        }
    }

    lines.push('    }');
    lines.push('    // Fallback (should never happen)');
    lines.push('    return vec2(0.0);');
    lines.push('}');
    return lines.join('\n');
}

// Generate material color and texture handling code
function generateMaterialHandling() {
    const lines = [];
    lines.push('        // Auto-generated material handling from MATERIALS');

    const matIds = Object.keys(MATERIALS).map(Number).sort((a, b) => a - b);

    for (let i = 0; i < matIds.length; i++) {
        const matId = matIds[i];
        const mat = MATERIALS[matId];
        const color = vec3(mat.color);
        const isFirst = i === 0;
        const prefix = isFirst ? 'if' : '} else if';

        lines.push(`        ${prefix} (matId == ${matId}) {`);
        lines.push(`            baseColor = ${color};`);

        if (mat.texture && mat.uvRegion) {
            const uv = mat.uvRegion;
            const texName = `u_${mat.texture}`;
            const xRange = Math.abs(uv.maxX - uv.minX);
            const yRange = uv.maxY - uv.minY;

            // Determine UV.x mapping based on axis
            // Original formulas: -(pos.z + 6.0) / 12.0 = -(pos.z - (-6.0)) / 12.0
            let uvXExpr;
            if (uv.axis === 'x') {
                uvXExpr = `(pos.x - ${uv.minX.toFixed(1)}) / ${xRange.toFixed(1)}`;
            } else if (uv.axis === '-x') {
                uvXExpr = `-(pos.x - ${uv.minX.toFixed(1)}) / ${xRange.toFixed(1)}`;
            } else if (uv.axis === 'z') {
                uvXExpr = `(pos.z - ${uv.minX.toFixed(1)}) / ${xRange.toFixed(1)}`;
            } else if (uv.axis === '-z') {
                uvXExpr = `-(pos.z - ${uv.minX.toFixed(1)}) / ${xRange.toFixed(1)}`;
            }

            // UV.y always maps from y coordinate, flipped (1.0 - ...)
            const uvYExpr = `1.0 - (pos.y - ${uv.minY.toFixed(1)}) / ${yRange.toFixed(1)}`;

            lines.push('');
            lines.push('            vec2 texUV;');
            lines.push(`            texUV.x = ${uvXExpr};`);
            lines.push(`            texUV.y = ${uvYExpr};`);
            lines.push('');
            lines.push('            if (texUV.x >= 0.0 && texUV.x <= 1.0 && texUV.y >= 0.0 && texUV.y <= 1.0) {');

            // Title wall uses textColor, code walls use codeColor
            if (matId === MATERIAL_IDS.TITLE_WALL) {
                lines.push(`                textColor = texture(${texName}, texUV);`);
            } else {
                lines.push(`                codeColor = texture(${texName}, texUV);`);
            }
            lines.push('            }');
        }
    }

    // Default fallback
    const defaultColor = vec3(MATERIALS[MATERIAL_IDS.DARK_CONCRETE].color);
    lines.push('        } else {');
    lines.push(`            baseColor = ${defaultColor};`);
    lines.push('        }');

    return lines.join('\n');
}

export const galleryFragmentSrc = `#version 300 es
precision highp float;

layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outDepth;
layout(location = 2) out vec4 outText;  // Text layer for post-FXAA compositing

uniform vec2 u_resolution;
uniform vec3 u_camPos;
uniform vec3 u_camDir;
uniform vec3 u_camRight;
uniform vec3 u_camUp;
uniform float u_zoom;
uniform vec2 u_jitter;
uniform float u_time;

// Fractal parameters for shadow casting
uniform float u_mandelboxScale;
uniform float u_mandelboxMinR;
uniform float u_mandelboxFixedR;
uniform float u_mandelboxFoldLimit;

uniform float u_mandelbulbPower;
uniform float u_mandelbulbPhiPower;
uniform float u_mandelbulbPhase;
uniform float u_mandelbulbPhiPhase;

uniform vec4 u_juliaC;

// Wall texture (title + descriptions)
uniform sampler2D u_wallTex;
// Concrete texture for walls
uniform sampler2D u_concreteTex;
// Code display textures
uniform sampler2D u_mandelboxCodeTex;
uniform sampler2D u_mandelbulbCodeTex;
uniform sampler2D u_juliaCodeTex;
// Baked shadow texture array (one layer per surface)
uniform highp sampler2DArray u_shadowArrayTex;
// Easter egg peephole texture
uniform sampler2D u_peepholeTex;
// Animated slides texture (disabled)
// uniform sampler2D u_slidesTex;

const float MIN_DIST = 0.002;
const float MAX_DIST = 100.0;

// ============ GENERATED GEOMETRY CONSTANTS ============
${generateFractalConstants()}

${generateCeilingLightConstants()}

${generateSpotlightSphereConstants()}
const vec3 SPOTLIGHT_COLOR = vec3(1.0, 0.95, 0.85);
const float SPOTLIGHT_STEM_RADIUS = 0.015;
const vec3 SPOTLIGHT_STEM_COLOR = vec3(0.02);

// ============ BUMP MAPPING ============

// Fast hash function (no sin/cos)
float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

// Value noise using hash
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// 2-octave FBM for bump height
float bumpHeight(vec2 p) {
    float h = vnoise(p) * 0.6;
    h += vnoise(p * 2.0) * 0.3;
    h += vnoise(p * 4.0) * 0.1;
    return h;
}

// Perturb normal based on procedural bump, also output height for shading
vec3 applyBump(vec3 pos, vec3 nor, float scale, float strength, out float height) {
    // Choose planar projection based on normal orientation
    vec2 uv;
    vec3 tangent, bitangent;

    if (abs(nor.y) > 0.5) {
        // Horizontal surface (floor/ceiling)
        uv = pos.xz * scale;
        tangent = vec3(1.0, 0.0, 0.0);
        bitangent = vec3(0.0, 0.0, 1.0);
    } else if (abs(nor.z) > abs(nor.x)) {
        // Z-facing wall
        uv = pos.xy * scale;
        tangent = vec3(1.0, 0.0, 0.0);
        bitangent = vec3(0.0, 1.0, 0.0);
    } else {
        // X-facing wall
        uv = pos.zy * scale;
        tangent = vec3(0.0, 0.0, 1.0);
        bitangent = vec3(0.0, 1.0, 0.0);
    }

    // Compute gradient via finite differences
    float eps = 0.02;
    float h0 = bumpHeight(uv);
    float hx = bumpHeight(uv + vec2(eps, 0.0));
    float hy = bumpHeight(uv + vec2(0.0, eps));

    height = h0;  // Output for ambient shading

    float dx = (hx - h0) / eps;
    float dy = (hy - h0) / eps;

    // Perturb normal in tangent space
    vec3 bumpedNor = normalize(nor - (tangent * dx + bitangent * dy) * strength);
    return bumpedNor;
}

// ============ FRACTAL DEs FOR SHADOW CASTING ============
// Imported from shared fractal-des.js module
${allHelpers}
${allShadowDEs}

// Ray-AABB intersection
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

// Check shadow for a specific fractal - returns shadow amount (0=blocked, 1=clear)
// Now includes fog: rays that exhaust steps return partial shadow
float calcFractalShadow(vec3 ro, vec3 rd, vec3 displayPos, vec3 bboxSize, float scale, int fractalType) {
    float distToDisplay = length(ro - displayPos);
    if (distToDisplay > 15.0) return 1.0;

    // bbox is not scaled - matches fractal shader clip box
    vec3 boxMin = displayPos - bboxSize;
    vec3 boxMax = displayPos + bboxSize;

    boxMin -= vec3(0.05);
    boxMax += vec3(0.05);

    vec2 tBox = rayBoxIntersect(ro, rd, boxMin, boxMax);

    if (tBox.x < 0.0) return 1.0;

    float t = max(tBox.x, 0.01);
    float maxT = tBox.y;

    int maxSteps = fractalType == 1 ? 40 : 30;
    int stepsTaken = 0;
    bool passedThrough = false;

    for (int i = 0; i < 100; i++) {
        if (i >= maxSteps) break;
        stepsTaken = i;
        if (t > maxT) { passedThrough = true; break; }

        vec3 p = ro + rd * t;
        vec3 fp = (p - displayPos) / scale;

        float d;
        if (fractalType == 0) d = mandelboxDE(fp);
        else if (fractalType == 1) d = mandelbulbDE(fp);
        else d = juliaDE(fp);

        d = abs(d) * scale;

        if (d < MIN_DIST) {
            return 0.0;  // Hit fractal surface - full shadow
        }
        t += d;
    }

    // If passed through cleanly, full light
    if (passedThrough) return 1.0;

    // Exhausted steps = fog - partial shadow (only for mandelbox)
    if (fractalType == 0) {
        float fogAmount = float(stepsTaken) / float(maxSteps);
        fogAmount = smoothstep(0.7, 1.0, fogAmount);
        return 1.0 - fogAmount * 0.5;  
    }

    return 1.0;
}

float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

// ============ ANALYTICAL RAY INTERSECTION ============

float rayBox(vec3 ro, vec3 rd, vec3 center, vec3 boxHalf, out vec3 normal) {
    // Clamp near-zero ray components to avoid division instability
    // This prevents flickering when rd.x or rd.z ≈ 0 (looking straight at a wall)
    const float minRd = 0.0001;
    vec3 safeRd = vec3(
        abs(rd.x) < minRd ? sign(rd.x + 0.0001) * minRd : rd.x,
        abs(rd.y) < minRd ? sign(rd.y + 0.0001) * minRd : rd.y,
        abs(rd.z) < minRd ? sign(rd.z + 0.0001) * minRd : rd.z
    );
    vec3 m = 1.0 / safeRd;
    vec3 n = m * (ro - center);
    vec3 k = abs(m) * boxHalf;
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;
    float tN = max(max(t1.x, t1.y), t1.z);
    float tF = min(min(t2.x, t2.y), t2.z);
    if (tN > tF || tF < 0.0) return -1.0;
    float t = tN > 0.0 ? tN : tF;
    // Robust normal calculation: find which face was hit using epsilon comparison
    // This avoids edge cases when ray hits exactly on a box edge
    vec3 tDiff = abs(t1 - vec3(tN));
    float minDiff = min(min(tDiff.x, tDiff.y), tDiff.z);
    normal = -sign(rd) * vec3(
        tDiff.x <= minDiff + 0.0001 ? 1.0 : 0.0,
        tDiff.y <= minDiff + 0.0001 ? 1.0 : 0.0,
        tDiff.z <= minDiff + 0.0001 ? 1.0 : 0.0
    );
    // If multiple faces tied, normalize to avoid over-bright normals
    normal = normalize(normal);
    return t;
}

bool pointInBox(vec3 p, vec3 center, vec3 boxHalf) {
    vec3 d = abs(p - center);
    return d.x <= boxHalf.x && d.y <= boxHalf.y && d.z <= boxHalf.z;
}

float rayPlaneY(vec3 ro, vec3 rd, float y) {
    if (abs(rd.y) < 0.0001) return -1.0;
    float t = (y - ro.y) / rd.y;
    return t > 0.0 ? t : -1.0;
}

// Ray-sphere intersection (returns distance or -1 if no hit)
float raySphere(vec3 ro, vec3 rd, vec3 center, float radius) {
    vec3 oc = ro - center;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - radius * radius;
    float h = b * b - c;
    if (h < 0.0) return -1.0;
    return -b - sqrt(h);
}

// Ray-disc intersection (disc facing down, normal = [0,-1,0])
float rayDisc(vec3 ro, vec3 rd, vec3 center, float radius) {
    if (abs(rd.y) < 0.0001) return -1.0;
    float t = (center.y - ro.y) / rd.y;
    if (t < 0.0) return -1.0;
    vec3 p = ro + rd * t;
    float d2 = (p.x - center.x) * (p.x - center.x) + (p.z - center.z) * (p.z - center.z);
    return d2 <= radius * radius ? t : -1.0;
}

// Ray-vertical cylinder intersection (cylinder axis along Y)
float rayCylinderY(vec3 ro, vec3 rd, vec3 base, float radius, float height) {
    // Solve in XZ plane
    float ox = ro.x - base.x;
    float oz = ro.z - base.z;
    float a = rd.x * rd.x + rd.z * rd.z;
    float b = 2.0 * (ox * rd.x + oz * rd.z);
    float c = ox * ox + oz * oz - radius * radius;
    float disc = b * b - 4.0 * a * c;
    if (disc < 0.0) return -1.0;
    float t = (-b - sqrt(disc)) / (2.0 * a);
    if (t < 0.0) t = (-b + sqrt(disc)) / (2.0 * a);
    if (t < 0.0) return -1.0;
    float y = ro.y + rd.y * t;
    if (y < base.y || y > base.y + height) return -1.0;
    return t;
}

${generateIsInGallery()}

float traceGallery(vec3 ro, vec3 rd, out int matId, out int shadowId, out vec3 normal) {
    float t = MAX_DIST;
    matId = 0;
    shadowId = 0;
    normal = vec3(0.0, 1.0, 0.0);
    vec3 n;
    float d;

    // Floor (shadowId = 0)
    d = rayPlaneY(ro, rd, ${FLOOR_Y.toFixed(1)});
    if (d > 0.0 && d < t) {
        vec3 hp = ro + rd * d;
        if (isInGallery(hp.x, hp.z)) {
            t = d; matId = 1; shadowId = 0; normal = vec3(0.0, 1.0, 0.0);
        }
    }

    // Ceiling (shadowId = 1)
    d = rayPlaneY(ro, rd, ${CEILING_Y.toFixed(1)});
    if (d > 0.0 && d < t) {
        vec3 hp = ro + rd * d;
        if (isInGallery(hp.x, hp.z)) {
            t = d; matId = 0; shadowId = 1; normal = vec3(0.0, -1.0, 0.0);
        }
    }

    // Walls and pedestals
${generateWallTracing()}

    return t;
}

${generateGalleryDE()}

vec3 calcNormal(vec3 p) {
    const float e = 0.001;
    int m;
    float d = galleryDE(p, m);
    return normalize(vec3(
        galleryDE(p + vec3(e,0,0), m) - d,
        galleryDE(p + vec3(0,e,0), m) - d,
        galleryDE(p + vec3(0,0,e), m) - d
    ));
}

float calcAO(vec3 pos, vec3 nor) {
    float occ = 0.0;
    float sca = 1.0;
    int m;
    for (int i = 0; i < 3; i++) {
        float h = 0.03 + 0.12 * float(i);
        float d = galleryDE(pos + nor * h, m);
        occ += (h - d) * sca;
        sca *= 0.7;
    }
    return clamp(1.0 - 0.8 * occ, 0.0, 1.0);
}

float calcSoftShadow(vec3 ro, vec3 rd, float tmax) {
    float res = 1.0;
    float t = 0.05;
    int m;
    for (int i = 0; i < 10; i++) {
        float d = galleryDE(ro + rd * t, m);
        if (d < 0.003) return 0.0;
        res = min(res, 8.0 * d / t);
        t += clamp(d, 0.03, 0.25);
        if (t > tmax) break;
    }
    return clamp(res, 0.0, 1.0);
}

${generateComputeShadowUV()}

float getBakedShadow(int shadowId, vec3 worldPos) {
    if (shadowId < 0) return 1.0;  // No baked shadow (e.g. pedestals)
    vec2 uv = computeShadowUV(shadowId, worldPos);
    uv = clamp(uv, 0.001, 0.999);
    return texture(u_shadowArrayTex, vec3(uv, float(shadowId))).r;
}

vec3 flowingWater(vec3 rd) {
    vec2 p = rd.xz / (1.0 + abs(rd.y)) * 3.0;
    float t = u_time * 0.3;
    float wave1 = sin(p.x * 2.0 + t) * sin(p.y * 2.0 + t * 0.7);
    float wave2 = sin(p.x * 4.0 - t * 1.3 + 1.0) * sin(p.y * 3.0 + t * 0.9);
    float wave3 = sin(p.x * 7.0 + t * 0.8) * sin(p.y * 6.0 - t * 1.1);
    float waves = wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2;
    waves = waves * 0.5 + 0.5;
    vec3 deep = vec3(0.02, 0.05, 0.12);
    vec3 mid = vec3(0.05, 0.15, 0.25);
    vec3 bright = vec3(0.1, 0.3, 0.4);
    float viewFade = smoothstep(-0.3, 0.3, rd.y);
    vec3 water = mix(deep, mid, waves);
    water = mix(water, bright, waves * waves * viewFade);
    float caustic = sin(p.x * 12.0 + t * 2.0) * sin(p.y * 12.0 - t * 1.7);
    caustic = pow(max(caustic, 0.0), 3.0) * 0.15;
    water += vec3(caustic * 0.5, caustic * 0.8, caustic);
    return water;
}

void main() {
    // Apply sub-pixel jitter for TAA temporal supersampling
    vec2 uv = (gl_FragCoord.xy + u_jitter - 0.5 * u_resolution) / u_resolution.y;
    vec3 ro = u_camPos;
    vec3 rd = normalize(u_camDir * 1.5 * u_zoom + uv.x * u_camRight + uv.y * u_camUp);

    vec3 col = vec3(1,0,0.5);
    float hitDist = MAX_DIST;
    vec4 textColor = vec4(0.0);  // For post-FXAA text compositing

    int matId;
    int shadowId;
    vec3 nor;
    float t = traceGallery(ro, rd, matId, shadowId, nor);
    bool hit = (t < MAX_DIST);

    // Check ceiling light discs (emissive, rendered before gallery surfaces if closer)
    bool hitDisc = false;
    float discT = MAX_DIST;
    float d;
    d = rayDisc(ro, rd, CEILING_LIGHT_1, CEILING_DISC_RADIUS);
    if (d > 0.0 && d < discT) discT = d;
    d = rayDisc(ro, rd, CEILING_LIGHT_2, CEILING_DISC_RADIUS);
    if (d > 0.0 && d < discT) discT = d;
    d = rayDisc(ro, rd, CEILING_LIGHT_3, CEILING_DISC_RADIUS);
    if (d > 0.0 && d < discT) discT = d;
    d = rayDisc(ro, rd, CEILING_LIGHT_4, CEILING_DISC_RADIUS);
    if (d > 0.0 && d < discT) discT = d;

    if (discT < t && discT < MAX_DIST) {
        // Hit a ceiling disc - render as glowing emissive
        hitDist = discT;
        vec3 discPos = ro + rd * discT;
        // Soft glow falloff from center
        float closestDist2 = MAX_DIST;
        vec3 centers[4];
        centers[0] = CEILING_LIGHT_1;
        centers[1] = CEILING_LIGHT_2;
        centers[2] = CEILING_LIGHT_3;
        centers[3] = CEILING_LIGHT_4;
        for (int i = 0; i < 4; i++) {
            float dx = discPos.x - centers[i].x;
            float dz = discPos.z - centers[i].z;
            float dist2 = dx*dx + dz*dz;
            if (dist2 < closestDist2) closestDist2 = dist2;
        }
        float r = sqrt(closestDist2) / CEILING_DISC_RADIUS;
        float glow = 1.0 - r * r;  // Quadratic falloff
        col = CEILING_DISC_COLOR * (0.6 + 0.4 * glow);
        col = pow(col, vec3(0.4545));
        outColor = vec4(col, 1.0);
        outDepth = vec4(hitDist / 100.0, 0.0, 0.0, 1.0);
        outText = vec4(0.0);
        return;
    }

    // Check fractal spotlight spheres
    float sphereT = MAX_DIST;
    vec3 hitSpotCenter;
    vec3 hitSpotTarget;
    d = raySphere(ro, rd, SPOTLIGHT_MANDELBOX, SPOTLIGHT_SPHERE_RADIUS);
    if (d > 0.0 && d < sphereT) { sphereT = d; hitSpotCenter = SPOTLIGHT_MANDELBOX; hitSpotTarget = DISPLAY_MANDELBOX; }
    d = raySphere(ro, rd, SPOTLIGHT_MANDELBULB, SPOTLIGHT_SPHERE_RADIUS);
    if (d > 0.0 && d < sphereT) { sphereT = d; hitSpotCenter = SPOTLIGHT_MANDELBULB; hitSpotTarget = DISPLAY_MANDELBULB; }
    d = raySphere(ro, rd, SPOTLIGHT_JULIA, SPOTLIGHT_SPHERE_RADIUS);
    if (d > 0.0 && d < sphereT) { sphereT = d; hitSpotCenter = SPOTLIGHT_JULIA; hitSpotTarget = DISPLAY_JULIA; }

    if (sphereT < t && sphereT < MAX_DIST) {
        vec3 hitPos = ro + rd * sphereT;
        vec3 sphereNormal = normalize(hitPos - hitSpotCenter);
        vec3 aimDir = normalize(hitSpotTarget - hitSpotCenter);

        // Front face (emissive cone) vs back (dark housing)
        float facing = dot(sphereNormal, aimDir);  // positive = looking at front

        if (facing > 0.3) {
            // Emissive front - bright
            float glow = smoothstep(0.3, 1.0, facing);
            col = SPOTLIGHT_COLOR * (0.8 + 0.6 * glow);
        } else {
            // Dark housing body
            col = SPOTLIGHT_COLOR * 0.15;
        }
        col = pow(col, vec3(0.4545));
        outColor = vec4(col, 1.0);
        outDepth = vec4(sphereT / 100.0, 0.0, 0.0, 1.0);
        outText = vec4(0.0);
        return;
    }

    // Check spotlight stems (thin cylinders from floor to spotlight)
    float stemT = MAX_DIST;
    d = rayCylinderY(ro, rd, vec3(SPOTLIGHT_MANDELBOX.x, 0.0, SPOTLIGHT_MANDELBOX.z), SPOTLIGHT_STEM_RADIUS, SPOTLIGHT_MANDELBOX.y);
    if (d > 0.0 && d < stemT) stemT = d;
    d = rayCylinderY(ro, rd, vec3(SPOTLIGHT_MANDELBULB.x, 0.0, SPOTLIGHT_MANDELBULB.z), SPOTLIGHT_STEM_RADIUS, SPOTLIGHT_MANDELBULB.y);
    if (d > 0.0 && d < stemT) stemT = d;
    d = rayCylinderY(ro, rd, vec3(SPOTLIGHT_JULIA.x, 0.0, SPOTLIGHT_JULIA.z), SPOTLIGHT_STEM_RADIUS, SPOTLIGHT_JULIA.y);
    if (d > 0.0 && d < stemT) stemT = d;

    if (stemT < t && stemT < MAX_DIST) {
        col = SPOTLIGHT_STEM_COLOR;
        col = pow(col, vec3(0.4545));
        outColor = vec4(col, 1.0);
        outDepth = vec4(stemT / 100.0, 0.0, 0.0, 1.0);
        outText = vec4(0.0);
        return;
    }

    if (hit) {
        hitDist = t;
        vec3 pos = ro + rd * t;

        // Store geometric normal for AO, apply bump for lighting
        vec3 geoNor = nor;
        float bumpH;
        nor = applyBump(pos, nor, 17.5, 0.19, bumpH);

        vec3 lightDir = normalize(vec3(0.2, 1.0, 0.3));
        vec3 viewDir = -rd;

        float diff = max(dot(nor, lightDir), 0.0);

        // Get baked shadow using shadowId from ray tracing
        // Pedestals (shadowId -1): use floor shadow for tops only, skip for sides
        float bakedShadow;
        if (shadowId == -1) {
            bakedShadow = (geoNor.y > 0.7) ? getBakedShadow(0, pos) : 1.0;
        } else {
            bakedShadow = getBakedShadow(shadowId, pos);
        }
        float ao = calcAO(pos, geoNor);

        float spot = 0.0;
        vec3 spotColor = vec3(1.0, 0.95, 0.85);

${generateFractalSpotlights()}

        // Ceiling cone lights at corridor entrances
        float ceilingSpot = 0.0;

${generateCeilingLightCode()}

        spot += ceilingSpot * 0.8;

        // Front wall title spotlights
        float wallSpot = 0.0;
        vec3 wallSpotColor = vec3(1.0, 0.9, 0.7);

${generateWallSpotlights()}

        vec3 baseColor;
        vec4 codeColor = vec4(0.0);

${generateMaterialHandling()}

        // Code wall text handling - emissive text with transparent background
        float codeTextBrightness = 0.0;
        if (matId >= 3 && matId <= 5 && codeColor.a > 0.01) {
            // Detect text vs background based on brightness
            codeTextBrightness = dot(codeColor.rgb, vec3(0.299, 0.587, 0.114));
            // Only slightly darken the wall where there's no text (almost transparent background)
            baseColor = mix(baseColor, baseColor * 0.85, (1.0 - codeTextBrightness) * 0.15);
        }

        vec3 ambient = vec3(0.04) * ao;
        vec3 diffCol = baseColor * diff * bakedShadow * 0.25;
        vec3 spotContrib = baseColor * spot * 1.0;
        col = ambient + diffCol + spotContrib;

        // Emissive code text glow
        if (matId >= 3 && matId <= 5 && codeTextBrightness > 0.1) {
            vec3 emissiveText = codeColor.rgb * codeTextBrightness * 0.3;
            col += emissiveText;
        }

        // Slide projection disabled
        // {
        //     vec3 slideCenter = vec3(...);
        //     ...
        // }

        if (matId == 2) {
            float wallNdotL = max(dot(nor, normalize(vec3(0.0, 0.3, -1.0))), 0.0);
            col += baseColor * wallSpot * wallSpotColor * 1.5 * wallNdotL * bakedShadow;
            col += wallSpotColor * wallSpot * 0.15 * bakedShadow;

            // Text is output to separate buffer for post-FXAA compositing
            // Don't blend into col here - it will be composited after AA

            // Easter egg: peephole at the dot in "P. Fluff" signature
            vec3 peepholeCenter = ${vec3(PEEPHOLE.position)};
            float peepholeRadius = ${PEEPHOLE.radius.toFixed(3)};
            float distToHole = length(pos.xy - peepholeCenter.xy);
            if (distToHole < peepholeRadius) {
                // Distance-based reveal (far = black dot, close = image)
                float camDist = length(u_camPos - peepholeCenter);
                float revealFactor = 1.0 - smoothstep(${PEEPHOLE.revealEnd.toFixed(1)}, ${PEEPHOLE.revealStart.toFixed(1)}, camDist);

                // Map position within hole to UV for peephole texture (flip V)
                vec2 holeUV = (pos.xy - peepholeCenter.xy) / peepholeRadius * 0.5 + 0.5;
                holeUV.y = 1.0 - holeUV.y;
                vec4 duchamp = texture(u_peepholeTex, holeUV);

                // Tight soft edge to minimize wall color vignette
                float holeMask = 1.0 - smoothstep(peepholeRadius * 0.9, peepholeRadius, distToHole);

                // Blend from black (like the period) to image as camera approaches
                vec3 holeColor = mix(vec3(0.0), duchamp.rgb * 0.8, revealFactor);
                col = mix(col, holeColor, holeMask);

                // Clear text layer so peephole area shows through
                textColor = vec4(0.0);
            }
        }


        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(nor, halfDir), 0.0), 32.0);

        if (matId == 2 && wallSpot > 0.01) {
            vec3 wallHalf = normalize(normalize(vec3(0.0, 2.0, -1.0)) + viewDir);
            float wallSpec = pow(max(dot(nor, wallHalf), 0.0), 16.0);
            col += wallSpotColor * wallSpec * wallSpot * 0.3;
        }
    }

    // Blend text directly into color (will be subject to FXAA)
    col = mix(col, textColor.rgb, textColor.a * 0.9);

    col = pow(col, vec3(0.4545));
    outColor = vec4(col, 1.0);
    outDepth = vec4(hitDist / 100.0, 0.0, 0.0, 1.0);
    outText = vec4(0.0);  // Text now blended into color, not separate layer
}`;

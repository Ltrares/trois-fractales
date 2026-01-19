// Per-surface shadow baking shader
// Bakes shadows for each distinct surface into separate texture array layers

import {
    FRACTALS,
    WALLS,
    PEDESTALS,
    WALL_SPOTLIGHTS,
    FLOOR_Y,
    CEILING_Y,
} from '../geometry/GalleryGeometry.js';

// Helper to format vec3 for GLSL
function vec3(arr) {
    return `vec3(${arr.map(v => v.toFixed(1)).join(', ')})`;
}

// Generate spotlight constants (derived from fractal positions + offsets)
function generateSpotlightConstants() {
    const lines = [];
    const fractals = Object.entries(FRACTALS);
    for (let i = 0; i < fractals.length; i++) {
        const [name, f] = fractals[i];
        const spotPos = [
            f.position[0] + f.spotlightOffset[0],
            f.position[1] + f.spotlightOffset[1],
            f.position[2] + f.spotlightOffset[2],
        ];
        lines.push(`const vec3 SPOT${i + 1}_POS = ${vec3(spotPos)};   // ${name.charAt(0).toUpperCase() + name.slice(1)}`);
    }
    return lines.join('\n');
}

// Generate wall spotlight constants
function generateWallSpotlightConstants() {
    const spots = Object.values(WALL_SPOTLIGHTS);
    const lines = [];
    for (let i = 0; i < spots.length; i++) {
        lines.push(`const vec3 WALL_SPOT${i + 1}_POS = ${vec3(spots[i].position)};`);
    }
    return lines.join('\n');
}

// Generate galleryDE function
function generateGalleryDE() {
    const lines = [];
    lines.push('float galleryDE(vec3 p) {');
    lines.push('    float d = 1000.0;');
    lines.push('');
    lines.push('    // Floor and Ceiling');
    lines.push(`    d = min(d, p.y - ${FLOOR_Y.toFixed(1)});`);
    lines.push(`    d = min(d, ${CEILING_Y.toFixed(1)} - p.y);`);
    lines.push('');

    lines.push('    // Walls');
    for (const [, wall] of Object.entries(WALLS)) {
        lines.push(`    d = min(d, sdBox(p - ${vec3(wall.center)}, ${vec3(wall.halfExtents)}));`);
    }
    lines.push('');

    lines.push('    // Pedestals');
    for (const [, ped] of Object.entries(PEDESTALS)) {
        lines.push(`    d = min(d, sdBox(p - ${vec3(ped.center)}, ${vec3(ped.halfExtents)}));`);
    }
    lines.push('');
    lines.push('    return d;');
    lines.push('}');
    return lines.join('\n');
}

export const shadowBakeFragmentSrc = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec2 u_resolution;

// Surface parameters (passed per-layer)
uniform int u_surfaceType;    // 0=horizontal(y), 1=z-wall, 2=x-wall
uniform float u_fixedCoord;   // The fixed coordinate value
uniform float u_minU;         // Min of first varying axis
uniform float u_maxU;         // Max of first varying axis
uniform float u_minV;         // Min of second varying axis
uniform float u_maxV;         // Max of second varying axis

// === GENERATED FROM GalleryGeometry.js ===

// Fractal spotlights
${generateSpotlightConstants()}
const vec3 MAIN_LIGHT_DIR = normalize(vec3(0.2, 1.0, 0.3));

// Wall title spotlights
${generateWallSpotlightConstants()}

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Gallery SDF for shadow tracing
${generateGalleryDE()}

// Soft shadow ray trace with smooth penumbra
float traceShadow(vec3 ro, vec3 rd, float maxDist) {
    float t = 0.02;
    float res = 1.0;
    float ph = 1e10;
    for (int i = 0; i < 256; i++) {
        float d = galleryDE(ro + rd * t);
        if (d < 0.0005) return 0.0;
        // Improved penumbra estimation
        float y = d * d / (2.0 * ph);
        float k = sqrt(d * d - y * y);
        res = min(res, 16.0 * k / max(0.001, t - y));
        ph = d;
        t += max(d * 0.5, 0.004);
        if (t > maxDist) break;
    }
    return clamp(res, 0.0, 1.0);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    // Map UV to world coordinates based on surface type
    float u = mix(u_minU, u_maxU, uv.x);
    float v = mix(u_minV, u_maxV, uv.y);

    vec3 samplePos;
    if (u_surfaceType == 0) {
        // Horizontal: fixed=y, u=x, v=z
        samplePos = vec3(u, u_fixedCoord, v);
    } else if (u_surfaceType == 1) {
        // Z-wall: fixed=z, u=x, v=y
        samplePos = vec3(u, v, u_fixedCoord);
    } else {
        // X-wall: fixed=x, u=z, v=y
        samplePos = vec3(u_fixedCoord, v, u);
    }

    // Accumulate shadow from lights (cap trace distance to reduce banding)
    float shadow = 0.0;
    float totalWeight = 0.0;
    const float MAX_SHADOW_DIST = 10.0;

    // Fractal spotlights
    vec3 toLight1 = SPOT1_POS - samplePos;
    float dist1 = length(toLight1);
    float weight1 = 1.0 / (1.0 + dist1 * 0.05);
    shadow += traceShadow(samplePos, normalize(toLight1), min(dist1, MAX_SHADOW_DIST)) * weight1;
    totalWeight += weight1;

    vec3 toLight2 = SPOT2_POS - samplePos;
    float dist2 = length(toLight2);
    float weight2 = 1.0 / (1.0 + dist2 * 0.05);
    shadow += traceShadow(samplePos, normalize(toLight2), min(dist2, MAX_SHADOW_DIST)) * weight2;
    totalWeight += weight2;

    vec3 toLight3 = SPOT3_POS - samplePos;
    float dist3 = length(toLight3);
    float weight3 = 1.0 / (1.0 + dist3 * 0.05);
    shadow += traceShadow(samplePos, normalize(toLight3), min(dist3, MAX_SHADOW_DIST)) * weight3;
    totalWeight += weight3;

    // Wall spotlights
    vec3 toWall1 = WALL_SPOT1_POS - samplePos;
    float distW1 = length(toWall1);
    float weightW1 = 1.0 / (1.0 + distW1 * 0.08);
    shadow += traceShadow(samplePos, normalize(toWall1), min(distW1, MAX_SHADOW_DIST)) * weightW1;
    totalWeight += weightW1;

    vec3 toWall2 = WALL_SPOT2_POS - samplePos;
    float distW2 = length(toWall2);
    float weightW2 = 1.0 / (1.0 + distW2 * 0.08);
    shadow += traceShadow(samplePos, normalize(toWall2), min(distW2, MAX_SHADOW_DIST)) * weightW2;
    totalWeight += weightW2;

    vec3 toWall3 = WALL_SPOT3_POS - samplePos;
    float distW3 = length(toWall3);
    float weightW3 = 1.0 / (1.0 + distW3 * 0.08);
    shadow += traceShadow(samplePos, normalize(toWall3), min(distW3, MAX_SHADOW_DIST)) * weightW3;
    totalWeight += weightW3;

    // Main ambient light
    shadow += traceShadow(samplePos, MAIN_LIGHT_DIR, 8.0) * 0.3;
    totalWeight += 0.3;

    shadow = shadow / totalWeight;
    fragColor = vec4(shadow, 0.0, 0.0, 1.0);
}`;

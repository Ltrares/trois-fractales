// Parameter range definitions for each fractal type

import { mandelboxDE_JS } from '../shaders/fractals/fractal-des.js';

console.log('[init] fractal-config.js executing...');

export const PARAM_RANGES = {
    mandelbox: {
        scale: { min: -3.0, max: 3.0 },  // Full range including positive scales
        minR: { min: 0.1, max: 1.0 },
        fixedR: { min: 0.1, max: 2.0 },
        foldLimit: { min: 0.2, max: 2.0 },
    },
    mandelbulb: {
        power: { min: 2, max: 12 },
        phiPower: { min: 2, max: 12 },
        phase: { min: -0.3, max: 0.3 },
        phiPhase: { min: -0.4, max: 0.4 },
    },
    julia: {
        // Basic ranges (used by randomJuliaC for boundary-seeking)
        c: [
            { min: -0.8, max: 0.4 },    // Real part
            { min: -1.0, max: 1.0 },    // i component
            { min: -0.8, max: 0.8 },    // j component
            { min: -0.8, max: 0.8 },    // k component
        ],
        c2: [
            { min: -0.8, max: 0.4 },
            { min: -1.0, max: 1.0 },
            { min: -0.8, max: 0.8 },
            { min: -0.8, max: 0.8 },
        ],
        mix: { min: 0, max: 1 },
        invert: { min: 0, max: 1 },  // 0 = normal, 1 = spherical inversion (inside-out)
    }
};

export function randomInRange(range) {
    if (Array.isArray(range)) {
        return range.map(r => randomInRange(r));
    }
    return range.min + Math.random() * (range.max - range.min);
}

// JavaScript Mandelbox distance estimator - imported from shared fractal-des.js
const mandelboxDE = mandelboxDE_JS;

// Ray march toward origin to detect real hits vs fog vs empty
// Matches shader behavior: fog when using >70% of max steps without hit
function rayMarchToward(startRadius, dx, dy, dz, scale, minR, fixedR, foldLimit) {
    const maxSteps = 60;  // Match shader MAX_STEPS
    const hitThreshold = 0.002;
    const maxDist = startRadius * 2;
    const fogThreshold = 0.7;  // Fog if using more than 70% of steps

    // Start outside, march toward origin
    let x = dx * startRadius;
    let y = dy * startRadius;
    let z = dz * startRadius;
    let totalDist = 0;

    for (let i = 0; i < maxSteps; i++) {
        const d = mandelboxDE(x, y, z, scale, minR, fixedR, foldLimit);

        if (d < hitThreshold) {
            const hitDist = Math.sqrt(x*x + y*y + z*z);
            return { hit: true, fog: false, steps: i, finalDE: d, hitDist, hitPos: [x, y, z] };
        }

        if (totalDist > maxDist) {
            // Passed through without hitting - but check if we used many steps (partial fog)
            const isFog = i > maxSteps * fogThreshold;
            return { hit: false, fog: isFog, steps: i, finalDE: d, hitDist: 0, hitPos: [x, y, z] };
        }

        // March toward origin - use actual DE, no minimum (to detect fog properly)
        const step = Math.max(d * 0.5, 0.0005);  // Smaller multiplier, tinier minimum
        totalDist += step;
        x -= dx * step;
        y -= dy * step;
        z -= dz * step;
    }

    // Exhausted steps = definitely fog
    return { hit: false, fog: true, steps: maxSteps, finalDE: mandelboxDE(x, y, z, scale, minR, fixedR, foldLimit), hitDist: 0, hitPos: [x, y, z] };
}

// Generate ray directions on a cone in the positive octant
// Mandelbox has 8-fold symmetry, so we only need to sample one octant
function generateConeRays(numRays = 8, coneHalfAngle = 0.45) {
    // Cone axis: offset from (1,1,1) diagonal to avoid symmetric alignments
    const rawAxis = [1.0, 0.8, 0.6];
    const axisLen = Math.sqrt(rawAxis[0]**2 + rawAxis[1]**2 + rawAxis[2]**2);
    const axis = rawAxis.map(v => v / axisLen);

    // Compute perpendicular vectors for arbitrary axis
    // p1 = axis × (0,0,1), unless axis is parallel to Z, then use (0,1,0)
    let p1;
    if (Math.abs(axis[2]) < 0.9) {
        p1 = [axis[1], -axis[0], 0];  // axis × (0,0,1)
    } else {
        p1 = [axis[2], 0, -axis[0]];  // axis × (0,1,0)
    }
    const p1Len = Math.sqrt(p1[0]**2 + p1[1]**2 + p1[2]**2);
    p1 = p1.map(v => v / p1Len);

    // p2 = axis × p1
    const p2 = [
        axis[1]*p1[2] - axis[2]*p1[1],
        axis[2]*p1[0] - axis[0]*p1[2],
        axis[0]*p1[1] - axis[1]*p1[0]
    ];

    const cosTheta = Math.cos(coneHalfAngle);
    const sinTheta = Math.sin(coneHalfAngle);

    const rays = [];
    for (let i = 0; i < numRays; i++) {
        const phi = (2 * Math.PI * i) / numRays;
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);

        // Direction on cone surface: cos(theta)*axis + sin(theta)*(cos(phi)*p1 + sin(phi)*p2)
        const dx = cosTheta * axis[0] + sinTheta * (cosPhi * p1[0] + sinPhi * p2[0]);
        const dy = cosTheta * axis[1] + sinTheta * (cosPhi * p1[1] + sinPhi * p2[1]);
        const dz = cosTheta * axis[2] + sinTheta * (cosPhi * p1[2] + sinPhi * p2[2]);

        rays.push([dx, dy, dz]);
    }
    return rays;
}

// 8 ray directions on cone edge in positive octant
// Half-angle ~20° (0.35 rad) - tight cone, asymmetric axis
const RAY_DIRS = generateConeRays(8, 0.35);

// Store last scan results for debug display
let lastScanResults = null;

export function getLastScanResults() {
    return lastScanResults;
}

export function sampleMandelboxCoverage(params) {
    const { scale, minR, fixedR, foldLimit } = params;
    const startRadius = 1.5;  // Start outside typical fractal bounds

    let hits = 0;
    let fogs = 0;
    let misses = 0;
    const results = [];

    for (const [dx, dy, dz] of RAY_DIRS) {
        const result = rayMarchToward(startRadius, dx, dy, dz, scale, minR, fixedR, foldLimit);
        results.push({ dir: [dx, dy, dz], ...result });

        if (result.hit) hits++;
        else if (result.fog) fogs++;
        else misses++;
    }

    // Analyze hit positions
    const hitResults = results.filter(r => r.hit);

    // Calculate hit radii (distance from origin where each ray hit)
    const hitRadii = hitResults.map(r => Math.sqrt(r.hitPos[0]**2 + r.hitPos[1]**2 + r.hitPos[2]**2));
    const maxHitRadius = hitRadii.length > 0 ? Math.max(...hitRadii) : 0;
    const minHitRadius = hitRadii.length > 0 ? Math.min(...hitRadii) : 0;

    // Hits at origin (r < 0.05) are not real geometry - just DE converging at origin
    const realHits = hitRadii.filter(r => r > 0.05).length;

    // Check for tiny structure: all hits clustered at same SMALL radius
    // (hits clustered at large radius = shell at boundary = interesting)
    let radiusVariance = 0;
    let meanRadius = 0;
    if (hitRadii.length >= 2) {
        meanRadius = hitRadii.reduce((a, b) => a + b, 0) / hitRadii.length;
        radiusVariance = hitRadii.reduce((sum, r) => sum + (r - meanRadius) ** 2, 0) / hitRadii.length;
    }
    // Only "tiny" if clustered at small radius (< 0.5), not at bounding box edge
    const isTiny = realHits >= 2 && radiusVariance < 0.01 && meanRadius < 0.5;

    lastScanResults = {
        params: { scale, minR, fixedR, foldLimit },
        hits,
        realHits,
        fogs,
        misses,
        maxHitRadius,
        minHitRadius,
        meanRadius,
        radiusVariance,
        isTiny,
        rays: results
    };

    // Degenerate cases - speed up animation:
    // 1. All fog - nothing renders clearly
    if (fogs === 8) return 0;

    // 2. All hits at same point - tiny collapsed blob
    if (isTiny) return 0;

    // 3. All miss or hits only at origin - empty/collapsed
    if (realHits === 0) return 0;

    // Otherwise: has interesting structure
    return 1;
}

// Estimate if a quaternion c value produces a connected (solid) or disconnected (tubular) Julia set
// by testing if 0 escapes under iteration z -> z^2 + c
// Returns: iterations to escape (higher = more connected/solid, -1 = never escapes = fully connected)
function testJuliaConnectivity(c, maxIter = 20) {
    let qx = 0, qy = 0, qz = 0, qw = 0;

    for (let i = 0; i < maxIter; i++) {
        // q^2: (a + bi + cj + dk)^2 = a^2 - b^2 - c^2 - d^2 + 2ab*i + 2ac*j + 2ad*k
        const a = qx, b = qy, cq = qz, d = qw;
        const newX = a*a - b*b - cq*cq - d*d + c[0];
        const newY = 2*a*b + c[1];
        const newZ = 2*a*cq + c[2];
        const newW = 2*a*d + c[3];

        qx = newX; qy = newY; qz = newZ; qw = newW;

        const r2 = qx*qx + qy*qy + qz*qz + qw*qw;
        if (r2 > 4) return i;
    }
    return -1; // Didn't escape - fully connected
}

// Generate a random Julia c value that produces tubular structures
// by targeting the "boundary" of the Mandelbrot set where connectivity transitions
export function randomJuliaC() {
    // Strategy: generate random c values and keep ones that escape in a "goldilocks" range
    // Too fast escape (< 3 iters) = disconnected dust
    // Never escapes = solid ball
    // Escape in 4-12 iterations = interesting tubes

    const targetMinIter = 4;
    const targetMaxIter = 14;

    for (let attempt = 0; attempt < 50; attempt++) {
        // Generate candidate with bias toward interesting structure
        const c = [
            -0.1 + (Math.random() - 0.5) * 0.8,  // Real: centered around -0.1
            (Math.random() - 0.5) * 1.4,          // i: wide range
            (Math.random() - 0.5) * 1.0,          // j: moderate range
            (Math.random() - 0.5) * 1.0,          // k: moderate range
        ];

        // Ensure we have some j/k components for 4D structure
        const jkMag = Math.sqrt(c[2]*c[2] + c[3]*c[3]);
        if (jkMag < 0.1) continue; // Skip if j,k are too small

        const escapeIter = testJuliaConnectivity(c);

        // Accept if in target range
        if (escapeIter >= targetMinIter && escapeIter <= targetMaxIter) {
            return c;
        }
    }

    // Fallback: use known good "tube" parameters
    const knownTubeParams = [
        [-0.2, 0.6, 0.2, 0.0],   // Classic tube
        [-0.1, 0.65, 0.0, 0.3],  // Twisted tubes
        [-0.45, 0.35, 0.35, 0.0], // Branching
        [-0.3, 0.5, 0.1, 0.4],   // Spirals
        [-0.08, 0.0, 0.66, 0.0], // Rings
        [-0.125, 0.0, 0.5, 0.5], // Linked rings
    ];
    const base = knownTubeParams[Math.floor(Math.random() * knownTubeParams.length)];
    // Add small perturbation
    return base.map(v => v + (Math.random() - 0.5) * 0.15);
}

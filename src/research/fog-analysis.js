// Fog Analysis Tool
// Pure JS implementation for studying ray behavior in foggy regions

// ============================================
// Mandelbox DE (pure JS)
// ============================================

function boxFold(z, limit) {
    return {
        x: Math.max(-limit, Math.min(limit, z.x)) * 2 - z.x,
        y: Math.max(-limit, Math.min(limit, z.y)) * 2 - z.y,
        z: Math.max(-limit, Math.min(limit, z.z)) * 2 - z.z
    };
}

function sphereFold(z, dz, minR2, fixedR2) {
    const r2 = z.x * z.x + z.y * z.y + z.z * z.z;
    let newZ = { ...z };
    let newDz = dz;

    if (r2 < minR2) {
        const temp = fixedR2 / minR2;
        newZ = { x: z.x * temp, y: z.y * temp, z: z.z * temp };
        newDz = dz * temp;
    } else if (r2 < fixedR2) {
        const temp = fixedR2 / r2;
        newZ = { x: z.x * temp, y: z.y * temp, z: z.z * temp };
        newDz = dz * temp;
    }

    return { z: newZ, dz: newDz };
}

function mandelboxDE(pos, params = {}) {
    const scale = params.scale ?? -1.5;
    const minR = params.minR ?? 0.25;
    const fixedR = params.fixedR ?? 1.0;
    const foldLimit = params.foldLimit ?? 1.0;
    const iterations = params.iterations ?? 12;

    const minR2 = minR * minR;
    const fixedR2 = fixedR * fixedR;

    let z = { x: pos.x, y: pos.y, z: pos.z };
    let dz = 1.0;

    for (let i = 0; i < iterations; i++) {
        z = boxFold(z, foldLimit);
        const result = sphereFold(z, dz, minR2, fixedR2);
        z = result.z;
        dz = result.dz;

        z = {
            x: z.x * scale + pos.x,
            y: z.y * scale + pos.y,
            z: z.z * scale + pos.z
        };
        dz = dz * Math.abs(scale) + 1.0;
    }

    const len = Math.sqrt(z.x * z.x + z.y * z.y + z.z * z.z);
    return {
        de: len / Math.abs(dz),
        dz: dz,
        finalZ: z,
        escaped: len > 1000
    };
}

// ============================================
// Ray Marcher with full trajectory logging
// ============================================

function traceRay(origin, direction, params = {}) {
    const maxSteps = params.maxSteps ?? 200;
    const maxDist = params.maxDist ?? 50;
    const hitThreshold = params.hitThreshold ?? 0.0001;
    const minStep = params.minStep ?? 0.0001;
    const stepScale = params.stepScale ?? 0.9; // safety factor
    const deParams = params.deParams ?? {};

    // Normalize direction
    const dirLen = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    const dir = {
        x: direction.x / dirLen,
        y: direction.y / dirLen,
        z: direction.z / dirLen
    };

    const trajectory = [];
    let pos = { ...origin };
    let totalDist = 0;
    let result = 'max_steps'; // default outcome

    for (let step = 0; step < maxSteps; step++) {
        const deResult = mandelboxDE(pos, deParams);
        const de = deResult.de;
        const dz = deResult.dz;

        // Log this step
        trajectory.push({
            step,
            pos: { ...pos },
            de,
            dz,
            totalDist,
            escaped: deResult.escaped
        });

        // Check termination conditions
        if (de < hitThreshold) {
            result = 'hit';
            break;
        }

        if (totalDist > maxDist) {
            result = 'escaped';
            break;
        }

        // March forward
        const stepSize = Math.max(de * stepScale, minStep);
        pos = {
            x: pos.x + dir.x * stepSize,
            y: pos.y + dir.y * stepSize,
            z: pos.z + dir.z * stepSize
        };
        totalDist += stepSize;
    }

    return {
        result,
        steps: trajectory.length,
        totalDist,
        trajectory,
        origin,
        direction: dir
    };
}

// ============================================
// Bidirectional ray marcher (for oscillation detection)
// ============================================

function traceRayBidirectional(origin, direction, params = {}) {
    const maxSteps = params.maxSteps ?? 200;
    const hitThreshold = params.hitThreshold ?? 0.0001;
    const deParams = params.deParams ?? {};

    // Normalize direction
    const dirLen = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    const dir = {
        x: direction.x / dirLen,
        y: direction.y / dirLen,
        z: direction.z / dirLen
    };

    const trajectory = [];
    let pos = { ...origin };
    let currentDir = 1; // 1 = forward, -1 = backward
    let oscillations = 0;
    let lastDE = Infinity;

    for (let step = 0; step < maxSteps; step++) {
        const deResult = mandelboxDE(pos, deParams);
        const de = deResult.de;

        trajectory.push({
            step,
            pos: { ...pos },
            de,
            dz: deResult.dz,
            direction: currentDir
        });

        if (de < hitThreshold) {
            return { result: 'hit', oscillations, trajectory };
        }

        // Try stepping in current direction
        const stepSize = de * 0.9;
        const newPos = {
            x: pos.x + dir.x * stepSize * currentDir,
            y: pos.y + dir.y * stepSize * currentDir,
            z: pos.z + dir.z * stepSize * currentDir
        };

        const newDE = mandelboxDE(newPos, deParams).de;

        // If DE increased significantly, maybe try other direction
        if (newDE > de * 1.5 && step > 5) {
            currentDir *= -1;
            oscillations++;
        }

        pos = {
            x: pos.x + dir.x * stepSize * currentDir,
            y: pos.y + dir.y * stepSize * currentDir,
            z: pos.z + dir.z * stepSize * currentDir
        };

        lastDE = de;
    }

    return { result: 'max_steps', oscillations, trajectory };
}

// ============================================
// Analysis functions
// ============================================

function categorizeRay(trace) {
    const { result, trajectory } = trace;

    // Compute statistics
    const des = trajectory.map(t => t.de);
    const dzs = trajectory.map(t => t.dz);

    const minDE = Math.min(...des);
    const maxDE = Math.max(...des);
    const avgDE = des.reduce((a, b) => a + b, 0) / des.length;
    const maxDz = Math.max(...dzs);

    // Variance in DE (is it oscillating?)
    const deVariance = des.reduce((sum, de) => sum + (de - avgDE) ** 2, 0) / des.length;

    // Is DE monotonically decreasing?
    let monotonic = true;
    for (let i = 1; i < des.length; i++) {
        if (des[i] > des[i-1] * 1.1) { // allow 10% tolerance
            monotonic = false;
            break;
        }
    }

    return {
        result,
        steps: trajectory.length,
        minDE,
        maxDE,
        avgDE,
        deVariance,
        maxDz,
        monotonic,
        // Fog indicators
        dzExploded: maxDz > 100,
        deErratic: deVariance > avgDE * avgDE,
        category: result === 'hit' ? 'HIT' :
                  result === 'escaped' ? 'ESCAPED' :
                  maxDz > 100 ? 'FOG_DZ_EXPLODED' :
                  deVariance > avgDE * avgDE ? 'FOG_DE_ERRATIC' :
                  'FOG_UNKNOWN'
    };
}

function analyzeRegion(center, radius, numRays, params = {}) {
    const results = {
        hit: [],
        escaped: [],
        fog_dz_exploded: [],
        fog_de_erratic: [],
        fog_unknown: []
    };

    for (let i = 0; i < numRays; i++) {
        // Random origin near center
        const origin = {
            x: center.x + (Math.random() - 0.5) * radius * 2,
            y: center.y + (Math.random() - 0.5) * radius * 2,
            z: center.z + (Math.random() - 0.5) * radius * 2
        };

        // Random direction
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const direction = {
            x: Math.sin(phi) * Math.cos(theta),
            y: Math.sin(phi) * Math.sin(theta),
            z: Math.cos(phi)
        };

        const trace = traceRay(origin, direction, params);
        const analysis = categorizeRay(trace);

        const entry = { origin, direction, trace, analysis };

        switch (analysis.category) {
            case 'HIT': results.hit.push(entry); break;
            case 'ESCAPED': results.escaped.push(entry); break;
            case 'FOG_DZ_EXPLODED': results.fog_dz_exploded.push(entry); break;
            case 'FOG_DE_ERRATIC': results.fog_de_erratic.push(entry); break;
            default: results.fog_unknown.push(entry);
        }
    }

    return results;
}

// ============================================
// Pretty printing for analysis
// ============================================

function printTrajectory(trace, maxLines = 20) {
    console.log(`\n=== Ray Trace: ${trace.result} in ${trace.steps} steps ===`);
    console.log(`Origin: (${trace.origin.x.toFixed(4)}, ${trace.origin.y.toFixed(4)}, ${trace.origin.z.toFixed(4)})`);
    console.log(`Direction: (${trace.direction.x.toFixed(4)}, ${trace.direction.y.toFixed(4)}, ${trace.direction.z.toFixed(4)})`);
    console.log(`\nStep | DE          | dz         | TotalDist`);
    console.log(`-----|-------------|------------|----------`);

    const step = Math.max(1, Math.floor(trace.trajectory.length / maxLines));
    for (let i = 0; i < trace.trajectory.length; i += step) {
        const t = trace.trajectory[i];
        console.log(`${String(t.step).padStart(4)} | ${t.de.toExponential(4)} | ${t.dz.toExponential(3)} | ${t.totalDist.toFixed(4)}`);
    }
}

function printAnalysisSummary(results) {
    console.log(`\n=== Region Analysis Summary ===`);
    console.log(`HIT:             ${results.hit.length}`);
    console.log(`ESCAPED:         ${results.escaped.length}`);
    console.log(`FOG (dz exploded): ${results.fog_dz_exploded.length}`);
    console.log(`FOG (DE erratic):  ${results.fog_de_erratic.length}`);
    console.log(`FOG (unknown):     ${results.fog_unknown.length}`);

    const totalFog = results.fog_dz_exploded.length +
                     results.fog_de_erratic.length +
                     results.fog_unknown.length;
    const total = results.hit.length + results.escaped.length + totalFog;
    console.log(`\nFog rate: ${(totalFog / total * 100).toFixed(1)}%`);
}

// ============================================
// Export for use
// ============================================

export {
    mandelboxDE,
    traceRay,
    traceRayBidirectional,
    categorizeRay,
    analyzeRegion,
    printTrajectory,
    printAnalysisSummary
};

// ============================================
// Quick test (run with: node --experimental-modules fog-analysis.js)
// ============================================

if (typeof window === 'undefined' && typeof process !== 'undefined') {
    // Running in Node.js
    console.log("=== Fog Analysis Tool ===\n");

    // Use the exact foggy ray we found
    const foggyOrigin = { x: -1.6104, y: -0.1217, z: -1.7564 };
    const foggyDir = { x: 0.5847, y: 0.7045, z: -0.4022 };

    console.log("=== EXPERIMENT 1: Push foggy ray harder (2000 steps) ===");
    const trace1 = traceRay(foggyOrigin, foggyDir, {
        maxSteps: 2000,
        hitThreshold: 0.0001,
        deParams: { scale: -1.5 }
    });
    console.log(`Result: ${trace1.result} in ${trace1.steps} steps`);
    console.log(`Total distance: ${trace1.totalDist.toFixed(6)}`);
    const des1 = trace1.trajectory.map(t => t.de);
    console.log(`Min DE: ${Math.min(...des1).toExponential(4)}`);
    console.log(`Max DE: ${Math.max(...des1).toExponential(4)}`);

    console.log("\n=== EXPERIMENT 2: Tighter hit threshold (1e-6) ===");
    const trace2 = traceRay(foggyOrigin, foggyDir, {
        maxSteps: 2000,
        hitThreshold: 0.000001,
        deParams: { scale: -1.5 }
    });
    console.log(`Result: ${trace2.result} in ${trace2.steps} steps`);
    console.log(`Total distance: ${trace2.totalDist.toFixed(6)}`);
    const des2 = trace2.trajectory.map(t => t.de);
    console.log(`Min DE: ${Math.min(...des2).toExponential(4)}`);

    console.log("\n=== EXPERIMENT 3: Looser hit threshold (1e-3) ===");
    const trace3 = traceRay(foggyOrigin, foggyDir, {
        maxSteps: 2000,
        hitThreshold: 0.001,
        deParams: { scale: -1.5 }
    });
    console.log(`Result: ${trace3.result} in ${trace3.steps} steps`);
    console.log(`Total distance: ${trace3.totalDist.toFixed(6)}`);

    console.log("\n=== EXPERIMENT 4: Even looser (1e-2) ===");
    const trace4 = traceRay(foggyOrigin, foggyDir, {
        maxSteps: 2000,
        hitThreshold: 0.01,
        deParams: { scale: -1.5 }
    });
    console.log(`Result: ${trace4.result} in ${trace4.steps} steps`);
    if (trace4.result === 'hit') {
        console.log(`Hit at step ${trace4.steps}, DE was ${trace4.trajectory[trace4.steps-1].de.toExponential(4)}`);
    }

    console.log("\n=== EXPERIMENT 5: DE value distribution ===");
    // Run 2000 steps and bucket the DE values
    const longTrace = traceRay(foggyOrigin, foggyDir, {
        maxSteps: 5000,
        hitThreshold: 0.00001,
        deParams: { scale: -1.5 }
    });
    const allDEs = longTrace.trajectory.map(t => t.de);
    const buckets = {
        'DE < 1e-4': 0,
        '1e-4 to 1e-3': 0,
        '1e-3 to 1e-2': 0,
        '1e-2 to 1e-1': 0,
        'DE > 1e-1': 0
    };
    allDEs.forEach(de => {
        if (de < 0.0001) buckets['DE < 1e-4']++;
        else if (de < 0.001) buckets['1e-4 to 1e-3']++;
        else if (de < 0.01) buckets['1e-3 to 1e-2']++;
        else if (de < 0.1) buckets['1e-2 to 1e-1']++;
        else buckets['DE > 1e-1']++;
    });
    console.log(`After ${longTrace.steps} steps (result: ${longTrace.result}):`);
    console.log(`Total distance traveled: ${longTrace.totalDist.toFixed(4)}`);
    Object.entries(buckets).forEach(([range, count]) => {
        const pct = (count / allDEs.length * 100).toFixed(1);
        console.log(`  ${range}: ${count} (${pct}%)`);
    });

    console.log("\n=== EXPERIMENT 6: Bidirectional march ===");
    const biTrace = traceRayBidirectional(foggyOrigin, foggyDir, {
        maxSteps: 500,
        hitThreshold: 0.0001,
        deParams: { scale: -1.5 }
    });
    console.log(`Result: ${biTrace.result}`);
    console.log(`Oscillations (direction changes): ${biTrace.oscillations}`);
}

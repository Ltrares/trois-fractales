// Shared fractal distance estimator code
// Single source of truth for all fractal DEs used in both visual rendering and shadow casting

console.log('[init] fractal-des.js executing...');

// ============ HELPER FUNCTIONS ============

export const boxFoldHelper = `
vec3 boxFold(vec3 z, float limit) {
    return clamp(z, -limit, limit) * 2.0 - z;
}`;

export const sphereFoldHelper = `
void sphereFold(inout vec3 z, inout float dz, float minR2, float fixedR2) {
    float r2 = dot(z, z);
    if (r2 < minR2) {
        float temp = fixedR2 / minR2;
        z *= temp; dz *= temp;
    } else if (r2 < fixedR2) {
        float temp = fixedR2 / r2;
        z *= temp; dz *= temp;
    }
}`;

export const qmulHelper = `
vec4 qmul(vec4 p, vec4 q) {
    return vec4(
        p.x*q.x - p.y*q.y - p.z*q.z - p.w*q.w,
        p.x*q.y + p.y*q.x + p.z*q.w - p.w*q.z,
        p.x*q.z - p.y*q.w + p.z*q.x + p.w*q.y,
        p.x*q.w + p.y*q.z - p.z*q.y + p.w*q.x
    );
}`;

// ============ UNIFORMS ============

export const mandelboxUniforms = `
uniform float u_mandelboxScale;
uniform float u_mandelboxMinR;
uniform float u_mandelboxFixedR;
uniform float u_mandelboxFoldLimit;`;

export const mandelbulbUniforms = `
uniform float u_mandelbulbPower;
uniform float u_mandelbulbPhiPower;
uniform float u_mandelbulbPhase;
uniform float u_mandelbulbPhiPhase;`;

export const juliaUniforms = `
uniform vec4 u_juliaC;`;

// ============ DE TEMPLATE FUNCTIONS ============

/**
 * Mandelbox DE template
 * @param {string} language - 'glsl' for shader string, 'js' for callable function
 * @param {string} fnName - function name ('mandelboxDE' or 'fractalDE') - GLSL only
 * @param {number} iterations - iteration count (10 for shadow, 12 for visual)
 * @param {boolean} earlyBreak - include early break for shadow optimization
 */
export function makeMandelboxDE({ language = 'glsl', fnName = 'mandelboxDE', iterations = 12, earlyBreak = false }) {
    if (language === 'js') {
        // Return actual callable function - iterations/earlyBreak captured in closure
        return function mandelboxDE(px, py, pz, scale, minR, fixedR, foldLimit) {
            let x = px, y = py, z = pz;
            let dz = 1.0;
            const minR2 = minR * minR;
            const fixedR2 = fixedR * fixedR;

            for (let i = 0; i < iterations; i++) {
                // Box fold
                x = Math.max(-foldLimit, Math.min(foldLimit, x)) * 2.0 - x;
                y = Math.max(-foldLimit, Math.min(foldLimit, y)) * 2.0 - y;
                z = Math.max(-foldLimit, Math.min(foldLimit, z)) * 2.0 - z;

                // Sphere fold
                const r2 = x * x + y * y + z * z;
                if (r2 < minR2) {
                    const temp = fixedR2 / minR2;
                    x *= temp; y *= temp; z *= temp; dz *= temp;
                } else if (r2 < fixedR2) {
                    const temp = fixedR2 / r2;
                    x *= temp; y *= temp; z *= temp; dz *= temp;
                }

                // Scale and translate
                x = x * scale + px;
                y = y * scale + py;
                z = z * scale + pz;
                dz = dz * Math.abs(scale) + 1.0;

                if (earlyBreak && x * x + y * y + z * z > 1000) break;
            }

            return Math.sqrt(x * x + y * y + z * z) / Math.abs(dz);
        };
    }

    // GLSL string output
    return `
float ${fnName}(vec3 pos) {
    vec3 z = pos;
    float dz = 1.0;
    float scale = u_mandelboxScale;
    float minR2 = u_mandelboxMinR * u_mandelboxMinR;
    float fixedR2 = u_mandelboxFixedR * u_mandelboxFixedR;
    float foldLimit = u_mandelboxFoldLimit;

    for (int i = 0; i < ${iterations}; i++) {
        z = boxFold(z, foldLimit);
        sphereFold(z, dz, minR2, fixedR2);
        z = z * scale + pos;
        dz = dz * abs(scale) + 1.0;${earlyBreak ? `
        if (dot(z, z) > 1000.0) break;` : ''}
    }

    return length(z) / abs(dz);
}`;
}

/**
 * Mandelbulb DE template
 * @param {string} fnName - function name ('mandelbulbDE' or 'fractalDE')
 * @param {number} iterations - iteration count (12 for both shadow and visual)
 * @param {boolean} forShadow - shadow mode: no iteration tracking
 */
function makeMandelbulbDE({ fnName = 'mandelbulbDE', iterations = 12, forShadow = false }) {
    const normStr = (iterations / 2).toFixed(1);
    return `${forShadow ? '' : `
float g_bulbIter = 0.0;
`}
float ${fnName}(vec3 pos) {
    vec3 z = pos;
    vec3 c = z;
    float dr = 1.0;
    float r = length(z);
    float n = u_mandelbulbPower;
    float np = u_mandelbulbPhiPower;
    float phase = u_mandelbulbPhase;
    float phiPhase = u_mandelbulbPhiPhase;
${forShadow ? '' : `    int escapeIter = ${iterations};
`}
    for (int i = 0; i < ${iterations}; i++) {
        if (r > 2.0) {${forShadow ? '' : ` escapeIter = i;`} break; }

        float theta = atan(z.y, z.x) + phase;
        float phi = asin(z.z / r) + phiPhase;
        dr = pow(r, n - 1.0) * n * dr + 1.0;

        float zr = pow(r, n);
        theta *= n;
        phi *= np;

        z = zr * vec3(cos(phi) * cos(theta), cos(phi) * sin(theta), sin(phi));
        z += c;
        r = length(z);
    }
${forShadow ? '' : `    g_bulbIter = (float(escapeIter) + 1.0 - log2(max(log2(r), 0.001))) / ${normStr};
`}
    return 0.5 * log(r) * r / dr;
}`;
}

/**
 * Julia DE template
 * @param {string} fnName - function name ('juliaDE' or 'fractalDE')
 * @param {number} iterations - iteration count (20 for shadow, 100 for visual)
 * @param {number} escapeThreshold - escape threshold (4.0 for shadow, 16.0 for visual)
 * @param {boolean} forShadow - shadow mode: interior check, no coloring
 */
function makeJuliaDE({ fnName = 'juliaDE', iterations = 100, escapeThreshold = 16.0, forShadow = false }) {
    const escapeStr = escapeThreshold.toFixed(1);
    const normStr = (iterations / 2).toFixed(1);
    return `${forShadow ? '' : `
float g_juliaIter = 0.0;
`}
float ${fnName}(vec3 pos) {
    vec4 q = vec4(pos, 0.0);
    vec4 dq = vec4(1.0, 0.0, 0.0, 0.0);
    vec4 c = u_juliaC;
${forShadow ? `
    float q2 = dot(q, q);
    bool escaped = false;
    for (int i = 0; i < ${iterations}; i++) {
        dq = qmul(2.0 * q, dq);
        q = qmul(q, q) + c;
        q2 = dot(q, q);
        if (q2 > ${escapeStr}) { escaped = true; break; }
    }

    // Interior points (never escaped) are inside the set - force shadow hit
    if (!escaped) return -0.001;

    float r = sqrt(q2);
    float de = 0.5 * r * log(r) / max(length(dq), 0.0001);
    return de;
}` : `
    int escapeIter = ${iterations};
    float q2 = dot(q, q);
    for (int i = 0; i < ${iterations}; i++) {
        dq = qmul(2.0 * q, dq);
        q = qmul(q,q) + c;
        q2 = dot(q, q);
        if (q2 > ${escapeStr}) { escapeIter = i; break; }
    }

    float r = sqrt(q2);
    float dr = length(dq);
    float de = 0.5 * r * log(r) / max(dr, 0.0001);

    g_juliaIter = (float(escapeIter) + 1.0 - log2(max(log2(r), 0.001))) / ${normStr};

    return de;
}`}`;
}

// ============ GENERATED DE FUNCTIONS ============

// Named DEs for gallery shader (all three coexist)
export const mandelboxDEFn = makeMandelboxDE({ fnName: 'mandelboxDE', iterations: 10, earlyBreak: true });
export const mandelbulbDEFn = makeMandelbulbDE({ fnName: 'mandelbulbDE', iterations: 16, forShadow: true });
export const juliaDEFn = makeJuliaDE({ fnName: 'juliaDE', iterations: 20, escapeThreshold: 4.0, forShadow: true });

// Visual DEs (for code display - uses visual quality settings)
export const mandelboxVisualDEFn = makeMandelboxDE({ fnName: 'mandelboxDE', iterations: 12, earlyBreak: false });
export const mandelbulbVisualDEFn = makeMandelbulbDE({ fnName: 'mandelbulbDE', iterations: 16 });
export const juliaVisualDEFn = makeJuliaDE({ fnName: 'juliaDE', iterations: 100, escapeThreshold: 16.0, forShadow: false });

// ============ COMBINED EXPORTS ============

// All helpers needed for shadow casting
export const allHelpers = `${boxFoldHelper}
${sphereFoldHelper}
${qmulHelper}`;

// All DEs for gallery shadow casting (uses shadow-optimized versions)
export const allShadowDEs = `${mandelboxDEFn}
${mandelbulbDEFn}
${juliaDEFn}`;

// ============ TEMPLATE-COMPATIBLE EXPORTS ============
// For fractal-template.js - named 'fractalDE' with uniforms included

export const mandelboxForTemplate = `${mandelboxUniforms}
${boxFoldHelper}
${sphereFoldHelper}
${makeMandelboxDE({ fnName: 'fractalDE', iterations: 12, earlyBreak: false })}`;

export const mandelbulbForTemplate = `${mandelbulbUniforms}
${makeMandelbulbDE({ fnName: 'fractalDE', iterations: 16, forShadow: false })}`;

export const juliaForTemplate = `${juliaUniforms}
${qmulHelper}
${makeJuliaDE({ fnName: 'fractalDE', iterations: 100, escapeThreshold: 16.0, forShadow: false })}`;

// ============ JAVASCRIPT FUNCTION EXPORTS ============
// For CPU-side scanning, validation, and analysis

export const mandelboxDE_JS = makeMandelboxDE({ language: 'js', iterations: 10, earlyBreak: true });

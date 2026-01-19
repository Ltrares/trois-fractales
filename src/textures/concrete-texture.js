// Stained pitted concrete texture generation

// Simple hash function for pseudo-random values
function hash(x, y, seed = 0) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
}

// Smoothstep interpolation
function smoothstep(a, b, t) {
    t = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return t * t * (3 - 2 * t);
}

// Value noise
function noise2D(x, y, seed = 0) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    const a = hash(xi, yi, seed);
    const b = hash(xi + 1, yi, seed);
    const c = hash(xi, yi + 1, seed);
    const d = hash(xi + 1, yi + 1, seed);

    const u = smoothstep(0, 1, xf);
    const v = smoothstep(0, 1, yf);

    return a * (1 - u) * (1 - v) +
           b * u * (1 - v) +
           c * (1 - u) * v +
           d * u * v;
}

// Fractal brownian motion
function fbm(x, y, octaves = 4, seed = 0) {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
        value += amplitude * noise2D(x * frequency, y * frequency, seed + i * 100);
        maxValue += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
    }

    return value / maxValue;
}

// Voronoi-like pattern for pits
function voronoiPits(x, y, scale, seed = 0) {
    const sx = x * scale;
    const sy = y * scale;
    const xi = Math.floor(sx);
    const yi = Math.floor(sy);

    let minDist = 1.0;

    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const cx = xi + dx;
            const cy = yi + dy;
            const px = cx + hash(cx, cy, seed);
            const py = cy + hash(cx, cy, seed + 50);

            const dist = Math.sqrt((sx - px) ** 2 + (sy - py) ** 2);
            minDist = Math.min(minDist, dist);
        }
    }

    return minDist;
}

export function createConcreteTexture(gl, size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    // Base concrete color (dark warm gray)
    const baseR = 95;
    const baseG = 90;
    const baseB = 85;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size;
            const v = y / size;

            // Large-scale color variation (staining) - bigger areas, more contrast
            const stain1 = fbm(u * 1.5, v * 1.5, 3, 42);
            const stain2 = fbm(u * 0.8 + 10, v * 0.8 + 10, 2, 123);
            const stain3 = fbm(u * 2.5, v * 2.5, 4, 88);

            // Medium-scale texture
            const texture = fbm(u * 12, v * 12, 4, 77);

            // Fine grain
            const grain = fbm(u * 40, v * 40, 2, 99);

            // Pits - voronoi-based holes with irregular edges
            const pitNoise = fbm(u * 30, v * 30, 2, 111) * 0.4; // irregularity
            const pitDist = voronoiPits(u, v, 12, 33) + pitNoise * 0.15;
            const pitThreshold = 0.18 + hash(Math.floor(u * 12), Math.floor(v * 12), 200) * 0.12;
            const pit = pitDist < pitThreshold ? smoothstep(pitThreshold, 0, pitDist) : 0;

            // Larger pits (fewer, bigger, more irregular)
            const largePitNoise = fbm(u * 15, v * 15, 3, 222) * 0.5;
            const largePitDist = voronoiPits(u, v, 4, 44) + largePitNoise * 0.2;
            const largePitThreshold = 0.25 + hash(Math.floor(u * 4), Math.floor(v * 4), 201) * 0.15;
            const largePit = largePitDist < largePitThreshold ? smoothstep(largePitThreshold, 0, largePitDist) * 0.7 : 0;

            // Water stain streaks (vertical bias)
            const streak = fbm(u * 6, v * 1.5, 3, 55) * fbm(u * 2, v * 8, 2, 66);

            // Combine all factors
            let brightness = 1.0;

            // Large staining - much stronger contrast
            brightness -= (stain1 - 0.5) * 0.35;
            brightness -= (stain2 - 0.5) * 0.25;
            brightness -= (stain3 - 0.5) * 0.2;

            // Medium texture
            brightness -= (texture - 0.5) * 0.12;

            // Fine grain
            brightness -= (grain - 0.5) * 0.06;

            // Pits darken
            brightness -= pit * 0.35;
            brightness -= largePit * 0.25;

            // Water stains (can lighten or darken)
            brightness -= (streak - 0.3) * 0.08;

            // Clamp - wider range for more contrast
            brightness = Math.max(0.45, Math.min(1.15, brightness));

            // Color variation - rust colored stains
            const colorShift = (stain1 - 0.5) * 0.25 + (stain2 - 0.5) * 0.15 + streak * 0.1;
            const rustAmount = Math.max(0, colorShift) * 1.5; // Only positive shifts go rusty

            let r = baseR * brightness + colorShift * 40 + rustAmount * 45;
            let g = baseG * brightness + colorShift * 5 - rustAmount * 15;
            let b = baseB * brightness - colorShift * 30 - rustAmount * 35;

            // Pits are slightly cooler/darker
            if (pit > 0 || largePit > 0) {
                const pitAmount = Math.max(pit, largePit);
                r -= pitAmount * 15;
                g -= pitAmount * 10;
                b -= pitAmount * 5;
            }

            const idx = (y * size + x) * 4;
            data[idx] = Math.max(0, Math.min(255, Math.round(r)));
            data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
            data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
            data[idx + 3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);

    // Create WebGL texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.generateMipmap(gl.TEXTURE_2D);

    return texture;
}

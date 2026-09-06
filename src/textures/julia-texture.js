// Julia set floor stamp - the same image as the site favicon.
//
// Mirrors tools/make-favicon.py: identical constant, 45 degree view rotation,
// orbit-trap interior and ember palette, so the mark inlaid in the atrium floor
// and the one in the browser tab are the same artwork.

const C_RE = -0.7;
const C_IM = 0.27015;
const MAXIT = 200;

// View half-extent, and the 45 degree rotation that runs this julia's long
// axis corner-to-corner so it fills a square.
const HALF = 1.30;
const COS_A = Math.cos(Math.PI / 4);
const SIN_A = Math.sin(Math.PI / 4);

// Alpha reaches full opacity at this fraction of the normalised escape value.
// Lower = wider glow.
const GLOW_KNEE = 0.62;

// Deliberately more subdued than the favicon's ramps. The favicon has to carry
// at 16px in a browser tab and can afford to be loud; underfoot the mark should
// read as worn inlay in the concrete, so both ramps are desaturated and pulled
// toward the floor's own grey-brown.
//
// Exterior: near-black brown -> muted umber. Stops well short of saturated
// amber so the halo stays a stain rather than a glow.
const EXTERIOR_STOPS = [
    [0.00, [18, 12, 9]],
    [0.45, [58, 40, 28]],
    [0.75, [86, 62, 42]],
    [1.00, [104, 78, 52]],
];

// Interior: bone at the bulb centres falling to dulled bronze.
const INTERIOR_STOPS = [
    [0.00, [226, 216, 196]],
    [0.35, [196, 174, 138]],
    [0.70, [156, 126, 88]],
    [1.00, [116, 88, 58]],
];

function ramp(stops, t) {
    t = Math.max(0, Math.min(1, t));
    for (let i = 0; i < stops.length - 1; i++) {
        const [t0, c0] = stops[i];
        const [t1, c1] = stops[i + 1];
        if (t <= t1) {
            const f = (t - t0) / (t1 - t0);
            return [
                c0[0] + (c1[0] - c0[0]) * f,
                c0[1] + (c1[1] - c0[1]) * f,
                c0[2] + (c1[2] - c0[2]) * f,
            ];
        }
    }
    return stops[stops.length - 1][1];
}

// Iterate one point. Returns the smooth escape count, or -1 for points in the
// set, in which case `out.trap` holds the closest the orbit came to the origin.
function iterate(zr, zi, out) {
    let trap = 1e9;
    for (let i = 0; i < MAXIT; i++) {
        const nr = zr * zr - zi * zi + C_RE;
        zi = 2 * zr * zi + C_IM;
        zr = nr;
        const m2 = zr * zr + zi * zi;
        if (m2 < trap) trap = m2;
        if (m2 > 256.0) {
            return i + 1 - Math.log(Math.log(Math.sqrt(m2))) / Math.LN2;
        }
    }
    out.trap = Math.sqrt(trap);
    return -1;
}

export function createJuliaTexture(gl, size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    const data = img.data;

    // 2x2 supersampling; the floor stamp is seen at a glancing angle, so this
    // is enough to keep the filaments from crawling.
    const SS = 2;
    const out = { trap: 0 };

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            let rs = 0, gs = 0, bs = 0, asum = 0;
            for (let sy = 0; sy < SS; sy++) {
                for (let sx = 0; sx < SS; sx++) {
                    const u = ((x + (sx + 0.5) / SS) / size * 2 - 1) * HALF;
                    const v = ((y + (sy + 0.5) / SS) / size * 2 - 1) * HALF;
                    const e = iterate(u * COS_A - v * SIN_A, u * SIN_A + v * COS_A, out);

                    let c, a;
                    if (e < 0) {
                        // Traps bunch up near zero, so normalise against their
                        // real range and take a root to spread the low end.
                        c = ramp(INTERIOR_STOPS, Math.pow(Math.min(1, out.trap / 0.42), 0.45));
                        a = 255;
                    } else {
                        // e grows without bound near the boundary; log-compress
                        // it so the whole palette range is actually used.
                        const t = Math.min(1, Math.log(1 + e) / Math.log(1 + 45));
                        c = ramp(EXTERIOR_STOPS, t);
                        a = 255 * Math.min(1, Math.pow(t / GLOW_KNEE, 3.0));
                    }
                    // Weight colour by alpha so transparent samples don't drag
                    // the hue toward black along the edges.
                    rs += c[0] * a; gs += c[1] * a; bs += c[2] * a; asum += a;
                }
            }
            const i = (y * size + x) * 4;
            if (asum === 0) {
                data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
            } else {
                data[i] = rs / asum;
                data[i + 1] = gs / asum;
                data[i + 2] = bs / asum;
                data[i + 3] = asum / (SS * SS);
            }
        }
    }

    ctx.putImageData(img, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
}

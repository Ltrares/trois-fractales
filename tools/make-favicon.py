#!/usr/bin/env python3
"""Render the site favicon: a Julia set for c = -0.7 + 0.27015i.

Same constant as the ray marching diagram in src/ui/ray-marching-diagram.js, so
the icon and the site agree. Writes into the repo root:

    favicon.ico          16/32/48, PNG-compressed RGBA
    favicon-32.png       standalone PNG fallback
    favicon-192.png      PWA / high-DPI
    favicon-512.png      PWA / high-DPI
    apple-touch-icon.png 180

Usage:  python3 tools/make-favicon.py

Stdlib only (no Pillow): the PNG chunks and the ICO directory are written by
hand. Takes a few seconds, dominated by the 512 render.
"""

import math
import os
import struct
import zlib

C_RE, C_IM = -0.7, 0.27015
MAXIT = 200

# Alpha reaches full opacity at this fraction of the normalised escape value.
# Lower = wider glow. Tuned so the haze stays tight to the boundary instead of
# fogging the corners of the icon.
GLOW_KNEE = 0.62


def smooth(zr, zi):
    """Escape info for one point.

    Returns (escape, None) for points that escape, where `escape` is the smooth
    (fractional) iteration count; or (None, trap) for points in the set, where
    `trap` is the closest the orbit came to the origin. The orbit trap gives the
    interior visible structure instead of a flat fill.
    """
    trap = 1e9
    for i in range(MAXIT):
        zr, zi = zr*zr - zi*zi + C_RE, 2*zr*zi + C_IM
        m2 = zr*zr + zi*zi
        if m2 < trap:
            trap = m2
        if m2 > 256.0:
            return i + 1 - math.log(math.log(math.sqrt(m2)))/math.log(2), None
    return None, math.sqrt(trap)


def palette(t):
    """t in 0..1, 0 = far outside, 1 = at the set boundary.

    Brown-black -> oxblood -> amber, so the filaments read as embers on both
    light and dark browser tab bars. Deliberately stops short of the pale gold
    used inside the set: the brightest tone belongs to the interior, so that
    the exterior halo does not wash the whole icon out.
    """
    t = max(0.0, min(1.0, t))
    stops = [(0.00, (20, 7, 3)),
             (0.45, (82, 26, 10)),
             (0.75, (130, 48, 14)),
             (1.00, (158, 68, 16))]
    for i in range(len(stops) - 1):
        t0, c0 = stops[i]
        t1, c1 = stops[i + 1]
        if t <= t1:
            f = (t - t0)/(t1 - t0)
            return tuple(int(c0[j] + (c1[j] - c0[j])*f) for j in range(3))
    return stops[-1][1]


def interior(trap):
    """Colour a point inside the set by how close its orbit came to the origin.

    Near-zero traps sit at the centre of each bulb and get the brightest,
    coolest tone; larger traps fall away to a deep indigo, which keeps the
    interior from reading as one flat white mass.

    Traps for this julia bunch up near zero (roughly 0.01..0.41), so a plain
    linear scale would push nearly every interior pixel into the top stop and
    reproduce the flat white fill. Normalise against the real range, then take
    a root to spread the crowded low end across the whole ramp.
    """
    t = max(0.0, min(1.0, trap/0.42))**0.45
    stops = [(0.00, (255, 248, 224)),
             (0.35, (250, 206, 110)),
             (0.70, (228, 146, 44)),
             (1.00, (188, 96, 24))]
    for i in range(len(stops) - 1):
        t0, c0 = stops[i]
        t1, c1 = stops[i + 1]
        if t <= t1:
            f = (t - t0)/(t1 - t0)
            return tuple(int(c0[j] + (c1[j] - c0[j])*f) for j in range(3))
    return stops[-1][1]


def render(size, ss=4):
    """Render one square icon at `size` px with `ss`x`ss` supersampling."""
    # This julia is a wide, flat dendrite. Rotate the view 45 deg so its long
    # axis runs corner-to-corner and it fills the square icon.
    half = 1.30
    ca, sa = math.cos(math.pi/4), math.sin(math.pi/4)
    px = []
    for y in range(size):
        row = []
        for x in range(size):
            rs = gs = bs = 0
            asum = 0
            for sy in range(ss):
                for sx in range(ss):
                    u = (x + (sx + 0.5)/ss)/size*2 - 1
                    v = (y + (sy + 0.5)/ss)/size*2 - 1
                    ur, vr = u*half, v*half
                    zr, zi = ur*ca - vr*sa, ur*sa + vr*ca
                    e, trap = smooth(zr, zi)
                    if e is None:
                        r, g, b = interior(trap)
                        a = 255
                    else:
                        # e grows without bound near the boundary; log-compress
                        # it so the whole 0..1 palette range is actually used.
                        t = min(1.0, math.log(1.0 + e)/math.log(1.0 + 45.0))
                        r, g, b = palette(t)
                        a = int(255*min(1.0, (t/GLOW_KNEE)**3.0))
                    # Weight colour by alpha so transparent samples don't drag
                    # the hue toward black along the edges.
                    rs += r*a
                    gs += g*a
                    bs += b*a
                    asum += a
            if asum == 0:
                row.append((0, 0, 0, 0))
            else:
                row.append((rs//asum, gs//asum, bs//asum, asum//(ss*ss)))
        px.append(row)
    return px


def png_bytes(px):
    """Encode a square RGBA pixel grid as a PNG."""
    size = len(px)
    raw = b''.join(b'\x00' + b''.join(struct.pack('BBBB', *p) for p in row)
                   for row in px)

    def chunk(tag, data):
        c = tag + data
        return (struct.pack('>I', len(data)) + c
                + struct.pack('>I', zlib.crc32(c) & 0xffffffff))

    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))


def ico_bytes(images):
    """Pack {size: pixels} into an ICO holding each entry as an embedded PNG."""
    sizes = sorted(images)
    entries, blobs = [], []
    offset = 6 + 16*len(sizes)   # header + one 16-byte directory entry each
    for s in sizes:
        blob = png_bytes(images[s])
        # A 0 in the width/height byte means 256; every size here is smaller.
        entries.append(struct.pack('<BBBBHHII', s, s, 0, 0, 1, 32,
                                   len(blob), offset))
        offset += len(blob)
        blobs.append(blob)
    return (struct.pack('<HHH', 0, 1, len(sizes))
            + b''.join(entries) + b''.join(blobs))


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    images = {}
    for s in (16, 32, 48, 180, 192, 512):
        # The small sizes need the extra samples; the big ones are already
        # fine at 2x and 4x would just be slow.
        images[s] = render(s, ss=4 if s <= 48 else 2)
        print('rendered', s)

    for s, name in [(32, 'favicon-32.png'),
                    (180, 'apple-touch-icon.png'),
                    (192, 'favicon-192.png'),
                    (512, 'favicon-512.png')]:
        path = os.path.join(root, name)
        with open(path, 'wb') as f:
            f.write(png_bytes(images[s]))
        print('wrote', name)

    path = os.path.join(root, 'favicon.ico')
    with open(path, 'wb') as f:
        f.write(ico_bytes({s: images[s] for s in (16, 32, 48)}))
    print('wrote favicon.ico')


if __name__ == '__main__':
    main()

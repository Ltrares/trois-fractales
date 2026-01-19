// Easing functions
export const EASING = {
    linear: t => t,
    easeInOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    easeOutCubic: t => 1 - Math.pow(1 - t, 3),
};

// Catmull-Rom spline interpolation
// Takes 4 points: p0, p1, p2, p3 - interpolates between p1 and p2
export function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (
        (2 * p1) +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
}

// Waypoint-based phase space animation for fractal sculptures

console.log('[init] fractal-animation.js executing...');

import { EASING, catmullRom } from '../utils/easing.js';
import { PARAM_RANGES, randomInRange, randomJuliaC, sampleMandelboxCoverage, mandelboxOverflows } from './fractal-config.js';
import { FRACTALS } from '../geometry/GalleryGeometry.js';

export class WaypointAnimator {
    constructor(config) {
        this.generateWaypoint = config.generateWaypoint;
        this.rate = config.rate || 0.1;
        this.baseRate = this.rate;
        this.queueSize = Math.max(config.queueSize || 4, 4);
        this.easing = config.easing || EASING.linear;
        this.name = config.name || 'unnamed';
        this.useSpline = config.useSpline !== false;
        this.initialWaypoint = config.initialWaypoint || null;
        this.paramRanges = config.paramRanges || null;  // For distance normalization

        this.waypoints = [];
        // Use initial waypoint for first two slots if provided (ensures it's the starting state)
        if (this.initialWaypoint) {
            this.waypoints.push(this._deepClone(this.initialWaypoint));
            this.waypoints.push(this._deepClone(this.initialWaypoint));
        }
        while (this.waypoints.length < this.queueSize) {
            this.waypoints.push(this.generateWaypoint());
        }

        this.t = 0;
        this.current = this._deepClone(this.waypoints[1]);
        this.segmentDistance = this._calcSegmentDistance();  // Distance for current segment
    }

    reset() {
        this.waypoints = [];
        for (let i = 0; i < this.queueSize; i++) {
            this.waypoints.push(this.generateWaypoint());
        }
        this.t = 0;
        this.current = this._deepClone(this.waypoints[1]);
        this.segmentDistance = this._calcSegmentDistance();
    }

    // Calculate normalized distance between waypoints[1] and waypoints[2]
    // Used to scale rate so velocity is constant regardless of param delta
    _calcSegmentDistance() {
        if (!this.paramRanges || this.waypoints.length < 3) return 1.0;

        const from = this.waypoints[1];
        const to = this.waypoints[2];
        let sumSq = 0;

        for (const key in this.paramRanges) {
            if (from[key] === undefined || to[key] === undefined) continue;
            const range = this.paramRanges[key].max - this.paramRanges[key].min;
            if (range > 0) {
                const delta = (to[key] - from[key]) / range;  // Normalize to 0-1
                sumSq += delta * delta;
            }
        }

        // Return Euclidean distance, clamped to reasonable range
        return Math.max(0.1, Math.sqrt(sumSq));
    }

    _deepClone(obj) {
        if (Array.isArray(obj)) return obj.map(x => this._deepClone(x));
        if (typeof obj === 'object' && obj !== null) {
            const clone = {};
            for (const key in obj) clone[key] = this._deepClone(obj[key]);
            return clone;
        }
        return obj;
    }

    _lerp(a, b, t) {
        if (Array.isArray(a)) {
            return a.map((v, i) => this._lerp(v, b[i], t));
        }
        if (typeof a === 'object' && a !== null) {
            const result = {};
            for (const key in a) result[key] = this._lerp(a[key], b[key], t);
            return result;
        }
        return a + (b - a) * t;
    }

    _spline(p0, p1, p2, p3, t) {
        if (Array.isArray(p0)) {
            return p0.map((_, i) => this._spline(p0[i], p1[i], p2[i], p3[i], t));
        }
        if (typeof p0 === 'object' && p0 !== null) {
            const result = {};
            for (const key in p0) {
                result[key] = this._spline(p0[key], p1[key], p2[key], p3[key], t);
            }
            return result;
        }
        return catmullRom(p0, p1, p2, p3, t);
    }

    update(dt) {
        // Adaptive rate: slow near waypoints (t≈0,1), fast during transitions (t≈0.5)
        // More contrast: hover longer at waypoints, zip through middle
        // At t=0,1: 0.02, at t=0.5: 1.02 (ratio ~50x)
        let rateFactor = 0.02 + 4.0 * this.t * (1.0 - this.t);

        // Scale by segment distance: longer distances take proportionally longer
        // This keeps perceived velocity constant in parameter space
        const distanceScale = 1.0 / this.segmentDistance;
        this.t += dt * this.rate * rateFactor * distanceScale;

        while (this.t >= 1.0) {
            this.t -= 1.0;
            this.waypoints.shift();
            this.waypoints.push(this.generateWaypoint());
            this.segmentDistance = this._calcSegmentDistance();  // Recalc for new segment
        }

        if (this.useSpline) {
            this.current = this._spline(
                this.waypoints[0],
                this.waypoints[1],
                this.waypoints[2],
                this.waypoints[3],
                this.t
            );
        } else {
            const easedT = this.easing(this.t);
            this.current = this._lerp(this.waypoints[1], this.waypoints[2], easedT);
        }
    }

    getCurrent() {
        return this.current;
    }

    setRate(rate) {
        this.rate = rate;
    }

    setEasing(easingFn) {
        this.easing = easingFn;
    }

    getDebugInfo() {
        return {
            name: this.name,
            rate: this.rate,
            progress: this.t,
            segmentDistance: this.segmentDistance,
            queueLength: this.waypoints.length,
            current: this.current,
            target: this.waypoints[2],
            useSpline: this.useSpline
        };
    }
}

// How much fractal space the hologram can actually show, in fractal units.
// Derived from the display geometry so it tracks any change to either value.
const DISPLAYABLE = FRACTALS.mandelbox.bboxHalf[0] / FRACTALS.mandelbox.scale;

// A waypoint may reach this multiple of the displayable region before it is
// rejected as mostly-clipped. 1.0 would demand the whole shape fit, which
// discards two thirds of otherwise good parameters and loses the cross-section
// look entirely; 2.0 keeps shapes that overflow moderately and drops the tail
// that renders as a plain cube.
const MAX_OVERFLOW_RATIO = 2.0;

// Generate random mandelbox params, retrying until non-degenerate
function randomNonDegenerateMandelbox() {
    for (let attempt = 0; attempt < 50; attempt++) {
        const params = {
            scale: randomInRange(PARAM_RANGES.mandelbox.scale),
            minR: randomInRange(PARAM_RANGES.mandelbox.minR),
            fixedR: randomInRange(PARAM_RANGES.mandelbox.fixedR),
            foldLimit: randomInRange(PARAM_RANGES.mandelbox.foldLimit),
            rotation: [0, 0, 0]
        };
        // Cheap test first: is there anything there at all?
        if (sampleMandelboxCoverage(params) === 0) continue;
        // Then: is so much of it outside the display that it reads as a block?
        if (mandelboxOverflows(params, DISPLAYABLE * MAX_OVERFLOW_RATIO)) continue;
        return params;
    }
    // Fallback to known-good params
    return { scale: -1.5, minR: 0.5, fixedR: 1.0, foldLimit: 1.0, rotation: [0, 0, 0] };
}

// Create animators for each sculpture
export function createSculptureAnimators() {
    let lastMandelbulbPower = Math.round(randomInRange(PARAM_RANGES.mandelbulb.power));

    return {
        mandelbox: new WaypointAnimator({
            name: 'mandelbox',
            rate: 0.04,  // Base rate (scaled by segment distance) - 50% slower base
            paramRanges: PARAM_RANGES.mandelbox,  // For distance normalization
            initialWaypoint: randomNonDegenerateMandelbox(),
            generateWaypoint: randomNonDegenerateMandelbox
        }),
        mandelbulb: new WaypointAnimator({
            name: 'mandelbulb',
            rate: 0.01,
            generateWaypoint: () => {
                let newPower = lastMandelbulbPower + (Math.random() * 3 - 1.5);
                newPower = Math.max(1.0, Math.min(12, newPower));
                if (newPower >= 2) newPower = Math.round(newPower);
                lastMandelbulbPower = newPower;

                return {
                    power: newPower,
                    phiPower: randomInRange(PARAM_RANGES.mandelbulb.phiPower),
                    phase: randomInRange(PARAM_RANGES.mandelbulb.phase),
                    phiPhase: randomInRange(PARAM_RANGES.mandelbulb.phiPhase),
                    rotation: [0, 0, 0]
                };
            }
        }),
        julia: new WaypointAnimator({
            name: 'julia',
            rate: 0.05,
            generateWaypoint: () => ({
                c: randomJuliaC(),   // Use boundary-seeking generator for tubes
                c2: randomJuliaC(),  // Both endpoints should be tube-producing
                mix: 0, //randomInRange(PARAM_RANGES.julia.mix),
                rot: [0, 0, 0],  // No rotation - user can move around to view
                slice: 0.0  // 4D slice offset
            })
        })
    };
}

// Advance every animator by dt (seconds) and return the current params.
// Pass dt = 0 to sample without advancing, which is how a held frame is drawn.
export function getFractalParams(animators, dt) {
    for (const key in animators) {
        animators[key].update(dt);
    }

    return {
        mandelbox: animators.mandelbox.getCurrent(),
        mandelbulb: animators.mandelbulb.getCurrent(),
        julia: animators.julia.getCurrent()
    };
}

// Waypoint-based phase space animation for fractal sculptures

console.log('[init] fractal-animation.js executing...');

import { EASING, catmullRom } from '../utils/easing.js';
import { PARAM_RANGES, randomInRange, randomJuliaC, sampleMandelboxCoverage } from './fractal-config.js';

export class WaypointAnimator {
    constructor(config) {
        this.generateWaypoint = config.generateWaypoint;
        this.rate = config.rate || 0.0001;
        this.baseRate = this.rate;
        this.queueSize = Math.max(config.queueSize || 4, 4);
        this.easing = config.easing || EASING.linear;
        this.name = config.name || 'unnamed';
        this.useSpline = config.useSpline !== false;
        this.initialWaypoint = config.initialWaypoint || null;
        this.externalDegeneracy = 0;  // Set via setExternalDegeneracy() from GPU sampling
        this.degeneracySpeedup = config.degeneracySpeedup || 5.0;  // How much faster in degenerate regions
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

    update(dtMs) {
        // Adaptive rate: slow near waypoints (t≈0,1), fast during transitions (t≈0.5)
        // More contrast: hover longer at waypoints, zip through middle
        // At t=0,1: 0.02, at t=0.5: 1.02 (ratio ~50x)
        let rateFactor = 0.02 + 4.0 * this.t * (1.0 - this.t);

        // Speed up through degenerate parameter regions (from GPU coverage sampling)
        // TEMPORARILY DISABLED - distance-based rate should handle this now
        // if (this.externalDegeneracy > 0) {
        //     rateFactor *= 1.0 + this.externalDegeneracy * (this.degeneracySpeedup - 1.0);
        // }

        // Scale by segment distance: longer distances take proportionally longer
        // This keeps perceived velocity constant in parameter space
        const distanceScale = 1.0 / this.segmentDistance;
        this.t += dtMs * this.rate * rateFactor * distanceScale;

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

    // Set degeneracy from external source (e.g., GPU coverage sampling)
    // This overrides the internal heuristic when set
    setExternalDegeneracy(value) {
        this.externalDegeneracy = value;
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
        if (sampleMandelboxCoverage(params) > 0) {
            return params;
        }
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
            rate: 0.00004,  // Base rate (scaled by segment distance) - 50% slower base
            degeneracySpeedup: 20.0,  // 20x faster through degenerate regions
            paramRanges: PARAM_RANGES.mandelbox,  // For distance normalization
            initialWaypoint: randomNonDegenerateMandelbox(),
            generateWaypoint: randomNonDegenerateMandelbox
        }),
        mandelbulb: new WaypointAnimator({
            name: 'mandelbulb',
            rate: 0.00001,
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
            rate: 0.00005,
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

// Get current fractal params from all animators
export function getFractalParams(animators, time, lastAnimTime) {
    const dt = lastAnimTime === null ? 16 : (time - lastAnimTime);

    for (const key in animators) {
        animators[key].update(dt);
    }

    return {
        mandelbox: animators.mandelbox.getCurrent(),
        mandelbulb: animators.mandelbulb.getCurrent(),
        julia: animators.julia.getCurrent()
    };
}

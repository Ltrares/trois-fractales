// Ray marching explanation diagram
// Show exact ray intersections vs ray marching approximations

export class RayMarchingDiagram {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.time = 0;
        this.running = false;
        this.animationId = null;

        // Julia set parameters
        this.juliaC = { re: -0.7, im: 0.27015 };
        this.juliaScale = 80;
        this.juliaCenter = { x: this.width * 0.65, y: this.height / 2 };
        this.maxIterations = 50;

        // Pre-render fractals (accurate and inaccurate)
        this.fractalCanvas = null;
        this.inaccurateFractalCanvas = null;
        this.renderFractals();

        // Ray origin
        this.rayOrigin = { x: 30, y: this.height / 2 };

        // Multiple rays at different angles
        this.rayAngles = [-0.4, -0.2, -0.05, 0.1, 0.25, 0.4];
        this.rays = [];
        this.calculateRays();

        // Animation state
        // Modes: 'exact', 'stepping', 'result'
        // exact: show accurate fractal with exact ray hits
        // stepping: animate ray marching process step by step
        // result: show final ray marching result vs exact
        this.mode = 'exact';
        this.stepAnimIndex = 0; // Which step we're animating
    }

    // Check if point is inside Julia set (accurate - many iterations)
    isInsideJulia(x, y) {
        const zRe = (x - this.juliaCenter.x) / this.juliaScale;
        const zIm = (y - this.juliaCenter.y) / this.juliaScale;

        let re = zRe, im = zIm;

        for (let i = 0; i < this.maxIterations; i++) {
            if (re * re + im * im > 4) return false;
            const newRe = re * re - im * im + this.juliaC.re;
            const newIm = 2 * re * im + this.juliaC.im;
            re = newRe;
            im = newIm;
        }
        return true;
    }

    // Estimate distance (inaccurate - few iterations)
    estimateDistance(x, y) {
        const zRe = (x - this.juliaCenter.x) / this.juliaScale;
        const zIm = (y - this.juliaCenter.y) / this.juliaScale;

        let re = zRe, im = zIm;
        let dRe = 1, dIm = 0;

        for (let i = 0; i < 5; i++) { // Very few iterations = inaccurate
            const r2 = re * re + im * im;
            if (r2 > 4) {
                const r = Math.sqrt(r2);
                const dr = Math.sqrt(dRe * dRe + dIm * dIm);
                if (dr === 0) return 1;
                return (r * Math.log(r) / dr) * this.juliaScale;
            }

            const newDRe = 2 * (re * dRe - im * dIm);
            const newDIm = 2 * (re * dIm + im * dRe);
            dRe = newDRe;
            dIm = newDIm;

            const newRe = re * re - im * im + this.juliaC.re;
            const newIm = 2 * re * im + this.juliaC.im;
            re = newRe;
            im = newIm;
        }
        return -1;
    }

    // Check with few iterations (what ray marcher sees)
    isInsideJuliaInaccurate(x, y) {
        const zRe = (x - this.juliaCenter.x) / this.juliaScale;
        const zIm = (y - this.juliaCenter.y) / this.juliaScale;

        let re = zRe, im = zIm;

        for (let i = 0; i < this.maxIterations; i++) { // Very few iterations = visibly wrong
            if (re * re + im * im > 4) return false;
            const newRe = re * re - im * im + this.juliaC.re;
            const newIm = 2 * re * im + this.juliaC.im;
            re = newRe;
            im = newIm;
        }
        return true;
    }

    // Pre-render both fractals
    renderFractals() {
        // Accurate fractal (many iterations)
        this.fractalCanvas = document.createElement('canvas');
        this.fractalCanvas.width = this.width;
        this.fractalCanvas.height = this.height;
        const ctx = this.fractalCanvas.getContext('2d');

        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        const data = imageData.data;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.isInsideJulia(x, y)) {
                    const idx = (y * this.width + x) * 4;
                    data[idx] = 74;
                    data[idx + 1] = 158;
                    data[idx + 2] = 255;
                    data[idx + 3] = 255;
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);

        // Inaccurate fractal (few iterations - what ray marcher sees)
        this.inaccurateFractalCanvas = document.createElement('canvas');
        this.inaccurateFractalCanvas.width = this.width;
        this.inaccurateFractalCanvas.height = this.height;
        const ctx2 = this.inaccurateFractalCanvas.getContext('2d');

        const imageData2 = ctx2.getImageData(0, 0, this.width, this.height);
        const data2 = imageData2.data;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.isInsideJuliaInaccurate(x, y)) {
                    const idx = (y * this.width + x) * 4;
                    data2[idx] = 255;
                    data2[idx + 1] = 170;
                    data2[idx + 2] = 100;
                    data2[idx + 3] = 255;
                }
            }
        }
        ctx2.putImageData(imageData2, 0, 0);
    }

    // Find exact intersection by checking every pixel
    findExactIntersection(angle) {
        const dir = { x: Math.cos(angle), y: Math.sin(angle) };
        let x = this.rayOrigin.x;
        let y = this.rayOrigin.y;

        for (let t = 0; t < 600; t++) {
            x = this.rayOrigin.x + dir.x * t;
            y = this.rayOrigin.y + dir.y * t;

            if (x > this.width || y < 0 || y > this.height) {
                return { x, y, hit: false };
            }

            if (this.isInsideJulia(x, y)) {
                return { x, y, hit: true };
            }
        }
        return { x, y, hit: false };
    }

    // Find ray marching intersection (by jumping)
    // Uses inaccurate checks - this is what ray marcher actually sees
    findRayMarchIntersection(angle) {
        const dir = { x: Math.cos(angle), y: Math.sin(angle) };
        let x = this.rayOrigin.x;
        let y = this.rayOrigin.y;
        const steps = [{ x, y }];

        for (let i = 0; i < 30; i++) {
            const dist = this.estimateDistance(x, y);

            if (x > this.width || y < 0 || y > this.height) {
                return { x, y, hit: false, steps };
            }

            // Jump by estimated distance (can be wrong with few iterations!)
            const prevX = x, prevY = y;
            const stepSize = Math.max(dist, 1);
            x += dir.x * stepSize;
            y += dir.y * stepSize;

            // Check if we entered OR crossed through the INACCURATE shape
            // Sample several points along the jump to detect crossing through
            let crossedThrough = false;
            for (let t = 0.2; t <= 1; t += 0.2) {
                const testX = prevX + (x - prevX) * t;
                const testY = prevY + (y - prevY) * t;
                if (this.isInsideJuliaInaccurate(testX, testY)) {
                    crossedThrough = true;
                    break;
                }
            }

            if (dist < 2 || dist < 0 || crossedThrough) {
                // Binary search to find boundary
                let lo = 0, hi = 1;
                for (let j = 0; j < 8; j++) {
                    const mid = (lo + hi) / 2;
                    const testX = prevX + (x - prevX) * mid;
                    const testY = prevY + (y - prevY) * mid;
                    if (this.isInsideJuliaInaccurate(testX, testY)) {
                        hi = mid;
                    } else {
                        lo = mid;
                    }
                }
                // Use the boundary point
                x = prevX + (x - prevX) * lo;
                y = prevY + (y - prevY) * lo;
                steps.push({ x, y });

                // Did we overshoot the REAL shape?
                const overshoot = this.isInsideJulia(x, y);
                return { x, y, hit: true, steps, overshot: overshoot };
            }

            steps.push({ x, y });
        }

        return { x, y, hit: false, steps };
    }

    calculateRays() {
        this.rays = this.rayAngles.map(angle => ({
            angle,
            exact: this.findExactIntersection(angle),
            marched: this.findRayMarchIntersection(angle)
        }));
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.time = 0;
        this.mode = 'exact';
        this.lastTime = performance.now();
        this.animate();
    }

    stop() {
        this.running = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    animate() {
        if (!this.running) return;

        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        this.time += dt;

        // Cycle through modes
        if (this.mode === 'exact' && this.time > 3) {
            this.mode = 'stepping';
            this.stepAnimIndex = 0;
            this.time = 0;
        } else if (this.mode === 'stepping') {
            // Advance step every 0.4 seconds
            const maxSteps = Math.max(...this.rays.map(r => r.marched.steps.length));
            const newIndex = Math.floor(this.time / 0.4);
            this.stepAnimIndex = newIndex;

            if (newIndex > maxSteps + 2) {
                this.mode = 'result';
                this.time = 0;
            }
        } else if (this.mode === 'result' && this.time > 3) {
            this.mode = 'exact';
            this.time = 0;
        }

        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    draw() {
        const ctx = this.ctx;

        // Clear
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw fractal(s)
        if (this.mode === 'exact') {
            // Show accurate fractal
            if (this.fractalCanvas) {
                ctx.drawImage(this.fractalCanvas, 0, 0);
            }
        } else {
            // Show accurate fractal dimmed
            if (this.fractalCanvas) {
                ctx.globalAlpha = 0.2;
                ctx.drawImage(this.fractalCanvas, 0, 0);
                ctx.globalAlpha = 1;
            }
            // Overlay inaccurate fractal (what ray marcher sees)
            if (this.inaccurateFractalCanvas) {
                ctx.globalAlpha = 0.6;
                ctx.drawImage(this.inaccurateFractalCanvas, 0, 0);
                ctx.globalAlpha = 1;
            }
        }

        // Draw eye
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👁', this.rayOrigin.x, this.rayOrigin.y + 5);

        if (this.mode === 'exact') {
            this.drawExactRays(ctx);
        } else if (this.mode === 'stepping') {
            this.drawStepping(ctx);
        } else {
            this.drawMarchedRays(ctx);
        }

        // Labels
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';

        if (this.mode === 'exact') {
            ctx.fillText('Step 1: The actual fractal (checking every pixel)', 10, 20);
            ctx.fillStyle = '#888';
            ctx.font = '11px sans-serif';
            ctx.fillText('Accurate but slow', 10, 35);
        } else if (this.mode === 'stepping') {
            ctx.fillText('Step 2: Ray marching - guess distance, jump, repeat', 10, 20);
            ctx.fillStyle = '#888';
            ctx.font = '11px sans-serif';
            ctx.fillText('Each dot = one distance check. Much fewer checks!', 10, 35);
        } else {
            ctx.fillText('Step 3: Result - ray marching hits the wrong places', 10, 20);
            ctx.fillStyle = '#888';
            ctx.font = '11px sans-serif';
            ctx.fillText('Orange = what ray marcher sees (fewer iterations)', 10, 35);
        }
    }

    drawStepping(ctx) {
        // Show the ray marching process animated step by step
        for (const ray of this.rays) {
            const marched = ray.marched;
            const stepsToShow = Math.min(this.stepAnimIndex, marched.steps.length);

            if (stepsToShow === 0) continue;

            // Draw ray line through visible steps
            ctx.strokeStyle = '#ffd93d';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.rayOrigin.x + 10, this.rayOrigin.y);

            for (let i = 0; i < stepsToShow; i++) {
                ctx.lineTo(marched.steps[i].x, marched.steps[i].y);
            }
            ctx.stroke();

            // Draw step points
            for (let i = 0; i < stepsToShow; i++) {
                const step = marched.steps[i];
                const isCurrent = (i === stepsToShow - 1);

                ctx.fillStyle = isCurrent ? '#fff' : 'rgba(255, 217, 61, 0.6)';
                ctx.beginPath();
                ctx.arc(step.x, step.y, isCurrent ? 5 : 3, 0, Math.PI * 2);
                ctx.fill();

                // Show "jump" arrow for current step
                if (isCurrent && i < marched.steps.length - 1) {
                    const next = marched.steps[i + 1];
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    ctx.moveTo(step.x, step.y);
                    ctx.lineTo(next.x, next.y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }

            // Show final hit if we've reached it
            if (stepsToShow >= marched.steps.length && marched.hit) {
                ctx.fillStyle = marched.overshot ? '#ff6b6b' : '#6bcf7f';
                ctx.beginPath();
                ctx.arc(marched.x, marched.y, 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawExactRays(ctx) {
        for (const ray of this.rays) {
            const end = ray.exact;

            // Ray line
            ctx.strokeStyle = '#6bcf7f';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.rayOrigin.x + 10, this.rayOrigin.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            // Hit point
            if (end.hit) {
                ctx.fillStyle = '#6bcf7f';
                ctx.beginPath();
                ctx.arc(end.x, end.y, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawMarchedRays(ctx) {
        for (const ray of this.rays) {
            const end = ray.marched;
            const exact = ray.exact;

            // Show exact hit as faint reference
            if (exact.hit) {
                ctx.fillStyle = 'rgba(107, 207, 127, 0.3)';
                ctx.beginPath();
                ctx.arc(exact.x, exact.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Ray line - draw through all step points
            ctx.strokeStyle = end.overshot ? '#ff6b6b' : '#ffd93d';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.rayOrigin.x + 10, this.rayOrigin.y);
            for (const step of end.steps) {
                ctx.lineTo(step.x, step.y);
            }
            // Draw to final hit point
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            // Step points (show the jumps)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            for (const step of end.steps) {
                ctx.beginPath();
                ctx.arc(step.x, step.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Final hit point
            ctx.fillStyle = end.overshot ? '#ff6b6b' : '#ffd93d';
            ctx.beginPath();
            ctx.arc(end.x, end.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.juliaCenter = { x: width * 0.65, y: height / 2 };
        this.renderFractals();
        this.calculateRays();
    }
}

export function createStandaloneDemo(container) {
    const canvas = document.createElement('canvas');
    canvas.width = 450;
    canvas.height = 200;
    canvas.style.borderRadius = '8px';
    canvas.style.border = '1px solid #333';
    container.appendChild(canvas);

    const diagram = new RayMarchingDiagram(canvas);
    diagram.start();

    return diagram;
}

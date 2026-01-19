console.log('[init] slides-texture.js executing...');
// Animated slides texture for gallery floor display
// Shows one slide at a time in sequence, with pause support

export const SLIDE_WIDTH = 1024;
export const SLIDE_HEIGHT = 768;
export const SLIDE_DURATION = 30000; // 30 seconds per slide before advancing

// All slide definitions with render functions
// Each render function: (ctx, canvas, time) => void
// Exported for use by slides-preview.html
export const slides = [
    // =====================================================
    // SLIDE 1: Chaos Fog - Multi-phase slideshow
    // =====================================================
    {
        meta: { topic: 'chaos-fog' },
        render: (ctx, canvas, time) => {
            // Phase timing (milliseconds)
            const phaseDuration = 6000;
            const transitionDuration = 800;
            const numPhases = 5;
            const totalCycle = phaseDuration * numPhases;
            const cycleTime = time % totalCycle;
            const phase = Math.floor(cycleTime / phaseDuration);
            const phaseTime = cycleTime % phaseDuration;

            // Calculate fade for transitions
            let fadeIn = 1, fadeOut = 1;
            if (phaseTime < transitionDuration) {
                fadeIn = phaseTime / transitionDuration;
            }
            if (phaseTime > phaseDuration - transitionDuration) {
                fadeOut = (phaseDuration - phaseTime) / transitionDuration;
            }
            const alpha = Math.min(fadeIn, fadeOut);

            // Common dark background
            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // ===== PHASE 0: Title =====
            if (phase === 0) {
                // Animated dark gradient background
                const grad = ctx.createRadialGradient(
                    canvas.width/2, canvas.height/2, 0,
                    canvas.width/2, canvas.height/2, canvas.width * 0.6
                );
                const pulse = 0.3 + 0.1 * Math.sin(time * 0.001);
                grad.addColorStop(0, `rgba(0,0,0,1)`);
                grad.addColorStop(pulse, `rgba(20,0,40,1)`);
                grad.addColorStop(1, `rgba(0,0,0,1)`);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Swirling fog particles
                ctx.fillStyle = `rgba(100,50,150,${0.3 * alpha})`;
                for (let i = 0; i < 20; i++) {
                    const angle = time * 0.0005 + i * 0.314;
                    const r = 100 + i * 15 + 20 * Math.sin(time * 0.002 + i);
                    const x = canvas.width/2 + r * Math.cos(angle);
                    const y = canvas.height/2 + r * Math.sin(angle);
                    ctx.beginPath();
                    ctx.arc(x, y, 30 + 10 * Math.sin(i), 0, Math.PI * 2);
                    ctx.fill();
                }

                // Title
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#fff';
                ctx.font = '600 64px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('"Mom! There\'s a black hole', canvas.width/2, canvas.height/2 - 40);
                ctx.fillText('in my fractal!"', canvas.width/2, canvas.height/2 + 40);

                ctx.font = '400 32px Georgia, serif';
                ctx.fillStyle = '#aaa';
                ctx.fillText('The Chaos Fog Problem', canvas.width/2, canvas.height - 100);
                ctx.globalAlpha = 1;
            }

            // ===== PHASE 1: Ray Diagram - What's happening =====
            else if (phase === 1) {
                ctx.globalAlpha = alpha;

                // Title
                ctx.fillStyle = '#fff';
                ctx.font = '600 36px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText('What happens to rays that don\'t hit and don\'t escape?', canvas.width/2, 50);

                // Draw chaos zone (fuzzy region, not a surface)
                const zoneX = 480, zoneY = canvas.height/2 - 30;
                const zoneR = 140;

                // Fuzzy boundary
                for (let r = zoneR + 40; r > zoneR - 20; r -= 8) {
                    ctx.strokeStyle = `rgba(100, 60, 140, ${0.15 + (zoneR - r) * 0.01})`;
                    ctx.lineWidth = 12;
                    ctx.beginPath();
                    ctx.arc(zoneX, zoneY, r + 10 * Math.sin(time * 0.001 + r * 0.1), 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Label
                ctx.fillStyle = '#a7f';
                ctx.font = '20px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText('Chaos Zone', zoneX, zoneY - zoneR - 30);
                ctx.fillStyle = '#777';
                ctx.font = '16px Georgia, serif';
                ctx.fillText('(no surface here)', zoneX, zoneY - zoneR - 10);

                // Draw camera/eye
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(80, canvas.height/2, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.font = '18px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText('Camera', 80, canvas.height/2 + 40);

                // Animate a ray that enters and bounces chaotically
                const loopTime = phaseTime % 5000;
                const t = loopTime / 5000;

                // Entry path (straight until zone)
                ctx.strokeStyle = '#e55';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(95, canvas.height/2);
                ctx.lineTo(zoneX - zoneR + 20, zoneY);
                ctx.stroke();

                // Chaotic path inside zone (precomputed wandering)
                const seed = 12345;
                const chaosPoints = [];
                let cx = zoneX - zoneR + 40, cy = zoneY;
                for (let i = 0; i < 25; i++) {
                    chaosPoints.push({x: cx, y: cy});
                    // Pseudo-random walk that stays in zone
                    const angle = (seed * (i + 1) * 0.618) % (Math.PI * 2);
                    const step = 25 + 20 * Math.sin(i * 0.7);
                    cx += Math.cos(angle) * step;
                    cy += Math.sin(angle) * step;
                    // Keep in zone
                    const dx = cx - zoneX, dy = cy - zoneY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist > zoneR - 20) {
                        cx = zoneX + dx * (zoneR - 20) / dist;
                        cy = zoneY + dy * (zoneR - 20) / dist;
                    }
                }

                // Draw chaotic path up to current progress
                const visiblePoints = Math.floor(t * chaosPoints.length);
                if (visiblePoints > 1) {
                    ctx.strokeStyle = '#f77';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(chaosPoints[0].x, chaosPoints[0].y);
                    for (let i = 1; i < visiblePoints; i++) {
                        ctx.lineTo(chaosPoints[i].x, chaosPoints[i].y);
                    }
                    ctx.stroke();

                    // Current position
                    const curr = chaosPoints[Math.min(visiblePoints, chaosPoints.length - 1)];
                    ctx.fillStyle = '#f88';
                    ctx.beginPath();
                    ctx.arc(curr.x, curr.y, 6, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Annotations
                ctx.textAlign = 'left';
                const textY = canvas.height - 200;
                ctx.fillStyle = '#e88';
                ctx.font = '22px Georgia, serif';
                ctx.fillText('The Problem:', 60, textY);
                ctx.fillStyle = '#ccc';
                ctx.font = '20px Georgia, serif';
                ctx.fillText('Ray enters a region with no clear surface', 60, textY + 35);
                ctx.fillText('Distance estimates stay small but erratic', 60, textY + 65);
                ctx.fillText('Ray wanders chaotically, never converges', 60, textY + 95);
                ctx.fillText('No hit, no escape, just endless bouncing', 60, textY + 125);

                ctx.fillStyle = '#f88';
                ctx.font = '600 22px Georgia, serif';
                ctx.fillText('Max iterations hit. We call it "fog".', 60, textY + 165);

                ctx.globalAlpha = 1;
            }

            // ===== PHASE 2: What the fog shows =====
            else if (phase === 2) {
                ctx.globalAlpha = alpha;

                // Title
                ctx.fillStyle = '#fff';
                ctx.font = '600 36px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText('The Fog: Visualizing Ray Struggle', canvas.width/2, 50);

                // Draw a simple fractal-ish shape with fog regions
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2 - 20;

                // Draw "fog" regions - areas of high iteration
                const fogTime = time * 0.001;
                for (let i = 0; i < 40; i++) {
                    const angle = i * 0.157 + fogTime * 0.2;
                    const baseR = 120 + 60 * Math.sin(i * 0.5);
                    const r = baseR + 20 * Math.sin(fogTime + i);
                    const x = centerX + r * Math.cos(angle);
                    const y = centerY + r * Math.sin(angle);

                    const grad = ctx.createRadialGradient(x, y, 0, x, y, 50);
                    grad.addColorStop(0, `rgba(150, 80, 200, ${0.15 + 0.1 * Math.sin(i)})`);
                    grad.addColorStop(1, 'rgba(150, 80, 200, 0)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(x - 50, y - 50, 100, 100);
                }

                // Draw simplified fractal boundary
                ctx.strokeStyle = '#6cf';
                ctx.lineWidth = 3;
                ctx.beginPath();
                for (let a = 0; a < Math.PI * 2; a += 0.05) {
                    const r = 100 + 30 * Math.sin(a * 5) + 15 * Math.cos(a * 7);
                    const x = centerX + r * Math.cos(a);
                    const y = centerY + r * Math.sin(a);
                    if (a === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();

                // Legend
                ctx.fillStyle = '#6cf';
                ctx.font = '20px Georgia, serif';
                ctx.textAlign = 'left';
                ctx.fillText('- Fractal boundary', 80, 120);

                // Fog legend
                const grad = ctx.createRadialGradient(95, 155, 0, 95, 155, 20);
                grad.addColorStop(0, 'rgba(150, 80, 200, 0.5)');
                grad.addColorStop(1, 'rgba(150, 80, 200, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(75, 135, 40, 40);
                ctx.fillStyle = '#a8f';
                ctx.fillText('Fog: rays that struggled', 130, 160);

                // Explanation text
                ctx.fillStyle = '#ccc';
                ctx.font = '22px Georgia, serif';
                ctx.textAlign = 'center';

                const lines = [
                    'Fog intensity = iteration count before giving up',
                    'Bright fog = rays spent many cycles near the surface',
                    'These regions reveal the fractal\'s "event horizon"'
                ];

                lines.forEach((line, i) => {
                    ctx.fillText(line, centerX, canvas.height - 140 + i * 35);
                });

                // Key insight
                ctx.fillStyle = '#a8f';
                ctx.font = '600 24px Georgia, serif';
                ctx.fillText('The fog shows where infinity hides in finite space', centerX, canvas.height - 40);

                ctx.globalAlpha = 1;
            }

            // ===== PHASE 3: Two Types of Fog =====
            else if (phase === 3) {
                ctx.globalAlpha = alpha;

                // Title
                ctx.fillStyle = '#fff';
                ctx.font = '600 36px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText('Two Types of Chaos Fog', canvas.width/2, 50);

                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2 - 30;

                // Draw the fractal boundary
                ctx.strokeStyle = '#6cf';
                ctx.lineWidth = 4;
                ctx.beginPath();
                for (let a = 0; a < Math.PI * 2; a += 0.03) {
                    const r = 140 + 25 * Math.sin(a * 6) + 15 * Math.cos(a * 9 + time * 0.0005);
                    const x = centerX + r * Math.cos(a);
                    const y = centerY + r * Math.sin(a);
                    if (a === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();

                // Inside fog (dense, dark)
                const insideFogTime = time * 0.0008;
                for (let i = 0; i < 25; i++) {
                    const angle = i * 0.251 + insideFogTime;
                    const r = 30 + 50 * Math.abs(Math.sin(i * 0.7));
                    const x = centerX + r * Math.cos(angle);
                    const y = centerY + r * Math.sin(angle);

                    const grad = ctx.createRadialGradient(x, y, 0, x, y, 40);
                    grad.addColorStop(0, `rgba(40, 20, 80, ${0.4 + 0.15 * Math.sin(i + insideFogTime)})`);
                    grad.addColorStop(1, 'rgba(40, 20, 80, 0)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(x - 40, y - 40, 80, 80);
                }

                // Outside fog (thin, silvery)
                for (let i = 0; i < 30; i++) {
                    const angle = i * 0.209 + insideFogTime * 0.7;
                    const baseR = 180 + 40 * Math.sin(i * 0.4);
                    const r = baseR + 15 * Math.sin(insideFogTime * 1.5 + i);
                    const x = centerX + r * Math.cos(angle);
                    const y = centerY + r * Math.sin(angle);

                    const grad = ctx.createRadialGradient(x, y, 0, x, y, 35);
                    grad.addColorStop(0, `rgba(180, 180, 200, ${0.2 + 0.1 * Math.sin(i * 0.8)})`);
                    grad.addColorStop(1, 'rgba(180, 180, 200, 0)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(x - 35, y - 35, 70, 70);
                }

                // Labels with arrows
                ctx.font = '600 22px Georgia, serif';
                ctx.textAlign = 'left';

                // Inside label
                ctx.fillStyle = '#a6f';
                ctx.fillText('Inside Fog', 80, 140);
                ctx.font = '18px Georgia, serif';
                ctx.fillStyle = '#ccc';
                ctx.fillText('Ray enters, bounces infinitely', 80, 165);
                ctx.fillText('in chaotic interior', 80, 187);

                // Outside label
                ctx.textAlign = 'right';
                ctx.font = '600 22px Georgia, serif';
                ctx.fillStyle = '#aac';
                ctx.fillText('Outside Fog', canvas.width - 80, 140);
                ctx.font = '18px Georgia, serif';
                ctx.fillStyle = '#ccc';
                ctx.fillText('Ray skims surface forever,', canvas.width - 80, 165);
                ctx.fillText('never quite hitting', canvas.width - 80, 187);

                // Key insight
                ctx.textAlign = 'center';
                ctx.fillStyle = '#fff';
                ctx.font = '22px Georgia, serif';
                ctx.fillText('Both share the same fate:', centerX, canvas.height - 130);
                ctx.fillStyle = '#f99';
                ctx.font = '600 24px Georgia, serif';
                ctx.fillText('Rays enter but cannot leave. They never hit geometry.', centerX, canvas.height - 95);

                ctx.fillStyle = '#888';
                ctx.font = '20px Georgia, serif';
                ctx.fillText('(Not all fractals have both, it depends on parameters)', centerX, canvas.height - 55);

                ctx.globalAlpha = 1;
            }

            // ===== PHASE 4: The Boundary =====
            else if (phase === 4) {
                ctx.globalAlpha = alpha;

                // Title
                ctx.fillStyle = '#fff';
                ctx.font = '600 36px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText('The Boundary: A Fractal Event Horizon', canvas.width/2, 50);

                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2 - 20;
                const boundaryTime = time * 0.0006;

                // Draw the chaotic boundary zone
                for (let ring = 0; ring < 3; ring++) {
                    const baseR = 130 + ring * 20;
                    ctx.strokeStyle = `rgba(255, 150, 100, ${0.4 - ring * 0.1})`;
                    ctx.lineWidth = 8 - ring * 2;
                    ctx.beginPath();
                    for (let a = 0; a < Math.PI * 2; a += 0.02) {
                        const chaos = 20 * Math.sin(a * 7 + boundaryTime + ring)
                                    + 12 * Math.cos(a * 11 - boundaryTime * 0.7)
                                    + 8 * Math.sin(a * 17 + ring * 2);
                        const r = baseR + chaos;
                        const x = centerX + r * Math.cos(a);
                        const y = centerY + r * Math.sin(a);
                        if (a === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.stroke();
                }

                // Animated rays getting trapped at boundary
                const numRays = 8;
                for (let i = 0; i < numRays; i++) {
                    const rayAngle = (i / numRays) * Math.PI * 2 + boundaryTime * 0.3;
                    const startR = 280;
                    const endR = 140 + 20 * Math.sin((time * 0.002 + i * 0.5) % 3 * 2);

                    ctx.strokeStyle = `rgba(255, 100, 100, 0.6)`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();

                    for (let t = 0; t < 1; t += 0.02) {
                        const r = startR - (startR - endR) * t;
                        const spiral = t * 0.8;
                        const x = centerX + r * Math.cos(rayAngle + spiral);
                        const y = centerY + r * Math.sin(rayAngle + spiral);
                        if (t === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();

                    // Dot at the trapped position
                    const dotR = endR;
                    const dotX = centerX + dotR * Math.cos(rayAngle + 0.8);
                    const dotY = centerY + dotR * Math.sin(rayAngle + 0.8);
                    ctx.fillStyle = '#f88';
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Explanation boxes
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(40, canvas.height - 200, 400, 150);
                ctx.fillRect(canvas.width - 440, canvas.height - 200, 400, 150);

                ctx.textAlign = 'left';
                ctx.font = '600 20px Georgia, serif';
                ctx.fillStyle = '#f96';
                ctx.fillText('Why does this happen?', 55, canvas.height - 175);
                ctx.font = '18px Georgia, serif';
                ctx.fillStyle = '#ccc';
                ctx.fillText('The ray enters a chaotic region where', 55, canvas.height - 145);
                ctx.fillText('distance estimates stay small but', 55, canvas.height - 122);
                ctx.fillText('erratic. The ray keeps moving but', 55, canvas.height - 99);
                ctx.fillText('never converges. It just wanders.', 55, canvas.height - 76);

                ctx.textAlign = 'left';
                ctx.font = '600 20px Georgia, serif';
                ctx.fillStyle = '#9cf';
                ctx.fillText('Like a strange attractor...', canvas.width - 425, canvas.height - 175);
                ctx.font = '18px Georgia, serif';
                ctx.fillStyle = '#ccc';
                ctx.fillText('Once a ray crosses into this zone,', canvas.width - 425, canvas.height - 145);
                ctx.fillText('it bounces forever. There\'s no surface', canvas.width - 425, canvas.height - 122);
                ctx.fillText('to hit and no path out. Just endless', canvas.width - 425, canvas.height - 99);
                ctx.fillText('chaotic orbits until we give up.', canvas.width - 425, canvas.height - 76);

                ctx.globalAlpha = 1;
            }

            // Phase indicator dots
            ctx.fillStyle = '#444';
            for (let i = 0; i < numPhases; i++) {
                ctx.beginPath();
                ctx.arc(canvas.width/2 - 60 + i * 30, canvas.height - 30, 6, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(canvas.width/2 - 60 + phase * 30, canvas.height - 30, 6, 0, Math.PI * 2);
            ctx.fill();
        },
    },

    // =====================================================
    // SLIDE 2: Ray Marching vs Full Scan (multi-phase)
    // =====================================================
    {
        meta: { topic: 'ray-marching' },
        render: (ctx, canvas, time) => {
            // Phase timing - 5 phases now
            const phaseDuration = 5000;
            const transitionDuration = 600;
            const numPhases = 5;
            const totalCycle = phaseDuration * numPhases;
            const cycleTime = time % totalCycle;
            const phase = Math.floor(cycleTime / phaseDuration);
            const phaseTime = cycleTime % phaseDuration;

            let fadeIn = 1, fadeOut = 1;
            if (phaseTime < transitionDuration) fadeIn = phaseTime / transitionDuration;
            if (phaseTime > phaseDuration - transitionDuration) fadeOut = (phaseDuration - phaseTime) / transitionDuration;
            const alpha = Math.min(fadeIn, fadeOut);

            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // ===== PHASE 0: Overview comparison =====
            if (phase === 0) {
                ctx.globalAlpha = alpha;

                ctx.fillStyle = '#fff';
                ctx.font = '600 56px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText('Ray Marching vs. Full Scan', canvas.width/2, 70);

                const boxY = 130;
                const boxH = 520;
                const boxW = 450;
                const gap = 40;

                // Left box: Ray Marching
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 2;
                ctx.strokeRect(canvas.width/2 - boxW - gap/2, boxY, boxW, boxH);
                ctx.font = '600 36px Georgia, serif';
                ctx.fillStyle = '#ccc';
                ctx.fillText('Ray Marching', canvas.width/2 - boxW/2 - gap/2, boxY + 50);

                // Animated ray marching spheres
                const rayX = canvas.width/2 - boxW - gap/2 + 50;
                const rayY = boxY + 150;
                ctx.strokeStyle = '#e44';
                ctx.lineWidth = 3;
                let px = rayX;
                for (let i = 0; i < 5; i++) {
                    const stepSize = 60 - i * 10 + 10 * Math.sin(time * 0.003 + i);
                    ctx.beginPath();
                    ctx.arc(px, rayY, Math.abs(stepSize), 0, Math.PI * 2);
                    ctx.stroke();
                    px += Math.abs(stepSize);
                }

                ctx.font = '24px Georgia, serif';
                ctx.fillStyle = '#aaa';
                ctx.textAlign = 'left';
                ctx.fillText('• Steps along ray', rayX, rayY + 120);
                ctx.fillText('• Distance estimation', rayX, rayY + 160);
                ctx.fillText('• Adaptive step size', rayX, rayY + 200);
                ctx.fillText('• Fast for sparse scenes', rayX, rayY + 240);

                // Right box: Full Scan
                ctx.strokeStyle = '#666';
                ctx.strokeRect(canvas.width/2 + gap/2, boxY, boxW, boxH);
                ctx.font = '600 36px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ccc';
                ctx.fillText('Full Scan', canvas.width/2 + boxW/2 + gap/2, boxY + 50);

                ctx.strokeStyle = '#66f';
                ctx.lineWidth = 1;
                const gridX = canvas.width/2 + gap/2 + 50;
                const gridY = boxY + 100;
                const gridSize = 200;
                for (let i = 0; i <= 8; i++) {
                    ctx.beginPath();
                    ctx.moveTo(gridX + i * gridSize/8, gridY);
                    ctx.lineTo(gridX + i * gridSize/8, gridY + gridSize);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(gridX, gridY + i * gridSize/8);
                    ctx.lineTo(gridX + gridSize, gridY + i * gridSize/8);
                    ctx.stroke();
                }

                ctx.font = '24px Georgia, serif';
                ctx.fillStyle = '#aaa';
                ctx.textAlign = 'left';
                ctx.fillText('• Fixed sample intervals', gridX, gridY + gridSize + 50);
                ctx.fillText('• Exhaustive evaluation', gridX, gridY + gridSize + 90);
                ctx.fillText('• Uniform coverage', gridX, gridY + gridSize + 130);
                ctx.fillText('• Better for dense detail', gridX, gridY + gridSize + 170);

                ctx.globalAlpha = 1;
            }

            // ===== PHASE 1: Exact vs Approximate DE =====
            else if (phase === 1) {
                ctx.globalAlpha = alpha;

                ctx.fillStyle = '#fff';
                ctx.font = '600 40px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText('Distance Estimation: Exact vs. Approximate', canvas.width/2, 50);

                // Left side: Simple shape with EXACT DE
                const leftX = canvas.width * 0.25;
                const centerY = canvas.height * 0.45;

                ctx.font = '600 28px Georgia, serif';
                ctx.fillStyle = '#6bcf7f';
                ctx.fillText('Simple Shapes', leftX, 100);
                ctx.font = '20px Georgia, serif';
                ctx.fillStyle = '#888';
                ctx.fillText('EXACT distance formula', leftX, 130);

                // Draw a sphere
                const sphereR = 80;
                ctx.fillStyle = '#4a9eff';
                ctx.beginPath();
                ctx.arc(leftX, centerY, sphereR, 0, Math.PI * 2);
                ctx.fill();

                // Show distance from a point
                const testPt = { x: leftX - 180, y: centerY - 40 };
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(testPt.x, testPt.y, 5, 0, Math.PI * 2);
                ctx.fill();

                // True distance circle
                const trueDist = Math.sqrt((testPt.x - leftX)**2 + (testPt.y - centerY)**2) - sphereR;
                ctx.strokeStyle = '#6bcf7f';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(testPt.x, testPt.y, trueDist, 0, Math.PI * 2);
                ctx.stroke();

                // Formula
                ctx.font = '18px monospace';
                ctx.fillStyle = '#6bcf7f';
                ctx.fillText('DE = length(p) - radius', leftX, centerY + 140);
                ctx.font = '16px Georgia, serif';
                ctx.fillStyle = '#aaa';
                ctx.fillText('Always correct!', leftX, centerY + 170);

                // Right side: Fractal with APPROXIMATE DE
                const rightX = canvas.width * 0.75;

                ctx.font = '600 28px Georgia, serif';
                ctx.fillStyle = '#f88';
                ctx.fillText('Fractals', rightX, 100);
                ctx.font = '20px Georgia, serif';
                ctx.fillStyle = '#888';
                ctx.fillText('APPROXIMATE distance (iterative)', rightX, 130);

                // Draw a complex fractal-like shape
                ctx.fillStyle = '#4a9eff';
                ctx.beginPath();
                for (let a = 0; a < Math.PI * 2; a += 0.03) {
                    const r = 70 * (1 + 0.4 * Math.sin(a * 7) + 0.2 * Math.cos(a * 13) + 0.15 * Math.sin(a * 19));
                    const x = rightX + r * Math.cos(a);
                    const y = centerY + r * Math.sin(a);
                    if (a === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();

                // Show test point with WRONG distance estimate
                const testPt2 = { x: rightX - 160, y: centerY - 30 };
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(testPt2.x, testPt2.y, 5, 0, Math.PI * 2);
                ctx.fill();

                // Wrong distance circle (too big)
                const wrongDist = 95; // Overestimate
                ctx.strokeStyle = '#f88';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(testPt2.x, testPt2.y, wrongDist, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                // Formula
                ctx.font = '18px monospace';
                ctx.fillStyle = '#f88';
                ctx.fillText('DE ≈ f(iterations)', rightX, centerY + 140);
                ctx.font = '16px Georgia, serif';
                ctx.fillStyle = '#aaa';
                ctx.fillText('Fewer iterations = less accurate', rightX, centerY + 170);

                // Bottom explanation
                ctx.font = '22px Georgia, serif';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.fillText('Fractal DE is computed iteratively — we trade accuracy for speed', canvas.width/2, canvas.height - 80);
                ctx.font = '18px Georgia, serif';
                ctx.fillStyle = '#f88';
                ctx.fillText('More iterations = slower but more accurate estimate', canvas.width/2, canvas.height - 50);

                ctx.globalAlpha = 1;
            }

            // ===== PHASE 2: Exact ray tracing =====
            else if (phase === 2) {
                ctx.globalAlpha = alpha;

                ctx.fillStyle = '#fff';
                ctx.font = '600 40px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText('Pixel-by-Pixel: Check Every Point', canvas.width/2, 50);

                ctx.font = '22px Georgia, serif';
                ctx.fillStyle = '#888';
                ctx.fillText('Accurate but slow — tests every position along the ray', canvas.width/2, 85);

                // Draw a simple Julia-like shape
                const centerX = canvas.width * 0.6;
                const centerY = canvas.height * 0.5;
                const scale = 120;

                // Draw fractal shape (simplified blob)
                ctx.fillStyle = '#4a9eff';
                ctx.beginPath();
                for (let a = 0; a < Math.PI * 2; a += 0.05) {
                    const r = scale * (1 + 0.3 * Math.sin(a * 3) + 0.2 * Math.cos(a * 5) + 0.15 * Math.sin(a * 7));
                    const x = centerX + r * Math.cos(a);
                    const y = centerY + r * Math.sin(a);
                    if (a === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();

                // Draw eye/camera
                ctx.font = '28px sans-serif';
                ctx.fillText('👁', 80, centerY + 8);

                // Draw exact rays hitting the surface
                const rayAngles = [-0.35, -0.15, 0.05, 0.25];
                ctx.strokeStyle = '#6bcf7f';
                ctx.lineWidth = 3;

                rayAngles.forEach(angle => {
                    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
                    // Find intersection with blob
                    for (let t = 0; t < 800; t += 2) {
                        const x = 100 + dir.x * t;
                        const y = centerY + dir.y * t;
                        const dx = x - centerX;
                        const dy = y - centerY;
                        const a = Math.atan2(dy, dx);
                        const targetR = scale * (1 + 0.3 * Math.sin(a * 3) + 0.2 * Math.cos(a * 5) + 0.15 * Math.sin(a * 7));
                        if (Math.sqrt(dx*dx + dy*dy) < targetR) {
                            ctx.beginPath();
                            ctx.moveTo(100, centerY);
                            ctx.lineTo(x, y);
                            ctx.stroke();
                            ctx.fillStyle = '#6bcf7f';
                            ctx.beginPath();
                            ctx.arc(x, y, 6, 0, Math.PI * 2);
                            ctx.fill();
                            break;
                        }
                    }
                });

                ctx.fillStyle = '#6bcf7f';
                ctx.font = '22px Georgia, serif';
                ctx.textAlign = 'left';
                ctx.fillText('✓ All rays hit the TRUE surface', 100, canvas.height - 80);

                ctx.globalAlpha = 1;
            }

            // ===== PHASE 3: Ray marching stepping =====
            else if (phase === 3) {
                ctx.globalAlpha = alpha;

                ctx.fillStyle = '#fff';
                ctx.font = '600 40px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText('Ray Marching: Jump by Estimated Distance', canvas.width/2, 50);

                ctx.font = '22px Georgia, serif';
                ctx.fillStyle = '#888';
                ctx.fillText('Each circle = "how far to nearest surface?" — jump that far, repeat', canvas.width/2, 85);

                const centerX = canvas.width * 0.6;
                const centerY = canvas.height * 0.5;
                const scale = 120;

                // Draw fractal shape dimmed
                ctx.fillStyle = 'rgba(74, 158, 255, 0.3)';
                ctx.beginPath();
                for (let a = 0; a < Math.PI * 2; a += 0.05) {
                    const r = scale * (1 + 0.3 * Math.sin(a * 3) + 0.2 * Math.cos(a * 5) + 0.15 * Math.sin(a * 7));
                    const x = centerX + r * Math.cos(a);
                    const y = centerY + r * Math.sin(a);
                    if (a === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();

                // Draw eye
                ctx.font = '28px sans-serif';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.fillText('👁', 80, centerY + 8);

                // Animated ray marching for one ray
                const angle = 0;
                const dir = { x: Math.cos(angle), y: Math.sin(angle) };
                const animProgress = (phaseTime % 3000) / 3000;
                const totalSteps = 8;
                const visibleSteps = Math.floor(animProgress * (totalSteps + 2));

                let px = 100, py = centerY;
                const steps = [];

                for (let i = 0; i < totalSteps; i++) {
                    const dx = px - centerX;
                    const dy = py - centerY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const a = Math.atan2(dy, dx);
                    const targetR = scale * (1 + 0.3 * Math.sin(a * 3) + 0.2 * Math.cos(a * 5) + 0.15 * Math.sin(a * 7));
                    const stepSize = Math.max(20, (dist - targetR) * 0.8);

                    steps.push({ x: px, y: py, size: stepSize });
                    px += dir.x * stepSize;
                    py += dir.y * stepSize;

                    if (dist < targetR + 10) break;
                }

                // Draw steps
                ctx.strokeStyle = '#ffd93d';
                ctx.lineWidth = 2;
                for (let i = 0; i < Math.min(visibleSteps, steps.length); i++) {
                    const step = steps[i];

                    // Distance circle
                    ctx.beginPath();
                    ctx.arc(step.x, step.y, step.size, 0, Math.PI * 2);
                    ctx.stroke();

                    // Step point
                    ctx.fillStyle = i === visibleSteps - 1 ? '#fff' : '#ffd93d';
                    ctx.beginPath();
                    ctx.arc(step.x, step.y, 5, 0, Math.PI * 2);
                    ctx.fill();

                    // Line to next
                    if (i < Math.min(visibleSteps - 1, steps.length - 1)) {
                        ctx.beginPath();
                        ctx.moveTo(step.x, step.y);
                        ctx.lineTo(steps[i + 1].x, steps[i + 1].y);
                        ctx.stroke();
                    }
                }

                ctx.fillStyle = '#ffd93d';
                ctx.font = '22px Georgia, serif';
                ctx.textAlign = 'left';
                ctx.fillText('✓ Much faster — only ~8 checks vs hundreds', 100, canvas.height - 80);

                ctx.globalAlpha = 1;
            }

            // ===== PHASE 4: The problem - same ray, different result =====
            else if (phase === 4) {
                ctx.globalAlpha = alpha;

                ctx.fillStyle = '#fff';
                ctx.font = '600 36px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText('The Problem: DE Approximation Causes Overshoot', canvas.width/2, 45);

                ctx.font = '20px Georgia, serif';
                ctx.fillStyle = '#f88';
                ctx.fillText('Same ray — pixel scan hits, ray march misses!', canvas.width/2, 80);

                const centerX = canvas.width * 0.55;
                const centerY = canvas.height * 0.48;
                const scale = 100;

                // Draw TRUE fractal shape (blue) - what pixel scan sees
                ctx.fillStyle = 'rgba(74, 158, 255, 0.4)';
                ctx.beginPath();
                for (let a = 0; a < Math.PI * 2; a += 0.05) {
                    const r = scale * (1 + 0.4 * Math.sin(a * 5) + 0.3 * Math.cos(a * 7) + 0.2 * Math.sin(a * 11));
                    const x = centerX + r * Math.cos(a);
                    const y = centerY + r * Math.sin(a);
                    if (a === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#4a9eff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw PERCEIVED shape (orange) - what DE "sees" with few iterations
                ctx.fillStyle = 'rgba(255, 170, 100, 0.5)';
                ctx.beginPath();
                for (let a = 0; a < Math.PI * 2; a += 0.05) {
                    const r = scale * 0.85 * (1 + 0.2 * Math.sin(a * 3));
                    const x = centerX + r * Math.cos(a);
                    const y = centerY + r * Math.sin(a);
                    if (a === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#ffaa64';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw eye
                ctx.font = '28px sans-serif';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.fillText('👁', 80, centerY + 8);

                // Draw rays showing the difference
                const rayAngles = [-0.25, 0.1, 0.35];
                rayAngles.forEach(angle => {
                    const dir = { x: Math.cos(angle), y: Math.sin(angle) };

                    // Find where ray SHOULD hit (true shape - pixel scan)
                    let trueHit = null;
                    for (let t = 0; t < 600; t += 2) {
                        const x = 100 + dir.x * t;
                        const y = centerY + dir.y * t;
                        const dx = x - centerX;
                        const dy = y - centerY;
                        const a = Math.atan2(dy, dx);
                        const targetR = scale * (1 + 0.4 * Math.sin(a * 5) + 0.3 * Math.cos(a * 7) + 0.2 * Math.sin(a * 11));
                        if (Math.sqrt(dx*dx + dy*dy) < targetR) {
                            trueHit = { x, y };
                            break;
                        }
                    }

                    // Find where ray DOES hit (perceived shape - ray march)
                    let perceivedHit = null;
                    for (let t = 0; t < 600; t += 2) {
                        const x = 100 + dir.x * t;
                        const y = centerY + dir.y * t;
                        const dx = x - centerX;
                        const dy = y - centerY;
                        const a = Math.atan2(dy, dx);
                        const targetR = scale * 0.85 * (1 + 0.2 * Math.sin(a * 3));
                        if (Math.sqrt(dx*dx + dy*dy) < targetR) {
                            perceivedHit = { x, y };
                            break;
                        }
                    }

                    // Draw ray to perceived hit (wrong!)
                    if (perceivedHit) {
                        ctx.strokeStyle = '#ff6b6b';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(100, centerY);
                        ctx.lineTo(perceivedHit.x, perceivedHit.y);
                        ctx.stroke();

                        ctx.fillStyle = '#ff6b6b';
                        ctx.beginPath();
                        ctx.arc(perceivedHit.x, perceivedHit.y, 6, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // Show true hit point (green)
                    if (trueHit) {
                        ctx.fillStyle = '#6bcf7f';
                        ctx.beginPath();
                        ctx.arc(trueHit.x, trueHit.y, 5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });

                // Legend
                ctx.font = '16px Georgia, serif';
                ctx.textAlign = 'left';

                const legendY = canvas.height - 125;

                ctx.fillStyle = '#4a9eff';
                ctx.fillRect(80, legendY, 18, 18);
                ctx.fillStyle = '#ccc';
                ctx.fillText('True surface (many iterations / pixel scan)', 105, legendY + 14);

                ctx.fillStyle = '#ffaa64';
                ctx.fillRect(80, legendY + 28, 18, 18);
                ctx.fillStyle = '#ccc';
                ctx.fillText('What DE "sees" (few iterations for speed)', 105, legendY + 42);

                ctx.fillStyle = '#6bcf7f';
                ctx.beginPath();
                ctx.arc(89, legendY + 68, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ccc';
                ctx.fillText('Where pixel scan hits (correct)', 105, legendY + 72);

                ctx.fillStyle = '#ff6b6b';
                ctx.beginPath();
                ctx.arc(89, legendY + 92, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ccc';
                ctx.fillText('Where ray march hits (overshot thin features!)', 105, legendY + 96);

                ctx.globalAlpha = 1;
            }

            // Phase indicator dots
            ctx.fillStyle = '#444';
            for (let i = 0; i < numPhases; i++) {
                ctx.beginPath();
                ctx.arc(canvas.width/2 - 60 + i * 30, canvas.height - 30, 6, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(canvas.width/2 - 60 + phase * 30, canvas.height - 30, 6, 0, Math.PI * 2);
            ctx.fill();
        },
    },

    // =====================================================
    // SLIDE 3: Resolution (multi-phase)
    // =====================================================
    {
        meta: { topic: 'resolution' },
        render: (ctx, canvas, time) => {
            // Phase timing - 3 phases
            const phaseDuration = 6000;
            const transitionDuration = 600;
            const numPhases = 3;
            const totalCycle = phaseDuration * numPhases;
            const cycleTime = time % totalCycle;
            const phase = Math.floor(cycleTime / phaseDuration);
            const phaseTime = cycleTime % phaseDuration;

            let fadeIn = 1, fadeOut = 1;
            if (phaseTime < transitionDuration) fadeIn = phaseTime / transitionDuration;
            if (phaseTime > phaseDuration - transitionDuration) fadeOut = (phaseDuration - phaseTime) / transitionDuration;
            const alpha = Math.min(fadeIn, fadeOut);

            ctx.fillStyle = '#0a0a15';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // ===== PHASE 0: Resolution comparison =====
            if (phase === 0) {
                ctx.globalAlpha = alpha;

                ctx.fillStyle = '#fff';
                ctx.font = '600 56px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText('Resolution', canvas.width/2, 70);

                // Show resolution comparison boxes
                const resolutions = [
                    { label: '64×64', size: 64 },
                    { label: '128×128', size: 128 },
                    { label: '256×256', size: 256 },
                    { label: '512×512', size: 512 },
                ];

                const startX = 80;
                const boxSize = 200;
                const gap = 30;

                resolutions.forEach((res, i) => {
                    const x = startX + i * (boxSize + gap);
                    const y = 140;

                    // Pixelated preview box (simulated)
                    const pixelSize = Math.max(1, Math.floor(boxSize / res.size * 4));
                    for (let py = 0; py < boxSize; py += pixelSize) {
                        for (let px = 0; px < boxSize; px += pixelSize) {
                            const noise = Math.sin(px * 0.1 + time * 0.001) * Math.cos(py * 0.1);
                            const bright = Math.floor(128 + noise * 60);
                            ctx.fillStyle = `rgb(${bright}, ${bright * 0.7}, ${bright * 1.2})`;
                            ctx.fillRect(x + px, y + py, pixelSize, pixelSize);
                        }
                    }

                    // Label
                    ctx.fillStyle = '#fff';
                    ctx.font = '24px Georgia, serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(res.label, x + boxSize/2, y + boxSize + 35);
                });

                // Notes
                ctx.font = '28px Georgia, serif';
                ctx.fillStyle = '#aaa';
                ctx.textAlign = 'center';
                ctx.fillText('Trade-off: Detail vs. Performance', canvas.width/2, canvas.height - 100);
                ctx.font = '22px Georgia, serif';
                ctx.fillText('4× resolution = 16× computation', canvas.width/2, canvas.height - 60);

                ctx.globalAlpha = 1;
            }

            // ===== PHASE 1: Sampling errors - features between pixels =====
            else if (phase === 1) {
                ctx.globalAlpha = alpha;

                ctx.fillStyle = '#fff';
                ctx.font = '600 40px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText('Sampling Errors: Features Between Pixels', canvas.width/2, 50);

                ctx.font = '22px Georgia, serif';
                ctx.fillStyle = '#888';
                ctx.fillText('Thin features can fall between sample points and be missed entirely', canvas.width/2, 85);

                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2 + 20;

                // Draw a thin curved feature (what we're trying to render)
                ctx.strokeStyle = '#4a9eff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                for (let t = -200; t <= 200; t += 2) {
                    const x = centerX + t;
                    const y = centerY + 40 * Math.sin(t * 0.03) + 20 * Math.sin(t * 0.07);
                    if (t === -200) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();

                // Label the curve
                ctx.fillStyle = '#4a9eff';
                ctx.font = '18px Georgia, serif';
                ctx.textAlign = 'left';
                ctx.fillText('Thin fractal tendril', centerX + 210, centerY - 20);

                // Draw a coarse sample grid
                const gridSize = 50;
                const gridStartX = centerX - 175;
                const gridStartY = centerY - 100;
                const gridW = 350;
                const gridH = 200;

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;

                // Grid lines
                for (let x = gridStartX; x <= gridStartX + gridW; x += gridSize) {
                    ctx.beginPath();
                    ctx.moveTo(x, gridStartY);
                    ctx.lineTo(x, gridStartY + gridH);
                    ctx.stroke();
                }
                for (let y = gridStartY; y <= gridStartY + gridH; y += gridSize) {
                    ctx.beginPath();
                    ctx.moveTo(gridStartX, y);
                    ctx.lineTo(gridStartX + gridW, y);
                    ctx.stroke();
                }

                // Sample points - check if they hit the curve
                for (let gx = gridStartX; gx <= gridStartX + gridW; gx += gridSize) {
                    for (let gy = gridStartY; gy <= gridStartY + gridH; gy += gridSize) {
                        // Check if near curve
                        const t = gx - centerX;
                        const curveY = centerY + 40 * Math.sin(t * 0.03) + 20 * Math.sin(t * 0.07);
                        const dist = Math.abs(gy - curveY);

                        if (dist < 8) {
                            // Hit!
                            ctx.fillStyle = '#6bcf7f';
                            ctx.beginPath();
                            ctx.arc(gx, gy, 8, 0, Math.PI * 2);
                            ctx.fill();
                        } else {
                            // Miss
                            ctx.fillStyle = '#ff6b6b';
                            ctx.beginPath();
                            ctx.arc(gx, gy, 5, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }

                // Legend
                ctx.font = '18px Georgia, serif';
                ctx.textAlign = 'left';

                ctx.fillStyle = '#6bcf7f';
                ctx.beginPath();
                ctx.arc(100, canvas.height - 100, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#aaa';
                ctx.fillText('Sample hits feature', 115, canvas.height - 95);

                ctx.fillStyle = '#ff6b6b';
                ctx.beginPath();
                ctx.arc(100, canvas.height - 70, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#aaa';
                ctx.fillText('Sample misses — feature falls between pixels!', 115, canvas.height - 65);

                ctx.font = '20px Georgia, serif';
                ctx.fillStyle = '#f88';
                ctx.textAlign = 'center';
                ctx.fillText('With coarse sampling, most of the curve is invisible', canvas.width/2, canvas.height - 25);

                ctx.globalAlpha = 1;
            }

            // ===== PHASE 2: Aliasing =====
            else if (phase === 2) {
                ctx.globalAlpha = alpha;

                ctx.fillStyle = '#fff';
                ctx.font = '600 40px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText('Aliasing: Jagged Edges & Moiré Patterns', canvas.width/2, 50);

                ctx.font = '22px Georgia, serif';
                ctx.fillStyle = '#888';
                ctx.fillText('Discrete sampling creates artifacts at edges and fine patterns', canvas.width/2, 85);

                // Left: Show jagged edge
                const leftX = canvas.width * 0.28;
                const centerY = canvas.height * 0.48;

                ctx.font = '600 24px Georgia, serif';
                ctx.fillStyle = '#fff';
                ctx.fillText('Jagged Edges', leftX, 130);

                // Draw smooth diagonal line (what we want)
                ctx.strokeStyle = 'rgba(74, 158, 255, 0.4)';
                ctx.lineWidth = 20;
                ctx.beginPath();
                ctx.moveTo(leftX - 100, centerY - 80);
                ctx.lineTo(leftX + 100, centerY + 80);
                ctx.stroke();

                // Draw pixelated version (what we get)
                const pixSize = 16;
                for (let py = -80; py < 80; py += pixSize) {
                    const px = py; // diagonal
                    ctx.fillStyle = '#4a9eff';
                    ctx.fillRect(leftX + px - pixSize/2, centerY + py - pixSize/2, pixSize - 1, pixSize - 1);
                }

                ctx.font = '16px Georgia, serif';
                ctx.fillStyle = '#aaa';
                ctx.fillText('Smooth line → stair steps', leftX, centerY + 120);

                // Right: Show moiré pattern
                const rightX = canvas.width * 0.72;

                ctx.font = '600 24px Georgia, serif';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.fillText('Moiré Patterns', rightX, 130);

                // Draw fine pattern that aliases
                const patternY = centerY - 70;
                const patternH = 140;

                // High frequency pattern
                for (let y = patternY; y < patternY + patternH; y += 3) {
                    const offset = Math.sin(y * 0.15 + time * 0.002) * 30;
                    ctx.strokeStyle = `rgba(74, 158, 255, ${0.3 + 0.2 * Math.sin(y * 0.1)})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(rightX - 80 + offset, y);
                    ctx.lineTo(rightX + 80 + offset, y);
                    ctx.stroke();
                }

                // Show sampled version with artifacts
                ctx.strokeStyle = '#f88';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(rightX - 90, patternY - 10, 180, patternH + 20);
                ctx.setLineDash([]);

                ctx.font = '16px Georgia, serif';
                ctx.fillStyle = '#aaa';
                ctx.fillText('Fine detail → false patterns', rightX, centerY + 120);

                // Bottom explanation
                ctx.font = '20px Georgia, serif';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.fillText('Solutions: Higher resolution, anti-aliasing (multiple samples per pixel)', canvas.width/2, canvas.height - 70);

                ctx.font = '18px Georgia, serif';
                ctx.fillStyle = '#6cf';
                ctx.fillText('This is different from DE errors — even perfect math has aliasing at low resolution', canvas.width/2, canvas.height - 40);

                ctx.globalAlpha = 1;
            }

            // Phase indicator dots
            ctx.fillStyle = '#444';
            for (let i = 0; i < numPhases; i++) {
                ctx.beginPath();
                ctx.arc(canvas.width/2 - 30 + i * 30, canvas.height - 20, 6, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(canvas.width/2 - 30 + phase * 30, canvas.height - 20, 6, 0, Math.PI * 2);
            ctx.fill();
        },
    },

    // =====================================================
    // SLIDE 4: Coloring
    // =====================================================
    {
        meta: { topic: 'coloring' },
        render: (ctx, canvas, time) => {
            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Title
            ctx.fillStyle = '#fff';
            ctx.font = '600 56px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('Fractal Coloring', canvas.width/2, 70);

            // Show different coloring methods with usage info
            const methods = [
                { name: 'Escape Time', desc: 'Iteration count', used: 'Julia' },
                { name: 'Distance', desc: 'DE value mapping', used: 'Mandelbox, Mandelbulb' },
                { name: 'Orbit Trap', desc: 'Closest approach', used: '—' },
                { name: 'Normal Map', desc: 'Surface lighting', used: '(all, for shading)' },
            ];

            const boxW = 220;
            const boxH = 150;
            const startX = 50;
            const startY = 120;
            const gap = 20;

            methods.forEach((method, i) => {
                const x = startX + i * (boxW + gap);

                // Gradient preview
                const grad = ctx.createLinearGradient(x, startY, x + boxW, startY + boxH);
                const t = time * 0.001;
                if (i === 0) { // Escape time - cosine palette like Julia
                    for (let s = 0; s <= 1; s += 0.1) {
                        const iter = s;
                        const r = 0.5 + 0.5 * Math.cos(3.14 * (iter + 0.23));
                        const g = 0.5 + 0.5 * Math.cos(3.14 * (iter + 0.53));
                        const b = 0.5 + 0.5 * Math.cos(3.14 * (iter + 0.87));
                        grad.addColorStop(s, `rgb(${r*255},${g*255},${b*255})`);
                    }
                } else if (i === 1) { // Distance - warm grays like Mandelbox
                    grad.addColorStop(0, 'rgb(64, 51, 51)');
                    grad.addColorStop(0.5, 'rgb(160, 158, 155)');
                    grad.addColorStop(1, 'rgb(227, 227, 230)');
                } else if (i === 2) { // Orbit trap
                    grad.addColorStop(0, '#f42');
                    grad.addColorStop(0.5, '#fa0');
                    grad.addColorStop(1, '#ff8');
                } else { // Normal map - surface shading colors
                    grad.addColorStop(0, '#335');
                    grad.addColorStop(0.5, '#668');
                    grad.addColorStop(1, '#aac');
                }
                ctx.fillStyle = grad;
                ctx.fillRect(x, startY, boxW, boxH);

                // Label
                ctx.fillStyle = '#fff';
                ctx.font = '600 22px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText(method.name, x + boxW/2, startY + boxH + 30);
                ctx.font = '16px Georgia, serif';
                ctx.fillStyle = '#888';
                ctx.fillText(method.desc, x + boxW/2, startY + boxH + 52);

                // "Used by" indicator
                ctx.font = '600 14px Georgia, serif';
                ctx.fillStyle = method.used === '—' ? '#555' : '#6cf';
                ctx.fillText(method.used, x + boxW/2, startY + boxH + 75);
            });

            // Color palette examples with labels
            ctx.font = '600 28px Georgia, serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText('Gallery Palettes', canvas.width/2, 420);

            const palettes = [
                { name: 'Julia (cosine)', colors: ['#80b3c0', '#c080b3', '#b3c080', '#80c0b3', '#b380c0'] },
                { name: 'Mandelbox (warm gray)', colors: ['#403333', '#6a6560', '#a09a95', '#d0ccc8', '#e8e8eb'] },
                { name: 'Mandelbulb (forest)', colors: ['#143806', '#1c5a0d', '#387a22', '#4c9930', '#65b840'] },
            ];

            palettes.forEach((palette, pi) => {
                const py = 460 + pi * 75;
                const sw = 120;
                const totalW = palette.colors.length * sw;
                const startPx = canvas.width/2 - totalW/2;

                // Palette name
                ctx.font = '16px Georgia, serif';
                ctx.fillStyle = '#888';
                ctx.textAlign = 'right';
                ctx.fillText(palette.name, startPx - 15, py + 25);

                // Colors
                ctx.textAlign = 'center';
                palette.colors.forEach((color, ci) => {
                    ctx.fillStyle = color;
                    ctx.fillRect(startPx + ci * sw, py, sw, 40);
                });
            });
        },
    },

    // =====================================================
    // SLIDE 5: Classic 2D Fractals - Mandelbrot
    // =====================================================
    {
        meta: { topic: '2d-fractals' },
        render: (ctx, canvas, time) => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Low-res Mandelbrot computation
            const res = 64;
            const cellW = canvas.width / res;
            const cellH = (canvas.height - 200) / res;
            const maxIter = 32;
            const zoom = 2.5 + 0.5 * Math.sin(time * 0.0003);
            const offsetX = -0.5;
            const offsetY = 0;

            for (let py = 0; py < res; py++) {
                for (let px = 0; px < res; px++) {
                    const x0 = (px / res - 0.5) * zoom + offsetX;
                    const y0 = (py / res - 0.5) * zoom + offsetY;
                    let x = 0, y = 0, iter = 0;
                    while (x*x + y*y <= 4 && iter < maxIter) {
                        const xtemp = x*x - y*y + x0;
                        y = 2*x*y + y0;
                        x = xtemp;
                        iter++;
                    }
                    if (iter < maxIter) {
                        const hue = (iter / maxIter * 360 + time * 0.02) % 360;
                        ctx.fillStyle = `hsl(${hue}, 80%, ${50 + iter}%)`;
                    } else {
                        ctx.fillStyle = '#000';
                    }
                    ctx.fillRect(px * cellW, 100 + py * cellH, cellW + 1, cellH + 1);
                }
            }

            // Title and attribution
            ctx.fillStyle = '#fff';
            ctx.font = '600 48px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('The Mandelbrot Set', canvas.width/2, 60);

            ctx.font = '24px Georgia, serif';
            ctx.fillStyle = '#aaa';
            ctx.fillText('z → z² + c', canvas.width/2, canvas.height - 80);
            ctx.font = '20px Georgia, serif';
            ctx.fillText('Benoît Mandelbrot, 1980', canvas.width/2, canvas.height - 50);
            ctx.font = '16px Georgia, serif';
            ctx.fillStyle = '#666';
            ctx.fillText('(First visualized by Robert W. Brooks & Peter Matelski, 1978)', canvas.width/2, canvas.height - 25);
        },
    },

    // =====================================================
    // SLIDE 6: Julia Sets
    // =====================================================
    {
        meta: { topic: '2d-fractals-julia' },
        render: (ctx, canvas, time) => {
            ctx.fillStyle = '#0a0a15';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Animated Julia Set
            const res = 80;
            const cellW = (canvas.width - 100) / res;
            const cellH = (canvas.height - 200) / res;
            const maxIter = 40;

            // Animate c parameter
            const angle = time * 0.0005;
            const cReal = 0.7885 * Math.cos(angle);
            const cImag = 0.7885 * Math.sin(angle);

            for (let py = 0; py < res; py++) {
                for (let px = 0; px < res; px++) {
                    let x = (px / res - 0.5) * 3;
                    let y = (py / res - 0.5) * 3;
                    let iter = 0;
                    while (x*x + y*y <= 4 && iter < maxIter) {
                        const xtemp = x*x - y*y + cReal;
                        y = 2*x*y + cImag;
                        x = xtemp;
                        iter++;
                    }
                    if (iter < maxIter) {
                        const hue = (iter / maxIter * 300) % 360;
                        ctx.fillStyle = `hsl(${hue}, 70%, ${40 + iter}%)`;
                    } else {
                        ctx.fillStyle = '#000';
                    }
                    ctx.fillRect(50 + px * cellW, 100 + py * cellH, cellW + 1, cellH + 1);
                }
            }

            // Title and attribution
            ctx.fillStyle = '#fff';
            ctx.font = '600 48px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('Julia Sets', canvas.width/2, 60);

            ctx.font = '24px Georgia, serif';
            ctx.fillStyle = '#aaa';
            ctx.fillText(`c = ${cReal.toFixed(3)} + ${cImag.toFixed(3)}i`, canvas.width/2, canvas.height - 80);
            ctx.font = '20px Georgia, serif';
            ctx.fillText('Gaston Julia, 1918', canvas.width/2, canvas.height - 50);
            ctx.font = '16px Georgia, serif';
            ctx.fillStyle = '#666';
            ctx.fillText('Discovered independently by Pierre Fatou', canvas.width/2, canvas.height - 25);
        },
    },

    // =====================================================
    // SLIDE 7: Sierpinski Triangle
    // =====================================================
    {
        meta: { topic: '2d-fractals-sierpinski' },
        render: (ctx, canvas, time) => {
            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Sierpinski triangle using chaos game
            const points = [
                { x: canvas.width/2, y: 120 },
                { x: 100, y: canvas.height - 150 },
                { x: canvas.width - 100, y: canvas.height - 150 },
            ];

            let px = canvas.width/2;
            let py = canvas.height/2;

            // Use time to determine how many points to draw (animated buildup)
            const numPoints = Math.min(8000, Math.floor(time * 0.5) % 10000);

            ctx.fillStyle = 'rgba(180, 120, 255, 0.6)';

            // Reset random seed for consistent animation
            let seed = 12345;
            const random = () => {
                seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                return seed / 0x7fffffff;
            };

            for (let i = 0; i < numPoints; i++) {
                const target = points[Math.floor(random() * 3)];
                px = (px + target.x) / 2;
                py = (py + target.y) / 2;
                ctx.fillRect(px, py, 2, 2);
            }

            // Title and attribution
            ctx.fillStyle = '#fff';
            ctx.font = '600 48px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('Sierpiński Triangle', canvas.width/2, 60);

            ctx.font = '20px Georgia, serif';
            ctx.fillStyle = '#aaa';
            ctx.fillText('Wacław Sierpiński, 1915', canvas.width/2, canvas.height - 50);
            ctx.font = '16px Georgia, serif';
            ctx.fillStyle = '#666';
            ctx.fillText('(Appears in 13th century Cosmati mosaics)', canvas.width/2, canvas.height - 25);
        },
    },

    // =====================================================
    // SLIDE 8: Koch Snowflake
    // =====================================================
    {
        meta: { topic: '2d-fractals-koch' },
        render: (ctx, canvas, time) => {
            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Koch snowflake recursive function
            const kochLine = (x1, y1, x2, y2, depth) => {
                if (depth === 0) {
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                    return;
                }

                const dx = x2 - x1;
                const dy = y2 - y1;

                const x3 = x1 + dx / 3;
                const y3 = y1 + dy / 3;

                const x5 = x1 + 2 * dx / 3;
                const y5 = y1 + 2 * dy / 3;

                // Peak of the triangle (rotate 60 degrees)
                const x4 = x3 + (dx / 3) * Math.cos(-Math.PI / 3) - (dy / 3) * Math.sin(-Math.PI / 3);
                const y4 = y3 + (dx / 3) * Math.sin(-Math.PI / 3) + (dy / 3) * Math.cos(-Math.PI / 3);

                kochLine(x1, y1, x3, y3, depth - 1);
                kochLine(x3, y3, x4, y4, depth - 1);
                kochLine(x4, y4, x5, y5, depth - 1);
                kochLine(x5, y5, x2, y2, depth - 1);
            };

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2 + 20;
            const size = 280;

            // Calculate triangle vertices (pointing up)
            const angle = -Math.PI / 2;
            const vertices = [];
            for (let i = 0; i < 3; i++) {
                const a = angle + (i * 2 * Math.PI) / 3;
                vertices.push({
                    x: centerX + size * Math.cos(a),
                    y: centerY + size * Math.sin(a)
                });
            }

            // Animate through iterations
            const maxDepth = 5;
            const cycleTime = 8000;
            const iteration = Math.floor((time % cycleTime) / (cycleTime / (maxDepth + 1)));
            const depth = Math.min(iteration, maxDepth);

            // Color based on depth
            const hue = 180 + depth * 20;
            ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
            ctx.lineWidth = Math.max(1, 3 - depth * 0.4);

            // Draw the three sides
            kochLine(vertices[0].x, vertices[0].y, vertices[1].x, vertices[1].y, depth);
            kochLine(vertices[1].x, vertices[1].y, vertices[2].x, vertices[2].y, depth);
            kochLine(vertices[2].x, vertices[2].y, vertices[0].x, vertices[0].y, depth);

            // Title and attribution
            ctx.fillStyle = '#fff';
            ctx.font = '600 48px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('Koch Snowflake', canvas.width/2, 55);

            // Iteration indicator
            ctx.font = '24px Georgia, serif';
            ctx.fillStyle = '#aaa';
            ctx.fillText(`Iteration: ${depth}`, canvas.width/2, 95);

            ctx.font = '20px Georgia, serif';
            ctx.fillStyle = '#aaa';
            ctx.fillText('Helge von Koch, 1904', canvas.width/2, canvas.height - 55);
            ctx.font = '16px Georgia, serif';
            ctx.fillStyle = '#666';
            ctx.fillText('Finite area, infinite perimeter', canvas.width/2, canvas.height - 28);
        },
    },

    // =====================================================
    // SLIDE 9: Cantor Set
    // =====================================================
    {
        meta: { topic: '2D fractal' },
        render: (ctx, canvas, time) => {
            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Cantor set at given iteration depth
            function drawCantorLevel(x, y, width, depth, maxDepth) {
                const barHeight = 18;
                const levelGap = 45;

                // Color based on depth
                const hue = 30 + depth * 25;
                ctx.fillStyle = `hsl(${hue}, 65%, 55%)`;

                if (depth >= maxDepth) {
                    // Draw the segment
                    ctx.fillRect(x, y, width, barHeight);
                    return;
                }

                // Draw current segment
                ctx.fillRect(x, y, width, barHeight);

                // Recurse on left and right thirds
                const thirdWidth = width / 3;
                drawCantorLevel(x, y + levelGap, thirdWidth, depth + 1, maxDepth);
                drawCantorLevel(x + 2 * thirdWidth, y + levelGap, thirdWidth, depth + 1, maxDepth);
            }

            // Animate through iterations
            const maxDepth = 5;
            const cycleTime = 8000;
            const iteration = Math.floor((time % cycleTime) / (cycleTime / (maxDepth + 1)));
            const depth = Math.min(iteration, maxDepth);

            // Starting parameters
            const startX = 60;
            const startY = 110;
            const totalWidth = canvas.width - 120;

            drawCantorLevel(startX, startY, totalWidth, 0, depth);

            // Title
            ctx.fillStyle = '#fff';
            ctx.font = '600 48px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('Cantor Set', canvas.width/2, 55);

            // Iteration indicator
            ctx.font = '24px Georgia, serif';
            ctx.fillStyle = '#aaa';
            ctx.fillText(`Iteration: ${depth}`, canvas.width/2, 85);

            // Attribution and description
            ctx.font = '20px Georgia, serif';
            ctx.fillStyle = '#aaa';
            ctx.fillText('Georg Cantor, 1883', canvas.width/2, canvas.height - 55);
            ctx.font = '16px Georgia, serif';
            ctx.fillStyle = '#666';
            ctx.fillText('Remove the middle third, forever', canvas.width/2, canvas.height - 28);
        },
    },

    // =====================================================
    // SLIDE 10: What Is a Fractal?
    // =====================================================
    {
        meta: { topic: 'definition' },
        render: (ctx, canvas, time) => {
            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Multi-phase slide
            const phaseDuration = 6000;
            const transitionDuration = 600;
            const numPhases = 4;
            const totalCycle = phaseDuration * numPhases;
            const cycleTime = time % totalCycle;
            const phase = Math.floor(cycleTime / phaseDuration);
            const phaseTime = cycleTime % phaseDuration;

            let fadeIn = 1, fadeOut = 1;
            if (phaseTime < transitionDuration) fadeIn = phaseTime / transitionDuration;
            if (phaseTime > phaseDuration - transitionDuration) fadeOut = (phaseDuration - phaseTime) / transitionDuration;
            const alpha = Math.min(fadeIn, fadeOut);

            // Phase indicator dots
            ctx.fillStyle = '#333';
            for (let i = 0; i < numPhases; i++) {
                ctx.beginPath();
                ctx.arc(canvas.width/2 - 30 + i * 20, canvas.height - 25, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.arc(canvas.width/2 - 30 + phase * 20, canvas.height - 25, 5, 0, Math.PI * 2);
            ctx.fill();

            // Title
            ctx.fillStyle = '#fff';
            ctx.font = '600 44px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('What Is a Fractal?', canvas.width/2, 55);

            ctx.globalAlpha = alpha;

            if (phase === 0) {
                // The strict definition
                ctx.fillStyle = '#e88';
                ctx.font = '600 28px Georgia, serif';
                ctx.fillText('The Strict Definition', canvas.width/2, 120);

                ctx.fillStyle = '#fff';
                ctx.font = 'italic 32px Georgia, serif';
                ctx.fillText('"Self-similar at every scale"', canvas.width/2, 180);

                ctx.fillStyle = '#8e8';
                ctx.font = '24px Georgia, serif';
                ctx.fillText('✓ Sierpiński Triangle', canvas.width/2, 240);
                ctx.fillText('✓ Koch Snowflake', canvas.width/2, 275);
                ctx.fillText('✓ Cantor Set', canvas.width/2, 310);

                ctx.fillStyle = '#aaa';
                ctx.font = '20px Georgia, serif';
                ctx.fillText('Zoom in anywhere → see exact copies of the whole', canvas.width/2, 370);
            }
            else if (phase === 1) {
                // The problem
                ctx.fillStyle = '#e88';
                ctx.font = '600 28px Georgia, serif';
                ctx.fillText('But Wait...', canvas.width/2, 120);

                ctx.fillStyle = '#f88';
                ctx.font = '24px Georgia, serif';
                ctx.fillText('✗ Mandelbrot Set — quasi-self-similar', canvas.width/2, 180);
                ctx.fillText('✗ Mandelbulb — invented to "look fractal"', canvas.width/2, 215);
                ctx.fillText('✗ Mandelbox — engineered folding rules', canvas.width/2, 250);
                ctx.fillText('✗ Julia Sets — similar but not identical', canvas.width/2, 285);

                ctx.fillStyle = '#aaa';
                ctx.font = '20px Georgia, serif';
                ctx.fillText('These have detail at every scale...', canvas.width/2, 340);
                ctx.fillText('but not exact self-similarity', canvas.width/2, 370);
            }
            else if (phase === 2) {
                // Mandelbrot's view
                ctx.fillStyle = '#8af';
                ctx.font = '600 28px Georgia, serif';
                ctx.fillText("Mandelbrot's Definition", canvas.width/2, 120);

                ctx.fillStyle = '#fff';
                ctx.font = 'italic 28px Georgia, serif';
                ctx.fillText('"A rough or fragmented geometric shape', canvas.width/2, 175);
                ctx.fillText('that can be split into parts, each of which is', canvas.width/2, 215);
                ctx.fillText('(at least approximately) a reduced-size', canvas.width/2, 255);
                ctx.fillText('copy of the whole."', canvas.width/2, 295);

                ctx.fillStyle = '#aaa';
                ctx.font = '20px Georgia, serif';
                ctx.fillText('He intentionally kept it loose.', canvas.width/2, 360);
            }
            else if (phase === 3) {
                // The honest answer
                ctx.fillStyle = '#ad8';
                ctx.font = '600 28px Georgia, serif';
                ctx.fillText('The Practical Answer', canvas.width/2, 120);

                ctx.fillStyle = '#fff';
                ctx.font = '26px Georgia, serif';
                ctx.fillText('A shape with complex detail', canvas.width/2, 190);
                ctx.fillText('that doesn\'t simplify as you zoom in.', canvas.width/2, 230);

                ctx.fillStyle = '#888';
                ctx.font = '20px Georgia, serif';
                ctx.fillText('Most of what we call "fractals" are really "fractal-like"', canvas.width/2, 310);
                ctx.fillText('— and that\'s fine.', canvas.width/2, 340);
            }

            ctx.globalAlpha = 1;
        },
    },

    // =====================================================
    // SLIDE 11: Quote - Mandelbrot
    // =====================================================
    {
        meta: { topic: 'quote' },
        render: (ctx, canvas, time) => {
            // Subtle animated background
            const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            const shift = Math.sin(time * 0.0005) * 10;
            grad.addColorStop(0, `rgb(${20 + shift}, ${15 + shift}, ${30 + shift})`);
            grad.addColorStop(1, `rgb(${10 + shift}, ${10 + shift}, ${20 + shift})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Quote
            ctx.fillStyle = '#fff';
            ctx.font = 'italic 42px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const quote = [
                '"Clouds are not spheres,',
                'mountains are not cones,',
                'coastlines are not circles,',
                'and bark is not smooth,',
                'nor does lightning travel',
                'in a straight line."'
            ];

            const lineHeight = 60;
            const startY = canvas.height/2 - (quote.length * lineHeight)/2;

            quote.forEach((line, i) => {
                ctx.fillText(line, canvas.width/2, startY + i * lineHeight);
            });

            // Attribution
            ctx.font = '600 28px Georgia, serif';
            ctx.fillStyle = '#aaa';
            ctx.fillText('— Benoît Mandelbrot', canvas.width/2, canvas.height - 80);
            ctx.font = '20px Georgia, serif';
            ctx.fillStyle = '#666';
            ctx.fillText('The Fractal Geometry of Nature, 1982', canvas.width/2, canvas.height - 45);
        },
    },

    // =====================================================
    // SLIDE 12: Quote - Maryam Mirzakhani
    // =====================================================
    {
        meta: { topic: 'quote' },
        render: (ctx, canvas, time) => {
            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Subtle geometric pattern
            ctx.strokeStyle = 'rgba(100, 60, 140, 0.12)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 15; i++) {
                const r = 40 + i * 35;
                ctx.beginPath();
                ctx.arc(canvas.width/2, canvas.height/2, r, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Quote
            ctx.fillStyle = '#fff';
            ctx.font = 'italic 42px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const quote = [
                '"The beauty of mathematics',
                'only shows itself to',
                'more patient followers."'
            ];

            const lineHeight = 62;
            const startY = canvas.height/2 - 70;

            quote.forEach((line, i) => {
                ctx.fillText(line, canvas.width/2, startY + i * lineHeight);
            });

            // Attribution
            ctx.font = '600 28px Georgia, serif';
            ctx.fillStyle = '#aaa';
            ctx.fillText('— Maryam Mirzakhani', canvas.width/2, canvas.height - 100);
            ctx.font = '20px Georgia, serif';
            ctx.fillStyle = '#666';
            ctx.fillText('Clay Mathematics Institute interview, 2008', canvas.width/2, canvas.height - 65);
        },
    },

    // =====================================================
    // SLIDE 13: Quote - Sofia Kovalevskaya
    // =====================================================
    {
        meta: { topic: 'quote' },
        render: (ctx, canvas, time) => {
            // Deep blue gradient background
            const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            grad.addColorStop(0, '#0a1628');
            grad.addColorStop(1, '#1a0a28');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Her actual equations
            ctx.textAlign = 'left';

            // Cauchy-Kovalevskaya PDE
            ctx.fillStyle = 'rgba(140, 180, 220, 0.35)';
            ctx.font = '28px Georgia, serif';
            ctx.fillText('du/dt = F(t, x, u, du/dx)', 30, 50);
            ctx.font = '16px Georgia, serif';
            ctx.fillStyle = 'rgba(140, 180, 220, 0.25)';
            ctx.fillText('Cauchy-Kovalevskaya theorem', 30, 75);

            // Kovalevskaya top conditions
            ctx.fillStyle = 'rgba(200, 160, 220, 0.35)';
            ctx.font = '28px Georgia, serif';
            ctx.textAlign = 'right';
            ctx.fillText('I1 = I2 = 2I3', canvas.width - 30, 50);
            ctx.font = '16px Georgia, serif';
            ctx.fillStyle = 'rgba(200, 160, 220, 0.25)';
            ctx.fillText('Kovalevskaya top', canvas.width - 30, 75);

            // Euler rotation equations
            ctx.fillStyle = 'rgba(160, 200, 180, 0.3)';
            ctx.font = '24px Georgia, serif';
            ctx.textAlign = 'left';
            ctx.fillText('dw/dt + w x Iw = M', 30, canvas.height - 90);

            ctx.textAlign = 'right';
            ctx.fillText('theta-functions', canvas.width - 30, canvas.height - 90);

            // Quote
            ctx.fillStyle = '#fff';
            ctx.font = 'italic 42px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const quote = [
                '"It is impossible to be',
                'a mathematician without',
                'being a poet in soul."'
            ];

            const lineHeight = 62;
            const startY = canvas.height/2 - 70;

            quote.forEach((line, i) => {
                ctx.fillText(line, canvas.width/2, startY + i * lineHeight);
            });

            // Attribution
            ctx.font = '600 28px Georgia, serif';
            ctx.fillStyle = '#aaa';
            ctx.fillText('— Sofia Kovalevskaya', canvas.width/2, canvas.height - 55);
            ctx.font = '18px Georgia, serif';
            ctx.fillStyle = '#666';
            ctx.fillText('A Russian Childhood, 1889', canvas.width/2, canvas.height - 28);
        },
    },
];

// SlideTexture manager class
export class SlideTexture {
    constructor(gl) {
        this.gl = gl;
        this.canvas = document.createElement('canvas');
        this.canvas.width = SLIDE_WIDTH;
        this.canvas.height = SLIDE_HEIGHT;
        this.ctx = this.canvas.getContext('2d');

        this.currentSlideIndex = 0;
        this.slideTime = 0;
        this.lastUpdateTime = 0;

        // Create WebGL texture
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SLIDE_WIDTH, SLIDE_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Render initial frame
        this.update(0, false);
    }

    update(now, isPaused) {
        // Only advance time if not paused
        if (!isPaused && this.lastUpdateTime > 0) {
            const dt = now - this.lastUpdateTime;
            this.slideTime += dt;

            // Check if we should advance to next slide
            if (this.slideTime >= SLIDE_DURATION) {
                this.slideTime = 0;
                this.currentSlideIndex = (this.currentSlideIndex + 1) % slides.length;
            }
        }
        this.lastUpdateTime = now;

        // Only render when not paused, or on first frame
        if (isPaused && this.lastUpdateTime > 0) {
            return; // Don't update texture when paused
        }

        // Render current slide
        const slide = slides[this.currentSlideIndex];
        slide.render(this.ctx, this.canvas, this.slideTime);

        // Upload to GPU
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas);
    }

    getTexture() {
        return this.texture;
    }

    getCurrentSlideIndex() {
        return this.currentSlideIndex;
    }

    getTotalSlides() {
        return slides.length;
    }

    dispose() {
        this.gl.deleteTexture(this.texture);
    }
}

export function createSlideTexture(gl) {
    const manager = new SlideTexture(gl);
    return manager;
}

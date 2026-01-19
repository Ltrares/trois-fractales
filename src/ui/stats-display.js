// FPS and render stats display

export class StatsDisplay {
    constructor(element) {
        this.element = element;
        this.frameCount = 0;
        this.fps = 0;
    }

    update(dt, width, height, passesRun, scissorPct, pos, degeneracy = null) {
        this.frameCount++;
        if (this.frameCount % 30 === 0) {
            this.fps = Math.round(1 / dt);
        }

        const posStr = pos.map(v => v.toFixed(1)).join(', ');
        let text = `${width}x${height} | ${this.fps} fps | passes: ${passesRun + 1} | scissor: ${scissorPct}% | pos: ${posStr}`;

        // Show degeneracy indicator for Mandelbox
        if (degeneracy !== null && degeneracy > 0.1) {
            const bar = '█'.repeat(Math.round(degeneracy * 10));
            const empty = '░'.repeat(10 - Math.round(degeneracy * 10));
            text += ` | DEGEN [${bar}${empty}] ${(degeneracy * 100).toFixed(0)}%`;
        }

        this.element.textContent = text;
    }
}

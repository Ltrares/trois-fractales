// Temporarily freezes fractal parameter animation so a still shot can be framed.
//
// Pressing the key again extends the freeze rather than toggling it off: the
// visitor is lining up a screenshot, and a mis-timed second press shouldn't
// drop them back into a moving scene. The freeze always expires on its own.
//
// The countdown runs on rendered time, not wall clock: it is fed the render
// loop's dt via tickFreeze(). Time spent with the render loop stopped - the
// pause menu, the gallery, a backgrounded tab - does not burn down the freeze,
// so the visitor gets the full duration of actual viewing they asked for.

const FREEZE_MS = 30000;
const ESCAPE_MS = 5000;   // ESC cuts a long freeze short after a screenshot

let el = null;
let remaining = 0;        // ms of render time left; 0 means not frozen

function ensureEl() {
    if (!el) {
        el = document.createElement('div');
        el.className = 'param-freeze';
        document.body.appendChild(el);
    }
    return el;
}

function paint() {
    if (!el) return;
    if (remaining <= 0) {
        el.classList.remove('visible');
        return;
    }
    // Round up so the label reads the full duration the instant it appears and
    // only reaches "1 s" during the final second.
    el.textContent = `Paramètres figés — ${Math.ceil(remaining / 1000)} s`;
}

/**
 * Advance the freeze by one rendered frame. Called from the render loop, which
 * only runs while the scene is actually being drawn.
 * @param {number} dtMs - elapsed render time for this frame
 */
export function tickFreeze(dtMs) {
    if (remaining <= 0) return;
    remaining = Math.max(0, remaining - dtMs);
    paint();
}

/**
 * Freeze parameters, restarting the countdown if already frozen.
 * @param {number} duration - ms of render time to hold (tests override this)
 */
export function extendFreeze(duration = FREEZE_MS) {
    const node = ensureEl();
    remaining = duration;
    node.classList.add('visible');
    paint();
}

export function isFrozen() {
    return remaining > 0;
}

/**
 * Shorten an active freeze to a brief tail, so leaving via ESC gets the
 * visitor back to a moving scene quickly instead of waiting out the timer.
 * A freeze already shorter than the tail is left alone, and nothing happens
 * if parameters aren't frozen at all.
 */
export function cutFreezeShort() {
    if (!isFrozen()) return;
    if (ESCAPE_MS < remaining) {
        remaining = ESCAPE_MS;
        paint();
    }
}

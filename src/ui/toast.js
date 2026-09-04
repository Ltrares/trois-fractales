// Transient on-screen hints.
//
// One toast is visible at a time: a new message replaces whatever is showing
// and restarts the timer, so overlapping hints can't stack up.

let el = null;
let timer = null;

function ensureEl() {
    if (!el) {
        el = document.createElement('div');
        el.className = 'toast';
        document.body.appendChild(el);
    }
    return el;
}

/**
 * Show a transient hint.
 * @param {string} html - message, may contain <kbd> markup
 * @param {number} duration - ms to stay visible (default 5000)
 */
export function showToast(html, duration = 5000) {
    const node = ensureEl();
    clearTimeout(timer);

    node.innerHTML = html;

    // Restart the fade-in even if a toast is already showing.
    node.classList.remove('fading');
    void node.offsetWidth;
    node.classList.add('visible');

    timer = setTimeout(() => {
        node.classList.add('fading');
        node.classList.remove('visible');
    }, duration);
}

export function hideToast() {
    if (!el) return;
    clearTimeout(timer);
    el.classList.add('fading');
    el.classList.remove('visible');
}

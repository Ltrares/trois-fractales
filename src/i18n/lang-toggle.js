// The FR · EN control, wired into both the start overlay and the pause menu.
//
// Both instances stay in sync because they do not hold state: each one renders
// from getLang() and re-renders on every change, whichever one was clicked.

import { getLang, setLang, onLangChange } from './index.js';

function markActive(toggle) {
    const lang = getLang();
    for (const btn of toggle.querySelectorAll('.lang-option')) {
        const isActive = btn.dataset.lang === lang;
        btn.classList.toggle('active', isActive);
        // The active language is not a target - clicking it would be a no-op,
        // and a pressed state on it reads as "already here".
        btn.setAttribute('aria-pressed', String(isActive));
    }
}

/**
 * Wire every .lang-toggle in the document.
 * Safe to call once at startup; later language changes are handled by the
 * subscription rather than by re-calling this.
 */
export function initLangToggles(root = document) {
    const toggles = [...root.querySelectorAll('.lang-toggle')];

    for (const toggle of toggles) {
        toggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.lang-option');
            if (!btn) return;
            // The pause overlay resumes the game on click; the toggle is
            // inside it, so that click must not reach the overlay handler.
            e.stopPropagation();
            setLang(btn.dataset.lang);
        });
        markActive(toggle);
    }

    onLangChange(() => {
        for (const toggle of toggles) markActive(toggle);
    });
}

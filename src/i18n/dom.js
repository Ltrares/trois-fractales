// Applies translations to the static DOM.
//
// Markup carries the key in data-i18n; this walks those elements and sets
// their text. Doing it declaratively means adding a string to the overlay is
// an HTML change plus a table entry, with no wiring in between.
//
// Three attribute variants exist because some strings are not text nodes:
//   data-i18n          - textContent
//   data-i18n-html     - innerHTML, for copy with <kbd> chips inside it
//   data-i18n-attr     - "attrName:key", for title/alt/placeholder

import { t, onLangChange } from './index.js';

export function applyTranslations(root = document) {
    for (const el of root.querySelectorAll('[data-i18n]')) {
        el.textContent = t(el.dataset.i18n);
    }

    for (const el of root.querySelectorAll('[data-i18n-html]')) {
        el.innerHTML = t(el.dataset.i18nHtml);
    }

    for (const el of root.querySelectorAll('[data-i18n-attr]')) {
        // "title:gallery.download" or several, comma-separated.
        for (const pair of el.dataset.i18nAttr.split(',')) {
            const [attr, key] = pair.split(':').map(s => s.trim());
            if (attr && key) el.setAttribute(attr, t(key));
        }
    }
}

/**
 * Apply translations now and on every subsequent language change.
 * Call once at startup.
 */
export function initDomTranslations() {
    applyTranslations();
    onLangChange(() => applyTranslations());
}

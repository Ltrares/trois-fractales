// Language state and string lookup.
//
// The initial language follows the browser unless the visitor has picked one
// before, in which case their choice wins. Switching is a runtime operation:
// the DOM is retagged in place and the gallery wall texture is rebaked, so
// nothing here requires a reload.

import { STRINGS, UNTRANSLATED } from './strings.js';

const STORAGE_KEY = 'troisFractales.lang';
const LANGS = ['fr', 'en'];
const DEFAULT_LANG = 'fr';

let current = detectInitial();
const listeners = new Set();

function detectInitial() {
    // A stored choice is deliberate and outranks the browser's setting.
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (LANGS.includes(saved)) return saved;
    } catch (e) {
        // Private browsing or blocked storage: fall through to detection.
    }

    // navigator.languages is ordered by preference; the first entry that names
    // a language we have wins. 'fr-CA' and 'fr' both match French.
    const preferred = navigator.languages || [navigator.language];
    for (const tag of preferred) {
        if (!tag) continue;
        const base = tag.toLowerCase().split('-')[0];
        if (LANGS.includes(base)) return base;
    }
    return DEFAULT_LANG;
}

export function getLang() {
    return current;
}

/**
 * Switch language and notify listeners. A no-op if the language is unchanged,
 * so callers can fire this freely without guarding.
 * @param {string} lang - 'fr' or 'en'
 */
export function setLang(lang) {
    if (!LANGS.includes(lang) || lang === current) return;
    current = lang;

    try {
        localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
        // Storage unavailable: the switch still applies for this session.
    }

    document.documentElement.lang = lang;
    for (const fn of listeners) fn(lang);
}

export function toggleLang() {
    setLang(current === 'fr' ? 'en' : 'fr');
}

/**
 * Register a callback to run on every language change. Returns an unsubscribe
 * function. Used by the wall texture, which has to rebake, and by the gallery,
 * which redraws its grid.
 */
export function onLangChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

/**
 * Look up a string, substituting {placeholders} from params.
 *
 * A missing key returns the key itself rather than throwing or rendering
 * blank: a visible 'pause.title' in the UI is a far louder bug report than an
 * empty element, and it cannot take the gallery down mid-render.
 *
 * @param {string} key - e.g. 'pause.title'
 * @param {Object} [params] - values for {placeholder} substitution
 */
export function t(key, params) {
    const table = STRINGS[current] || STRINGS[DEFAULT_LANG];
    let str = table[key];

    if (str === undefined) str = UNTRANSLATED[key];
    if (str === undefined) {
        // Fall back to the default language before giving up, so a key that is
        // merely untranslated still reads correctly.
        str = STRINGS[DEFAULT_LANG][key];
    }
    if (str === undefined) {
        console.warn(`[i18n] missing key: ${key}`);
        return key;
    }

    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (match, name) =>
        Object.prototype.hasOwnProperty.call(params, name) ? params[name] : match
    );
}

/**
 * Plural-aware lookup. Reads `${key}.one` or `${key}.other` and substitutes
 * {n}. French and English differ at zero - "0 capture" against "0 screenshots"
 * - which is why the choice lives in each table rather than being computed
 * from the count alone.
 */
export function tn(key, n) {
    const isOne = current === 'fr' ? Math.abs(n) < 2 : Math.abs(n) === 1;
    return t(`${key}.${isOne ? 'one' : 'other'}`, { n });
}

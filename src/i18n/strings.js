// Translation table.
//
// The gallery's educational content - the slide deck and the ray-marching
// diagram - is deliberately absent. Those are English in both languages: the
// vocabulary (ray marching, distance estimation, aliasing) is English-native,
// and translating 160 hand-positioned canvas strings would buy little.
//
// Keys are namespaced by where the string appears, not by what it says, so
// rewording the copy never orphans a translation.

export const STRINGS = {
    fr: {
        // Start overlay
        'app.title': 'Trois Fractales',
        'start.computing': 'Calcul des ombres...',
        // {n}/{total} shadow layers baked so far
        'start.computingProgress': 'Calcul des ombres... {n}/{total}',
        'start.enter': 'Entrez',
        'hint.desktop': "WASD déplacer | Souris regarder | Z zoom | C s'accroupir | R aléatoire | ESC quitter",
        'hint.touch': 'Toucher et glisser pour se déplacer et regarder',
        'warning.epilepsy': '⚠️ Avertissement : ce contenu peut provoquer des crises chez les personnes épileptiques photosensibles.',

        // Pause menu. The .key chips (WASD, Z, C...) are keyboard labels and
        // are not translated; only the descriptions are.
        'pause.title': 'Pause',
        'pause.move': 'Déplacer',
        'pause.mouseKey': 'Souris',
        'pause.look': 'Regarder',
        'pause.zoom': 'Zoom (maintenir)',
        'pause.crouch': "S'accroupir (maintenir)",
        'pause.random': 'Fractales aléatoires',
        'pause.screenshot': "Capture d'écran",
        'pause.freeze': 'Figer les paramètres (30 s)',
        'pause.release': 'Libérer les paramètres',
        'pause.gallery': 'Galerie',
        'pause.source': 'Code source',
        'pause.resume': 'ESPACE ou cliquer pour reprendre',

        // Screenshot gallery
        'gallery.title': "Captures d'écran",
        // Rendered as HTML - the key chips are markup, not placeholders.
        'gallery.hint': 'Cliquer pour agrandir | ↓ pour télécharger | Suppr pour effacer | <span class="key">G</span> ou <span class="key">ESC</span> pour fermer',
        'gallery.empty': 'Aucune capture. Appuyez sur T pour capturer.',
        'gallery.download': 'Télécharger',
        'gallery.imageAlt': "Capture d'écran",
        // French keeps the singular at zero: "0 capture", "1 capture",
        // "2 captures". English pluralises at zero instead, so this is the one
        // key whose rule genuinely differs between the two tables.
        'gallery.count.one': '{n} capture',
        'gallery.count.other': '{n} captures',

        // Toasts. These carry <kbd> markup - see showToast.
        'toast.cursorHint': 'Appuyez sur <kbd>ÉCHAP</kbd> pour libérer le curseur',
        'toast.galleryHint': 'Appuyez sur <kbd>G</kbd> pour ouvrir la galerie',
        'toast.galleryFull': 'Galerie pleine — image téléchargée. Appuyez sur <kbd>G</kbd> pour faire de la place.',
        'toast.frozen': 'Paramètres figés — {n} s',

        // Gallery wall texture (canvas-baked)
        'wall.title': 'TROIS FRACTALES',
        'wall.subtitle': 'et Leurs Ombres Peintes',
        'wall.mandelbulb.location': 'Galerie Ouest',
        'wall.mandelbulb.desc': "Cette formule, créée en 2009, est une extension tridimensionnelle de l'ensemble de Mandelbrot. Elle produit des formes qui ressemblent au chou romanesco.",
        'wall.mandelbox.location': 'Galerie Sud',
        'wall.mandelbox.desc': "Cette formule, découverte en 2010, ressemble à un labyrinthe de structures extraterrestres et peut se réduire à un seul point.",
        'wall.julia.title': 'JULIA TRANCHE',
        'wall.julia.location': 'Galerie Est',
        'wall.julia.desc': "L'ensemble de Gaston Julia, découvert en 1918, est ici étendu à quatre dimensions. On coupe l'espace 4D pour créer une tranche 3D de tubes faits de fractales 2D.",
        'wall.general': "Les fractales sont des formes définies par des formules mathématiques répétées. Ces formules génèrent plus de détails à chaque échelle. Les surfaces que vous voyez sont les frontières de ces formules. Pour afficher en temps réel, on impose des limites à la complexité et à la qualité visuelle.",
    },

    en: {
        'app.title': 'Trois Fractales',
        'start.computing': 'Computing shadows...',
        'start.computingProgress': 'Computing shadows... {n}/{total}',
        'start.enter': 'Enter',
        'hint.desktop': 'WASD move | Mouse look | Z zoom | C crouch | R randomise | ESC quit',
        'hint.touch': 'Touch and drag to move and look',
        'warning.epilepsy': '⚠️ Warning: this content may trigger seizures in people with photosensitive epilepsy.',

        'pause.title': 'Paused',
        'pause.move': 'Move',
        'pause.mouseKey': 'Mouse',
        'pause.look': 'Look',
        'pause.zoom': 'Zoom (hold)',
        'pause.crouch': 'Crouch (hold)',
        'pause.random': 'Randomise fractals',
        'pause.screenshot': 'Screenshot',
        'pause.freeze': 'Freeze parameters (30 s)',
        'pause.release': 'Release parameters',
        'pause.gallery': 'Gallery',
        'pause.source': 'Source',
        'pause.resume': 'SPACE or click to resume',

        'gallery.title': 'Screenshots',
        'gallery.hint': 'Click to enlarge | ↓ to download | Del to erase | <span class="key">G</span> or <span class="key">ESC</span> to close',
        'gallery.empty': 'No screenshots. Press T to capture.',
        'gallery.download': 'Download',
        'gallery.imageAlt': 'Screenshot',
        'gallery.count.one': '{n} screenshot',
        'gallery.count.other': '{n} screenshots',

        'toast.cursorHint': 'Press <kbd>ESC</kbd> to release the cursor',
        'toast.galleryHint': 'Press <kbd>G</kbd> to open the gallery',
        'toast.galleryFull': 'Gallery full — image downloaded. Press <kbd>G</kbd> to make room.',
        'toast.frozen': 'Parameters frozen — {n} s',

        'wall.title': 'TROIS FRACTALES',
        'wall.subtitle': 'and Their Painted Shadows',
        'wall.mandelbulb.location': 'West Gallery',
        'wall.mandelbulb.desc': 'This formula, created in 2009, is a three-dimensional extension of the Mandelbrot set. It produces shapes resembling romanesco broccoli.',
        'wall.mandelbox.location': 'South Gallery',
        'wall.mandelbox.desc': 'This formula, discovered in 2010, resembles a labyrinth of alien structures and can collapse to a single point.',
        'wall.julia.title': 'JULIA SLICE',
        'wall.julia.location': 'East Gallery',
        'wall.julia.desc': 'The set of Gaston Julia, discovered in 1918, is extended here to four dimensions. We cut through 4D space to create a 3D slice of tubes made from 2D fractals.',
        'wall.general': 'Fractals are shapes defined by repeated mathematical formulas. These formulas generate more detail at every scale. The surfaces you see are the boundaries of those formulas. To render in real time, we impose limits on complexity and visual quality.',
    },
};

// MANDELBULB and MANDELBOX are proper nouns and identical in both tables, so
// they live here rather than being duplicated. JULIA TRANCHE / JULIA SLICE is
// not - "tranche" is a description, not a name - and it stays keyed above.
export const UNTRANSLATED = {
    'wall.mandelbulb.title': 'MANDELBULB',
    'wall.mandelbox.title': 'MANDELBOX',
    'wall.signature': '— P  Fluff',
};

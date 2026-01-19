// GalleryGeometry.js
// Single source of truth for all gallery geometry, lights, and materials

// ============ CORE DIMENSIONS ============

export const FLOOR_Y = 0.0;
export const CEILING_Y = 5.0;
export const WALL_HEIGHT = 5.0;
export const WALL_HALF_HEIGHT = 2.5;
export const WALL_THICKNESS = 0.3;

// ============ FRACTALS ============

export const FRACTALS = {
    mandelbox: {
        position: [0.0, 1.8, -11.0],
        bboxHalf: [1.2, 1.2, 1.2],
        scale: 0.9,
        // Spotlight offset from fractal center
        spotlightOffset: [-1.5, -1.5, 1.5],
    },
    mandelbulb: {
        position: [-11.0, 1.8, 0.0],
        bboxHalf: [1.3, 1.3, 1.3],
        scale: 1.0,
        spotlightOffset: [1.5, -1.5, 1.5],
    },
    julia: {
        position: [11.0, 1.6, 0.0],
        bboxHalf: [0.8, 0.8, 0.8],  // smaller bbox for cross-section display
        scale: 1.34,
        spotlightOffset: [-1.5, -1.5, 1.5],
    },
};

// Derived spotlight positions
export const FRACTAL_SPOTLIGHTS = {
    mandelbox: vecAdd(FRACTALS.mandelbox.position, FRACTALS.mandelbox.spotlightOffset),
    mandelbulb: vecAdd(FRACTALS.mandelbulb.position, FRACTALS.mandelbulb.spotlightOffset),
    julia: vecAdd(FRACTALS.julia.position, FRACTALS.julia.spotlightOffset),
};

// ============ PEDESTALS ============

export const PEDESTALS = {
    mandelbox: { center: [0.0, 0.1, -11.0], halfExtents: [0.8, 0.4, 0.8] },
    mandelbulb: { center: [-11.0, 0.1, 0.0], halfExtents: [0.8, 0.4, 0.8] },
    julia: { center: [11.0, 0.1, 0.0], halfExtents: [0.8, 0.65, 0.8] },
};

// ============ LIGHTS ============

export const CEILING_LIGHTS = {
    mandelboxEntrance: { position: [0.0, 4.8, -6.0], aimDir: [0.0, -1.0, -0.3] },
    mandelbulbEntrance: { position: [-6.0, 4.8, 0.0], aimDir: [-0.3, -1.0, 0.0] },
    juliaEntrance: { position: [6.0, 4.8, 0.0], aimDir: [0.3, -1.0, 0.0] },
    atriumCenter: { position: [0.0, 4.8, 0.0], aimDir: [0.0, -1.0, 0.0] },
};

export const WALL_SPOTLIGHTS = {
    left: { position: [-3.0, 0.2, 3.5], target: [0.0, 4.0, 6.0] },
    right: { position: [3.0, 0.2, 3.5], target: [0.0, 4.0, 6.0] },
    top: { position: [0.0, 4.8, 4.0], target: [0.0, 3.5, 5.0] },
};

// ============ EASTER EGG: PEEPHOLE ============

export const PEEPHOLE = {
    position: [2.3231, 0.5751, 4.7],   // World position (x, y, z) on front wall
    radius: 0.022,                  // Size of the peephole in meters
    image: 'maga_lisa.png',           // Image to show through the peephole
    revealStart: 3.0,             // Distance where image starts to appear
    revealEnd: 0.02,               // Distance where image is fully visible
};

// ============ WALLS (as boxes with center + halfExtents) ============

// Material IDs:
// 0 = Dark concrete (default walls, ceiling, pedestals)
// 1 = Floor (dark reflective)
// 2 = Front title wall
// 3 = Mandelbox code wall (right wall in corridor)
// 4 = Mandelbulb code wall (back wall in corridor)
// 5 = Julia code wall (front wall in corridor)
export const MATERIAL_IDS = {
    DARK_CONCRETE: 0,
    FLOOR: 1,
    TITLE_WALL: 2,
    MANDELBOX_CODE: 3,
    MANDELBULB_CODE: 4,
    JULIA_CODE: 5,
};

// ============ SLIDE PROJECTION ============
// Defines where slides are projected in world space (like a projector on floor)
// Independent of wall materials - just overlays on whatever surface is there
export const SLIDE_PROJECTION = {
    // Center of the projection rectangle on the atrium floor
    center: [0.0, 0.01, -1.0],
    // Half-extents defining the projection area
    // For floor: width is along x, height is along z
    halfWidth: 2.0,      // x direction
    halfHeight: 1.5,     // z direction (maintains 4:3 aspect ratio)
    // Which axis the projection faces (normal direction)
    facing: '+y',        // faces up from floor
};

// Material definitions with colors and optional texture UV regions
// textureRegion defines the world-space bounds where texture is mapped
// axis: which world axis maps to UV.x ('x', 'z', or '-x', '-z' for flipped)
export const MATERIALS = {
    [MATERIAL_IDS.DARK_CONCRETE]: {
        color: [0.25, 0.24, 0.26],
    },
    [MATERIAL_IDS.FLOOR]: {
        color: [0.04, 0.04, 0.05],
    },
    [MATERIAL_IDS.TITLE_WALL]: {
        color: [0.18, 0.17, 0.16],
        texture: 'wallTex',
        // Texture region in world space (x, y bounds)
        uvRegion: {
            axis: 'x',
            minX: -6.0, maxX: 6.0,    // 12 units wide, centered
            minY: 0.3, maxY: 4.7,      // 4.4 units tall
        },
    },
    [MATERIAL_IDS.MANDELBOX_CODE]: {
        color: [0.15, 0.14, 0.13],
        texture: 'mandelboxCodeTex',
        uvRegion: {
            axis: '-z',               // UV.x from -z direction
            minX: -6.0, maxX: -18.0,  // z range (note: min > max means flip)
            minY: 0.3, maxY: 4.7,     // 4.4 units tall
        },
    },
    [MATERIAL_IDS.MANDELBULB_CODE]: {
        color: [0.15, 0.14, 0.13],
        texture: 'mandelbulbCodeTex',
        uvRegion: {
            axis: '-x',               // UV.x from -x direction
            minX: -6.0, maxX: -18.0,  // x range
            minY: 0.3, maxY: 4.7,
        },
    },
    [MATERIAL_IDS.JULIA_CODE]: {
        color: [0.15, 0.14, 0.13],
        texture: 'juliaCodeTex',
        uvRegion: {
            axis: 'x',
            minX: 6.0, maxX: 18.0,    // x range
            minY: 0.3, maxY: 4.7,
        },
    },
};

//Important: make sure wall shadowId matches SHADOW_SURFACES entries below!
export const WALLS = {
    // Front title wall
    frontWall: {
        center: [0.0, WALL_HALF_HEIGHT, 5.0],
        halfExtents: [8.0, WALL_HALF_HEIGHT, WALL_THICKNESS],
        materialId: MATERIAL_IDS.TITLE_WALL,
        shadowId: 2, // front-wall
    },

    // Mandelbox corridor
    mandelboxLeft: {
        center: [-4.0, WALL_HALF_HEIGHT, -12.0],
        halfExtents: [WALL_THICKNESS, WALL_HALF_HEIGHT, 6.0],
        materialId: MATERIAL_IDS.DARK_CONCRETE,
        shadowId: 10, // mandelbox-left
    },
    mandelboxRight: {
        center: [4.0, WALL_HALF_HEIGHT, -12.0],
        halfExtents: [WALL_THICKNESS, WALL_HALF_HEIGHT, 6.0],
        materialId: MATERIAL_IDS.MANDELBOX_CODE,
        shadowId: 11, // mandelbox-right
    },
    mandelboxBack: {
        center: [0.0, WALL_HALF_HEIGHT, -18.0],
        halfExtents: [4.0, WALL_HALF_HEIGHT, WALL_THICKNESS],
        materialId: MATERIAL_IDS.DARK_CONCRETE,
        shadowId: 3, // mandelbox-back
    },

    // Mandelbulb corridor
    mandelbulbFront: {
        center: [-12.0, WALL_HALF_HEIGHT, 4.0],
        halfExtents: [6.0, WALL_HALF_HEIGHT, WALL_THICKNESS],
        materialId: MATERIAL_IDS.DARK_CONCRETE,
        shadowId: 4, // mandelbulb-front
    },
    mandelbulbBack: {
        center: [-12.0, WALL_HALF_HEIGHT, -4.0],
        halfExtents: [6.0, WALL_HALF_HEIGHT, WALL_THICKNESS],
        materialId: MATERIAL_IDS.MANDELBULB_CODE,
        shadowId: 5, // mandelbulb-back
    },
    mandelbulbEnd: {
        center: [-18.0, WALL_HALF_HEIGHT, 0.0],
        halfExtents: [WALL_THICKNESS, WALL_HALF_HEIGHT, 4.0],
        materialId: MATERIAL_IDS.DARK_CONCRETE,
        shadowId: 12, // mandelbulb-end
    },

    // Julia corridor
    juliaFront: {
        center: [12.0, WALL_HALF_HEIGHT, 4.0],
        halfExtents: [6.0, WALL_HALF_HEIGHT, WALL_THICKNESS],
        materialId: MATERIAL_IDS.JULIA_CODE,
        shadowId: 6, // julia-front
    },
    juliaBack: {
        center: [12.0, WALL_HALF_HEIGHT, -4.0],
        halfExtents: [6.0, WALL_HALF_HEIGHT, WALL_THICKNESS],
        materialId: MATERIAL_IDS.DARK_CONCRETE,
        shadowId: 7, // julia-back
    },
    juliaEnd: {
        center: [18.0, WALL_HALF_HEIGHT, 0.0],
        halfExtents: [WALL_THICKNESS, WALL_HALF_HEIGHT, 4.0],
        materialId: MATERIAL_IDS.DARK_CONCRETE,
        shadowId: 13, // julia-end
    },

    // Main gallery enclosure walls (around atrium)
    enclosureWestFront: {
        center: [-6.0, WALL_HALF_HEIGHT, 4.25],
        halfExtents: [WALL_THICKNESS, WALL_HALF_HEIGHT, 1.55],
        materialId: MATERIAL_IDS.DARK_CONCRETE,
        shadowId: 14, // main-west-front
    },
    enclosureEastFront: {
        center: [6.0, WALL_HALF_HEIGHT, 4.25],
        halfExtents: [WALL_THICKNESS, WALL_HALF_HEIGHT, 1.55],
        materialId: MATERIAL_IDS.DARK_CONCRETE,
        shadowId: 15, // main-east-front
    },
    enclosureWestBack: {
        center: [-6.0, WALL_HALF_HEIGHT, -4.75],
        halfExtents: [WALL_THICKNESS, WALL_HALF_HEIGHT, 1.75],
        materialId: MATERIAL_IDS.DARK_CONCRETE,
        shadowId: 16, // main-west-back
    },
    enclosureEastBack: {
        center: [6.0, WALL_HALF_HEIGHT, -4.75],
        halfExtents: [WALL_THICKNESS, WALL_HALF_HEIGHT, 1.75],
        materialId: MATERIAL_IDS.DARK_CONCRETE,
        shadowId: 17, // main-east-back
    },
    enclosureBackLeft: {
        center: [-4.75, WALL_HALF_HEIGHT, -6.0],
        halfExtents: [1.75, WALL_HALF_HEIGHT, WALL_THICKNESS],
        materialId: MATERIAL_IDS.DARK_CONCRETE,
        shadowId: 8, // main-back-left
    },
    enclosureBackRight: {
        center: [4.75, WALL_HALF_HEIGHT, -6.0],
        halfExtents: [1.75, WALL_HALF_HEIGHT, WALL_THICKNESS],
        materialId: MATERIAL_IDS.DARK_CONCRETE,
        shadowId: 9, // main-back-right
    },
};

// ============ GALLERY BOUNDS (for floor/ceiling clipping) ============

export const GALLERY_REGIONS = {
    atrium: { minX: -6.0, maxX: 6.0, minZ: -6.0, maxZ: 5.0 },
    mandelboxCorridor: { minX: -4.0, maxX: 4.0, minZ: -18.0, maxZ: -6.0 },
    mandelbulbCorridor: { minX: -18.0, maxX: -6.0, minZ: -4.0, maxZ: 4.0 },
    juliaCorridor: { minX: 6.0, maxX: 18.0, minZ: -4.0, maxZ: 4.0 },
};

// ============ COLLISION BOUNDS (for camera, slightly inset from walls) ============

export const COLLISION_REGIONS = {
    atrium: { minX: -4.5, maxX: 4.5, minZ: -4.5, maxZ: 4.5 },
    // Rooms start AFTER the enclosure walls (wall at ±6.0 with 0.3 thickness)
    mandelboxRoom: { minX: -3.5, maxX: 3.5, minZ: -17.0, maxZ: -6.5 },
    mandelbulbRoom: { minX: -17.0, maxX: -6.5, minZ: -3.5, maxZ: 3.5 },
    juliaRoom: { minX: 6.5, maxX: 17.0, minZ: -3.5, maxZ: 3.5 },
    // Doorways connect atrium to rooms through the wall gaps
    backDoor: { minX: -2.25, maxX: 2.25, minZ: -6.5, maxZ: -4.5 },
    leftDoor: { minX: -6.5, maxX: -4.5, minZ: -2.25, maxZ: 2.25 },
    rightDoor: { minX: 4.5, maxX: 6.5, minZ: -2.25, maxZ: 2.25 },
};

export const MIN_CAMERA_Y = 0.1;

// ============ SHADOW SURFACES ============
// type: 0=horizontal(y fixed), 1=z-wall(z fixed), 2=x-wall(x fixed)

export const SHADOW_SURFACES = [
    // Horizontal surfaces
    { id: 0, type: 0, fixed: 0.01, minU: -20, maxU: 20, minV: -20, maxV: 8, name: 'floor' },
    { id: 1, type: 0, fixed: 4.99, minU: -20, maxU: 20, minV: -20, maxV: 8, name: 'ceiling' },

    // Z-facing walls (z fixed, XY mapping)
    { id: 2, type: 1, fixed: 4.7, minU: -8, maxU: 8, minV: 0, maxV: 5, name: 'front-wall' },
    { id: 3, type: 1, fixed: -17.7, minU: -4, maxU: 4, minV: 0, maxV: 5, name: 'mandelbox-back' },
    { id: 4, type: 1, fixed: 3.7, minU: -18, maxU: -6, minV: 0, maxV: 5, name: 'mandelbulb-front' },
    { id: 5, type: 1, fixed: -3.7, minU: -18, maxU: -6, minV: 0, maxV: 5, name: 'mandelbulb-back' },
    { id: 6, type: 1, fixed: 3.7, minU: 6, maxU: 18, minV: 0, maxV: 5, name: 'julia-front' },
    { id: 7, type: 1, fixed: -3.7, minU: 6, maxU: 18, minV: 0, maxV: 5, name: 'julia-back' },
    { id: 8, type: 1, fixed: -5.7, minU: -6.5, maxU: -3.0, minV: 0, maxV: 5, name: 'main-back-left' },
    { id: 9, type: 1, fixed: -5.7, minU: 3.0, maxU: 6.5, minV: 0, maxV: 5, name: 'main-back-right' },

    // X-facing walls (x fixed, ZY mapping)
    { id: 10, type: 2, fixed: -3.7, minU: -18, maxU: -6, minV: 0, maxV: 5, name: 'mandelbox-left' },
    { id: 11, type: 2, fixed: 3.7, minU: -18, maxU: -6, minV: 0, maxV: 5, name: 'mandelbox-right' },
    { id: 12, type: 2, fixed: -17.7, minU: -4, maxU: 4, minV: 0, maxV: 5, name: 'mandelbulb-end' },
    { id: 13, type: 2, fixed: 17.7, minU: -4, maxU: 4, minV: 0, maxV: 5, name: 'julia-end' },
    { id: 14, type: 2, fixed: -5.7, minU: 2.7, maxU: 5.8, minV: 0, maxV: 5, name: 'main-west-front' },
    { id: 15, type: 2, fixed: 5.7, minU: 2.7, maxU: 5.8, minV: 0, maxV: 5, name: 'main-east-front' },
    { id: 16, type: 2, fixed: -5.7, minU: -6.5, maxU: -3.0, minV: 0, maxV: 5, name: 'main-west-back' },
    { id: 17, type: 2, fixed: 5.7, minU: -6.5, maxU: -3.0, minV: 0, maxV: 5, name: 'main-east-back' },
];

export const SHADOW_LAYERS = SHADOW_SURFACES.length;
export const SHADOW_TEX_SIZE = 2048;

// ============ CAMERA ============

export const CAMERA_START = [0.1, 1.7, -6.1];
export const CAMERA_HOME = [0.1, 1.7, -6.1];

// ============ CULLING ============

export const FRACTAL_CULL_RADIUS = 2.5;

// ============ HELPER FUNCTIONS ============

function vecAdd(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function isPointInGallery(x, z) {
    for (const region of Object.values(GALLERY_REGIONS)) {
        if (x >= region.minX && x <= region.maxX && z >= region.minZ && z <= region.maxZ) {
            return true;
        }
    }
    return false;
}

export function isValidCameraPosition(x, y, z) {
    if (y < MIN_CAMERA_Y) return false;
    for (const region of Object.values(COLLISION_REGIONS)) {
        if (x >= region.minX && x <= region.maxX && z >= region.minZ && z <= region.maxZ) {
            return true;
        }
    }
    return false;
}

// ============ GLSL CODE GENERATION ============

export function generateGLSLConstants() {
    const lines = [];

    lines.push('// === AUTO-GENERATED FROM GalleryGeometry.js ===');
    lines.push('');

    // Floor/ceiling
    lines.push(`const float FLOOR_Y = ${FLOOR_Y.toFixed(1)};`);
    lines.push(`const float CEILING_Y = ${CEILING_Y.toFixed(1)};`);
    lines.push('');

    // Fractal positions
    lines.push('// Fractal display positions');
    for (const [name, f] of Object.entries(FRACTALS)) {
        const upper = name.toUpperCase();
        lines.push(`const vec3 DISPLAY_${upper} = vec3(${f.position.map(v => v.toFixed(1)).join(', ')});`);
    }
    lines.push('');

    // Fractal bounding boxes and scales
    lines.push('// Fractal bounding boxes and scales');
    for (const [name, f] of Object.entries(FRACTALS)) {
        const upper = name.toUpperCase();
        const bbox = f.bboxHalf;
        // Use uniform bbox if all components equal
        if (bbox[0] === bbox[1] && bbox[1] === bbox[2]) {
            lines.push(`const vec3 ${upper}_BBOX = vec3(${bbox[0].toFixed(1)});`);
        } else {
            lines.push(`const vec3 ${upper}_BBOX = vec3(${bbox.map(v => v.toFixed(1)).join(', ')});`);
        }
        lines.push(`const float ${upper}_SCALE = ${f.scale.toFixed(1)};`);
    }
    lines.push('');

    // Ceiling lights
    lines.push('// Ceiling lights');
    const ceilLightNames = ['CEILING_LIGHT_1', 'CEILING_LIGHT_2', 'CEILING_LIGHT_3'];
    const ceilLights = Object.values(CEILING_LIGHTS);
    for (let i = 0; i < ceilLights.length; i++) {
        lines.push(`const vec3 ${ceilLightNames[i]} = vec3(${ceilLights[i].position.map(v => v.toFixed(1)).join(', ')});`);
    }
    lines.push('');

    return lines.join('\n');
}

export function generateGLSLWallTracing() {
    const lines = [];
    lines.push('// === AUTO-GENERATED WALL TRACING ===');

    for (const [, wall] of Object.entries(WALLS)) {
        const c = wall.center.map(v => v.toFixed(1)).join(', ');
        const h = wall.halfExtents.map(v => v.toFixed(1)).join(', ');
        lines.push(`    d = rayBox(ro, rd, vec3(${c}), vec3(${h}), n);`);
        lines.push(`    if (d > 0.0 && d < t) { t = d; matId = ${wall.materialId}; normal = n; }`);
    }

    // Pedestals
    lines.push('');
    lines.push('    // Pedestals');
    for (const [, ped] of Object.entries(PEDESTALS)) {
        const c = ped.center.map(v => v.toFixed(1)).join(', ');
        const h = ped.halfExtents.map(v => v.toFixed(1)).join(', ');
        lines.push(`    d = rayBox(ro, rd, vec3(${c}), vec3(${h}), n);`);
        lines.push(`    if (d > 0.0 && d < t) { t = d; matId = 0; normal = n; }`);
    }

    return lines.join('\n');
}

export function generateGLSLGalleryDE() {
    const lines = [];
    lines.push('// === AUTO-GENERATED GALLERY SDF ===');
    lines.push('float galleryDE(vec3 p) {');
    lines.push('    float d = 1000.0;');
    lines.push('');
    lines.push('    // Floor and Ceiling');
    lines.push('    d = min(d, p.y);');
    lines.push(`    d = min(d, ${CEILING_Y.toFixed(1)} - p.y);`);
    lines.push('');

    // Walls
    lines.push('    // Walls');
    for (const [, wall] of Object.entries(WALLS)) {
        const c = wall.center.map(v => v.toFixed(1)).join(', ');
        const h = wall.halfExtents.map(v => v.toFixed(1)).join(', ');
        lines.push(`    d = min(d, sdBox(p - vec3(${c}), vec3(${h})));`);
    }
    lines.push('');

    // Pedestals
    lines.push('    // Pedestals');
    for (const [, ped] of Object.entries(PEDESTALS)) {
        const c = ped.center.map(v => v.toFixed(1)).join(', ');
        const h = ped.halfExtents.map(v => v.toFixed(1)).join(', ');
        lines.push(`    d = min(d, sdBox(p - vec3(${c}), vec3(${h})));`);
    }
    lines.push('');
    lines.push('    return d;');
    lines.push('}');

    return lines.join('\n');
}

export function generateGLSLIsInGallery() {
    const lines = [];
    lines.push('bool isInGallery(float x, float z) {');
    for (const [, region] of Object.entries(GALLERY_REGIONS)) {
        lines.push(`    if (x >= ${region.minX.toFixed(1)} && x <= ${region.maxX.toFixed(1)} && z >= ${region.minZ.toFixed(1)} && z <= ${region.maxZ.toFixed(1)}) return true;`);
    }
    lines.push('    return false;');
    lines.push('}');
    return lines.join('\n');
}

// Legacy exports for backwards compatibility with constants.js
export const DISPLAY_POSITIONS = {
    mandelbox: FRACTALS.mandelbox.position,
    mandelbulb: FRACTALS.mandelbulb.position,
    julia: FRACTALS.julia.position,
};

export const DISPLAY_BBOX_HALF = {
    mandelbox: FRACTALS.mandelbox.bboxHalf,
    mandelbulb: FRACTALS.mandelbulb.bboxHalf,
    julia: FRACTALS.julia.bboxHalf,
};

export const FRACTAL_SCALES = {
    mandelbox: FRACTALS.mandelbox.scale,
    mandelbulb: FRACTALS.mandelbulb.scale,
    julia: FRACTALS.julia.scale,
};

// Re-export geometry from central source
export {
    DISPLAY_POSITIONS,
    DISPLAY_BBOX_HALF,
    FRACTAL_SCALES,
    SHADOW_SURFACES,
    SHADOW_LAYERS,
    SHADOW_TEX_SIZE,
    FRACTAL_CULL_RADIUS as FRACTAL_RADIUS,
} from '../geometry/GalleryGeometry.js';

// Camera settings
export const MOVE_SPEED = 2.0;
export const RUN_MULTIPLIER = 2.0;
export const MOUSE_SENS = 0.001;
export const STAND_HEIGHT = 1.7;
export const CROUCH_HEIGHT = 0.7;
export const CROUCH_SPEED = 8.0;

// Rendering settings
// Quality can be set via URL param: ?q=0.5 (mobile), ?q=1 (default), ?q=2 (high)
function getQuality() {
    const params = new URLSearchParams(window.location.search);
    const q = parseFloat(params.get('q'));
    if (!isNaN(q) && q > 0 && q <= 4) return q;
    // Default: lower for mobile, higher for desktop
    return window.innerWidth <= 768 ? 0.5 : 1.0;
}
export const RENDER_QUALITY = getQuality();

// Gallery collision detection (JS-side)
// Uses central geometry definition

import { isValidCameraPosition, MIN_CAMERA_Y } from '../geometry/GalleryGeometry.js';

export function gallerySDFJS(x, y, z) {
    // Floor check
    if (y < MIN_CAMERA_Y) return 0;

    // Use central geometry for bounds checking
    if (isValidCameraPosition(x, y, z)) {
        return 1.0; // Valid position
    }

    return 0; // Invalid - wall
}

export { isValidCameraPosition as isValidPosition };

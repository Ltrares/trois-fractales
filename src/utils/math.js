// Vector and projection utilities

// Project a 3D point to screen space, returns [x, y, depth] in pixels
export function projectToScreen(point, camPos, camDir, camRight, camUp, focalLength, width, height) {
    const toPoint = [
        point[0] - camPos[0],
        point[1] - camPos[1],
        point[2] - camPos[2]
    ];

    const z = toPoint[0] * camDir[0] + toPoint[1] * camDir[1] + toPoint[2] * camDir[2];
    if (z <= 0.01) return null; // Behind camera

    const x = toPoint[0] * camRight[0] + toPoint[1] * camRight[1] + toPoint[2] * camRight[2];
    const y = toPoint[0] * camUp[0] + toPoint[1] * camUp[1] + toPoint[2] * camUp[2];

    // Project to normalized coords then to pixels
    const nx = (x / z) * focalLength;
    const ny = (y / z) * focalLength;

    const px = (nx + 0.5 * (width / height)) * height;
    const py = (ny + 0.5) * height;

    return [px, py, z];
}

// Get screen-space bounding rect of a 3D AABB, returns {x, y, w, h} or null if not visible
export function getBoxScreenRect(center, halfSize, camPos, camDir, camRight, camUp, focalLength, width, height) {
    // Generate 8 corners of the box
    const corners = [];
    for (let i = 0; i < 8; i++) {
        corners.push([
            center[0] + halfSize[0] * ((i & 1) ? 1 : -1),
            center[1] + halfSize[1] * ((i & 2) ? 1 : -1),
            center[2] + halfSize[2] * ((i & 4) ? 1 : -1)
        ]);
    }

    // Project all corners
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let anyVisible = false;

    for (const corner of corners) {
        const proj = projectToScreen(corner, camPos, camDir, camRight, camUp, focalLength, width, height);
        if (proj) {
            anyVisible = true;
            minX = Math.min(minX, proj[0]);
            maxX = Math.max(maxX, proj[0]);
            minY = Math.min(minY, proj[1]);
            maxY = Math.max(maxY, proj[1]);
        }
    }

    if (!anyVisible) return null;

    // Clamp to screen bounds with some padding
    minX = Math.max(0, Math.floor(minX) - 1);
    maxX = Math.min(width, Math.ceil(maxX) + 1);
    minY = Math.max(0, Math.floor(minY) - 1);
    maxY = Math.min(height, Math.ceil(maxY) + 1);

    if (minX >= maxX || minY >= maxY) return null;

    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// Frustum culling: check if a bounding sphere is visible
export function isSphereInFrustum(sphereCenter, sphereRadius, camPos, camDir, camRight, camUp, focalLength, aspectRatio) {
    // Vector from camera to sphere center
    const toSphereX = sphereCenter[0] - camPos[0];
    const toSphereY = sphereCenter[1] - camPos[1];
    const toSphereZ = sphereCenter[2] - camPos[2];

    // Distance along camera forward direction
    const zDist = toSphereX * camDir[0] + toSphereY * camDir[1] + toSphereZ * camDir[2];

    // If sphere is entirely behind camera, cull
    if (zDist < -sphereRadius) return false;

    // Project sphere center onto camera plane
    const xDist = toSphereX * camRight[0] + toSphereY * camRight[1] + toSphereZ * camRight[2];
    const yDist = toSphereX * camUp[0] + toSphereY * camUp[1] + toSphereZ * camUp[2];

    // Calculate frustum half-widths at the sphere's depth
    const effectiveZ = Math.max(zDist, 0.1);
    const halfHeight = effectiveZ / focalLength;
    const halfWidth = halfHeight * aspectRatio;

    // Check if sphere intersects frustum (with radius margin)
    if (Math.abs(xDist) > halfWidth + sphereRadius) return false;
    if (Math.abs(yDist) > halfHeight + sphereRadius) return false;

    return true;
}

// Calculate distance to display
export function distToDisplay(camPos, displayPos) {
    const dx = camPos[0] - displayPos[0];
    const dy = camPos[1] - displayPos[1];
    const dz = camPos[2] - displayPos[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

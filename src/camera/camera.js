// Camera state management

export class Camera {
    constructor() {
        this.pos = [0.1, 1.7, -4.1];  // Start in center of atrium
        this.yaw = 0;               // Looking at front wall (+Z direction)
        this.pitch = 0.09;          // Slight upward tilt to center on front wall
        this.zoom = 1.0;            // Zoom factor (1.0 = normal)
        this.zoomTarget = 1.0;      // Target zoom for smooth transition
    }

    getDirection() {
        return [
            Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            Math.cos(this.yaw) * Math.cos(this.pitch),
        ];
    }

    getRight() {
        return [Math.cos(this.yaw), 0, -Math.sin(this.yaw)];
    }

    getUp() {
        return [
            -Math.sin(this.yaw) * Math.sin(this.pitch),
            Math.cos(this.pitch),
            -Math.cos(this.yaw) * Math.sin(this.pitch),
        ];
    }

    getForwardXZ() {
        return [
            Math.sin(this.yaw) * Math.cos(this.pitch),
            0,
            Math.cos(this.yaw) * Math.cos(this.pitch),
        ];
    }

    teleportHome() {
        this.pos = [0, 1.6, -4.1];
        this.yaw = 0;
        this.pitch = 0.09;
    }

    setZoomTarget(target) {
        this.zoomTarget = target;
    }

    updateZoom(dt) {
        const zoomSpeed = 8.0;
        this.zoom += (this.zoomTarget - this.zoom) * Math.min(1.0, zoomSpeed * dt);
    }
}

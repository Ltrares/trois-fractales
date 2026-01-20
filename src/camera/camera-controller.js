// Camera input handling and movement

import { MOVE_SPEED, RUN_MULTIPLIER, MOUSE_SENS, STAND_HEIGHT, CROUCH_HEIGHT, CROUCH_SPEED } from '../utils/constants.js';
import { isValidPosition } from './collision.js';

export class CameraController {
    constructor(camera, canvas, overlay, pauseOverlay, onPointerLockChange) {
        this.camera = camera;
        this.canvas = canvas;
        this.overlay = overlay;
        this.pauseOverlay = pauseOverlay;
        this.onPointerLockChange = onPointerLockChange;

        this.keys = {};
        this.isLocked = false;
        this.isPaused = false;
        this.hasEnteredGallery = false;
        this.screenshotManager = null;
        this.statsElement = null;
        this.onResume = null;  // Callback when resuming from pause

        this._boundMouseMove = this._handleMouseMove.bind(this);
        this._boundKeyDown = this._handleKeyDown.bind(this);
        this._boundKeyUp = this._handleKeyUp.bind(this);
        this._boundPointerLockChange = this._handlePointerLockChange.bind(this);
        this._boundPauseClick = this._handlePauseClick.bind(this);
    }

    setScreenshotManager(manager) {
        this.screenshotManager = manager;
    }

    setStatsElement(element) {
        this.statsElement = element;
    }

    init(startBtn, sculptureAnimators) {
        this.sculptureAnimators = sculptureAnimators;

        startBtn.addEventListener('click', () => {
            console.log('[click] Entrez clicked, requesting pointer lock...');
            this.canvas.requestPointerLock().catch((err) => {
                console.error('[click] Pointer lock failed:', err);
            });
        });

        if (this.pauseOverlay) {
            this.pauseOverlay.addEventListener('click', this._boundPauseClick);
        }

        document.addEventListener('pointerlockchange', this._boundPointerLockChange);
        document.addEventListener('mousemove', this._boundMouseMove);
        document.addEventListener('keydown', this._boundKeyDown);
        document.addEventListener('keyup', this._boundKeyUp);
    }

    _handlePauseClick() {
        if (this.isPaused) {
            this._resume();
        }
    }

    _resume() {
        // Don't resume if ESC is still held - browser will immediately exit
        if (this.keys['Escape']) return;

        // Hide overlay optimistically, but don't set isPaused = false yet
        // Let _handlePointerLockChange do that when pointer lock is actually acquired
        if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
        this.canvas.requestPointerLock().catch(() => {
            // If it fails, show pause overlay again
            if (this.pauseOverlay) this.pauseOverlay.classList.remove('hidden');
        });
    }

    _pause() {
        this.isPaused = true;
        if (this.pauseOverlay) this.pauseOverlay.classList.remove('hidden');
        document.exitPointerLock();
    }

    _handlePointerLockChange() {
        const wasPaused = this.isPaused;
        this.isLocked = !!document.pointerLockElement;

        if (this.isLocked) {
            // Entering gallery
            this.hasEnteredGallery = true;
            this.isPaused = false;
            this.overlay.classList.add('hidden');
            if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');

            // Restart render loop if we were paused
            if (wasPaused && this.onResume) {
                this.onResume();
            }
        } else if (this.hasEnteredGallery) {
            // Lost pointer lock while in gallery - show pause
            this.isPaused = true;
            this.overlay.classList.add('hidden');
            if (this.pauseOverlay) this.pauseOverlay.classList.remove('hidden');
        } else {
            // Never entered gallery - show start overlay
            this.overlay.classList.remove('hidden');
            if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
        }

        if (this.onPointerLockChange) {
            this.onPointerLockChange(this.isLocked);
        }
    }

    _handleMouseMove(e) {
        if (!this.isLocked) return;
        this.camera.yaw += e.movementX * MOUSE_SENS;
        this.camera.pitch -= e.movementY * MOUSE_SENS;
        this.camera.pitch = Math.max(-1.5, Math.min(1.5, this.camera.pitch));
    }

    _handleKeyDown(e) {
        this.keys[e.code] = true;

        // Space or Enter resumes from pause (ESC can't resume due to browser conflicts)
        if ((e.code === 'Space' || e.code === 'Enter') && this.isPaused) {
            e.preventDefault();
            this._resume();
        }

        // Teleport home
        if (e.code === 'KeyH' || e.code === 'Home') {
            this.camera.teleportHome();
        }

        // Zoom (hold Z)
        if (e.code === 'KeyZ') {
            this.camera.setZoomTarget(5.0);
        }

        // Randomize all fractals
        if (e.code === 'KeyR' && this.sculptureAnimators) {
            for (const key in this.sculptureAnimators) {
                this.sculptureAnimators[key].reset();
            }
        }

        // Screenshot capture
        if (e.code === 'KeyT' && this.screenshotManager) {
            this.screenshotManager.capture(this.camera, this.sculptureAnimators);
        }

        // Open screenshot gallery
        if (e.code === 'KeyG' && this.screenshotManager) {
            if (this.screenshotManager.isVisible()) {
                this.screenshotManager.hide();
            } else {
                this._pause();
                this.screenshotManager.show();
            }
        }

        // Toggle stats display
        if (e.code === 'KeyQ' && this.statsElement) {
            this.statsElement.classList.toggle('hidden');
        }
    }

    _handleKeyUp(e) {
        this.keys[e.code] = false;

        // Release zoom
        if (e.code === 'KeyZ') {
            this.camera.setZoomTarget(1.0);
        }
    }

    update(dt) {
        // Smooth zoom transition
        this.camera.updateZoom(dt);

        // Smooth crouch transition
        const targetHeight = this.keys['KeyC'] ? CROUCH_HEIGHT : STAND_HEIGHT;
        this.camera.pos[1] += (targetHeight - this.camera.pos[1]) * Math.min(1.0, CROUCH_SPEED * dt);

        if (!this.isLocked) return;

        const forward = this.camera.getForwardXZ();
        const right = this.camera.getRight();

        let vx = 0, vz = 0;

        if (this.keys['KeyW']) { vx += forward[0]; vz += forward[2]; }
        if (this.keys['KeyS']) { vx -= forward[0]; vz -= forward[2]; }
        if (this.keys['KeyA']) { vx -= right[0]; vz -= right[2]; }
        if (this.keys['KeyD']) { vx += right[0]; vz += right[2]; }

        const len = Math.sqrt(vx * vx + vz * vz);
        if (len > 0) {
            // Run with Shift, slow down when zoomed
            const baseSpeed = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) ? MOVE_SPEED * RUN_MULTIPLIER : MOVE_SPEED;
            const speed = baseSpeed / this.camera.zoom;
            vx = vx / len * speed * dt;
            vz = vz / len * speed * dt;

            let newX = this.camera.pos[0] + vx;
            let newZ = this.camera.pos[2] + vz;

            // Try combined movement first
            if (isValidPosition(newX, this.camera.pos[1], newZ)) {
                this.camera.pos[0] = newX;
                this.camera.pos[2] = newZ;
            } else {
                // Wall slide: try each axis separately
                if (isValidPosition(newX, this.camera.pos[1], this.camera.pos[2])) {
                    this.camera.pos[0] = newX;
                }
                if (isValidPosition(this.camera.pos[0], this.camera.pos[1], newZ)) {
                    this.camera.pos[2] = newZ;
                }
            }
        }
    }

    dispose() {
        document.removeEventListener('pointerlockchange', this._boundPointerLockChange);
        document.removeEventListener('mousemove', this._boundMouseMove);
        document.removeEventListener('keydown', this._boundKeyDown);
        document.removeEventListener('keyup', this._boundKeyUp);
        if (this.pauseOverlay) {
            this.pauseOverlay.removeEventListener('click', this._boundPauseClick);
        }
    }
}

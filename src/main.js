// Main entry point - wires all modules together

import { GLContext } from './core/gl-context.js';
import { ShaderManager } from './core/shader-manager.js';
import { FBOManager } from './core/fbo-manager.js';

import { vertexShaderSrc } from './shaders/common/vertex.js';
import { galleryFragmentSrc } from './shaders/gallery.frag.js';
import { mandelboxShaderSrc, mandelbulbShaderSrc, juliaShaderSrc } from './shaders/fractal-template.js';
import { copyFragmentSrc } from './shaders/copy.frag.js';
import { taaFragmentSrc } from './shaders/taa.frag.js';
import { fxaaFragmentSrc } from './shaders/fxaa.frag.js';
import { shadowBakeFragmentSrc } from './shaders/shadow-bake.frag.js';

import { mandelboxCodeString } from './shaders/fractals/mandelbox-de.js';
import { mandelbulbCodeString } from './shaders/fractals/mandelbulb-de.js';
import { juliaCodeString } from './shaders/fractals/julia-de.js';

import { createWallTexture } from './textures/wall-texture.js';
import { createCodeTexture } from './textures/code-texture.js';
import { createConcreteTexture } from './textures/concrete-texture.js';
import { createPeepholeTexture } from './textures/peephole-texture.js';
// import { createSlideTexture } from './textures/slides-texture.js';  // Slideshow disabled

import { Camera } from './camera/camera.js';
import { CameraController } from './camera/camera-controller.js';

import { createSculptureAnimators, getFractalParams } from './fractals/fractal-animation.js';
import { sampleMandelboxCoverage, getLastScanResults } from './fractals/fractal-config.js';

import { StatsDisplay } from './ui/stats-display.js';
import { ScreenshotManager } from './ui/screenshot-manager.js';

import {
    DISPLAY_POSITIONS, DISPLAY_BBOX_HALF,
    SHADOW_TEX_SIZE, SHADOW_LAYERS, SHADOW_SURFACES,
    RENDER_QUALITY, FRACTAL_RADIUS
} from './utils/constants.js';

import { isSphereInFrustum, getBoxScreenRect, distToDisplay } from './utils/math.js';

console.log('[init] modules loaded');

// DOM elements
const canvas = document.getElementById('canvas');
const overlay = document.getElementById('overlay');
const pauseOverlay = document.getElementById('pause-overlay');
const screenshotOverlay = document.getElementById('screenshot-overlay');
const screenshotGrid = document.getElementById('screenshot-grid');
const startBtn = document.getElementById('startBtn');
const statsEl = document.getElementById('stats');
// const scanResultsEl = document.getElementById('scan-results');  // Disabled

// Initialize WebGL
console.log('[init] creating WebGL context...');
const glContext = new GLContext(canvas);
const gl = glContext.getContext();
console.log('[init] WebGL context created');

// Create managers
const shaderManager = new ShaderManager(gl);
const fboManager = new FBOManager(gl);

// Compile all shaders
console.log('[init] compiling shaders...');
const galleryProgram = shaderManager.createProgram(vertexShaderSrc, galleryFragmentSrc, 'gallery');
const mandelboxProgram = shaderManager.createProgram(vertexShaderSrc, mandelboxShaderSrc, 'mandelbox');
const mandelbulbProgram = shaderManager.createProgram(vertexShaderSrc, mandelbulbShaderSrc, 'mandelbulb');
const juliaProgram = shaderManager.createProgram(vertexShaderSrc, juliaShaderSrc, 'julia');
const copyProgram = shaderManager.createProgram(vertexShaderSrc, copyFragmentSrc, 'copy');
const taaProgram = shaderManager.createProgram(vertexShaderSrc, taaFragmentSrc, 'taa');
const fxaaProgram = shaderManager.createProgram(vertexShaderSrc, fxaaFragmentSrc, 'fxaa');
const shadowBakeProgram = shaderManager.createProgram(vertexShaderSrc, shadowBakeFragmentSrc, 'shadowBake');

console.log('[init] shaders compiled');

if (!galleryProgram || !mandelboxProgram || !mandelbulbProgram || !juliaProgram || !copyProgram || !taaProgram || !fxaaProgram || !shadowBakeProgram) {
    alert('Shader compilation failed - check console');
}

// Setup fullscreen quad
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

// Setup vertex attribs for all programs
const allPrograms = [galleryProgram, mandelboxProgram, mandelbulbProgram, juliaProgram, copyProgram, taaProgram, fxaaProgram, shadowBakeProgram];
shaderManager.setupVertexAttribs(allPrograms, vao);

// Get uniform locations
const galleryLocs = shaderManager.getStandardLocs(galleryProgram);
const mandelboxLocs = shaderManager.getStandardLocs(mandelboxProgram);
const mandelbulbLocs = shaderManager.getStandardLocs(mandelbulbProgram);
const juliaLocs = shaderManager.getStandardLocs(juliaProgram);

const copyLocs = {
    texture: gl.getUniformLocation(copyProgram, 'u_texture'),
    resolution: gl.getUniformLocation(copyProgram, 'u_resolution')
};

const taaLocs = {
    currentFrame: gl.getUniformLocation(taaProgram, 'u_currentFrame'),
    history: gl.getUniformLocation(taaProgram, 'u_history'),
    resolution: gl.getUniformLocation(taaProgram, 'u_resolution'),
    blendFactor: gl.getUniformLocation(taaProgram, 'u_blendFactor')
};

const fxaaLocs = {
    texture: gl.getUniformLocation(fxaaProgram, 'u_texture'),
    textLayer: gl.getUniformLocation(fxaaProgram, 'u_textLayer'),
    resolution: gl.getUniformLocation(fxaaProgram, 'u_resolution')
};

const shadowBakeLocs = {
    resolution: gl.getUniformLocation(shadowBakeProgram, 'u_resolution'),
    surfaceType: gl.getUniformLocation(shadowBakeProgram, 'u_surfaceType'),
    fixedCoord: gl.getUniformLocation(shadowBakeProgram, 'u_fixedCoord'),
    minU: gl.getUniformLocation(shadowBakeProgram, 'u_minU'),
    maxU: gl.getUniformLocation(shadowBakeProgram, 'u_maxU'),
    minV: gl.getUniformLocation(shadowBakeProgram, 'u_minV'),
    maxV: gl.getUniformLocation(shadowBakeProgram, 'u_maxV')
};

// Create textures
const wallTexture = createWallTexture(gl);
const mandelboxCodeTexture = createCodeTexture(gl, mandelboxCodeString);
const mandelbulbCodeTexture = createCodeTexture(gl, mandelbulbCodeString);
const juliaCodeTexture = createCodeTexture(gl, juliaCodeString);
const concreteTexture = createConcreteTexture(gl);
const peepholeTexture = createPeepholeTexture(gl);
// const slideTextureManager = createSlideTexture(gl);  // Slideshow disabled

// Bake shadows for all surfaces
function bakeShadows() {
    console.log(`Baking shadows (${SHADOW_TEX_SIZE}x${SHADOW_TEX_SIZE} x ${SHADOW_LAYERS} surfaces)...`);
    const startTime = performance.now();

    fboManager.createShadowArray(SHADOW_TEX_SIZE, SHADOW_LAYERS);

    gl.useProgram(shadowBakeProgram);
    gl.bindVertexArray(vao);
    gl.viewport(0, 0, SHADOW_TEX_SIZE, SHADOW_TEX_SIZE);
    gl.uniform2f(shadowBakeLocs.resolution, SHADOW_TEX_SIZE, SHADOW_TEX_SIZE);

    // Bake each surface
    for (const surface of SHADOW_SURFACES) {
        console.log(`  Baking surface ${surface.id}: ${surface.name}`);
        fboManager.bindShadowLayer(surface.id);

        gl.uniform1i(shadowBakeLocs.surfaceType, surface.type);
        gl.uniform1f(shadowBakeLocs.fixedCoord, surface.fixed);
        gl.uniform1f(shadowBakeLocs.minU, surface.minU);
        gl.uniform1f(shadowBakeLocs.maxU, surface.maxU);
        gl.uniform1f(shadowBakeLocs.minV, surface.minV);
        gl.uniform1f(shadowBakeLocs.maxV, surface.maxV);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Ensure GPU completes all shadow baking before continuing
    gl.finish();

    const elapsed = (performance.now() - startTime).toFixed(0);
    console.log(`Shadow baking complete! (${elapsed}ms)`);
}

bakeShadows();

// Enable start button after GPU is fully ready (defer to next frame for safety)
requestAnimationFrame(() => {
    startBtn.disabled = false;
    startBtn.textContent = 'Entrez';
});

// Create camera and controller
const camera = new Camera();
const sculptureAnimators = createSculptureAnimators();

// UI
const statsDisplay = new StatsDisplay(statsEl);
const screenshotManager = new ScreenshotManager(canvas, screenshotOverlay, screenshotGrid);

// Coverage sampling for Mandelbox degeneracy detection (JS-based, works regardless of camera)
let mandelboxCoverage = 1.0;  // 1.0 = full coverage, 0.0 = empty

// Stagnation detection - pick new target if params haven't changed
const STAGNATION_CHECK_INTERVAL = 10000;  // 10 seconds
const STAGNATION_THRESHOLD = 0.001;  // How different params must be
let lastStagnationCheck = performance.now();
let stagnationSnapshot = null;

const cameraController = new CameraController(camera, canvas, overlay, pauseOverlay);
cameraController.setScreenshotManager(screenshotManager);
cameraController.init(startBtn, sculptureAnimators);

// Restart render loop when unpausing
cameraController.onResume = () => {
    lastTime = performance.now();  // Reset dt to avoid jump
    requestAnimationFrame(render);
};

// Halton sequence for TAA jitter (low-discrepancy quasi-random)
function halton(index, base) {
    let result = 0;
    let f = 1 / base;
    let i = index;
    while (i > 0) {
        result += f * (i % base);
        i = Math.floor(i / base);
        f /= base;
    }
    return result;
}

// 8-sample Halton jitter pattern (base 2, 3)
const JITTER_SAMPLES = 8;
let jitterIndex = 0;

const JITTER_SCALE = 0.25;  // Reduce jitter to ±0.125 pixels (was ±0.5)

function getJitter() {
    const x = (halton(jitterIndex + 1, 2) - 0.5) * JITTER_SCALE;
    const y = (halton(jitterIndex + 1, 3) - 0.5) * JITTER_SCALE;
    jitterIndex = (jitterIndex + 1) % JITTER_SAMPLES;
    return [x, y];
}

// Helper: set common camera uniforms
function setCameraUniforms(locs, resolution, camPos, camDir, camRight, camUp, zoom, jitter) {
    gl.uniform2f(locs.resolution, resolution[0], resolution[1]);
    gl.uniform3fv(locs.camPos, camPos);
    gl.uniform3fv(locs.camDir, camDir);
    gl.uniform3fv(locs.camRight, camRight);
    gl.uniform3fv(locs.camUp, camUp);
    gl.uniform1f(locs.zoom, zoom);
    gl.uniform2f(locs.jitter, jitter[0], jitter[1]);
}

// Animation state
let lastTime = performance.now();
let lastAnimTime = null;

function render() {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    cameraController.update(dt);

    const width = Math.floor(window.innerWidth * RENDER_QUALITY);
    const height = Math.floor(window.innerHeight * RENDER_QUALITY);
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';

    fboManager.setupFBO(width, height);

    const camDir = camera.getDirection();
    const camRight = camera.getRight();
    const camUp = camera.getUp();

    // Get jitter for TAA (only advance when not paused)
    // Scale jitter inversely with zoom - when zoomed in, jitter should be smaller
    const rawJitter = cameraController.isPaused ? [0, 0] : getJitter();
    const jitter = [rawJitter[0] / camera.zoom, rawJitter[1] / camera.zoom];

    // Pause animation updates when paused
    const animTime = cameraController.isPaused ? lastAnimTime : now;
    const params = getFractalParams(sculptureAnimators, animTime, lastAnimTime);
    if (!cameraController.isPaused) {
        lastAnimTime = now;
    }

    gl.bindVertexArray(vao);

    // ========== PASS 1: Gallery ==========
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboManager.galleryFBO);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.01, 0.01, 0.015, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(galleryProgram);
    setCameraUniforms(galleryLocs, [width, height], camera.pos, camDir, camRight, camUp, camera.zoom, jitter);
    gl.uniform1f(galleryLocs.time, performance.now() * 0.001);

    // Fractal params for shadow casting
    gl.uniform1f(galleryLocs.mandelboxScale, params.mandelbox.scale);
    gl.uniform1f(galleryLocs.mandelboxMinR, params.mandelbox.minR);
    gl.uniform1f(galleryLocs.mandelboxFixedR, params.mandelbox.fixedR);
    gl.uniform1f(galleryLocs.mandelboxFoldLimit, params.mandelbox.foldLimit);

    gl.uniform1f(galleryLocs.mandelbulbPower, params.mandelbulb.power);
    gl.uniform1f(galleryLocs.mandelbulbPhiPower, params.mandelbulb.phiPower);
    gl.uniform1f(galleryLocs.mandelbulbPhase, params.mandelbulb.phase);
    gl.uniform1f(galleryLocs.mandelbulbPhiPhase, params.mandelbulb.phiPhase);

    gl.uniform4fv(galleryLocs.juliaC, params.julia.c);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, wallTexture);
    gl.uniform1i(galleryLocs.wallTex, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, mandelboxCodeTexture);
    gl.uniform1i(galleryLocs.mandelboxCodeTex, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, mandelbulbCodeTexture);
    gl.uniform1i(galleryLocs.mandelbulbCodeTex, 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, juliaCodeTexture);
    gl.uniform1i(galleryLocs.juliaCodeTex, 3);

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, fboManager.shadowArrayTex);
    gl.uniform1i(galleryLocs.shadowArrayTex, 4);

    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, concreteTexture);
    gl.uniform1i(galleryLocs.concreteTex, 5);

    // Slideshow disabled - texture slot 6 unused
    // slideTextureManager.update(now, cameraController.isPaused);
    // gl.activeTexture(gl.TEXTURE6);
    // gl.bindTexture(gl.TEXTURE_2D, slideTextureManager.getTexture());
    // gl.uniform1i(galleryLocs.slidesTex, 6);

    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, peepholeTexture);
    gl.uniform1i(galleryLocs.peepholeTex, 7);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // ========== PASS 2-4: Fractals ==========
    const focalLength = 1.5 * camera.zoom;
    const aspectRatio = width / height;

    const visMandelbox = isSphereInFrustum(DISPLAY_POSITIONS.mandelbox, FRACTAL_RADIUS, camera.pos, camDir, camRight, camUp, focalLength, aspectRatio);
    const visMandelbulb = isSphereInFrustum(DISPLAY_POSITIONS.mandelbulb, FRACTAL_RADIUS, camera.pos, camDir, camRight, camUp, focalLength, aspectRatio);
    const visJulia = isSphereInFrustum(DISPLAY_POSITIONS.julia, FRACTAL_RADIUS, camera.pos, camDir, camRight, camUp, focalLength, aspectRatio);

    // Copy gallery to currentFrame buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboManager.currentFrameFBO);
    gl.viewport(0, 0, width, height);
    gl.useProgram(copyProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fboManager.galleryColorTex);
    gl.uniform1i(copyLocs.texture, 0);
    gl.uniform2f(copyLocs.resolution, width, height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    let passesRun = 0;
    let scissorPixels = 0;

    // Build list of visible fractals with their rendering data
    const fractalPasses = [];

    if (visMandelbox) {
        const rect = getBoxScreenRect(DISPLAY_POSITIONS.mandelbox, DISPLAY_BBOX_HALF.mandelbox, camera.pos, camDir, camRight, camUp, focalLength, width, height);
        if (rect) {
            fractalPasses.push({
                name: 'mandelbox',
                rect,
                dist: distToDisplay(camera.pos, DISPLAY_POSITIONS.mandelbox),
                program: mandelboxProgram,
                locs: mandelboxLocs,
                setUniforms: () => {
                    gl.uniform1f(mandelboxLocs.mandelboxScale, params.mandelbox.scale);
                    gl.uniform1f(mandelboxLocs.mandelboxMinR, params.mandelbox.minR);
                    gl.uniform1f(mandelboxLocs.mandelboxFixedR, params.mandelbox.fixedR);
                    gl.uniform1f(mandelboxLocs.mandelboxFoldLimit, params.mandelbox.foldLimit);
                }
            });
        }
    }

    if (visMandelbulb) {
        const rect = getBoxScreenRect(DISPLAY_POSITIONS.mandelbulb, DISPLAY_BBOX_HALF.mandelbulb, camera.pos, camDir, camRight, camUp, focalLength, width, height);
        if (rect) {
            fractalPasses.push({
                name: 'mandelbulb',
                rect,
                dist: distToDisplay(camera.pos, DISPLAY_POSITIONS.mandelbulb),
                program: mandelbulbProgram,
                locs: mandelbulbLocs,
                setUniforms: () => {
                    gl.uniform1f(mandelbulbLocs.mandelbulbPower, params.mandelbulb.power);
                    gl.uniform1f(mandelbulbLocs.mandelbulbPhiPower, params.mandelbulb.phiPower);
                    gl.uniform1f(mandelbulbLocs.mandelbulbPhase, params.mandelbulb.phase);
                    gl.uniform1f(mandelbulbLocs.mandelbulbPhiPhase, params.mandelbulb.phiPhase);
                }
            });
        }
    }

    if (visJulia) {
        const rect = getBoxScreenRect(DISPLAY_POSITIONS.julia, DISPLAY_BBOX_HALF.julia, camera.pos, camDir, camRight, camUp, focalLength, width, height);
        if (rect) {
            fractalPasses.push({
                name: 'julia',
                rect,
                dist: distToDisplay(camera.pos, DISPLAY_POSITIONS.julia),
                program: juliaProgram,
                locs: juliaLocs,
                setUniforms: () => {
                    gl.uniform4fv(juliaLocs.juliaC, params.julia.c);
                }
            });
        }
    }

    // Sort by distance: back-to-front (farthest first)
    fractalPasses.sort((a, b) => b.dist - a.dist);

    gl.enable(gl.SCISSOR_TEST);

    // Render fractals in sorted order
    for (const pass of fractalPasses) {
        gl.scissor(pass.rect.x, pass.rect.y, pass.rect.w, pass.rect.h);
        gl.useProgram(pass.program);
        setCameraUniforms(pass.locs, [width, height], camera.pos, camDir, camRight, camUp, camera.zoom, jitter);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fboManager.galleryColorTex);
        gl.uniform1i(pass.locs.galleryColor, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, fboManager.galleryDepthTex);
        gl.uniform1i(pass.locs.galleryDepth, 1);

        pass.setUniforms();

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        passesRun++;
        scissorPixels += pass.rect.w * pass.rect.h;
    }

    // Sample Mandelbox coverage via JS DE (works regardless of camera direction)
    mandelboxCoverage = sampleMandelboxCoverage(params.mandelbox);
    sculptureAnimators.mandelbox.setExternalDegeneracy(1.0 - mandelboxCoverage);

    // Stagnation detection - if params haven't changed in 10s, pick new target
    if (now - lastStagnationCheck > STAGNATION_CHECK_INTERVAL) {
        const currentParams = params.mandelbox;
        if (stagnationSnapshot) {
            const diff = Math.abs(currentParams.scale - stagnationSnapshot.scale) +
                         Math.abs(currentParams.minR - stagnationSnapshot.minR) +
                         Math.abs(currentParams.fixedR - stagnationSnapshot.fixedR) +
                         Math.abs(currentParams.foldLimit - stagnationSnapshot.foldLimit);
            if (diff < STAGNATION_THRESHOLD) {
                console.log('Stagnation detected, picking new target');
                sculptureAnimators.mandelbox.reset();
            }
        }
        stagnationSnapshot = { ...currentParams };
        lastStagnationCheck = now;
    }

    gl.disable(gl.SCISSOR_TEST);

    // ========== TAA PASS (render to taaOutputFBO) ==========
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboManager.taaOutputFBO);
    gl.viewport(0, 0, width, height);
    gl.useProgram(taaProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fboManager.currentFrameTex);
    gl.uniform1i(taaLocs.currentFrame, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fboManager.historyTex);
    gl.uniform1i(taaLocs.history, 1);

    gl.uniform2f(taaLocs.resolution, width, height);
    const blendFactor = fboManager.isTAAInitialized() ? 0.70 : 0.0;
    gl.uniform1f(taaLocs.blendFactor, blendFactor);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // ========== FXAA PASS + TEXT COMPOSITE (render to screen) ==========
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(fxaaProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fboManager.taaOutputTex);
    gl.uniform1i(fxaaLocs.texture, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fboManager.galleryTextTex);
    gl.uniform1i(fxaaLocs.textLayer, 1);

    gl.uniform2f(fxaaLocs.resolution, width, height);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Copy current frame to history
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboManager.historyFBO);
    gl.viewport(0, 0, width, height);
    gl.useProgram(copyProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fboManager.currentFrameTex);
    gl.uniform1i(copyLocs.texture, 0);
    gl.uniform2f(copyLocs.resolution, width, height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    fboManager.markTAAInitialized();

    // Update stats
    const totalPixels = width * height;
    const scissorPct = Math.round(100 * scissorPixels / totalPixels);
    // Degeneracy from coverage: low coverage = high degeneracy
    const degeneracy = 1.0 - mandelboxCoverage;
    statsDisplay.update(dt, canvas.width, canvas.height, passesRun, scissorPct, camera.pos, degeneracy);

    // Scan debug panel (disabled)
    // const scan = getLastScanResults();
    // if (scan && scanResultsEl) { ... }

    // Only continue render loop if not paused
    if (!cameraController.isPaused) {
        requestAnimationFrame(render);
    }
}

render();

// Cleanup GPU resources on page unload to prevent context exhaustion
let cleanedUp = false;
function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;
    console.log('Cleaning up GPU resources...');
    cameraController.dispose();
    fboManager.dispose();
    shaderManager.dispose();
    // Delete textures
    gl.deleteTexture(wallTexture);
    gl.deleteTexture(mandelboxCodeTexture);
    gl.deleteTexture(mandelbulbCodeTexture);
    gl.deleteTexture(juliaCodeTexture);
    gl.deleteTexture(concreteTexture);
    gl.deleteTexture(peepholeTexture);
    // slideTextureManager.dispose();  // Slideshow disabled
    // Delete VAO and VBO
    gl.deleteBuffer(vbo);
    gl.deleteVertexArray(vao);
    // Finally release the context
    glContext.dispose();
}

window.addEventListener('beforeunload', cleanup);
window.addEventListener('unload', cleanup);
// Also handle visibility change for mobile/tab switching
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        // Don't fully dispose, but could pause expensive operations
    }
});

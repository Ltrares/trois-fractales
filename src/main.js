// Main entry point - wires all modules together

import { GLContext } from './core/gl-context.js';
import { ShaderManager } from './core/shader-manager.js';
import { FBOManager } from './core/fbo-manager.js';

import { vertexShaderSrc } from './shaders/common/vertex.js';
import { galleryFragmentSrc } from './shaders/gallery.frag.js';
import { mandelboxShaderSrc, mandelbulbShaderSrc, juliaShaderSrc } from './shaders/fractal-template.js';
import { copyFragmentSrc } from './shaders/copy.frag.js';
import { fxaaFragmentSrc } from './shaders/fxaa.frag.js';
import { accumulateFragmentSrc } from './shaders/accumulate.frag.js';
import { shadowBakeFragmentSrc } from './shaders/shadow-bake.frag.js';

import { mandelboxCodeString } from './shaders/fractals/mandelbox-de.js';
import { mandelbulbCodeString } from './shaders/fractals/mandelbulb-de.js';
import { juliaCodeString } from './shaders/fractals/julia-de.js';

import { createWallTexture } from './textures/wall-texture.js';
import { createCodeTexture } from './textures/code-texture.js';
import { createConcreteTexture } from './textures/concrete-texture.js';
import { createPeepholeTexture } from './textures/peephole-texture.js';
import { createJuliaTexture } from './textures/julia-texture.js';
import { SLIDES, slideSettings } from './geometry/GalleryGeometry.js';

import { Camera } from './camera/camera.js';
import { CameraController } from './camera/camera-controller.js';

import { createSculptureAnimators, getFractalParams } from './fractals/fractal-animation.js';
import { isFrozen, tickFreeze } from './ui/param-freeze.js';
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
const fxaaProgram = shaderManager.createProgram(vertexShaderSrc, fxaaFragmentSrc, 'fxaa');
const accumProgram = shaderManager.createProgram(vertexShaderSrc, accumulateFragmentSrc, 'accumulate');
const shadowBakeProgram = shaderManager.createProgram(vertexShaderSrc, shadowBakeFragmentSrc, 'shadowBake');

console.log('[init] shaders compiled');

if (!galleryProgram || !mandelboxProgram || !mandelbulbProgram || !juliaProgram || !copyProgram || !fxaaProgram || !accumProgram || !shadowBakeProgram) {
    alert('Shader compilation failed - check console');
}

// Setup fullscreen quad
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

// Setup vertex attribs for all programs
const allPrograms = [galleryProgram, mandelboxProgram, mandelbulbProgram, juliaProgram, copyProgram, fxaaProgram, accumProgram, shadowBakeProgram];
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


const accumLocs = {
    cur: gl.getUniformLocation(accumProgram, 'u_cur'),
    hist: gl.getUniformLocation(accumProgram, 'u_hist'),
    resolution: gl.getUniformLocation(accumProgram, 'u_resolution'),
    wAge: gl.getUniformLocation(accumProgram, 'u_wAge'),
    reset: gl.getUniformLocation(accumProgram, 'u_reset')
};

const fxaaLocs = {
    texture: gl.getUniformLocation(fxaaProgram, 'u_texture'),
    textLayer: gl.getUniformLocation(fxaaProgram, 'u_textLayer'),
    resolution: gl.getUniformLocation(fxaaProgram, 'u_resolution'),
    fxaaOn: gl.getUniformLocation(fxaaProgram, 'u_fxaaOn')
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
const juliaStampTexture = createJuliaTexture(gl, 1024);

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

const cameraController = new CameraController(camera, canvas, overlay, pauseOverlay);
cameraController.setScreenshotManager(screenshotManager);
cameraController.setStatsElement(statsEl);
cameraController.init(startBtn, sculptureAnimators);

// A key that jumps the scene (R randomises every sculpture) invalidates the
// accumulation buffer: it holds an average of the previous shape, and with the
// camera still the accumulator would otherwise keep blending the new sculpture
// into the old one at 1/n and ghost for a second or more.
cameraController.onSceneJump = () => {
    fboManager.accumReset = true;
};

// Restart render loop when unpausing
cameraController.onResume = () => {
    lastTime = performance.now();  // Reset dt to avoid jump
    requestAnimationFrame(render);
};

// Helper: set common camera uniforms
function setCameraUniforms(locs, resolution, camPos, camDir, camRight, camUp, zoom) {
    gl.uniform2f(locs.resolution, resolution[0], resolution[1]);
    // Every pass that raymarches this frame must take the identical sub-pixel
    // offset, or the layers shimmer against each other at their boundaries.
    if (locs.jitter) gl.uniform2f(locs.jitter, jitterX, jitterY);
    gl.uniform3fv(locs.camPos, camPos);
    gl.uniform3fv(locs.camDir, camDir);
    gl.uniform3fv(locs.camRight, camRight);
    gl.uniform3fv(locs.camUp, camUp);
    gl.uniform1f(locs.zoom, zoom);
}

// ===== TSAA (temporal supersampling) =====
//
// Sub-pixel jitter accumulated in place. NOT TAA -- no reprojection, no history
// rejection; see accumulate.frag.js.
//
// ONLY RUNS WHEN THE CAMERA IS COMPLETELY STILL. Any movement -- translation,
// rotation, or zoom -- drops it instantly back to the raw image. There is no
// short window and no ghost tail while moving: accumulating through motion makes
// movement disorienting, which is worse than the aliasing it removes. The value
// here is a cleaner image while parked (and so, a cleaner screenshot), not
// antialiasing during play.
//
// Accumulation is visible as it happens: the image converges over TSAA_SAMPLES
// frames on screen, so what you see is what a screenshot captures.
let TSAA_ON = true;

// FXAA. Toggle with F. It was off because it softened the wall text, but that
// was the text being blended into the scene colour before the filter ran - it
// now travels on its own attachment and is composited afterwards, so the filter
// only touches geometry.
let FXAA_ON = true;

// Samples the running mean stops at. Only ever reached while the scene is fully
// static, so the extra frames are free: nothing is waiting on them and the cost
// while moving is zero because the pass does not run.
let TSAA_SAMPLES = 64;

// Sub-pixel jitter radius in pixels. Sets how far inside the pixel a sample can
// land, so it decides how much the converged mean is a box filter over the
// pixel's area. 0.5 is the full pixel: most antialiasing, most softening.
let TSAA_JITTER = 0.25;

// Halton(2,3): low-discrepancy, so successive sample points fill the pixel
// evenly rather than clumping the way independent random offsets do. Not a
// cycled table -- a table shorter than the averaging window makes the mean
// oscillate with the table instead of converging.
function halton(i, b) {
    let f = 1, r = 0;
    while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); }
    return r;
}

let tsaaFrame = 0, tsaaAge = 0;
let tsaaPrevPos = null, tsaaPrevDir = null, tsaaPrevZoom = 1.0;
let jitterX = 0, jitterY = 0;
// Whether the camera was perfectly still this frame; decided before the passes
// (the jitter depends on it) and reused by the accumulate pass.
let tsaaStill = false;

// X toggles TSAA so it can be A/B'd against the raw image in the live scene.
// (T is the screenshot key, G/H/P/Q/R/Z are taken, WASD/C are movement.)
// Also exposed on window for console tweaking of the two values worth varying.
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyX') {
        TSAA_ON = !TSAA_ON;
        fboManager.accumReset = true;
        console.log(`[TSAA] ${TSAA_ON ? 'on' : 'off'}  jitter=${TSAA_JITTER} samples=${TSAA_SAMPLES}  [FXAA ${FXAA_ON ? 'on' : 'off'}]`);
    } else if (e.code === 'KeyF') {
        FXAA_ON = !FXAA_ON;
        console.log(`[FXAA] ${FXAA_ON ? 'on' : 'off'}`);
    }
});

window.tsaa = {
    get on() { return TSAA_ON; },
    set on(v) { TSAA_ON = !!v; fboManager.accumReset = true; },
    get samples() { return TSAA_SAMPLES; },
    set samples(v) { TSAA_SAMPLES = Math.max(1, v); fboManager.accumReset = true; },
    get jitter() { return TSAA_JITTER; },
    set jitter(v) { TSAA_JITTER = Math.max(0, Math.min(0.5, v)); fboManager.accumReset = true; },
    get fxaa() { return FXAA_ON; },
    set fxaa(v) { FXAA_ON = !!v; },
};

// Animation state
let lastTime = performance.now();

function render() {
    const now = performance.now();
    // One delta, in seconds, for every consumer in the loop. Clamped: a
    // backgrounded tab throttles rAF, and an unclamped step would drain the
    // parameter freeze in a single catch-up frame.
    const dt = Math.min(now - lastTime, 100) / 1000;
    lastTime = now;

    cameraController.update(dt);

    // Parameter animation is held under exactly two conditions:
    //   1. the visitor froze it with P to line up a shot
    //   2. the ESC pause screen is up
    // Decided once here; every consumer below reads this, and nothing else
    // recomputes it. The freeze burns down on rendered time, so it only
    // counts while the scene is actually on screen.
    tickFreeze(dt);
    const paramsHeld = isFrozen() || cameraController.isPaused;

    // Advance every animator by the same delta, or none of them. Held, the
    // sculptures stop morphing together rather than drifting apart.
    const params = getFractalParams(sculptureAnimators, paramsHeld ? 0 : dt);

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

    // TSAA: sub-pixel sample offset for this frame, shared by the gallery and
    // fractal passes so they sample the same point inside the pixel.


    // Is the scene completely static this frame? Two conditions, both required:
    //
    //   camera still -- exact comparison, not a threshold. The camera smooths
    //   its own motion, so it keeps emitting tiny deltas after input stops, and
    //   those are real movement. Position, direction and zoom all change the
    //   rays, so all three count.
    //
    //   parameters held -- the sculptures morph continuously. Accumulating
    //   through an animating fractal smears the animation, so TSAA runs only
    //   while the params are frozen or paused.
    tsaaStill = tsaaPrevPos !== null && paramsHeld
        && camera.pos[0] === tsaaPrevPos[0] && camera.pos[1] === tsaaPrevPos[1] && camera.pos[2] === tsaaPrevPos[2]
        && camDir[0] === tsaaPrevDir[0] && camDir[1] === tsaaPrevDir[1] && camDir[2] === tsaaPrevDir[2]
        && camera.zoom === tsaaPrevZoom;
    tsaaPrevPos = [camera.pos[0], camera.pos[1], camera.pos[2]];
    tsaaPrevDir = [camDir[0], camDir[1], camDir[2]];
    tsaaPrevZoom = camera.zoom;

    // Jitter only while accumulating. Otherwise the ray goes through the pixel
    // centre exactly as it did before TSAA existed.
    jitterX = 0; jitterY = 0;
    if (TSAA_ON && tsaaStill) {
        jitterX = (halton(tsaaFrame + 1, 2) - 0.5) * (TSAA_JITTER * 2.0);
        jitterY = (halton(tsaaFrame + 1, 3) - 0.5) * (TSAA_JITTER * 2.0);
        tsaaFrame++;
    }

    gl.bindVertexArray(vao);

    // ========== PASS 1: Gallery ==========
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboManager.galleryFBO);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.01, 0.01, 0.015, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(galleryProgram);
    setCameraUniforms(galleryLocs, [width, height], camera.pos, camDir, camRight, camUp, camera.zoom);

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

    // The active slide, projected via the slide projection rectangle, with its
    // own appearance settings over SLIDE_PROJECTION.defaults.
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, juliaStampTexture);
    gl.uniform1i(galleryLocs.slidesTex, 6);
    const slide = slideSettings(SLIDES.juliaStamp);
    gl.uniform1f(galleryLocs.slideOpacity, slide.opacity);
    gl.uniform1f(galleryLocs.slideFeather, slide.feather);
    gl.uniform1f(galleryLocs.slideGlow, slide.glow);
    gl.uniform1f(galleryLocs.slideDesaturate, slide.desaturate);

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
        setCameraUniforms(pass.locs, [width, height], camera.pos, camDir, camRight, camUp, camera.zoom);

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

    // Sample Mandelbox coverage via JS DE (works regardless of camera direction).
    // Drives the DEGEN readout in the stats panel.
    mandelboxCoverage = sampleMandelboxCoverage(params.mandelbox);

    gl.disable(gl.SCISSOR_TEST);

    // ========== TSAA PASS (accumulate into history) ==========
    //
    // Sits between the scene and FXAA: it consumes the jittered frame and hands
    // FXAA the accumulated image. Skipped entirely when off, and FXAA then reads
    // currentFrameTex directly, so the pipeline is unchanged in that case.
    let displayTex = fboManager.currentFrameTex;

    if (TSAA_ON && tsaaStill) {
        // Age is how many jittered samples have gone in. The weight is a true
        // running mean, 1/n, capped at TSAA_SAMPLES so it stops once converged.
        // No speed term and no ghost tail: this pass simply does not run while
        // the camera is moving, so there is no stale content to fade out.
        tsaaAge = fboManager.accumReset ? 1 : Math.min(tsaaAge + 1, TSAA_SAMPLES);

        const dst = fboManager.accumIdx ^ 1, src = fboManager.accumIdx;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fboManager.accumFBO[dst]);
        gl.viewport(0, 0, width, height);
        gl.useProgram(accumProgram);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fboManager.currentFrameTex);
        gl.uniform1i(accumLocs.cur, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, fboManager.accumTex[src]);
        gl.uniform1i(accumLocs.hist, 1);

        gl.uniform2f(accumLocs.resolution, width, height);
        gl.uniform1f(accumLocs.wAge, 1.0 / tsaaAge);
        gl.uniform1i(accumLocs.reset, fboManager.accumReset ? 1 : 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        fboManager.accumReset = false;
        fboManager.accumIdx = dst;
        displayTex = fboManager.accumTex[dst];
    } else {
        // Moving (or off): show the raw frame, and drop the history so the next
        // still moment starts from scratch rather than blending against a view
        // from wherever the camera used to be.
        fboManager.accumReset = true;
        tsaaAge = 0;
    }

    // ========== FXAA PASS + TEXT COMPOSITE (render to screen) ==========
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(fxaaProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, displayTex);
    gl.uniform1i(fxaaLocs.texture, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fboManager.galleryTextTex);
    gl.uniform1i(fxaaLocs.textLayer, 1);

    gl.uniform2f(fxaaLocs.resolution, width, height);
    gl.uniform1i(fxaaLocs.fxaaOn, FXAA_ON ? 1 : 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


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
    gl.deleteTexture(juliaStampTexture);
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

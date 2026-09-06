// Framebuffer management

export class FBOManager {
    constructor(gl) {
        this.gl = gl;

        // Gallery rendering
        this.galleryFBO = null;
        this.galleryColorTex = null;
        this.galleryDepthTex = null;
        this.galleryTextTex = null;  // Text layer for post-FXAA compositing

        // Current frame buffer - the fractal passes render into this
        this.currentFrameFBO = null;
        this.currentFrameTex = null;

        // TSAA history: ping-pong pair. accumFBO[i] renders into accumTex[i];
        // the pass reads the other one. RGBA8 like the rest of the chain --
        // 8-bit feedback quantises, but a 1/16 blend moves a channel by ~16
        // levels so it is well clear of the quantisation step.
        this.accumFBO = [null, null];
        this.accumTex = [null, null];
        this.accumIdx = 0;
        this.accumReset = true;

        // Shadow baking (2D texture array)
        this.shadowArrayFBO = null;
        this.shadowArrayTex = null;
        this.shadowArraySize = 0;
        this.shadowArrayLayers = 0;

        this.fboWidth = 0;
        this.fboHeight = 0;
    }

    createColorTexture(width, height) {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
    }

    setupFBO(width, height) {
        const gl = this.gl;

        if (this.fboWidth === width && this.fboHeight === height && this.galleryFBO) return;

        const resolutionChanged = this.fboWidth !== width || this.fboHeight !== height;
        this.fboWidth = width;
        this.fboHeight = height;

        // Clean up old resources
        if (this.galleryFBO) gl.deleteFramebuffer(this.galleryFBO);
        if (this.galleryColorTex) gl.deleteTexture(this.galleryColorTex);
        if (this.galleryDepthTex) gl.deleteTexture(this.galleryDepthTex);
        if (this.galleryTextTex) gl.deleteTexture(this.galleryTextTex);
        if (this.currentFrameFBO) gl.deleteFramebuffer(this.currentFrameFBO);
        if (this.currentFrameTex) gl.deleteTexture(this.currentFrameTex);
        for (let i = 0; i < 2; i++) {
            if (this.accumFBO[i]) gl.deleteFramebuffer(this.accumFBO[i]);
            if (this.accumTex[i]) gl.deleteTexture(this.accumTex[i]);
            this.accumFBO[i] = null;
            this.accumTex[i] = null;
        }


        // Color texture - use RGBA8 (universally supported)
        this.galleryColorTex = this.createColorTexture(width, height);

        // Depth texture - use RGBA8 and encode depth in RGB channels
        this.galleryDepthTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.galleryDepthTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Text texture for post-AA compositing
        this.galleryTextTex = this.createColorTexture(width, height);

        // Gallery framebuffer (3 attachments: color, depth, text)
        this.galleryFBO = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.galleryFBO);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.galleryColorTex, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.galleryDepthTex, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, this.galleryTextTex, 0);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);

        let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Gallery FBO not complete:', status);
        }

        // Current frame buffer - fractal passes draw into this, FXAA reads it
        this.currentFrameTex = this.createColorTexture(width, height);
        this.currentFrameFBO = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.currentFrameFBO);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.currentFrameTex, 0);

        status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Current frame FBO not complete:', status);
        }

        // TSAA history pair. Any resize invalidates the accumulated image, so
        // the next accumulate pass must start from scratch rather than blend
        // against differently-shaped history.
        for (let i = 0; i < 2; i++) {
            this.accumTex[i] = this.createColorTexture(width, height);
            this.accumFBO[i] = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.accumFBO[i]);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.accumTex[i], 0);
            status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            if (status !== gl.FRAMEBUFFER_COMPLETE) {
                console.error('TSAA accum FBO', i, 'not complete:', status);
            }
        }
        this.accumReset = true;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    createShadowArray(size, layers) {
        const gl = this.gl;

        this.shadowArraySize = size;
        this.shadowArrayLayers = layers;

        // Create 2D texture array for per-surface shadows
        this.shadowArrayTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.shadowArrayTex);
        gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.R16F, size, size, layers, 0, gl.RED, gl.HALF_FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Create FBO for rendering to layers
        this.shadowArrayFBO = gl.createFramebuffer();

        gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
    }

    bindShadowLayer(layerIndex) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowArrayFBO);
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.shadowArrayTex, 0, layerIndex);

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Shadow array FBO not complete for layer', layerIndex, ':', status);
        }
    }

    dispose() {
        const gl = this.gl;
        if (this.galleryFBO) gl.deleteFramebuffer(this.galleryFBO);
        if (this.galleryColorTex) gl.deleteTexture(this.galleryColorTex);
        if (this.galleryDepthTex) gl.deleteTexture(this.galleryDepthTex);
        if (this.currentFrameFBO) gl.deleteFramebuffer(this.currentFrameFBO);
        if (this.currentFrameTex) gl.deleteTexture(this.currentFrameTex);
        for (let i = 0; i < 2; i++) {
            if (this.accumFBO[i]) gl.deleteFramebuffer(this.accumFBO[i]);
            if (this.accumTex[i]) gl.deleteTexture(this.accumTex[i]);
            this.accumFBO[i] = null;
            this.accumTex[i] = null;
        }
        if (this.shadowArrayFBO) gl.deleteFramebuffer(this.shadowArrayFBO);
        if (this.shadowArrayTex) gl.deleteTexture(this.shadowArrayTex);

        this.galleryFBO = null;
        this.galleryColorTex = null;
        this.galleryDepthTex = null;
        this.galleryTextTex = null;
        this.currentFrameFBO = null;
        this.currentFrameTex = null;
        this.accumFBO = [null, null];
        this.accumTex = [null, null];
        this.accumReset = true;
        this.shadowArrayFBO = null;
        this.shadowArrayTex = null;
    }
}

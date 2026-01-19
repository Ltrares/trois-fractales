// WebGL2 context wrapper

export class GLContext {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });

        if (!this.gl) {
            throw new Error('WebGL2 required');
        }

        // Enable float texture rendering extension
        this.floatExt = this.gl.getExtension('EXT_color_buffer_float');
        if (!this.floatExt) {
            console.warn('EXT_color_buffer_float not available, using fallback');
        }
    }

    getContext() {
        return this.gl;
    }

    getCanvas() {
        return this.canvas;
    }

    hasFloatExt() {
        return !!this.floatExt;
    }

    dispose() {
        // Guard against double-dispose
        if (!this.gl) return;

        // Force release the WebGL context
        const loseContext = this.gl.getExtension('WEBGL_lose_context');
        if (loseContext) {
            loseContext.loseContext();
        }
        this.gl = null;
    }
}

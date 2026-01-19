// Shader compilation and program management

export class ShaderManager {
    constructor(gl) {
        this.gl = gl;
        this.programs = new Map();
        this.uniformLocations = new Map();
    }

    compileShader(type, src, name) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(`Shader ${name} error:`, gl.getShaderInfoLog(shader));
            console.error(src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n'));
            return null;
        }
        return shader;
    }

    createProgram(vsSource, fsSource, name) {
        const gl = this.gl;
        const vs = this.compileShader(gl.VERTEX_SHADER, vsSource, name + '-vs');
        const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource, name + '-fs');

        if (!vs || !fs) return null;

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);

        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error(`Link error (${name}):`, gl.getProgramInfoLog(prog));
            return null;
        }

        this.programs.set(name, prog);
        return prog;
    }

    getProgram(name) {
        return this.programs.get(name);
    }

    getUniformLocations(programName, uniformNames) {
        const cacheKey = programName;
        if (this.uniformLocations.has(cacheKey)) {
            return this.uniformLocations.get(cacheKey);
        }

        const prog = this.programs.get(programName);
        if (!prog) return null;

        const gl = this.gl;
        const locs = {};

        for (const name of uniformNames) {
            locs[name] = gl.getUniformLocation(prog, name);
        }

        this.uniformLocations.set(cacheKey, locs);
        return locs;
    }

    // Get standard uniform locations for fractal/gallery programs
    getStandardLocs(prog) {
        const gl = this.gl;
        return {
            resolution: gl.getUniformLocation(prog, 'u_resolution'),
            camPos: gl.getUniformLocation(prog, 'u_camPos'),
            camDir: gl.getUniformLocation(prog, 'u_camDir'),
            camRight: gl.getUniformLocation(prog, 'u_camRight'),
            camUp: gl.getUniformLocation(prog, 'u_camUp'),
            zoom: gl.getUniformLocation(prog, 'u_zoom'),
            jitter: gl.getUniformLocation(prog, 'u_jitter'),
            galleryColor: gl.getUniformLocation(prog, 'u_galleryColor'),
            galleryDepth: gl.getUniformLocation(prog, 'u_galleryDepth'),
            // Mandelbox params
            mandelboxScale: gl.getUniformLocation(prog, 'u_mandelboxScale'),
            mandelboxMinR: gl.getUniformLocation(prog, 'u_mandelboxMinR'),
            mandelboxFixedR: gl.getUniformLocation(prog, 'u_mandelboxFixedR'),
            mandelboxFoldLimit: gl.getUniformLocation(prog, 'u_mandelboxFoldLimit'),
            // Mandelbulb params
            mandelbulbPower: gl.getUniformLocation(prog, 'u_mandelbulbPower'),
            mandelbulbPhiPower: gl.getUniformLocation(prog, 'u_mandelbulbPhiPower'),
            mandelbulbPhase: gl.getUniformLocation(prog, 'u_mandelbulbPhase'),
            mandelbulbPhiPhase: gl.getUniformLocation(prog, 'u_mandelbulbPhiPhase'),
            // Julia params
            juliaC: gl.getUniformLocation(prog, 'u_juliaC'),
            // Wall texture
            wallTex: gl.getUniformLocation(prog, 'u_wallTex'),
            // Concrete texture
            concreteTex: gl.getUniformLocation(prog, 'u_concreteTex'),
            // Code textures
            mandelboxCodeTex: gl.getUniformLocation(prog, 'u_mandelboxCodeTex'),
            mandelbulbCodeTex: gl.getUniformLocation(prog, 'u_mandelbulbCodeTex'),
            juliaCodeTex: gl.getUniformLocation(prog, 'u_juliaCodeTex'),
            // Baked shadow texture array
            shadowArrayTex: gl.getUniformLocation(prog, 'u_shadowArrayTex'),
            // Peephole easter egg texture
            peepholeTex: gl.getUniformLocation(prog, 'u_peepholeTex'),
            // Animated slides texture
            slidesTex: gl.getUniformLocation(prog, 'u_slidesTex'),
            // Time for animation
            time: gl.getUniformLocation(prog, 'u_time'),
        };
    }

    setupVertexAttribs(programs, vao) {
        const gl = this.gl;
        gl.bindVertexArray(vao);

        for (const prog of programs) {
            if (!prog) continue;
            const posLoc = gl.getAttribLocation(prog, 'a_position');
            if (posLoc >= 0) {
                gl.enableVertexAttribArray(posLoc);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
            }
        }
    }

    dispose() {
        const gl = this.gl;
        for (const prog of this.programs.values()) {
            gl.deleteProgram(prog);
        }
        this.programs.clear();
        this.uniformLocations.clear();
    }
}

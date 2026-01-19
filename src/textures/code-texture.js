// Shader code display texture generation

export function createCodeTexture(gl, codeString) {
    const canvas = document.createElement('canvas');
    const borderPadding = 32;
    canvas.width = 4096;
    canvas.height = 1512;
    const ctx = canvas.getContext('2d');

    // Fill with solid black background
    //ctx.fillStyle = '#131313';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const fontSize = 36;
    ctx.font = `600 ${fontSize}px "Courier New", monospace`;
    ctx.fillStyle = '#FFFFFF';  // Warm cream/chalk color
    ctx.textBaseline = 'top';

    const contentPadding = borderPadding + 16;
    const leftPadding = contentPadding + 200;
    const maxWidth = canvas.width - leftPadding - contentPadding;

    const lines = codeString.split('\n');
    const lineHeight = fontSize * 1.15;

    let y = contentPadding;
    for (const line of lines) {
        if (ctx.measureText(line).width > maxWidth) {
            let currentLine = '';
            const words = line.split(' ');
            for (const word of words) {
                const testLine = currentLine + word + ' ';
                if (ctx.measureText(testLine).width > maxWidth && currentLine !== '') {
                    ctx.fillText(currentLine.trimEnd(), leftPadding, y);
                    y += lineHeight;
                    currentLine = word + ' ';
                } else {
                    currentLine = testLine;
                }
            }
            ctx.fillText(currentLine.trimEnd(), leftPadding, y);
        } else {
            ctx.fillText(line, leftPadding, y);
        }
        y += lineHeight;

        if (y > canvas.height - contentPadding) break;
    }

    // Create WebGL texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);

    return texture;
}

// Easter egg peephole texture - L.H.O.O.Q. (Duchamp's Mona Lisa)

import { PEEPHOLE } from '../geometry/GalleryGeometry.js';

export function createPeepholeTexture(gl) {
    // Create a placeholder texture first
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // 1x1 placeholder while image loads
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([128, 64, 32, 255]));

    // Load the actual image from config
    const img = new Image();
    img.onload = () => {
        // Draw image to canvas so we can add the signature
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // Draw the original image
        ctx.drawImage(img, 0, 0);

        // Add vignette effect
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
        const gradient = ctx.createRadialGradient(centerX, centerY, maxRadius * 0.3, centerX, centerY, maxRadius);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add signature (without the dot - it becomes recursive image)
        const fontSize = Math.round(img.height * 0.06);
        ctx.fillStyle = '#d4c4a8';
        ctx.font = `italic ${fontSize}px Georgia, serif`;
        ctx.textAlign = 'right';
        const sigX = img.width * 0.75;
        const sigY = img.height * 0.75;
        ctx.fillText('Fluff', sigX, sigY);
        const fluffWidth = ctx.measureText('Fluff').width;
        const dotWidth = ctx.measureText('. ').width;
        ctx.fillText('P', sigX - fluffWidth - dotWidth, sigY);
        ctx.fillText('—', sigX - fluffWidth - dotWidth - ctx.measureText('P ').width - fontSize * 0.3, sigY);

        // Draw tiny L.H.O.O.Q. where the dot would be (recursive!)
        const dotX = sigX - fluffWidth - dotWidth * 0.5;
        const dotY = sigY;
        const dotSize = fontSize * 0.25;
        ctx.drawImage(img, dotX - dotSize / 2, dotY - dotSize, dotSize, dotSize);

        // Upload to GPU
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    img.src = PEEPHOLE.image;

    return texture;
}

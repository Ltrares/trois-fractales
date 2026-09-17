// Title wall texture generation

import { t } from '../i18n/index.js';

// Word wrap helper
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';

    for (const word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > maxWidth && line !== '') {
            lines.push(line.trim());
            line = word + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line.trim());
    return lines;
}

export function createWallTexture(gl) {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1500;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 2048, 1500);

    // === TITLE - TOP CENTER ===
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    ctx.font = '600 72px Georgia, serif';
    ctx.fillText(t('wall.title'), 1024, 80);

    // Subtitle
    ctx.fillStyle = '#000000';
    ctx.font = 'italic 32px Georgia, serif';
    ctx.fillText(t('wall.subtitle'), 1024, 145);

    // === SCULPTURE INFO BOXES ===
    const boxWidth = 500;
    const boxPadding = 30;

    const sculptures = [
        {
            title: t('wall.mandelbulb.title'),
            subtitle: t('wall.mandelbulb.location'),
            desc: t('wall.mandelbulb.desc'),
            x: 300,
            y: 300
        },
        {
            title: t('wall.mandelbox.title'),
            subtitle: t('wall.mandelbox.location'),
            desc: t('wall.mandelbox.desc'),
            x: 790,
            y: 670
        },
        {
            title: t('wall.julia.title'),
            subtitle: t('wall.julia.location'),
            desc: t('wall.julia.desc'),
            x: 1250,
            y: 300
        }
    ];

    for (const sculpt of sculptures) {
        const boxX = sculpt.x;
        const boxY = sculpt.y;
        const textX = boxX + boxPadding;
        const textWidth = boxWidth - boxPadding * 2;

        // Box background (subtle)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.0)';
        ctx.fillRect(boxX, boxY, boxWidth, 380);

        // Box border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX, boxY, boxWidth, 380);

        // Title
        ctx.textAlign = 'left';
        ctx.fillStyle = '#000000';
        ctx.font = '600 42px Georgia, serif';
        ctx.fillText(sculpt.title, textX, boxY + 55);

        // Subtitle (gallery location)
        ctx.fillStyle = '#000000';
        ctx.font = 'italic 29px Georgia, serif';
        ctx.fillText(sculpt.subtitle, textX, boxY + 97);

        // Description
        ctx.fillStyle = '#000000';
        ctx.font = '29px Georgia, serif';
        const lines = wrapText(ctx, sculpt.desc, textWidth);
        let y = boxY + 145;
        for (const line of lines) {
            ctx.fillText(line, textX, y);
            y += 42;
        }


    }

    // === GENERAL DESCRIPTION - MIDDLE AREA ===
    ctx.textAlign = 'left';
    ctx.fillStyle = '#000000';
    ctx.font = '26px Georgia, serif';
    const generalDesc = t('wall.general');
    const generalLines = wrapText(ctx, generalDesc, 1200);
    let generalY = 1140;

    for (const line of generalLines) {
        ctx.fillText(line, 450, generalY);
        generalY += 37;
    }

    // === SIGNATURE - BOTTOM RIGHT ===
    // Note: No period after P - the peephole easter egg serves as the period
    ctx.textAlign = 'right';
    ctx.font = 'italic 72px Georgia, serif';
    ctx.fillText(t('wall.signature'), 1600, 1390);

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

// Title wall texture generation

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
    ctx.fillText('TROIS FRACTALES', 1024, 80);

    // Subtitle
    ctx.fillStyle = '#000000';
    ctx.font = 'italic 32px Georgia, serif';
    ctx.fillText('et Leurs Ombres Peintes', 1024, 145);

    // === SCULPTURE INFO BOXES ===
    const boxWidth = 500;
    const boxPadding = 30;

    const sculptures = [
        {
            title: 'MANDELBULB',
            subtitle: 'Galerie Ouest',
            desc: "Cette formule, créée en 2009, est une extension tridimensionnelle de l'ensemble de Mandelbrot. Elle produit des formes qui ressemblent au chou romanesco.",
            x: 300,
            y: 300
        },
        {
            title: 'MANDELBOX',
            subtitle: 'Galerie Sud',
            desc: "Cette formule, découverte en 2010, ressemble à un labyrinthe de structures extraterrestres et peut se réduire à un seul point.",
            x: 790,
            y: 670
        },
        {
            title: 'JULIA TRANCHE',
            subtitle: 'Galerie Est',
            desc: "L'ensemble de Gaston Julia, découvert en 1918, est ici étendu à quatre dimensions. On coupe l'espace 4D pour créer une tranche 3D de tubes faits de fractales 2D.",
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
        ctx.font = 'italic 26px Georgia, serif';
        ctx.fillText(sculpt.subtitle, textX, boxY + 95);

        // Description
        ctx.fillStyle = '#000000';
        ctx.font = '26px Georgia, serif';
        const lines = wrapText(ctx, sculpt.desc, textWidth);
        let y = boxY + 145;
        for (const line of lines) {
            ctx.fillText(line, textX, y);
            y += 38;
        }


    }

    // === GENERAL DESCRIPTION - MIDDLE AREA ===
    ctx.textAlign = 'left';
    ctx.fillStyle = '#000000';
    ctx.font = '24px Georgia, serif';
    const generalDesc = "Les fractales sont des formes définies par des formules mathématiques répétées. Ces formules génèrent plus de détails à chaque échelle. Les surfaces que vous voyez sont des frontières dans l'espace mathématique. Pour afficher en temps réel, on impose des limites à la complexité et à la qualité visuelle.";
    const generalLines = wrapText(ctx, generalDesc, 1200);
    let generalY = 1140;

    for (const line of generalLines) {
        ctx.fillText(line, 450, generalY);
        generalY += 34;
    }

    // === SIGNATURE - BOTTOM RIGHT ===
    // Note: No period after P - the peephole easter egg serves as the period
    ctx.textAlign = 'right';
    ctx.font = 'italic 72px Georgia, serif';
    ctx.fillText('— P  Fluff', 1600, 1390);

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

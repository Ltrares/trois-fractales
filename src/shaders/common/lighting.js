// Lighting and shadow functions for gallery shader

export const lightingGLSL = `
float calcAO(vec3 pos, vec3 nor, int maxSteps) {
    float occ = 0.0;
    float sca = 1.0;
    int m;
    for (int i = 0; i < 3; i++) {
        float h = 0.03 + 0.12 * float(i);
        float d = galleryDE(pos + nor * h, m);
        occ += (h - d) * sca;
        sca *= 0.7;
    }
    return clamp(1.0 - 1.5 * occ, 0.0, 1.0);
}

float calcSoftShadow(vec3 ro, vec3 rd, float tmax) {
    float res = 1.0;
    float t = 0.05;
    int m;
    for (int i = 0; i < 10; i++) {
        float d = galleryDE(ro + rd * t, m);
        if (d < 0.003) return 0.0;
        res = min(res, 8.0 * d / t);
        t += clamp(d, 0.03, 0.25);
        if (t > tmax) break;
    }
    return clamp(res, 0.0, 1.0);
}

// Sample baked floor shadow from texture
float getFloorShadow(vec3 worldPos, sampler2D shadowTex, float minX, float maxX, float minZ, float maxZ) {
    float u = (worldPos.x - minX) / (maxX - minX);
    float v = (worldPos.z - minZ) / (maxZ - minZ);
    if (u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0) return 1.0;
    return texture(shadowTex, vec2(u, v)).r;
}

// Procedural flowing water for ray misses (the void outside the gallery)
vec3 flowingWater(vec3 rd, float time) {
    vec2 p = rd.xz / (1.0 + abs(rd.y)) * 3.0;
    float t = time * 0.3;
    float wave1 = sin(p.x * 2.0 + t) * sin(p.y * 2.0 + t * 0.7);
    float wave2 = sin(p.x * 4.0 - t * 1.3 + 1.0) * sin(p.y * 3.0 + t * 0.9);
    float wave3 = sin(p.x * 7.0 + t * 0.8) * sin(p.y * 6.0 - t * 1.1);
    float waves = wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2;
    waves = waves * 0.5 + 0.5;
    vec3 deep = vec3(0.02, 0.05, 0.12);
    vec3 mid = vec3(0.05, 0.15, 0.25);
    vec3 bright = vec3(0.1, 0.3, 0.4);
    float viewFade = smoothstep(-0.3, 0.3, rd.y);
    vec3 water = mix(deep, mid, waves);
    water = mix(water, bright, waves * waves * viewFade);
    float caustic = sin(p.x * 12.0 + t * 2.0) * sin(p.y * 12.0 - t * 1.7);
    caustic = pow(max(caustic, 0.0), 3.0) * 0.15;
    water += vec3(caustic * 0.5, caustic * 0.8, caustic);
    return water;
}
`;

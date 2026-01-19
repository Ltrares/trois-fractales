// Common math functions for shaders

export const mathGLSL = `
mat3 rotationMatrix(vec3 angles) {
    float cx = cos(angles.x), sx = sin(angles.x);
    float cy = cos(angles.y), sy = sin(angles.y);
    float cz = cos(angles.z), sz = sin(angles.z);
    return mat3(
        cy*cz, sx*sy*cz - cx*sz, cx*sy*cz + sx*sz,
        cy*sz, sx*sy*sz + cx*cz, cx*sy*sz - sx*cz,
        -sy, sx*cy, cx*cy
    );
}

vec3 boxFold(vec3 z, float limit) {
    return clamp(z, -limit, limit) * 2.0 - z;
}

void sphereFold(inout vec3 z, inout float dz, float minR2, float fixedR2) {
    float r2 = dot(z, z);
    if (r2 < minR2) {
        float temp = fixedR2 / minR2;
        z *= temp; dz *= temp;
    } else if (r2 < fixedR2) {
        float temp = fixedR2 / r2;
        z *= temp; dz *= temp;
    }
}

mat3 juliaRot3D(vec3 angles) {
    float cx = cos(angles.x), sx = sin(angles.x);
    float cy = cos(angles.y), sy = sin(angles.y);
    float cz = cos(angles.z), sz = sin(angles.z);
    return mat3(
        cy*cz, -cy*sz, sy,
        sx*sy*cz + cx*sz, -sx*sy*sz + cx*cz, -sx*cy,
        -cx*sy*cz + sx*sz, cx*sy*sz + sx*cz, cx*cy
    );
}

vec4 qsquare(vec4 q) {
    float a = q.x, b = q.y, c = q.z, d = q.w;
    return vec4(a*a - b*b - c*c - d*d, 2.0*a*b, 2.0*a*c, 2.0*a*d);
}

vec4 qmul(vec4 p, vec4 q) {
    return vec4(
        p.x*q.x - p.y*q.y - p.z*q.z - p.w*q.w,
        p.x*q.y + p.y*q.x + p.z*q.w - p.w*q.z,
        p.x*q.z - p.y*q.w + p.z*q.x + p.w*q.y,
        p.x*q.w + p.y*q.z - p.z*q.y + p.w*q.x
    );
}
`;

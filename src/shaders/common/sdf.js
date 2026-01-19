// Common SDF primitives and ray intersection functions

export const sdfGLSL = `
float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

// Ray-AABB intersection (returns tmin, tmax or -1 if no hit)
vec2 rayBoxIntersect(vec3 ro, vec3 rd, vec3 boxMin, vec3 boxMax) {
    vec3 invRd = 1.0 / rd;
    vec3 t0 = (boxMin - ro) * invRd;
    vec3 t1 = (boxMax - ro) * invRd;
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);
    float tNear = max(max(tmin.x, tmin.y), tmin.z);
    float tFar = min(min(tmax.x, tmax.y), tmax.z);
    if (tNear > tFar || tFar < 0.0) return vec2(-1.0);
    return vec2(max(tNear, 0.0), tFar);
}

// Ray-AABB intersection with normal output
float rayBox(vec3 ro, vec3 rd, vec3 center, vec3 boxHalf, out vec3 normal) {
    vec3 m = 1.0 / rd;
    vec3 n = m * (ro - center);
    vec3 k = abs(m) * boxHalf;
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;
    float tN = max(max(t1.x, t1.y), t1.z);
    float tF = min(min(t2.x, t2.y), t2.z);
    if (tN > tF || tF < 0.0) return -1.0;
    float t = tN > 0.0 ? tN : tF;
    // Compute normal from entry face
    normal = -sign(rd) * step(vec3(tN), t1) * step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);
    if (length(normal) < 0.5) normal = -sign(rd) * step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);
    return t;
}

// Check if point is inside AABB
bool pointInBox(vec3 p, vec3 center, vec3 boxHalf) {
    vec3 d = abs(p - center);
    return d.x <= boxHalf.x && d.y <= boxHalf.y && d.z <= boxHalf.z;
}

// Ray-plane intersection for horizontal planes
float rayPlaneY(vec3 ro, vec3 rd, float y) {
    if (abs(rd.y) < 0.0001) return -1.0;
    float t = (y - ro.y) / rd.y;
    return t > 0.0 ? t : -1.0;
}
`;

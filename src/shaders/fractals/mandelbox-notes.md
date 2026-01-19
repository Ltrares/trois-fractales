# Mandelbox "Fog" Phenomenon

## What is the Fog?

The "fog" is a visual artifact that appears in certain regions of the mandelbox fractal where the distance estimator (DE) becomes unreliable. Unlike normal fractal surfaces, these regions don't have well-defined geometry - the DE either explodes or collapses, making it impossible to march rays through them cleanly.

There are two distinct types of fog:

### 1. Dense Fog (Chaotic Attractor)
- **Cause**: The derivative `dz` explodes (>100) while the orbit stays bounded (doesn't escape)
- **What's happening**: The fractal iteration is chaotically stretching space, creating a region where infinitely complex structure exists at all scales
- **Appearance**: Dark, opaque fog (dark gray/blue: `vec3(0.08, 0.08, 0.10)`)
- **Where it appears**: Deep interior regions, often near scale transitions

### 2. Thin Fog (Collapsed Structure)
- **Cause**: The derivative `dz` stays low (<5) when |scale| < 0.8
- **What's happening**: The fractal is contracting to infinitely small structures that the DE can't resolve
- **Appearance**: Light, semi-transparent fog (silver: `vec3(0.50, 0.50, 0.53)`)
- **Where it appears**: Regions where the scale parameter causes contraction

## Detecting Fog in Shaders

The fog is detected in the `fractalDE()` function by analyzing the iteration behavior:

```glsl
// After the iteration loop:
vec3 ap = abs(pos);
float maxCoord = max(ap.x, max(ap.y, ap.z));
bool isInterior = maxCoord < 1.4;  // Inside the bounding region

// Dense fog: orbit bounded but derivative exploded
bool dzExploded = !escaped && dz > 100.0;

// Thin fog: derivative stayed low with contracting scale
bool dzContracted = dz < 5.0 && abs(scale) < 0.8;

// Signal fog with negative DE values
if (isInterior && dzExploded) return -0.02;    // Dense fog
if (isInterior && dzContracted) return -0.01;  // Thin fog
```

The key insight: **negative DE values signal fog type** rather than a valid distance.

## Rendering the Fog

### Ray Marching Through Fog

When the ray marcher encounters negative DE, it accumulates fog density instead of marching normally:

```glsl
float denseFog = 0.0;
float thinFog = 0.0;

// In the ray march loop:
if (d < 0.0) {
    float stepSize = 0.03;
    if (d < -0.015) {
        denseFog += stepSize * 0.6;  // Dense fog accumulates faster
    } else {
        thinFog += stepSize * 0.3;   // Thin fog accumulates slower
    }
    t += stepSize;  // Fixed step through fog (can't trust DE)
    continue;
}
```

### Fog Coloring

After ray marching completes, fog is blended into the final color:

```glsl
// Clamp fog densities
denseFog = min(denseFog, 1.0);
thinFog = min(thinFog, 1.0);

vec3 denseFogColor = vec3(0.08, 0.08, 0.10);  // Dark fog
vec3 thinFogColor = vec3(0.50, 0.50, 0.53);   // Silver fog

// Blend fog over background or surface
col = mix(col, thinFogColor, thinFog * 0.5);    // Thin: subtle overlay
col = mix(col, denseFogColor, denseFog * 0.8);  // Dense: strong overlay
```

### Fog and Shadows

Fog affects shadow calculations - light passing through fog is attenuated:

```glsl
// In shadow ray marching:
if (d < 0.0) {
    float fogStep = 0.12;  // Larger steps for shadow traversal
    if (d < -0.015) {
        fogAtten *= 0.70;  // Dense fog blocks significant light
    } else {
        fogAtten *= 0.96;  // Thin fog mostly transparent
    }
    t += fogStep;
    continue;
}

// Final shadow includes fog attenuation
return clamp(res * fogAtten, 0.0, 1.0);
```

### Lit Fog

When spotlights illuminate fog, it can be lightened:

```glsl
float fogShadow = calcSelfShadow(fogEntry, spotPos);

// Lighten fog where spotlight reaches
vec3 litThinFog = mix(thinFogColor, vec3(0.7, 0.7, 0.75), fogShadow * 0.5);
vec3 litDenseFog = mix(denseFogColor, vec3(0.25, 0.22, 0.28), fogShadow * 0.7);
```

## Parameter Sensitivity

The fog appearance is heavily influenced by mandelbox parameters:

- **Scale < 1.0**: More likely to produce thin fog (contracting regions)
- **Scale > 2.0**: May produce dense fog at boundaries
- **MinR / FixedR**: Affect where sphere folding triggers, changing fog distribution
- **Fold Limit**: Changes the box folding behavior and fog boundaries

## Tuning Tips

1. **Fog too opaque?** Reduce the accumulation rates (0.6/0.3) or blending factors (0.8/0.5)
2. **Fog too bright/dark?** Adjust the fog color vectors
3. **Fog appears where it shouldn't?** Adjust the `dz` thresholds (100.0/5.0) or `isInterior` bounds
4. **Shadow artifacts in fog?** Increase `fogStep` in shadow calculation or reduce attenuation

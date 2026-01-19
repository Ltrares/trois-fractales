// Mandelbox distance estimator - re-exports from shared module
import { mandelboxForTemplate, boxFoldHelper, sphereFoldHelper, mandelboxVisualDEFn } from './fractal-des.js';

// For fractal-template.js compatibility
export const mandelboxDE = mandelboxForTemplate;

// Code string for wall texture display - uses visual quality settings
export const mandelboxCodeString = boxFoldHelper + '\n' + sphereFoldHelper + '\n' + mandelboxVisualDEFn;

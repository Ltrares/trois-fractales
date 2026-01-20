// Julia distance estimator - re-exports from shared module
import { juliaForTemplate, qmulHelper, juliaVisualDEFn } from './fractal-des.js';

// For fractal-template.js compatibility
export const juliaDE = juliaForTemplate;

// Code string for wall texture display - uses visual quality settings
export const juliaCodeString = qmulHelper + '\n' + juliaVisualDEFn;

// Mandelbulb distance estimator - re-exports from shared module
import { mandelbulbForTemplate, mandelbulbVisualDEFn } from './fractal-des.js';

// For fractal-template.js compatibility
export const mandelbulbDE = mandelbulbForTemplate;

// Code string for wall texture display - uses visual quality settings
export const mandelbulbCodeString = mandelbulbVisualDEFn;

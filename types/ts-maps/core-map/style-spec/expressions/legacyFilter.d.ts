/**
 * Upgrade a legacy Mapbox filter to an equivalent expression-form filter.
 * Already-upgraded filters pass through unchanged so callers can apply this
 * blindly as a pre-pass.
 */
export declare function convertLegacyFilter(filter: unknown[]): unknown[];

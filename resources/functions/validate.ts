/**
 * Tiny field-validation helpers for the hand-written Actions (#977). The
 * generated CRUD actions get `validations` rules from the model; these give
 * the custom territory/activity/social actions the same contract: malformed
 * input → 422 with a field-keyed error map, never a 500 or silent coercion.
 */

export type FieldErrors = Record<string, string>

/** Coerce to a positive integer (id-shaped), or null if it isn't one. */
export function positiveInt(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n) || n <= 0)
    return null
  return n
}

/** Coerce to a finite number within [min, max], or null. */
export function boundedNumber(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max)
    return null
  return n
}

/** Non-empty trimmed string capped at maxLen, or null. */
export function boundedString(value: unknown, maxLen: number): string | null {
  if (typeof value !== 'string')
    return null
  const s = value.trim()
  if (!s.length || s.length > maxLen)
    return null
  return s
}

/** `MM:SS` / `H:MM:SS` duration label, or null. */
export function durationString(value: unknown): string | null {
  if (typeof value !== 'string')
    return null
  const s = value.trim()
  return /^(?:\d+:)?[0-5]?\d:[0-5]\d$/.test(s) ? s : null
}

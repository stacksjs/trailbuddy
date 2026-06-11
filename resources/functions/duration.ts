/**
 * Pure duration/pace helpers shared by the manual-entry form and the activity
 * editor (#955, #954). Durations are the app's display strings: `MM:SS` or
 * `H:MM:SS` (same shape the recorder's fmtDuration emits).
 */

/** Parse `MM:SS` / `H:MM:SS` to total seconds, or null if malformed. */
export function parseDurationToSeconds(raw: string): number | null {
  const m = raw.trim().match(/^(?:(\d+):)?([0-5]?\d):([0-5]\d)$/)
  if (!m)
    return null
  const hours = m[1] ? Number(m[1]) : 0
  return hours * 3600 + Number(m[2]) * 60 + Number(m[3])
}

/** Per-mile pace string (`MM:SS/mi`) from distance + moving seconds, or '--'. */
export function paceString(distanceMi: number, movingSeconds: number): string {
  if (!(distanceMi > 0) || !(movingSeconds > 0))
    return '--'
  const per = Math.round(movingSeconds / distanceMi)
  const mm = Math.floor(per / 60)
  const ss = per % 60
  return `${mm}:${String(ss).padStart(2, '0')}/mi`
}

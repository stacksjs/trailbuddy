/**
 * Coverage summary for the trail catalog.
 *
 * The catalog is built by a long-running national ingest, so "how much of the
 * country is in here?" is a question both the user and the operator ask. The
 * numbers come from indexed `GROUP BY`s rather than from a config constant,
 * which means the page tells the truth while the ingest is still running
 * instead of advertising a total that has not landed yet.
 *
 * Cached in-process: the counts change on the order of minutes as shards
 * complete, and every catalog page view would otherwise aggregate the whole
 * table.
 */

const CACHE_TTL_MS = 60_000

interface CoverageStats {
  total: number
  states: Array<{ code: string, name: string, count: number }>
  sources: Array<{ source: string, count: number }>
}

let cache: { at: number, value: CoverageStats } | null = null

export default new Action({
  name: 'Trail Stats',
  description: 'Trail catalog coverage by state and source',
  method: 'GET',

  async handle() {
    try {
      if (cache && Date.now() - cache.at < CACHE_TTL_MS)
        return response.json({ success: true, ...cache.value })

      const stateRows = await db.sql`
        SELECT state AS code, state_name AS name, COUNT(*) AS count
        FROM trails
        WHERE state IS NOT NULL AND state != ''
        GROUP BY state, state_name
        ORDER BY count DESC
      `.execute() as Array<{ code: string, name: string, count: number }>

      const sourceRows = await db.sql`
        SELECT source, COUNT(*) AS count
        FROM trails
        GROUP BY source
        ORDER BY count DESC
      `.execute() as Array<{ source: string, count: number }>

      const states = (stateRows ?? []).map(row => ({
        code: row.code,
        name: row.name || row.code,
        count: Number(row.count),
      }))

      const value: CoverageStats = {
        total: states.reduce((sum, row) => sum + row.count, 0),
        states,
        sources: (sourceRows ?? []).map(row => ({ source: row.source, count: Number(row.count) })),
      }

      cache = { at: Date.now(), value }

      return response.json({ success: true, ...value })
    }
    catch (error) {
      console.error('[trails] stats failed:', error)
      return response.json({ success: false, total: 0, states: [], sources: [] }, 500)
    }
  },
})

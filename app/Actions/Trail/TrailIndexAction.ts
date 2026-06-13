export default new Action({
  name: 'Trail Index',
  description: 'List trails for the explore map and catalog',
  method: 'GET',

  async handle(request) {
    const page = readPageParams(request, { defaultLimit: 500, maxLimit: 500 })

    try {
      const rows = await Trail.all()
      const trails = (rows ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        lat: row.latitude ?? row.lat,
        lng: row.longitude ?? row.lng,
      }))
      // Wrapped (was a bare array, #978) — the catalog's extractApiTrailRows
      // already reads `.trails`, so this is backward-compatible.
      const { items, meta } = paginate(trails, page)
      return response.json({ success: true, trails: items, meta })
    }
    catch (error) {
      console.error('[trails] index failed:', error)
      return response.json({ success: false, trails: [], meta: { offset: 0, limit: 0, total: 0, hasMore: false }, error: 'Failed to fetch trails' }, 500)
    }
  },
})

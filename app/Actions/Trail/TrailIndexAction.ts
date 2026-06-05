export default new Action({
  name: 'Trail Index',
  description: 'List trails for the explore map and catalog',
  method: 'GET',

  async handle(request) {
    const limit = Math.min(Math.max(request.get<number>('limit') || 500, 1), 500)

    try {
      const rows = await Trail.limit(limit).get()
      const trails = (rows ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        lat: row.latitude ?? row.lat,
        lng: row.longitude ?? row.lng,
      }))
      return response.json(trails)
    }
    catch (error) {
      console.error('[trails] index failed:', error)
      return response.json([], 200)
    }
  },
})

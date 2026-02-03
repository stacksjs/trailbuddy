import { Action } from '@stacksjs/actions'
import { response } from '@stacksjs/router'
import { Trail } from '@stacksjs/orm'

export default new Action({
  name: 'Trail Index',
  description: 'Get all trails with optional filtering',
  method: 'GET',
  async handle(request) {
    const difficulty = request.getQueryParam('difficulty')
    const search = request.getQueryParam('search')
    const limit = Number(request.getQueryParam('limit')) || 20
    const offset = Number(request.getQueryParam('offset')) || 0

    let query = Trail.query()

    if (difficulty && difficulty !== 'all') {
      query = query.where('difficulty', difficulty)
    }

    if (search) {
      query = query.where('name', 'like', `%${search}%`)
    }

    const trails = await query
      .orderBy('rating', 'desc')
      .limit(limit)
      .offset(offset)
      .get()

    return response.json(trails)
  },
})

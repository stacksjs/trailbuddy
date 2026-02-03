import { Action } from '@stacksjs/actions'
import { response } from '@stacksjs/router'
import { Trail } from '@stacksjs/orm'

export default new Action({
  name: 'Trail Show',
  description: 'Get a single trail by ID',
  method: 'GET',
  async handle(request) {
    const id = request.getParam('id')
    const trail = await Trail.findOrFail(id)

    return response.json(trail)
  },
})

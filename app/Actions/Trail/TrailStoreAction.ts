import { Action } from '@stacksjs/actions'
import { response } from '@stacksjs/router'
import { Trail } from '@stacksjs/orm'

export default new Action({
  name: 'Trail Store',
  description: 'Create a new trail',
  method: 'POST',
  async handle(request) {
    await request.validate()
    const trail = await Trail.create(request.all())

    return response.json(trail, 201)
  },
})

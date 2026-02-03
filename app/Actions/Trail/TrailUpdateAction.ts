import { Action } from '@stacksjs/actions'
import { response } from '@stacksjs/router'
import { Trail } from '@stacksjs/orm'

export default new Action({
  name: 'Trail Update',
  description: 'Update an existing trail',
  method: 'PATCH',
  async handle(request) {
    await request.validate()
    const id = request.getParam('id')
    const trail = await Trail.findOrFail(id)
    const result = await trail?.update(request.all())

    return response.json(result)
  },
})

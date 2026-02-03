import { Action } from '@stacksjs/actions'
import { response } from '@stacksjs/router'
import { Trail } from '@stacksjs/orm'

export default new Action({
  name: 'Trail Destroy',
  description: 'Delete a trail',
  method: 'DELETE',
  async handle(request) {
    const id = request.getParam('id')
    const trail = await Trail.findOrFail(id)
    await trail?.delete()

    return response.json({ message: 'Trail deleted successfully' })
  },
})

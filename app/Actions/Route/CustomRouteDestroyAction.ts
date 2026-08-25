import { Auth } from '@stacksjs/auth'

import CustomRoute from '../../Models/CustomRoute'

export default new Action({
  name: 'Custom Route Destroy',
  description: 'Delete one saved custom route owned by the athlete',
  method: 'DELETE',
  async handle(request) {
    const user = await Auth.user().catch(() => null)
    const id = positiveInt(request.get('id'))
    if (!user) return response.json({ success: false, error: 'Authentication required' }, 401)
    if (!id) return response.json({ success: false, error: 'Route ID is required' }, 422)
    const route = await CustomRoute.find(id)
    if (!route || route.user_id !== user.id) return response.json({ success: false, error: 'Route not found' }, 404)
    await CustomRoute.delete(id)
    return response.json({ success: true })
  },
})

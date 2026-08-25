import { Auth } from '@stacksjs/auth'

import CustomRoute from '../../Models/CustomRoute'

export default new Action({
  name: 'Custom Route Index',
  description: 'List the authenticated athlete saved routes',
  method: 'GET',
  async handle() {
    const user = await Auth.user().catch(() => null)
    if (!user) return response.json({ success: false, error: 'Authentication required' }, 401)
    const routes = (await CustomRoute.where('user_id', '=', user.id).orderBy('created_at', 'desc').limit(100).get()) ?? []
    return response.json({ success: true, routes: routes.map(routeResponse) })
  },
})

export function routeResponse(route: any) {
  return {
    id: route.id,
    name: route.name,
    route: parseRoute(route.route_data),
    distance: route.distance,
    elevation: route.elevation,
    closedLoop: !!route.closed_loop,
    createdAt: route.created_at,
  }
}

function parseRoute(raw: string): unknown[] {
  try { const value = JSON.parse(raw); return Array.isArray(value) ? value : [] }
  catch { return [] }
}

import { Auth } from '@stacksjs/auth'

import { settingsResponse } from './PrivacySettingsShowAction'
import UserPrivacySetting from '../../Models/UserPrivacySetting'

const VISIBILITIES = ['public', 'followers', 'private']

function optionalNumber(value: unknown, min: number, max: number): number | null | undefined {
  if (value === undefined || value === null || value === '')
    return value === '' ? null : value as null | undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= min && number <= max ? number : undefined
}

export default new Action({
  name: 'Privacy Settings Update',
  description: 'Update activity defaults, endpoint masking, and home-zone safety',
  method: 'PATCH',
  async handle(request) {
    const user = await Auth.user().catch(() => null)
    if (!user)
      return response.json({ success: false, error: 'Authentication required' }, 401)

    const visibility = request.get<string>('default_activity_visibility') ?? 'followers'
    const hideMeters = optionalNumber(request.get('hide_start_end_meters'), 0, 5000)
    const homeLat = optionalNumber(request.get('home_lat'), -90, 90)
    const homeLng = optionalNumber(request.get('home_lng'), -180, 180)
    const homeRadius = optionalNumber(request.get('home_radius_meters'), 100, 5000)
    const fields: Record<string, string> = {}
    if (!VISIBILITIES.includes(visibility)) fields.default_activity_visibility = 'must be public, followers, or private'
    if (hideMeters === undefined) fields.hide_start_end_meters = 'must be between 0 and 5000 metres'
    if (homeLat === undefined) fields.home_lat = 'must be a latitude between -90 and 90'
    if (homeLng === undefined) fields.home_lng = 'must be a longitude between -180 and 180'
    if (homeRadius === undefined) fields.home_radius_meters = 'must be between 100 and 5000 metres'
    if ((homeLat === null) !== (homeLng === null)) fields.home = 'home latitude and longitude must be set or cleared together'
    if (Object.keys(fields).length)
      return response.json({ success: false, error: 'Validation failed', fields }, 422)

    const values = {
      user_id: user.id,
      default_activity_visibility: visibility,
      hide_start_end_meters: hideMeters ?? 400,
      home_lat: homeLat,
      home_lng: homeLng,
      home_radius_meters: homeRadius ?? 500,
      exclude_home_from_game: request.get('exclude_home_from_game') !== false,
      show_precise_territories: request.get('show_precise_territories') === true,
    }
    const existing = await UserPrivacySetting.where('user_id', '=', user.id).first()
    const saved = existing
      ? await UserPrivacySetting.forceUpdate(existing.id, values)
      : await UserPrivacySetting.forceCreate(values)
    return response.json({ success: true, settings: settingsResponse(saved) })
  },
})

import UserPrivacySetting from '../../Models/UserPrivacySetting'

function settingsResponse(row: any) {
  return {
    defaultActivityVisibility: row?.default_activity_visibility ?? 'followers',
    hideStartEndMeters: row?.hide_start_end_meters ?? 400,
    homeLat: row?.home_lat ?? null,
    homeLng: row?.home_lng ?? null,
    homeRadiusMeters: row?.home_radius_meters ?? 500,
    excludeHomeFromGame: row?.exclude_home_from_game === undefined ? true : !!row.exclude_home_from_game,
    showPreciseTerritories: !!row?.show_precise_territories,
  }
}

export default new Action({
  name: 'Privacy Settings Show',
  description: 'Get the authenticated athlete privacy and location-safety settings',
  method: 'GET',
  async handle() {
    const user = await Auth.user().catch(() => null)
    if (!user)
      return response.json({ success: false, error: 'Authentication required' }, 401)
    const settings = await UserPrivacySetting.where('user_id', '=', user.id).first()
    return response.json({ success: true, settings: settingsResponse(settings) })
  },
})

export { settingsResponse }

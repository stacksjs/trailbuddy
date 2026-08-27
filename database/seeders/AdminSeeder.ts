import { Seeder } from '@stacksjs/database'
import { SEED_PASSWORD } from './UserSeeder'
import User from '../../app/Models/User'
import UserStat from '../../app/Models/UserStats'

/**
 * The account that can actually open /admin.
 *
 * `/admin` (and the sweeps behind `role:admin`) are gated by RBAC, not by a
 * column on `users` — AdminOverviewAction resolves the caller's role names and
 * refuses anything without `admin`. So a seeded database with five athletes in
 * it still had nobody who could see the dashboard: every one of them got a 403
 * and the page rendered its "This area is for administrators." error.
 *
 * This seeder closes that gap end to end. It ensures the default role packs
 * exist (so `buddy seed` alone is enough — `buddy seed:roles` stays an
 * equivalent, separate entry point), creates the staging administrator, and
 * assigns the role.
 *
 * Two accounts hold it on purpose, because they show different things:
 *
 *   - `admin@wildloop.test` owns nothing. Its /profile, /stats, /conquests
 *     and /notifications are the honest empty states, which is exactly what
 *     you want to be able to look at — those are the screens a brand new
 *     account sees, and they are the ones that quietly regress.
 *   - `chris@wildloop.test` is one of the seeded athletes AND an admin, so
 *     the same dashboards can be checked with a full history behind them.
 *
 * Staging only. The credentials are printed on purpose: these are throwaway
 * accounts on a throwaway catalog, and the whole point of a seeded environment
 * is that anyone on the team can sign in to it. Never run this against a real
 * database.
 */

/** Published in the seeder output. Staging only — see the note above. */
export const ADMIN_EMAIL = 'admin@wildloop.test'
export const ADMIN_PASSWORD = 'wildloop-admin'

/** Seeded athletes who also hold the `admin` role. */
const ADMIN_ATHLETE_EMAILS = ['chris@wildloop.test']

export default class AdminSeeder extends Seeder {
  // After UserSeeder (-100), so the athletes it promotes already exist.
  static order = -95

  async run(): Promise<void> {
    const { createBqbRbacStore, Rbac, seedDefaultRoles } = await import('@stacksjs/auth')
    Rbac.setStore(createBqbRbacStore())

    // Idempotent: existing (name, guard_name) rows are left untouched.
    await seedDefaultRoles()

    const existing = await User.where('email', '=', ADMIN_EMAIL).first().catch(() => null)
    const admin = existing
      ? (await User.update(existing.id, { name: 'WildLoop Admin' }), existing)
      : await User.create({
          name: 'WildLoop Admin',
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        })

    if (!admin?.id) {
      console.warn('[seed] admin account could not be created; skipping role assignment')
      return
    }

    // The admin is a real account, so it needs the stats row every athlete has
    // — /profile and the athlete directory both read through it, and a missing
    // row rendered the dashboard owner as an athlete with no history at all.
    const stats = await UserStat.where('user_id', '=', admin.id).first().catch(() => null)
    if (!stats) {
      await UserStat.forceCreate({
        user_id: admin.id,
        total_distance: 0,
        total_elevation: 0,
        trails_completed: 0,
        total_activities: 0,
        current_streak: 0,
        longest_streak: 0,
        total_kudos_received: 0,
        total_kudos_given: 0,
        weekly_rank: 0,
        total_time: '0',
      }).catch(() => null)
    }

    const promote = [admin.email, ...ADMIN_ATHLETE_EMAILS]
    for (const email of promote) {
      const user = email === admin.email
        ? admin
        : await User.where('email', '=', email).first().catch(() => null)
      if (!user?.id)
        continue

      // `assignRole` is a no-op when the user already holds it.
      await Rbac.assignRole({ id: user.id }, 'admin').catch((err: unknown) => {
        console.error(`[seed] could not grant admin to ${email}:`, err)
      })
    }

    console.warn(`[seed] admin sign-in: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (holds no data — the empty states)`)
    for (const email of ADMIN_ATHLETE_EMAILS)
      console.warn(`[seed] admin sign-in: ${email} / ${SEED_PASSWORD} (a seeded athlete, so every page has data)`)
  }
}

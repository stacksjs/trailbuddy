import { Seeder } from '@stacksjs/database'
import Club from '../../app/Models/Club'
import ClubMember from '../../app/Models/ClubMember'
import User from '../../app/Models/User'

/**
 * Real clubs, not generated ones.
 *
 * Rappid Run is a closed team: `join_policy: 'invite_only'` means the club is
 * discoverable — it shows in the directory with its site and its numbers — but
 * the Join button does not apply to it. Membership comes from a ClubInvite one
 * of its owners issues, which `ClubInviteAcceptAction` redeems.
 *
 * `is_private` is deliberately false. Hiding the club would be a different
 * product decision: a closed team still wants to be findable, it just does not
 * want walk-ins.
 *
 * Idempotent by name, so re-seeding a database that already has these clubs
 * updates them in place rather than filling the directory with duplicates.
 */

interface SeedClub {
  name: string
  description: string
  location: string | null
  club_type: 'Running' | 'Hiking' | 'Mixed' | 'Territory Game'
  is_private: boolean
  join_policy: 'open' | 'request' | 'invite_only'
  website: string | null
}

const CLUBS: SeedClub[] = [
  {
    name: 'Rappid Run',
    // Their own words: rappid.run's tagline is "by inspiring others we
    // inspire ourselves". Worth using rather than inventing copy for a real
    // crew — a seeded club that misdescribes an actual team is worse than a
    // generated one.
    description:
      'By inspiring others we inspire ourselves. A closed running crew training for road and '
      + 'trail, with its own kit and drops. Members are invited by the crew — sessions, race '
      + 'plans, and the team calendar live behind the door.',
    location: null,
    club_type: 'Running',
    is_private: false,
    join_policy: 'invite_only',
    website: 'https://www.rappid.run',
  },
]

export default class ClubSeeder extends Seeder {
  // After UserSeeder — a club needs an owner.
  static order = -90

  async run(): Promise<void> {
    // Every club needs an owner. `static order` above guarantees UserSeeder
    // has already run, so take the lowest id rather than inventing an
    // account: on a fresh database that is the first seeded athlete.
    const owner = await User.orderBy('id', 'asc').first().catch(() => null)
    if (!owner) {
      console.warn('[seed] no users yet; skipping clubs')
      return
    }

    for (const seed of CLUBS) {
      const existing = await Club.where('name', '=', seed.name).first().catch(() => null)

      if (existing) {
        await Club.update(existing.id, {
          description: seed.description,
          location: seed.location,
          club_type: seed.club_type,
          is_private: seed.is_private,
          join_policy: seed.join_policy,
          website: seed.website,
        })
        continue
      }

      const club = await Club.forceCreate({
        creator_id: owner.id,
        name: seed.name,
        description: seed.description,
        location: seed.location,
        club_type: seed.club_type,
        is_private: seed.is_private,
        join_policy: seed.join_policy,
        website: seed.website,
      })

      await ClubMember.forceCreate({
        club_id: club.id,
        user_id: owner.id,
        role: 'owner',
      }).catch(() => undefined)
    }
  }
}

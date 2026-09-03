import { Seeder } from '@stacksjs/database'
import Activity from '../../app/Models/Activity'
import ActivityComment from '../../app/Models/ActivityComment'
import User from '../../app/Models/User'

/**
 * Comments on the seeded activities.
 *
 * The feed and the activity detail page both render a comment thread, and an
 * empty table leaves the thread, its count and the mention parsing with
 * nothing to show. Comments are written against the activity they reply to —
 * a thread of generated sentences underneath a specific run reads as obviously
 * fake the moment anybody opens it, which is exactly when the page is being
 * checked.
 *
 * Activities are addressed by the note the athlete wrote on them, because that
 * is what ActivitySeeder keys its own idempotency on and it survives a reseed
 * that renumbers ids.
 */

interface SeedComment {
  /** The `notes` of the activity being commented on. */
  activity: string
  /** Name of the seeded athlete writing the comment. */
  author: string
  body: string
}

const COMMENTS: SeedComment[] = [
  {
    activity: 'Ten yards before the heat came up. Legs fine, stomach better.',
    author: 'Chris Breuer',
    body: 'Ten before noon is absurd. What were you eating on the turnarounds?',
  },
  {
    activity: 'Ten yards before the heat came up. Legs fine, stomach better.',
    author: 'Kim Gottwald',
    body: 'The stomach holding is the whole game at that distance. Well done.',
  },
  {
    activity: 'Morning loop before work.',
    author: 'Pawel Dregan',
    body: 'Every time I see this loop on your feed it is before seven. Do you sleep?',
  },
  {
    activity: 'Back round Skyline to hold it.',
    author: 'Kim Gottwald',
    body: 'Fair. I only got half of it before the cloud came in — I will be back.',
  },
  {
    activity: 'Out in Aspen for the week. Took the long way round the lake.',
    author: 'Kim Gottwald',
    body: 'That was my lake. Enjoy it while it lasts.',
  },
  {
    activity: 'Out in Aspen for the week. Took the long way round the lake.',
    author: 'Mark Dowdle',
    body: 'Brutal. Textbook wider lap though.',
  },
  {
    activity: 'Waterfall loop in the Gorge, wet the whole way.',
    author: 'Mark Dowdle',
    body: 'Wahkeena side is the better start, glad someone else thinks so.',
  },
  {
    activity: 'Panorama path above the lake with the family.',
    author: 'Chris Breuer',
    body: 'That view with a pushchair is a flex.',
  },
  {
    activity: 'Lap of the lake on a rest day. Moose on the west shore.',
    author: 'Mark Dowdle',
    body: 'Seven miles is a rest day. Noted.',
  },
  {
    activity: 'Scramble up and round before the train back.',
    author: 'Harvey Lewis',
    body: 'Best trailhead in the country, you step off the train onto the rock.',
  },
]

export default class ActivityCommentSeeder extends Seeder {
  // After ActivitySeeder (-85): the threads hang off its runs.
  static override order = -62

  async run(): Promise<void> {
    const users = (await User.all().catch(() => [])) as any[]
    const byName = new Map(users.map(u => [u.name, u]))
    if (!byName.size) {
      console.warn('[seed] no users yet; skipping comments')
      return
    }

    for (const seed of COMMENTS) {
      const author = byName.get(seed.author)
      const activity = await Activity.where('notes', '=', seed.activity).first().catch(() => null)
      if (!author || !activity) {
        console.warn(`[seed] comment by ${seed.author} has no author or activity; skipping`)
        continue
      }

      const existing = await ActivityComment
        .where('activity_id', '=', activity.id)
        .where('user_id', '=', author.id)
        .where('body', '=', seed.body)
        .first()
        .catch(() => null)

      if (!existing) {
        await ActivityComment.forceCreate({
          user_id: author.id,
          activity_id: activity.id,
          body: seed.body,
        })
      }
    }
  }
}

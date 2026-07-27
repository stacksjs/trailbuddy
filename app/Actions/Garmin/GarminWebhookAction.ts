// No imports needed - everything is auto-imported!
//
// Where auto-tracking actually happens: the athlete finishes a run, the watch
// syncs to Garmin Connect, and Garmin posts it here within seconds.
//
// Three properties matter more than anything else in this file:
//
//  1. It must refuse anything that is not Garmin. This is a public URL that
//     writes rows, so it fails closed when no secret is configured.
//  2. It must be idempotent. Garmin retries on any non-2xx and a backfill
//     replays history, so the same run will arrive more than once.
//  3. It must answer 200 quickly even when an individual activity is
//     unusable, or Garmin will retry the whole batch forever.

import garminConfig from '../../../config/garmin'
import { extractSummaries, isAuthenticWebhook, mapActivity } from './garmin'

export default new Action({
  name: 'Garmin Webhook',
  description: 'Receive activity push notifications from Garmin and import them',
  method: 'POST',

  // Garmin is a third party and cannot carry our CSRF cookie. The shared
  // secret below is what authenticates this endpoint instead.
  skipCsrf: true,

  async handle(request) {
    const presented = request.headers?.get?.('x-garmin-signature')
      || request.headers?.get?.('x-webhook-secret')
      || new URL(request.url).searchParams.get('secret')

    if (!isAuthenticWebhook(presented, garminConfig.webhookSecret)) {
      // Deliberately terse: an unauthenticated caller learns nothing about
      // whether the endpoint exists or what it expects.
      return response.json({ error: 'Forbidden' }, 403)
    }

    const body = request.jsonBody ?? await request.json?.().catch(() => null)
    const summaries = extractSummaries(body)

    if (summaries.length === 0)
      return response.json({ received: 0, imported: 0 })

    const { db } = await import('@stacksjs/database')

    let imported = 0
    let skipped = 0

    for (const summary of summaries) {
      try {
        // Garmin's id is the only thing tying a push to an account.
        const connection = summary.userId
          ? await db
              .selectFrom('garmin_connections')
              .select(['user_id'])
              .where('garmin_user_id', '=', summary.userId)
              .executeTakeFirst()
          : null

        // A push for someone who is not connected here is not an error; it is
        // a disconnected athlete whose deregistration we may have missed.
        if (!connection) {
          skipped++
          continue
        }

        // The idempotency check. `summary_id` is uniquely indexed, so even a
        // simultaneous redelivery cannot slip past this into a duplicate.
        const seen = await db
          .selectFrom('garmin_activity_imports')
          .select(['id'])
          .where('summary_id', '=', summary.summaryId)
          .executeTakeFirst()

        if (seen) {
          skipped++
          continue
        }

        const mapped = mapActivity(summary)
        if (!mapped) {
          // Not a trail activity (yoga, a pool swim, a multisport parent).
          // Recorded as seen so a retry does not reconsider it every time.
          await db.insertInto('garmin_activity_imports').values({
            user_id: connection.user_id,
            summary_id: summary.summaryId,
            activity_id: null,
          }).execute()
          skipped++
          continue
        }

        const created = await Activity.create({ user_id: connection.user_id, ...mapped })

        await db.insertInto('garmin_activity_imports').values({
          user_id: connection.user_id,
          summary_id: summary.summaryId,
          activity_id: created?.id ?? null,
        }).execute()

        await db
          .updateTable('garmin_connections')
          .set({ last_sync_at: new Date().toISOString() })
          .where('user_id', '=', connection.user_id)
          .execute()

        imported++
      }
      catch (error) {
        // One bad activity must not fail the batch: a non-2xx would make
        // Garmin redeliver everything, including what already imported.
        console.error('[garmin] could not import', summary.summaryId, error)
        skipped++
      }
    }

    return response.json({ received: summaries.length, imported, skipped })
  },
})

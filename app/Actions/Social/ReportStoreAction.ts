import { Auth } from '@stacksjs/auth'

import ContentReport from '../../Models/ContentReport'
import Activity from '../../Models/Activity'
import ActivityComment from '../../Models/ActivityComment'
import Review from '../../Models/Review'
import Territory from '../../Models/Territory'
import User from '../../Models/User'

const SUBJECTS = ['user', 'activity', 'comment', 'trail_review', 'territory']
const REASONS = ['harassment', 'spam', 'unsafe', 'cheating', 'privacy', 'other']
const SUBJECT_MODELS = {
  user: User,
  activity: Activity,
  comment: ActivityComment,
  trail_review: Review,
  territory: Territory,
} as const

export default new Action({
  name: 'Report Store',
  description: 'Submit a moderation report for user-generated or game content',
  method: 'POST',
  async handle(request) {
    const reporterId = (await Auth.user().catch(() => null))?.id
    const subjectType = request.get<string>('subject_type')
    const subjectId = positiveInt(request.get('subject_id'))
    const reason = request.get<string>('reason')
    const detailsRaw = request.get('details')
    const details = detailsRaw ? boundedString(detailsRaw, 2000) : null
    const fields: Record<string, string> = {}
    if (!reporterId) return response.json({ success: false, error: 'Authentication required' }, 401)
    if (!subjectType || !SUBJECTS.includes(subjectType)) fields.subject_type = `must be one of: ${SUBJECTS.join(', ')}`
    if (!subjectId) fields.subject_id = 'must be a positive integer'
    if (!reason || !REASONS.includes(reason)) fields.reason = `must be one of: ${REASONS.join(', ')}`
    if (detailsRaw && !details) fields.details = 'must be 2000 characters or fewer'
    if (Object.keys(fields).length) return response.json({ success: false, error: 'Validation failed', fields }, 422)

    try {
      if (subjectType === 'user' && subjectId === reporterId)
        return response.json({ success: false, error: 'You cannot report your own account' }, 422)

      const subject = await SUBJECT_MODELS[subjectType as keyof typeof SUBJECT_MODELS].find(subjectId)
      if (!subject)
        return response.json({ success: false, error: 'The reported content no longer exists' }, 404)

      const report = await ContentReport.forceCreate({
        reporter_id: reporterId,
        subject_type: subjectType,
        subject_id: subjectId,
        reason,
        details,
        status: 'open',
      })
      return response.json({ success: true, reportId: report.id, status: report.status }, 201)
    }
    catch (error) {
      if (String(error).includes('UNIQUE'))
        return response.json({ success: true, alreadyReported: true })
      console.error('[reports] create failed:', error)
      return response.json({ success: false, error: 'Could not submit report' }, 500)
    }
  },
})

import { describe, expect, it } from 'bun:test'

const actorActions = [
  'app/Actions/Activity/ActivityStoreAction.ts',
  'app/Actions/Activity/ActivityUpdateAction.ts',
  'app/Actions/Activity/ActivityDestroyAction.ts',
  'app/Actions/Activity/KudosToggleAction.ts',
  'app/Actions/Activity/ActivityCommentStoreAction.ts',
  'app/Actions/Territory/ClaimTerritoryAction.ts',
  'app/Actions/Territory/ProcessActivityConquestAction.ts',
  'app/Actions/Social/FollowToggleAction.ts',
  'app/Actions/Social/BlockToggleAction.ts',
  'app/Actions/Social/ReportStoreAction.ts',
  'app/Actions/Trail/SavedTrailToggleAction.ts',
  'app/Actions/Trail/TrailReviewStoreAction.ts',
  'app/Actions/Club/ClubStoreAction.ts',
  'app/Actions/Club/ClubMembershipToggleAction.ts',
  'app/Actions/Club/ClubDestroyAction.ts',
  'app/Actions/Challenge/ChallengeStoreAction.ts',
  'app/Actions/Challenge/ChallengeRespondAction.ts',
  'app/Actions/Challenge/ChallengeResolveAction.ts',
]

describe('session identity boundary', () => {
  it('never falls back from session identity to a request actor id', async () => {
    for (const path of actorActions) {
      const source = await Bun.file(path).text()
      expect(source, path).toContain('Auth.user()')
      expect(source, path).not.toMatch(/Auth\.user\(\)[^\n]*\?\?[^\n]*request\.get/)
      expect(source, path).not.toContain("request.get('giver_id')")
      expect(source, path).not.toContain("request.get('follower_id')")
    }
  })

  it('does not provide a viewer-id impersonation helper', async () => {
    const readActions = [
      'app/Actions/Activity/ActivityIndexAction.ts',
      'app/Actions/Activity/ActivityShowAction.ts',
      'app/Actions/Social/AthleteShowAction.ts',
      'app/Actions/Club/ClubIndexAction.ts',
      'app/Actions/Club/ClubShowAction.ts',
    ]
    for (const path of readActions)
      expect(await Bun.file(path).text(), path).not.toContain('harnessFallbackUserId')
  })
})

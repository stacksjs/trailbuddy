import { state } from 'stx'
import { applyMention, extractMentionQuery, mentionCandidates, type MentionSegment, type MentionUser, parseMentions } from '../functions/mentions'

/**
 * @mention support for comment inputs (#971): autocomplete while typing
 * (`@Riv…` → pick "Rival Runner") and linkified rendering of known names in
 * comment bodies. Mentions are plain text on the wire; names resolve against
 * the store's user list at render time.
 */

interface MentionStoreLike {
  users: () => MentionUser[]
}

interface TextState {
  (): string
  set: (value: string) => void
}

export function useMentions(tb: MentionStoreLike | null, text: TextState) {
  const mentionMatches = state<MentionUser[]>([])

  function onCommentInput(value: string) {
    text.set(value)
    const query = extractMentionQuery(value)
    mentionMatches.set(query === null || !tb ? [] : mentionCandidates(tb.users(), query))
  }

  function pickMention(name: string) {
    text.set(applyMention(text(), name))
    mentionMatches.set([])
  }

  function clearMentions() {
    mentionMatches.set([])
  }

  function mentionSegments(body: string): MentionSegment[] {
    return parseMentions(body, tb ? tb.users() : [])
  }

  return { mentionMatches, onCommentInput, pickMention, clearMentions, mentionSegments }
}

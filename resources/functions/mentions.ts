/**
 * Pure @mention helpers (#971). Mentions are stored as plain text
 * (`@Rival Runner`) and resolved against the known user list at render time -
 * longest name first so "Trail Explorer Pro" wins over "Trail Explorer".
 */

export interface MentionUser {
  id: number
  name: string
}

export interface MentionSegment {
  text: string
  userId?: number
}

/**
 * The active "@query" being typed, or null. Looks at the text after the last
 * `@` that starts a word; allows spaces (names have them) up to 24 chars.
 */
export function extractMentionQuery(input: string): string | null {
  const at = input.lastIndexOf('@')
  if (at === -1)
    return null
  if (at > 0 && !/\s/.test(input[at - 1]))
    return null // mid-word @ (e.g. an email) - not a mention
  const query = input.slice(at + 1)
  if (query.length > 24 || query.includes('@'))
    return null
  return query
}

/** Users whose names match the active query (case-insensitive prefix-ish). */
export function mentionCandidates(users: MentionUser[], query: string, limit = 5): MentionUser[] {
  const q = query.trim().toLowerCase()
  const scored = users
    .map((u) => {
      const name = u.name.toLowerCase()
      const score = q.length === 0 ? 1 : name.startsWith(q) ? 3 : name.includes(q) ? 2 : 0
      return { u, score }
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score || a.u.name.localeCompare(b.u.name))
  return scored.slice(0, limit).map(s => s.u)
}

/** Replace the active "@query" with the picked name (plus trailing space). */
export function applyMention(input: string, name: string): string {
  const at = input.lastIndexOf('@')
  if (at === -1)
    return input
  return `${input.slice(0, at)}@${name} `
}

/** Split a comment body into text/mention segments for linkified rendering. */
export function parseMentions(body: string, users: MentionUser[]): MentionSegment[] {
  if (!body.includes('@') || users.length === 0)
    return [{ text: body }]

  const byLength = [...users].sort((a, b) => b.name.length - a.name.length)
  const segments: MentionSegment[] = []
  let rest = body
  while (rest.length > 0) {
    const at = rest.indexOf('@')
    if (at === -1) {
      segments.push({ text: rest })
      break
    }
    const match = byLength.find(u => rest.slice(at + 1).toLowerCase().startsWith(u.name.toLowerCase()))
    if (!match) {
      // No known name after this @ - emit through it and keep scanning.
      segments.push({ text: rest.slice(0, at + 1) })
      rest = rest.slice(at + 1)
      continue
    }
    if (at > 0)
      segments.push({ text: rest.slice(0, at) })
    segments.push({ text: `@${rest.slice(at + 1, at + 1 + match.name.length)}`, userId: match.id })
    rest = rest.slice(at + 1 + match.name.length)
  }
  // Merge adjacent plain-text segments (cosmetic).
  return segments.reduce<MentionSegment[]>((acc, seg) => {
    const prev = acc[acc.length - 1]
    if (prev && prev.userId === undefined && seg.userId === undefined)
      prev.text += seg.text
    else
      acc.push(seg)
    return acc
  }, [])
}

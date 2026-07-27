import { describe, expect, it } from 'bun:test'
import { encodeMailboxPayload } from '../src/commands/deploy'

/** Decode the way the remote reconcile script does: `base64 -d | while read`. */
function readWithShellSemantics(b64: string): string[] {
  const decoded = Buffer.from(b64, 'base64').toString('utf8')
  const lines = decoded.split('\n')
  // `while read` consumes a line only when it is newline-terminated, so a
  // trailing fragment with no newline is dropped. split() leaves that fragment
  // as the last element (and an empty string when the payload ends correctly).
  return lines.slice(0, -1)
}

describe('encodeMailboxPayload', () => {
  it('delivers every mailbox to a `while read` consumer, including the last', () => {
    const boxes = [
      { address: 'chris@wildloop.org', password: 'a' },
      { address: 'pawel@wildloop.org', password: 'b' },
      { address: 'no-reply@wildloop.org', password: 'c' },
    ]

    const read = readWithShellSemantics(encodeMailboxPayload(boxes))

    expect(read).toHaveLength(3)
    expect(read[2]).toBe('no-reply@wildloop.org\tc')
  })

  it('delivers a lone mailbox', () => {
    const read = readWithShellSemantics(encodeMailboxPayload([{ address: 'solo@wildloop.org', password: 'p' }]))
    expect(read).toEqual(['solo@wildloop.org\tp'])
  })

  it('separates address from password with a tab, matching IFS on the remote side', () => {
    const decoded = Buffer.from(encodeMailboxPayload([{ address: 'a@b.c', password: 'pw' }]), 'base64').toString('utf8')
    expect(decoded).toBe('a@b.c\tpw\n')
  })

  it('encodes nothing when no mailbox is configured', () => {
    // The remote script gates on a non-empty payload, so '' means "skip".
    expect(encodeMailboxPayload([])).toBe('')
  })
})

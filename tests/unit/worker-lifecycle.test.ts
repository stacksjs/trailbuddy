import { describe, expect, it } from 'bun:test'
import { waitForAbortableDelay } from '../../app/Ingest/worker-lifecycle'

describe('ingest worker lifecycle', () => {
  it('ends an idle delay as soon as shutdown is requested', async () => {
    const controller = new AbortController()
    const startedAt = performance.now()
    const waiting = waitForAbortableDelay(60_000, controller.signal)

    controller.abort()

    expect(await waiting).toBe('aborted')
    expect(performance.now() - startedAt).toBeLessThan(100)
  })

  it('does not start a timer after shutdown was already requested', async () => {
    const controller = new AbortController()
    controller.abort()

    expect(await waitForAbortableDelay(60_000, controller.signal)).toBe('aborted')
  })
})

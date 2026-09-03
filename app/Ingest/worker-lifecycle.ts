export type DelayResult = 'elapsed' | 'aborted'

/**
 * Wait for an idle-worker delay without making process shutdown wait for the
 * whole interval. The abort listener is removed on either exit path so a
 * long-lived worker does not accumulate listeners between idle cycles.
 */
export function waitForAbortableDelay(durationMs: number, signal: AbortSignal): Promise<DelayResult> {
  if (signal.aborted)
    return Promise.resolve('aborted')

  return new Promise((resolve) => {
    const onAbort = () => finish('aborted')
    const timer = setTimeout(() => finish('elapsed'), durationMs)

    function finish(result: DelayResult): void {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      resolve(result)
    }

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

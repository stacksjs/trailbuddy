import * as abort from '.'

type AbortControllerConstructor = typeof abort.AbortController
type AbortSignalConstructor = typeof abort.AbortSignal

declare global {
  type AbortController = abort.AbortController
  type AbortSignal = abort.AbortSignal

  const AbortController: AbortControllerConstructor
  const AbortSignal: AbortSignalConstructor
}

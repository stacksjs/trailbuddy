import { EventTarget } from 'bare-events/web'

interface AbortSignal extends EventTarget {
  readonly aborted: boolean
  readonly reason: any

  throwIfAborted(): void

  toJSON(): { aborted: boolean; reason: any }
}

declare class AbortSignal {
  private constructor()

  static abort(reason: any): AbortSignal
  static timeout(ms: number): AbortSignal
  static any(signals: AbortSignal[]): AbortSignal
}

interface AbortController {
  readonly signal: AbortSignal

  abort(reason: any): void
}

declare class AbortController {
  constructor()
}

declare namespace AbortController {
  export { AbortSignal, AbortController }
}

export = AbortController

export declare function registerWorkerHandler<T, R>(type: string, fn: WorkerHandler<T, R>, options?: RegisterOptions): void;
export declare function getWorkerHandler(type: string): WorkerHandler | undefined;
export declare interface WorkerTask<T = unknown, _R = unknown> {
  type: string
  payload: T
}
export declare interface WorkerPoolOptions {
  size?: number
  scriptUrl?: string
}
declare interface PendingTask {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}
export declare interface RegisterOptions {
  deps?: Array<(...args: any[]) => any>
  transfer?: (result: any) => ArrayBuffer[]
}
// eslint-disable-next-line no-unused-vars
export type WorkerHandler<T = unknown, R = unknown> = (task: WorkerTask<T, R>) => R | Promise<R>;
// ---------------------------------------------------------------------------
// Pool
// ---------------------------------------------------------------------------
export declare class WorkerPool {
  _size: number;
  _scriptUrl?: string;
  _workers: Worker[];
  _blobUrl?: string;
  _nextId: number;
  _pending: Map<number, PendingTask>;
  _rr: number;
  _usable: boolean;
  constructor(opts?: WorkerPoolOptions);
  size(): number;
  _canUseWorkers(): boolean;
  _spawn(): void;
  _onMessage(e: MessageEvent): void;
  run<T, R>(task: WorkerTask<T, R>): Promise<R>;
  shutdown(): Promise<void>;
}

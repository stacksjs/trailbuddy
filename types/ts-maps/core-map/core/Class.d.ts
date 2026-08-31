export declare class Class {
  static include(props: Record<string, any>): typeof Class;
  static setDefaultOptions(options: Record<string, any>): typeof Class;
  static mergeOptions(options: Record<string, any>): typeof Class;
  static addInitHook(fn: string | (() => void), ...args: any[]): typeof Class;
  options?: Record<string, any>;
  _initHooksCalled: boolean;
  _initHooks?: Array<() => void>;
  initialize(..._args: any[]): void;
  constructor(...args: any[]);
  callInitHooks(): void;
}

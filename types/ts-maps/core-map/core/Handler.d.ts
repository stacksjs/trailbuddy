import { Class } from './Class';
export declare class Handler extends Class {
  _map: any;
  _enabled: boolean;
  static addTo(this: any, map: any, name: string): any;
  initialize(...args: any[]): void;
  enable(): this;
  disable(): this;
  enabled(): boolean;
  addHooks(): void;
  removeHooks(): void;
}

// Browser feature detection used internally.
declare function userAgentContains(str: string): boolean;
declare const chrome: unknown;
declare const safari: unknown;
declare const mobile: boolean;
declare const pointer: boolean;
declare const touchNative: boolean;
declare const touch: unknown;
declare const retina: boolean;
declare const mac: boolean;
declare const linux: boolean;
declare const Browser: BrowserInfo;
export declare interface BrowserInfo {
  chrome: boolean
  safari: boolean
  mobile: boolean
  pointer: boolean
  touch: boolean
  touchNative: boolean
  retina: boolean
  mac: boolean
  linux: boolean
}
export default Browser;

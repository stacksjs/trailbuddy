export declare function addDoubleTapListener(obj: any, handler: EventListener): DoubleTapHandlers;
export declare function removeDoubleTapListener(obj: any, handlers: DoubleTapHandlers): void;
export declare interface DoubleTapHandlers {
  dblclick: EventListener
  simDblclick: (ev: Event) => void
}

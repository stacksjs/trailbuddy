/**
 * Bundled TypeScript declarations
 * Generated from 2 source files
 */


// From: src/index.ts
export declare const biometrics: BiometricsApi;
export declare const camera: CameraApi;
export declare const device: DeviceApi;
export declare const haptics: HapticsApi;
export declare const lifecycle: LifecycleApi;
export declare const location: LocationApi;
export declare const notifications: NotificationsApi;
export declare const permissions: PermissionsApi;
export declare const secureStorage: SecureStorageApi;
export declare const share: ShareApi;
export declare function isNativeMobile(): boolean;
export declare function onMobileReady(callback: (event: CraftReadyEvent) => void): () => void;
export declare function withNativeFeedback<T>(action: () => T | Promise<T>): Promise<T>;
export declare const mobile: unknown;

// From: src/types.ts
export declare interface DeviceInfo {
  platform: 'ios' | 'android' | 'macos' | 'windows' | 'linux'
  osVersion: string
  model: string
  manufacturer: string
  deviceId: string
  isTablet: boolean
  screen?: { width: number, height: number, scale: number }
  battery?: { level: number, isCharging: boolean }
  network?: { type: 'wifi' | 'cellular' | 'ethernet' | 'none', isConnected: boolean }
}
export declare interface DeviceCapabilities {
  camera: boolean
  biometrics: boolean
  nfc: boolean
  bluetooth: boolean
  gps: boolean
  accelerometer: boolean
  gyroscope: boolean
  haptics: boolean
  ar: boolean
  faceId: boolean
  touchId: boolean
}
export type HapticStyle = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid';
export type HapticNotificationType = 'success' | 'warning' | 'error';
export type PermissionType = | 'camera'
  | 'microphone'
  | 'photos'
  | 'location'
  | 'locationAlways'
  | 'notifications'
  | 'contacts'
  | 'calendar'
  | 'reminders'
  | 'bluetooth'
  | 'motion'
  | 'health';
export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'restricted';
export declare interface CameraOptions {
  camera?: 'front' | 'back'
  quality?: number
  maxWidth?: number
  maxHeight?: number
  saveToGallery?: boolean
}
export declare interface PhotoResult {
  base64: string
  uri: string
  width: number
  height: number
  mimeType: string
}
export type BiometricType = 'faceId' | 'touchId' | 'fingerprint' | 'face' | 'iris';
export declare interface Location {
  latitude: number
  longitude: number
  altitude?: number
  accuracy: number
  heading?: number
  speed?: number
  timestamp: number
}
export declare interface LocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}
export declare interface ShareOptions {
  text?: string
  url?: string
  title?: string
  files?: string[]
}
export type AppState = 'active' | 'inactive' | 'background';
export declare interface NotificationOptions {
  title: string
  body?: string
  badge?: number
  sound?: string
  data?: Record<string, unknown>
  scheduleAt?: number
}
export declare interface DeviceApi {
  getInfo: () => Promise<DeviceInfo>
  getCapabilities: () => Promise<DeviceCapabilities>
  isMobile: () => boolean
  isIOS: () => boolean
  isAndroid: () => boolean
  getLocale: () => string
  getTimezone: () => string
}
export declare interface HapticsApi {
  impact: (style?: HapticStyle) => Promise<void>
  notification: (type?: HapticNotificationType) => Promise<void>
  selection: () => Promise<void>
  vibrate: (pattern: number[]) => Promise<void>
}
export declare interface PermissionsApi {
  check: (permission: PermissionType) => Promise<PermissionStatus>
  request: (permission: PermissionType) => Promise<PermissionStatus>
  checkMultiple: (permissions: PermissionType[]) => Promise<Record<PermissionType, PermissionStatus>>
  requestMultiple: (permissions: PermissionType[]) => Promise<Record<PermissionType, PermissionStatus>>
  openSettings: () => Promise<void>
}
export declare interface CameraApi {
  takePicture: (options?: CameraOptions) => Promise<PhotoResult>
  pickImage: () => Promise<PhotoResult>
  pickMultiple: (options?: { maxCount?: number }) => Promise<PhotoResult[]>
  isAvailable: () => Promise<boolean>
}
export declare interface BiometricsApi {
  isAvailable: () => Promise<boolean>
  getBiometricType: () => Promise<BiometricType | null>
  authenticate: (reason: string) => Promise<boolean>
}
export declare interface SecureStorageApi {
  set: (key: string, value: string) => Promise<void>
  get: (key: string) => Promise<string | null>
  delete: (key: string) => Promise<void>
  clear: () => Promise<void>
}
export declare interface LocationApi {
  getCurrentPosition: (options?: LocationOptions) => Promise<Location>
  watchPosition: (callback: (location: Location) => void, options?: LocationOptions) => number
  clearWatch: (watchId: number) => void
}
export declare interface ShareApi {
  share: (options: ShareOptions) => Promise<void>
  isAvailable: () => boolean
}
export declare interface LifecycleApi {
  getState: () => AppState
  onStateChange: (callback: (state: AppState) => void) => () => void
}
export declare interface NotificationsApi {
  show: (options: NotificationOptions) => Promise<void>
  schedule: (options: NotificationOptions) => Promise<void>
  cancelAll: () => Promise<void>
  setBadge: (count: number) => Promise<void>
}

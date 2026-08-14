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
  backgroundLocation?: boolean
  accelerometer: boolean
  gyroscope: boolean
  haptics: boolean
  ar: boolean
  faceId: boolean
  touchId: boolean
}
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
export declare interface LocationRecordingState {
  id: string | null
  active: boolean
  paused: boolean
  startedAt: number | null
  sampleCount?: number
}
export declare interface LocationRecordingResult extends LocationRecordingState {
  locations: Location[]
}
export declare interface ShareOptions {
  text?: string
  url?: string
  title?: string
  files?: string[]
}
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
  startRecording: (options?: LocationOptions) => Promise<LocationRecordingState>
  pauseRecording: () => Promise<LocationRecordingState>
  resumeRecording: () => Promise<LocationRecordingState>
  stopRecording: () => Promise<LocationRecordingResult>
  getRecordingState: () => Promise<LocationRecordingState>
  readRecording: () => Promise<Location[]>
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
export declare interface KeepAwakeApi {
  enable: () => Promise<void>
  disable: () => Promise<void>
}
export declare interface DeepLinksApi {
  getInitialURL: () => Promise<string | null>
  onLink: (callback: (url: string) => void) => () => void
}
export declare interface NetworkStatus {
  type: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown'
  isConnected: boolean
}
export declare interface NetworkApi {
  getStatus: () => Promise<NetworkStatus>
  onChange: (callback: (status: NetworkStatus) => void) => () => void
}
export declare interface AppReviewApi {
  request: () => Promise<boolean>
}
export declare interface PushNotificationsApi {
  register: () => Promise<string>
  onToken: (callback: (token: string) => void) => () => void
  onNotification: (callback: (data: Record<string, unknown>) => void) => () => void
}
export declare interface HealthDataOptions {
  startDate?: number
  endDate?: number
}
export declare interface HealthDataResult {
  value: number
  unit: string
}
export declare interface HealthWorkoutLocation {
  latitude: number
  longitude: number
  altitude?: number
  accuracy?: number
  timestamp: number
}
export declare interface HealthWorkout {
  activityId: string
  type: HealthWorkoutType
  startDate: number
  endDate: number
  distanceMeters?: number
  activeEnergyCalories?: number
  locations?: HealthWorkoutLocation[]
}
export declare interface HealthWorkoutResult {
  id: string
}
export declare interface HealthApi {
  requestAuthorization: (types: HealthDataType[]) => Promise<boolean>
  getData: (type: HealthDataType, options?: HealthDataOptions) => Promise<HealthDataResult>
  saveWorkout: (workout: HealthWorkout) => Promise<HealthWorkoutResult>
}
export declare interface LiveActivityState {
  status?: string
  distanceMeters?: number
  durationSeconds?: number
  progress?: number
}
export declare interface LiveActivityOptions extends LiveActivityState {
  activityId: string
  title: string
}
export declare interface LiveActivitiesApi {
  start: (options: LiveActivityOptions) => Promise<{ id: string }>
  update: (state: LiveActivityState) => Promise<void>
  end: () => Promise<void>
}
export declare interface WatchConnectivityApi {
  send: (message: Record<string, unknown>) => Promise<Record<string, unknown>>
  updateContext: (context: Record<string, unknown>) => Promise<void>
  isReachable: () => Promise<boolean>
  onMessage: (callback: (message: Record<string, unknown>) => void) => () => void
  onReachabilityChange: (callback: (reachable: boolean) => void) => () => void
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
export type BiometricType = 'faceId' | 'touchId' | 'fingerprint' | 'face' | 'iris';
export type AppState = 'active' | 'inactive' | 'background';
export type HealthDataType = 'steps' | 'heartRate' | 'activeEnergy' | 'distance' | 'workouts';
export type HealthWorkoutType = 'running' | 'walking' | 'hiking' | 'cycling';

import type { MobileConfig } from '../storage/framework/core/types/src/mobile'

const envVars = typeof Bun !== 'undefined' ? Bun.env : process.env

export default {
  ios: {
    appName: 'WildLoop',
    bundleId: envVars.IOS_BUNDLE_ID ?? 'org.wildloop.app',
    version: envVars.IOS_APP_VERSION ?? '1.0.0',
    buildNumber: envVars.IOS_BUILD_NUMBER ?? '1',
    deploymentTarget: '16.0',
    teamId: envVars.APPLE_TEAM_ID,
    url: envVars.MOBILE_URL ?? 'https://wildloop.org',
    backgroundColor: '#f8fafc',
    darkMode: true,
    urlSchemes: ['wildloop'],
    orientations: ['portrait'],
    capabilities: {
      deepLinks: true,
      fileDownload: true,
      filePicker: true,
      geolocation: true,
      haptics: true,
      keepAwake: true,
      localDatabase: true,
      orientationLock: true,
      share: true,
    },
  },
} satisfies MobileConfig

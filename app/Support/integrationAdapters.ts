import { createAppleHealthDriver, FitParser } from 'ts-health'
import { createCorosDriver, GarminActivityApiClient } from 'ts-watches'

export interface IntegrationProviderStatus {
  id: string
  name: string
  configured: boolean
  mode: 'oauth-webhook' | 'device-file-import' | 'export-import' | 'native-bridge' | 'local-import'
  library: 'ts-health' | 'ts-watches' | 'native'
  capabilities: string[]
}

export const integrationAdapterFactories = {
  appleHealthExport: createAppleHealthDriver,
  corosDevice: createCorosDriver,
  fitParser: FitParser,
  garminActivityApi: GarminActivityApiClient,
} as const

export function integrationProviderStatuses(options: {
  garminConfigured: boolean
  appleHealthNativeBridge: boolean
  healthConnectNativeBridge: boolean
}): IntegrationProviderStatus[] {
  return [
    {
      id: 'garmin',
      name: 'Garmin Connect',
      configured: options.garminConfigured,
      mode: 'oauth-webhook',
      library: 'ts-watches',
      capabilities: ['oauth', 'activity-push', 'revocation'],
    },
    {
      id: 'coros',
      name: 'COROS',
      configured: true,
      mode: 'device-file-import',
      library: 'ts-watches',
      capabilities: ['device-detection', 'fit-import'],
    },
    {
      id: 'apple-health-export',
      name: 'Apple Health Export',
      configured: true,
      mode: 'export-import',
      library: 'ts-health',
      capabilities: ['workouts', 'heart-rate', 'sleep', 'recovery'],
    },
    {
      id: 'apple-health',
      name: 'Apple Health Native Bridge',
      configured: options.appleHealthNativeBridge,
      mode: 'native-bridge',
      library: 'ts-health',
      capabilities: ['native-sync'],
    },
    {
      id: 'health-connect',
      name: 'Health Connect',
      configured: options.healthConnectNativeBridge,
      mode: 'native-bridge',
      library: 'native',
      capabilities: ['native-sync'],
    },
    {
      id: 'file-import',
      name: 'GPX / TCX / FIT',
      configured: true,
      mode: 'local-import',
      library: 'ts-health',
      capabilities: ['gpx', 'tcx', 'checksum-validated-fit'],
    },
  ]
}

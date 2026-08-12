import { describe, expect, it } from 'bun:test'
import { integrationAdapterFactories, integrationProviderStatuses } from '../../app/Support/integrationAdapters'

describe('integration adapters', () => {
  it('uses the shared health and watch library implementations', () => {
    const fit = new integrationAdapterFactories.fitParser(new ArrayBuffer(16))
    const garmin = new integrationAdapterFactories.garminActivityApi({
      clientId: 'id',
      clientSecret: 'secret',
      redirectUri: 'https://wildloop.org/api/garmin/callback',
    })

    expect(typeof fit.parse).toBe('function')
    expect(garmin.isConfigured).toBe(true)
    expect(integrationAdapterFactories.corosDevice().name.toLowerCase()).toContain('coros')
    expect(integrationAdapterFactories.appleHealthExport('/tmp/export.xml').supportedMetrics.size).toBeGreaterThan(0)
  })

  it('reports COROS truthfully as device/file support, not nonexistent OAuth', () => {
    const coros = integrationProviderStatuses({
      garminConfigured: false,
      appleHealthNativeBridge: false,
      healthConnectNativeBridge: false,
    }).find(provider => provider.id === 'coros')

    expect(coros).toMatchObject({ configured: true, mode: 'device-file-import', library: 'ts-watches' })
  })

  it('does not claim credentialed bridges are ready before configuration', () => {
    const providers = integrationProviderStatuses({
      garminConfigured: false,
      appleHealthNativeBridge: false,
      healthConnectNativeBridge: false,
    })

    expect(providers.find(provider => provider.id === 'garmin')?.configured).toBe(false)
    expect(providers.find(provider => provider.id === 'apple-health')?.configured).toBe(false)
    expect(providers.find(provider => provider.id === 'file-import')?.configured).toBe(true)
  })
})

import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import { maestroReportSummary, parseAdbDevices, prepareIosSimulatorBundle, requestedPlatform, selectIosSimulator, validateBundledFrontend, validateIosAppBundle } from '../../scripts/run-mobile-e2e'

describe('mobile E2E runner', () => {
  it('selects a booted iPhone before a shutdown simulator', () => {
    expect(selectIosSimulator({
      devices: {
        'com.apple.CoreSimulator.SimRuntime.iOS-26-0': [
          { isAvailable: true, name: 'iPhone 17', state: 'Shutdown', udid: 'shutdown' },
          { isAvailable: true, name: 'iPhone 17 Pro', state: 'Booted', udid: 'booted' },
        ],
        'com.apple.CoreSimulator.SimRuntime.watchOS-26-0': [
          { isAvailable: true, name: 'Apple Watch', state: 'Booted', udid: 'watch' },
        ],
      },
    })?.udid).toBe('booted')
  })

  it('returns only ready Android devices', () => {
    expect(parseAdbDevices('List of devices attached\nemulator-5554\tdevice\nemulator-5556\toffline\n')).toEqual(['emulator-5554'])
  })

  it('accepts only supported platform arguments', () => {
    expect(requestedPlatform(['--verbose', 'android'])).toBe('android')
    expect(requestedPlatform(['ios'])).toBe('ios')
    expect(() => requestedPlatform(['web'])).toThrow('Usage:')
  })

  it('reads failures from Maestro JUnit even when its process exits successfully', () => {
    expect(maestroReportSummary(`
      <testsuite tests="2" failures="1">
        <testcase name="pass" />
        <testcase name="fail"><failure>not visible</failure></testcase>
      </testsuite>
    `)).toEqual({ failures: 1, tests: 2 })
  })

  it('removes only the embedded Watch app from simulator products', () => {
    const app = mkdtempSync(join(tmpdir(), 'wildloop-ios-simulator-'))
    mkdirSync(join(app, 'Watch'))
    mkdirSync(join(app, 'PlugIns'))

    expect(prepareIosSimulatorBundle(app)).toBe(app)
    expect(existsSync(join(app, 'Watch'))).toBe(false)
    expect(existsSync(join(app, 'PlugIns'))).toBe(true)
  })

  it('rejects a mobile bundle that lost reactive page setup', () => {
    const output = mkdtempSync(join(tmpdir(), 'wildloop-mobile-dist-'))
    writeFileSync(join(output, 'feed.html'), '<script>window.__stx_latestSetup = () => ({})</script>')
    writeFileSync(join(output, 'trails.html'), '<main>Trails</main>')

    expect(() => validateBundledFrontend(output)).toThrow('trails.html is missing its reactive STX page setup')
  })

  it('locates the bundled iOS entry point before simulator installation', () => {
    const root = mkdtempSync(join(tmpdir(), 'wildloop-ios-app-'))
    const resources = join(root, 'WildLoop.app', 'dist')
    mkdirSync(resources, { recursive: true })
    writeFileSync(join(resources, 'index.html'), '<main>WildLoop</main>')

    expect(validateIosAppBundle(join(root, 'WildLoop.app'))).toBe(join(resources, 'index.html'))
  })

  it('rejects an iOS app product with no bundled entry point', () => {
    const root = mkdtempSync(join(tmpdir(), 'wildloop-empty-app-'))
    mkdirSync(join(root, 'WildLoop.app'), { recursive: true })

    expect(() => validateIosAppBundle(join(root, 'WildLoop.app'))).toThrow('missing its bundled index.html')
  })
})

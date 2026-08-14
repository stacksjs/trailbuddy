import { describe, expect, it } from 'bun:test'
import { maestroReportSummary, parseAdbDevices, requestedPlatform, selectIosSimulator } from '../../scripts/run-mobile-e2e'

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
})

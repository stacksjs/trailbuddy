import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'

type MobilePlatform = 'android' | 'ios'

interface IosDevice {
  isAvailable?: boolean
  name: string
  state: string
  udid: string
}

interface SimctlDevices {
  devices?: Record<string, IosDevice[]>
}

const projectRoot = resolve(import.meta.dir, '..')
const generatedRoot = join(projectRoot, 'storage/framework/mobile')
const resultsRoot = join(projectRoot, 'storage/framework/runtime/e2e')
const flowRoot = join(projectRoot, '.maestro/flows')

function normalizedEnvironment(extra: Record<string, string | undefined> = {}): Record<string, string> {
  return Object.fromEntries(
    Object.entries({ ...process.env, ...extra }).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

function execute(command: string[], options: { capture?: boolean, env?: Record<string, string | undefined> } = {}): string {
  const result = Bun.spawnSync(command, {
    cwd: projectRoot,
    env: normalizedEnvironment(options.env),
    stdout: options.capture ? 'pipe' : 'inherit',
    stderr: 'inherit',
  })
  if (result.exitCode !== 0) throw new Error(`Command failed (${result.exitCode}): ${command.join(' ')}`)
  return options.capture ? result.stdout.toString().trim() : ''
}

function requireCommand(name: string): void {
  if (!Bun.which(name)) throw new Error(`Missing ${name}. Install it before running mobile E2E tests.`)
}

function requirePath(path: string, description: string): void {
  if (!existsSync(path)) throw new Error(`Missing ${description}: ${path}`)
}

export function parseAdbDevices(output: string): string[] {
  return output
    .split('\n')
    .slice(1)
    .map(line => line.trim().split(/\s+/))
    .filter(parts => parts.length >= 2 && parts[1] === 'device')
    .map(parts => parts[0])
}

export function selectIosSimulator(payload: SimctlDevices): IosDevice | null {
  const candidates = Object.entries(payload.devices ?? {})
    .filter(([runtime]) => runtime.toLowerCase().includes('ios'))
    .sort(([left], [right]) => right.localeCompare(left, undefined, { numeric: true }))
    .flatMap(([, devices]) => devices)
    .filter(device => device.isAvailable !== false && device.name.startsWith('iPhone'))

  return candidates.find(device => device.state === 'Booted') ?? candidates[0] ?? null
}

export function maestroReportSummary(xml: string): { failures: number, tests: number } {
  return {
    failures: xml.match(/<(?:failure|error)\b/g)?.length ?? 0,
    tests: xml.match(/<testcase\b/g)?.length ?? 0,
  }
}

export function prepareIosSimulatorBundle(app: string): string {
  // CoreSimulator can reject an otherwise valid iOS app when an embedded
  // watchOS companion is present. The phone app itself is unchanged; only the
  // generated simulator product loses its separately-tested Watch directory.
  rmSync(join(app, 'Watch'), { force: true, recursive: true })
  return app
}

function craftSource(platform: MobilePlatform): string | undefined {
  const envName = platform === 'ios' ? 'CRAFT_IOS_SRC' : 'CRAFT_ANDROID_SRC'
  if (process.env[envName]) return process.env[envName]

  const local = resolve(projectRoot, '../../Tools/craft/packages', platform, 'src/index.ts')
  return existsSync(local) ? local : undefined
}

function buildGeneratedApp(platform: MobilePlatform): void {
  const envName = platform === 'ios' ? 'CRAFT_IOS_SRC' : 'CRAFT_ANDROID_SRC'
  const source = craftSource(platform)
  execute([
    'bunx',
    '--bun',
    '@stacksjs/stx',
    'build',
    '--pages',
    'resources/views',
    '--out',
    'dist',
    '--no-cache',
  ], { env: { MOBILE_E2E: '1' } })
  execute(['bun', 'run', `build:${platform}`], {
    env: {
      MOBILE_E2E: '1',
      ...(source ? { [envName]: source } : {}),
    },
  })
}

function runMaestro(platform: MobilePlatform, deviceId: string): void {
  requireCommand('maestro')
  requirePath(flowRoot, 'Maestro flow directory')

  const platformResults = join(resultsRoot, platform)
  const report = join(platformResults, 'report.xml')
  mkdirSync(platformResults, { recursive: true })
  execute([
    'maestro',
    `--device=${deviceId}`,
    '--no-ansi',
    'test',
    '--env',
    `APP_ID=${appId(platform)}`,
    '--format',
    'junit',
    '--output',
    report,
    '--debug-output',
    join(platformResults, 'debug'),
    '--test-output-dir',
    join(platformResults, 'tests'),
    flowRoot,
  ])

  const summary = maestroReportSummary(readFileSync(report, 'utf8'))
  if (summary.tests === 0) throw new Error(`Maestro ran no ${platform} tests`)
  if (summary.failures > 0) throw new Error(`Maestro reported ${summary.failures} failed ${platform} test(s)`)
}

function appId(platform: MobilePlatform): string {
  return platform === 'ios'
    ? process.env.IOS_BUNDLE_ID ?? 'org.wildloop.app'
    : process.env.ANDROID_PACKAGE_NAME ?? 'org.wildloop.app'
}

function runAndroid(preview: boolean): void {
  requireCommand('adb')
  const devices = parseAdbDevices(execute(['adb', 'devices'], { capture: true }))
  if (devices.length !== 1) throw new Error(`Expected exactly one ready Android device, found ${devices.length}`)

  const apk = process.env.MOBILE_E2E_APP
    ?? join(generatedRoot, 'android/app/build/outputs/apk/debug/app-debug.apk')
  requirePath(apk, 'Android E2E APK')
  execute(['adb', '-s', devices[0], 'install', '-r', apk])
  if (preview) {
    execute(['adb', '-s', devices[0], 'shell', 'am', 'force-stop', appId('android')])
    execute(['adb', '-s', devices[0], 'shell', 'monkey', '-p', appId('android'), '-c', 'android.intent.category.LAUNCHER', '1'])
    console.log(`WildLoop is open on Android device ${devices[0]}.`)
  }
  else {
    runMaestro('android', devices[0])
  }
}

function runIos(preview: boolean): void {
  requireCommand('xcodebuild')
  requireCommand('xcrun')

  const payload = JSON.parse(execute(['xcrun', 'simctl', 'list', 'devices', 'available', '-j'], { capture: true })) as SimctlDevices
  const device = selectIosSimulator(payload)
  if (!device) throw new Error('No available iPhone simulator is installed')
  if (device.state !== 'Booted') execute(['xcrun', 'simctl', 'boot', device.udid])
  execute(['xcrun', 'simctl', 'bootstatus', device.udid, '-b'])

  const derivedData = join(resultsRoot, 'ios/DerivedData')
  const project = join(generatedRoot, 'ios/WildLoop.xcodeproj')
  requirePath(project, 'generated WildLoop Xcode project')
  mkdirSync(derivedData, { recursive: true })
  execute([
    'xcodebuild',
    '-project', project,
    '-scheme', 'WildLoop',
    '-destination', `platform=iOS Simulator,id=${device.udid}`,
    '-derivedDataPath', derivedData,
    '-configuration', 'Debug',
    'CODE_SIGNING_ALLOWED=NO',
    'build',
  ])

  const app = process.env.MOBILE_E2E_APP
    ?? join(derivedData, 'Build/Products/Debug-iphonesimulator/WildLoop.app')
  requirePath(app, 'iOS E2E app')
  execute(['xcrun', 'simctl', 'install', device.udid, prepareIosSimulatorBundle(app)])
  if (preview) {
    requireCommand('open')
    execute(['open', '-a', 'Simulator'])
    execute(['xcrun', 'simctl', 'launch', '--terminate-running-process', device.udid, appId('ios')])
    console.log(`WildLoop is open in Simulator on ${device.name}.`)
  }
  else {
    runMaestro('ios', device.udid)
  }
}

function usage(): never {
  throw new Error('Usage: bun scripts/run-mobile-e2e.ts <ios|android> [--preview|--build-only|--skip-build]')
}

export function requestedPlatform(args: string[]): MobilePlatform {
  const platform = args.find(value => value === 'ios' || value === 'android')
  if (!platform) return usage()
  return platform
}

if (import.meta.main) {
  try {
    const platform = requestedPlatform(process.argv.slice(2))
    const preview = process.argv.includes('--preview')
    const buildOnly = process.argv.includes('--build-only')
    const skipBuild = process.argv.includes('--skip-build')
    if (buildOnly && skipBuild) throw new Error('--build-only and --skip-build cannot be combined')
    if (preview && buildOnly) throw new Error('--preview and --build-only cannot be combined')
    if (!preview && !buildOnly) requireCommand('maestro')

    if (!skipBuild) buildGeneratedApp(platform)
    if (!buildOnly) platform === 'ios' ? runIos(preview) : runAndroid(preview)
  }
  catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

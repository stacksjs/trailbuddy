import { describe, expect, it } from 'bun:test'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateMobileAssociations } from '../../scripts/generate-mobile-associations'

describe('mobile association files', () => {
  it('generates universal and app link declarations from release identities', async () => {
    const output = await mkdtemp(join(tmpdir(), 'wildloop-associations-'))
    const files = await generateMobileAssociations({
      APPLE_TEAM_ID: 'ABCDE12345',
      IOS_BUNDLE_ID: 'org.wildloop.app',
      ANDROID_PACKAGE_NAME: 'org.wildloop.app',
      ANDROID_SHA256_CERT_FINGERPRINT: 'aa:bb:cc',
    }, output)
    expect(files).toHaveLength(2)
    const apple = JSON.parse(await readFile(join(output, '.well-known/apple-app-site-association'), 'utf8'))
    const android = JSON.parse(await readFile(join(output, '.well-known/assetlinks.json'), 'utf8'))
    expect(apple.applinks.details[0].appIDs).toEqual(['ABCDE12345.org.wildloop.app'])
    expect(android[0].target.sha256_cert_fingerprints).toEqual(['AA:BB:CC'])
  })
})

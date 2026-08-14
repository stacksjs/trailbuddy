import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface MobileAssociationEnvironment {
  APPLE_TEAM_ID?: string
  IOS_BUNDLE_ID?: string
  ANDROID_PACKAGE_NAME?: string
  ANDROID_SHA256_CERT_FINGERPRINT?: string
}

export async function generateMobileAssociations(
  environment: MobileAssociationEnvironment = Bun.env,
  publicDirectory = join(process.cwd(), 'public'),
): Promise<string[]> {
  const output = join(publicDirectory, '.well-known')
  const written: string[] = []
  await mkdir(output, { recursive: true })

  const teamId = environment.APPLE_TEAM_ID?.trim()
  const bundleId = environment.IOS_BUNDLE_ID?.trim() || 'org.wildloop.app'
  if (teamId) {
    const path = join(output, 'apple-app-site-association')
    await writeFile(path, `${JSON.stringify({
      applinks: {
        details: [{ appIDs: [`${teamId}.${bundleId}`], components: [{ '/': '/*' }] }],
      },
      webcredentials: { apps: [`${teamId}.${bundleId}`] },
    }, null, 2)}\n`)
    written.push(path)
  }

  const fingerprint = environment.ANDROID_SHA256_CERT_FINGERPRINT?.trim().toUpperCase()
  const packageName = environment.ANDROID_PACKAGE_NAME?.trim() || 'org.wildloop.app'
  if (fingerprint) {
    const path = join(output, 'assetlinks.json')
    await writeFile(path, `${JSON.stringify([{
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: packageName,
        sha256_cert_fingerprints: [fingerprint],
      },
    }], null, 2)}\n`)
    written.push(path)
  }

  return written
}

if (import.meta.main) {
  const written = await generateMobileAssociations()
  if (!written.length) {
    console.warn('No mobile association files generated; set APPLE_TEAM_ID and/or ANDROID_SHA256_CERT_FINGERPRINT')
  }
  else {
    console.log(`Generated ${written.length} mobile association file(s)`)
  }
}

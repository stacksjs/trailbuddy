import type { CloudConfig as TsCloudConfig } from '@stacksjs/ts-cloud'
import type { CloudConfig } from '@stacksjs/ts-cloud-types'

/**
 * ts-cloud deployment configuration.
 *
 * This has to be the named `tsCloud` export: `buddy deploy` imports
 * `config/cloud.ts` and reads `tsCloud.mode`, `tsCloud.project` and the rest
 * off that binding. All of this previously sat on the file's default export
 * instead, where the deploy never looked, so the domain and the DNS provider
 * had no effect on an actual deployment.
 */
export const tsCloud: TsCloudConfig = {
  project: {
    name: 'WildLoop',
    slug: 'wildloop',
    region: 'us-east-1',
  },

  /**
   * Compute lives on Hetzner, not AWS.
   *
   * `attachTo` means this project provisions nothing of its own: it deploys
   * onto the `stacks-<environment>-app` server the `stacks` project owns,
   * shipping only WildLoop's sites plus its own additive rpx fragment and DNS.
   * The box lifecycle, firewall and other tenants stay untouched. Reading the
   * shared server needs HCLOUD_TOKEN in the environment.
   */
  cloud: {
    provider: 'hetzner',
    attachTo: 'stacks',
  },

  mode: 'server',

  environments: {
    production: {
      type: 'production',
      domain: 'wildloop.org',
    },
  },

  sites: {
    // WildLoop renders stx views and proxies /api from a Bun server, so it
    // runs under `buddy serve` behind rpx rather than shipping as a static
    // bundle. 3049 is this project's slot on the shared box (localhost only;
    // rpx fronts it by Host). 3000-3048 are already claimed by the box owner
    // and the other tenants.
    main: {
      root: '.',
      path: '/',
      domain: 'wildloop.org',
      start: './buddy serve',
      port: 3049,
    },

    // www resolves to the same box, so it needs a vhost of its own or it falls
    // through to rpx's default and 404s. Redirecting keeps one canonical host.
    www: {
      domain: 'www.wildloop.org',
      redirect: { to: 'https://wildloop.org', status: 301 },
    },
  },

  infrastructure: {
    dns: {
      // wildloop.org is registered and DNS-managed at Porkbun, so records are
      // written through their API. ts-cloud reads PORKBUN_API_KEY and
      // PORKBUN_SECRET_KEY from the environment. There is deliberately no
      // hostedZoneId: nothing hosts this zone on Route53.
      provider: 'porkbun',
      domain: 'wildloop.org',
    },
  },
}

// Stacks cloud configuration (for existing Stacks cloud features)
const config: CloudConfig = {}

export default config

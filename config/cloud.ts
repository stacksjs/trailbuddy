import type { CloudConfig } from '@stacksjs/ts-cloud-types'

const config: CloudConfig = {
  project: {
    name: 'WildLoop',
    slug: 'wildloop',
    region: 'us-east-1',
  },

  environments: {
    production: {
      type: 'production',
      domain: 'wildloop.org',
    },
  },

  sites: {
    production: {
      domain: 'wildloop.org',
      root: 'dist',
      build: 'bun run build:frontend',
    },
  },

  infrastructure: {
    dns: {
      // wildloop.org is registered and DNS-managed at Porkbun, so records are
      // written through their API rather than a Route53 hosted zone. ts-cloud
      // reads PORKBUN_API_KEY / PORKBUN_SECRET_KEY from the environment; there
      // is deliberately no hostedZoneId here because nothing hosts this zone
      // on Route53.
      provider: 'porkbun',
      domain: 'wildloop.org',
    },
  },
}

export default config

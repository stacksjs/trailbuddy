import type { CloudConfig } from '@stacksjs/ts-cloud-types'

const config: CloudConfig = {
  project: {
    name: 'TrailBuddy',
    slug: 'trailbuddy',
    region: 'us-east-1',
  },

  environments: {
    production: {
      type: 'production',
      domain: 'trailbuddy.stacksjs.com',
    },
  },

  sites: {
    production: {
      domain: 'trailbuddy.stacksjs.com',
      root: 'dist',
      build: 'bun run build:frontend',
    },
  },

  infrastructure: {
    dns: {
      provider: 'route53',
      hostedZoneId: 'Z01455702Q7952O6RCY37',
      domain: 'trailbuddy.stacksjs.com',
    },
  },
}

export default config

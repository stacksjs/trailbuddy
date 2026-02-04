/**
 * RPX (Reverse Proxy) Configuration
 *
 * This configuration enables HTTPS development with custom domains.
 * It reads APP_URL from .env to determine the target domain.
 */
import type { ProxyOptions } from '@stacksjs/rpx'
import os from 'node:os'
import path from 'node:path'

// Read APP_URL from environment or default to localhost
const appUrl = process.env.APP_URL || 'localhost'
// Remove any protocol prefix if present
const domain = appUrl.replace(/^https?:\/\//, '')

const config: ProxyOptions = {
  from: 'localhost:3456',
  to: domain,

  https: {
    domain,
    hostCertCN: domain,
    altNameIPs: ['127.0.0.1', '::1'],
    altNameURIs: ['localhost', domain],
    organizationName: 'Stacks Development',
    countryName: 'US',
    stateName: 'California',
    localityName: 'Playa Vista',
    commonName: domain,
    validityDays: 365,
    basePath: path.join(os.homedir(), '.stacks', 'ssl'),
  },

  cleanup: {
    hosts: true,
    certs: false,
  },

  verbose: false,
}

export default config

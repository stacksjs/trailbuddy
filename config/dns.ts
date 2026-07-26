import type { DnsConfig } from '@stacksjs/types'

/**
 * **DNS Options**
 *
 * This configuration defines all of your DNS options. Because Stacks is fully-typed, you
 * may hover any of the options below and the definitions will be provided. In case you
 * have any questions, feel free to reach out via Discord or GitHub Discussions.
 */
export default {
  // Deliberately empty. wildloop.org is registered and DNS-managed at Porkbun
  // (see config/cloud.ts infrastructure.dns), and deploy writes the records
  // that point the domain at the CDN distribution it provisions. Declaring
  // records here as well would give the domain two owners that disagree.
  //
  // This previously carried the scaffold's placeholder row, an A record
  // binding APP_URL to 10.0.0.1. That address is RFC 1918 private space, so
  // syncing it would have published a record no client on the internet can
  // reach. Add entries below only for records deploy does not manage, such as
  // domain verification TXT or third-party mail.
  a: [],
  aaaa: [],
  cname: [],
  mx: [],
  txt: [],

  nameservers: [],

  // redirects: ['stacksjs.com', 'buddy.sh'],
} satisfies DnsConfig

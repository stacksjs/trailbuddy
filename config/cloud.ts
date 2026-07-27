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
/**
 * The production SQLite file, deliberately outside every release directory.
 *
 * A release is disposable: ts-cloud unpacks each deploy into
 * `releases/<sha>/` and prunes old ones. The database defaults to the
 * relative `database/stacks.sqlite`, which put it INSIDE that directory —
 * so every account, trail and activity written by the running site was
 * discarded the moment the next release cut over, and replaced by whatever
 * happened to be in the developer's local checkout.
 *
 * The two sites also ran as separate deployments with separate release dirs,
 * so `main` and `api` were reading and writing two different files: an account
 * created through the API was invisible to anything the page server did.
 *
 * One absolute path outside both fixes both problems. `DB_DATABASE_PATH` is
 * what `config/database.ts` reads for the sqlite connection.
 */
const SHARED_DATABASE = '/var/www/wildloop-shared/database/stacks.sqlite'

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
    //
    // `start` must name a module bun can execute: ts-cloud always builds
    // `ExecStart=/usr/local/bin/bun <start>`. Pointing it at the root `buddy`
    // script made bun parse a shell script as JavaScript, and the service
    // crash-looped on `ROOT_DIR=$(...)` before it ever bound a port.
    main: {
      root: '.',
      path: '/',
      domain: 'wildloop.org',
      start: 'bun storage/framework/core/buddy/src/cli.ts serve',
      port: 3049,
      // The release ships without dependencies, so nothing resolves until
      // install runs here. Migrate then creates the schema: ts-cloud provisions
      // no tables, and serving against an empty database fails every read.
      preStart: [
        'bun install',
        // The database lives OUTSIDE the release, so create its directory
        // before migrate runs — on a fresh box nothing else would.
        'mkdir -p /var/www/wildloop-shared/database',
        'bun storage/framework/core/buddy/src/cli.ts migrate --force',
      ],
      // Pin the proxy target. `buddy serve` otherwise falls back to
      // 127.0.0.1:3008, which on this SHARED box is the `stacks` project's own
      // API - every /api/trails, /api/activities and /api/territories call
      // would silently answer from another tenant.
      env: {
        API_URL: 'http://127.0.0.1:3050',
        // See the note on the api site below — both processes must open the
        // SAME file or they disagree about who exists.
        DB_DATABASE_PATH: SHARED_DATABASE,
      },
    },

    // The API behind `buddy serve`'s same-origin proxy. Without it nothing
    // serves routes/, so the app would fall back to seed data in the browser.
    //
    // Deliberately no `domain`: rpx skips domain-less sites, so this stays
    // loopback-only. HOST pins the bind to 127.0.0.1 because the box is
    // shared and a 0.0.0.0 bind would expose this API to every neighbour.
    api: {
      root: '.',
      start: 'bun storage/framework/core/actions/src/serve/api.ts',
      port: 3050,
      preStart: ['bun install', 'mkdir -p /var/www/wildloop-shared/database'],
      env: { HOST: '127.0.0.1', APP_ENV: 'production', DB_DATABASE_PATH: SHARED_DATABASE },
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

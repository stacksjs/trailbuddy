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

/**
 * Link `.env.keys` into a release from the site's persistent `shared/` dir.
 *
 * `.env.production` is committed with its sensitive values encrypted, so it
 * ships with every release. The private half that decrypts them lives in
 * `.env.keys`, which is gitignored — and ts-cloud builds the release tarball
 * from git-tracked files, so it can never ride along. Without this the box
 * runs with `APP_KEY="encrypted:…"` as a literal string.
 *
 * `scripts/push-env-keys.ts` puts the file in `shared/` (see `bun run deploy`),
 * which survives releases exactly as `shared/.env` does. This links it in.
 * Non-fatal: a first deploy runs before the file exists, and failing the whole
 * release for a missing symlink would be worse than starting without it.
 */
const LINK_ENV_KEYS = 'ln -sf ../../shared/.env.keys .env.keys 2>/dev/null || true'

/**
 * Install dependencies with the Bun that wrote the lockfile.
 *
 * `bun.lock` here is `lockfileVersion: 2`, which only a canary Bun can read —
 * 1.3.14 is the latest stable and rejects it. The box runs 1.3.14, so it was
 * discarding the lockfile on every deploy ("Unknown lockfile version") and
 * resolving fresh against a monorepo that publishes ~100 packages in a rolling
 * window. Whichever sibling had not landed yet failed the deploy:
 * `@stacksjs/composables@0.70.282` one minute, `@stacksjs/dns@^0.70.283` the
 * next. Nothing about the release was at fault; the install simply was not
 * reproducible.
 *
 * So the install runs under a project-local canary Bun kept outside every
 * release, fetched once and reused. The system `/usr/local/bin/bun` is left
 * alone: 27 services from other projects share it, and upgrading it is the box
 * owner's call, not a side effect of a WildLoop deploy.
 *
 * `--frozen-lockfile` is the point of the exercise. If the lockfile ever
 * cannot satisfy the manifest the deploy stops instead of silently installing
 * something nobody tested.
 */
const INSTALL_BUN = '/var/www/wildloop-shared/bin/bun'

const ENSURE_INSTALL_BUN = `test -x ${INSTALL_BUN} || (mkdir -p /var/www/wildloop-shared/bin && cd /tmp `
  + '&& curl -fsSL -o bun-canary.zip https://github.com/oven-sh/bun/releases/download/canary/bun-linux-x64.zip '
  + `&& unzip -oq bun-canary.zip && mv bun-linux-x64/bun ${INSTALL_BUN} && chmod +x ${INSTALL_BUN} `
  + '&& rm -rf bun-canary.zip bun-linux-x64)'

const INSTALL_DEPS = `${INSTALL_BUN} install --frozen-lockfile`

/**
 * Files that belong to a developer checkout or to mutable host state, never to
 * an immutable production release. In particular, shipping database/*.sqlite
 * copied a 191 MB local catalog into every site tarball even though all three
 * services use SHARED_DATABASE on the server. Keeping this list shared also
 * guarantees main, api, and ingest are built from the same source boundary.
 */
const SOURCE_RELEASE_EXCLUDES = [
  '.claude',
  '.codex',
  '.git',
  '.env',
  '.env.keys',
  'coverage',
  'database/*.sqlite',
  'database/*.sqlite-*',
  'dist',
  'node_modules',
  'pantry',
  'storage/cloud',
  'storage/framework',
  'storage/logs',
  'storage/screenshots',
]

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
      exclude: SOURCE_RELEASE_EXCLUDES,
      deploy: 'server',
      path: '/',
      domain: 'wildloop.org',
      start: 'bun storage/framework/runtime/production/serve.js',
      port: 3049,
      // The release ships without dependencies, so nothing resolves until
      // install runs here. Migrate then creates the schema: ts-cloud provisions
      // no tables, and serving against an empty database fails every read.
      preStart: [
        LINK_ENV_KEYS,
        ENSURE_INSTALL_BUN,
        INSTALL_DEPS,
        'mkdir -p storage/framework/runtime/production',
        'bun build --production --target=bun --packages=external app/ProductionServer.ts --outfile storage/framework/runtime/production/serve.js',
        // The database lives OUTSIDE the release, so create its directory
        // before migrate runs — on a fresh box nothing else would.
        'mkdir -p /var/www/wildloop-shared/database',
        'bun node_modules/@stacksjs/buddy/dist/cli.js migrate --force',
      ],
      // Pin the proxy target. `buddy serve` otherwise falls back to
      // 127.0.0.1:3008, which on this SHARED box is the `stacks` project's own
      // API - every /api/trails, /api/activities and /api/territories call
      // would silently answer from another tenant.
      env: {
        APP_ENV: 'production',
        NODE_ENV: 'production',
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
      exclude: SOURCE_RELEASE_EXCLUDES,
      deploy: 'server',
      start: 'bun storage/framework/runtime/production/api.js',
      port: 3050,
      preStart: [
        LINK_ENV_KEYS,
        ENSURE_INSTALL_BUN,
        INSTALL_DEPS,
        'mkdir -p storage/framework/runtime/production',
        'bun build --production --target=bun --packages=external node_modules/@stacksjs/actions/dist/serve/api.js --outfile storage/framework/runtime/production/api.js',
        'mkdir -p /var/www/wildloop-shared/database',
      ],
      env: {
        HOST: '127.0.0.1',
        APP_ENV: 'production',
        NODE_ENV: 'production',
        DB_DATABASE_PATH: SHARED_DATABASE,
      },
    },

    // The trail ingest worker.
    //
    // Building the US trail catalog is a multi-day job — ~1,400 Overpass tiles
    // at two requests a minute, plus 466 Forest Service and Park Service
    // shards — and it has to keep running between deploys and re-sync itself
    // afterwards. Neither request-driven service above would ever run it, so
    // it gets a systemd unit of its own.
    //
    // Loopback-only like `api`, for the same reason: no `domain` keeps rpx
    // from publishing it, and HOST pins the bind so the neighbours on this
    // shared box cannot reach it. Port 3051 is this project's third slot.
    //
    // The port exists because a `start` site needs one, but it is not wasted:
    // it answers `/` with the live shard counts and per-source trail totals,
    // which is the only practical way to check on a job this long.
    ingest: {
      root: '.',
      exclude: SOURCE_RELEASE_EXCLUDES,
      deploy: 'server',
      start: 'bun storage/framework/runtime/production/ingest.js',
      port: 3051,
      preStart: [
        LINK_ENV_KEYS,
        ENSURE_INSTALL_BUN,
        INSTALL_DEPS,
        'mkdir -p storage/framework/runtime/production',
        'bun build --production --target=bun --packages=external app/TrailIngestWorker.ts --outfile storage/framework/runtime/production/ingest.js',
        'mkdir -p /var/www/wildloop-shared/database',
      ],
      env: {
        HOST: '127.0.0.1',
        PORT: '3051',
        APP_ENV: 'production',
        NODE_ENV: 'production',
        // The same file the site and the API open. An ingest writing to its
        // own copy would build a catalog nobody could read.
        DB_DATABASE_PATH: SHARED_DATABASE,
      },
    },

    // www resolves to the same box, so it needs a vhost of its own or it falls
    // through to rpx's default and 404s. Redirecting keeps one canonical host.
    www: {
      domain: 'www.wildloop.org',
      redirect: { to: 'https://wildloop.org', status: 301 },
    },
  },

  infrastructure: {
    // This project attaches to an existing compute owner, but it still declares
    // its runtime/proxy contract so the deploy command takes the compute path
    // and the shared gateway renders WildLoop routes with rpx.
    compute: {
      runtime: 'bun',
      webServer: 'rpx',
      proxy: {
        engine: 'rpx',
        version: '0.11.45',
      },
    },
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

# WildLoop

WildLoop is an outdoor activity and trail platform with a territory game. It combines trail discovery, GPS recording, activity feeds, clubs, challenges, leaderboards, saved/offline routes, portable activity imports, and a server-authoritative capture engine.

## Product rules

- The authenticated API user is always the actor. Seed data is never used as identity.
- `capture` is the only game-scoring mode. `free`, `simulation`, manual, and file-import activities stay in the activity log without changing territory.
- Territory eligibility is derived server-side from timestamped, accuracy-bearing GPS telemetry. Client distance, duration, and capture claims are not trusted.
- Activity writes are idempotent through `(user_id, upload_id)`. Transient recorder failures queue in IndexedDB and replay on reconnect.
- Public routes mask their start and end. A protected home zone can prevent territory creation, and territory outlines are coarse unless the owner opts into precision.
- Blocks apply in both directions to profiles, feeds, follows, comments, kudos, leaderboards, and game map reads.

See [Game rules](docs/wildloop/game-rules.md), [Security and privacy](docs/wildloop/security-privacy.md), [Architecture](docs/wildloop/architecture.md), and [Operations](docs/wildloop/operations.md).

## Requirements

- Bun 1.3+
- SQLite 3.47.2+
- Node-compatible browser with Geolocation and IndexedDB for recording/offline features

## Local development

```bash
bun install
./buddy migrate
./buddy dev
```

The frontend and API are served by Stacks. Views are STX, application actions/models live under `app/`, and migrations live under `database/migrations/`.

## Mobile UI testing

Generate both native projects, or only the platform currently under test:

```bash
./buddy build:mobile
./buddy build:ios
./buddy build:android
```

Compile the complete unsigned Release product for a physical iPhone, including
the Live Activity and Watch targets:

```bash
./buddy build:iphone
```

Build, install, and open the current shared STX app for hands-on testing:

```bash
./buddy preview:iphone
./buddy preview:iphone --bundled
bun run preview:ios
bun run preview:android
```

`buddy preview:iphone` creates a Release device build, signs it, installs it on the
single connected iPhone, and launches WildLoop. Use
`--bundled` to test the exact local frontend and its
offline behavior. The `preview:ios` command targets the iOS Simulator.

Run the same native iOS and Android journeys used in CI:

```bash
bun run test:e2e:ios
bun run test:e2e:android
```

The E2E suite validates navigation, an offline cold start, and native deep-link
routing, then saves screenshots and JUnit reports. See
[Mobile end-to-end tests](docs/mobile-e2e.md) for prerequisites and artifact
locations.

## Quality gates

```bash
bunx --bun pickier .
bun run typecheck:app
./buddy test
```

Run the scheduled maintenance worker in deployed environments:

```bash
./buddy schedule:run
```

## External integrations

Garmin OAuth, push imports, and revocations run through `ts-watches`. COROS device/file support also uses `ts-watches`; it is not advertised as a cloud OAuth integration. Apple Health export support and checksum-validated FIT decoding run through `ts-health`, while Apple Health and Health Connect live sync remain explicitly gated native bridges. Provider configuration is described in [Operations](docs/wildloop/operations.md).

## License

MIT

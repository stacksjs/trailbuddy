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

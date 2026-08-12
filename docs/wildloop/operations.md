# Operations

## Database

Apply migrations before starting the upgraded application:

```bash
./buddy migrate
```

Migrations 80-91 add activity integrity/idempotency, indexed territory bounds, atomic battle-resolution markers, privacy/block/report tables, custom routes, and their uniqueness/query indexes. They are safe to apply repeatedly through the migration runner.

## Scheduler

Run one scheduler process per deployment group:

```bash
./buddy schedule:run
```

The configured tasks use `onOneServer()` and `withoutOverlapping()`. On multi-host deployments, the current Stacks lock is host-local; deploy the scheduler on a singleton worker or replace the lock with a distributed implementation.

## Provider configuration

Garmin:

- `GARMIN_CLIENT_ID`
- `GARMIN_CLIENT_SECRET`
- `GARMIN_REDIRECT_URI`
- `GARMIN_WEBHOOK_SECRET`

The Garmin webhook secret must be sent in `X-Garmin-Signature` or
`X-Webhook-Secret`; query-string secrets are rejected so credentials do not
leak into access logs or browser history. Revocation pushes delete stored
connections immediately.

COROS is currently a `ts-watches` device/file adapter and requires no cloud
credentials. `ts-health` provides Apple Health export parsing and the FIT
runtime used by portable imports.

Native applications enable `APPLE_HEALTH_NATIVE_BRIDGE=true` or `HEALTH_CONNECT_NATIVE_BRIDGE=true` only after implementing the platform permission and consent flows. The web app reports these live-sync adapters as unavailable until enabled; export/file imports remain available independently.

Offline uploads retry in FIFO order with exponential backoff. After eight
failed attempts an item stays on-device as needing attention instead of
hammering the API indefinitely. Portable activity files are limited to 25 MB
and 100,000 track points.

## Verification

```bash
bunx --bun pickier .
bun run typecheck:app
./buddy test
```

Inspect `/health`, verify the scheduler logs, and exercise an offline record/reconnect before each production release.

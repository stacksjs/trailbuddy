# Bun-Linked Packages

Tracks local `bun link` setups across our stacks apps. Used to bypass the `"bun": "./src/*.ts"` / `"files": ["dist"]` publish bug until the affected packages are republished with `publishConfig.exports`.

## Source packages registered for linking

Each of these has been `bun link`-ed from its source repo (registers in Bun's global link store):

| Package | Source repo |
|---|---|
| `@stacksjs/rpx` | `~/Documents/Projects/rpx/packages/rpx` |
| `@stacksjs/stx` | `~/Documents/Projects/stx/packages/stx` |
| `bun-plugin-stx` | `~/Documents/Projects/stx/packages/bun-plugin` |
| `@stacksjs/bun-router` | `~/Documents/Projects/bun-router/packages/bun-router` |

Re-register if ever lost:

```sh
cd ~/Documents/Projects/rpx/packages/rpx             && bun link
cd ~/Documents/Projects/stx/packages/stx             && bun link
cd ~/Documents/Projects/stx/packages/bun-plugin      && bun link
cd ~/Documents/Projects/bun-router/packages/bun-router && bun link
```

## Apps consuming the links

### Full stacks apps (have `storage/framework/core/buddy/` workspace)

| App | Location | Links |
|---|---|---|
| trailbuddy | `~/Documents/Projects/trailbuddy` | rpx, bun-plugin-stx, bun-router, stx |
| training | `~/Documents/Projects/training` | rpx, bun-plugin-stx, bun-router, stx |
| bench-review | `~/Documents/Stacks/bench-review` | rpx, bun-plugin-stx, bun-router, stx |

Re-link all 4 packages in a full stacks app:

```sh
cd <app>
bun link @stacksjs/rpx bun-plugin-stx @stacksjs/bun-router @stacksjs/stx
```

### stx-only apps (no buddy workspace, no rpx needed)

| App | Location | Links |
|---|---|---|
| 11ly | `~/Documents/Projects/11ly` | stx |
| system-cleaner | `~/Documents/Projects/system-cleaner` | bun-plugin-stx (bun-router via `link:` spec in package.json) |
| ts-analytics | `~/Documents/Projects/ts-analytics` | stx, bun-plugin-stx, bun-router |
| ultrarunner-paw | `~/Documents/Projects/ultrarunner-paw` | stx, bun-plugin-stx |
| voide | `~/Documents/Projects/voide` | stx, bun-plugin-stx (both via `link:` spec in package.json) |

Re-link as needed:

```sh
cd <app>
bun link <pkg-name> [<pkg-name> ...]
```

## Nested workspace fix (buddy core)

**Only applies to full stacks apps** (trailbuddy, training, bench-review). Their `storage/framework/core/buddy/` workspace installs its own nested `@stacksjs/rpx` copy, which shadows the root-level link. After running `bun link` at app root, replace the nested directory with a symlink:

```sh
cd <app>
rm -rf storage/framework/core/buddy/node_modules/@stacksjs/rpx
ln -s ~/Documents/Projects/rpx/packages/rpx \
  storage/framework/core/buddy/node_modules/@stacksjs/rpx
```

If you later see `Cannot find module '@stacksjs/rpx' from .../buddy/src/commands/dev.ts`, this is the fix.

## Publish plan (removes the need for all of this)

Each of the 4 source repos has `publishConfig.exports` in its `package.json` that points the `"bun"` condition at `./dist/*.js` at publish time (while local dev still uses `./src/*.ts`). Once Chris republishes:

1. Bump version in each source repo's `package.json`
2. `npm publish` (or `bun publish`) from each source repo
3. In each consuming app, drop the `link:` specs from `package.json` (or just `bun install` — the published tarball replaces the symlink automatically)
4. Delete the manual nested symlinks in `storage/framework/core/buddy/node_modules/@stacksjs/rpx`

## Unlink cheat sheet

Unlink a single package in a consuming app (reverts to registry version):

```sh
cd <app>
bun unlink @stacksjs/rpx
bun install
```

Unlink from the global store (only if you want to stop registering a source repo):

```sh
cd <source-repo>
bun unlink
```

## Why this exists

The 4 packages ship `"files": ["dist"]` so `src/` never reaches npm consumers. But their `exports` contain `"bun": "./src/*.ts"`. Bun's resolver picks the `"bun"` condition first, tries to open a file that wasn't shipped, and throws `Cannot find module`. Linking bypasses this by making the consumer use the source repo directly (which has `src/`).

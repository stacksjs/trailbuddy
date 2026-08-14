# Mobile end-to-end tests

WildLoop uses one Maestro flow suite against deterministic bundled builds of
the shared STX application. The flows exercise the real Craft iOS and Android
hosts, WebView navigation, native deep-link delivery, permissions, and offline
cold starts. Android airplane mode is enforced by the flow; iOS verifies the
bundled cold-start path because iOS Simulator does not expose airplane mode.

## Prerequisites

- Bun 1.3 or newer
- Java 17 or newer and Maestro CLI 2.8.0
- For iOS: Xcode, XcodeGen, and an installed iPhone Simulator
- For Android: Android SDK tools and exactly one running emulator

## Run locally

To build, install, and open WildLoop for hands-on testing without running the
automation suite:

```bash
bun run preview:ios
bun run preview:android
```

The iOS command boots an available iPhone Simulator and opens the app. The
Android command installs and opens it on the single attached emulator or
device. Both use a fresh bundled build of the current STX source, so developers
never accidentally inspect the deployed website instead of their local code.

To run the automated journeys:

```bash
bun run test:e2e:ios
bun run test:e2e:android
```

The runner discovers the sibling `../../Tools/craft` checkout automatically.
Set `CRAFT_IOS_SRC` or `CRAFT_ANDROID_SRC` when Craft lives elsewhere. Use
`MOBILE_E2E_APP` with `--skip-build` when invoking the runner directly to
install an already-built `.app` or APK while retaining the same flows.

`MOBILE_E2E=1` changes only the generated test projects: they load `dist`
instead of the production URL, so the binary under test is the exact commit and
offline behavior is deterministic. JUnit reports, per-screen screenshots (including
the expected sign-in gate for protected settings), and
diagnostics are written below `storage/framework/runtime/e2e/`.

The `Mobile E2E` GitHub Actions workflow runs both platforms and uploads those
diagnostics even when a flow fails.

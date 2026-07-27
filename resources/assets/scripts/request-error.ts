/**
 * Re-export of the framework's request-error helpers for client bundles.
 *
 * The client bundler inlines relative imports and resolves `stx` itself, but a
 * bare `@stacksjs/*` specifier is dropped: the import line disappears and the
 * calls to it remain, so the page ships JavaScript that references a function
 * nothing defines. That is the same failure as the `auth is not defined` this
 * module exists to prevent, one layer down, which is exactly why the import
 * here is a path and not a package name.
 *
 * The implementation stays in the framework so every app gets it and it keeps
 * its test suite. This file only makes it reachable from a browser bundle.
 */

export {
  type ApiErrorBody,
  describeResponseError,
  describeThrownError,
  type UserFacingError,
} from '../../../storage/framework/core/browser/src/composables/request-error'

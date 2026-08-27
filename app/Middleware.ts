export interface Middleware {
  [key: string]: string
}

/**
 * The application's middleware aliases.
 *
 * Aliases may be used instead of class names to conveniently assign middleware to routes and groups.
 */
export default {
  'maintenance': 'Maintenance',
  'auth': 'Auth',
  'guest': 'Guest',
  'api': 'Api',
  'team': 'Team',
  'logger': 'Logger',
  'abilities': 'Abilities',
  'can': 'Can',
  'throttle': 'Throttle',
  'env': 'Env',
  'env:local': 'EnvLocal',
  'env:development': 'EnvDevelopment',
  'env:dev': 'EnvDevelopment',
  'env:staging': 'EnvStaging',
  'env:production': 'EnvProduction',
  'env:prod': 'EnvProduction',
  // Authorization on top of `auth`. These were missing from the app's map
  // while `role:admin` was already in use on the territory sweeps, so the
  // alias resolved only by falling through to the framework's own defaults.
  'role': 'Role',
  'permission': 'Permission',
  'verified': 'EnsureEmailIsVerified',
  // Add more middleware aliases here
  // Note: Use ! prefix for negation (e.g., '!auth', '!env:development')
} satisfies Middleware

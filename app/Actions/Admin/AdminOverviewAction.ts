// Auth is imported explicitly: it is NOT in the API server bundle's auto-imports,
// so `Auth.user()` threw "Auth.user is not a function" at runtime in production
// while type-checking clean against the declarations. Everything else here is
// auto-imported as usual.
//
// The admin dashboard's data source.
//
// Authorisation is enforced HERE, not in the page. A client-side check only
// decides what to draw; anyone can skip it by calling the endpoint directly.
// So this action resolves the caller from their session, confirms the `admin`
// role, and refuses otherwise - the page's own gate is a courtesy on top.

/** Roles allowed to see the dashboard. */
import { Auth } from '@stacksjs/auth'

const ADMIN_ROLES = ['admin']

/**
 * The signed-in user's role names.
 *
 * RBAC reads through a store the HTTP layer configures on boot. Installing it
 * lazily here keeps this action working in contexts that never ran that boot
 * (the CLI, a test harness) instead of throwing "RBAC store not configured".
 */
async function roleNamesFor(userId: number): Promise<string[]> {
  try {
    const { createBqbRbacStore, Rbac } = await import('@stacksjs/auth')
    Rbac.setStore(createBqbRbacStore())
    const roles = await Rbac.getUserRoles(userId)
    return (roles ?? []).map((role: any) => String(role?.name ?? '')).filter(Boolean)
  }
  catch {
    return []
  }
}

/** Count a table, returning 0 rather than throwing when it does not exist yet. */
async function countOf(model: any): Promise<number> {
  try {
    const rows = await model.all()
    return Array.isArray(rows) ? rows.length : 0
  }
  catch {
    return 0
  }
}

export default new Action({
  name: 'Admin Overview',
  description: 'Counts, recent accounts and their roles for the admin dashboard',
  method: 'GET',

  async handle() {
    const user = await Auth.user().catch(() => null)
    if (!user)
      return response.json({ error: 'Sign in to continue.' }, 401)

    const roles = await roleNamesFor(user.id)
    if (!roles.some(role => ADMIN_ROLES.includes(role))) {
      // Deliberately the same shape as any other refusal: an account that is
      // not an admin learns nothing about what the dashboard contains.
      return response.json({ error: 'This area is for administrators.' }, 403)
    }

    const [users, trails, activities] = await Promise.all([
      User.all().catch(() => []),
      countOf(Trail),
      countOf(Activity),
    ])

    const accounts = (Array.isArray(users) ? users : [])
      .slice()
      .sort((a: any, b: any) => Number(b?.id ?? 0) - Number(a?.id ?? 0))
      .slice(0, 25)

    // One roles lookup per listed account. The list is capped at 25, so this
    // stays a small, bounded number of queries rather than a table scan.
    const accountRoles = await Promise.all(
      accounts.map(async (account: any) => ({
        id: account.id,
        name: account.name ?? null,
        email: account.email,
        created_at: account.created_at ?? null,
        roles: await roleNamesFor(account.id),
      })),
    )

    return response.json({
      viewer: { id: user.id, email: user.email, name: user.name ?? null, roles },
      counts: {
        users: Array.isArray(users) ? users.length : 0,
        trails,
        activities,
        admins: accountRoles.filter(a => a.roles.includes('admin')).length,
      },
      accounts: accountRoles,
    })
  },
})

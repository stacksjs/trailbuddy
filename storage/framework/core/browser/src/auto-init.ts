/**
 * Auto-initialization for @stacksjs/browser
 *
 * This module automatically initializes the browser API configuration
 * when imported. It runs as a side effect to eliminate the need for
 * manual `initApi()` calls in each component.
 *
 * The framework imports this module automatically when @stacksjs/browser
 * is used, so developers can use models directly without setup.
 */

import { configureBrowser } from 'bun-query-builder'

// Flag to prevent double initialization
let isInitialized = false

/**
 * Auto-initialize the browser API configuration
 * This runs automatically when the module is imported
 */
function autoInit(): void {
  // Skip if already initialized or not in browser
  if (isInitialized) return
  if (typeof window === 'undefined') return
  if (typeof document === 'undefined') return

  // Mark as initialized early to prevent race conditions
  isInitialized = true

  // Determine API base URL
  // Priority: 1) window.__STACKS_API_URL__ (injected by framework)
  //          2) Same origin /api path
  const baseUrl = (window as any).__STACKS_API_URL__
    || `${window.location.origin}/api`

  // Configure the browser query builder
  configureBrowser({
    baseUrl,

    // Token management - reads from localStorage
    getToken: () => {
      try {
        return localStorage.getItem('token')
      } catch {
        return null
      }
    },

    // Handle unauthorized responses
    onUnauthorized: () => {
      // Get the configured redirect URL or default to /login
      const loginUrl = (window as any).__STACKS_LOGIN_URL__ || '/login'

      // Only redirect if not already on login page
      if (!window.location.pathname.startsWith(loginUrl)) {
        window.location.href = loginUrl
      }
    },

    // Transform Stacks API response format { data: ... }
    transformResponse: (data) => {
      return data?.data ?? data
    },
  })

  // Dispatch event to notify that API is ready
  window.dispatchEvent(new CustomEvent('stacks:api-ready'))

  // Log in development
  if (import.meta.env?.DEV || (window as any).__STACKS_DEBUG__) {
    console.debug('[Stacks] Browser API initialized:', baseUrl)
  }
}

// Run auto-initialization immediately
autoInit()

// Export for manual re-initialization if needed
export { autoInit, isInitialized }

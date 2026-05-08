import type { HeadwindConfig } from '@stacksjs/headwind'

const config: Partial<HeadwindConfig> = {
  theme: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      display: ['Outfit', 'system-ui', 'sans-serif'],
    },
  },

  shortcuts: {
    'card': 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5',
    'metric-label': 'text-xs uppercase tracking-wide font-medium text-gray-500 dark:text-slate-400',
    'nav-active': 'text-emerald-600 font-semibold',
    'gradient-bg': 'bg-gradient-to-r from-emerald-600 to-teal-600',
  },
}

export default config

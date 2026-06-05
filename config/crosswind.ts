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
    'trail-map-panel': 'w-full h-[22rem] sm:h-[28rem] z-[1]',
    'trail-map-panel-lg': 'w-full h-[min(55vh,520px)] z-[1]',
    'ts-map-container': 'w-full min-h-[280px]',
    'route-preview': 'h-40 w-full rounded-xl overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-700 dark:to-slate-800 bg-cover bg-center',
    'difficulty-easy': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    'difficulty-moderate': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    'difficulty-hard': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
}

export default config

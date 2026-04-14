export default {
  partialsDir: 'resources/components',
  componentsDir: 'resources/components',
  pagesDir: 'resources/views',
  layoutsDir: 'resources/layouts',

  css: './crosswind.config.ts',

  app: {
    head: {
      title: 'TrailBuddy — Discover & Track Your Trail Adventures',
      meta: [
        { name: 'description', content: 'Discover trails, track adventures, conquer territories. A Strava + AllTrails experience.' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      links: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@700;800;900&display=swap' },
      ],
      bodyClass: 'min-h-screen flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
    },
    router: {
      container: 'main',
    },
  },
}

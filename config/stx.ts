export default {
  root: '.',
  pagesDir: 'resources/views',
  componentsDir: 'resources/components',
  layoutsDir: 'resources/layouts',

  site: {
    url: 'https://wildloop.org',
  },

  partialsDir: 'resources/components',

  css: './crosswind.ts',

  app: {
    head: {
      title: 'WildLoop - Trail Discovery and GPS Tracking for Runners and Hikers',
      meta: [
        { name: 'description', content: 'Find and track trails for running and hiking, with live GPS, pace, splits, elevation, segments and a social feed. Every closed loop also claims territory.' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        // Open Graph
        { property: 'og:title', content: 'WildLoop - Trail Discovery and GPS Tracking for Runners and Hikers' },
        { property: 'og:description', content: 'Find and track trails for running and hiking, with live GPS, pace, splits, elevation, segments and a social feed. Every closed loop also claims territory.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:image', content: '/images/og_image.jpeg' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'WildLoop - Trail Discovery and GPS Tracking for Runners and Hikers' },
        { name: 'twitter:description', content: 'Find and track trails for running and hiking, with live GPS, pace, splits, elevation, segments and a social feed. Every closed loop also claims territory.' },
        { name: 'twitter:image', content: '/images/og_image.jpeg' },
      ],
      links: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&display=swap' },
      ],
      bodyClass: 'min-h-screen flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
    },
    router: {
      container: 'main',

      /*
       * Cross-fade between pages instead of swapping them.
       *
       * The client router replaces the contents of `container` in place, which
       * without a transition is an instant repaint: the old page vanishes and
       * the new one appears mid-scroll, with nothing to tell the eye the two
       * are related. That reads as a glitch rather than a navigation.
       *
       * The browser's own View Transitions API does the tweening, so there is
       * no animation library and no layout shift, and browsers without it get
       * exactly the previous behaviour.
       */
      viewTransitions: true,
      viewTransitionDuration: 180,
    },
  },
}

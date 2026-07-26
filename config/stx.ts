export default {
  // Auto-detected: root 'resources', pagesDir 'views', componentsDir 'components',
  // layoutsDir 'layouts'. Only partialsDir is overridden (defaults to 'partials').
  partialsDir: 'components',

  css: './crosswind.ts',

  app: {
    head: {
      title: 'WildLoop - Find Trails, Track Runs, Claim Ground',
      meta: [
        { name: 'description', content: 'Find and track trails for running and hiking, with live GPS, pace, splits and elevation. Every loop you close becomes territory you hold.' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        // Open Graph
        { property: 'og:title', content: 'WildLoop - Find Trails, Track Runs, Claim Ground' },
        { property: 'og:description', content: 'Find and track trails for running and hiking, with live GPS, pace, splits and elevation. Every loop you close becomes territory you hold.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:image', content: '/images/og_image.jpeg' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'WildLoop - Find Trails, Track Runs, Claim Ground' },
        { name: 'twitter:description', content: 'Find and track trails for running and hiking, with live GPS, pace, splits and elevation. Every loop you close becomes territory you hold.' },
        { name: 'twitter:image', content: '/images/og_image.jpeg' },
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

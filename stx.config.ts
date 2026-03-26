export default {
  root: 'resources',
  pagesDir: 'views',
  app: {
    head: {
      title: 'TrailBuddy',
      meta: [
        { name: 'description', content: 'Your hiking companion' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { href: 'https://fonts.googleapis.com/css2?family=Tahoma:wght@400;700&display=swap', rel: 'stylesheet' },
      ],
    },
  },
  router: {
    container: 'main',
  },
}

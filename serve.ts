import { serve } from 'bun-plugin-stx/serve'

// eslint-disable-next-line ts/no-top-level-await
await serve({
  patterns: ['resources/views'],
  port: Number(process.env.PORT) || 3000,
  componentsDir: 'resources/components',
  layoutsDir: 'resources/layouts',
  partialsDir: 'resources/components',
  quiet: false,
})

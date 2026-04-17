import { serve } from 'bun-plugin-stx/serve'

await serve({
  patterns: ['resources/views'],
  port: Number(process.env.PORT) || 3000,
  componentsDir: 'resources/components',
  layoutsDir: 'resources/layouts',
  partialsDir: 'resources/components',
  quiet: false,
})

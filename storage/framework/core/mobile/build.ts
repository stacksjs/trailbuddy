import { dts } from 'bun-plugin-dtsx'

const result = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  format: 'esm',
  target: 'browser',
  minify: true,
  plugins: [dts({ root: './src', outdir: './dist', bundle: true })],
})

if (!result.success) {
  for (const message of result.logs) console.error(message)
  throw new Error('Failed to build @stacksjs/mobile')
}

import type { AutoImportsOptions } from 'bun-plugin-auto-imports'
import { plugin } from 'bun'
import { path } from '@stacksjs/path'
import { autoImports } from 'bun-plugin-auto-imports'
import { globSync } from '@stacksjs/storage'

interface ExportInfo {
  name: string
  file: string
}

function scanExportsFromFile(filePath: string): string[] {
  const exports: string[] = []

  try {
    const content = Bun.file(filePath).text()

    // Handle async text() call properly - it returns a Promise
    if (typeof content === 'string') {
      // Match named exports: export function/const/let/var/class/type/interface name
      const namedExportRegex = /export\s+(?:async\s+)?(?:function|const|let|var|class|type|interface)\s+([a-zA-Z_$][\w$]*)/g
      let match
      while ((match = namedExportRegex.exec(content)) !== null) {
        if (match[1]) exports.push(match[1])
      }

      // Match export { name1, name2 } syntax
      const exportListRegex = /export\s+\{([^}]+)\}/g
      while ((match = exportListRegex.exec(content)) !== null) {
        if (match[1]) {
          const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim())
          exports.push(...names.filter(n => n && !n.includes('*')))
        }
      }

      // Match default export: export default name or export default function name
      const defaultExportRegex = /export\s+default\s+(?:(?:async\s+)?(?:function|class)\s+)?([a-zA-Z_$][\w$]*)/g
      while ((match = defaultExportRegex.exec(content)) !== null) {
        if (match[1]) exports.push(match[1])
      }
    }
  }
  catch (e) {
    console.warn(`Failed to scan exports from ${filePath}:`, e)
  }

  return exports
}

function scanModelExports(dir: string): ExportInfo[] {
  const files = globSync(`${dir}/**/*.ts`, { ignore: ['**/*.d.ts', '**/index.ts'] })
  const exports: ExportInfo[] = []

  for (const file of files) {
    // For model files, use the filename as the model name
    const basename = file.split('/').pop()?.replace('.ts', '') || ''
    if (basename) {
      exports.push({ name: basename, file }) // e.g., Territory from Territory.ts
      exports.push({ name: `${basename}Model`, file }) // e.g., TerritoryModel
    }
  }

  return exports
}

export function initiateImports(): void {
  const modelsPath = path.storagePath('framework/orm/src/models')
  const requestsPath = path.storagePath('framework/requests')
  const functionsPath = path.resourcesPath('functions')

  // Scan models - use filename-based naming for ORM models
  const modelExports = scanModelExports(modelsPath)
  const requestExports = scanModelExports(requestsPath)

  // Build imports array for models
  const modelImports = modelExports.map(exp => ({
    from: exp.file,
    name: exp.name,
    as: exp.name,
  }))

  const requestImports = requestExports.map(exp => ({
    from: exp.file,
    name: exp.name,
    as: exp.name,
  }))

  const options: AutoImportsOptions = {
    dts: path.storagePath('framework/types/server-auto-imports.d.ts'),
    imports: [...modelImports, ...requestImports],
    // Use dirs to auto-scan and import all exports from resources/functions
    dirs: [functionsPath],
    eslint: {
      enabled: true, // TODO: not needed in production envs
      filepath: path.storagePath('framework/server-auto-imports.json'),
    },
  }

  plugin(autoImports(options))
}

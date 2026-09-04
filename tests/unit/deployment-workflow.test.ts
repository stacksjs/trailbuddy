import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'bun:test'

const root = resolve(import.meta.dir, '../..')
const ci = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8')
const deploy = readFileSync(resolve(root, '.github/workflows/deploy.yml'), 'utf8')

describe('deployment workflow ownership', () => {
  it('deploys only after the dedicated CI workflow succeeds', () => {
    expect(ci).not.toContain('buddy deploy')
    expect(deploy).toContain('workflow_run:')
    expect(deploy).toContain('github.event.workflow_run.conclusion == \'success\'')
    expect(deploy).toContain('./buddy deploy --')
  })
})

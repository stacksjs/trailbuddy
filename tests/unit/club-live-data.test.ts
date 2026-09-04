import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'bun:test'

const stores = readFileSync(resolve(import.meta.dir, '../../resources/components/stores.stx'), 'utf8')

describe('club live-data contract', () => {
  it('does not render demo club links before API hydration', () => {
    expect(stores).toContain('clubs: [] as Club[]')
    expect(stores).not.toContain('const seedClubs')
  })

  it('accepts an empty live club list', () => {
    expect(stores).toContain(`hydrateClubs(list: Club[]) {
        this.clubs = list
      }`)
  })
})

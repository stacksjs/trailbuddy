import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const userSeeder = readFileSync(resolve(import.meta.dir, '../../database/seeders/UserSeeder.ts'), 'utf-8')
const roleSeeder = readFileSync(resolve(import.meta.dir, '../../database/seeders/AdminSeeder.ts'), 'utf-8')
const cloud = readFileSync(resolve(import.meta.dir, '../../config/cloud.ts'), 'utf-8')

describe('deployed test accounts', () => {
  it('seeds the requested admin, normal, and paid identities', () => {
    expect(roleSeeder).toContain("'admin@wildloop.test'")
    expect(userSeeder).toContain("'user@wildloop.test'")
    expect(userSeeder).toContain("'paid@wildloop.test'")
  })

  it('assigns normal and paid access independently', () => {
    expect(roleSeeder).toContain("{ email: NORMAL_EMAIL, roles: ['client'] }")
    expect(roleSeeder).toContain("{ email: PAID_EMAIL, roles: ['client', 'paid'] }")
  })

  it('runs idempotent application seeders after production migrations', () => {
    const accountSeed = "'./buddy seed --skip-models --only-seeders UserSeeder,AdminSeeder --verbose'"

    expect(cloud.indexOf("'./buddy migrate --no-generate'")).toBeLessThan(cloud.indexOf(accountSeed))
    expect(cloud).toContain(accountSeed)
  })
})

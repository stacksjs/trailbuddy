import { afterEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'

let database: Database | null = null

afterEach(() => {
  database?.close()
  database = null
})

describe('game integrity schema', () => {
  it('deduplicates activity upload ids per athlete', async () => {
    database = new Database(':memory:')
    database.exec('CREATE TABLE activities (id INTEGER PRIMARY KEY, user_id INTEGER)')
    database.exec(await Bun.file('database/migrations/0000000080-add-activity-integrity.sql').text())
    const insert = database.prepare('INSERT INTO activities (user_id, upload_id) VALUES (?, ?)')
    insert.run(1, 'run:one')
    expect(() => insert.run(1, 'run:one')).toThrow()
    expect(() => insert.run(2, 'run:one')).not.toThrow()
  })

  it('allows one resolution for an activity and territory pair', async () => {
    database = new Database(':memory:')
    database.exec('PRAGMA foreign_keys = ON; CREATE TABLE activities (id INTEGER PRIMARY KEY); CREATE TABLE territories (id INTEGER PRIMARY KEY);')
    database.exec(await Bun.file('database/migrations/0000000084-create-territory-activity-resolutions.sql').text())
    database.exec('INSERT INTO activities (id) VALUES (1); INSERT INTO territories (id) VALUES (2);')
    const insert = database.prepare("INSERT INTO territory_activity_resolutions (activity_id, territory_id, outcome) VALUES (1, 2, 'split')")
    insert.run()
    expect(() => insert.run()).toThrow()
  })
})

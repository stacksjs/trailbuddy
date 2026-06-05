import { factory, Seeder } from '@stacksjs/database'
import TerritoryHistory from '../../app/Models/TerritoryHistory'

export default class TerritoryHistorySeeder extends Seeder {
  async run(): Promise<void> {
    await factory.generate(TerritoryHistory, { count: 100 })
  }
}

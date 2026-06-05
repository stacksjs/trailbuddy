import { factory, Seeder } from '@stacksjs/database'
import TerritoryStats from '../../app/Models/TerritoryStats'

export default class TerritoryStatsSeeder extends Seeder {
  async run(): Promise<void> {
    await factory.generate(TerritoryStats, { count: 20 })
  }
}

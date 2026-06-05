import { factory, Seeder } from '@stacksjs/database'
import Territory from '../../app/Models/Territory'

export default class TerritorySeeder extends Seeder {
  async run(): Promise<void> {
    await factory.generate(Territory, { count: 30 })
  }
}

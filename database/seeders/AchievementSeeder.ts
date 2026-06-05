import { factory, Seeder } from '@stacksjs/database'
import Achievement from '../../app/Models/Achievement'

export default class AchievementSeeder extends Seeder {
  async run(): Promise<void> {
    await factory.generate(Achievement, { count: 15 })
  }
}

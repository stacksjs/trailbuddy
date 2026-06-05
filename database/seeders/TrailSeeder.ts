import { factory, Seeder } from '@stacksjs/database'
import Trail from '../../app/Models/Trail'

export default class TrailSeeder extends Seeder {
  async run(): Promise<void> {
    await factory.generate(Trail, { count: 20 })
  }
}

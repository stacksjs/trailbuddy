import { factory, Seeder } from '@stacksjs/database'
import Activity from '../../app/Models/Activity'

export default class ActivitySeeder extends Seeder {
  async run(): Promise<void> {
    await factory.generate(Activity, { count: 50 })
  }
}

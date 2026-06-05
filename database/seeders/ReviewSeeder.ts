import { factory, Seeder } from '@stacksjs/database'
import Review from '../../app/Models/Review'

export default class ReviewSeeder extends Seeder {
  async run(): Promise<void> {
    await factory.generate(Review, { count: 100 })
  }
}

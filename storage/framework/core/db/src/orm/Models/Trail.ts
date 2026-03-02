import { db2 } from '../../db'

class TrailModel {
  private readonly hidden: string[] = []
  private readonly fillable: string[] = [
    'name',
    'location',
    'distance',
    'elevation',
    'difficulty',
    'rating',
    'reviewCount',
    'estimatedTime',
    'image',
    'tags',
    'latitude',
    'longitude',
    'description',
    'uuid',
  ]

  private readonly guarded: string[] = []
  protected attributes: Record<string, any> = {}
  private query: any

  constructor(data?: Record<string, any>) {
    if (data) {
      this.attributes = { ...data }
    }
    this.query = db2.selectFrom('trails')
  }

  get id(): number | undefined {
    return this.attributes.id
  }

  get name(): string | undefined {
    return this.attributes.name
  }

  get location(): string | undefined {
    return this.attributes.location
  }

  get distance(): number | undefined {
    return this.attributes.distance
  }

  get elevation(): number | undefined {
    return this.attributes.elevation
  }

  get difficulty(): string | undefined {
    return this.attributes.difficulty
  }

  get rating(): number | undefined {
    return this.attributes.rating
  }

  get reviewCount(): number | undefined {
    return this.attributes.review_count
  }

  get estimatedTime(): string | undefined {
    return this.attributes.estimated_time
  }

  get image(): string | undefined {
    return this.attributes.image
  }

  get tags(): string | undefined {
    return this.attributes.tags
  }

  get latitude(): number | undefined {
    return this.attributes.latitude
  }

  get longitude(): number | undefined {
    return this.attributes.longitude
  }

  get description(): string | undefined {
    return this.attributes.description
  }

  get createdAt(): string | undefined {
    return this.attributes.created_at
  }

  get updatedAt(): string | undefined {
    return this.attributes.updated_at
  }

  static query() {
    return new TrailModel()
  }

  static where(column: string, operator: any, value?: any) {
    const instance = new TrailModel()
    return instance.where(column, operator, value)
  }

  static async find(id: number) {
    const result = await db2.selectFrom('trails').where('id', '=', id).executeTakeFirst()
    return result ? new TrailModel(result) : undefined
  }

  static async all() {
    const results = await db2.selectFrom('trails').execute()
    return results.map((result: any) => new TrailModel(result))
  }

  async first() {
    const result = await this.query.executeTakeFirst()
    return result ? new TrailModel(result) : undefined
  }

  async get() {
    const results = await this.query.execute()
    return results.map((result: any) => new TrailModel(result))
  }

  where(column: string, operator: any, value?: any) {
    if (value === undefined) {
      this.query = this.query.where(column, '=', operator)
    }
    else {
      this.query = this.query.where(column, operator, value)
    }
    return this
  }

  select(...columns: string[]) {
    this.query = this.query.select(columns as any)
    return this
  }

  orderBy(column: string, direction: 'asc' | 'desc' = 'asc') {
    this.query = this.query.orderBy(column, direction)
    return this
  }

  limit(count: number) {
    this.query = this.query.limit(count)
    return this
  }

  static async create(data: Record<string, any>) {
    const instance = new TrailModel()

    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([key]) =>
        !instance.guarded.includes(key) && instance.fillable.includes(key),
      ),
    )

    const result = await db2.insertInto('trails')
      .values(filteredData)
      .execute()

    const created = await db2.selectFrom('trails')
      .where('id', '=', Number((result as any).insertId))
      .executeTakeFirst()

    return created ? new TrailModel(created) : undefined
  }

  async update(data: Record<string, any>) {
    if (!this.attributes.id) {
      throw new Error('Cannot update a model without an ID')
    }

    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([key]) =>
        !this.guarded.includes(key) && this.fillable.includes(key),
      ),
    )

    await (db2 as any).updateTable('trails')
      .set(filteredData)
      .where('id', '=', this.attributes.id)
      .execute()

    const updated = await db2.selectFrom('trails')
      .where('id', '=', this.attributes.id)
      .executeTakeFirst()

    if (updated) {
      this.attributes = { ...updated }
    }

    return this
  }

  async delete() {
    if (!this.attributes.id) {
      throw new Error('Cannot delete a model without an ID')
    }

    await (db2 as any).deleteFrom('trails')
      .where('id', '=', this.attributes.id)
      .execute()

    return true
  }

  toJSON() {
    const json = { ...this.attributes }

    for (const field of this.hidden) {
      delete json[field]
    }

    return json
  }
}

export default TrailModel

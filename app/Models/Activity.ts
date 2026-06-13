import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

const activityTypes = ['Trail Run', 'Hike', 'Walk', 'Bike'] as const

export default defineModel({
  name: 'Activity',
  table: 'activities',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSearch: {
      displayable: ['id', 'userId', 'trailId', 'activityType', 'distance', 'duration'],
      searchable: ['activityType'],
      sortable: ['createdAt', 'distance', 'duration'],
      filterable: ['activityType', 'userId', 'trailId'],
    },
    useApi: {
      uri: 'activities',
      routes: ['index', 'store', 'show', 'update', 'destroy'],
    },
  },

  belongsTo: ['User', 'Trail'],

  attributes: {
    user_id: {
      order: 0,
      fillable: true,
      validation: {
        rule: schema.number(),
      },
    },

    trail_id: {
      order: 0,
      fillable: true,
      validation: {
        rule: schema.number(),
      },
    },

    activity_type: {
      order: 1,
      fillable: true,
      validation: {
        rule: schema.enum(activityTypes).required(),
        message: {
          required: 'Activity type is required',
        },
      },
      factory: (faker): typeof activityTypes[number] => faker.helpers.arrayElement([...activityTypes]),
    },

    distance: {
      order: 2,
      fillable: true,
      validation: {
        rule: schema.float().required().min(0),
        message: {
          required: 'Distance is required',
        },
      },
      factory: (faker) => faker.number.float({ min: 1, max: 20, fractionDigits: 1 }),
    },

    duration: {
      order: 3,
      fillable: true,
      validation: {
        rule: schema.string().required(),
        message: {
          required: 'Duration is required',
        },
      },
      factory: (faker) => {
        const hours = faker.number.int({ min: 0, max: 4 })
        const mins = faker.number.int({ min: 0, max: 59 })
        const secs = faker.number.int({ min: 0, max: 59 })
        return hours > 0 ? `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` : `${mins}:${secs.toString().padStart(2, '0')}`
      },
    },

    // Time actually moving (elapsed minus paused intervals, #960). `duration`
    // above is wall-clock elapsed; pace derives from moving time.
    moving_time: {
      order: 4,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.string(),
      },
      factory: () => null,
    },

    pace: {
      order: 4,
      fillable: true,
      validation: {
        rule: schema.string(),
      },
      factory: (faker) => {
        const mins = faker.number.int({ min: 6, max: 20 })
        const secs = faker.number.int({ min: 0, max: 59 })
        return `${mins}:${secs.toString().padStart(2, '0')}`
      },
    },

    elevation: {
      order: 5,
      fillable: true,
      validation: {
        rule: schema.float().min(0),
      },
      factory: (faker) => faker.number.int({ min: 100, max: 3000 }),
    },

    kudos_count: {
      order: 6,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.int({ min: 0, max: 100 }),
    },

    notes: {
      order: 7,
      fillable: true,
      validation: {
        rule: schema.string(),
      },
      factory: (faker) => faker.lorem.sentence(),
    },

    gpx_data: {
      order: 8,
      fillable: true,
      validation: {
        rule: schema.string(),
      },
      factory: () => null,
    },

    // Per-mile splits computed from the GPS samples (#952), stored as a JSON
    // array of { mile, pace, elev }.
    splits: {
      order: 8,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.string(),
      },
      factory: () => null,
    },

    completed_at: {
      order: 9,
      fillable: true,
      validation: {
        rule: schema.string(),
      },
      factory: (faker) => faker.date.recent({ days: 30 }).toISOString(),
    },
  },

  dashboard: {
    highlight: true,
  },
})

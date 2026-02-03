import type { Model } from '@stacksjs/types'
import { schema } from '@stacksjs/validation'

export default {
  name: 'Achievement',
  table: 'achievements',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSearch: {
      displayable: ['id', 'name', 'description', 'icon', 'category'],
      searchable: ['name', 'description', 'category'],
      sortable: ['createdAt', 'name'],
      filterable: ['category'],
    },
    useSeeder: {
      count: 15,
    },
    useApi: {
      uri: 'achievements',
      routes: ['index', 'store', 'show', 'update', 'destroy'],
    },
  },

  hasMany: ['UserAchievement'],

  attributes: {
    name: {
      order: 1,
      fillable: true,
      validation: {
        rule: schema.string().required().min(2).max(100),
        message: {
          required: 'Achievement name is required',
        },
      },
      factory: (faker) => faker.helpers.arrayElement([
        'Early Bird',
        'Summit Seeker',
        'Century Club',
        'Trail Blazer',
        'Night Owl',
        'Mountain Goat',
        'Speed Demon',
        'Explorer',
        'Weekend Warrior',
        'Social Butterfly',
      ]),
    },

    description: {
      order: 2,
      fillable: true,
      validation: {
        rule: schema.string().required().max(500),
        message: {
          required: 'Description is required',
        },
      },
      factory: (faker) => faker.lorem.sentence(),
    },

    icon: {
      order: 3,
      fillable: true,
      validation: {
        rule: schema.string().required(),
        message: {
          required: 'Icon is required',
        },
      },
      factory: (faker) => faker.helpers.arrayElement(['🌅', '🏔️', '💯', '🔥', '🌙', '🐐', '⚡', '🧭', '💪', '🦋']),
    },

    category: {
      order: 4,
      fillable: true,
      validation: {
        rule: schema.string().required(),
        message: {
          required: 'Category is required',
        },
      },
      factory: (faker) => faker.helpers.arrayElement(['distance', 'elevation', 'streak', 'social', 'exploration', 'speed']),
    },

    targetValue: {
      order: 5,
      fillable: true,
      validation: {
        rule: schema.number().required().min(1),
        message: {
          required: 'Target value is required',
        },
      },
      factory: (faker) => faker.helpers.arrayElement([10, 25, 50, 100, 30, 7, 14]),
    },

    targetUnit: {
      order: 6,
      fillable: true,
      validation: {
        rule: schema.string().required(),
      },
      factory: (faker) => faker.helpers.arrayElement(['trails', 'miles', 'feet', 'days', 'kudos', 'hours']),
    },

    points: {
      order: 7,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.helpers.arrayElement([50, 100, 200, 500, 1000]),
    },

    badgeColor: {
      order: 8,
      fillable: true,
      validation: {
        rule: schema.string(),
      },
      factory: (faker) => faker.helpers.arrayElement(['gold', 'silver', 'bronze', 'emerald', 'ruby']),
    },
  },

  dashboard: {
    highlight: true,
  },
} satisfies Model

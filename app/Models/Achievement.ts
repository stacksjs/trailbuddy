import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

const categories = ['distance', 'elevation', 'streak', 'social', 'exploration', 'speed'] as const
const targetUnits = ['trails', 'miles', 'feet', 'days', 'kudos', 'hours', 'activities', 'territories'] as const
const badgeColors = ['gold', 'silver', 'bronze', 'emerald', 'ruby'] as const

// What the unlock engine measures (#982) - each key maps to a computable
// stat in EvaluateAchievementsAction.
const metrics = [
  'activities', // total activities logged
  'distinct_trails', // different trails completed
  'total_miles', // lifetime distance
  'total_elevation', // lifetime climbing (ft)
  'territories_conquered',
  'territories_defended',
  'territories_owned', // currently held
  'kudos_given',
  'streak_days', // longest consecutive-day activity streak
  'fast_mile', // any recorded sub-7:00 mile split
] as const

export default defineModel({
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
        rule: schema.enum(categories).required(),
        message: {
          required: 'Category is required',
        },
      },
      factory: (faker): typeof categories[number] => faker.helpers.arrayElement([...categories]),
    },

    metric: {
      order: 5,
      fillable: true,
      validation: {
        rule: schema.enum(metrics).required(),
        message: {
          required: 'Metric is required',
        },
      },
      factory: (): typeof metrics[number] => 'activities',
    },

    target_value: {
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

    target_unit: {
      order: 6,
      fillable: true,
      validation: {
        rule: schema.enum(targetUnits).required(),
      },
      factory: (faker): typeof targetUnits[number] => faker.helpers.arrayElement([...targetUnits]),
    },

    points: {
      order: 7,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.helpers.arrayElement([50, 100, 200, 500, 1000]),
    },

    badge_color: {
      order: 8,
      fillable: true,
      validation: {
        rule: schema.enum(badgeColors),
      },
      factory: (faker): typeof badgeColors[number] => faker.helpers.arrayElement([...badgeColors]),
    },
  },

  dashboard: {
    highlight: true,
  },
})

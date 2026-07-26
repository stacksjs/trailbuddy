import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

// A club is a community athletes can join (#964). The ORM is snake_case, so
// attribute KEYS are column names; the creator FK is a plain fillable attr
// (no belongsTo - that would emit an inline FK that breaks the SQLite
// migrate:fresh ordering). Membership lives in the ClubMember join table.

const clubTypes = ['Running', 'Hiking', 'Mixed', 'Territory Game'] as const

export default defineModel({
  name: 'Club',
  table: 'clubs',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSearch: {
      displayable: ['id', 'name', 'location', 'clubType'],
      searchable: ['name', 'description', 'location'],
      sortable: ['createdAt', 'name'],
      filterable: ['clubType', 'isPrivate'],
    },
    useApi: {
      uri: 'clubs',
      routes: ['index', 'show', 'store', 'destroy'],
    },
  },

  attributes: {
    creator_id: {
      order: 0,
      fillable: true,
      validation: {
        rule: schema.number().required(),
        message: { required: 'Creator ID is required' },
      },
    },

    name: {
      order: 1,
      fillable: true,
      validation: {
        rule: schema.string().required().min(2).max(100),
        message: { required: 'Club name is required' },
      },
      factory: faker => `${faker.word.adjective()} ${faker.helpers.arrayElement(['Trail', 'Summit', 'Ridge'])} Club`,
    },

    description: {
      order: 2,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.string().max(500),
      },
      factory: faker => faker.lorem.sentence(),
    },

    location: {
      order: 3,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.string().max(120),
      },
      factory: faker => `${faker.location.city()}, ${faker.location.state({ abbreviated: true })}`,
    },

    club_type: {
      order: 4,
      fillable: true,
      validation: {
        rule: schema.enum(clubTypes).required(),
      },
      factory: (faker): typeof clubTypes[number] => faker.helpers.arrayElement([...clubTypes]),
    },

    is_private: {
      order: 5,
      fillable: true,
      validation: {
        rule: schema.boolean(),
      },
      factory: faker => faker.datatype.boolean(),
    },
  },

  dashboard: {
    highlight: true,
  },
})

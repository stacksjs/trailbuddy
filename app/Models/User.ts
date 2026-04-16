import type { Attributes } from '@stacksjs/types'
import { defineModel } from '@stacksjs/orm'
import { makeHash } from '@stacksjs/security'
import { schema } from '@stacksjs/validation'

export default defineModel({
  name: 'User',
  table: 'users',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useAuth: true,
    useTimestamps: true,
    useApi: {
      uri: 'users',
      routes: ['index', 'show'],
    },
  },

  hasMany: ['PersonalAccessToken'],

  attributes: {
    name: {
      fillable: true,
      validation: {
        rule: schema.string().required().min(2).max(100),
        message: {
          min: 'Name must have at least 2 characters',
          required: 'Name is required',
        },
      },
    },

    email: {
      unique: true,
      fillable: true,
      validation: {
        rule: schema.string().email().required(),
        message: {
          required: 'Email is required',
          email: 'Email must be a valid email address',
        },
      },
    },

    password: {
      hidden: true,
      fillable: true,
      validation: {
        rule: schema.string().required().min(6).max(255),
        message: {
          required: 'Password is required',
          min: 'Password must have at least 6 characters',
        },
      },
    },
  },

  set: {
    password: async (attributes: Attributes) => {
      return await makeHash(attributes.password, { algorithm: 'bcrypt' })
    },
  },
} as const)

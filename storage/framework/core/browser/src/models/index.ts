/**
 * Browser Models for TrailBuddy
 *
 * These models mirror the backend models and provide full type inference
 * for API calls from the frontend. Each model uses the same enum values
 * as the backend to ensure type consistency.
 */

import { createBrowserModel } from 'bun-query-builder'

// ============================================================================
// Enum Definitions (must match backend models)
// ============================================================================

export const difficulties = ['easy', 'moderate', 'hard'] as const
export const activityTypes = ['Trail Run', 'Hike', 'Walk', 'Bike'] as const
export const conditions = ['excellent', 'good', 'fair', 'poor', 'muddy', 'icy'] as const
export const territoryStatuses = ['active', 'contested'] as const
export const territoryEventTypes = ['claimed', 'conquered', 'split', 'defended'] as const
export const achievementCategories = ['distance', 'elevation', 'streak', 'social', 'exploration', 'speed'] as const
export const badgeColors = ['gold', 'silver', 'bronze', 'emerald', 'ruby'] as const
export const targetUnits = ['trails', 'miles', 'feet', 'days', 'kudos', 'hours'] as const
export const roles = ['user', 'admin', 'moderator'] as const

// ============================================================================
// Trail Model
// ============================================================================

export const Trail = createBrowserModel({
  name: 'Trail',
  table: 'trails',
  traits: {
    useTimestamps: true,
    useUuid: true,
    useApi: { uri: 'trails' },
  },
  attributes: {
    name: {
      fillable: true,
      factory: () => 'Sample Trail',
    },
    location: {
      fillable: true,
      factory: () => 'Sample Location, CA',
    },
    distance: {
      fillable: true,
      factory: () => 5.0,
    },
    elevation: {
      fillable: true,
      factory: () => 500,
    },
    difficulty: {
      fillable: true,
      factory: (): typeof difficulties[number] => 'moderate',
    },
    rating: {
      fillable: true,
      factory: () => 4.5,
    },
    reviewCount: {
      fillable: true,
      factory: () => 100,
    },
    estimatedTime: {
      fillable: true,
      factory: () => '2h 30m',
    },
    image: {
      fillable: true,
      factory: () => '',
    },
    tags: {
      fillable: true,
      factory: () => '',
    },
    latitude: {
      fillable: true,
      factory: () => 37.7749,
    },
    longitude: {
      fillable: true,
      factory: () => -122.4194,
    },
    description: {
      fillable: true,
      factory: () => '',
    },
  },
} as const)

// ============================================================================
// Activity Model
// ============================================================================

export const Activity = createBrowserModel({
  name: 'Activity',
  table: 'activities',
  traits: {
    useTimestamps: true,
    useUuid: true,
    useApi: { uri: 'activities' },
  },
  attributes: {
    activityType: {
      fillable: true,
      factory: (): typeof activityTypes[number] => 'Trail Run',
    },
    distance: {
      fillable: true,
      factory: () => 5.0,
    },
    duration: {
      fillable: true,
      factory: () => 3600,
    },
    pace: {
      fillable: true,
      factory: () => '8:00',
    },
    elevation: {
      fillable: true,
      factory: () => 500,
    },
    kudosCount: {
      fillable: true,
      factory: () => 0,
    },
    notes: {
      fillable: true,
      factory: () => '',
    },
    gpxData: {
      fillable: true,
      factory: () => '',
    },
    completedAt: {
      fillable: true,
      factory: () => new Date().toISOString(),
    },
  },
} as const)

// ============================================================================
// Review Model
// ============================================================================

export const Review = createBrowserModel({
  name: 'Review',
  table: 'trail_reviews',
  traits: {
    useTimestamps: true,
    useUuid: true,
    useApi: { uri: 'trail-reviews' },
  },
  attributes: {
    rating: {
      fillable: true,
      factory: () => 5,
    },
    title: {
      fillable: true,
      factory: () => '',
    },
    content: {
      fillable: true,
      factory: () => '',
    },
    visitDate: {
      fillable: true,
      factory: () => '',
    },
    conditions: {
      fillable: true,
      factory: (): typeof conditions[number] => 'excellent',
    },
    helpfulCount: {
      fillable: true,
      factory: () => 0,
    },
    photos: {
      fillable: true,
      factory: () => '',
    },
  },
} as const)

// ============================================================================
// Territory Model
// ============================================================================

export const Territory = createBrowserModel({
  name: 'Territory',
  table: 'territories',
  traits: {
    useTimestamps: true,
    useUuid: true,
    useApi: { uri: 'territories' },
  },
  attributes: {
    parentTerritoryId: {
      fillable: true,
      factory: () => null as number | null,
    },
    name: {
      fillable: true,
      factory: () => '',
    },
    polygonData: {
      fillable: true,
      factory: () => '',
    },
    boundingBox: {
      fillable: true,
      factory: () => '',
    },
    centerLat: {
      fillable: true,
      factory: () => 0,
    },
    centerLng: {
      fillable: true,
      factory: () => 0,
    },
    areaSize: {
      fillable: true,
      factory: () => 0,
    },
    perimeter: {
      fillable: true,
      factory: () => 0,
    },
    status: {
      fillable: true,
      factory: (): typeof territoryStatuses[number] => 'active',
    },
    conquestCount: {
      fillable: true,
      factory: () => 0,
    },
    claimedAt: {
      fillable: true,
      factory: () => new Date().toISOString(),
    },
  },
} as const)

// ============================================================================
// TerritoryHistory Model
// ============================================================================

export const TerritoryHistory = createBrowserModel({
  name: 'TerritoryHistory',
  table: 'territory_histories',
  traits: {
    useTimestamps: true,
    useUuid: true,
    useApi: { uri: 'territory-histories' },
  },
  attributes: {
    previousOwnerId: {
      fillable: true,
      factory: () => null as number | null,
    },
    eventType: {
      fillable: true,
      factory: (): typeof territoryEventTypes[number] => 'claimed',
    },
    areaAtEvent: {
      fillable: true,
      factory: () => 0,
    },
    previousOwnershipDuration: {
      fillable: true,
      factory: () => 0,
    },
    notes: {
      fillable: true,
      factory: () => '',
    },
    newTerritoryId: {
      fillable: true,
      factory: () => null as number | null,
    },
  },
} as const)

// ============================================================================
// TerritoryStats Model
// ============================================================================

export const TerritoryStats = createBrowserModel({
  name: 'TerritoryStats',
  table: 'territory_stats',
  traits: {
    useTimestamps: true,
    useUuid: true,
    useApi: { uri: 'territory-stats' },
  },
  attributes: {
    totalTerritoriesOwned: {
      fillable: true,
      factory: () => 0,
    },
    totalAreaOwned: {
      fillable: true,
      factory: () => 0,
    },
    territoriesClaimed: {
      fillable: true,
      factory: () => 0,
    },
    territoriesConquered: {
      fillable: true,
      factory: () => 0,
    },
    territoriesLost: {
      fillable: true,
      factory: () => 0,
    },
    territoriesDefended: {
      fillable: true,
      factory: () => 0,
    },
    longestOwnershipDays: {
      fillable: true,
      factory: () => 0,
    },
    largestTerritoryArea: {
      fillable: true,
      factory: () => 0,
    },
    weeklyRank: {
      fillable: true,
      factory: () => 0,
    },
    allTimeRank: {
      fillable: true,
      factory: () => 0,
    },
  },
} as const)

// ============================================================================
// UserStats Model
// ============================================================================

export const UserStats = createBrowserModel({
  name: 'UserStats',
  table: 'user_stats',
  traits: {
    useTimestamps: true,
    useUuid: true,
    useApi: { uri: 'user-stats' },
  },
  attributes: {
    totalDistance: {
      fillable: true,
      factory: () => 0,
    },
    totalTime: {
      fillable: true,
      factory: () => 0,
    },
    totalElevation: {
      fillable: true,
      factory: () => 0,
    },
    trailsCompleted: {
      fillable: true,
      factory: () => 0,
    },
    currentStreak: {
      fillable: true,
      factory: () => 0,
    },
    longestStreak: {
      fillable: true,
      factory: () => 0,
    },
    weeklyRank: {
      fillable: true,
      factory: () => 0,
    },
    totalActivities: {
      fillable: true,
      factory: () => 0,
    },
    totalKudosReceived: {
      fillable: true,
      factory: () => 0,
    },
    totalKudosGiven: {
      fillable: true,
      factory: () => 0,
    },
  },
} as const)

// ============================================================================
// Achievement Model
// ============================================================================

export const Achievement = createBrowserModel({
  name: 'Achievement',
  table: 'achievements',
  traits: {
    useTimestamps: true,
    useUuid: true,
    useApi: { uri: 'achievements' },
  },
  attributes: {
    name: {
      fillable: true,
      factory: () => '',
    },
    description: {
      fillable: true,
      factory: () => '',
    },
    icon: {
      fillable: true,
      factory: () => '',
    },
    category: {
      fillable: true,
      factory: (): typeof achievementCategories[number] => 'distance',
    },
    targetValue: {
      fillable: true,
      factory: () => 0,
    },
    targetUnit: {
      fillable: true,
      factory: (): typeof targetUnits[number] => 'miles',
    },
    points: {
      fillable: true,
      factory: () => 0,
    },
    badgeColor: {
      fillable: true,
      factory: (): typeof badgeColors[number] => 'bronze',
    },
  },
} as const)

// ============================================================================
// UserAchievement Model
// ============================================================================

export const UserAchievement = createBrowserModel({
  name: 'UserAchievement',
  table: 'user_achievements',
  traits: {
    useTimestamps: true,
    useUuid: true,
    useApi: { uri: 'user-achievements' },
  },
  attributes: {
    progress: {
      fillable: true,
      factory: () => 0,
    },
    completedAt: {
      fillable: true,
      factory: () => null as string | null,
    },
    isComplete: {
      fillable: true,
      factory: () => false,
    },
  },
} as const)

// ============================================================================
// Kudos Model
// ============================================================================

export const Kudos = createBrowserModel({
  name: 'Kudos',
  table: 'kudos',
  traits: {
    useTimestamps: true,
    useUuid: true,
    useApi: { uri: 'kudos' },
  },
  attributes: {
    giverId: {
      fillable: true,
      factory: () => 0,
    },
  },
} as const)

// ============================================================================
// SavedTrail Model
// ============================================================================

export const SavedTrail = createBrowserModel({
  name: 'SavedTrail',
  table: 'saved_trails',
  traits: {
    useTimestamps: true,
    useUuid: true,
    useApi: { uri: 'saved-trails' },
  },
  attributes: {
    notes: {
      fillable: true,
      factory: () => '',
    },
    wantToVisit: {
      fillable: true,
      factory: () => true,
    },
    hasVisited: {
      fillable: true,
      factory: () => false,
    },
  },
} as const)

// ============================================================================
// User Model (for reference, typically from auth)
// ============================================================================

export const User = createBrowserModel({
  name: 'User',
  table: 'users',
  traits: {
    useTimestamps: true,
    useUuid: true,
    useApi: { uri: 'users' },
  },
  attributes: {
    name: {
      fillable: true,
      factory: () => '',
    },
    email: {
      fillable: true,
      factory: () => '',
    },
    password: {
      fillable: true,
      hidden: true,
      factory: () => '',
    },
    avatar: {
      fillable: true,
      factory: () => '',
    },
    bio: {
      fillable: true,
      factory: () => '',
    },
    location: {
      fillable: true,
      factory: () => '',
    },
    active: {
      fillable: true,
      factory: () => true,
    },
    role: {
      fillable: true,
      factory: (): typeof roles[number] => 'user',
    },
  },
} as const)

// ============================================================================
// Type Exports
// ============================================================================

export type TrailModel = typeof Trail
export type ActivityModel = typeof Activity
export type ReviewModel = typeof Review
export type TerritoryModel = typeof Territory
export type TerritoryHistoryModel = typeof TerritoryHistory
export type TerritoryStatsModel = typeof TerritoryStats
export type UserStatsModel = typeof UserStats
export type AchievementModel = typeof Achievement
export type UserAchievementModel = typeof UserAchievement
export type KudosModel = typeof Kudos
export type SavedTrailModel = typeof SavedTrail
export type UserModel = typeof User

// Difficulty, ActivityType, etc. types for convenience
export type Difficulty = typeof difficulties[number]
export type ActivityType = typeof activityTypes[number]
export type Condition = typeof conditions[number]
export type TerritoryStatus = typeof territoryStatuses[number]
export type TerritoryEventType = typeof territoryEventTypes[number]
export type AchievementCategory = typeof achievementCategories[number]
export type BadgeColor = typeof badgeColors[number]
export type TargetUnit = typeof targetUnits[number]
export type Role = typeof roles[number]

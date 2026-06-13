CREATE TABLE IF NOT EXISTS "achievements" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT,
  "description" TEXT,
  "icon" TEXT,
  "category" TEXT CHECK ("category" IN ('distance', 'elevation', 'streak', 'social', 'exploration', 'speed')),
  "metric" TEXT CHECK ("metric" IN ('activities', 'distinct_trails', 'total_miles', 'total_elevation', 'territories_conquered', 'territories_defended', 'territories_owned', 'kudos_given', 'streak_days', 'fast_mile')),
  "target_value" INTEGER,
  "target_unit" TEXT CHECK ("target_unit" IN ('trails', 'miles', 'feet', 'days', 'kudos', 'hours', 'activities', 'territories')),
  "points" INTEGER,
  "badge_color" TEXT CHECK ("badge_color" IN ('gold', 'silver', 'bronze', 'emerald', 'ruby')),
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
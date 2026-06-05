CREATE TABLE IF NOT EXISTS "achievements" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT,
  "description" TEXT,
  "icon" TEXT,
  "category" TEXT CHECK ("category" IN ('distance', 'elevation', 'streak', 'social', 'exploration', 'speed')),
  "target_value" INTEGER,
  "target_unit" TEXT CHECK ("target_unit" IN ('trails', 'miles', 'feet', 'days', 'kudos', 'hours')),
  "points" INTEGER,
  "badge_color" TEXT CHECK ("badge_color" IN ('gold', 'silver', 'bronze', 'emerald', 'ruby')),
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
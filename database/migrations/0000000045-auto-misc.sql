PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_activity_comments" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER not null REFERENCES "users"("id"),
  "activity_id" INTEGER not null REFERENCES "activities"("id"),
  "body" TEXT not null,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
INSERT INTO "_qb_tmp_activity_comments" ("id", "user_id", "activity_id", "body", "created_at", "updated_at", "uuid") SELECT "id", "user_id", "activity_id", "body", "created_at", "updated_at", "uuid" FROM "activity_comments";
DROP TABLE "activity_comments";
ALTER TABLE "_qb_tmp_activity_comments" RENAME TO "activity_comments";
CREATE UNIQUE INDEX IF NOT EXISTS "activity_comments_activity_comments_uuid_unique" ON "activity_comments" ("uuid");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_challenges" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "challenger_id" INTEGER not null,
  "challenged_id" INTEGER not null,
  "territory_id" INTEGER not null REFERENCES "territories"("id"),
  "area_at_stake" REAL,
  "status" TEXT CHECK ("status" IN ('pending', 'active', 'completed', 'declined')) not null,
  "winner_id" INTEGER,
  "deadline" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
INSERT INTO "_qb_tmp_challenges" ("id", "challenger_id", "challenged_id", "territory_id", "area_at_stake", "status", "winner_id", "deadline", "created_at", "updated_at", "uuid") SELECT "id", "challenger_id", "challenged_id", "territory_id", "area_at_stake", "status", "winner_id", "deadline", "created_at", "updated_at", "uuid" FROM "challenges";
DROP TABLE "challenges";
ALTER TABLE "_qb_tmp_challenges" RENAME TO "challenges";
CREATE UNIQUE INDEX IF NOT EXISTS "challenges_challenges_uuid_unique" ON "challenges" ("uuid");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_kudos" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "giver_id" INTEGER not null,
  "user_id" INTEGER REFERENCES "users"("id"),
  "activity_id" INTEGER REFERENCES "activities"("id"),
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
INSERT INTO "_qb_tmp_kudos" ("id", "giver_id", "user_id", "activity_id", "created_at", "updated_at", "uuid") SELECT "id", "giver_id", "user_id", "activity_id", "created_at", "updated_at", "uuid" FROM "kudos";
DROP TABLE "kudos";
ALTER TABLE "_qb_tmp_kudos" RENAME TO "kudos";
CREATE UNIQUE INDEX IF NOT EXISTS "kudos_kudos_giver_activity_unique" ON "kudos" ("giver_id", "activity_id");
CREATE UNIQUE INDEX IF NOT EXISTS "kudos_kudos_uuid_unique" ON "kudos" ("uuid");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_territory_histories" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "territory_id" INTEGER REFERENCES "territories"("id"),
  "user_id" INTEGER REFERENCES "users"("id"),
  "activity_id" INTEGER REFERENCES "activities"("id"),
  "previous_owner_id" INTEGER,
  "event_type" TEXT CHECK ("event_type" IN ('claimed', 'conquered', 'split', 'defended', 'contested', 'expired')) not null,
  "area_at_event" REAL,
  "previous_ownership_duration" INTEGER,
  "notes" TEXT,
  "new_territory_id" INTEGER,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
INSERT INTO "_qb_tmp_territory_histories" ("id", "territory_id", "user_id", "activity_id", "previous_owner_id", "event_type", "area_at_event", "previous_ownership_duration", "notes", "new_territory_id", "created_at", "updated_at", "uuid") SELECT "id", "territory_id", "user_id", "activity_id", "previous_owner_id", "event_type", "area_at_event", "previous_ownership_duration", "notes", "new_territory_id", "created_at", "updated_at", "uuid" FROM "territory_histories";
DROP TABLE "territory_histories";
ALTER TABLE "_qb_tmp_territory_histories" RENAME TO "territory_histories";
CREATE UNIQUE INDEX IF NOT EXISTS "territory_histories_territory_histories_uuid_unique" ON "territory_histories" ("uuid");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_trail_reviews" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER REFERENCES "users"("id"),
  "trail_id" INTEGER REFERENCES "trails"("id"),
  "rating" INTEGER not null,
  "title" TEXT,
  "content" TEXT not null,
  "visit_date" TEXT,
  "conditions" TEXT CHECK ("conditions" IN ('excellent', 'good', 'fair', 'poor', 'muddy', 'icy')),
  "helpful_count" INTEGER,
  "photos" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
INSERT INTO "_qb_tmp_trail_reviews" ("id", "user_id", "trail_id", "rating", "title", "content", "visit_date", "conditions", "helpful_count", "photos", "created_at", "updated_at", "uuid") SELECT "id", "user_id", "trail_id", "rating", "title", "content", "visit_date", "conditions", "helpful_count", "photos", "created_at", "updated_at", "uuid" FROM "trail_reviews";
DROP TABLE "trail_reviews";
ALTER TABLE "_qb_tmp_trail_reviews" RENAME TO "trail_reviews";
CREATE UNIQUE INDEX IF NOT EXISTS "trail_reviews_trail_reviews_user_trail_unique" ON "trail_reviews" ("user_id", "trail_id");
CREATE UNIQUE INDEX IF NOT EXISTS "trail_reviews_trail_reviews_uuid_unique" ON "trail_reviews" ("uuid");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_trails" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT not null,
  "location" TEXT not null,
  "distance" REAL not null,
  "elevation" REAL not null,
  "difficulty" TEXT CHECK ("difficulty" IN ('easy', 'moderate', 'hard')) not null,
  "rating" REAL,
  "review_count" INTEGER,
  "estimated_time" TEXT,
  "image" TEXT,
  "tags" TEXT,
  "latitude" REAL,
  "longitude" REAL,
  "description" TEXT,
  "geometry" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
INSERT INTO "_qb_tmp_trails" ("id", "name", "location", "distance", "elevation", "difficulty", "rating", "review_count", "estimated_time", "image", "tags", "latitude", "longitude", "description", "geometry", "created_at", "updated_at", "uuid") SELECT "id", "name", "location", "distance", "elevation", "difficulty", "rating", "review_count", "estimated_time", "image", "tags", "latitude", "longitude", "description", "geometry", "created_at", "updated_at", "uuid" FROM "trails";
DROP TABLE "trails";
ALTER TABLE "_qb_tmp_trails" RENAME TO "trails";
CREATE UNIQUE INDEX IF NOT EXISTS "trails_trails_uuid_unique" ON "trails" ("uuid");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_activities" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER REFERENCES "users"("id"),
  "trail_id" INTEGER REFERENCES "trails"("id"),
  "activity_type" TEXT CHECK ("activity_type" IN ('Trail Run', 'Hike', 'Walk', 'Bike')) not null,
  "distance" REAL not null,
  "duration" TEXT not null,
  "moving_time" TEXT,
  "pace" TEXT,
  "elevation" REAL,
  "kudos_count" INTEGER,
  "notes" TEXT,
  "gpx_data" TEXT,
  "splits" TEXT,
  "visibility" TEXT CHECK ("visibility" IN ('public', 'followers', 'private')) not null,
  "completed_at" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
INSERT INTO "_qb_tmp_activities" ("id", "user_id", "trail_id", "activity_type", "distance", "duration", "moving_time", "pace", "elevation", "kudos_count", "notes", "gpx_data", "splits", "visibility", "completed_at", "created_at", "updated_at", "uuid") SELECT "id", "user_id", "trail_id", "activity_type", "distance", "duration", "moving_time", "pace", "elevation", "kudos_count", "notes", "gpx_data", "splits", "visibility", "completed_at", "created_at", "updated_at", "uuid" FROM "activities";
DROP TABLE "activities";
ALTER TABLE "_qb_tmp_activities" RENAME TO "activities";
CREATE UNIQUE INDEX IF NOT EXISTS "activities_activities_uuid_unique" ON "activities" ("uuid");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_achievements" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT not null,
  "description" TEXT not null,
  "icon" TEXT not null,
  "category" TEXT CHECK ("category" IN ('distance', 'elevation', 'streak', 'social', 'exploration', 'speed')) not null,
  "metric" TEXT CHECK ("metric" IN ('activities', 'distinct_trails', 'total_miles', 'total_elevation', 'territories_conquered', 'territories_defended', 'territories_owned', 'kudos_given', 'streak_days', 'fast_mile')) not null,
  "target_value" INTEGER not null,
  "target_unit" TEXT CHECK ("target_unit" IN ('trails', 'miles', 'feet', 'days', 'kudos', 'hours', 'activities', 'territories')) not null,
  "points" INTEGER,
  "badge_color" TEXT CHECK ("badge_color" IN ('gold', 'silver', 'bronze', 'emerald', 'ruby')),
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
INSERT INTO "_qb_tmp_achievements" ("id", "name", "description", "icon", "category", "metric", "target_value", "target_unit", "points", "badge_color", "created_at", "updated_at", "uuid") SELECT "id", "name", "description", "icon", "category", "metric", "target_value", "target_unit", "points", "badge_color", "created_at", "updated_at", "uuid" FROM "achievements";
DROP TABLE "achievements";
ALTER TABLE "_qb_tmp_achievements" RENAME TO "achievements";
CREATE UNIQUE INDEX IF NOT EXISTS "achievements_achievements_uuid_unique" ON "achievements" ("uuid");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_user_achievements" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER REFERENCES "users"("id"),
  "achievement_id" INTEGER REFERENCES "achievements"("id"),
  "progress" INTEGER not null,
  "completed_at" TEXT,
  "is_complete" INTEGER,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
INSERT INTO "_qb_tmp_user_achievements" ("id", "user_id", "achievement_id", "progress", "completed_at", "is_complete", "created_at", "updated_at", "uuid") SELECT "id", "user_id", "achievement_id", "progress", "completed_at", "is_complete", "created_at", "updated_at", "uuid" FROM "user_achievements";
DROP TABLE "user_achievements";
ALTER TABLE "_qb_tmp_user_achievements" RENAME TO "user_achievements";
CREATE UNIQUE INDEX IF NOT EXISTS "user_achievements_user_achievements_user_achievement_unique" ON "user_achievements" ("user_id", "achievement_id");
CREATE UNIQUE INDEX IF NOT EXISTS "user_achievements_user_achievements_uuid_unique" ON "user_achievements" ("uuid");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_territories" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER REFERENCES "users"("id"),
  "activity_id" INTEGER REFERENCES "activities"("id"),
  "parent_territory_id" INTEGER,
  "name" TEXT,
  "polygon_data" TEXT not null,
  "bounding_box" TEXT,
  "center_lat" REAL not null,
  "center_lng" REAL not null,
  "area_size" REAL not null,
  "perimeter" REAL,
  "status" TEXT CHECK ("status" IN ('active', 'contested', 'expired')) not null,
  "conquest_count" INTEGER,
  "claimed_at" TEXT not null,
  "last_activity_at" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
INSERT INTO "_qb_tmp_territories" ("id", "user_id", "activity_id", "parent_territory_id", "name", "polygon_data", "bounding_box", "center_lat", "center_lng", "area_size", "perimeter", "status", "conquest_count", "claimed_at", "last_activity_at", "created_at", "updated_at", "uuid") SELECT "id", "user_id", "activity_id", "parent_territory_id", "name", "polygon_data", "bounding_box", "center_lat", "center_lng", "area_size", "perimeter", "status", "conquest_count", "claimed_at", "last_activity_at", "created_at", "updated_at", "uuid" FROM "territories";
DROP TABLE "territories";
ALTER TABLE "_qb_tmp_territories" RENAME TO "territories";
CREATE UNIQUE INDEX IF NOT EXISTS "territories_territories_uuid_unique" ON "territories" ("uuid");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_clubs" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "creator_id" INTEGER not null,
  "name" TEXT not null,
  "description" TEXT,
  "location" TEXT,
  "club_type" TEXT CHECK ("club_type" IN ('Running', 'Hiking', 'Mixed', 'Territory Game')) not null,
  "is_private" INTEGER,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
INSERT INTO "_qb_tmp_clubs" ("id", "creator_id", "name", "description", "location", "club_type", "is_private", "created_at", "updated_at", "uuid") SELECT "id", "creator_id", "name", "description", "location", "club_type", "is_private", "created_at", "updated_at", "uuid" FROM "clubs";
DROP TABLE "clubs";
ALTER TABLE "_qb_tmp_clubs" RENAME TO "clubs";
CREATE UNIQUE INDEX IF NOT EXISTS "clubs_clubs_uuid_unique" ON "clubs" ("uuid");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_follows" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "follower_id" INTEGER not null,
  "following_id" INTEGER not null,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
INSERT INTO "_qb_tmp_follows" ("id", "follower_id", "following_id", "created_at", "updated_at", "uuid") SELECT "id", "follower_id", "following_id", "created_at", "updated_at", "uuid" FROM "follows";
DROP TABLE "follows";
ALTER TABLE "_qb_tmp_follows" RENAME TO "follows";
CREATE UNIQUE INDEX IF NOT EXISTS "follows_follows_follower_following_unique" ON "follows" ("follower_id", "following_id");
CREATE UNIQUE INDEX IF NOT EXISTS "follows_follows_uuid_unique" ON "follows" ("uuid");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_user_notifications" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "recipient_id" INTEGER not null,
  "actor_id" INTEGER,
  "actor_name" TEXT,
  "type" TEXT CHECK ("type" IN ('kudos', 'comment', 'follow', 'conquest', 'conquest_attack', 'conquest_defend', 'conquest_win', 'achievement', 'challenge')),
  "body" TEXT,
  "link" TEXT,
  "read" INTEGER,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
INSERT INTO "_qb_tmp_user_notifications" ("id", "recipient_id", "actor_id", "actor_name", "type", "body", "link", "read", "created_at", "updated_at", "uuid") SELECT "id", "recipient_id", "actor_id", "actor_name", "type", "body", "link", "read", "created_at", "updated_at", "uuid" FROM "user_notifications";
DROP TABLE "user_notifications";
ALTER TABLE "_qb_tmp_user_notifications" RENAME TO "user_notifications";
CREATE UNIQUE INDEX IF NOT EXISTS "user_notifications_user_notifications_uuid_unique" ON "user_notifications" ("uuid");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_users" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT not null,
  "email" TEXT not null,
  "password" TEXT not null,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
INSERT INTO "_qb_tmp_users" ("id", "name", "email", "password", "created_at", "updated_at", "uuid") SELECT "id", "name", "email", "password", "created_at", "updated_at", "uuid" FROM "users";
DROP TABLE "users";
ALTER TABLE "_qb_tmp_users" RENAME TO "users";
CREATE UNIQUE INDEX IF NOT EXISTS "users_users_email_unique" ON "users" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_users_uuid_unique" ON "users" ("uuid");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "_qb_tmp_club_members" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "club_id" INTEGER not null REFERENCES "clubs"("id"),
  "user_id" INTEGER not null REFERENCES "users"("id"),
  "role" TEXT CHECK ("role" IN ('owner', 'admin', 'member')) not null,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
INSERT INTO "_qb_tmp_club_members" ("id", "club_id", "user_id", "role", "created_at", "updated_at", "uuid") SELECT "id", "club_id", "user_id", "role", "created_at", "updated_at", "uuid" FROM "club_members";
DROP TABLE "club_members";
ALTER TABLE "_qb_tmp_club_members" RENAME TO "club_members";
CREATE UNIQUE INDEX IF NOT EXISTS "club_members_club_members_club_user_unique" ON "club_members" ("club_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "club_members_club_members_uuid_unique" ON "club_members" ("uuid");
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;

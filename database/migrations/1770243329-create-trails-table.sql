CREATE TABLE IF NOT EXISTS "trails" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT,
  "location" TEXT,
  "distance" REAL,
  "elevation" REAL,
  "difficulty" TEXT,
  "rating" REAL,
  "review_count" REAL,
  "estimated_time" TEXT,
  "image" TEXT,
  "tags" TEXT,
  "latitude" REAL,
  "longitude" REAL,
  "description" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT
);
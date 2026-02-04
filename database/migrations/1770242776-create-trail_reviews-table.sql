CREATE TABLE IF NOT EXISTS "trail_reviews" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "rating" REAL,
  "title" TEXT,
  "content" TEXT,
  "visit_date" TEXT,
  "conditions" TEXT,
  "helpful_count" REAL,
  "photos" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT
);
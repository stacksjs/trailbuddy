CREATE TABLE IF NOT EXISTS "trail_reviews" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER REFERENCES "users"("id"),
  "trail_id" INTEGER REFERENCES "trails"("id"),
  "rating" INTEGER,
  "title" TEXT,
  "content" TEXT,
  "visit_date" TEXT,
  "conditions" TEXT CHECK ("conditions" IN ('excellent', 'good', 'fair', 'poor', 'muddy', 'icy')),
  "helpful_count" INTEGER,
  "photos" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
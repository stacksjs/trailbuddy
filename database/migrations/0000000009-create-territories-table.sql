CREATE TABLE IF NOT EXISTS "territories" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "parent_territory_id" INTEGER,
  "name" TEXT,
  "polygon_data" TEXT,
  "bounding_box" TEXT,
  "center_lat" INTEGER,
  "center_lng" INTEGER,
  "area_size" INTEGER,
  "perimeter" INTEGER,
  "status" TEXT CHECK ("status" IN ('active', 'contested')),
  "conquest_count" INTEGER,
  "claimed_at" TEXT,
  "user_id" INTEGER REFERENCES "users"("id"),
  "activity_id" INTEGER REFERENCES "activities"("id"),
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
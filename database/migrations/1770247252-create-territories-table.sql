CREATE TABLE IF NOT EXISTS "territories" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "parent_territory_id" REAL,
  "name" TEXT,
  "polygon_data" TEXT,
  "bounding_box" TEXT,
  "center_lat" REAL,
  "center_lng" REAL,
  "area_size" REAL,
  "perimeter" REAL,
  "status" TEXT,
  "conquest_count" REAL,
  "claimed_at" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT
);
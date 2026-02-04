CREATE TABLE IF NOT EXISTS "territory_histories" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "previous_owner_id" REAL,
  "event_type" TEXT,
  "area_at_event" REAL,
  "previous_ownership_duration" REAL,
  "notes" TEXT,
  "new_territory_id" REAL,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT
);
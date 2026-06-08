CREATE TABLE IF NOT EXISTS "territory_histories" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "territory_id" INTEGER REFERENCES "territories"("id"),
  "user_id" INTEGER REFERENCES "users"("id"),
  "activity_id" INTEGER REFERENCES "activities"("id"),
  "previous_owner_id" INTEGER,
  "event_type" TEXT CHECK ("event_type" IN ('claimed', 'conquered', 'split', 'defended')),
  "area_at_event" INTEGER,
  "previous_ownership_duration" INTEGER,
  "notes" TEXT,
  "new_territory_id" INTEGER,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
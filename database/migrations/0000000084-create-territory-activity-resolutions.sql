CREATE TABLE IF NOT EXISTS "territory_activity_resolutions" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "activity_id" INTEGER NOT NULL REFERENCES "activities"("id") ON DELETE CASCADE,
  "territory_id" INTEGER NOT NULL REFERENCES "territories"("id") ON DELETE CASCADE,
  "outcome" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "territory_activity_resolution_unique"
  ON "territory_activity_resolutions" ("activity_id", "territory_id");

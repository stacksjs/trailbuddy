ALTER TABLE "territories" ADD COLUMN "min_lat" REAL;
ALTER TABLE "territories" ADD COLUMN "min_lng" REAL;
ALTER TABLE "territories" ADD COLUMN "max_lat" REAL;
ALTER TABLE "territories" ADD COLUMN "max_lng" REAL;

CREATE INDEX IF NOT EXISTS "territories_map_bounds_index"
  ON "territories" ("status", "min_lat", "max_lat", "min_lng", "max_lng");

CREATE INDEX IF NOT EXISTS "territory_histories_territory_event_index"
  ON "territory_histories" ("territory_id", "event_type");


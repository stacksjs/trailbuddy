CREATE INDEX IF NOT EXISTS "trails_trails_bbox_index" ON "trails" ("min_lat", "max_lat", "min_lng", "max_lng");

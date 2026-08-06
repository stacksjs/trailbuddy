CREATE TABLE IF NOT EXISTS "trail_ingest_shards" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "shard_key" TEXT not null,
  "source" TEXT CHECK ("source" IN ('osm', 'usfs', 'nps')) not null,
  "cursor" TEXT,
  "status" TEXT CHECK ("status" IN ('pending', 'running', 'done', 'failed')) not null default 'pending',
  "attempts" INTEGER default 0,
  "features_seen" INTEGER default 0,
  "trails_imported" INTEGER default 0,
  "trails_updated" INTEGER default 0,
  "last_error" TEXT,
  "started_at" TEXT,
  "completed_at" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS "trail_ingest_shards_trail_ingest_shards_key_unique" ON "trail_ingest_shards" ("shard_key");
CREATE INDEX IF NOT EXISTS "trail_ingest_shards_trail_ingest_shards_source_status_index" ON "trail_ingest_shards" ("source", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "trail_ingest_shards_trail_ingest_shards_uuid_unique" ON "trail_ingest_shards" ("uuid");

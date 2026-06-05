-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territories"."parent_territory_id" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territories"."center_lat" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territories"."center_lng" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territories"."area_size" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territories"."perimeter" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territories"."status" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territories"."conquest_count" type

ALTER TABLE "territories" ADD COLUMN "user_id" INTEGER;

ALTER TABLE "territories" ADD CONSTRAINT "territories_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");

ALTER TABLE "territories" ADD COLUMN "activity_id" INTEGER;

ALTER TABLE "territories" ADD CONSTRAINT "territories_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "activities"("id");

ALTER TABLE "territories" ADD COLUMN "uuid" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "territories_territories_uuid_unique" ON "territories" ("uuid");
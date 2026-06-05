-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territory_histories"."previous_owner_id" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territory_histories"."event_type" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territory_histories"."area_at_event" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territory_histories"."previous_ownership_duration" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territory_histories"."notes" type

-- SQLite does not support ALTER COLUMN. Manual table recreation needed to change "territory_histories"."new_territory_id" type

ALTER TABLE "territory_histories" ADD COLUMN "territory_id" INTEGER;

ALTER TABLE "territory_histories" ADD CONSTRAINT "territory_histories_territory_id_fk" FOREIGN KEY ("territory_id") REFERENCES "territories"("id");

ALTER TABLE "territory_histories" ADD COLUMN "user_id" INTEGER;

ALTER TABLE "territory_histories" ADD CONSTRAINT "territory_histories_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");

ALTER TABLE "territory_histories" ADD COLUMN "activity_id" INTEGER;

ALTER TABLE "territory_histories" ADD CONSTRAINT "territory_histories_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "activities"("id");

ALTER TABLE "territory_histories" ADD COLUMN "uuid" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "territory_histories_territory_histories_uuid_unique" ON "territory_histories" ("uuid");
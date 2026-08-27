-- The uuid unique index for `route_efforts`.
--
-- The model carries `useUuid: true`, so the ORM writes a uuid on every insert
-- and the rest of the framework treats it as an alternate key. Every other
-- uuid-bearing table has this index; `route_efforts` did not get one because
-- the generator dropped its create-table pass as a duplicate of the
-- hand-written 0000000127, taking the index with it.
CREATE UNIQUE INDEX IF NOT EXISTS "route_efforts_uuid_unique" ON "route_efforts" ("uuid");

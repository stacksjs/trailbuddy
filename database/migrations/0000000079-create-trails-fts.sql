-- Full-text search over the trail catalog.
--
-- The explore page searches by name, park/forest and region. That was three
-- `LIKE '%term%'` predicates, which no B-tree index can serve, so every search
-- scanned all 593,000 rows: ~0.7s to fetch a page of matches, and ~3.4s more
-- for the exact `COUNT(*)`, which has no LIMIT to exit early on and therefore
-- runs in full even when a term matches nothing. Through the API that was
-- eleven seconds a keystroke.
--
-- `content='trails'` makes this an external-content index: FTS5 stores only
-- the terms and points back at the trails rows, so the 591 MB of geometry and
-- the rest of the table are not duplicated.
--
-- `remove_diacritics 2` is not optional here. Two thirds of the catalog is now
-- German, Austrian and Swiss, and without it "Karnten" does not find
-- "Kärnten", "Grossglockner" does not find "Großglockner", and every umlaut a
-- visitor cannot conveniently type hides the trail they are looking for.
CREATE VIRTUAL TABLE IF NOT EXISTS trails_fts USING fts5(
  name,
  location,
  state_name,
  content='trails',
  content_rowid='id',
  tokenize="unicode61 remove_diacritics 2"
);

-- Backfill, using FTS5's own rebuild command.
--
-- Not a plain INSERT ... SELECT. An external-content table answers ordinary
-- reads by passing them through to `trails`, so the obvious guard against
-- double-indexing —
--
--   WHERE NOT EXISTS (SELECT 1 FROM trails_fts LIMIT 1)
--
-- is always false: it sees the content table, which is never empty. That
-- silently inserts nothing and leaves an index that matches no term, while
-- `SELECT COUNT(*) FROM trails_fts` still reports every row, because it too
-- reads through to the content.
--
-- 'rebuild' discards the index and regenerates it from the content table, so
-- it is idempotent by construction and needs no guard at all.
INSERT INTO trails_fts(trails_fts) VALUES ('rebuild');

-- Keeping the index in step with the table is deliberately NOT done with
-- triggers here.
--
-- The obvious implementation is three AFTER INSERT/UPDATE/DELETE triggers, and
-- that is what this migration first tried. It applies cleanly through the
-- `sqlite3` CLI and fails in production: the migration runner splits a file on
-- every `;` outside single quotes and knows nothing about `BEGIN ... END`, so
-- each trigger arrives at SQLite as two fragments and the deploy dies on
-- `SQLiteError: incomplete input`.
--
-- Sync lives in `writeTrails` instead (app/Ingest/ingest.ts), which is the one
-- path that writes trails in volume. See the note there.

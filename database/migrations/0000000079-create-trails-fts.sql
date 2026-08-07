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

-- Keep the index in step with the table.
--
-- External-content FTS5 does not observe writes to its content table, so the
-- triggers are what make this correct rather than an optimisation. The ingest
-- upserts hundreds of thousands of rows, and a stale index would quietly serve
-- trails that have been renamed or removed.
--
-- Deletes and updates use the 'delete' command form, which is how external
-- content tables retract a row: FTS5 cannot read the old values back from the
-- content table at that point, so they have to be handed to it explicitly.
DROP TRIGGER IF EXISTS trails_fts_after_insert;
CREATE TRIGGER trails_fts_after_insert AFTER INSERT ON trails BEGIN
  INSERT INTO trails_fts(rowid, name, location, state_name)
  VALUES (new.id, new.name, new.location, new.state_name);
END;

DROP TRIGGER IF EXISTS trails_fts_after_delete;
CREATE TRIGGER trails_fts_after_delete AFTER DELETE ON trails BEGIN
  INSERT INTO trails_fts(trails_fts, rowid, name, location, state_name)
  VALUES ('delete', old.id, old.name, old.location, old.state_name);
END;

DROP TRIGGER IF EXISTS trails_fts_after_update;
CREATE TRIGGER trails_fts_after_update AFTER UPDATE ON trails BEGIN
  INSERT INTO trails_fts(trails_fts, rowid, name, location, state_name)
  VALUES ('delete', old.id, old.name, old.location, old.state_name);
  INSERT INTO trails_fts(rowid, name, location, state_name)
  VALUES (new.id, new.name, new.location, new.state_name);
END;

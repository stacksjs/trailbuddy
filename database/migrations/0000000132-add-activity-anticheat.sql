-- Anti-cheat evidence, kept alongside the verdict it produced.
--
-- The existing `integrity_status` and `integrity_reason` record what was
-- decided. These record what it was decided from, which is what a reviewer
-- needs when an athlete disputes a rejection and what an operator needs to
-- tell a rule that is too strict from a cheat that is getting through.

-- 0 to 1. How much the track resembles a construction rather than a recording.
-- Never on its own a reason to refuse a capture: it orders a review queue.
ALTER TABLE "activities" ADD COLUMN "anomaly_score" REAL NOT NULL DEFAULT 0;

-- JSON array of { code, detail, weight } — the signals behind that score, and
-- any cross-activity findings. Stored rather than recomputed because the
-- neighbouring activities that produced a finding may since have been deleted.
ALTER TABLE "activities" ADD COLUMN "integrity_flags" TEXT;

-- Shape hash of the GPS trace. Two submissions of one recording match; two
-- genuine runs of the same route do not.
ALTER TABLE "activities" ADD COLUMN "track_fingerprint" TEXT;

-- Set when a human should look before the capture is trusted. Kept separate
-- from `integrity_status`: a rejected activity is decided, a flagged one is
-- not, and conflating them either blocks honest athletes or waves cheats
-- through depending on which way the conflation falls.
ALTER TABLE "activities" ADD COLUMN "review_state" TEXT
  CHECK ("review_state" IN ('none', 'pending', 'cleared', 'upheld'))
  NOT NULL DEFAULT 'none';

-- Duplicate detection reads by fingerprint across all athletes, because the
-- interesting duplicate is somebody else's trace.
CREATE INDEX IF NOT EXISTS "activities_track_fingerprint_index"
  ON "activities" ("track_fingerprint");

-- The history checks read one athlete's activities around a time window.
CREATE INDEX IF NOT EXISTS "activities_user_completed_index"
  ON "activities" ("user_id", "completed_at");

-- The review queue is read by state, newest first.
CREATE INDEX IF NOT EXISTS "activities_review_state_index"
  ON "activities" ("review_state", "created_at");

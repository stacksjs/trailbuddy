CREATE TABLE IF NOT EXISTS "club_invites" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "club_id" INTEGER not null REFERENCES "clubs"("id"),
  "invited_by_id" INTEGER not null REFERENCES "users"("id"),
  "invited_user_id" INTEGER REFERENCES "users"("id"),
  "invited_email" TEXT,
  "code" TEXT not null,
  "status" TEXT CHECK ("status" IN ('pending', 'accepted', 'revoked', 'expired')) NOT NULL DEFAULT 'pending',
  "expires_at" TEXT,
  "accepted_at" TEXT,
  "note" TEXT,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "club_invites_code_unique" ON "club_invites" ("code");
CREATE INDEX IF NOT EXISTS "club_invites_club_status_index" ON "club_invites" ("club_id", "status");

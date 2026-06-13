CREATE TABLE IF NOT EXISTS "user_notifications" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "recipient_id" INTEGER,
  "actor_id" INTEGER,
  "actor_name" TEXT,
  "type" TEXT CHECK ("type" IN ('kudos', 'comment', 'follow', 'conquest', 'conquest_attack', 'conquest_defend', 'conquest_win', 'achievement', 'challenge')),
  "body" TEXT,
  "link" TEXT,
  "read" INTEGER,
  "created_at" TEXT not null default CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  "uuid" TEXT
);
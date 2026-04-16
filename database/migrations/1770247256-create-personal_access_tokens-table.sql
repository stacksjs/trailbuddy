CREATE TABLE IF NOT EXISTS personal_access_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tokenable_id INTEGER NOT NULL,
  tokenable_type TEXT NOT NULL DEFAULT 'user',
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  abilities TEXT DEFAULT '["*"]',
  last_used_at TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pat_token ON personal_access_tokens (token);
CREATE INDEX IF NOT EXISTS idx_pat_tokenable ON personal_access_tokens (tokenable_id, tokenable_type);

-- 002_social_previews.sql: Persistência unificada de capas e consentimento social de sessões
CREATE TABLE IF NOT EXISTS session_social_previews (
  session_id TEXT PRIMARY KEY NOT NULL REFERENCES photo_sessions(id) ON DELETE CASCADE,
  consent TEXT NOT NULL CHECK (consent IN ('granted', 'revoked')),
  derivative_key TEXT NOT NULL,
  version TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'jpeg' CHECK (format IN ('jpeg', 'webp')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

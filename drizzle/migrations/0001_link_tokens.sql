-- Link tokens for cross-browser account linking
-- Users generate a token URL, open it in another browser where a different GitHub account is active

CREATE TABLE IF NOT EXISTS "link_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "link_tokens_token_idx" ON "link_tokens" ("token");
CREATE INDEX IF NOT EXISTS "link_tokens_user_id_idx" ON "link_tokens" ("user_id");

-- Multi-GitHub account authentication
-- Creates users and github_accounts tables

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text,
  "name" text,
  "image" text,
  "active_account_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "github_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "github_id" text NOT NULL,
  "login" text NOT NULL,
  "name" text,
  "email" text,
  "avatar_url" text,
  "access_token" text NOT NULL,
  "scope" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "github_accounts_user_github_idx" ON "github_accounts" ("user_id", "github_id");
CREATE UNIQUE INDEX IF NOT EXISTS "github_accounts_github_id_idx" ON "github_accounts" ("github_id");

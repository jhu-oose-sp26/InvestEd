-- Run in Supabase SQL Editor (or psql) if `prisma migrate deploy` is blocked by a failed migration
-- but the app expects users.username + users.accountNumber (fixes: column does not exist).

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;

UPDATE "users"
SET "accountNumber" = 'IED-' || UPPER(SUBSTRING(REPLACE(CAST(gen_random_uuid() AS TEXT), '-', ''), 1, 12))
WHERE "accountNumber" IS NULL;

ALTER TABLE "users" ALTER COLUMN "accountNumber" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "users_account_number_key" ON "users"("accountNumber");

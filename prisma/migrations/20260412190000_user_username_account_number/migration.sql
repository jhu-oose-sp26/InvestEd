-- AlterTable
ALTER TABLE "users" ADD COLUMN "username" TEXT;
ALTER TABLE "users" ADD COLUMN "accountNumber" TEXT;

UPDATE "users"
SET "accountNumber" = 'IED-' || UPPER(SUBSTRING(REPLACE(CAST(gen_random_uuid() AS TEXT), '-', ''), 1, 12))
WHERE "accountNumber" IS NULL;

ALTER TABLE "users" ALTER COLUMN "accountNumber" SET NOT NULL;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_account_number_key" ON "users"("accountNumber");

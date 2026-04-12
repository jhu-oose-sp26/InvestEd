-- Align `portfolios` with schema: display name per portfolio (older DBs may lack this column).

ALTER TABLE "portfolios" ADD COLUMN IF NOT EXISTS "name" VARCHAR(100) NOT NULL DEFAULT 'My Portfolio';

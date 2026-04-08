-- 1. Temporarily drop the foreign key from custom_quizzes so it isn't deleted or corrupted
ALTER TABLE "custom_quizzes" DROP CONSTRAINT IF EXISTS "custom_quizzes_userId_fkey";

-- 2. Drop the 4 tables in question (CASCADE drops any lingering constraints between them)
DROP TABLE IF EXISTS "positions" CASCADE;
DROP TABLE IF EXISTS "trades" CASCADE;
DROP TABLE IF EXISTS "portfolios" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- 3. Recreate Users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- 4. Recreate Portfolios
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL DEFAULT 'My Portfolio',
    "cashBalance" DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "portfolios_userId_idx" ON "portfolios"("userId");
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Recreate Trades
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" "TradeType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "totalValue" DECIMAL(15,2) NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "trades_portfolioId_idx" ON "trades"("portfolioId");
CREATE INDEX "trades_symbol_idx" ON "trades"("symbol");
CREATE INDEX "trades_executedAt_idx" ON "trades"("executedAt");
ALTER TABLE "trades" ADD CONSTRAINT "trades_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Recreate Positions
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "averageBuyPrice" DECIMAL(15,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "positions_portfolioId_idx" ON "positions"("portfolioId");
CREATE UNIQUE INDEX "positions_portfolioId_symbol_key" ON "positions"("portfolioId", "symbol");
ALTER TABLE "positions" ADD CONSTRAINT "positions_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Restore the FK for custom_quizzes so Prisma doesn't get confused
ALTER TABLE "custom_quizzes" ADD CONSTRAINT "custom_quizzes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Seed the exact base schema required for testing
INSERT INTO "users" ("id", "email", "name", "updatedAt") 
VALUES ('temp-user-id', 'test@example.com', 'Temp User', CURRENT_TIMESTAMP);

INSERT INTO "portfolios" ("id", "userId", "name", "cashBalance", "updatedAt") 
VALUES ('temp-portfolio-id', 'temp-user-id', 'Temp Portfolio', 100000.00, CURRENT_TIMESTAMP);

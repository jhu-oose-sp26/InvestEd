-- CreateEnum
CREATE TYPE "TradeType" AS ENUM ('BUY', 'SELL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL DEFAULT 'My Portfolio',
    "cashBalance" DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "averageBuyPrice" DECIMAL(15,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_prices_realtime" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "timeframe" TEXT NOT NULL DEFAULT '1Min',
    "open" DECIMAL(15,6) NOT NULL,
    "high" DECIMAL(15,6) NOT NULL,
    "low" DECIMAL(15,6) NOT NULL,
    "close" DECIMAL(15,6) NOT NULL,
    "volume" BIGINT,
    "vwap" DECIMAL(15,6),
    "trade_count" INTEGER,

    CONSTRAINT "market_prices_realtime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quarterly_reports" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "statementDate" TEXT NOT NULL,
    "releaseDate" TEXT NOT NULL,
    "statements" JSONB NOT NULL,
    "performance" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quarterly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_quizzes" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "userId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_quiz_questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "prompt" VARCHAR(2000) NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" VARCHAR(2000) NOT NULL,
    "context" VARCHAR(4000),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "portfolios_userId_idx" ON "portfolios"("userId");

-- CreateIndex
CREATE INDEX "trades_portfolioId_idx" ON "trades"("portfolioId");

-- CreateIndex
CREATE INDEX "trades_symbol_idx" ON "trades"("symbol");

-- CreateIndex
CREATE INDEX "trades_executedAt_idx" ON "trades"("executedAt");

-- CreateIndex
CREATE INDEX "positions_portfolioId_idx" ON "positions"("portfolioId");

-- CreateIndex
CREATE UNIQUE INDEX "positions_portfolioId_symbol_key" ON "positions"("portfolioId", "symbol");

-- CreateIndex
CREATE INDEX "market_prices_realtime_symbol_timestamp_idx" ON "market_prices_realtime"("symbol", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "market_prices_realtime_symbol_timestamp_timeframe_key" ON "market_prices_realtime"("symbol", "timestamp", "timeframe");

-- CreateIndex
CREATE INDEX "quarterly_reports_symbol_idx" ON "quarterly_reports"("symbol");

-- CreateIndex
CREATE INDEX "quarterly_reports_quarter_idx" ON "quarterly_reports"("quarter");

-- CreateIndex
CREATE UNIQUE INDEX "quarterly_reports_symbol_quarter_key" ON "quarterly_reports"("symbol", "quarter");

-- CreateIndex
CREATE INDEX "custom_quizzes_userId_idx" ON "custom_quizzes"("userId");

-- CreateIndex
CREATE INDEX "custom_quizzes_isPublic_idx" ON "custom_quizzes"("isPublic");

-- CreateIndex
CREATE INDEX "custom_quiz_questions_quizId_idx" ON "custom_quiz_questions"("quizId");

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_quizzes" ADD CONSTRAINT "custom_quizzes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_quiz_questions" ADD CONSTRAINT "custom_quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "custom_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

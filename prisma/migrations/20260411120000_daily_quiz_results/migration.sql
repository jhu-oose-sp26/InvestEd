-- CreateTable
CREATE TABLE "daily_quiz_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizDate" VARCHAR(10) NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_quiz_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_quiz_results_userId_idx" ON "daily_quiz_results"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_quiz_results_userId_quizDate_key" ON "daily_quiz_results"("userId", "quizDate");

-- AddForeignKey
ALTER TABLE "daily_quiz_results" ADD CONSTRAINT "daily_quiz_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

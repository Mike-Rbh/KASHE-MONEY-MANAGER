-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('salary', 'freelance', 'investment', 'gift', 'refund', 'other_income', 'food', 'transport', 'housing', 'utilities', 'healthcare', 'entertainment', 'shopping', 'education', 'subscriptions', 'other_expense');

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category" "TransactionCategory" NOT NULL,
    "description" VARCHAR(255),
    "date" TIMESTAMPTZ(3) NOT NULL,
    "localId" VARCHAR(36),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_localId_key" ON "transactions"("localId");

-- CreateIndex
CREATE INDEX "transactions_date_idx" ON "transactions"("date");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_category_idx" ON "transactions"("category");

-- CreateIndex
CREATE INDEX "transactions_deletedAt_idx" ON "transactions"("deletedAt");

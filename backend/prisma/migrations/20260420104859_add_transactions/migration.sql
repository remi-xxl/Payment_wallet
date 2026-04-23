/*
  Warnings:

  - You are about to drop the `transactions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_receiverWalletId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_senderWalletId_fkey";

-- DropTable
DROP TABLE "transactions";

-- CreateTable
CREATE TABLE "transaction" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "senderWalletId" TEXT NOT NULL,
    "receiverWalletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_senderWalletId_idx" ON "transaction"("senderWalletId");

-- CreateIndex
CREATE INDEX "transaction_receiverWalletId_idx" ON "transaction"("receiverWalletId");

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_senderWalletId_fkey" FOREIGN KEY ("senderWalletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_receiverWalletId_fkey" FOREIGN KEY ("receiverWalletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

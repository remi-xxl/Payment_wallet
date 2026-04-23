-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TRANSFER', 'DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "senderWalletId" TEXT NOT NULL,
    "receiverWalletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_senderWalletId_idx" ON "transactions"("senderWalletId");

-- CreateIndex
CREATE INDEX "transactions_receiverWalletId_idx" ON "transactions"("receiverWalletId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_senderWalletId_fkey" FOREIGN KEY ("senderWalletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiverWalletId_fkey" FOREIGN KEY ("receiverWalletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

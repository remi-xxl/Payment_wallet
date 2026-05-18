/*
  Warnings:

  - A unique constraint covering the columns `[serialNumber]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[accountNumber]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accountNumber` to the `wallets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "accountNumber" TEXT NOT NULL,
ADD COLUMN     "serialNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "wallets_serialNumber_key" ON "wallets"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_accountNumber_key" ON "wallets"("accountNumber");

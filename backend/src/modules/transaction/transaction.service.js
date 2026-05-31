import prisma from "../../utils/prisma.js";
import ApiError from "../../utils/ApiError.js";
import { emailQueue, fraudQueue } from "../../queues/index.js";
import logger from "../../config/logger.js";
import {
  CacheKeys,
  deleteCache,
  deletePattern,
  withCache,
  CacheTTL,
} from "../../utils/cache.js";
import { transferFailureTotal, transferTotal, transferValueTotal } from "../../config/metrics.js";


export async function transfer({
  senderUserid,
  recipientEmail,
  accountNumber,
  amount,
  description,
}) {
  let recipientWalletId;
  const transaction = await prisma.$transaction(async (tx) => {
    // STEP 1: Get the sender's wallet
    //using this locks two request
    const senderWallets = await tx.$queryRaw`
     SELECT id, balance, "userId"
     FROM wallets
     WHERE "userId" = ${senderUserid}
     FOR UPDATE
     `;
    const senderWallet = senderWallets[0];

    if (!senderWallet) {
      throw new ApiError(404, "Sender wallet not found");
    }

    // STEP 2: Check the sender has enough money
    // We convert to Number for comparison.
    const currentBlalance = Number(senderWallet.balance);

    if (currentBlalance < amount) {
      throw new ApiError(
        400,
        `Insufficient balance. Your balance is ₦${currentBlalance}`,
      );
    }

    if (recipientEmail) {
      //STEP 3: Find the recipent by email
      const recipient = await tx.user.findUnique({
        where: { email: recipientEmail },
        select: {
          id: true,
          wallet: { select: { id: true } },
        },
      });

      if (!recipient) {
        throw new ApiError(404, "Recipient not found");
      }
      //Sender can't money to sender
      if (recipient.id === senderUserid) {
        throw new ApiError(400, "You cannot transfer money to yourself");
      }

      if (!recipient.wallet) {
        throw new ApiError(400, "Recipient does not have a wallet");
      }

      recipientWalletId = recipient.wallet.id;
    } else {
      const recipientWallet = await tx.wallet.findUnique({
        where: { accountNumber },
        select: { id: true, userId: true },
      });

      if (!recipientWallet) {
        throw new ApiError(404, "No wallet found with this account number");
      }

      if (recipientWallet.userId === senderUserid) {
        throw new ApiError(400, "You cannot transfer money to yourself");
      }

      recipientWalletId = recipientWallet.id;
    }

    // STEP 4: Deduct from sender
    //   UPDATE wallets SET balance = balance - amount WHERE id = ?
    // This is safe because the subtraction happens INSIDE the database,
    // not in JavaScript. No risk of reading a stale value.

    await tx.wallet.update({
      where: { id: senderWallet.id },
      data: { balance: { decrement: amount } },
    });

    // STEP 5: Add to recipient
    await tx.wallet.update({
      where: { id: recipientWalletId },
      data: { balance: { increment: amount } },
    });

    // STEP 6: Record the transaction permanently

    const newTransaction = await tx.transaction.create({
      data: {
        amount,
        type: "TRANSFER",
        status: "SUCCESS",
        description,
        senderWalletId: senderWallet.id,
        receiverWalletId: recipientWalletId,
      },
      
    });
    transferTotal.inc();

    transferValueTotal.inc(amount * 100);

    transferFailureTotal.inc({ reason: 'insufficient_balance'})

    return newTransaction;
  });

  //Background job

  await Promise.all([
    // Delete sender's cached wallet
    deleteCache(CacheKeys.wallet(senderUserid)),

    // Delete receiver's cached wallet
    // We need to find receiver's userId first
    deleteCache(
      CacheKeys.wallet(
        recipientEmail
          ? (
              await prisma.user.findUnique({
                where: { email: recipientEmail },
                select: { id: true },
              })
            )?.id
          : (
              await prisma.wallet.findUnique({
                where: { accountNumber },
                select: { userId: true },
              })
            )?.userId,
      ),
    ),

    // Delete ALL cached transaction pages for sender
    // because their history just gained a new transaction
    deletePattern(`transactions:${senderUserid}:*`),
  ]);

  const [sender, receiver] = await Promise.all([
    prisma.user.findUnique({
      where: { id: senderUserid },
    }),
    prisma.wallet.findUnique({
      where: { id: recipientWalletId },
      select: {
        user: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    }),
  ]);

  await emailQueue.add("transaction-receipt", {
    senderEmail: sender.email,
    senderName: `${sender.firstName} ${sender.lastName}`,
    receiverEmail: receiver.user.email,
    receiverName: `${receiver.user.firstName} ${receiver.user.lastName}`,
    amount: amount,
    transactionId: transaction.id,
    description: description,
    createdAt: transaction.createdAt,
  });

  logger.info(`Email job queued `, { transactionId: transaction.id });

  await fraudQueue.add("check-transaction", {
    transactionId: transaction.id,
    walletId: transaction.senderWalletId,
    amount,
  });

  logger.info("Fraud check queued", { transactionId: transaction.id });

  //If ANY step above throws an error , NOTHING was saved
  return transaction;
}

//PAGINATION
export async function getTransactionHistory({ userId, page, limit }) {
  return withCache(
    CacheKeys.transactions(userId, page, limit),
    CacheTTL.transactions,
    async () => {
      const wallet = await prisma.wallet.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!wallet) {
        throw new ApiError(404, "Wallet not found");
      }

      const skip = (page - 1) * limit;

      const whereClause = {
        OR: [{ senderWalletId: wallet.id }, { receiverWalletId: wallet.id }],
      };
      //Note To self
      // We run TWO queries at the same time using Promise.all.
      // Promise.all takes an array of promises and runs them IN PARALLEL.
      // If we ran them one after the other (sequentially) it would take 2x longer.
      // With Promise.all both queries hit the database simultaneously.
      const [total, transactions] = await Promise.all([
        prisma.transaction.count({
          where: whereClause,
        }),

        prisma.transaction.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },

          // skip = how many records to jump over
          // take = how many records to return
          skip,
          take: limit,
          include: {
            senderWallet: {
              select: {
                user: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
            },
            receiverWallet: {
              select: {
                user: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        }),
      ]);

      return {
        transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      };
    },
  );
}

export async function getTransactionById({ transactionId, userId }) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });
  if (!wallet) {
    throw new ApiError(404, "Wallet not found");
  }
}
